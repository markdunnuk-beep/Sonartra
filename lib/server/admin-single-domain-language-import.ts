'use server';

import { revalidatePath } from 'next/cache';

import {
  getSingleDomainLanguageDatasetDefinition,
} from '@/lib/admin/single-domain-language-datasets';
import type {
  SingleDomainLanguageImportPreviewGroup,
} from '@/lib/admin/single-domain-language-import';
import { getSingleDomainLanguageBundle, saveSingleDomainLanguageDataset } from '@/lib/server/assessment-version-single-domain-language';
import { getDbPool } from '@/lib/server/db';
import {
  isSingleDomainLanguageDatasetKey,
  singleDomainLanguageSchemaRegistry,
  validateSingleDomainDatasetHeaders,
} from '@/lib/validation/single-domain-language';
import type {
  SingleDomainLanguageDatasetKey,
  SingleDomainLanguageDatasetRowMap,
} from '@/lib/types/single-domain-language';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type Dependencies = {
  db: Queryable & {
    connect(): Promise<Queryable & { release(): void }>;
  };
  revalidatePath(path: string): void;
};

type PreviewDependencies = {
  db: Queryable;
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

type ImportParseError = {
  lineNumber: number;
  message: string;
};

type ImportValidationError = {
  lineNumber: number | null;
  message: string;
};

type ParseDatasetResult<TKey extends SingleDomainLanguageDatasetKey> = {
  success: boolean;
  rows: readonly SingleDomainLanguageDatasetRowMap[TKey][];
  parseErrors: readonly ImportParseError[];
  validationErrors: readonly ImportValidationError[];
  targetCount: number;
};

export type SingleDomainLanguageImportPlanError = {
  code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'INVALID_DATASET_KEY';
  message: string;
};

export type SingleDomainLanguageImportCommand = {
  assessmentVersionId: string;
  datasetKey: SingleDomainLanguageDatasetKey;
  rawInput: string;
};

export type SingleDomainLanguageImportResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: readonly { message: string }[];
  validationErrors: readonly { message: string }[];
  planErrors: readonly SingleDomainLanguageImportPlanError[];
  previewGroups: readonly SingleDomainLanguageImportPreviewGroup[];
  summary: {
    assessmentVersionId: string | null;
    rowCount: number;
    targetCount: number;
    existingRowCount: number;
    importedRowCount: number;
    importedTargetCount: number;
  };
  executionError: string | null;
};

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/single-domain/${assessmentKey}/language`;
}

function reviewPath(assessmentKey: string): string {
  return `/admin/assessments/single-domain/${assessmentKey}/review`;
}

function splitInputLines(rawInput: string): readonly string[] {
  return rawInput.replace(/\s+$/, '').split(/\r?\n/);
}

function normalizeCell(value: string): string {
  return value.trim();
}

function buildDuplicateRowKey(row: Record<string, string>, primaryKey: string): string {
  if (primaryKey === 'driver_claim_key') {
    return [
      row.domain_key ?? '',
      row.pair_key ?? '',
      row.signal_key ?? '',
      row.driver_role ?? '',
      row.priority ?? '',
    ].join('|');
  }

  return row[primaryKey] ?? '';
}

function parseSingleDomainDatasetInput<TKey extends SingleDomainLanguageDatasetKey>(
  datasetKey: TKey,
  rawInput: string,
): ParseDatasetResult<TKey> {
  const definition = getSingleDomainLanguageDatasetDefinition(datasetKey);
  const lines = splitInputLines(rawInput);

  if (lines.length === 0 || lines.every((line) => line.trim().length === 0)) {
    return {
      success: false,
      rows: [],
      parseErrors: [{ lineNumber: 1, message: 'Header row is required.' }],
      validationErrors: [],
      targetCount: 0,
    };
  }

  const headerLine = lines[0] ?? '';
  const headerValidation = validateSingleDomainDatasetHeaders(
    datasetKey,
    headerLine.split('|').map(normalizeCell),
  );

  if (!headerValidation.success) {
    return {
      success: false,
      rows: [],
      parseErrors: [{ lineNumber: 1, message: headerValidation.message }],
      validationErrors: [],
      targetCount: 0,
    };
  }

  const expectedHeaders = [...definition.expectedHeaders];
  const rawRows: Array<Record<string, string>> = [];
  const parseErrors: ImportParseError[] = [];

  for (const [index, rowLine] of lines.slice(1).entries()) {
    const lineNumber = index + 2;

    if (rowLine.trim().length === 0) {
      parseErrors.push({
        lineNumber,
        message: `Line ${lineNumber}: blank rows are not allowed.`,
      });
      continue;
    }

    const columns = rowLine.split('|');
    if (columns.length !== expectedHeaders.length) {
      parseErrors.push({
        lineNumber,
        message: `Line ${lineNumber}: expected exactly ${expectedHeaders.length} pipe-delimited columns.`,
      });
      continue;
    }

    rawRows.push(
      Object.fromEntries(
        expectedHeaders.map((header, columnIndex) => [header, normalizeCell(columns[columnIndex] ?? '')]),
      ),
    );
  }

  if (parseErrors.length > 0) {
    return {
      success: false,
      rows: [],
      parseErrors,
      validationErrors: [],
      targetCount: 0,
    };
  }

  const rowSchema = singleDomainLanguageSchemaRegistry[datasetKey].rowSchema;
  const parsedRows: SingleDomainLanguageDatasetRowMap[TKey][] = [];
  const validationErrors: ImportValidationError[] = [];
  const seenKeys = new Set<string>();

  rawRows.forEach((row, index) => {
    const lineNumber = index + 2;

    try {
      const parsedRow = rowSchema.parse(row) as SingleDomainLanguageDatasetRowMap[TKey];
      const duplicateKey = buildDuplicateRowKey(
        parsedRow as unknown as Record<string, string>,
        definition.primaryKey,
      );

      if (seenKeys.has(duplicateKey)) {
        validationErrors.push({
          lineNumber,
          message: `Line ${lineNumber}: duplicate ${definition.primaryKey} "${duplicateKey}".`,
        });
        return;
      }

      seenKeys.add(duplicateKey);
      parsedRows.push(parsedRow);
    } catch (error) {
      validationErrors.push({
        lineNumber,
        message: error instanceof Error ? `Line ${lineNumber}: ${error.message}` : `Line ${lineNumber}: invalid row.`,
      });
    }
  });

  return {
    success: validationErrors.length === 0,
    rows: validationErrors.length === 0 ? parsedRows : [],
    parseErrors: [],
    validationErrors,
    targetCount: seenKeys.size,
  };
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
  datasetKey: string,
  assessmentVersion: AssessmentVersionImportTarget | null,
): readonly SingleDomainLanguageImportPlanError[] {
  if (!isSingleDomainLanguageDatasetKey(datasetKey)) {
    return [{
      code: 'INVALID_DATASET_KEY',
      message: `Invalid single-domain dataset key "${datasetKey}".`,
    }];
  }

  if (!assessmentVersion) {
    return [{
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    }];
  }

  if (assessmentVersion.lifecycleStatus !== 'DRAFT') {
    return [{
      code: 'ASSESSMENT_VERSION_NOT_EDITABLE',
      message: 'Single-domain language imports can be saved only for draft assessment versions.',
    }];
  }

  return [];
}

function getExistingRowCount<TKey extends SingleDomainLanguageDatasetKey>(
  datasetKey: TKey,
  bundle: Awaited<ReturnType<typeof getSingleDomainLanguageBundle>>,
): number {
  return bundle[datasetKey]?.length ?? 0;
}

function buildPreviewGroups<TKey extends SingleDomainLanguageDatasetKey>(
  datasetKey: TKey,
  rows: readonly SingleDomainLanguageDatasetRowMap[TKey][],
): readonly SingleDomainLanguageImportPreviewGroup[] {
  const definition = getSingleDomainLanguageDatasetDefinition(datasetKey);

  return rows.map((row, index) => ({
    targetKey: buildDuplicateRowKey(row as unknown as Record<string, string>, definition.primaryKey),
    targetLabel: buildDuplicateRowKey(row as unknown as Record<string, string>, definition.primaryKey),
    entries: definition.expectedHeaders
      .filter((header) => header !== definition.primaryKey)
      .map((header) => ({
        lineNumber: index + 2,
        label: header,
        content: String((row as unknown as Record<string, string>)[header] ?? ''),
      })),
  }));
}

function buildResult(params: {
  assessmentVersionId: string | null;
  parseErrors: readonly ImportParseError[];
  validationErrors: readonly ImportValidationError[];
  planErrors: readonly SingleDomainLanguageImportPlanError[];
  previewGroups: readonly SingleDomainLanguageImportPreviewGroup[];
  existingRowCount: number;
  rowCount?: number;
  targetCount?: number;
}): SingleDomainLanguageImportResult {
  const success =
    params.parseErrors.length === 0 &&
    params.validationErrors.length === 0 &&
    params.planErrors.length === 0;

  return {
    success,
    canImport: success,
    parseErrors: params.parseErrors.map((error) => ({ message: error.message })),
    validationErrors: params.validationErrors.map((error) => ({ message: error.message })),
    planErrors: params.planErrors,
    previewGroups: params.previewGroups,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
      rowCount: params.rowCount ?? 0,
      targetCount: params.targetCount ?? 0,
      existingRowCount: params.existingRowCount,
      importedRowCount: 0,
      importedTargetCount: 0,
    },
    executionError: null,
  };
}

export async function previewSingleDomainLanguageDatasetForAssessmentVersion(
  command: SingleDomainLanguageImportCommand,
): Promise<SingleDomainLanguageImportResult> {
  return previewSingleDomainLanguageDatasetForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewSingleDomainLanguageDatasetForAssessmentVersionWithDependencies(
  command: SingleDomainLanguageImportCommand,
  dependencies: PreviewDependencies,
): Promise<SingleDomainLanguageImportResult> {
  const parsed = parseSingleDomainDatasetInput(command.datasetKey, command.rawInput);
  if (parsed.parseErrors.length > 0) {
    return buildResult({
      assessmentVersionId: command.assessmentVersionId,
      parseErrors: parsed.parseErrors,
      validationErrors: [],
      planErrors: [],
      previewGroups: [],
      existingRowCount: 0,
      rowCount: 0,
      targetCount: 0,
    });
  }

  const assessmentVersion = await loadAssessmentVersionForImport(
    dependencies.db,
    command.assessmentVersionId,
  );
  const planErrors = buildPlanErrors(command.datasetKey, assessmentVersion);
  const bundle = assessmentVersion
    ? await getSingleDomainLanguageBundle(dependencies.db, assessmentVersion.assessmentVersionId)
    : null;
  const existingRowCount = bundle ? getExistingRowCount(command.datasetKey, bundle) : 0;

  if (parsed.validationErrors.length > 0 || planErrors.length > 0) {
    return buildResult({
      assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
      parseErrors: [],
      validationErrors: parsed.validationErrors,
      planErrors,
      previewGroups: [],
      existingRowCount,
      rowCount: parsed.rows.length,
      targetCount: parsed.targetCount,
    });
  }

  return buildResult({
    assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
    parseErrors: [],
    validationErrors: [],
    planErrors: [],
    previewGroups: buildPreviewGroups(command.datasetKey, parsed.rows),
    existingRowCount,
    rowCount: parsed.rows.length,
    targetCount: parsed.targetCount,
  });
}

export async function importSingleDomainLanguageDatasetForAssessmentVersion(
  command: SingleDomainLanguageImportCommand,
): Promise<SingleDomainLanguageImportResult> {
  return importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies(
  command: SingleDomainLanguageImportCommand,
  dependencies: Dependencies,
): Promise<SingleDomainLanguageImportResult> {
  const preview = await previewSingleDomainLanguageDatasetForAssessmentVersionWithDependencies(command, {
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
      planErrors: buildPlanErrors(command.datasetKey, null),
    };
  }

  try {
    const parsed = parseSingleDomainDatasetInput(command.datasetKey, command.rawInput);
    await saveSingleDomainLanguageDataset(dependencies.db, {
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      datasetKey: command.datasetKey,
      rows: parsed.rows,
    });

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(authoringPath(assessmentVersion.assessmentKey));
    dependencies.revalidatePath(reviewPath(assessmentVersion.assessmentKey));

    return {
      ...preview,
      success: true,
      canImport: false,
      summary: {
        ...preview.summary,
        assessmentVersionId: assessmentVersion.assessmentVersionId,
        importedRowCount: parsed.rows.length,
        importedTargetCount: parsed.targetCount,
      },
    };
  } catch (error) {
    const definition = getSingleDomainLanguageDatasetDefinition(command.datasetKey);

    return {
      ...preview,
      success: false,
      canImport: false,
      executionError: error instanceof Error
        ? `${definition.label} import could not be saved: ${error.message}`
        : `${definition.label} import could not be saved.`,
    };
  }
}
