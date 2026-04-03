'use server';

import { revalidatePath } from 'next/cache';

import {
  buildReportAlignedLanguageStoragePlan,
  getReportSectionLabel,
  getReportSectionRowName,
  normalizeReportLanguageSection,
  parseReportLanguageRows,
  validateReportLanguageRows,
  type ReportLanguageSection,
  type ReportLanguageValidationError,
} from '@/lib/admin/report-language-import';
import type {
  AdminReportLanguageImportPreviewGroup,
} from '@/lib/admin/admin-report-language-import';
import { getDbPool } from '@/lib/server/db';
import {
  getAssessmentVersionLanguageDomains,
  getAssessmentVersionLanguageOverview,
  getAssessmentVersionLanguagePairs,
  getAssessmentVersionLanguageSignals,
  replaceAssessmentVersionLanguageDomains,
  replaceAssessmentVersionLanguageOverview,
  replaceAssessmentVersionLanguagePairs,
  replaceAssessmentVersionLanguageSignals,
} from '@/lib/server/assessment-version-language';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type ReportLanguageImportDependencies = {
  db: Queryable & {
    connect(): Promise<Queryable & { release(): void }>;
  };
  revalidatePath(path: string): void;
};

type ReportLanguageImportPreviewDependencies = {
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

type DomainRow = {
  domain_key: string;
};

type AssessmentVersionImportTarget = {
  assessmentVersionId: string;
  assessmentKey: string;
  lifecycleStatus: AssessmentVersionRow['lifecycle_status'];
};

export type ReportLanguageImportCommand = {
  assessmentVersionId: string;
  reportSection: Exclude<ReportLanguageSection, 'intro'>;
  rawInput: string;
};

export type ReportLanguageImportPlanError = {
  code:
    | 'ASSESSMENT_VERSION_NOT_FOUND'
    | 'ASSESSMENT_VERSION_NOT_EDITABLE'
    | 'SIGNAL_SET_EMPTY'
    | 'DOMAIN_SET_EMPTY'
    | 'WRONG_REPORT_SECTION';
  message: string;
};

export type ReportLanguageImportSummary = {
  assessmentVersionId: string | null;
  rowCount: number;
  targetCount: number;
  existingRowCount: number;
  importedRowCount: number;
  importedTargetCount: number;
};

export type ReportLanguageImportPreviewResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: ReturnType<typeof parseReportLanguageRows>['errors'];
  validationErrors: readonly ReportLanguageValidationError[];
  planErrors: readonly ReportLanguageImportPlanError[];
  previewGroups: readonly AdminReportLanguageImportPreviewGroup[];
  summary: ReportLanguageImportSummary;
  executionError: string | null;
};

export type ReportLanguageImportExecutionResult = ReportLanguageImportPreviewResult;

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}/language`;
}

export async function previewReportLanguageForAssessmentVersion(
  command: ReportLanguageImportCommand,
): Promise<ReportLanguageImportPreviewResult> {
  return previewReportLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewReportLanguageForAssessmentVersionWithDependencies(
  command: ReportLanguageImportCommand,
  dependencies: ReportLanguageImportPreviewDependencies,
): Promise<ReportLanguageImportPreviewResult> {
  const parsed = parseReportLanguageRows(command.rawInput);
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

  const sectionPlanErrors = buildWrongSectionErrors(parsed.records, command.reportSection);
  const assessmentVersion = await loadAssessmentVersionForImport(
    dependencies.db,
    command.assessmentVersionId,
  );
  const authoredSignals = await loadTargetSignalsForImport(dependencies.db, command.assessmentVersionId);
  const authoredDomains = await loadTargetDomainsForImport(dependencies.db, command.assessmentVersionId);
  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: authoredSignals,
    validDomainKeys: authoredDomains,
  });
  const planErrors = [
    ...sectionPlanErrors,
    ...buildPlanErrors(command.reportSection, assessmentVersion, authoredSignals.length, authoredDomains.length),
  ];

  const filteredRows = validation.validRows.filter((row) => row.section === command.reportSection);
  const existingRowCount = await loadExistingRowCount(
    dependencies.db,
    command.reportSection,
    assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
  );

  if (validation.errors.length > 0 || planErrors.length > 0) {
    return buildResult({
      assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
      parseErrors: [],
      validationErrors: validation.errors,
      planErrors,
      previewGroups: [],
      existingRowCount,
      rowCount: parsed.records.length,
      targetCount: countTargetsForSection(command.reportSection, filteredRows),
    });
  }

  return buildResult({
    assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
    parseErrors: [],
    validationErrors: [],
    planErrors: [],
    previewGroups: buildPreviewGroups(command.reportSection, filteredRows),
    existingRowCount,
    rowCount: filteredRows.length,
    targetCount: countTargetsForSection(command.reportSection, filteredRows),
  });
}

export async function importReportLanguageForAssessmentVersion(
  command: ReportLanguageImportCommand,
): Promise<ReportLanguageImportExecutionResult> {
  return importReportLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function importReportLanguageForAssessmentVersionWithDependencies(
  command: ReportLanguageImportCommand,
  dependencies: ReportLanguageImportDependencies,
): Promise<ReportLanguageImportExecutionResult> {
  const preview = await previewReportLanguageForAssessmentVersionWithDependencies(command, {
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
      planErrors: buildPlanErrors(command.reportSection, null, preview.summary.targetCount, preview.summary.targetCount),
    };
  }

  try {
    const parsed = parseReportLanguageRows(command.rawInput);
    const validation = validateReportLanguageRows({
      rows: parsed.records,
      validSignalKeys: await loadTargetSignalsForImport(dependencies.db, command.assessmentVersionId),
      validDomainKeys: await loadTargetDomainsForImport(dependencies.db, command.assessmentVersionId),
    });
    const filteredRows = validation.validRows.filter((row) => row.section === command.reportSection);
    const plan = buildReportAlignedLanguageStoragePlan(filteredRows);

    switch (command.reportSection) {
      case 'hero':
        await replaceAssessmentVersionLanguageOverview(dependencies.db, {
          assessmentVersionId: assessmentVersion.assessmentVersionId,
          inputs: plan.storage.overview,
        });
        break;
      case 'domain':
        await replaceAssessmentVersionLanguageDomains(dependencies.db, {
          assessmentVersionId: assessmentVersion.assessmentVersionId,
          inputs: plan.storage.domains,
        });
        break;
      case 'signal':
        await replaceAssessmentVersionLanguageSignals(dependencies.db, {
          assessmentVersionId: assessmentVersion.assessmentVersionId,
          inputs: plan.storage.signals,
        });
        break;
      case 'pair':
        await replaceAssessmentVersionLanguagePairs(dependencies.db, {
          assessmentVersionId: assessmentVersion.assessmentVersionId,
          inputs: plan.storage.pairs,
        });
        break;
    }

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(authoringPath(assessmentVersion.assessmentKey));

    return {
      ...preview,
      success: true,
      canImport: false,
      summary: {
        ...preview.summary,
        assessmentVersionId: assessmentVersion.assessmentVersionId,
        importedRowCount: filteredRows.length,
        importedTargetCount: countTargetsForSection(command.reportSection, filteredRows),
      },
    };
  } catch {
    return {
      ...preview,
      success: false,
      canImport: false,
      executionError: `${toSectionLabel(command.reportSection)} import could not be saved. Try again.`,
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

async function loadTargetDomainsForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly string[]> {
  const result = await db.query<DomainRow>(
    `
    SELECT
      domain_key
    FROM domains
    WHERE assessment_version_id = $1
      AND domain_type = 'SIGNAL_GROUP'
    ORDER BY order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return result.rows.map((row) => row.domain_key);
}

async function loadExistingRowCount(
  db: Queryable,
  reportSection: Exclude<ReportLanguageSection, 'intro'>,
  assessmentVersionId: string,
): Promise<number> {
  switch (reportSection) {
    case 'hero':
      return (await getAssessmentVersionLanguageOverview(db, assessmentVersionId)).length;
    case 'domain':
      return (await getAssessmentVersionLanguageDomains(db, assessmentVersionId)).length;
    case 'signal':
      return (await getAssessmentVersionLanguageSignals(db, assessmentVersionId)).length;
    case 'pair':
      return (await getAssessmentVersionLanguagePairs(db, assessmentVersionId)).length;
  }
}

function buildWrongSectionErrors(
  rows: readonly ReturnType<typeof parseReportLanguageRows>['records'][number][],
  reportSection: Exclude<ReportLanguageSection, 'intro'>,
): readonly ReportLanguageImportPlanError[] {
  const errors: ReportLanguageImportPlanError[] = [];

  for (const row of rows) {
    const normalizedSection = normalizeReportLanguageSection(row.section);
    if (normalizedSection === null || normalizedSection === reportSection) {
      continue;
    }

    errors.push({
      code: 'WRONG_REPORT_SECTION',
      message: `${toSectionLabel(reportSection)} accepts only ${getReportSectionRowName(reportSection)} rows. Line ${row.lineNumber} targets ${row.section}.`,
    });
  }

  return errors;
}

function buildPlanErrors(
  reportSection: Exclude<ReportLanguageSection, 'intro'>,
  assessmentVersion: AssessmentVersionImportTarget | null,
  signalCount: number,
  domainCount: number,
): readonly ReportLanguageImportPlanError[] {
  const errors: ReportLanguageImportPlanError[] = [];

  if (!assessmentVersion) {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    });
    return errors;
  }

  if (assessmentVersion.lifecycleStatus !== 'DRAFT') {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_EDITABLE',
      message: `${toSectionLabel(reportSection)} can be edited only for draft assessment versions.`,
    });
  }

  if ((reportSection === 'hero' || reportSection === 'signal' || reportSection === 'pair') && signalCount === 0) {
    errors.push({
      code: 'SIGNAL_SET_EMPTY',
      message: 'The active assessment version does not contain any authored signals for this report section.',
    });
  }

  if (reportSection === 'domain' && domainCount === 0) {
    errors.push({
      code: 'DOMAIN_SET_EMPTY',
      message: 'The active assessment version does not contain any authored result domains.',
    });
  }

  return errors;
}

function buildPreviewGroups(
  reportSection: Exclude<ReportLanguageSection, 'intro'>,
  rows: ReturnType<typeof validateReportLanguageRows>['validRows'],
): readonly AdminReportLanguageImportPreviewGroup[] {
  const grouped = new Map<string, AdminReportLanguageImportPreviewGroup['entries'][number][]>();
  const labels = new Map<string, string>();

  for (const row of rows) {
    let targetKey = '';
    let targetLabel = '';

    switch (row.section) {
      case 'hero':
        targetKey = row.canonicalPatternKey;
        targetLabel = row.canonicalPatternKey;
        break;
      case 'domain':
      case 'signal':
        targetKey = row.target;
        targetLabel = row.target;
        break;
      case 'pair':
        targetKey = row.canonicalSignalPair;
        targetLabel = row.canonicalSignalPair;
        break;
      case 'intro':
        continue;
    }

    const entries = grouped.get(targetKey) ?? [];
    entries.push({
      lineNumber: row.lineNumber,
      field: row.field,
      content: row.content,
    });
    grouped.set(targetKey, entries);
    labels.set(targetKey, targetLabel);
  }

  return [...grouped.entries()]
    .map(([targetKey, entries]) => ({
      targetKey,
      targetLabel: labels.get(targetKey) ?? targetKey,
      entries: [...entries].sort(
        (left, right) => left.lineNumber - right.lineNumber || left.field.localeCompare(right.field),
      ),
    }))
    .sort((left, right) => left.targetKey.localeCompare(right.targetKey));
}

function countTargetsForSection(
  reportSection: Exclude<ReportLanguageSection, 'intro'>,
  rows: ReturnType<typeof validateReportLanguageRows>['validRows'],
): number {
  switch (reportSection) {
    case 'hero':
      return new Set(
        rows.flatMap((row) => (row.section === 'hero' ? [row.canonicalPatternKey] : [])),
      ).size;
    case 'domain':
    case 'signal':
      return new Set(
        rows.flatMap((row) => (row.section === reportSection ? [row.target] : [])),
      ).size;
    case 'pair':
      return new Set(
        rows.flatMap((row) => (row.section === 'pair' ? [row.canonicalSignalPair] : [])),
      ).size;
  }
}

function buildResult(params: {
  assessmentVersionId: string | null;
  parseErrors: ReturnType<typeof parseReportLanguageRows>['errors'];
  validationErrors: readonly ReportLanguageValidationError[];
  planErrors: readonly ReportLanguageImportPlanError[];
  previewGroups: readonly AdminReportLanguageImportPreviewGroup[];
  existingRowCount: number;
  rowCount?: number;
  targetCount?: number;
}): ReportLanguageImportPreviewResult {
  const rowCount = params.rowCount ?? 0;
  const targetCount = params.targetCount ?? 0;
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
      targetCount,
      existingRowCount: params.existingRowCount,
      importedRowCount: 0,
      importedTargetCount: 0,
    },
    executionError: null,
  };
}

function toSectionLabel(reportSection: Exclude<ReportLanguageSection, 'intro'>): string {
  return getReportSectionLabel(reportSection);
}
