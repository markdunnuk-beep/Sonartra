import type {
  CanonicalResultPayload,
  NormalizedDomainSummary,
  NormalizedSignalScore,
  ResultDiagnostics,
  ResultOverviewSummary,
  ResultRankedSignal,
  ResultTopSignal,
} from '@/lib/engine/types';

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
  topSignal: ResultTopSignal | null;
  topSignalPercentage: number | null;
  resultAvailable: true;
};

export type AssessmentResultListItem = AssessmentResultSummary;

export type AssessmentResultSignalViewModel = NormalizedSignalScore | ResultRankedSignal;

export type AssessmentResultDomainViewModel = NormalizedDomainSummary;

export type AssessmentResultDetailViewModel = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  version: string;
  metadata: CanonicalResultPayload['metadata'];
  topSignal: ResultTopSignal | null;
  rankedSignals: readonly ResultRankedSignal[];
  normalizedScores: readonly NormalizedSignalScore[];
  domainSummaries: readonly NormalizedDomainSummary[];
  overviewSummary: ResultOverviewSummary;
  strengths: CanonicalResultPayload['strengths'];
  watchouts: CanonicalResultPayload['watchouts'];
  developmentFocus: CanonicalResultPayload['developmentFocus'];
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
