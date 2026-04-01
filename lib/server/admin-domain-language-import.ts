'use server';

import { revalidatePath } from 'next/cache';

import {
  buildDomainLanguagePreview,
  parseDomainLanguageRows,
  toDomainLanguageInputs,
  validateDomainLanguageRows,
  type DomainLanguageParseError,
  type DomainLanguagePreviewGroup,
  type DomainLanguageValidationError,
} from '@/lib/admin/domain-language-import';
import { getDbPool } from '@/lib/server/db';
import {
  getAssessmentVersionLanguageDomains,
  replaceAssessmentVersionLanguageDomains,
} from '@/lib/server/assessment-version-language';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type DomainLanguageImportDependencies = {
  db: Queryable & {
    connect(): Promise<Queryable & { release(): void }>;
  };
  revalidatePath(path: string): void;
};

type DomainLanguageImportPreviewDependencies = {
  db: Queryable;
};

type AssessmentVersionRow = {
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type DomainRow = {
  domain_id: string;
  domain_key: string;
};

type AssessmentVersionImportTarget = {
  assessmentVersionId: string;
  assessmentKey: string;
  lifecycleStatus: AssessmentVersionRow['lifecycle_status'];
};

export type DomainLanguageImportCommand = {
  assessmentVersionId: string;
  rawInput: string;
};

export type DomainLanguageImportPlanError = {
  code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'DOMAIN_SET_EMPTY';
  message: string;
};

export type DomainLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  domainCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedDomainCount: number;
};

export type DomainLanguageImportPreviewResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: readonly DomainLanguageParseError[];
  validationErrors: readonly DomainLanguageValidationError[];
  planErrors: readonly DomainLanguageImportPlanError[];
  previewGroups: readonly DomainLanguagePreviewGroup[];
  summary: DomainLanguageImportSummary;
  executionError: string | null;
};

export type DomainLanguageImportExecutionResult = DomainLanguageImportPreviewResult;

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}/language`;
}

export async function previewDomainLanguageForAssessmentVersion(
  command: DomainLanguageImportCommand,
): Promise<DomainLanguageImportPreviewResult> {
  return previewDomainLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewDomainLanguageForAssessmentVersionWithDependencies(
  command: DomainLanguageImportCommand,
  dependencies: DomainLanguageImportPreviewDependencies,
): Promise<DomainLanguageImportPreviewResult> {
  const parsed = parseDomainLanguageRows(command.rawInput);
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
  const authoredDomains = await loadTargetDomainsForImport(dependencies.db, command.assessmentVersionId);
  const validationErrors =
    authoredDomains.length > 0
      ? validateDomainLanguageRows({
          rows: parsed.records,
          validDomainKeys: authoredDomains.map((domain) => domain.domainKey),
        }).errors
      : parsed.records.map((row) => ({
          lineNumber: row.lineNumber,
          rawLine: row.rawLine,
          domainKey: row.domainKey,
          section: row.section,
          code: 'INVALID_DOMAIN_KEY' as const,
          message: `Domain key ${row.domainKey} does not exist in the active assessment version.`,
        }));
  const planErrors = buildPlanErrors(assessmentVersion, authoredDomains.length);
  const existingRows = assessmentVersion
    ? await getAssessmentVersionLanguageDomains(dependencies.db, assessmentVersion.assessmentVersionId)
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
      domainCount: new Set(parsed.records.map((row) => row.domainKey)).size,
    });
  }

  return buildResult({
    assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
    parseErrors: [],
    validationErrors: [],
    planErrors: [],
    previewGroups: buildDomainLanguagePreview({
      rows: parsed.records,
      domainKeysInOrder: authoredDomains.map((domain) => domain.domainKey),
    }),
    existingRowCount: existingRows.length,
    rowCount: parsed.records.length,
    domainCount: new Set(parsed.records.map((row) => row.domainKey)).size,
  });
}

export async function importDomainLanguageForAssessmentVersion(
  command: DomainLanguageImportCommand,
): Promise<DomainLanguageImportExecutionResult> {
  return importDomainLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function importDomainLanguageForAssessmentVersionWithDependencies(
  command: DomainLanguageImportCommand,
  dependencies: DomainLanguageImportDependencies,
): Promise<DomainLanguageImportExecutionResult> {
  const preview = await previewDomainLanguageForAssessmentVersionWithDependencies(command, {
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
      planErrors: buildPlanErrors(null, preview.summary.domainCount),
    };
  }

  try {
    const parsed = parseDomainLanguageRows(command.rawInput);
    await replaceAssessmentVersionLanguageDomains(dependencies.db, {
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      inputs: toDomainLanguageInputs(parsed.records),
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
        importedDomainCount: new Set(parsed.records.map((row) => row.domainKey)).size,
      },
    };
  } catch {
    return {
      ...preview,
      success: false,
      canImport: false,
      executionError: 'Domain language import could not be saved. Try again.',
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

async function loadTargetDomainsForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly { domainId: string; domainKey: string }[]> {
  const result = await db.query<DomainRow>(
    `
    SELECT
      id AS domain_id,
      domain_key
    FROM domains
    WHERE assessment_version_id = $1
      AND domain_type = 'SIGNAL_GROUP'
    ORDER BY order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return result.rows.map((row) => ({
    domainId: row.domain_id,
    domainKey: row.domain_key,
  }));
}

function buildPlanErrors(
  assessmentVersion: AssessmentVersionImportTarget | null,
  domainCount: number,
): readonly DomainLanguageImportPlanError[] {
  const errors: DomainLanguageImportPlanError[] = [];

  if (!assessmentVersion) {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    });
  } else if (assessmentVersion.lifecycleStatus !== 'DRAFT') {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_EDITABLE',
      message: 'Domain language import is allowed only for draft assessment versions.',
    });
  } else if (domainCount === 0) {
    errors.push({
      code: 'DOMAIN_SET_EMPTY',
      message: 'The active assessment version does not contain any authored result domains.',
    });
  }

  return errors;
}

function buildResult(params: {
  assessmentVersionId: string | null;
  parseErrors: readonly DomainLanguageParseError[];
  validationErrors: readonly DomainLanguageValidationError[];
  planErrors: readonly DomainLanguageImportPlanError[];
  previewGroups: readonly DomainLanguagePreviewGroup[];
  existingRowCount: number;
  rowCount?: number;
  domainCount?: number;
}): DomainLanguageImportPreviewResult {
  const rowCount = params.rowCount ?? 0;
  const domainCount = params.domainCount ?? 0;
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
      domainCount,
      existingRowCount: params.existingRowCount,
      importedRowCount: 0,
      importedDomainCount: 0,
    },
    executionError: null,
  };
}
