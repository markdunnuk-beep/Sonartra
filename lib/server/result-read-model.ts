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
import {
  isSingleDomainResultPayload,
  type SingleDomainResultPayload,
} from '@/lib/types/single-domain-result';
import { resolveAssessmentMode } from '@/lib/utils/assessment-mode';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeNullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readLegacyNullableText(record: unknown, key: string): string | null {
  if (!isRecord(record) || !(key in record)) {
    return null;
  }

  return normalizeNullableText(record[key]);
}

function normalizeCanonicalPayload(payload: CanonicalResultPayload): CanonicalResultPayload {
  return {
    ...payload,
    domains: Object.freeze(
      payload.domains.map((domain) => ({
        ...domain,
        chapterOpening: normalizeNullableText(domain.chapterOpening),
        signalBalance: {
          items: Object.freeze(
            domain.signalBalance.items.map((signal) => ({
              ...signal,
              chapterSummary:
                normalizeNullableText(signal.chapterSummary) ??
                readLegacyNullableText(signal, 'summary'),
            })),
          ),
        },
        primarySignal: domain.primarySignal
          ? {
              ...domain.primarySignal,
              chapterSummary:
                normalizeNullableText(domain.primarySignal.chapterSummary) ??
                readLegacyNullableText(domain.primarySignal, 'summary'),
            }
          : null,
        secondarySignal: domain.secondarySignal
          ? {
              ...domain.secondarySignal,
              chapterSummary:
                normalizeNullableText(domain.secondarySignal.chapterSummary) ??
                readLegacyNullableText(domain.secondarySignal, 'summary'),
            }
          : null,
        signalPair: domain.signalPair
          ? {
              ...domain.signalPair,
              summary: normalizeNullableText(domain.signalPair.summary),
            }
          : null,
        pressureFocus: normalizeNullableText(domain.pressureFocus),
        environmentFocus: normalizeNullableText(domain.environmentFocus),
      })),
    ),
  };
}

type ReadableResultPayload = Omit<CanonicalResultPayload, 'application'> & {
  application?: CanonicalResultPayload['application'];
};

type ParsedReadablePayload =
  | {
      mode: 'multi_domain';
      payload: ReadableResultPayload;
      hasApplicationPlan: boolean;
      singleDomainResult: null;
    }
  | {
      mode: 'single_domain';
      payload: SingleDomainResultPayload;
      hasApplicationPlan: false;
      singleDomainResult: SingleDomainResultPayload;
    };

function createEmptyApplicationSection(): CanonicalResultPayload['application'] {
  return {
    thesis: {
      headline: '',
      summary: '',
      sourceKeys: {
        heroPatternKey: '',
      },
    },
    signatureContribution: {
      title: '',
      summary: '',
      items: [],
    },
    patternRisks: {
      title: '',
      summary: '',
      items: [],
    },
    rangeBuilder: {
      title: '',
      summary: '',
      items: [],
    },
    actionPlan30: {
      keepDoing: '',
      watchFor: '',
      practiceNext: '',
      askOthers: '',
    },
  };
}

function isReadableLegacyPayload(value: unknown): value is ReadableResultPayload {
  if (!isRecord(value)) {
    return false;
  }

  if ('application' in value) {
    return false;
  }

  return isCanonicalResultPayload({
    ...value,
    application: createEmptyApplicationSection(),
  });
}

function getPersistedPayloadMode(
  record: PersistedReadyResultRecord,
): 'multi_domain' | 'single_domain' {
  if (isRecord(record.canonicalResultPayload) && isRecord(record.canonicalResultPayload.metadata)) {
    const metadataMode = readLegacyNullableText(record.canonicalResultPayload.metadata, 'mode');
    if (!metadataMode) {
      return resolveAssessmentMode(record.mode) === 'single_domain'
        ? 'single_domain'
        : 'multi_domain';
    }

    return resolveAssessmentMode(metadataMode) === 'single_domain'
      ? 'single_domain'
      : 'multi_domain';
  }

  return resolveAssessmentMode(record.mode) === 'single_domain' ? 'single_domain' : 'multi_domain';
}

function parseCanonicalPayload(record: PersistedReadyResultRecord): ParsedReadablePayload {
  if (getPersistedPayloadMode(record) === 'single_domain') {
    if (!isSingleDomainResultPayload(record.canonicalResultPayload)) {
      throw new AssessmentResultPayloadError(
        `Persisted single-domain result payload is malformed for result ${record.resultId}`,
      );
    }

    return {
      mode: 'single_domain',
      payload: record.canonicalResultPayload,
      hasApplicationPlan: false,
      singleDomainResult: record.canonicalResultPayload,
    };
  }

  if (isCanonicalResultPayload(record.canonicalResultPayload)) {
    return {
      mode: 'multi_domain',
      payload: normalizeCanonicalPayload(record.canonicalResultPayload),
      hasApplicationPlan: true,
      singleDomainResult: null,
    };
  }

  if (!isReadableLegacyPayload(record.canonicalResultPayload)) {
    throw new AssessmentResultPayloadError(
      `Persisted result payload is malformed for result ${record.resultId}`,
    );
  }

  return {
    mode: 'multi_domain',
    payload: record.canonicalResultPayload,
    hasApplicationPlan: false,
    singleDomainResult: null,
  };
}

function createCompatibilityApplicationSection(): CanonicalResultPayload['application'] {
  return createEmptyApplicationSection();
}

function createCompatibilityDiagnostics(
  payload: SingleDomainResultPayload,
): import('@/lib/engine/types').ResultDiagnostics {
  return {
    readinessStatus: 'ready',
    scoring: {
      scoringMethod: payload.diagnostics.scoringMethod,
      totalQuestions: payload.diagnostics.totalQuestionCount,
      answeredQuestions: payload.diagnostics.answeredQuestionCount,
      unansweredQuestions:
        payload.diagnostics.totalQuestionCount - payload.diagnostics.answeredQuestionCount,
      totalResponsesProcessed: payload.diagnostics.answeredQuestionCount,
      totalWeightsApplied: payload.diagnostics.counts.weightCount,
      totalScoreMass: payload.signals.reduce((total, signal) => total + signal.raw_score, 0),
      zeroScoreSignalCount: payload.signals.filter((signal) => signal.raw_score === 0).length,
      zeroAnswerSubmission: payload.diagnostics.answeredQuestionCount === 0,
      warnings: Object.freeze([...payload.diagnostics.warnings]),
      generatedAt: payload.metadata.generatedAt,
    },
    normalization: {
      normalizationMethod: payload.diagnostics.normalizationMethod,
      totalScoreMass: payload.signals.reduce((total, signal) => total + signal.raw_score, 0),
      zeroMass: payload.signals.every((signal) => signal.raw_score === 0),
      globalPercentageSum: payload.signals.reduce(
        (total, signal) => total + signal.normalized_score,
        0,
      ),
      domainPercentageSums: Object.freeze({
        [payload.metadata.domainKey]: payload.signals.reduce(
          (total, signal) => total + signal.normalized_score,
          0,
        ),
      }),
      roundingAdjustmentsApplied: 0,
      zeroScoreSignalCount: payload.signals.filter((signal) => signal.raw_score === 0).length,
      warnings: Object.freeze([...payload.diagnostics.warnings]),
      generatedAt: payload.metadata.generatedAt,
    },
    answeredQuestionCount: payload.diagnostics.answeredQuestionCount,
    totalQuestionCount: payload.diagnostics.totalQuestionCount,
    missingQuestionIds: Object.freeze([]),
    topSignalSelectionBasis: 'normalized_rank',
    rankedSignalCount: payload.signals.length,
    domainCount: payload.diagnostics.counts.domainCount,
    zeroMass: payload.signals.every((signal) => signal.raw_score === 0),
    zeroMassTopSignalFallbackApplied: false,
    warnings: Object.freeze([...payload.diagnostics.warnings]),
    generatedAt: payload.metadata.generatedAt,
  };
}

function createCompatibilityPayload(payload: SingleDomainResultPayload): CanonicalResultPayload {
  const topSignal = payload.signals[0] ?? null;

  return {
    metadata: {
      assessmentKey: payload.metadata.assessmentKey,
      assessmentTitle: payload.metadata.assessmentTitle,
      mode: 'single_domain',
      version: payload.metadata.version,
      attemptId: payload.metadata.attemptId,
      completedAt: payload.metadata.completedAt,
      assessmentDescription: null,
    },
    intro: {
      assessmentDescription: payload.intro.intro_paragraph,
    },
    hero: {
      headline: payload.hero.hero_headline,
      subheadline: payload.hero.hero_subheadline,
      summary: payload.hero.hero_strength_paragraph,
      narrative: payload.hero.hero_opening,
      pressureOverlay: payload.hero.hero_tension_paragraph,
      environmentOverlay: payload.hero.hero_close_paragraph,
      primaryPattern: topSignal
        ? {
            label: topSignal.signal_label,
            signalKey: topSignal.signal_key,
            signalLabel: topSignal.signal_label,
          }
        : null,
      heroPattern: null,
      domainPairWinners: [],
      traitTotals: [],
      matchedPatterns: [],
      domainHighlights: topSignal
        ? [
            {
              domainKey: payload.metadata.domainKey,
              domainLabel: payload.metadata.domainKey,
              primarySignalKey: topSignal.signal_key,
              primarySignalLabel: topSignal.signal_label,
              summary: payload.pairSummary.pair_strength_paragraph,
            },
          ]
        : [],
    },
    domains: [],
    actions: {
      strengths: Object.freeze(
        payload.application.strengths.map((item) => ({
          signalKey: item.signal_key,
          signalLabel: item.signal_label,
          text: item.statement,
        })),
      ),
      watchouts: Object.freeze(
        payload.application.watchouts.map((item) => ({
          signalKey: item.signal_key,
          signalLabel: item.signal_label,
          text: item.statement,
        })),
      ),
      developmentFocus: Object.freeze(
        payload.application.developmentFocus.map((item) => ({
          signalKey: item.signal_key,
          signalLabel: item.signal_label,
          text: item.statement,
        })),
      ),
    },
    application: createCompatibilityApplicationSection(),
    diagnostics: createCompatibilityDiagnostics(payload),
  };
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

function toDomainSummaries(
  payload: CanonicalResultPayload,
): readonly AssessmentResultDomainViewModel[] {
  return Object.freeze(
    payload.domains.map((domain) => {
      const signalScores: AssessmentResultSignalScoreViewModel[] = domain.signalBalance.items.map(
        (signal) => ({
          signalId: signal.signalKey,
          signalKey: signal.signalKey,
          signalTitle: signal.signalLabel,
          domainId: domain.domainKey,
          domainKey: domain.domainKey,
          domainSource:
            domain.signalBalance.items.length > 0
              ? ('signal_group' as const)
              : ('question_section' as const),
          isOverlay: false,
          overlayType: 'none',
          rawTotal: signal.withinDomainPercent,
          normalizedValue: signal.withinDomainPercent,
          percentage: signal.withinDomainPercent,
          domainPercentage: signal.withinDomainPercent,
          rank: signal.rank,
        }),
      );

      return {
        domainId: domain.domainKey,
        domainKey: domain.domainKey,
        domainTitle: domain.domainLabel,
        domainSource:
          signalScores.length > 0 ? ('signal_group' as const) : ('question_section' as const),
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
              primaryPercent: domain.primarySignal?.signalKey
                ? (signalScores.find(
                    (signal) => signal.signalKey === domain.primarySignal?.signalKey,
                  )?.domainPercentage ?? null)
                : null,
              secondarySignalKey: domain.secondarySignal?.signalKey ?? null,
              secondaryPercent: domain.secondarySignal?.signalKey
                ? (signalScores.find(
                    (signal) => signal.signalKey === domain.secondarySignal?.signalKey,
                  )?.domainPercentage ?? null)
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

function toRankedSignals(
  payload: CanonicalResultPayload,
): readonly AssessmentResultRankedSignalViewModel[] {
  return Object.freeze(
    payload.domains.flatMap((domain) =>
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
    ),
  );
}

function toTopSignal(payload: CanonicalResultPayload): AssessmentResultTopSignalViewModel | null {
  const primaryPattern = payload.hero.primaryPattern;
  if (!primaryPattern?.signalKey) {
    return null;
  }

  const rankedSignals = toRankedSignals(payload);
  const signal =
    rankedSignals.find((entry) => entry.signalKey === primaryPattern.signalKey) ?? rankedSignals[0];
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

function toSingleDomainTopSignal(
  payload: SingleDomainResultPayload,
): AssessmentResultTopSignalViewModel | null {
  const signal = payload.signals[0];
  if (!signal) {
    return null;
  }

  return {
    signalId: signal.signal_key,
    signalKey: signal.signal_key,
    title: signal.signal_label,
    domainId: payload.metadata.domainKey,
    domainKey: payload.metadata.domainKey,
    normalizedValue: signal.normalized_score,
    rawTotal: signal.raw_score,
    percentage: signal.normalized_score,
    rank: 1,
  };
}

function toSingleDomainRankedSignals(
  payload: SingleDomainResultPayload,
): readonly AssessmentResultRankedSignalViewModel[] {
  return Object.freeze(
    payload.signals.map((signal) => ({
      signalId: signal.signal_key,
      signalKey: signal.signal_key,
      title: signal.signal_label,
      domainId: payload.metadata.domainKey,
      domainKey: payload.metadata.domainKey,
      normalizedValue: signal.normalized_score,
      rawTotal: signal.raw_score,
      percentage: signal.normalized_score,
      domainPercentage: signal.normalized_score,
      isOverlay: false,
      overlayType: 'none' as const,
      rank: signal.rank,
    })),
  );
}

function toListItem(record: PersistedReadyResultRecord): AssessmentResultListItem {
  const parsed = parseCanonicalPayload(record);
  const topSignal =
    parsed.mode === 'single_domain'
      ? toSingleDomainTopSignal(parsed.payload)
      : toTopSignal(parsed.payload as CanonicalResultPayload);
  const signalSnapshot =
    parsed.mode === 'single_domain'
      ? toSingleDomainRankedSignals(parsed.payload)
      : toRankedSignals(parsed.payload as CanonicalResultPayload);

  return {
    resultId: record.resultId,
    attemptId: record.attemptId,
    assessmentId: record.assessmentId,
    assessmentKey: record.assessmentKey,
    mode: parsed.mode,
    assessmentTitle: record.assessmentTitle,
    version: record.version,
    readinessStatus: 'ready',
    createdAt: record.createdAt,
    generatedAt: record.generatedAt,
    topSignal,
    topSignalPercentage: topSignal?.percentage ?? null,
    signalSnapshot: Object.freeze(signalSnapshot.slice(0, 4)),
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
  const parsed = parseCanonicalPayload(record);
  const payload =
    parsed.mode === 'single_domain'
      ? createCompatibilityPayload(parsed.payload)
      : (parsed.payload as CanonicalResultPayload);
  const rankedSignals = toRankedSignals(payload);
  const domainSummaries = toDomainSummaries(payload);
  const topSignal = toTopSignal(payload);
  const normalizedScores = Object.freeze(domainSummaries.flatMap((domain) => domain.signalScores));

  return {
    resultId: record.resultId,
    attemptId: record.attemptId,
    assessmentId: record.assessmentId,
    assessmentKey: record.assessmentKey,
    mode: parsed.mode,
    assessmentTitle: record.assessmentTitle,
    version: record.version,
    metadata: payload.metadata,
    intro: payload.intro,
    hero: payload.hero,
    domains: payload.domains,
    actions: payload.actions,
    application: payload.application ?? null,
    hasApplicationPlan: parsed.hasApplicationPlan,
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
    singleDomainResult: parsed.singleDomainResult,
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
