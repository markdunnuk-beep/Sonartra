import { isCanonicalResultPayload } from '@/lib/engine/result-contract';
import type { CanonicalResultPayload } from '@/lib/engine/types';
import type { Queryable } from '@/lib/engine/repository-sql';
import {
  getReadyResultDetailForUser,
  listReadyResultsForUser,
  type PersistedReadyResultRecord,
} from '@/lib/server/result-read-model-queries';
import type {
  AssessmentResultActionItemViewModel,
  AssessmentResultDetailViewModel,
  AssessmentResultDomainViewModel,
  AssessmentResultListItem,
  AssessmentResultRankedSignalViewModel,
  AssessmentResultSignalScoreViewModel,
  AssessmentResultTopSignalViewModel,
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

function toActionItems(
  items: CanonicalResultPayload['actions']['strengths'],
): readonly AssessmentResultActionItemViewModel[] {
  return Object.freeze(
    items.map((item) => ({
      signalKey: item.signalKey,
      signalLabel: item.signalLabel,
      text: item.text,
      key: item.signalKey,
      title: item.signalLabel,
      detail: item.text,
    })),
  );
}

function toDomainSummaries(payload: CanonicalResultPayload): readonly AssessmentResultDomainViewModel[] {
  return Object.freeze(
    payload.domains.map((domain) => {
      const signalScores: AssessmentResultSignalScoreViewModel[] = domain.signalBalance.items.map((signal) => ({
        signalId: signal.signalKey,
        signalKey: signal.signalKey,
        signalTitle: signal.signalLabel,
        domainId: domain.domainKey,
        domainKey: domain.domainKey,
        domainSource: domain.signalBalance.items.length > 0 ? ('signal_group' as const) : ('question_section' as const),
        isOverlay: false,
        overlayType: 'none',
        rawTotal: signal.withinDomainPercent,
        normalizedValue: signal.withinDomainPercent,
        percentage: signal.withinDomainPercent,
        domainPercentage: signal.withinDomainPercent,
        rank: signal.rank,
      }));

      return {
        domainId: domain.domainKey,
        domainKey: domain.domainKey,
        domainTitle: domain.domainLabel,
        domainSource: signalScores.length > 0 ? ('signal_group' as const) : ('question_section' as const),
        rawTotal: signalScores.reduce((sum, signal) => sum + signal.rawTotal, 0),
        normalizedValue: signalScores.reduce((sum, signal) => sum + signal.normalizedValue, 0),
        percentage: signalScores.length > 0 ? 100 : 0,
        signalScores: Object.freeze(signalScores),
        signalCount: signalScores.length,
        answeredQuestionCount: 0,
        rankedSignalIds: Object.freeze(signalScores.map((signal) => signal.signalId)),
        interpretation: domain.chapterOpening
          ? {
              domainKey: domain.domainKey,
              primarySignalKey: domain.primarySignal?.signalKey ?? null,
              primaryPercent:
                domain.primarySignal?.signalKey
                  ? signalScores.find((signal) => signal.signalKey === domain.primarySignal?.signalKey)?.domainPercentage ?? null
                  : null,
              secondarySignalKey: domain.secondarySignal?.signalKey ?? null,
              secondaryPercent:
                domain.secondarySignal?.signalKey
                  ? signalScores.find((signal) => signal.signalKey === domain.secondarySignal?.signalKey)?.domainPercentage ?? null
                  : null,
              summary: domain.chapterOpening,
              supportingLine: null,
              tensionClause: null,
            }
          : null,
      };
    }),
  );
}

function toRankedSignals(payload: CanonicalResultPayload): readonly AssessmentResultRankedSignalViewModel[] {
  const signals = payload.domains.flatMap((domain) =>
    domain.signalBalance.items.map((signal) => ({
      signalId: signal.signalKey,
      signalKey: signal.signalKey,
      title: signal.signalLabel,
      domainId: domain.domainKey,
      domainKey: domain.domainKey,
      normalizedValue: signal.withinDomainPercent,
      rawTotal: signal.withinDomainPercent,
      percentage: signal.withinDomainPercent,
      domainPercentage: signal.withinDomainPercent,
      isOverlay: false,
      overlayType: 'none' as const,
      rank: signal.rank,
    })),
  );

  return Object.freeze(signals.sort((left, right) => left.rank - right.rank));
}

function toTopSignal(payload: CanonicalResultPayload): AssessmentResultTopSignalViewModel | null {
  const primaryPattern = payload.hero.primaryPattern;
  if (!primaryPattern?.signalKey) {
    return null;
  }

  const rankedSignals = toRankedSignals(payload);
  const signal = rankedSignals.find((entry) => entry.signalKey === primaryPattern.signalKey) ?? rankedSignals[0];
  if (!signal) {
    return null;
  }

  return {
    signalId: signal.signalId,
    signalKey: signal.signalKey,
    title: signal.title,
    domainId: signal.domainId,
    domainKey: signal.domainKey,
    normalizedValue: signal.normalizedValue,
    rawTotal: signal.rawTotal,
    percentage: signal.percentage,
    rank: 1,
  };
}

function toListItem(record: PersistedReadyResultRecord): AssessmentResultListItem {
  const payload = parseCanonicalPayload(record);
  const topSignal = toTopSignal(payload);

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
    topSignal,
    topSignalPercentage: topSignal?.percentage ?? null,
    resultAvailable: true,
  };
}

function tryToListItem(record: PersistedReadyResultRecord): AssessmentResultListItem | null {
  try {
    return toListItem(record);
  } catch (error) {
    if (error instanceof AssessmentResultPayloadError) {
      return null;
    }

    throw error;
  }
}

function toDetailViewModel(record: PersistedReadyResultRecord): AssessmentResultDetailViewModel {
  const payload = parseCanonicalPayload(record);
  const rankedSignals = toRankedSignals(payload);
  const domainSummaries = toDomainSummaries(payload);
  const topSignal = toTopSignal(payload);
  const normalizedScores = Object.freeze(
    domainSummaries.flatMap((domain) => domain.signalScores),
  );

  return {
    resultId: record.resultId,
    attemptId: record.attemptId,
    assessmentId: record.assessmentId,
    assessmentKey: record.assessmentKey,
    assessmentTitle: record.assessmentTitle,
    version: record.version,
    metadata: payload.metadata,
    intro: payload.intro,
    hero: payload.hero,
    domains: payload.domains,
    actions: payload.actions,
    topSignal,
    rankedSignals,
    normalizedScores,
    domainSummaries,
    overviewSummary: {
      headline: payload.hero.headline ?? '',
      narrative: payload.hero.narrative ?? '',
    },
    strengths: toActionItems(payload.actions.strengths),
    watchouts: toActionItems(payload.actions.watchouts),
    developmentFocus: toActionItems(payload.actions.developmentFocus),
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
      return Object.freeze(
        records
          .map(tryToListItem)
          .filter((result): result is AssessmentResultListItem => result !== null),
      );
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
