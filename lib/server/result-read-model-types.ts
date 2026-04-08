import type {
  CanonicalResultPayload,
  ResultDiagnostics,
} from '@/lib/engine/types';

export type AssessmentResultTopSignalViewModel = {
  signalId: string;
  signalKey: string;
  title: string;
  domainId: string;
  domainKey: string;
  normalizedValue: number;
  rawTotal: number;
  percentage: number;
  rank: 1;
};

export type AssessmentResultRankedSignalViewModel = {
  signalId: string;
  signalKey: string;
  title: string;
  domainId: string;
  domainKey: string;
  normalizedValue: number;
  rawTotal: number;
  percentage: number;
  domainPercentage: number;
  isOverlay: boolean;
  overlayType: 'none' | 'decision' | 'role';
  rank: number;
};

export type AssessmentResultSignalScoreViewModel = {
  signalId: string;
  signalKey: string;
  signalTitle: string;
  domainId: string;
  domainKey: string;
  domainSource: 'question_section' | 'signal_group';
  isOverlay: boolean;
  overlayType: 'none' | 'decision' | 'role';
  rawTotal: number;
  normalizedValue: number;
  percentage: number;
  domainPercentage: number;
  rank: number;
};

export type AssessmentResultDomainViewModel = {
  domainId: string;
  domainKey: string;
  domainTitle: string;
  domainSource: 'question_section' | 'signal_group';
  rawTotal: number;
  normalizedValue: number;
  percentage: number;
  signalScores: readonly AssessmentResultSignalScoreViewModel[];
  signalCount: number;
  answeredQuestionCount: number;
  rankedSignalIds: readonly string[];
  interpretation: {
    domainKey: string;
    primarySignalKey: string | null;
    primaryPercent: number | null;
    secondarySignalKey: string | null;
    secondaryPercent: number | null;
    summary: string;
    supportingLine?: string | null;
    tensionClause?: string | null;
  } | null;
};

export type AssessmentResultActionItemViewModel = {
  signalKey: string;
  signalLabel: string;
  text: string;
  key: string;
  title: string;
  detail: string;
};

export type AssessmentResultSummary = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  version: string;
  readinessStatus: 'ready';
  createdAt: string;
  generatedAt: string | null;
  topSignal: AssessmentResultTopSignalViewModel | null;
  topSignalPercentage: number | null;
  resultAvailable: true;
};

export type AssessmentResultListItem = AssessmentResultSummary;

export type AssessmentResultSignalViewModel =
  | AssessmentResultSignalScoreViewModel
  | AssessmentResultRankedSignalViewModel;

export type AssessmentResultDetailViewModel = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  version: string;
  metadata: CanonicalResultPayload['metadata'];
  intro: CanonicalResultPayload['intro'];
  hero: CanonicalResultPayload['hero'];
  domains: CanonicalResultPayload['domains'];
  actions: CanonicalResultPayload['actions'];
  application: CanonicalResultPayload['application'];
  topSignal: AssessmentResultTopSignalViewModel | null;
  rankedSignals: readonly AssessmentResultRankedSignalViewModel[];
  normalizedScores: readonly AssessmentResultSignalScoreViewModel[];
  domainSummaries: readonly AssessmentResultDomainViewModel[];
  overviewSummary: {
    headline: string;
    narrative: string;
  };
  strengths: readonly AssessmentResultActionItemViewModel[];
  watchouts: readonly AssessmentResultActionItemViewModel[];
  developmentFocus: readonly AssessmentResultActionItemViewModel[];
  diagnostics: ResultDiagnostics;
  createdAt: string;
  generatedAt: string | null;
};

export class AssessmentResultNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentResultNotFoundError';
  }
}

export class AssessmentResultAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentResultAccessError';
  }
}

export class AssessmentResultPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentResultPayloadError';
  }
}
