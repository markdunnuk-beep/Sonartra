import { rankedPatternSupportedScoreShapes } from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';
import { buildReportFirstCanonicalPayload } from '@/lib/server/report-first-result-assembly';
import { getDbPool } from '@/lib/server/db';
import { REPORT_FIRST_TEMPLATE_CONTRACT } from '@/lib/server/report-first-template-storage';
import {
  getGeneratedLeadershipReportFirstImportArtifact,
  type LeadershipReportFirstImportArtifact,
  type LeadershipReportFirstImportRow,
} from '@/lib/server/leadership-report-first-package';
import type { NormalizedResult, RuntimeResponseSet, ScoreResult } from '@/lib/engine/types';
import type { SingleDomainResultScoreShape, SingleDomainResultSignal } from '@/lib/types/single-domain-result';
import type { ReportFirstCanonicalPayloadV1 } from '@/lib/types/report-first-result';

const defaultPreviewPatternKey = 'process_results_people_vision';

const requiredPreviewHeadings = [
  'Editorial introduction',
  'Pattern at a glance',
  'Evidence behind your result',
  'Key insight',
  'Chapter 1',
  'Chapter 2',
  'Chapter 3',
  'Chapter 4',
  'Chapter 5',
  'Chapter 6',
  'Chapter 7',
  'Chapter 8',
  'Chapter 9',
  'Chapter 10',
  'Closing synthesis',
  'Final line',
  'Save this report',
] as const;

const forbiddenReaderLabels = [
  'persisted result payload',
  'template id',
  'content hash',
  'lookup key',
  'pattern_key',
  'draft-only',
  'undefined',
  'null',
  'raw JSON',
] as const;

export type AdminReportFirstPreviewOption = {
  readonly patternKey: string;
  readonly reportKey: string;
  readonly label: string;
};

export type AdminReportFirstPreviewReview = {
  readonly reportKey: string;
  readonly signalOrderLabel: string;
  readonly scoreShape: string;
  readonly sourceStatus: string;
  readonly fullBodyPresent: boolean;
  readonly requiredHeadingsPresent: boolean;
  readonly evidenceRenderable: boolean;
  readonly readerInternalLabelsAbsent: boolean;
  readonly previewAssemblyPassed: boolean;
  readonly missingHeadings: readonly string[];
  readonly forbiddenLabels: readonly string[];
};

export type AdminReportFirstPreviewResult =
  | {
      readonly status: 'ready';
      readonly options: readonly AdminReportFirstPreviewOption[];
      readonly payload: ReportFirstCanonicalPayloadV1;
      readonly review: AdminReportFirstPreviewReview;
    }
  | {
      readonly status: 'error';
      readonly options: readonly AdminReportFirstPreviewOption[];
      readonly code: string;
      readonly message: string;
      readonly selectedPatternKey: string;
      readonly sourceAttempts?: readonly string[];
    };

type PreviewTemplateRow = {
  readonly id: string;
  readonly assessment_version_id: string;
  readonly domain_key: string;
  readonly pattern_key: string;
  readonly report_key: string;
  readonly report_contract: string;
  readonly report_template_json: unknown;
  readonly content_hash: string;
  readonly status: string;
};

type PreviewTemplateSource = {
  readonly domain_key: string;
  readonly pattern_key: string;
  readonly report_key: string;
  readonly report_contract: string;
  readonly report_template_json: unknown;
  readonly content_hash: string;
};

type ImportedPreviewTemplateRow = PreviewTemplateSource & {
  readonly id: string;
  readonly assessment_version_id: string;
  readonly status: string;
};

function reportLabel(patternKey: string): string {
  return patternKey
    .split('_')
    .map((signal) => signal.charAt(0).toUpperCase() + signal.slice(1))
    .join(' > ');
}

function signalOrder(patternKey: string): readonly string[] {
  return patternKey.split('_').filter(Boolean);
}

function signalLabel(signalKey: string): string {
  return signalKey.charAt(0).toUpperCase() + signalKey.slice(1);
}

function rankedSignalsForPattern(patternKey: string): readonly SingleDomainResultSignal[] {
  const scores = [42, 33, 17, 8] as const;
  const rawScores = [10, 8, 4, 2] as const;
  const roles = ['Lead signal', 'Strengthening signal', 'Range signal', 'Further range'] as const;

  return signalOrder(patternKey).map((signalKey, index) => ({
    signal_key: signalKey,
    signal_label: signalLabel(signalKey),
    rank: index + 1,
    normalized_score: scores[index] ?? 0,
    raw_score: rawScores[index] ?? 0,
    position: index === 0 ? 'primary' : index === 1 ? 'secondary' : index === 2 ? 'supporting' : 'underplayed',
    position_label: roles[index] ?? 'Signal',
    chapter_intro: '',
    chapter_how_it_shows_up: '',
    chapter_value_outcome: '',
    chapter_value_team_effect: '',
    chapter_risk_behaviour: '',
    chapter_risk_impact: '',
    chapter_development: '',
  }));
}

function previewScoreShape(scoreShape: string): SingleDomainResultScoreShape {
  const value = rankedPatternSupportedScoreShapes.includes(
    scoreShape as (typeof rankedPatternSupportedScoreShapes)[number],
  )
    ? scoreShape as (typeof rankedPatternSupportedScoreShapes)[number]
    : 'paired';

  return {
    value,
    policyKey: 'admin_preview_fixed_shape_v1',
    policyVersion: '1.0.0',
  };
}

function syntheticScoreResult(rankedSignals: readonly SingleDomainResultSignal[]): ScoreResult {
  return {
    signalScores: [],
    domainSummaries: [],
    diagnostics: {
      scoringMethod: 'option_signal_weights_only',
      totalQuestions: 24,
      answeredQuestions: 24,
      unansweredQuestions: 0,
      totalResponsesProcessed: 24,
      totalWeightsApplied: 96,
      totalScoreMass: rankedSignals.reduce((sum, signal) => sum + signal.raw_score, 0),
      zeroScoreSignalCount: 0,
      zeroAnswerSubmission: false,
      warnings: ['admin_preview_uses_synthetic_score_evidence'],
      generatedAt: '2026-05-15T10:00:00.000Z',
    },
  };
}

function syntheticNormalizedResult(rankedSignals: readonly SingleDomainResultSignal[]): NormalizedResult {
  return {
    signalScores: [],
    domainSummaries: [],
    topSignalId: rankedSignals[0]?.signal_key ?? null,
    diagnostics: {
      normalizationMethod: 'largest_remainder_integer_percentages',
      totalScoreMass: rankedSignals.reduce((sum, signal) => sum + signal.raw_score, 0),
      zeroMass: false,
      globalPercentageSum: rankedSignals.reduce((sum, signal) => sum + signal.normalized_score, 0),
      domainPercentageSums: {},
      roundingAdjustmentsApplied: 0,
      zeroScoreSignalCount: 0,
      warnings: ['admin_preview_uses_synthetic_normalized_scores'],
      generatedAt: '2026-05-15T10:00:00.000Z',
    },
  };
}

function syntheticResponses(): RuntimeResponseSet {
  return {
    attemptId: 'admin-report-first-preview',
    assessmentKey: 'leadership-approach',
    versionTag: 'admin-preview',
    status: 'completed',
    responsesByQuestionId: {},
    submittedAt: '2026-05-15T10:00:00.000Z',
  };
}

function templateRowFromImportRow(
  row: LeadershipReportFirstImportRow,
  assessmentVersionId: string,
): PreviewTemplateRow {
  return {
    id: `admin-preview-${row.pattern_key}`,
    assessment_version_id: assessmentVersionId,
    domain_key: row.domain_key,
    pattern_key: row.pattern_key,
    report_key: row.report_key,
    report_contract: row.report_contract,
    report_template_json: row.report_template_json,
    content_hash: row.content_hash,
    status: 'active',
  };
}

function textFromTemplate(value: unknown): string {
  return JSON.stringify(value);
}

function previewHeadingCoverage(payload: ReportFirstCanonicalPayloadV1): readonly string[] {
  const report = typeof payload.report === 'object' && payload.report !== null
    ? payload.report as Record<string, unknown>
    : {};
  const chapters = Array.isArray(report.chapters)
    ? report.chapters.filter((chapter) => typeof chapter === 'object' && chapter !== null)
    : [];

  const present = new Set<string>();
  if (Array.isArray(report.opening) && report.opening.length > 0) {
    present.add('Editorial introduction');
  }
  if (typeof report.patternSummary === 'object' && report.patternSummary !== null) {
    present.add('Pattern at a glance');
  }
  if (payload.evidence.title === 'Evidence behind your result') {
    present.add('Evidence behind your result');
  }
  if (typeof report.keyInsight === 'object' && report.keyInsight !== null) {
    present.add('Key insight');
  }
  for (const chapter of chapters) {
    const chapterNumber = (chapter as Record<string, unknown>).chapterNumber;
    if (typeof chapterNumber === 'number') {
      present.add(`Chapter ${chapterNumber}`);
    }
  }
  if (typeof report.closing === 'object' && report.closing !== null) {
    present.add('Closing synthesis');
    const closing = report.closing as Record<string, unknown>;
    if (typeof closing.finalLine === 'string' && closing.finalLine.trim()) {
      present.add('Final line');
    }
  }
  if (typeof report.pdf === 'object' && report.pdf !== null) {
    present.add('Save this report');
  }

  return requiredPreviewHeadings.filter((heading) => !present.has(heading));
}

function buildReview(params: {
  readonly row: PreviewTemplateSource;
  readonly payload: ReportFirstCanonicalPayloadV1;
  readonly scoreShape: string;
  readonly sourceStatus: string;
}): AdminReportFirstPreviewReview {
  const reportText = textFromTemplate({
    report: params.payload.report,
    evidenceTitle: params.payload.evidence.title,
  });
  const missingHeadings = previewHeadingCoverage(params.payload);
  const forbiddenLabels = forbiddenReaderLabels.filter((label) =>
    reportText.toLowerCase().includes(label.toLowerCase()),
  );

  return {
    reportKey: params.row.report_key,
    signalOrderLabel: reportLabel(params.row.pattern_key),
    scoreShape: params.scoreShape,
    sourceStatus: params.sourceStatus,
    fullBodyPresent: reportText.length > 12000,
    requiredHeadingsPresent: missingHeadings.length === 0,
    evidenceRenderable: params.payload.rankedSignals.length === 4 && params.payload.normalizedScores.length === 4,
    readerInternalLabelsAbsent: forbiddenLabels.length === 0,
    previewAssemblyPassed: true,
    missingHeadings,
    forbiddenLabels,
  };
}

async function loadImportedPreviewTemplate(params: {
  readonly assessmentVersionId: string | null;
  readonly patternKey: string;
}): Promise<ImportedPreviewTemplateRow | null> {
  if (!params.assessmentVersionId || !process.env.DATABASE_URL) {
    return null;
  }

  try {
    const result = await getDbPool().query<ImportedPreviewTemplateRow>(
      `
      SELECT
        id,
        assessment_version_id,
        domain_key,
        pattern_key,
        report_key,
        report_contract,
        report_template_json,
        content_hash,
        status
      FROM assessment_report_first_templates
      WHERE assessment_version_id = $1
        AND pattern_key = $2
        AND status = 'draft'
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `,
      [params.assessmentVersionId, params.patternKey],
    );

    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

async function loadImportedPreviewTemplates(params: {
  readonly assessmentVersionId: string | null;
}): Promise<readonly ImportedPreviewTemplateRow[]> {
  if (!params.assessmentVersionId || !process.env.DATABASE_URL) {
    return [];
  }

  try {
    const result = await getDbPool().query<ImportedPreviewTemplateRow>(
      `
      SELECT
        id,
        assessment_version_id,
        domain_key,
        pattern_key,
        report_key,
        report_contract,
        report_template_json,
        content_hash,
        status
      FROM assessment_report_first_templates
      WHERE assessment_version_id = $1
        AND status = 'draft'
      ORDER BY pattern_key ASC, updated_at DESC, id DESC
      `,
      [params.assessmentVersionId],
    );

    const latestByPattern = new Map<string, ImportedPreviewTemplateRow>();
    for (const row of result.rows) {
      if (!latestByPattern.has(row.pattern_key)) {
        latestByPattern.set(row.pattern_key, row);
      }
    }

    return [...latestByPattern.values()];
  } catch {
    return [];
  }
}

export type AdminReportFirstPreviewArtifactProvider = () => LeadershipReportFirstImportArtifact;

export async function buildAdminReportFirstPreviewWithArtifact(params: {
  readonly assessmentKey: string;
  readonly assessmentTitle: string;
  readonly assessmentVersionId: string | null;
  readonly assessmentVersionTag: string | null;
  readonly patternKey?: string | null;
  readonly scoreShape?: string | null;
}, artifactProvider: AdminReportFirstPreviewArtifactProvider = getGeneratedLeadershipReportFirstImportArtifact): Promise<AdminReportFirstPreviewResult> {
  const importedRows = await loadImportedPreviewTemplates({
    assessmentVersionId: params.assessmentVersionId,
  });
  let rows: readonly (LeadershipReportFirstImportRow | ImportedPreviewTemplateRow)[] = importedRows;
  let usingImportedRows = importedRows.length > 0;

  if (rows.length === 0) {
    let artifact: LeadershipReportFirstImportArtifact;
    try {
      artifact = artifactProvider();
    } catch {
      return {
        status: 'error',
        options: [],
        code: 'REPORT_FIRST_PREVIEW_ARTIFACT_UNAVAILABLE',
        message:
          'No imported draft templates are available, and the generated report-first import artifact is unavailable or malformed. Preview cannot be assembled, and publish remains blocked.',
        selectedPatternKey: params.patternKey?.trim() ?? '',
        sourceAttempts: ['Imported draft template storage', 'Generated report-first import artifact'],
      };
    }

    rows = artifact.import_rows;
    usingImportedRows = false;
  }

  const options = rows.map((row) => ({
    patternKey: row.pattern_key,
    reportKey: row.report_key,
    label: reportLabel(row.pattern_key),
  }));
  const selectedPatternKey = params.patternKey?.trim()
    || options.find((option) => option.patternKey === defaultPreviewPatternKey)?.patternKey
    || options[0]?.patternKey
    || '';
  const selected = rows.find((row) => row.pattern_key === selectedPatternKey);

  if (!selected || !selectedPatternKey) {
    return {
      status: 'error',
      options,
      code: 'REPORT_FIRST_PREVIEW_TEMPLATE_NOT_FOUND',
      message: 'No generated or imported report-first template is available for the selected signal order.',
      selectedPatternKey,
      sourceAttempts: ['Imported draft template storage', 'Generated report-first import artifact'],
    };
  }

  if (selected.report_contract !== REPORT_FIRST_TEMPLATE_CONTRACT) {
    return {
      status: 'error',
      options,
      code: 'REPORT_FIRST_PREVIEW_UNSUPPORTED_CONTRACT',
      message: 'The selected template does not use the supported report-first payload contract.',
      selectedPatternKey,
      sourceAttempts: ['Imported draft template storage', 'Generated report-first import artifact'],
    };
  }

  const importedTemplate = usingImportedRows
    ? selected as ImportedPreviewTemplateRow
    : await loadImportedPreviewTemplate({
      assessmentVersionId: params.assessmentVersionId,
      patternKey: selected.pattern_key,
    });
  const template = importedTemplate ?? selected;
  const sourceStatus = importedTemplate
    ? 'Loaded from imported draft report-first template storage'
    : 'Loaded from generated report-first import artifact';

  const rankedSignals = rankedSignalsForPattern(template.pattern_key);
  if (rankedSignals.length !== 4) {
    return {
      status: 'error',
      options,
      code: 'REPORT_FIRST_PREVIEW_INVALID_PATTERN',
      message: 'The selected template does not resolve to exactly four ranked signals.',
      selectedPatternKey,
      sourceAttempts: ['Imported draft template storage', 'Generated report-first import artifact'],
    };
  }

  const shape = previewScoreShape(params.scoreShape ?? 'paired');
  const payload = buildReportFirstCanonicalPayload({
    assessmentVersionId: params.assessmentVersionId ?? 'admin-preview-version',
    assessmentKey: params.assessmentKey,
    assessmentTitle: params.assessmentTitle,
    assessmentVersionTag: params.assessmentVersionTag ?? 'admin-preview',
    assessmentDescription: 'Admin-only report-first template preview.',
    domainKey: template.domain_key,
    domainTitle: 'Leadership Approach',
    domainDescription: null,
    responses: syntheticResponses(),
    scoreResult: syntheticScoreResult(rankedSignals),
    normalizedResult: syntheticNormalizedResult(rankedSignals),
    rankedSignals,
    scoreShape: shape,
    patternKey: template.pattern_key,
    template: importedTemplate ?? templateRowFromImportRow(
      selected as LeadershipReportFirstImportRow,
      params.assessmentVersionId ?? 'admin-preview-version',
    ),
    counts: {
      domainCount: 1,
      questionCount: 24,
      optionCount: 96,
      weightCount: 96,
      signalCount: 4,
      derivedPairCount: 0,
    },
  });

  return {
    status: 'ready',
    options,
    payload,
    review: buildReview({
      row: template,
      payload,
      scoreShape: shape.value,
      sourceStatus,
    }),
  };
}

export async function buildAdminReportFirstPreview(params: {
  readonly assessmentKey: string;
  readonly assessmentTitle: string;
  readonly assessmentVersionId: string | null;
  readonly assessmentVersionTag: string | null;
  readonly patternKey?: string | null;
  readonly scoreShape?: string | null;
}): Promise<AdminReportFirstPreviewResult> {
  return buildAdminReportFirstPreviewWithArtifact(params);
}

export const adminReportFirstRequiredPreviewHeadings = requiredPreviewHeadings;
