import type { AssessmentMode } from '@/lib/types/assessment';

export type SingleDomainResultMetadata = {
  assessmentKey: string;
  assessmentTitle: string;
  version: string;
  attemptId: string;
  mode: 'single_domain';
  domainKey: string;
  generatedAt: string;
  completedAt: string | null;
};

export type SingleDomainResultIntro = {
  section_title: string;
  intro_paragraph: string;
  meaning_paragraph: string;
  bridge_to_signals: string;
  blueprint_context_line: string;
};

export type SingleDomainResultHero = {
  pair_key: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_opening: string;
  hero_strength_paragraph: string;
  hero_tension_paragraph: string;
  hero_close_paragraph: string;
};

export type SingleDomainSignalPosition =
  | 'primary'
  | 'secondary'
  | 'supporting'
  | 'underplayed';

export type SingleDomainResultSignal = {
  signal_key: string;
  signal_label: string;
  rank: number;
  normalized_score: number;
  raw_score: number;
  position: SingleDomainSignalPosition;
  position_label: string;
  chapter_intro: string;
  chapter_how_it_shows_up: string;
  chapter_value_outcome: string;
  chapter_value_team_effect: string;
  chapter_risk_behaviour: string;
  chapter_risk_impact: string;
  chapter_development: string;
};

export type SingleDomainResultBalancing = {
  pair_key: string;
  balancing_section_title: string;
  current_pattern_paragraph: string;
  practical_meaning_paragraph: string;
  system_risk_paragraph: string;
  rebalance_intro: string;
  rebalance_actions: readonly string[];
};

export type SingleDomainResultPairSummary = {
  pair_key: string;
  pair_section_title: string;
  pair_headline: string;
  pair_opening_paragraph: string;
  pair_strength_paragraph: string;
  pair_tension_paragraph: string;
  pair_close_paragraph: string;
};

export type SingleDomainApplicationStatement = {
  signal_key: string;
  signal_label: string;
  rank: number;
  statement: string;
};

export type SingleDomainResultApplication = {
  strengths: readonly SingleDomainApplicationStatement[];
  watchouts: readonly SingleDomainApplicationStatement[];
  developmentFocus: readonly SingleDomainApplicationStatement[];
};

export type SingleDomainResultDiagnostics = {
  readinessStatus: 'ready';
  scoringMethod: 'option_signal_weights_only';
  normalizationMethod: 'largest_remainder_integer_percentages';
  answeredQuestionCount: number;
  totalQuestionCount: number;
  signalCount: number;
  derivedPairCount: number;
  topPair: string | null;
  counts: {
    domainCount: number;
    questionCount: number;
    optionCount: number;
    weightCount: number;
  };
  warnings: readonly string[];
};

export type SingleDomainResultPayload = {
  metadata: SingleDomainResultMetadata;
  intro: SingleDomainResultIntro;
  hero: SingleDomainResultHero;
  signals: readonly SingleDomainResultSignal[];
  balancing: SingleDomainResultBalancing;
  pairSummary: SingleDomainResultPairSummary;
  application: SingleDomainResultApplication;
  diagnostics: SingleDomainResultDiagnostics;
};

export type PersistedAssessmentResultPayloadMode = AssessmentMode;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isApplicationStatement(value: unknown): value is SingleDomainApplicationStatement {
  return isRecord(value)
    && isNonEmptyString(value.signal_key)
    && isNonEmptyString(value.signal_label)
    && isFiniteNumber(value.rank)
    && isNonEmptyString(value.statement);
}

function isSignal(value: unknown): value is SingleDomainResultSignal {
  return isRecord(value)
    && isNonEmptyString(value.signal_key)
    && isNonEmptyString(value.signal_label)
    && isFiniteNumber(value.rank)
    && isFiniteNumber(value.normalized_score)
    && isFiniteNumber(value.raw_score)
    && isNonEmptyString(value.position)
    && isNonEmptyString(value.position_label)
    && isNonEmptyString(value.chapter_intro)
    && isNonEmptyString(value.chapter_how_it_shows_up)
    && isNonEmptyString(value.chapter_value_outcome)
    && isNonEmptyString(value.chapter_value_team_effect)
    && isNonEmptyString(value.chapter_risk_behaviour)
    && isNonEmptyString(value.chapter_risk_impact)
    && isNonEmptyString(value.chapter_development);
}

export function isSingleDomainResultPayload(value: unknown): value is SingleDomainResultPayload {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isRecord(value.metadata)
    || !isNonEmptyString(value.metadata.assessmentKey)
    || !isNonEmptyString(value.metadata.assessmentTitle)
    || !isNonEmptyString(value.metadata.version)
    || !isNonEmptyString(value.metadata.attemptId)
    || value.metadata.mode !== 'single_domain'
    || !isNonEmptyString(value.metadata.domainKey)
    || !isNonEmptyString(value.metadata.generatedAt)
    || !isNullableString(value.metadata.completedAt)
  ) {
    return false;
  }

  if (
    !isRecord(value.intro)
    || !isNonEmptyString(value.intro.section_title)
    || !isNonEmptyString(value.intro.intro_paragraph)
    || !isNonEmptyString(value.intro.meaning_paragraph)
    || !isNonEmptyString(value.intro.bridge_to_signals)
    || !isNonEmptyString(value.intro.blueprint_context_line)
    || !isRecord(value.hero)
    || !isNonEmptyString(value.hero.pair_key)
    || !isNonEmptyString(value.hero.hero_headline)
    || !isNonEmptyString(value.hero.hero_subheadline)
    || !isNonEmptyString(value.hero.hero_opening)
    || !isNonEmptyString(value.hero.hero_strength_paragraph)
    || !isNonEmptyString(value.hero.hero_tension_paragraph)
    || !isNonEmptyString(value.hero.hero_close_paragraph)
    || !Array.isArray(value.signals)
    || !value.signals.every(isSignal)
    || !isRecord(value.balancing)
    || !isNonEmptyString(value.balancing.pair_key)
    || !isNonEmptyString(value.balancing.balancing_section_title)
    || !isNonEmptyString(value.balancing.current_pattern_paragraph)
    || !isNonEmptyString(value.balancing.practical_meaning_paragraph)
    || !isNonEmptyString(value.balancing.system_risk_paragraph)
    || !isNonEmptyString(value.balancing.rebalance_intro)
    || !Array.isArray(value.balancing.rebalance_actions)
    || !value.balancing.rebalance_actions.every(isNonEmptyString)
    || !isRecord(value.pairSummary)
    || !isNonEmptyString(value.pairSummary.pair_key)
    || !isNonEmptyString(value.pairSummary.pair_section_title)
    || !isNonEmptyString(value.pairSummary.pair_headline)
    || !isNonEmptyString(value.pairSummary.pair_opening_paragraph)
    || !isNonEmptyString(value.pairSummary.pair_strength_paragraph)
    || !isNonEmptyString(value.pairSummary.pair_tension_paragraph)
    || !isNonEmptyString(value.pairSummary.pair_close_paragraph)
    || !isRecord(value.application)
    || !Array.isArray(value.application.strengths)
    || !value.application.strengths.every(isApplicationStatement)
    || !Array.isArray(value.application.watchouts)
    || !value.application.watchouts.every(isApplicationStatement)
    || !Array.isArray(value.application.developmentFocus)
    || !value.application.developmentFocus.every(isApplicationStatement)
    || !isRecord(value.diagnostics)
    || value.diagnostics.readinessStatus !== 'ready'
    || value.diagnostics.scoringMethod !== 'option_signal_weights_only'
    || value.diagnostics.normalizationMethod !== 'largest_remainder_integer_percentages'
    || !isFiniteNumber(value.diagnostics.answeredQuestionCount)
    || !isFiniteNumber(value.diagnostics.totalQuestionCount)
    || !isFiniteNumber(value.diagnostics.signalCount)
    || !isFiniteNumber(value.diagnostics.derivedPairCount)
    || !(value.diagnostics.topPair === null || isNonEmptyString(value.diagnostics.topPair))
    || !isRecord(value.diagnostics.counts)
    || !isFiniteNumber(value.diagnostics.counts.domainCount)
    || !isFiniteNumber(value.diagnostics.counts.questionCount)
    || !isFiniteNumber(value.diagnostics.counts.optionCount)
    || !isFiniteNumber(value.diagnostics.counts.weightCount)
    || !Array.isArray(value.diagnostics.warnings)
    || !value.diagnostics.warnings.every((warning) => typeof warning === 'string')
  ) {
    return false;
  }

  return true;
}
