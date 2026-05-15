import type { SingleDomainResultScoreShape } from '@/lib/types/single-domain-result';

export const REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT = 'report_first_canonical_payload_v1';

export type ReportFirstRankedSignal = {
  readonly rank: number;
  readonly signalKey: string;
  readonly signalLabel: string;
  readonly roleLabel?: string;
  readonly roleSummary?: string;
};

export type ReportFirstScoreRow = {
  readonly signalKey: string;
  readonly signalLabel: string;
  readonly normalizedPercent: number;
  readonly rawScore?: number;
};

export type ReportFirstCanonicalPayloadV1 = {
  readonly metadata: {
    readonly payloadVersion: 1;
    readonly contractName: typeof REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT;
    readonly generatedAt: string;
    readonly assessmentVersionId: string;
    readonly assessmentKey: string;
    readonly assessmentTitle: string;
    readonly version: string;
    readonly attemptId: string;
    readonly mode: 'single_domain';
    readonly reportMode: 'single_domain_ranked_pattern';
    readonly reportModel: 'report_first_canonical';
    readonly resultModelKey: 'ranked_pattern';
    readonly domainKey: string;
    readonly completedAt: string | null;
  };
  readonly assessment: {
    readonly key: string;
    readonly title: string;
    readonly version: string;
    readonly description: string | null;
  };
  readonly attempt: {
    readonly attemptId: string;
    readonly submittedAt: string | null;
    readonly completedAt: string | null;
    readonly answeredQuestionCount: number;
    readonly totalQuestionCount: number;
  };
  readonly domain: {
    readonly key: string;
    readonly title: string;
    readonly description: string | null;
  };
  readonly topSignal: {
    readonly signalKey: string;
    readonly signalLabel: string;
    readonly rank: number;
    readonly rawScore: number;
    readonly normalizedPercentage: number;
  };
  readonly rankedSignals: readonly ReportFirstRankedSignal[];
  readonly normalizedScores: readonly ReportFirstScoreRow[];
  readonly scoreShape: SingleDomainResultScoreShape;
  readonly patternKey: string;
  readonly scoring: {
    readonly patternKey: string;
    readonly scoreShape: string;
    readonly rankedSignals: readonly ReportFirstRankedSignal[];
    readonly normalizedScores: readonly ReportFirstScoreRow[];
    readonly rawScores: readonly ReportFirstScoreRow[];
    readonly scoreShapeCapturedButNotLanguageDriving: true;
    readonly scoringMethod: 'option_signal_weights';
    readonly normalizationMethod: string;
  };
  readonly report: unknown;
  readonly reportFirst: {
    readonly templateId: string;
    readonly reportKey: string;
    readonly patternKey: string;
    readonly contentHash: string;
    readonly contractName: typeof REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT;
    readonly template: unknown;
  };
  readonly evidence: {
    readonly title: string;
    readonly rankedSignalEvidence: readonly ReportFirstRankedSignal[];
    readonly scoreRows: readonly ReportFirstScoreRow[];
    readonly scoreShapeBadge: {
      readonly label: string;
      readonly readerFacing: false;
    };
    readonly explanatoryNote: string;
  };
  readonly diagnostics: {
    readonly readinessStatus: 'ready';
    readonly scoringMethod: 'option_signal_weights_only';
    readonly normalizationMethod: 'largest_remainder_integer_percentages';
    readonly answeredQuestionCount: number;
    readonly totalQuestionCount: number;
    readonly signalCount: number;
    readonly derivedPairCount: number;
    readonly topPair: null;
    readonly scoreShapePolicy: {
      readonly policyKey: string;
      readonly policyVersion: string;
    };
    readonly patternLookup: {
      readonly patternKey: string;
      readonly rankSignalKeys: readonly string[];
    };
    readonly reportFirstTemplate: {
      readonly id: string;
      readonly reportKey: string;
      readonly contentHash: string;
      readonly reportContract: typeof REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT;
    };
    readonly sourceReportKey: string;
    readonly sourceAssessmentVersionId: string;
    readonly sourceContentHash: string;
    readonly adminNotesExcluded: boolean;
    readonly warningList: readonly string[];
    readonly generatedFrom: 'compiled_report_first_template';
    readonly counts: {
      readonly domainCount: number;
      readonly questionCount: number;
      readonly optionCount: number;
      readonly weightCount: number;
    };
    readonly warnings: readonly string[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isReportFirstCanonicalPayloadV1(value: unknown): value is ReportFirstCanonicalPayloadV1 {
  return isRecord(value)
    && isRecord(value.metadata)
    && value.metadata.payloadVersion === 1
    && value.metadata.contractName === REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT
    && value.metadata.mode === 'single_domain'
    && value.metadata.reportMode === 'single_domain_ranked_pattern'
    && value.metadata.reportModel === 'report_first_canonical'
    && value.metadata.resultModelKey === 'ranked_pattern'
    && isNonEmptyString(value.metadata.assessmentVersionId)
    && isNonEmptyString(value.metadata.attemptId)
    && isNonEmptyString(value.metadata.domainKey)
    && isNonEmptyString(value.metadata.generatedAt)
    && isRecord(value.assessment)
    && isRecord(value.attempt)
    && isRecord(value.domain)
    && isRecord(value.topSignal)
    && Array.isArray(value.rankedSignals)
    && value.rankedSignals.length === 4
    && Array.isArray(value.normalizedScores)
    && value.normalizedScores.length === 4
    && isRecord(value.scoreShape)
    && isNonEmptyString(value.patternKey)
    && isRecord(value.scoring)
    && value.scoring.scoreShapeCapturedButNotLanguageDriving === true
    && value.scoring.scoringMethod === 'option_signal_weights'
    && isRecord(value.reportFirst)
    && isNonEmptyString(value.reportFirst.templateId)
    && value.reportFirst.contractName === REPORT_FIRST_CANONICAL_PAYLOAD_CONTRACT
    && isRecord(value.evidence)
    && isRecord(value.diagnostics)
    && value.diagnostics.readinessStatus === 'ready'
    && value.diagnostics.generatedFrom === 'compiled_report_first_template'
    && isFiniteNumber(value.diagnostics.answeredQuestionCount)
    && isFiniteNumber(value.diagnostics.totalQuestionCount)
    && isRecord(value.diagnostics.reportFirstTemplate);
}
