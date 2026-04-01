'use server';

import { revalidatePath } from 'next/cache';

import {
  buildOverviewLanguagePreview,
  parseOverviewLanguageRows,
  toOverviewLanguageInputs,
  validateOverviewLanguageRows,
  type OverviewLanguageParseError,
  type OverviewLanguagePreviewGroup,
  type OverviewLanguageValidationError,
} from '@/lib/admin/overview-language-import';
import { getDbPool } from '@/lib/server/db';
import {
  getAssessmentVersionLanguageOverview,
  replaceAssessmentVersionLanguageOverview,
} from '@/lib/server/assessment-version-language';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type OverviewLanguageImportDependencies = {
  db: Queryable & {
    connect(): Promise<Queryable & { release(): void }>;
  };
  revalidatePath(path: string): void;
};

type OverviewLanguageImportPreviewDependencies = {
  db: Queryable;
};

type AssessmentVersionRow = {
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type SignalRow = {
  signal_key: string;
};

type AssessmentVersionImportTarget = {
  assessmentVersionId: string;
  assessmentKey: string;
  lifecycleStatus: AssessmentVersionRow['lifecycle_status'];
};

export type OverviewLanguageImportCommand = {
  assessmentVersionId: string;
  rawInput: string;
};

export type OverviewLanguageImportPlanError = {
  code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
  message: string;
};

export type OverviewLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  patternCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedPatternCount: number;
};

export type OverviewLanguageImportPreviewResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: readonly OverviewLanguageParseError[];
  validationErrors: readonly OverviewLanguageValidationError[];
  planErrors: readonly OverviewLanguageImportPlanError[];
  previewGroups: readonly OverviewLanguagePreviewGroup[];
  summary: OverviewLanguageImportSummary;
  executionError: string | null;
};

export type OverviewLanguageImportExecutionResult = OverviewLanguageImportPreviewResult;

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}/language`;
}

export async function previewOverviewLanguageForAssessmentVersion(
  command: OverviewLanguageImportCommand,
): Promise<OverviewLanguageImportPreviewResult> {
  return previewOverviewLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewOverviewLanguageForAssessmentVersionWithDependencies(
  command: OverviewLanguageImportCommand,
  dependencies: OverviewLanguageImportPreviewDependencies,
): Promise<OverviewLanguageImportPreviewResult> {
  const parsed = parseOverviewLanguageRows(command.rawInput);
  if (parsed.errors.length > 0) {
    return buildResult({
      assessmentVersionId: command.assessmentVersionId,
      parseErrors: parsed.errors,
      validationErrors: [],
      planErrors: [],
      previewGroups: [],
      existingRowCount: 0,
    });
  }

  const assessmentVersion = await loadAssessmentVersionForImport(
    dependencies.db,
    command.assessmentVersionId,
  );
  const authoredSignals = await loadTargetSignalsForImport(dependencies.db, command.assessmentVersionId);
  const validation = validateOverviewLanguageRows({
    rows: parsed.records,
    validSignalKeys: authoredSignals,
  });
  const planErrors = buildPlanErrors(assessmentVersion, authoredSignals.length);
  const existingRows = assessmentVersion
    ? await getAssessmentVersionLanguageOverview(dependencies.db, assessmentVersion.assessmentVersionId)
    : [];

  if (validation.errors.length > 0 || planErrors.length > 0) {
    return buildResult({
      assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
      parseErrors: [],
      validationErrors: validation.errors,
      planErrors,
      previewGroups: [],
      existingRowCount: existingRows.length,
      rowCount: parsed.records.length,
      patternCount: new Set(validation.validRows.map((row) => row.canonicalPatternKey)).size,
    });
  }

  return buildResult({
    assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
    parseErrors: [],
    validationErrors: [],
    planErrors: [],
    previewGroups: buildOverviewLanguagePreview({
      rows: validation.validRows,
      signalKeysInOrder: authoredSignals,
    }),
    existingRowCount: existingRows.length,
    rowCount: validation.validRows.length,
    patternCount: new Set(validation.validRows.map((row) => row.canonicalPatternKey)).size,
  });
}

export async function importOverviewLanguageForAssessmentVersion(
  command: OverviewLanguageImportCommand,
): Promise<OverviewLanguageImportExecutionResult> {
  return importOverviewLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function importOverviewLanguageForAssessmentVersionWithDependencies(
  command: OverviewLanguageImportCommand,
  dependencies: OverviewLanguageImportDependencies,
): Promise<OverviewLanguageImportExecutionResult> {
  const preview = await previewOverviewLanguageForAssessmentVersionWithDependencies(command, {
    db: dependencies.db,
  });

  if (!preview.canImport) {
    return preview;
  }

  const assessmentVersion = await loadAssessmentVersionForImport(dependencies.db, command.assessmentVersionId);
  if (!assessmentVersion) {
    return {
      ...preview,
      success: false,
      canImport: false,
      planErrors: buildPlanErrors(null, preview.summary.patternCount),
    };
  }

  try {
    const parsed = parseOverviewLanguageRows(command.rawInput);
    const validation = validateOverviewLanguageRows({
      rows: parsed.records,
      validSignalKeys: await loadTargetSignalsForImport(dependencies.db, command.assessmentVersionId),
    });

    await replaceAssessmentVersionLanguageOverview(dependencies.db, {
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      inputs: toOverviewLanguageInputs(validation.validRows),
    });

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(authoringPath(assessmentVersion.assessmentKey));

    return {
      ...preview,
      success: true,
      canImport: false,
      summary: {
        ...preview.summary,
        assessmentVersionId: assessmentVersion.assessmentVersionId,
        importedRowCount: validation.validRows.length,
        importedPatternCount: new Set(validation.validRows.map((row) => row.canonicalPatternKey)).size,
      },
    };
  } catch {
    return {
      ...preview,
      success: false,
      canImport: false,
      executionError: 'Overview language import could not be saved. Try again.',
    };
  }
}

async function loadAssessmentVersionForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<AssessmentVersionImportTarget | null> {
  const result = await db.query<AssessmentVersionRow>(
    `
    SELECT
      a.assessment_key,
      av.id AS assessment_version_id,
      av.lifecycle_status
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );

  const row = result.rows[0] ?? null;
  if (!row) {
    return null;
  }

  return {
    assessmentVersionId: row.assessment_version_id,
    assessmentKey: row.assessment_key,
    lifecycleStatus: row.lifecycle_status,
  };
}

async function loadTargetSignalsForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly string[]> {
  const result = await db.query<SignalRow>(
    `
    SELECT
      s.signal_key
    FROM signals s
    INNER JOIN domains d
      ON d.id = s.domain_id
      AND d.assessment_version_id = s.assessment_version_id
    WHERE s.assessment_version_id = $1
    ORDER BY d.order_index ASC, s.order_index ASC, s.id ASC
    `,
    [assessmentVersionId],
  );

  return result.rows.map((row) => row.signal_key);
}

function buildPlanErrors(
  assessmentVersion: AssessmentVersionImportTarget | null,
  signalCount: number,
): readonly OverviewLanguageImportPlanError[] {
  const errors: OverviewLanguageImportPlanError[] = [];

  if (!assessmentVersion) {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    });
  } else if (assessmentVersion.lifecycleStatus !== 'DRAFT') {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_EDITABLE',
      message: 'Overview language import is allowed only for draft assessment versions.',
    });
  } else if (signalCount === 0) {
    errors.push({
      code: 'SIGNAL_SET_EMPTY',
      message: 'The active assessment version does not contain any authored signals for pattern resolution.',
    });
  }

  return errors;
}

function buildResult(params: {
  assessmentVersionId: string | null;
  parseErrors: readonly OverviewLanguageParseError[];
  validationErrors: readonly OverviewLanguageValidationError[];
  planErrors: readonly OverviewLanguageImportPlanError[];
  previewGroups: readonly OverviewLanguagePreviewGroup[];
  existingRowCount: number;
  rowCount?: number;
  patternCount?: number;
}): OverviewLanguageImportPreviewResult {
  const rowCount = params.rowCount ?? 0;
  const patternCount = params.patternCount ?? 0;
  const success =
    params.parseErrors.length === 0 &&
    params.validationErrors.length === 0 &&
    params.planErrors.length === 0;

  return {
    success,
    canImport: success,
    parseErrors: params.parseErrors,
    validationErrors: params.validationErrors,
    planErrors: params.planErrors,
    previewGroups: params.previewGroups,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
      rowCount,
      patternCount,
      existingRowCount: params.existingRowCount,
      importedRowCount: 0,
      importedPatternCount: 0,
    },
    executionError: null,
  };
}
