'use server';

import { revalidatePath } from 'next/cache';

import {
  buildPairLanguagePreview,
  parsePairLanguageRows,
  toPairLanguageInputs,
  validatePairLanguageRows,
  type PairLanguageParseError,
  type PairLanguagePreviewGroup,
  type PairLanguageValidationError,
} from '@/lib/admin/pair-language-import';
import { getDbPool } from '@/lib/server/db';
import {
  getAssessmentVersionLanguagePairs,
  replaceAssessmentVersionLanguagePairs,
} from '@/lib/server/assessment-version-language';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type PairLanguageImportDependencies = {
  db: Queryable & {
    connect(): Promise<Queryable & { release(): void }>;
  };
  revalidatePath(path: string): void;
};

type PairLanguageImportPreviewDependencies = {
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

export type PairLanguageImportCommand = {
  assessmentVersionId: string;
  rawInput: string;
};

export type PairLanguageImportPlanError = {
  code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
  message: string;
};

export type PairLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  pairCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedPairCount: number;
};

export type PairLanguageImportPreviewResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: readonly PairLanguageParseError[];
  validationErrors: readonly PairLanguageValidationError[];
  planErrors: readonly PairLanguageImportPlanError[];
  previewGroups: readonly PairLanguagePreviewGroup[];
  summary: PairLanguageImportSummary;
  executionError: string | null;
};

export type PairLanguageImportExecutionResult = PairLanguageImportPreviewResult;

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}/language`;
}

export async function previewPairLanguageForAssessmentVersion(
  command: PairLanguageImportCommand,
): Promise<PairLanguageImportPreviewResult> {
  return previewPairLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewPairLanguageForAssessmentVersionWithDependencies(
  command: PairLanguageImportCommand,
  dependencies: PairLanguageImportPreviewDependencies,
): Promise<PairLanguageImportPreviewResult> {
  const parsed = parsePairLanguageRows(command.rawInput);
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
  const validation = validatePairLanguageRows({
    rows: parsed.records,
    validSignalKeys: authoredSignals,
  });
  const planErrors = buildPlanErrors(assessmentVersion, authoredSignals.length);
  const existingRows = assessmentVersion
    ? await getAssessmentVersionLanguagePairs(dependencies.db, assessmentVersion.assessmentVersionId)
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
      pairCount: new Set(validation.validRows.map((row) => row.canonicalSignalPair)).size,
    });
  }

  return buildResult({
    assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
    parseErrors: [],
    validationErrors: [],
    planErrors: [],
    previewGroups: buildPairLanguagePreview({
      rows: validation.validRows,
      signalKeysInOrder: authoredSignals,
    }),
    existingRowCount: existingRows.length,
    rowCount: validation.validRows.length,
    pairCount: new Set(validation.validRows.map((row) => row.canonicalSignalPair)).size,
  });
}

export async function importPairLanguageForAssessmentVersion(
  command: PairLanguageImportCommand,
): Promise<PairLanguageImportExecutionResult> {
  return importPairLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function importPairLanguageForAssessmentVersionWithDependencies(
  command: PairLanguageImportCommand,
  dependencies: PairLanguageImportDependencies,
): Promise<PairLanguageImportExecutionResult> {
  const preview = await previewPairLanguageForAssessmentVersionWithDependencies(command, {
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
      planErrors: buildPlanErrors(null, preview.summary.pairCount),
    };
  }

  try {
    const parsed = parsePairLanguageRows(command.rawInput);
    const validation = validatePairLanguageRows({
      rows: parsed.records,
      validSignalKeys: await loadTargetSignalsForImport(dependencies.db, command.assessmentVersionId),
    });

    await replaceAssessmentVersionLanguagePairs(dependencies.db, {
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      inputs: toPairLanguageInputs(validation.validRows),
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
        importedPairCount: new Set(validation.validRows.map((row) => row.canonicalSignalPair)).size,
      },
    };
  } catch {
    return {
      ...preview,
      success: false,
      canImport: false,
      executionError: 'Pair language import could not be saved. Try again.',
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
): readonly PairLanguageImportPlanError[] {
  const errors: PairLanguageImportPlanError[] = [];

  if (!assessmentVersion) {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    });
  } else if (assessmentVersion.lifecycleStatus !== 'DRAFT') {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_EDITABLE',
      message: 'Pair language import is allowed only for draft assessment versions.',
    });
  } else if (signalCount === 0) {
    errors.push({
      code: 'SIGNAL_SET_EMPTY',
      message: 'The active assessment version does not contain any authored signals.',
    });
  }

  return errors;
}

function buildResult(params: {
  assessmentVersionId: string | null;
  parseErrors: readonly PairLanguageParseError[];
  validationErrors: readonly PairLanguageValidationError[];
  planErrors: readonly PairLanguageImportPlanError[];
  previewGroups: readonly PairLanguagePreviewGroup[];
  existingRowCount: number;
  rowCount?: number;
  pairCount?: number;
}): PairLanguageImportPreviewResult {
  const rowCount = params.rowCount ?? 0;
  const pairCount = params.pairCount ?? 0;
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
      pairCount,
      existingRowCount: params.existingRowCount,
      importedRowCount: 0,
      importedPairCount: 0,
    },
    executionError: null,
  };
}
