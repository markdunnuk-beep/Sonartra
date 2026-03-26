import { isCanonicalResultPayload } from '@/lib/engine/result-contract';
import type { Queryable } from '@/lib/engine/repository-sql';
import {
  getReadyResultDetailForUser,
  listReadyResultsForUser,
  type PersistedReadyResultRecord,
} from '@/lib/server/result-read-model-queries';
import type {
  AssessmentResultDetailViewModel,
  AssessmentResultListItem,
} from '@/lib/server/result-read-model-types';
import {
  AssessmentResultNotFoundError,
  AssessmentResultPayloadError,
} from '@/lib/server/result-read-model-types';

export type ResultReadModelServiceDeps = {
  db: Queryable;
};

export type ResultReadModelService = {
  listAssessmentResults(params: { userId: string }): Promise<readonly AssessmentResultListItem[]>;
  getAssessmentResultDetail(params: {
    userId: string;
    resultId: string;
  }): Promise<AssessmentResultDetailViewModel>;
};

function parseCanonicalPayload(record: PersistedReadyResultRecord) {
  if (!isCanonicalResultPayload(record.canonicalResultPayload)) {
    throw new AssessmentResultPayloadError(
      `Persisted result payload is malformed for result ${record.resultId}`,
    );
  }

  return record.canonicalResultPayload;
}

function toListItem(record: PersistedReadyResultRecord): AssessmentResultListItem {
  const payload = parseCanonicalPayload(record);

  return {
    resultId: record.resultId,
    attemptId: record.attemptId,
    assessmentId: record.assessmentId,
    assessmentKey: record.assessmentKey,
    assessmentTitle: record.assessmentTitle,
    version: record.version,
    readinessStatus: 'ready',
    createdAt: record.createdAt,
    generatedAt: record.generatedAt,
    topSignal: payload.topSignal,
    topSignalPercentage: payload.topSignal?.percentage ?? null,
    resultAvailable: true,
  };
}

function toDetailViewModel(record: PersistedReadyResultRecord): AssessmentResultDetailViewModel {
  const payload = parseCanonicalPayload(record);

  return {
    resultId: record.resultId,
    attemptId: record.attemptId,
    assessmentId: record.assessmentId,
    assessmentKey: record.assessmentKey,
    assessmentTitle: record.assessmentTitle,
    version: record.version,
    metadata: payload.metadata,
    topSignal: payload.topSignal,
    rankedSignals: Object.freeze([...payload.rankedSignals]),
    normalizedScores: Object.freeze([...payload.normalizedScores]),
    domainSummaries: Object.freeze([...payload.domainSummaries]),
    overviewSummary: payload.overviewSummary,
    strengths: Object.freeze([...payload.strengths]),
    watchouts: Object.freeze([...payload.watchouts]),
    developmentFocus: Object.freeze([...payload.developmentFocus]),
    diagnostics: payload.diagnostics,
    createdAt: record.createdAt,
    generatedAt: record.generatedAt,
  };
}

export function createResultReadModelService(
  deps: ResultReadModelServiceDeps,
): ResultReadModelService {
  return {
    async listAssessmentResults(params) {
      const records = await listReadyResultsForUser(deps.db, params.userId);
      return Object.freeze(records.map(toListItem));
    },

    async getAssessmentResultDetail(params) {
      const record = await getReadyResultDetailForUser(deps.db, {
        userId: params.userId,
        resultId: params.resultId,
      });

      if (!record) {
        throw new AssessmentResultNotFoundError(
          `Ready result ${params.resultId} was not found for the current user`,
        );
      }

      return toDetailViewModel(record);
    },
  };
}
