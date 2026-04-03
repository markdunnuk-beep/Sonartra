import type {
  CanonicalResultPayload,
  EngineLanguageBundle,
  NormalizedDomainSummary,
  NormalizedResult,
  NormalizedSignalScore,
  ResultActionBlockItem,
  ResultActionBlocks,
  ResultDomainChapter,
  ResultDomainSignal,
  ResultInterpretationContext,
  ResultDomainSummary,
  ResultDiagnostics,
  ResultHeroSummary,
  ResultIntro,
  ResultMetadata,
  ResultRankedSignal,
  ResultTopSignal,
  ScoreDiagnostics,
} from '@/lib/engine/types';
import { sortDomainSignalsForDisplay } from '@/lib/engine/domain-signal-ranking';
import { buildDomainInterpretation } from '@/lib/engine/domain-interpretation';
import {
  buildDevelopmentFocus,
  buildOverviewSummary,
  buildStrengths,
  buildWatchouts,
} from '@/lib/engine/result-interpretation';
import { canonicalizeSignalPairKey } from '@/lib/admin/pair-language-import';
import type {
  AssessmentVersionLanguageDomainSection,
} from '@/lib/server/assessment-version-language-types';

export type CanonicalResultBuilderInput = NormalizedResult & {
  assessmentVersionId: string;
  metadata: ResultMetadata;
  scoringDiagnostics: ScoreDiagnostics;
  languageBundle: EngineLanguageBundle;
};

export function createResultInterpretationContext(
  input: Pick<CanonicalResultBuilderInput, 'assessmentVersionId' | 'languageBundle'>,
): ResultInterpretationContext {
  return {
    assessmentVersionId: input.assessmentVersionId,
    languageBundle: input.languageBundle,
  };
}

function getTopSignalsInRankOrder(signalScores: readonly NormalizedSignalScore[]): readonly NormalizedSignalScore[] {
  return [...signalScores].sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    if (right.percentage !== left.percentage) {
      return right.percentage - left.percentage;
    }

    if (right.rawTotal !== left.rawTotal) {
      return right.rawTotal - left.rawTotal;
    }

    if (left.signalKey !== right.signalKey) {
      return left.signalKey.localeCompare(right.signalKey);
    }

    return left.signalId.localeCompare(right.signalId);
  });
}

export function buildTopSignal(normalizedResult: NormalizedResult): ResultTopSignal | null {
  if (!normalizedResult.topSignalId) {
    return null;
  }

  const topSignal = normalizedResult.signalScores.find((signalScore) => signalScore.signalId === normalizedResult.topSignalId);
  if (!topSignal) {
    return null;
  }

  return {
    signalId: topSignal.signalId,
    signalKey: topSignal.signalKey,
    title: topSignal.signalTitle,
    domainId: topSignal.domainId,
    domainKey: topSignal.domainKey,
    normalizedValue: topSignal.normalizedValue,
    rawTotal: topSignal.rawTotal,
    percentage: topSignal.percentage,
    rank: 1,
  };
}

export function buildRankedSignals(normalizedResult: NormalizedResult): readonly ResultRankedSignal[] {
  return Object.freeze(
    getTopSignalsInRankOrder(normalizedResult.signalScores).map((signalScore) => ({
      signalId: signalScore.signalId,
      signalKey: signalScore.signalKey,
      title: signalScore.signalTitle,
      domainId: signalScore.domainId,
      domainKey: signalScore.domainKey,
      normalizedValue: signalScore.normalizedValue,
      rawTotal: signalScore.rawTotal,
      percentage: signalScore.percentage,
      domainPercentage: signalScore.domainPercentage,
      isOverlay: signalScore.isOverlay,
      overlayType: signalScore.overlayType,
      rank: signalScore.rank,
    })),
  );
}

export function buildNormalizedScores(normalizedResult: NormalizedResult): readonly NormalizedSignalScore[] {
  return Object.freeze([...normalizedResult.signalScores]);
}

function getSignalLanguageSummary(
  signalKey: string,
  context: ResultInterpretationContext,
): string | null {
  return context.languageBundle.signals[signalKey]?.summary ?? null;
}

function getSignalLanguageStrength(
  signalKey: string,
  context: ResultInterpretationContext,
): string | null {
  return context.languageBundle.signals[signalKey]?.strength ?? null;
}

function getSignalLanguageWatchout(
  signalKey: string,
  context: ResultInterpretationContext,
): string | null {
  return context.languageBundle.signals[signalKey]?.watchout ?? null;
}

function getSignalLanguageDevelopment(
  signalKey: string,
  context: ResultInterpretationContext,
): string | null {
  return context.languageBundle.signals[signalKey]?.development ?? null;
}

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveDomainLanguageSection(
  domainKey: string,
  section: AssessmentVersionLanguageDomainSection,
  interpretationContext: ResultInterpretationContext,
): string | null {
  return trimToNull(interpretationContext.languageBundle.domains[domainKey]?.[section]);
}

function resolveSignalLanguageBundle(
  signalKey: string,
  interpretationContext: ResultInterpretationContext,
): {
  summary: string | null;
  strength: string | null;
  watchout: string | null;
  development: string | null;
} {
  return {
    summary: getSignalLanguageSummary(signalKey, interpretationContext),
    strength: getSignalLanguageStrength(signalKey, interpretationContext),
    watchout: getSignalLanguageWatchout(signalKey, interpretationContext),
    development: getSignalLanguageDevelopment(signalKey, interpretationContext),
  };
}

function getSignalPairLookupToken(signalKey: string): string {
  const segments = signalKey.split('_').filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? signalKey;
}

function buildCanonicalSignalPairKey(
  primarySignalKey: string,
  secondarySignalKey: string,
): string | null {
  const canonicalPair = canonicalizeSignalPairKey(
    `${getSignalPairLookupToken(primarySignalKey)}_${getSignalPairLookupToken(secondarySignalKey)}`,
  );

  return canonicalPair.success ? canonicalPair.canonicalSignalPair : null;
}

function selectPrimaryAndSecondaryDomainSignals(
  signalScores: readonly NormalizedSignalScore[],
): {
  primarySignal: NormalizedSignalScore | null;
  secondarySignal: NormalizedSignalScore | null;
} {
  return {
    primarySignal: signalScores[0] ?? null,
    secondarySignal: signalScores[1] ?? null,
  };
}

function assertDomainSignalOrdering(domainSummary: ResultDomainSummary): void {
  const sortedSignalScores = sortDomainSignalsForDisplay(domainSummary.signalScores);

  for (let index = 0; index < sortedSignalScores.length; index += 1) {
    const persistedSignal = domainSummary.signalScores[index];
    const expectedSignal = sortedSignalScores[index];

    if (!persistedSignal || !expectedSignal) {
      throw new Error(`Domain ${domainSummary.domainKey} has incomplete signal ordering.`);
    }

    if (persistedSignal.signalId !== expectedSignal.signalId) {
      throw new Error(
        `Domain ${domainSummary.domainKey} signalScores are not persisted in canonical descending order.`,
      );
    }
  }

  const primarySignal = domainSummary.signalScores[0] ?? null;
  const secondarySignal = domainSummary.signalScores[1] ?? null;
  const interpretation = domainSummary.interpretation;

  if (!interpretation) {
    return;
  }

  if (interpretation.primarySignalKey !== (primarySignal?.signalKey ?? null)) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation primary signal does not match persisted ordering.`,
    );
  }

  if (interpretation.primaryPercent !== (primarySignal?.domainPercentage ?? null)) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation primary percent does not match persisted ordering.`,
    );
  }

  if (interpretation.secondarySignalKey !== (secondarySignal?.signalKey ?? null)) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation secondary signal does not match persisted ordering.`,
    );
  }

  if (interpretation.secondaryPercent !== (secondarySignal?.domainPercentage ?? null)) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation secondary percent does not match persisted ordering.`,
    );
  }

  if (
    interpretation.primaryPercent !== null &&
    interpretation.secondaryPercent !== null &&
    interpretation.primaryPercent < interpretation.secondaryPercent
  ) {
    throw new Error(
      `Domain ${domainSummary.domainKey} interpretation primary percent cannot be lower than secondary percent.`,
    );
  }
}

export function buildDomainSummaries(
  normalizedResult: NormalizedResult,
  interpretationContext: ResultInterpretationContext,
): readonly ResultDomainSummary[] {
  const domainSummaries = normalizedResult.domainSummaries.map((domainSummary) => {
    const sortedSignalScores = Object.freeze(sortDomainSignalsForDisplay(domainSummary.signalScores));
    const rankedSignalIds = Object.freeze(sortedSignalScores.map((signalScore) => signalScore.signalId));
    const canonicalDomainSummary: NormalizedDomainSummary = {
      ...domainSummary,
      signalScores: sortedSignalScores,
      rankedSignalIds,
    };
    const persistedDomainSummary = {
      ...canonicalDomainSummary,
      interpretation: buildDomainInterpretation(canonicalDomainSummary, interpretationContext),
    } satisfies ResultDomainSummary;

    assertDomainSignalOrdering(persistedDomainSummary);

    return persistedDomainSummary;
  });

  return Object.freeze(domainSummaries);
}

export function buildIntro(metadata: ResultMetadata): ResultIntro {
  return {
    assessmentDescription: metadata.assessmentDescription ?? null,
  };
}

function buildDomainSignal(
  signalScore: NormalizedSignalScore,
  index: number,
): ResultDomainSignal {
  return {
    signalKey: signalScore.signalKey,
    signalLabel: signalScore.signalTitle,
    score: signalScore.percentage,
    withinDomainPercent: signalScore.domainPercentage,
    rank: signalScore.rank,
    isPrimary: index === 0,
    isSecondary: index === 1,
  };
}

function buildDomainChapterSignal(
  signalScore: NormalizedSignalScore | null,
  interpretationContext: ResultInterpretationContext,
): ResultDomainChapter['primarySignal'] {
  if (!signalScore) {
    return null;
  }

  const language = resolveSignalLanguageBundle(signalScore.signalKey, interpretationContext);

  return {
    signalKey: signalScore.signalKey,
    signalLabel: signalScore.signalTitle,
    summary: language.summary,
    strength: language.strength,
    watchout: language.watchout,
    development: language.development,
  };
}

export function buildHero(params: {
  normalizedResult: CanonicalResultBuilderInput;
  domainSummaries: readonly ResultDomainSummary[];
  interpretationContext: ResultInterpretationContext;
}): ResultHeroSummary {
  const overviewSummary = buildOverviewSummary(params.normalizedResult, params.interpretationContext);
  const topSignal = getTopSignalsInRankOrder(params.normalizedResult.signalScores)[0] ?? null;
  const domainHighlights = params.domainSummaries.flatMap((domainSummary) => {
    const primarySignal = domainSummary.signalScores[0];

    if (!primarySignal) {
      return [];
    }

    return [
      {
        domainKey: domainSummary.domainKey,
        domainLabel: domainSummary.domainTitle,
        primarySignalKey: primarySignal.signalKey,
        primarySignalLabel: primarySignal.signalTitle,
        summary: getSignalLanguageSummary(primarySignal.signalKey, params.interpretationContext),
      },
    ];
  });

  return {
    headline: overviewSummary.headline || null,
    narrative: overviewSummary.narrative || null,
    primaryPattern: topSignal
      ? {
          label: topSignal.signalTitle,
          signalKey: topSignal.signalKey,
          signalLabel: topSignal.signalTitle,
        }
      : null,
    domainHighlights,
  };
}

export function buildDomains(
  domainSummaries: readonly ResultDomainSummary[],
  interpretationContext: ResultInterpretationContext,
): ResultDomainChapter[] {
  return domainSummaries.map((domainSummary) => {
    const { primarySignal, secondarySignal } = selectPrimaryAndSecondaryDomainSignals(domainSummary.signalScores);
    const pairKey =
      primarySignal && secondarySignal
        ? buildCanonicalSignalPairKey(primarySignal.signalKey, secondarySignal.signalKey)
        : null;
    const pairText = pairKey
      ? trimToNull(interpretationContext.languageBundle.pairs[pairKey]?.summary)
      : null;

    return {
      domainKey: domainSummary.domainKey,
      domainLabel: domainSummary.domainTitle,
      summary: domainSummary.interpretation?.summary ?? null,
      focus: resolveDomainLanguageSection(domainSummary.domainKey, 'focus', interpretationContext),
      pressure: resolveDomainLanguageSection(domainSummary.domainKey, 'pressure', interpretationContext),
      environment: resolveDomainLanguageSection(domainSummary.domainKey, 'environment', interpretationContext),
      primarySignal: buildDomainChapterSignal(primarySignal, interpretationContext),
      secondarySignal: buildDomainChapterSignal(secondarySignal, interpretationContext),
      pairSummary: pairKey
        ? {
            pairKey,
            text: pairText,
          }
        : null,
      signals: domainSummary.signalScores.map((signalScore, index) => buildDomainSignal(signalScore, index)),
    };
  });
}

function mapActionItems(
  items: ReturnType<typeof buildStrengths>,
  normalizedResult: CanonicalResultBuilderInput,
): ResultActionBlockItem[] {
  const signalsById = new Map(normalizedResult.signalScores.map((signalScore) => [signalScore.signalId, signalScore]));

  return items.flatMap((item) => {
    if (!item.signalId) {
      return [];
    }

    const signalScore = signalsById.get(item.signalId);
    if (!signalScore) {
      return [];
    }

    return [
      {
        signalKey: signalScore.signalKey,
        signalLabel: signalScore.signalTitle,
        text: item.detail,
      },
    ];
  });
}

export function buildActions(
  normalizedResult: CanonicalResultBuilderInput,
  interpretationContext: ResultInterpretationContext,
): ResultActionBlocks {
  return {
    strengths: mapActionItems(buildStrengths(normalizedResult, interpretationContext), normalizedResult),
    watchouts: mapActionItems(buildWatchouts(normalizedResult, interpretationContext), normalizedResult),
    developmentFocus: mapActionItems(buildDevelopmentFocus(normalizedResult, interpretationContext), normalizedResult),
  };
}

export function buildDiagnostics(params: {
  normalizedResult: NormalizedResult;
  scoringDiagnostics: ScoreDiagnostics;
}): ResultDiagnostics {
  const warnings = Object.freeze(
    Array.from(
      new Set([
        ...params.scoringDiagnostics.warnings,
        ...params.normalizedResult.diagnostics.warnings,
      ]),
    ),
  );

  return {
    readinessStatus: 'processing',
    scoring: params.scoringDiagnostics,
    normalization: params.normalizedResult.diagnostics,
    answeredQuestionCount: params.scoringDiagnostics.answeredQuestions,
    totalQuestionCount: params.scoringDiagnostics.totalQuestions,
    missingQuestionIds: Object.freeze([]),
    topSignalSelectionBasis: 'normalized_rank',
    rankedSignalCount: params.normalizedResult.signalScores.length,
    domainCount: params.normalizedResult.domainSummaries.length,
    zeroMass: params.normalizedResult.diagnostics.zeroMass,
    zeroMassTopSignalFallbackApplied:
      params.normalizedResult.diagnostics.zeroMass && params.normalizedResult.topSignalId !== null,
    warnings,
    generatedAt: params.normalizedResult.diagnostics.generatedAt,
  };
}

export function buildPayload(params: {
  normalizedResult: CanonicalResultBuilderInput;
}): CanonicalResultPayload {
  const interpretationContext = createResultInterpretationContext(params.normalizedResult);
  const domainSummaries = buildDomainSummaries(params.normalizedResult, interpretationContext);

  return Object.freeze({
    metadata: {
      ...params.normalizedResult.metadata,
      assessmentDescription: params.normalizedResult.metadata.assessmentDescription ?? null,
    },
    intro: buildIntro(params.normalizedResult.metadata),
    hero: buildHero({
      normalizedResult: params.normalizedResult,
      domainSummaries,
      interpretationContext,
    }),
    domains: buildDomains(domainSummaries, interpretationContext),
    actions: buildActions(params.normalizedResult, interpretationContext),
    diagnostics: buildDiagnostics({
      normalizedResult: params.normalizedResult,
      scoringDiagnostics: params.normalizedResult.scoringDiagnostics,
    }),
  });
}
