import type {
  ApplicationSection,
  CanonicalResultPayload,
  EngineLanguageBundle,
  HeroTraitKey,
  NormalizedDomainSummary,
  NormalizedResult,
  NormalizedSignalScore,
  ResultActionBlockItem,
  ResultActionBlocks,
  ResultDomainChapter,
  ResultDomainChapterSignal,
  ResultDomainSignalBalanceItem,
  ResultInterpretationContext,
  ResultDomainSummary,
  ResultDiagnostics,
  ResultHeroSummary,
  ResultIntro,
  ResultMetadata,
  ResultRankedSignal,
  ResultTopSignal,
  RuntimeAssessmentDefinition,
  ScoreDiagnostics,
} from '@/lib/engine/types';
import { buildApplicationSection } from '@/lib/engine/application-builder';
import { sortDomainSignalsForDisplay } from '@/lib/engine/domain-signal-ranking';
import { resolvePairLanguageSection as resolvePairLanguageSectionFromBundle } from '@/lib/engine/pair-language';
import {
  buildDomainInterpretation,
  buildDomainPairInterpretationSummary,
} from '@/lib/engine/domain-interpretation';
import {
  buildDevelopmentFocus,
  buildOverviewSummary,
  buildStrengths,
  buildWatchouts,
} from '@/lib/engine/result-interpretation';
import { evaluateHeroPattern, getHeroPatternLabel } from '@/lib/engine/hero';
import type {
  AssessmentVersionLanguageDomainSection,
  AssessmentVersionLanguagePairSection,
} from '@/lib/server/assessment-version-language-types';

export type CanonicalResultBuilderInput = NormalizedResult & {
  assessmentVersionId: string;
  metadata: ResultMetadata;
  scoringDiagnostics: ScoreDiagnostics;
  languageBundle: EngineLanguageBundle;
  heroDefinition?: RuntimeAssessmentDefinition['heroDefinition'];
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

function getSignalLanguageChapterSummary(
  signalKey: string,
  context: ResultInterpretationContext,
): string | null {
  return context.languageBundle.signals[signalKey]?.chapterSummary ?? null;
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

function resolvePairLanguageSection(
  pairKey: string | null,
  section: AssessmentVersionLanguagePairSection,
  interpretationContext: ResultInterpretationContext,
): string | null {
  return resolvePairLanguageSectionFromBundle({
    pairKey,
    section,
    languageBundle: interpretationContext.languageBundle,
  });
}

function resolveSignalLanguageBundle(
  signalKey: string,
  interpretationContext: ResultInterpretationContext,
): {
  chapterSummary: string | null;
  strength: string | null;
  watchout: string | null;
  development: string | null;
} {
  return {
    chapterSummary: getSignalLanguageChapterSummary(signalKey, interpretationContext),
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
  const primaryToken = getSignalPairLookupToken(primarySignalKey);
  const secondaryToken = getSignalPairLookupToken(secondarySignalKey);

  if (!primaryToken || !secondaryToken || primaryToken === secondaryToken) {
    return null;
  }

  return [primaryToken, secondaryToken].sort((left, right) => left.localeCompare(right)).join('_');
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

function buildDomainSignalBalanceItem(
  signalScore: NormalizedSignalScore,
  index: number,
  interpretationContext: ResultInterpretationContext,
): ResultDomainSignalBalanceItem {
  const language = resolveSignalLanguageBundle(signalScore.signalKey, interpretationContext);
  const rankWithinDomain = index + 1;

  return {
    signalKey: signalScore.signalKey,
    signalLabel: signalScore.signalTitle,
    withinDomainPercent: signalScore.domainPercentage,
    rank: rankWithinDomain,
    isPrimary: rankWithinDomain === 1,
    isSecondary: rankWithinDomain === 2,
    chapterSummary: language.chapterSummary,
  };
}

function buildDomainChapterSignal(
  signalScore: NormalizedSignalScore | null,
  interpretationContext: ResultInterpretationContext,
): ResultDomainChapterSignal | null {
  if (!signalScore) {
    return null;
  }

  const language = resolveSignalLanguageBundle(signalScore.signalKey, interpretationContext);

  return {
    signalKey: signalScore.signalKey,
    signalLabel: signalScore.signalTitle,
    chapterSummary: language.chapterSummary,
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
        summary: getSignalLanguageChapterSummary(primarySignal.signalKey, params.interpretationContext),
      },
    ];
  });

  const heroEvaluation = params.normalizedResult.heroDefinition
    ? evaluateHeroPattern({
        heroDefinition: params.normalizedResult.heroDefinition,
        domainSummaries: params.domainSummaries,
      })
    : null;
  const overviewSummary = heroEvaluation
    ? {
        headline: heroEvaluation.headline,
        narrative: heroEvaluation.narrative,
      }
    : buildOverviewSummary(params.normalizedResult, params.interpretationContext);

  return {
    headline: overviewSummary.headline || null,
    subheadline: heroEvaluation?.subheadline ?? null,
    summary: heroEvaluation?.summary ?? null,
    narrative: overviewSummary.narrative || null,
    pressureOverlay: heroEvaluation?.pressureOverlay ?? null,
    environmentOverlay: heroEvaluation?.environmentOverlay ?? null,
    primaryPattern: topSignal
      ? {
          label: topSignal.signalTitle,
          signalKey: topSignal.signalKey,
          signalLabel: topSignal.signalTitle,
        }
      : null,
    heroPattern: heroEvaluation
      ? {
          patternKey: heroEvaluation.patternKey,
          label: getHeroPatternLabel(heroEvaluation.patternKey),
          priority: heroEvaluation.priority,
          isFallback: heroEvaluation.isFallback,
        }
      : null,
    domainPairWinners: heroEvaluation ? [...heroEvaluation.domainPairWinners] : [],
    traitTotals: heroEvaluation
      ? Object.entries(heroEvaluation.traitTotals)
          .map(([traitKey, value]) => ({ traitKey: traitKey as HeroTraitKey, value }))
          .sort((left, right) => right.value - left.value || left.traitKey.localeCompare(right.traitKey))
      : [],
    matchedPatterns: heroEvaluation ? [...heroEvaluation.matchedPatterns] : [],
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
    const pairSummary =
      resolvePairLanguageSection(pairKey, 'chapterSummary', interpretationContext)
      ?? buildDomainPairInterpretationSummary(domainSummary);

    return {
      domainKey: domainSummary.domainKey,
      domainLabel: domainSummary.domainTitle,
      chapterOpening: resolveDomainLanguageSection(domainSummary.domainKey, 'chapterOpening', interpretationContext),
      signalBalance: {
        items: domainSummary.signalScores.map((signalScore, index) =>
          buildDomainSignalBalanceItem(signalScore, index, interpretationContext),
        ),
      },
      primarySignal: buildDomainChapterSignal(primarySignal, interpretationContext),
      secondarySignal: buildDomainChapterSignal(secondarySignal, interpretationContext),
      signalPair: pairKey && primarySignal && secondarySignal
        ? {
          pairKey,
          primarySignalKey: primarySignal.signalKey,
          primarySignalLabel: primarySignal.signalTitle,
          secondarySignalKey: secondarySignal.signalKey,
          secondarySignalLabel: secondarySignal.signalTitle,
          summary: pairSummary,
        }
        : null,
      pressureFocus: resolvePairLanguageSection(pairKey, 'pressureFocus', interpretationContext),
      environmentFocus: resolvePairLanguageSection(pairKey, 'environmentFocus', interpretationContext),
    };
  });
}

function mapAttributedActionItems(
  items: readonly {
    signalId?: string;
    detail: string;
  }[],
  normalizedResult: CanonicalResultBuilderInput,
): ResultActionBlockItem[] {
  const signalsById = new Map(normalizedResult.signalScores.map((signalScore) => [signalScore.signalId, signalScore]));

  return items.flatMap((item) => {
    if (!item.signalId) {
      // Structured action items require reliable signal provenance.
      // Deterministic rule-only lines are excluded rather than assigned ambiguously.
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
    strengths: mapAttributedActionItems(buildStrengths(normalizedResult, interpretationContext), normalizedResult),
    watchouts: mapAttributedActionItems(buildWatchouts(normalizedResult, interpretationContext), normalizedResult),
    developmentFocus: mapAttributedActionItems(buildDevelopmentFocus(normalizedResult, interpretationContext), normalizedResult),
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
  const hero = buildHero({
    normalizedResult: params.normalizedResult,
    domainSummaries,
    interpretationContext,
  });
  const domains = buildDomains(domainSummaries, interpretationContext);
  const application: ApplicationSection = buildApplicationSection({
    hero,
    domains,
    signals: params.normalizedResult.signalScores,
    language: params.normalizedResult.languageBundle.application,
  });

  return Object.freeze({
    metadata: {
      ...params.normalizedResult.metadata,
      assessmentDescription: params.normalizedResult.metadata.assessmentDescription ?? null,
    },
    intro: buildIntro(params.normalizedResult.metadata),
    hero,
    domains,
    actions: buildActions(params.normalizedResult, interpretationContext),
    application,
    diagnostics: buildDiagnostics({
      normalizedResult: params.normalizedResult,
      scoringDiagnostics: params.normalizedResult.scoringDiagnostics,
    }),
  });
}
