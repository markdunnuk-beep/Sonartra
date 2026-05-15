import { REPORT_FIRST_TEMPLATE_CONTRACT } from '@/lib/server/report-first-template-storage';
import type { Queryable } from '@/lib/engine/repository-sql';
import type { NormalizedResult, RuntimeResponseSet, ScoreResult } from '@/lib/engine/types';
import type { SingleDomainResultScoreShape, SingleDomainResultSignal } from '@/lib/types/single-domain-result';
import {
  REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT,
  type ReportFirstCanonicalPayloadV1,
  type ReportFirstRankedSignal,
  type ReportFirstScoreRow,
} from '@/lib/types/report-first-result';

export class ReportFirstCompletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportFirstCompletionError';
  }
}

type ReportFirstTemplateRow = {
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

export type ReportFirstTemplateCompletionLookup =
  | { readonly enabled: false }
  | { readonly enabled: true; readonly template: ReportFirstTemplateRow };

type ReportTemplateJson = {
  readonly reportKey?: unknown;
  readonly patternKey?: unknown;
  readonly domainKey?: unknown;
  readonly report?: unknown;
  readonly evidenceTemplate?: unknown;
  readonly diagnostics?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, description: string): Record<string, unknown> {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    throw new ReportFirstCompletionError(`Report-first completion requires non-empty ${description}.`);
  }

  return value;
}

function readTemplateJson(template: ReportFirstTemplateRow): ReportTemplateJson {
  const parsed = typeof template.report_template_json === 'string'
    ? JSON.parse(template.report_template_json) as unknown
    : template.report_template_json;
  const json = requireRecord(parsed, 'report_template_json') as ReportTemplateJson;
  requireRecord(json.report, 'report_template_json.report');

  if (json.reportKey !== undefined && json.reportKey !== template.report_key) {
    throw new ReportFirstCompletionError(
      `Report-first template "${template.id}" reportKey does not match storage report_key.`,
    );
  }

  if (json.patternKey !== undefined && json.patternKey !== template.pattern_key) {
    throw new ReportFirstCompletionError(
      `Report-first template "${template.id}" patternKey does not match storage pattern_key.`,
    );
  }

  if (json.domainKey !== undefined && json.domainKey !== template.domain_key) {
    throw new ReportFirstCompletionError(
      `Report-first template "${template.id}" domainKey does not match storage domain_key.`,
    );
  }

  return json;
}

function validateTemplateRow(template: ReportFirstTemplateRow, patternKey: string): void {
  if (template.status !== 'active') {
    throw new ReportFirstCompletionError(
      `Report-first template "${template.id}" must be active for completion.`,
    );
  }

  if (template.report_contract !== REPORT_FIRST_TEMPLATE_CONTRACT) {
    throw new ReportFirstCompletionError(
      `Report-first template "${template.id}" uses unsupported contract "${template.report_contract}".`,
    );
  }

  if (template.pattern_key !== patternKey) {
    throw new ReportFirstCompletionError(
      `Report-first template "${template.id}" does not match generated pattern_key "${patternKey}".`,
    );
  }

  if (!template.content_hash.trim()) {
    throw new ReportFirstCompletionError(
      `Report-first template "${template.id}" is missing content_hash.`,
    );
  }

  readTemplateJson(template);
}

export async function loadReportFirstTemplateForCompletion(params: {
  readonly db: Queryable;
  readonly assessmentVersionId: string;
  readonly patternKey: string;
}): Promise<ReportFirstTemplateCompletionLookup> {
  const result = await params.db.query<ReportFirstTemplateRow>(
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
      AND status = 'active'
    ORDER BY pattern_key, id
    `,
    [params.assessmentVersionId],
  );

  if (result.rows.length === 0) {
    return Object.freeze({ enabled: false });
  }

  if (result.rows.length !== 24) {
    throw new ReportFirstCompletionError(
      `Report-first completion requires exactly 24 active templates for assessment_version_id "${params.assessmentVersionId}"; found ${result.rows.length}.`,
    );
  }

  const matches = result.rows.filter((row) => row.pattern_key === params.patternKey);
  if (matches.length !== 1) {
    throw new ReportFirstCompletionError(
      `Report-first completion could not resolve one active template for pattern_key "${params.patternKey}".`,
    );
  }

  const template = matches[0]!;
  validateTemplateRow(template, params.patternKey);
  return Object.freeze({ enabled: true, template });
}

function toRankedSignal(signal: SingleDomainResultSignal): ReportFirstRankedSignal {
  return Object.freeze({
    rank: signal.rank,
    signalKey: signal.signal_key,
    signalLabel: signal.signal_label,
    roleLabel: signal.position_label,
  });
}

function toScoreRow(signal: SingleDomainResultSignal): ReportFirstScoreRow {
  return Object.freeze({
    signalKey: signal.signal_key,
    signalLabel: signal.signal_label,
    normalizedPercent: signal.normalized_score,
    rawScore: signal.raw_score,
  });
}

export function buildReportFirstCanonicalPayload(params: {
  readonly assessmentVersionId: string;
  readonly assessmentKey: string;
  readonly assessmentTitle: string;
  readonly assessmentVersionTag: string;
  readonly assessmentDescription: string | null;
  readonly domainKey: string;
  readonly domainTitle: string;
  readonly domainDescription: string | null;
  readonly responses: RuntimeResponseSet;
  readonly scoreResult: ScoreResult;
  readonly normalizedResult: NormalizedResult;
  readonly rankedSignals: readonly SingleDomainResultSignal[];
  readonly scoreShape: SingleDomainResultScoreShape;
  readonly patternKey: string;
  readonly template: ReportFirstTemplateRow;
  readonly counts: {
    readonly domainCount: number;
    readonly questionCount: number;
    readonly optionCount: number;
    readonly weightCount: number;
    readonly signalCount: number;
    readonly derivedPairCount: number;
  };
}): ReportFirstCanonicalPayloadV1 {
  const templateJson = readTemplateJson(params.template);
  const report = requireRecord(templateJson.report, 'report_template_json.report');
  const rankedSignalEvidence = Object.freeze(params.rankedSignals.map(toRankedSignal));
  const scoreRows = Object.freeze(params.rankedSignals.map(toScoreRow));
  const topSignal = params.rankedSignals[0];

  if (!topSignal) {
    throw new ReportFirstCompletionError('Report-first completion requires at least one ranked signal.');
  }

  return Object.freeze({
    metadata: Object.freeze({
      payloadVersion: 1,
      contractName: REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT,
      generatedAt: params.normalizedResult.diagnostics.generatedAt,
      assessmentVersionId: params.assessmentVersionId,
      assessmentKey: params.assessmentKey,
      assessmentTitle: params.assessmentTitle,
      version: params.assessmentVersionTag,
      attemptId: params.responses.attemptId,
      mode: 'single_domain',
      reportMode: 'single_domain_ranked_pattern',
      reportModel: 'report_first_canonical',
      resultModelKey: 'ranked_pattern',
      domainKey: params.domainKey,
      completedAt: params.responses.submittedAt,
    }),
    assessment: Object.freeze({
      key: params.assessmentKey,
      title: params.assessmentTitle,
      version: params.assessmentVersionTag,
      description: params.assessmentDescription,
    }),
    attempt: Object.freeze({
      attemptId: params.responses.attemptId,
      submittedAt: params.responses.submittedAt,
      completedAt: params.responses.submittedAt,
      answeredQuestionCount: params.scoreResult.diagnostics.answeredQuestions,
      totalQuestionCount: params.scoreResult.diagnostics.totalQuestions,
    }),
    domain: Object.freeze({
      key: params.domainKey,
      title: params.domainTitle,
      description: params.domainDescription,
    }),
    topSignal: Object.freeze({
      signalKey: topSignal.signal_key,
      signalLabel: topSignal.signal_label,
      rank: topSignal.rank,
      rawScore: topSignal.raw_score,
      normalizedPercentage: topSignal.normalized_score,
    }),
    rankedSignals: rankedSignalEvidence,
    normalizedScores: scoreRows,
    scoreShape: params.scoreShape,
    patternKey: params.patternKey,
    scoring: Object.freeze({
      patternKey: params.patternKey,
      scoreShape: params.scoreShape.value,
      rankedSignals: rankedSignalEvidence,
      normalizedScores: scoreRows,
      rawScores: scoreRows,
      scoreShapeCapturedButNotLanguageDriving: true,
      scoringMethod: 'option_signal_weights',
      normalizationMethod: params.normalizedResult.diagnostics.normalizationMethod,
    }),
    report,
    reportFirst: Object.freeze({
      templateId: params.template.id,
      reportKey: params.template.report_key,
      patternKey: params.template.pattern_key,
      contentHash: params.template.content_hash,
      contractName: REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT,
      template: templateJson,
    }),
    evidence: Object.freeze({
      title: 'Evidence behind your result',
      rankedSignalEvidence,
      scoreRows,
      scoreShapeBadge: Object.freeze({
        label: params.scoreShape.value,
        readerFacing: false,
      }),
      explanatoryNote: 'These scores provide evidence for the ranked pattern; the report explains what that pattern means in practice.',
    }),
    diagnostics: Object.freeze({
      readinessStatus: 'ready',
      scoringMethod: params.scoreResult.diagnostics.scoringMethod,
      normalizationMethod: params.normalizedResult.diagnostics.normalizationMethod,
      answeredQuestionCount: params.scoreResult.diagnostics.answeredQuestions,
      totalQuestionCount: params.scoreResult.diagnostics.totalQuestions,
      signalCount: params.counts.signalCount,
      derivedPairCount: params.counts.derivedPairCount,
      topPair: null,
      scoreShapePolicy: Object.freeze({
        policyKey: params.scoreShape.policyKey,
        policyVersion: params.scoreShape.policyVersion,
      }),
      patternLookup: Object.freeze({
        patternKey: params.patternKey,
        rankSignalKeys: params.rankedSignals.map((signal) => signal.signal_key),
      }),
      reportFirstTemplate: Object.freeze({
        id: params.template.id,
        reportKey: params.template.report_key,
        contentHash: params.template.content_hash,
        reportContract: REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT,
      }),
      sourceReportKey: params.template.report_key,
      sourceAssessmentVersionId: params.assessmentVersionId,
      sourceContentHash: params.template.content_hash,
      adminNotesExcluded: isRecord(templateJson.diagnostics)
        ? templateJson.diagnostics.adminNotesExcluded !== false
        : true,
      warningList: Object.freeze([]),
      generatedFrom: 'compiled_report_first_template',
      counts: Object.freeze({
        domainCount: params.counts.domainCount,
        questionCount: params.counts.questionCount,
        optionCount: params.counts.optionCount,
        weightCount: params.counts.weightCount,
      }),
      warnings: Object.freeze([
        ...params.scoreResult.diagnostics.warnings,
        ...params.normalizedResult.diagnostics.warnings,
      ]),
    }),
  });
}
