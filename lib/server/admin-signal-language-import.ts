'use server';

import { revalidatePath } from 'next/cache';

import {
  buildSignalLanguagePreview,
  parseDelimitedLanguageRows,
  toSignalLanguageInputs,
  validateSignalLanguageRows,
  type SignalLanguageParseError,
  type SignalLanguagePreviewGroup,
  type SignalLanguageValidationError,
} from '@/lib/admin/signal-language-import';
import { getDbPool } from '@/lib/server/db';
import {
  getAssessmentVersionLanguageSignals,
  replaceAssessmentVersionLanguageSignals,
} from '@/lib/server/assessment-version-language';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type SignalLanguageImportDependencies = {
  db: Queryable & {
    connect(): Promise<Queryable & { release(): void }>;
  };
  revalidatePath(path: string): void;
};

type SignalLanguageImportPreviewDependencies = {
  db: Queryable;
};

type AssessmentVersionRow = {
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type SignalRow = {
  signal_id: string;
  signal_key: string;
};

type AssessmentVersionImportTarget = {
  assessmentVersionId: string;
  assessmentKey: string;
  lifecycleStatus: AssessmentVersionRow['lifecycle_status'];
};

export type SignalLanguageImportCommand = {
  assessmentVersionId: string;
  rawInput: string;
};

export type SignalLanguageImportPlanError = {
  code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
  message: string;
};

export type SignalLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  signalCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedSignalCount: number;
};

export type SignalLanguageImportPreviewResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: readonly SignalLanguageParseError[];
  validationErrors: readonly SignalLanguageValidationError[];
  planErrors: readonly SignalLanguageImportPlanError[];
  previewGroups: readonly SignalLanguagePreviewGroup[];
  summary: SignalLanguageImportSummary;
  executionError: string | null;
};

export type SignalLanguageImportExecutionResult = SignalLanguageImportPreviewResult;

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}/language`;
}

export async function previewSignalLanguageForAssessmentVersion(
  command: SignalLanguageImportCommand,
): Promise<SignalLanguageImportPreviewResult> {
  return previewSignalLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewSignalLanguageForAssessmentVersionWithDependencies(
  command: SignalLanguageImportCommand,
  dependencies: SignalLanguageImportPreviewDependencies,
): Promise<SignalLanguageImportPreviewResult> {
  const parsed = parseDelimitedLanguageRows(command.rawInput);
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
  const validationErrors =
    authoredSignals.length > 0
      ? validateSignalLanguageRows({
          rows: parsed.records,
          validSignalKeys: authoredSignals.map((signal) => signal.signalKey),
        }).errors
      : parsed.records.map((row) => ({
          lineNumber: row.lineNumber,
          rawLine: row.rawLine,
          signalKey: row.signalKey,
          section: row.section,
          code: 'INVALID_SIGNAL_KEY' as const,
          message: `Signal key ${row.signalKey} does not exist in the active assessment version.`,
        }));
  const planErrors = buildPlanErrors(assessmentVersion, authoredSignals.length);
  const existingRows = assessmentVersion
    ? await getAssessmentVersionLanguageSignals(dependencies.db, assessmentVersion.assessmentVersionId)
    : [];

  if (validationErrors.length > 0 || planErrors.length > 0) {
    return buildResult({
      assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
      parseErrors: [],
      validationErrors,
      planErrors,
      previewGroups: [],
      existingRowCount: existingRows.length,
      rowCount: parsed.records.length,
      signalCount: new Set(parsed.records.map((row) => row.signalKey)).size,
    });
  }

  return buildResult({
    assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
    parseErrors: [],
    validationErrors: [],
    planErrors: [],
    previewGroups: buildSignalLanguagePreview({
      rows: parsed.records,
      signalKeysInOrder: authoredSignals.map((signal) => signal.signalKey),
    }),
    existingRowCount: existingRows.length,
    rowCount: parsed.records.length,
    signalCount: new Set(parsed.records.map((row) => row.signalKey)).size,
  });
}

export async function importSignalLanguageForAssessmentVersion(
  command: SignalLanguageImportCommand,
): Promise<SignalLanguageImportExecutionResult> {
  return importSignalLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function importSignalLanguageForAssessmentVersionWithDependencies(
  command: SignalLanguageImportCommand,
  dependencies: SignalLanguageImportDependencies,
): Promise<SignalLanguageImportExecutionResult> {
  const preview = await previewSignalLanguageForAssessmentVersionWithDependencies(command, {
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
      planErrors: buildPlanErrors(null, preview.summary.signalCount),
    };
  }

  try {
    const parsed = parseDelimitedLanguageRows(command.rawInput);
    await replaceAssessmentVersionLanguageSignals(dependencies.db, {
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      inputs: toSignalLanguageInputs(parsed.records),
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
        importedRowCount: parsed.records.length,
        importedSignalCount: new Set(parsed.records.map((row) => row.signalKey)).size,
      },
    };
  } catch {
    return {
      ...preview,
      success: false,
      canImport: false,
      executionError: 'Signal language import could not be saved. Try again.',
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
): Promise<readonly { signalId: string; signalKey: string }[]> {
  const result = await db.query<SignalRow>(
    `
    SELECT
      s.id AS signal_id,
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

  return result.rows.map((row) => ({
    signalId: row.signal_id,
    signalKey: row.signal_key,
  }));
}

function buildPlanErrors(
  assessmentVersion: AssessmentVersionImportTarget | null,
  signalCount: number,
): readonly SignalLanguageImportPlanError[] {
  const errors: SignalLanguageImportPlanError[] = [];

  if (!assessmentVersion) {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    });
  } else if (assessmentVersion.lifecycleStatus !== 'DRAFT') {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_EDITABLE',
      message: 'Signal language import is allowed only for draft assessment versions.',
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
  parseErrors: readonly SignalLanguageParseError[];
  validationErrors: readonly SignalLanguageValidationError[];
  planErrors: readonly SignalLanguageImportPlanError[];
  previewGroups: readonly SignalLanguagePreviewGroup[];
  existingRowCount: number;
  rowCount?: number;
  signalCount?: number;
}): SignalLanguageImportPreviewResult {
  const rowCount = params.rowCount ?? 0;
  const signalCount = params.signalCount ?? 0;
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
      signalCount,
      existingRowCount: params.existingRowCount,
      importedRowCount: 0,
      importedSignalCount: 0,
    },
    executionError: null,
  };
}
