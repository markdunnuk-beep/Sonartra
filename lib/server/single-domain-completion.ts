import { loadRuntimeExecutionModel } from '@/lib/engine/runtime-loader';
import { normalizeScoreResult } from '@/lib/engine/normalization';
import { scoreAssessmentResponses } from '@/lib/engine/scoring';
import { resolveSingleDomainPairKey } from '@/lib/assessment-language/single-domain-pair-keys';
import type {
  RuntimeAssessmentDefinition,
  RuntimeResponseSet,
} from '@/lib/engine/types';
import { loadSingleDomainRuntimeDefinition } from '@/lib/server/single-domain-runtime-definition';
import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SignalChaptersRow,
} from '@/lib/types/single-domain-language';
import type {
  SingleDomainApplicationStatement,
  SingleDomainResultApplication,
  SingleDomainResultBalancing,
  SingleDomainResultHero,
  SingleDomainResultIntro,
  SingleDomainResultPairSummary,
  SingleDomainResultPayload,
  SingleDomainResultSignal,
  SingleDomainSignalPosition,
} from '@/lib/types/single-domain-result';
import { isSingleDomainResultPayload } from '@/lib/types/single-domain-result';
import type { Queryable } from '@/lib/engine/repository-sql';

const FALLBACK_VERSION_TIMESTAMP = '1970-01-01T00:00:00.000Z';

class SingleDomainCompletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SingleDomainCompletionError';
  }
}

function toExecutionDefinition(
  runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>,
): RuntimeAssessmentDefinition {
  return {
    assessment: {
      id: runtimeDefinition.metadata.assessmentId,
      key: runtimeDefinition.metadata.assessmentKey,
      mode: 'single_domain',
      title: runtimeDefinition.metadata.assessmentTitle,
      description: runtimeDefinition.metadata.assessmentDescription,
      estimatedTimeMinutes: null,
      createdAt: FALLBACK_VERSION_TIMESTAMP,
      updatedAt: FALLBACK_VERSION_TIMESTAMP,
    },
    version: {
      id: runtimeDefinition.metadata.assessmentVersionId,
      assessmentId: runtimeDefinition.metadata.assessmentId,
      mode: 'single_domain',
      versionTag: runtimeDefinition.metadata.assessmentVersionTag,
      status: 'published',
      isPublished: true,
      publishedAt: null,
      createdAt: FALLBACK_VERSION_TIMESTAMP,
      updatedAt: FALLBACK_VERSION_TIMESTAMP,
    },
    assessmentIntro: null,
    heroDefinition: null,
    domains: [{
      id: runtimeDefinition.domain.id,
      key: runtimeDefinition.domain.key,
      title: runtimeDefinition.domain.title,
      description: runtimeDefinition.domain.description,
      source: 'signal_group',
      orderIndex: runtimeDefinition.domain.orderIndex,
    }],
    signals: runtimeDefinition.signals.map((signal) => ({
      id: signal.id,
      key: signal.key,
      title: signal.title,
      description: signal.description,
      domainId: signal.domainId,
      orderIndex: signal.orderIndex,
      isOverlay: false,
      overlayType: 'none' as const,
    })),
    questions: runtimeDefinition.questions.map((question) => ({
      id: question.id,
      key: question.key,
      prompt: question.prompt,
      description: null,
      domainId: question.domainId,
      orderIndex: question.orderIndex,
      options: question.options.map((option) => ({
        id: option.id,
        key: option.key,
        label: option.label,
        description: option.description,
        questionId: option.questionId,
        orderIndex: option.orderIndex,
        signalWeights: option.signalWeights.map((weight) => ({
          signalId: weight.signalId,
          weight: weight.weight,
          reverseFlag: weight.reverseFlag,
          sourceWeightKey: weight.sourceWeightKey,
        })),
      })),
    })),
  };
}

function requireRow<TRow>(row: TRow | undefined, message: string): TRow {
  if (!row) {
    throw new SingleDomainCompletionError(message);
  }

  return row;
}

function getSignalPosition(rank: number, signalCount: number): SingleDomainSignalPosition {
  if (rank === 1) {
    return 'primary';
  }

  if (rank === 2) {
    return 'secondary';
  }

  if (signalCount >= 4 && rank === signalCount) {
    return 'underplayed';
  }

  return 'supporting';
}

function getPositionLabel(params: {
  row: SignalChaptersRow;
  position: SingleDomainSignalPosition;
}): {
  label: string;
  intro: string;
} {
  switch (params.position) {
    case 'primary':
      return {
        label: firstText(params.row.position_primary_label, 'Primary'),
        intro: firstText(
          params.row.chapter_intro_primary,
          params.row.chapter_how_it_shows_up,
          params.row.chapter_value_outcome,
          params.row.chapter_value_team_effect,
          params.row.chapter_risk_impact,
          params.row.chapter_risk_behaviour,
          params.row.chapter_development,
        ),
      };
    case 'secondary':
      return {
        label: firstText(params.row.position_secondary_label, 'Secondary'),
        intro: firstText(
          params.row.chapter_intro_secondary,
          params.row.chapter_how_it_shows_up,
          params.row.chapter_value_outcome,
          params.row.chapter_value_team_effect,
          params.row.chapter_risk_impact,
          params.row.chapter_risk_behaviour,
          params.row.chapter_development,
        ),
      };
    case 'underplayed':
      return {
        label: firstText(params.row.position_underplayed_label, 'Underplayed'),
        intro: firstText(
          params.row.chapter_intro_underplayed,
          params.row.chapter_risk_impact,
          params.row.chapter_risk_behaviour,
          params.row.chapter_development,
          params.row.chapter_how_it_shows_up,
          params.row.chapter_value_outcome,
          params.row.chapter_value_team_effect,
        ),
      };
    case 'supporting':
    default:
      return {
        label: firstText(params.row.position_supporting_label, 'Supporting'),
        intro: firstText(
          params.row.chapter_intro_supporting,
          params.row.chapter_how_it_shows_up,
          params.row.chapter_value_outcome,
          params.row.chapter_value_team_effect,
          params.row.chapter_risk_impact,
          params.row.chapter_risk_behaviour,
          params.row.chapter_development,
        ),
      };
  }
}

function createPairLanguageMap<TRow extends { pair_key: string }>(
  runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>,
  rows: readonly TRow[],
): ReadonlyMap<string, TRow> {
  const runtimePairKeys = runtimeDefinition.derivedPairs.map((pair) => pair.pairKey);
  const map = new Map<string, TRow>();

  rows.forEach((row) => {
    const resolution = resolveSingleDomainPairKey(runtimePairKeys, row.pair_key);
    map.set(resolution.success ? resolution.canonicalPairKey : row.pair_key, row);
  });

  return map;
}

function createLanguageMaps(runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>) {
  return {
    framingByDomainKey: new Map(
      runtimeDefinition.languageBundle.DOMAIN_FRAMING.map((row) => [row.domain_key, row]),
    ),
    heroByPairKey: createPairLanguageMap(runtimeDefinition, runtimeDefinition.languageBundle.HERO_PAIRS),
    signalChapterBySignalKey: new Map(
      runtimeDefinition.languageBundle.SIGNAL_CHAPTERS.map((row) => [row.signal_key, row]),
    ),
    balancingByPairKey: createPairLanguageMap(
      runtimeDefinition,
      runtimeDefinition.languageBundle.BALANCING_SECTIONS,
    ),
    pairSummaryByPairKey: createPairLanguageMap(
      runtimeDefinition,
      runtimeDefinition.languageBundle.PAIR_SUMMARIES,
    ),
    applicationBySignalKey: new Map(
      runtimeDefinition.languageBundle.APPLICATION_STATEMENTS.map((row) => [row.signal_key, row]),
    ),
  };
}

function deriveTopPairKey(params: {
  topSignalKey: string;
  secondSignalKey: string;
  runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>;
}): string {
  const pair = params.runtimeDefinition.derivedPairs.find((candidate) => (
    (candidate.leftSignalKey === params.topSignalKey && candidate.rightSignalKey === params.secondSignalKey)
    || (candidate.leftSignalKey === params.secondSignalKey && candidate.rightSignalKey === params.topSignalKey)
  ));

  if (!pair) {
    throw new SingleDomainCompletionError(
      `Unable to derive a canonical pair key for "${params.topSignalKey}" and "${params.secondSignalKey}".`,
    );
  }

  return pair.pairKey;
}

function toIntro(row: DomainFramingRow): SingleDomainResultIntro {
  return {
    section_title: row.section_title,
    intro_paragraph: row.intro_paragraph,
    meaning_paragraph: row.meaning_paragraph,
    bridge_to_signals: row.bridge_to_signals,
    blueprint_context_line: row.blueprint_context_line,
  };
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function compactText(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, ' ');
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function firstText(...values: Array<string | null | undefined>): string {
  return values.find(hasText)?.trim() ?? '';
}

function requireText(value: string, message: string): string {
  if (hasText(value)) {
    return value.trim();
  }

  throw new SingleDomainCompletionError(message);
}

function buildSignalChapterPayload(params: {
  row: SignalChaptersRow;
  signalKey: string;
  signalLabel: string;
  rank: number;
  normalizedScore: number;
  rawScore: number;
  position: SingleDomainSignalPosition;
}): SingleDomainResultSignal {
  const positionLanguage = getPositionLabel({
    row: params.row,
    position: params.position,
  });
  const chapterIntro = requireText(
    positionLanguage.intro,
    `Missing usable signal chapter intro language for signal "${params.signalKey}" in position "${params.position}".`,
  );
  const chapterHowItShowsUp = requireText(
    firstText(
      params.row.chapter_how_it_shows_up,
      chapterIntro,
      params.row.chapter_value_outcome,
      params.row.chapter_value_team_effect,
    ),
    `Missing usable signal chapter behaviour language for signal "${params.signalKey}".`,
  );
  const chapterValueOutcome = requireText(
    firstText(
      params.row.chapter_value_outcome,
      params.row.chapter_value_team_effect,
      chapterIntro,
      chapterHowItShowsUp,
    ),
    `Missing usable signal chapter outcome language for signal "${params.signalKey}".`,
  );
  const chapterValueTeamEffect = requireText(
    firstText(
      params.row.chapter_value_team_effect,
      params.row.chapter_value_outcome,
      chapterIntro,
      chapterHowItShowsUp,
    ),
    `Missing usable signal chapter team-effect language for signal "${params.signalKey}".`,
  );
  const chapterRiskBehaviour = requireText(
    firstText(
      params.row.chapter_risk_behaviour,
      params.row.chapter_risk_impact,
      params.row.chapter_development,
      chapterIntro,
      chapterHowItShowsUp,
    ),
    `Missing usable signal chapter risk behaviour language for signal "${params.signalKey}".`,
  );
  const chapterRiskImpact = requireText(
    firstText(
      params.row.chapter_risk_impact,
      params.row.chapter_risk_behaviour,
      params.row.chapter_development,
      chapterRiskBehaviour,
      chapterIntro,
    ),
    `Missing usable signal chapter risk impact language for signal "${params.signalKey}".`,
  );
  const chapterDevelopment = requireText(
    firstText(
      params.row.chapter_development,
      params.row.chapter_risk_impact,
      params.row.chapter_risk_behaviour,
      chapterRiskImpact,
      chapterIntro,
    ),
    `Missing usable signal chapter development language for signal "${params.signalKey}".`,
  );

  return Object.freeze({
    signal_key: params.signalKey,
    signal_label: params.signalLabel,
    rank: params.rank,
    normalized_score: params.normalizedScore,
    raw_score: params.rawScore,
    position: params.position,
    position_label: requireText(
      positionLanguage.label,
      `Missing position label for signal "${params.signalKey}" in position "${params.position}".`,
    ),
    chapter_intro: chapterIntro,
    chapter_how_it_shows_up: chapterHowItShowsUp,
    chapter_value_outcome: chapterValueOutcome,
    chapter_value_team_effect: chapterValueTeamEffect,
    chapter_risk_behaviour: chapterRiskBehaviour,
    chapter_risk_impact: chapterRiskImpact,
    chapter_development: chapterDevelopment,
  } satisfies SingleDomainResultSignal);
}

function getSignalByKey(
  signals: readonly SingleDomainResultSignal[],
  signalKey: string,
): SingleDomainResultSignal | null {
  return signals.find((signal) => signal.signal_key === signalKey) ?? null;
}

function getPairSignals(params: {
  pairKey: string;
  signals: readonly SingleDomainResultSignal[];
}): {
  primary: SingleDomainResultSignal;
  secondary: SingleDomainResultSignal;
  weaker: SingleDomainResultSignal;
} {
  const [leftSignalKey, rightSignalKey] = params.pairKey.split('_');
  const sortedSignals = [...params.signals].sort((left, right) => left.rank - right.rank);
  const pairSignals = [leftSignalKey, rightSignalKey]
    .map((signalKey) => signalKey ? getSignalByKey(params.signals, signalKey) : null)
    .filter((signal): signal is SingleDomainResultSignal => Boolean(signal))
    .sort((left, right) => left.rank - right.rank);
  const primary =
    pairSignals[0]
    ?? sortedSignals[0]
    ?? (leftSignalKey ? getSignalByKey(params.signals, leftSignalKey) : null);
  const secondary =
    pairSignals.find((signal) => signal.signal_key !== primary?.signal_key)
    ?? sortedSignals.find((signal) => signal.signal_key !== primary?.signal_key)
    ?? (rightSignalKey ? getSignalByKey(params.signals, rightSignalKey) : null)
    ?? sortedSignals.find((signal) => signal.signal_key !== primary?.signal_key);
  const weaker =
    sortedSignals.find((signal) => signal.position === 'underplayed')
    ?? sortedSignals[sortedSignals.length - 1];

  if (!primary || !secondary || !weaker) {
    throw new SingleDomainCompletionError(
      `Unable to build fallback language for pair "${params.pairKey}".`,
    );
  }

  return { primary, secondary, weaker };
}

function pairLanguageReferencesSignals(params: {
  pairKey: string;
  rowText: string;
  primary: SingleDomainResultSignal;
  secondary: SingleDomainResultSignal;
}): boolean {
  const normalized = compactText(params.rowText);
  const pairKeyToken = compactText(params.pairKey);
  const reversedPairKeyToken = compactText(params.pairKey.split('_').reverse().join('_'));
  const primaryTokens = [
    params.primary.signal_key,
    params.primary.signal_label,
  ].map(compactText).filter(Boolean);
  const secondaryTokens = [
    params.secondary.signal_key,
    params.secondary.signal_label,
  ].map(compactText).filter(Boolean);

  if (normalized.includes(pairKeyToken) || normalized.includes(reversedPairKeyToken)) {
    return true;
  }

  return primaryTokens.some((token) => normalized.includes(token))
    && secondaryTokens.some((token) => normalized.includes(token));
}

function warnPairFallback(section: 'hero' | 'pair' | 'limitation', pairKey: string): void {
  if (process.env.SONARTRA_DEBUG_SINGLE_DOMAIN_FALLBACK !== 'true') {
    return;
  }

  console.warn(`[single-domain] ${section} fallback language used for pair_key="${pairKey}".`);
}

function toHero(row: HeroPairsRow, pairKey: string): SingleDomainResultHero {
  return {
    pair_key: pairKey,
    hero_headline: row.hero_headline,
    hero_subheadline: row.hero_subheadline,
    hero_opening: row.hero_opening,
    hero_strength_paragraph: row.hero_strength_paragraph,
    hero_tension_paragraph: row.hero_tension_paragraph,
    hero_close_paragraph: row.hero_close_paragraph,
  };
}

function toHeroFallback(params: {
  pairKey: string;
  primary: SingleDomainResultSignal;
  secondary: SingleDomainResultSignal;
}): SingleDomainResultHero {
  warnPairFallback('hero', params.pairKey);

  return {
    pair_key: params.pairKey,
    hero_headline: `${params.primary.signal_label} and ${params.secondary.signal_label}`,
    hero_subheadline: `A result led by ${params.primary.signal_label} with ${params.secondary.signal_label} close behind.`,
    hero_opening: `This result is led by ${params.primary.signal_label}, with ${params.secondary.signal_label} providing the strongest secondary signal.`,
    hero_strength_paragraph: firstText(
      params.primary.chapter_intro,
      params.primary.chapter_how_it_shows_up,
      params.primary.chapter_value_outcome,
    ),
    hero_tension_paragraph: firstText(
      params.secondary.chapter_risk_impact,
      params.secondary.chapter_risk_behaviour,
      params.secondary.chapter_development,
      params.secondary.chapter_intro,
    ),
    hero_close_paragraph: `Read this as a controlled signal-level synthesis, not as pair-specific authored language.`,
  };
}

function toBalancing(row: BalancingSectionsRow, pairKey: string): SingleDomainResultBalancing {
  const currentPattern = requireText(
    row.current_pattern_paragraph,
    `Missing limitation current pattern language for pair "${pairKey}".`,
  );
  const practicalMeaning = requireText(
    row.practical_meaning_paragraph,
    `Missing limitation practical meaning language for pair "${pairKey}".`,
  );
  const systemRisk = firstText(
    row.system_risk_paragraph,
    row.rebalance_intro,
    row.rebalance_action_1,
    practicalMeaning,
    currentPattern,
  );
  const action1 = firstText(row.rebalance_action_1, row.rebalance_intro, systemRisk);
  const action2 = firstText(row.rebalance_action_2, row.rebalance_intro, practicalMeaning, systemRisk);
  const action3 = firstText(row.rebalance_action_3, systemRisk, practicalMeaning, action2);

  return {
    pair_key: pairKey,
    balancing_section_title: requireText(
      row.balancing_section_title,
      `Missing limitation title language for pair "${pairKey}".`,
    ),
    current_pattern_paragraph: currentPattern,
    practical_meaning_paragraph: practicalMeaning,
    system_risk_paragraph: requireText(
      systemRisk,
      `Missing usable limitation risk language for pair "${pairKey}".`,
    ),
    rebalance_intro: requireText(
      firstText(row.rebalance_intro, systemRisk, practicalMeaning),
      `Missing usable limitation rebalance intro language for pair "${pairKey}".`,
    ),
    rebalance_actions: Object.freeze([
      requireText(action1, `Missing usable limitation action 1 language for pair "${pairKey}".`),
      requireText(action2, `Missing usable limitation action 2 language for pair "${pairKey}".`),
      requireText(action3, `Missing usable limitation action 3 language for pair "${pairKey}".`),
    ]),
  };
}

function toBalancingFallback(params: {
  pairKey: string;
  primary: SingleDomainResultSignal;
  weaker: SingleDomainResultSignal;
}): SingleDomainResultBalancing {
  warnPairFallback('limitation', params.pairKey);

  const primaryLimitation = firstText(
    params.primary.chapter_risk_impact,
    params.primary.chapter_risk_behaviour,
    params.primary.chapter_development,
    params.primary.chapter_intro,
  );
  const weakerTension = firstText(
    params.weaker.chapter_risk_impact,
    params.weaker.chapter_development,
    params.weaker.chapter_intro,
  );

  return {
    pair_key: params.pairKey,
    balancing_section_title: `When ${params.primary.signal_label} needs more ${params.weaker.signal_label}`,
    current_pattern_paragraph: `When ${params.primary.signal_label} dominates without enough ${params.weaker.signal_label}, the pattern may become narrower than the situation requires.`,
    practical_meaning_paragraph: primaryLimitation,
    system_risk_paragraph: weakerTension,
    rebalance_intro: `${params.weaker.signal_key}: ${weakerTension}`,
    rebalance_actions: Object.freeze([
      `Use ${params.weaker.signal_label} as an explicit check before the pattern hardens.`,
      primaryLimitation,
      weakerTension,
    ]),
  };
}

function toPairSummary(row: PairSummariesRow, pairKey: string): SingleDomainResultPairSummary {
  return {
    pair_key: pairKey,
    pair_section_title: row.pair_section_title,
    pair_headline: row.pair_headline,
    pair_opening_paragraph: row.pair_opening_paragraph,
    pair_strength_paragraph: row.pair_strength_paragraph,
    pair_tension_paragraph: row.pair_tension_paragraph,
    pair_close_paragraph: row.pair_close_paragraph,
  };
}

function toPairSummaryFallback(params: {
  pairKey: string;
  primary: SingleDomainResultSignal;
  secondary: SingleDomainResultSignal;
}): SingleDomainResultPairSummary {
  warnPairFallback('pair', params.pairKey);

  const primarySummary = firstText(
    params.primary.chapter_intro,
    params.primary.chapter_how_it_shows_up,
    params.primary.chapter_value_outcome,
  );
  const secondarySummary = firstText(
    params.secondary.chapter_intro,
    params.secondary.chapter_how_it_shows_up,
    params.secondary.chapter_value_outcome,
  );

  return {
    pair_key: params.pairKey,
    pair_section_title: `${params.primary.signal_label} and ${params.secondary.signal_label}`,
    pair_headline: `${params.primary.signal_label} and ${params.secondary.signal_label}`,
    pair_opening_paragraph: `The combination of ${params.primary.signal_label} and ${params.secondary.signal_label} creates a pattern where the strongest signal sets the main emphasis and the second signal shapes how that emphasis is expressed.`,
    pair_strength_paragraph: primarySummary,
    pair_tension_paragraph: secondarySummary,
    pair_close_paragraph: `This is a signal-level synthesis because no pair-specific authored language exists for ${params.pairKey}.`,
  };
}

function getSpecificHeroRow(params: {
  row: HeroPairsRow | undefined;
  pairKey: string;
  primary: SingleDomainResultSignal;
  secondary: SingleDomainResultSignal;
}): HeroPairsRow | null {
  if (!params.row) {
    return null;
  }

  const rowText = [
    params.row.hero_headline,
    params.row.hero_subheadline,
    params.row.hero_opening,
    params.row.hero_strength_paragraph,
    params.row.hero_tension_paragraph,
    params.row.hero_close_paragraph,
  ].join(' ');

  return pairLanguageReferencesSignals({ ...params, rowText }) ? params.row : null;
}

function getSpecificBalancingRow(params: {
  row: BalancingSectionsRow | undefined;
  pairKey: string;
  primary: SingleDomainResultSignal;
  secondary: SingleDomainResultSignal;
}): BalancingSectionsRow | null {
  if (!params.row) {
    return null;
  }

  const rowText = [
    params.row.balancing_section_title,
    params.row.current_pattern_paragraph,
    params.row.practical_meaning_paragraph,
    params.row.system_risk_paragraph,
    params.row.rebalance_intro,
    params.row.rebalance_action_1,
    params.row.rebalance_action_2,
    params.row.rebalance_action_3,
  ].join(' ');

  return pairLanguageReferencesSignals({ ...params, rowText }) ? params.row : null;
}

function getSpecificPairSummaryRow(params: {
  row: PairSummariesRow | undefined;
  pairKey: string;
  primary: SingleDomainResultSignal;
  secondary: SingleDomainResultSignal;
}): PairSummariesRow | null {
  if (!params.row) {
    return null;
  }

  const rowText = [
    params.row.pair_section_title,
    params.row.pair_headline,
    params.row.pair_opening_paragraph,
    params.row.pair_strength_paragraph,
    params.row.pair_tension_paragraph,
    params.row.pair_close_paragraph,
  ].join(' ');

  return pairLanguageReferencesSignals({ ...params, rowText }) ? params.row : null;
}

function buildApplicationStatements(params: {
  rankedSignals: readonly SingleDomainResultSignal[];
  applicationBySignalKey: ReadonlyMap<string, ApplicationStatementsRow>;
}): SingleDomainResultApplication {
  const ranked = [...params.rankedSignals].sort((left, right) => left.rank - right.rank);
  const lowestFirst = [...ranked].sort((left, right) => right.rank - left.rank);

  const strengths = ranked
    .slice(0, Math.min(3, ranked.length))
    .map((signal, index) => {
      const row = requireRow(
        params.applicationBySignalKey.get(signal.signal_key),
        `Missing APPLICATION_STATEMENTS language for signal "${signal.signal_key}".`,
      );

      return Object.freeze({
        signal_key: signal.signal_key,
        signal_label: signal.signal_label,
        rank: signal.rank,
        statement: index === 0 ? row.strength_statement_1 : row.strength_statement_2,
      } satisfies SingleDomainApplicationStatement);
    });

  const watchoutCandidates = [ranked[0], ranked[1], lowestFirst[0]].filter(
    (signal): signal is SingleDomainResultSignal => Boolean(signal),
  );
  const watchouts: SingleDomainApplicationStatement[] = [];
  const seenWatchoutKeys = new Set<string>();

  for (const candidate of watchoutCandidates) {
    if (seenWatchoutKeys.has(candidate.signal_key)) {
      continue;
    }

    const row = requireRow(
      params.applicationBySignalKey.get(candidate.signal_key),
      `Missing APPLICATION_STATEMENTS language for signal "${candidate.signal_key}".`,
    );

    watchouts.push(Object.freeze({
      signal_key: candidate.signal_key,
      signal_label: candidate.signal_label,
      rank: candidate.rank,
      statement: watchouts.length === 0 ? row.watchout_statement_1 : row.watchout_statement_2,
    }));
    seenWatchoutKeys.add(candidate.signal_key);
  }

  const developmentCandidates = [lowestFirst[0], lowestFirst[1], ranked[1]].filter(
    (signal): signal is SingleDomainResultSignal => Boolean(signal),
  );
  const developmentFocus: SingleDomainApplicationStatement[] = [];
  const seenDevelopmentKeys = new Set<string>();

  for (const candidate of developmentCandidates) {
    if (seenDevelopmentKeys.has(candidate.signal_key)) {
      continue;
    }

    const row = requireRow(
      params.applicationBySignalKey.get(candidate.signal_key),
      `Missing APPLICATION_STATEMENTS language for signal "${candidate.signal_key}".`,
    );

    developmentFocus.push(Object.freeze({
      signal_key: candidate.signal_key,
      signal_label: candidate.signal_label,
      rank: candidate.rank,
      statement: developmentFocus.length === 0
        ? row.development_statement_1
        : row.development_statement_2,
    }));
    seenDevelopmentKeys.add(candidate.signal_key);
  }

  return {
    strengths: Object.freeze(strengths),
    watchouts: Object.freeze(watchouts),
    developmentFocus: Object.freeze(developmentFocus),
  };
}

export async function buildSingleDomainResultPayload(params: {
  db: Queryable;
  assessmentVersionId: string;
  responses: RuntimeResponseSet;
}): Promise<SingleDomainResultPayload> {
  const runtimeDefinition = await loadSingleDomainRuntimeDefinition(params.db, params.assessmentVersionId);
  const executionDefinition = toExecutionDefinition(runtimeDefinition);
  const executionModel = loadRuntimeExecutionModel(executionDefinition);
  const scoreResult = scoreAssessmentResponses({
    executionModel,
    responses: params.responses,
  });
  const normalizedResult = normalizeScoreResult({ scoreResult });

  if (scoreResult.diagnostics.answeredQuestions !== executionModel.questions.length) {
    throw new SingleDomainCompletionError('Single-domain completion requires every question to be answered.');
  }

  if (normalizedResult.signalScores.length === 0) {
    throw new SingleDomainCompletionError('Single-domain completion requires at least one scored signal.');
  }

  const rankedSignals = [...normalizedResult.signalScores].sort((left, right) => (
    left.rank - right.rank
    || left.signalKey.localeCompare(right.signalKey)
    || left.signalId.localeCompare(right.signalId)
  ));
  const topSignal = rankedSignals[0]!;
  const secondSignal = rankedSignals[1];
  const topPairKey = secondSignal
    ? deriveTopPairKey({
        topSignalKey: topSignal.signalKey,
        secondSignalKey: secondSignal.signalKey,
        runtimeDefinition,
      })
    : null;

  if (!topPairKey) {
    throw new SingleDomainCompletionError('Single-domain completion requires at least two ranked signals to derive a pair.');
  }

  const maps = createLanguageMaps(runtimeDefinition);
  const introRow = requireRow(
    maps.framingByDomainKey.get(runtimeDefinition.domain.key),
    `Missing DOMAIN_FRAMING row for domain "${runtimeDefinition.domain.key}".`,
  );

  const signals: readonly SingleDomainResultSignal[] = Object.freeze(
    rankedSignals.map((signal) => {
      const chapterRow = requireRow(
        maps.signalChapterBySignalKey.get(signal.signalKey),
        `Missing SIGNAL_CHAPTERS row for signal "${signal.signalKey}".`,
      );
      const position = getSignalPosition(signal.rank, rankedSignals.length);

      return buildSignalChapterPayload({
        row: chapterRow,
        signalKey: signal.signalKey,
        signalLabel: signal.signalTitle,
        rank: signal.rank,
        normalizedScore: signal.percentage,
        rawScore: signal.rawTotal,
        position,
      });
    }),
  );
  const pairSignals = getPairSignals({
    pairKey: topPairKey,
    signals,
  });
  const heroRow = getSpecificHeroRow({
    row: maps.heroByPairKey.get(topPairKey),
    pairKey: topPairKey,
    primary: pairSignals.primary,
    secondary: pairSignals.secondary,
  });
  const balancingRow = getSpecificBalancingRow({
    row: maps.balancingByPairKey.get(topPairKey),
    pairKey: topPairKey,
    primary: pairSignals.primary,
    secondary: pairSignals.secondary,
  });
  const pairSummaryRow = getSpecificPairSummaryRow({
    row: maps.pairSummaryByPairKey.get(topPairKey),
    pairKey: topPairKey,
    primary: pairSignals.primary,
    secondary: pairSignals.secondary,
  });

  const application = buildApplicationStatements({
    rankedSignals: signals,
    applicationBySignalKey: maps.applicationBySignalKey,
  });

  const payload = Object.freeze({
    metadata: Object.freeze({
      assessmentKey: runtimeDefinition.metadata.assessmentKey,
      assessmentTitle: runtimeDefinition.metadata.assessmentTitle,
      version: runtimeDefinition.metadata.assessmentVersionTag,
      attemptId: params.responses.attemptId,
      mode: 'single_domain',
      domainKey: runtimeDefinition.domain.key,
      generatedAt: normalizedResult.diagnostics.generatedAt,
      completedAt: params.responses.submittedAt,
    }),
    intro: Object.freeze(toIntro(introRow)),
    hero: Object.freeze(
      heroRow
        ? toHero(heroRow, topPairKey)
        : toHeroFallback({
            pairKey: topPairKey,
            primary: pairSignals.primary,
            secondary: pairSignals.secondary,
          }),
    ),
    signals,
    balancing: Object.freeze(
      balancingRow
        ? toBalancing(balancingRow, topPairKey)
        : toBalancingFallback({
            pairKey: topPairKey,
            primary: pairSignals.primary,
            weaker: pairSignals.weaker,
          }),
    ),
    pairSummary: Object.freeze(
      pairSummaryRow
        ? toPairSummary(pairSummaryRow, topPairKey)
        : toPairSummaryFallback({
            pairKey: topPairKey,
            primary: pairSignals.primary,
            secondary: pairSignals.secondary,
          }),
    ),
    application: Object.freeze(application),
    diagnostics: Object.freeze({
      readinessStatus: 'ready' as const,
      scoringMethod: scoreResult.diagnostics.scoringMethod,
      normalizationMethod: normalizedResult.diagnostics.normalizationMethod,
      answeredQuestionCount: scoreResult.diagnostics.answeredQuestions,
      totalQuestionCount: scoreResult.diagnostics.totalQuestions,
      signalCount: runtimeDefinition.diagnostics.counts.signalCount,
      derivedPairCount: runtimeDefinition.diagnostics.counts.derivedPairCount,
      topPair: topPairKey,
      counts: {
        domainCount: runtimeDefinition.diagnostics.counts.domainCount,
        questionCount: runtimeDefinition.diagnostics.counts.questionCount,
        optionCount: runtimeDefinition.diagnostics.counts.optionCount,
        weightCount: runtimeDefinition.diagnostics.counts.weightCount,
      },
      warnings: Object.freeze([
        ...scoreResult.diagnostics.warnings,
        ...normalizedResult.diagnostics.warnings,
      ]),
    }),
  });

  if (!isSingleDomainResultPayload(payload)) {
    throw new SingleDomainCompletionError(
      `Generated single-domain result payload is malformed for attempt "${params.responses.attemptId}".`,
    );
  }

  return payload;
}
