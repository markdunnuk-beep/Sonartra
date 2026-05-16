import { readFile } from 'node:fs/promises';

import type { Queryable } from '@/lib/engine/repository-sql';
import {
  REPORT_FIRST_TEMPLATE_CONTRACT,
  storeDraftReportFirstTemplate,
  type StoredReportFirstTemplate,
} from '@/lib/server/report-first-template-storage';
import {
  leadershipReportFirstExpectedPatternKeys,
  leadershipReportFirstImportArtifactRelativePath,
  leadershipReportFirstScoreShapePolicy,
  type LeadershipReportFirstImportArtifact,
  type LeadershipReportFirstImportRow,
} from '@/lib/server/leadership-report-first-package';

export class ReportFirstTemplateImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportFirstTemplateImportError';
  }
}

export type ReportFirstTemplateImportFinding = {
  readonly severity: 'blocking' | 'warning' | 'info';
  readonly code: string;
  readonly message: string;
  readonly patternKey?: string;
};

export type ReportFirstTemplateImportSummary = {
  readonly expectedTemplateCount: number;
  readonly importedTemplateCount: number;
  readonly missingTemplateCount: number;
  readonly skippedTemplateCount: number;
  readonly publishableFullCoverage: boolean;
  readonly importedPatternKeys: readonly string[];
  readonly missingPatternKeys: readonly string[];
  readonly auditFindings: readonly ReportFirstTemplateImportFinding[];
  readonly storedTemplates: readonly StoredReportFirstTemplate[];
};

export type ReportFirstTemplateCoverageSummary = {
  readonly expectedPatternCount: number;
  readonly importedTemplateCount: number;
  readonly missingPatternKeys: readonly string[];
  readonly duplicatePatternKeys: readonly string[];
  readonly unsupportedScoreShapePolicies: readonly string[];
  readonly incompletePatternKeys: readonly string[];
  readonly nonPublishablePatternKeys: readonly string[];
  readonly coverageComplete: boolean;
  readonly blockingFindings: readonly ReportFirstTemplateImportFinding[];
};

export type ReportFirstTemplatePromotionSummary = {
  readonly expectedTemplateCount: number;
  readonly promotedTemplateCount: number;
  readonly activeTemplateCount: number;
  readonly missingTemplateCount: number;
  readonly publishableFullCoverage: boolean;
  readonly promotedPatternKeys: readonly string[];
  readonly activePatternKeys: readonly string[];
  readonly auditFindings: readonly ReportFirstTemplateImportFinding[];
  readonly status: 'promoted' | 'already_active' | 'blocked';
};

type ImportParams = {
  readonly db: Queryable;
  readonly assessmentKey: string;
  readonly assessmentVersionId: string;
  readonly artifactPath?: string;
  readonly importBatchId?: string | null;
  readonly actorId?: string | null;
};

type ArtifactReader = (artifactPath: string) => Promise<string>;

type ImportedTemplateRow = {
  readonly id?: string | null;
  readonly pattern_key: string | null;
  readonly domain_key?: string | null;
  readonly report_key: string | null;
  readonly report_contract: string | null;
  readonly report_template_json: unknown;
  readonly content_hash: string | null;
  readonly status: string | null;
  readonly score_shape_policy: string | null;
  readonly score_shape: string | null;
  readonly publishable: boolean | null;
  readonly ready_for_import: boolean | null;
};

type ActiveRankedPatternRow = {
  readonly pattern_key: string | null;
};

const requiredChapterTitlePatterns = [
  'How your leadership creates value',
  'How others experience your leadership',
  'Decision behaviour',
  'Communication behaviour',
  'What happens under pressure',
  'The strength of this pattern',
  'Where the pattern can tighten',
  /^How [A-Za-z]+ expands your leadership$/,
  /^How [A-Za-z]+ expands your leadership$/,
  'Development focus',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseArtifact(raw: string, artifactPath: string): LeadershipReportFirstImportArtifact {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      throw new Error('Artifact root must be an object.');
    }
    return parsed as LeadershipReportFirstImportArtifact;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON.';
    throw new ReportFirstTemplateImportError(`Report-first import artifact could not be parsed at ${artifactPath}: ${message}`);
  }
}

async function readArtifact(artifactPath: string, reader: ArtifactReader): Promise<LeadershipReportFirstImportArtifact> {
  try {
    return parseArtifact(await reader(artifactPath), artifactPath);
  } catch (error) {
    if (error instanceof ReportFirstTemplateImportError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown read error.';
    throw new ReportFirstTemplateImportError(`Report-first import artifact could not be read at ${artifactPath}: ${message}`);
  }
}

function validateStructuredBody(row: LeadershipReportFirstImportRow): readonly ReportFirstTemplateImportFinding[] {
  const findings: ReportFirstTemplateImportFinding[] = [];
  const template = row.report_template_json;
  const report: Record<string, unknown> = isRecord(template.report) ? template.report : {};
  const chapters = Array.isArray(report.chapters) ? report.chapters : [];
  const evidence: Record<string, unknown> = isRecord(template.evidenceTemplate) ? template.evidenceTemplate : {};

  if (!Array.isArray(report.opening) || report.opening.length === 0) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_OPENING_MISSING',
      message: 'Import row report_template_json must contain Editorial introduction blocks.',
      patternKey: row.pattern_key,
    });
  }
  if (!isRecord(report.patternSummary)) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_PATTERN_SUMMARY_MISSING',
      message: 'Import row report_template_json must contain Pattern at a glance blocks.',
      patternKey: row.pattern_key,
    });
  }
  if (!Array.isArray(evidence.blocks) || evidence.blocks.length === 0) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_EVIDENCE_MISSING',
      message: 'Import row report_template_json must contain Evidence behind your result blocks.',
      patternKey: row.pattern_key,
    });
  }
  if (chapters.length !== 10) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_CHAPTER_COUNT_INVALID',
      message: `Import row report_template_json must contain ten chapters; found ${chapters.length}.`,
      patternKey: row.pattern_key,
    });
  }
  if (!isRecord(report.closing) || !nonEmptyText(report.closing.finalLine)) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_CLOSING_MISSING',
      message: 'Import row report_template_json must contain closing synthesis and final line content.',
      patternKey: row.pattern_key,
    });
  }

  return findings;
}

function validateImportRow(row: LeadershipReportFirstImportRow): readonly ReportFirstTemplateImportFinding[] {
  const findings: ReportFirstTemplateImportFinding[] = [];
  const required: readonly (keyof LeadershipReportFirstImportRow)[] = [
    'assessment_key',
    'domain_key',
    'pattern_key',
    'report_key',
    'report_contract',
    'source_markdown_path',
    'content_hash',
  ];

  for (const field of required) {
    if (!nonEmptyText(row[field])) {
      findings.push({
        severity: 'blocking',
        code: 'REPORT_FIRST_IMPORT_REQUIRED_FIELD_MISSING',
        message: `Import row is missing required field ${field}.`,
        patternKey: row.pattern_key,
      });
    }
  }

  if (row.report_contract !== REPORT_FIRST_TEMPLATE_CONTRACT) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_UNSUPPORTED_CONTRACT',
      message: `Import row must use ${REPORT_FIRST_TEMPLATE_CONTRACT}.`,
      patternKey: row.pattern_key,
    });
  }
  if (row.score_shape_policy !== leadershipReportFirstScoreShapePolicy || row.score_shape !== null) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_SCORE_SHAPE_POLICY_UNSUPPORTED',
      message: 'Leadership report-first imports currently require pattern-level score-shape-neutral rows.',
      patternKey: row.pattern_key,
    });
  }
  if (row.ready_for_import !== true || row.publishable !== true || row.status !== 'active') {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_ROW_NOT_IMPORT_READY',
      message: 'Only active, publishable, ready_for_import report-first rows may be imported.',
      patternKey: row.pattern_key,
    });
  }

  return [...findings, ...validateStructuredBody(row)];
}

function validateArtifact(
  artifact: LeadershipReportFirstImportArtifact,
  assessmentKey: string,
): readonly ReportFirstTemplateImportFinding[] {
  const findings: ReportFirstTemplateImportFinding[] = [];
  const expectedPatternKeys = leadershipReportFirstExpectedPatternKeys();
  const importRows = Array.isArray(artifact.import_rows) ? artifact.import_rows : [];
  const missingTemplates = Array.isArray(artifact.missing_templates) ? artifact.missing_templates : [];
  const coverage: Record<string, unknown> = isRecord(artifact.coverage) ? artifact.coverage : {};

  if (!Array.isArray(artifact.import_rows) || !Array.isArray(artifact.missing_templates) || !isRecord(artifact.coverage)) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_ARTIFACT_SHAPE_INVALID',
      message: 'Report-first import artifact must include coverage, import_rows, and missing_templates.',
    });
  }
  if (artifact.artifact_contract !== 'leadership_report_first_template_import_rows_v1') {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_ARTIFACT_CONTRACT_INVALID',
      message: 'Report-first import artifact has an unsupported artifact_contract.',
    });
  }
  if (artifact.assessment_key !== assessmentKey) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_ASSESSMENT_KEY_MISMATCH',
      message: `Artifact assessment_key ${artifact.assessment_key} does not match target ${assessmentKey}.`,
    });
  }
  if (artifact.report_contract !== REPORT_FIRST_TEMPLATE_CONTRACT) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_REPORT_CONTRACT_INVALID',
      message: `Artifact report_contract must be ${REPORT_FIRST_TEMPLATE_CONTRACT}.`,
    });
  }
  if (coverage.expected_template_count !== expectedPatternKeys.length) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_EXPECTED_COUNT_INVALID',
      message: 'Artifact expected_template_count must remain 24 for Leadership Approach.',
    });
  }
  if (coverage.publishable_full_coverage !== true || missingTemplates.length > 0) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_FULL_COVERAGE_INCOMPLETE',
      message: `Report-first package coverage is incomplete: ${importRows.length} of ${expectedPatternKeys.length} templates are import-ready.`,
    });
  }

  const seen = new Set<string>();
  for (const row of importRows) {
    if (seen.has(row.pattern_key)) {
      findings.push({
        severity: 'blocking',
        code: 'REPORT_FIRST_IMPORT_DUPLICATE_PATTERN',
        message: 'Report-first import artifact contains duplicate import rows for a pattern_key.',
        patternKey: row.pattern_key,
      });
    }
    seen.add(row.pattern_key);
    findings.push(...validateImportRow(row));
  }

  return Object.freeze(findings);
}

function storageTemplateFromImportRow(row: LeadershipReportFirstImportRow) {
  return {
    assessment_key: row.assessment_key,
    assessment_version: row.assessment_version,
    package_key: row.package_key,
    package_version: row.package_version,
    report_key: row.report_key,
    pattern_key: row.pattern_key,
    domain_key: row.domain_key,
    report_contract: row.report_contract,
    score_shape_policy: row.score_shape_policy,
    score_shape: row.score_shape,
    supported_score_shapes: row.supported_score_shapes,
    source_markdown_path: row.source_markdown_path,
    source_content_hash: row.source_content_hash,
    content_hash: row.content_hash,
    report_template_json: row.report_template_json,
    manifest_status: row.manifest_status,
    publishable: row.publishable,
    ready_for_import: row.ready_for_import,
  };
}

export async function importReportFirstTemplateRows(
  params: ImportParams,
  artifactReader: ArtifactReader = (artifactPath) => readFile(artifactPath, 'utf8'),
): Promise<ReportFirstTemplateImportSummary> {
  const artifactPath = params.artifactPath ?? leadershipReportFirstImportArtifactRelativePath;
  const artifact = await readArtifact(artifactPath, artifactReader);
  const validationFindings = validateArtifact(artifact, params.assessmentKey);
  const blockingValidation = validationFindings.filter((finding) =>
    finding.severity === 'blocking' &&
    finding.code !== 'REPORT_FIRST_IMPORT_FULL_COVERAGE_INCOMPLETE',
  );

  if (blockingValidation.length > 0) {
    throw new ReportFirstTemplateImportError(
      `Report-first import artifact is invalid: ${blockingValidation[0]?.message ?? 'blocking validation failed'}`,
    );
  }

  const storedTemplates: StoredReportFirstTemplate[] = [];
  for (const row of artifact.import_rows.filter((item) => item.ready_for_import && item.publishable)) {
    storedTemplates.push(
      await storeDraftReportFirstTemplate({
        db: params.db,
        assessmentVersionId: params.assessmentVersionId,
        template: storageTemplateFromImportRow(row),
        createdBy: params.actorId ?? null,
        importBatchId: params.importBatchId ?? null,
      }),
    );
  }

  const importedPatternKeys = storedTemplates.map((template) => template.patternKey).sort((left, right) => left.localeCompare(right));
  const missingPatternKeys = artifact.missing_templates
    .map((template) => template.pattern_key)
    .sort((left, right) => left.localeCompare(right));

  return Object.freeze({
    expectedTemplateCount: artifact.coverage.expected_template_count,
    importedTemplateCount: storedTemplates.length,
    missingTemplateCount: missingPatternKeys.length,
    skippedTemplateCount: artifact.missing_templates.length,
    publishableFullCoverage:
      artifact.coverage.publishable_full_coverage === true &&
      missingPatternKeys.length === 0 &&
      !validationFindings.some((finding) => finding.severity === 'blocking'),
    importedPatternKeys,
    missingPatternKeys,
    auditFindings: validationFindings,
    storedTemplates: Object.freeze(storedTemplates),
  });
}

function requiredBodyIncomplete(row: ImportedTemplateRow): boolean {
  if (!isRecord(row.report_template_json)) {
    return true;
  }
  const report: Record<string, unknown> = isRecord(row.report_template_json.report) ? row.report_template_json.report : {};
  const evidence: Record<string, unknown> = isRecord(row.report_template_json.evidenceTemplate)
    ? row.report_template_json.evidenceTemplate
    : {};
  const patternSummary: Record<string, unknown> = isRecord(report.patternSummary) ? report.patternSummary : {};
  const closing: Record<string, unknown> = isRecord(report.closing) ? report.closing : {};
  const pdf: Record<string, unknown> = isRecord(report.pdf) ? report.pdf : {};
  const chapters = Array.isArray(report.chapters) ? report.chapters : [];
  return !Array.isArray(report.opening) ||
    report.opening.length === 0 ||
    !Array.isArray(patternSummary.blocks) ||
    patternSummary.blocks.length === 0 ||
    !(nonEmptyText(report.keyInsight) || isRecord(report.keyInsight)) ||
    chapters.length !== 10 ||
    chapters.some((chapter, index) => {
      if (!isRecord(chapter)) {
        return true;
      }
      const titlePattern = requiredChapterTitlePatterns[index];
      const title = typeof chapter.title === 'string' ? chapter.title : '';
      const titleMatches = typeof titlePattern === 'string'
        ? title === titlePattern
        : titlePattern.test(title);
      return chapter.chapterNumber !== index + 1 ||
        !titleMatches ||
        !Array.isArray(chapter.blocks) ||
        chapter.blocks.length === 0;
    }) ||
    !Array.isArray(evidence.blocks) ||
    evidence.blocks.length === 0 ||
    !Array.isArray(closing.synthesis) ||
    closing.synthesis.length === 0 ||
    !nonEmptyText(closing.finalLine) ||
    !nonEmptyText(pdf.title);
}

async function activeRankedPatternKeys(params: {
  readonly db: Queryable;
  readonly assessmentVersionId: string;
}): Promise<readonly string[]> {
  const result = await params.db.query<ActiveRankedPatternRow>(
    `
    SELECT pattern_key
    FROM assessment_ranked_patterns
    WHERE assessment_version_id = $1
      AND status = 'active'
    ORDER BY pattern_key ASC
    `,
    [params.assessmentVersionId],
  );

  return Object.freeze(
    result.rows
      .map((row) => row.pattern_key)
      .filter((patternKey): patternKey is string => nonEmptyText(patternKey)),
  );
}

function coverageFindings(params: {
  readonly coverage: ReportFirstTemplateCoverageSummary;
  readonly expectedPatternKeys: readonly string[];
  readonly activePatternKeys: readonly string[];
  readonly status: 'draft' | 'active';
}): readonly ReportFirstTemplateImportFinding[] {
  const findings: ReportFirstTemplateImportFinding[] = [];

  if (params.coverage.importedTemplateCount !== params.expectedPatternKeys.length) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_PROMOTION_COUNT_INVALID',
      message: `Report-first promotion requires exactly ${params.expectedPatternKeys.length} ${params.status} template rows; found ${params.coverage.importedTemplateCount}.`,
    });
  }
  for (const patternKey of params.coverage.missingPatternKeys) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_PROMOTION_PATTERN_MISSING',
      message: 'Every expected ranked pattern must have one report-first template row before promotion.',
      patternKey,
    });
  }
  for (const patternKey of params.coverage.duplicatePatternKeys) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_PROMOTION_PATTERN_DUPLICATE',
      message: 'Promotion requires exactly one report-first template row per pattern_key.',
      patternKey,
    });
  }
  for (const patternKey of params.coverage.unsupportedScoreShapePolicies) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_PROMOTION_SCORE_SHAPE_POLICY_UNSUPPORTED',
      message: 'Promotion requires pattern-level score-shape-neutral rows with score_shape set to null.',
      patternKey,
    });
  }
  for (const patternKey of params.coverage.incompletePatternKeys) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_PROMOTION_BODY_INCOMPLETE',
      message: 'Promotion requires a valid report contract, content hash, and full structured report body.',
      patternKey,
    });
  }
  for (const patternKey of params.coverage.nonPublishablePatternKeys) {
    findings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_PROMOTION_ROW_NOT_PUBLISHABLE',
      message: 'Promotion requires rows marked publishable and ready_for_import.',
      patternKey,
    });
  }

  const activePatternSet = new Set(params.activePatternKeys);
  for (const patternKey of params.expectedPatternKeys) {
    if (!activePatternSet.has(patternKey)) {
      findings.push({
        severity: 'blocking',
        code: 'REPORT_FIRST_PROMOTION_PATTERN_UNRESOLVED',
        message: 'Expected report-first pattern_key does not resolve to an active assessment_ranked_patterns row for this assessment version.',
        patternKey,
      });
    }
  }

  return Object.freeze(findings);
}

async function draftTemplateIdsForPromotion(params: {
  readonly db: Queryable;
  readonly assessmentVersionId: string;
}): Promise<readonly { readonly id: string; readonly patternKey: string }[]> {
  const result = await params.db.query<{ readonly id: string; readonly pattern_key: string | null }>(
    `
    SELECT id, pattern_key
    FROM assessment_report_first_templates
    WHERE assessment_version_id = $1
      AND status = 'draft'
    ORDER BY pattern_key ASC, updated_at DESC, id DESC
    `,
    [params.assessmentVersionId],
  );

  return Object.freeze(
    result.rows
      .filter((row) => nonEmptyText(row.id) && nonEmptyText(row.pattern_key))
      .map((row) => Object.freeze({ id: row.id, patternKey: row.pattern_key as string })),
  );
}

export async function promoteReportFirstTemplatesForPublish(params: {
  readonly db: Queryable;
  readonly assessmentVersionId: string;
}): Promise<ReportFirstTemplatePromotionSummary> {
  const expectedPatternKeys = leadershipReportFirstExpectedPatternKeys();
  const activeCoverage = await auditImportedReportFirstTemplateCoverage({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    status: 'active',
  });
  const activePatternKeys = await activeRankedPatternKeys(params);
  const activeFindings = coverageFindings({
    coverage: activeCoverage,
    expectedPatternKeys,
    activePatternKeys,
    status: 'active',
  });

  if (activeCoverage.coverageComplete && activeFindings.length === 0) {
    return Object.freeze({
      expectedTemplateCount: expectedPatternKeys.length,
      promotedTemplateCount: 0,
      activeTemplateCount: activeCoverage.importedTemplateCount,
      missingTemplateCount: activeCoverage.missingPatternKeys.length,
      publishableFullCoverage: true,
      promotedPatternKeys: Object.freeze([]),
      activePatternKeys: Object.freeze([...expectedPatternKeys].sort((left, right) => left.localeCompare(right))),
      auditFindings: Object.freeze([]),
      status: 'already_active',
    });
  }

  const draftCoverage = await auditImportedReportFirstTemplateCoverage({
    db: params.db,
    assessmentVersionId: params.assessmentVersionId,
    status: 'draft',
  });
  const draftFindings = coverageFindings({
    coverage: draftCoverage,
    expectedPatternKeys,
    activePatternKeys,
    status: 'draft',
  });

  if (draftFindings.length > 0 || !draftCoverage.coverageComplete) {
    return Object.freeze({
      expectedTemplateCount: expectedPatternKeys.length,
      promotedTemplateCount: 0,
      activeTemplateCount: activeCoverage.importedTemplateCount,
      missingTemplateCount: draftCoverage.missingPatternKeys.length,
      publishableFullCoverage: false,
      promotedPatternKeys: Object.freeze([]),
      activePatternKeys: Object.freeze([]),
      auditFindings: Object.freeze(draftFindings),
      status: 'blocked',
    });
  }

  const draftRows = await draftTemplateIdsForPromotion(params);
  const draftIds = draftRows.map((row) => row.id);
  await params.db.query('BEGIN');
  try {
    await params.db.query(
      `
      UPDATE assessment_report_first_templates
      SET status = 'inactive',
          updated_at = NOW()
      WHERE assessment_version_id = $1
        AND status = 'active'
      `,
      [params.assessmentVersionId],
    );
    await params.db.query(
      `
      UPDATE assessment_report_first_templates
      SET status = 'active',
          publishable = TRUE,
          ready_for_import = TRUE,
          updated_at = NOW()
      WHERE assessment_version_id = $1
        AND id = ANY($2::uuid[])
        AND status = 'draft'
      `,
      [params.assessmentVersionId, draftIds],
    );
    await params.db.query('COMMIT');
  } catch (error) {
    await params.db.query('ROLLBACK').catch(() => undefined);
    throw error;
  }

  return Object.freeze({
    expectedTemplateCount: expectedPatternKeys.length,
    promotedTemplateCount: draftRows.length,
    activeTemplateCount: draftRows.length,
    missingTemplateCount: 0,
    publishableFullCoverage: true,
    promotedPatternKeys: Object.freeze(draftRows.map((row) => row.patternKey).sort((left, right) => left.localeCompare(right))),
    activePatternKeys: Object.freeze(draftRows.map((row) => row.patternKey).sort((left, right) => left.localeCompare(right))),
    auditFindings: Object.freeze([]),
    status: 'promoted',
  });
}

export async function auditImportedReportFirstTemplateCoverage(params: {
  readonly db: Queryable;
  readonly assessmentVersionId: string;
  readonly status?: 'draft' | 'active';
}): Promise<ReportFirstTemplateCoverageSummary> {
  const expectedPatternKeys = leadershipReportFirstExpectedPatternKeys();
  const status = params.status ?? 'draft';
  const result = await params.db.query<ImportedTemplateRow>(
    `
    SELECT
      pattern_key,
      report_key,
      report_contract,
      report_template_json,
      content_hash,
      status,
      score_shape_policy,
      score_shape,
      publishable,
      ready_for_import
    FROM assessment_report_first_templates
    WHERE assessment_version_id = $1
      AND status = $2
    ORDER BY pattern_key ASC, updated_at DESC, id DESC
    `,
    [params.assessmentVersionId, status],
  );

  const patternCounts = new Map<string, number>();
  const importedPatternKeys: string[] = [];
  const unsupportedScoreShapePolicies: string[] = [];
  const incompletePatternKeys: string[] = [];
  const nonPublishablePatternKeys: string[] = [];

  for (const row of result.rows) {
    const patternKey = row.pattern_key ?? '';
    if (!patternKey) {
      continue;
    }
    patternCounts.set(patternKey, (patternCounts.get(patternKey) ?? 0) + 1);
    if (!importedPatternKeys.includes(patternKey)) {
      importedPatternKeys.push(patternKey);
    }
    if (row.score_shape_policy !== leadershipReportFirstScoreShapePolicy || row.score_shape !== null) {
      unsupportedScoreShapePolicies.push(patternKey);
    }
    if (
      row.report_contract !== REPORT_FIRST_TEMPLATE_CONTRACT ||
      !nonEmptyText(row.report_key) ||
      !nonEmptyText(row.content_hash) ||
      requiredBodyIncomplete(row)
    ) {
      incompletePatternKeys.push(patternKey);
    }
    if (row.publishable !== true || row.ready_for_import !== true) {
      nonPublishablePatternKeys.push(patternKey);
    }
  }

  const missingPatternKeys = expectedPatternKeys.filter((patternKey) => !importedPatternKeys.includes(patternKey));
  const duplicatePatternKeys = [...patternCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([patternKey]) => patternKey);
  const coverageComplete =
    missingPatternKeys.length === 0 &&
    duplicatePatternKeys.length === 0 &&
    unsupportedScoreShapePolicies.length === 0 &&
    incompletePatternKeys.length === 0 &&
    nonPublishablePatternKeys.length === 0;
  const blockingFindings: ReportFirstTemplateImportFinding[] = [];

  if (!coverageComplete) {
    blockingFindings.push({
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORTED_COVERAGE_INCOMPLETE',
      message: `Only ${importedPatternKeys.length} of ${expectedPatternKeys.length} report-first templates are imported/publishable.`,
    });
  }

  return Object.freeze({
    expectedPatternCount: expectedPatternKeys.length,
    importedTemplateCount: importedPatternKeys.length,
    missingPatternKeys: Object.freeze(missingPatternKeys),
    duplicatePatternKeys: Object.freeze(duplicatePatternKeys),
    unsupportedScoreShapePolicies: Object.freeze(unsupportedScoreShapePolicies),
    incompletePatternKeys: Object.freeze(incompletePatternKeys),
    nonPublishablePatternKeys: Object.freeze(nonPublishablePatternKeys),
    coverageComplete,
    blockingFindings: Object.freeze(blockingFindings),
  });
}
