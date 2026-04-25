'use server';

import { revalidatePath } from 'next/cache';

import { getAssessmentBuilderStepPath } from '@/lib/admin/assessment-builder-paths';
import {
  getLegacyDatasetKeyForNarrativeDataset,
  mapSingleDomainNarrativeRowsToLegacyDataset,
} from '@/lib/assessment-language/single-domain-import-mappers';
import { parseSingleDomainImportInput } from '@/lib/assessment-language/single-domain-import-parsers';
import {
  buildSingleDomainImportValidationContext,
  normalizeSingleDomainImportRowsForRuntimePairKeys,
  validateSingleDomainImportRows,
} from '@/lib/assessment-language/single-domain-import-validators';
import type { SingleDomainNarrativeDatasetKey } from '@/lib/assessment-language/single-domain-narrative-types';
import { getAdminAssessmentDetailByKey } from '@/lib/server/admin-assessment-detail';
import { getSingleDomainLanguageBundle, saveSingleDomainLanguageDataset } from '@/lib/server/assessment-version-single-domain-language';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type Dependencies = {
  db: Queryable & {
    connect(): Promise<Queryable & { release(): void }>;
  };
  revalidatePath(path: string): void;
};

type AssessmentVersionRow = {
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type AssessmentVersionImportTarget = {
  assessmentVersionId: string;
  assessmentKey: string;
  lifecycleStatus: AssessmentVersionRow['lifecycle_status'];
};

type ImportPlanErrorCode =
  | 'ASSESSMENT_VERSION_NOT_FOUND'
  | 'ASSESSMENT_VERSION_NOT_EDITABLE'
  | 'MISSING_AUTHORED_DOMAIN';

export type SingleDomainNarrativeImportPlanError = {
  code: ImportPlanErrorCode;
  message: string;
};

export type SingleDomainNarrativeImportCommand = {
  assessmentVersionId: string;
  datasetKey: SingleDomainNarrativeDatasetKey;
  rawInput: string;
};

export type SingleDomainNarrativeImportResult = {
  success: boolean;
  parseErrors: readonly { message: string }[];
  validationErrors: readonly { message: string }[];
  planErrors: readonly SingleDomainNarrativeImportPlanError[];
  executionError: string | null;
  latestValidationResult: string | null;
  summary: {
    assessmentVersionId: string | null;
    rowCount: number;
    existingRowCount: number;
    importedRowCount: number;
  };
};

function reviewPath(assessmentKey: string): string {
  return getAssessmentBuilderStepPath(assessmentKey, 'review', 'single_domain');
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

function buildPlanErrors(
  assessmentVersion: AssessmentVersionImportTarget | null,
  currentDomainKey: string | null,
): readonly SingleDomainNarrativeImportPlanError[] {
  if (!assessmentVersion) {
    return [{
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    }];
  }

  if (assessmentVersion.lifecycleStatus !== 'DRAFT') {
    return [{
      code: 'ASSESSMENT_VERSION_NOT_EDITABLE',
      message: 'Section imports can be saved only for draft assessment versions.',
    }];
  }

  if (!currentDomainKey) {
    return [{
      code: 'MISSING_AUTHORED_DOMAIN',
      message: 'Create the single authored domain before importing narrative language.',
    }];
  }

  return [];
}

function buildResult(params: {
  assessmentVersionId: string | null;
  parseErrors: readonly { message: string }[];
  validationErrors: readonly { message: string }[];
  planErrors: readonly SingleDomainNarrativeImportPlanError[];
  executionError: string | null;
  latestValidationResult: string | null;
  rowCount?: number;
  existingRowCount: number;
  importedRowCount?: number;
}): SingleDomainNarrativeImportResult {
  const success =
    params.parseErrors.length === 0
    && params.validationErrors.length === 0
    && params.planErrors.length === 0
    && params.executionError === null;

  return {
    success,
    parseErrors: params.parseErrors,
    validationErrors: params.validationErrors,
    planErrors: params.planErrors,
    executionError: params.executionError,
    latestValidationResult: params.latestValidationResult,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
      rowCount: params.rowCount ?? 0,
      existingRowCount: params.existingRowCount,
      importedRowCount: params.importedRowCount ?? 0,
    },
  };
}

export async function importSingleDomainNarrativeSectionForAssessmentVersion(
  command: SingleDomainNarrativeImportCommand,
): Promise<SingleDomainNarrativeImportResult> {
  return importSingleDomainNarrativeSectionForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function importSingleDomainNarrativeSectionForAssessmentVersionWithDependencies(
  command: SingleDomainNarrativeImportCommand,
  dependencies: Dependencies,
): Promise<SingleDomainNarrativeImportResult> {
  const assessmentVersion = await loadAssessmentVersionForImport(
    dependencies.db,
    command.assessmentVersionId,
  );

  if (!assessmentVersion) {
    return buildResult({
      assessmentVersionId: null,
      parseErrors: [],
      validationErrors: [],
      planErrors: buildPlanErrors(null, null),
      executionError: null,
      latestValidationResult: null,
      existingRowCount: 0,
    });
  }

  const assessment = await getAdminAssessmentDetailByKey(
    dependencies.db,
    assessmentVersion.assessmentKey,
  );

  const currentDomainKey = assessment?.authoredDomains[0]?.domainKey ?? null;
  const signalKeys = assessment?.availableSignals.map((signal) => signal.signalKey) ?? [];
  const planErrors = buildPlanErrors(assessmentVersion, currentDomainKey);
  const existingBundle = await getSingleDomainLanguageBundle(
    dependencies.db,
    assessmentVersion.assessmentVersionId,
  );
  const mappedLegacyDataset = getLegacyDatasetKeyForNarrativeDataset(command.datasetKey);
  const existingRowCount = existingBundle[mappedLegacyDataset].length;

  if (planErrors.length > 0) {
    return buildResult({
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      parseErrors: [],
      validationErrors: [],
      planErrors,
      executionError: null,
      latestValidationResult: null,
      existingRowCount,
    });
  }

  const parsed = parseSingleDomainImportInput(command.datasetKey, command.rawInput);
  if (!parsed.success) {
    return buildResult({
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      parseErrors: parsed.parseErrors.map((error) => ({ message: error.message })),
      validationErrors: [],
      planErrors: [],
      executionError: null,
      latestValidationResult: 'Header or row-shape validation failed.',
      existingRowCount,
    });
  }

  const validationContext = buildSingleDomainImportValidationContext({
    datasetKey: command.datasetKey,
    currentDomainKey,
    signalKeys,
  });
  const validated = validateSingleDomainImportRows(validationContext, parsed.rows);
  if (!validated.success) {
    return buildResult({
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      parseErrors: [],
      validationErrors: validated.validationErrors.map((error) => ({ message: error.message })),
      planErrors: [],
      executionError: null,
      latestValidationResult: 'Section validation failed.',
      rowCount: parsed.rows.length,
      existingRowCount,
    });
  }

  const legacyDataset = mapSingleDomainNarrativeRowsToLegacyDataset(
    command.datasetKey,
    normalizeSingleDomainImportRowsForRuntimePairKeys(validationContext, validated.rows),
  );

  try {
    await saveSingleDomainLanguageDataset(dependencies.db, {
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      datasetKey: legacyDataset.datasetKey,
      rows: legacyDataset.rows,
    });
  } catch (error) {
    return buildResult({
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      parseErrors: [],
      validationErrors: [],
      planErrors: [],
      executionError: error instanceof Error ? error.message : 'Import failed while saving section rows.',
      latestValidationResult: 'Import validation passed, but persistence failed.',
      rowCount: validated.rows.length,
      existingRowCount,
    });
  }

  const languagePath = getAssessmentBuilderStepPath(
    assessmentVersion.assessmentKey,
    'language',
    'single_domain',
  );
  dependencies.revalidatePath('/admin/assessments');
  dependencies.revalidatePath(languagePath);
  dependencies.revalidatePath(reviewPath(assessmentVersion.assessmentKey));

  return buildResult({
    assessmentVersionId: assessmentVersion.assessmentVersionId,
    parseErrors: [],
    validationErrors: [],
    planErrors: [],
    executionError: null,
    latestValidationResult: `Imported ${validated.rows.length} ${validationContext.targetSection} row${validated.rows.length === 1 ? '' : 's'} successfully.`,
    rowCount: validated.rows.length,
    existingRowCount,
    importedRowCount: validated.rows.length,
  });
}
