import {
  SINGLE_DOMAIN_RESULT_READING_SECTIONS,
  createSingleDomainResultReadingSections,
} from '@/lib/results/result-reading-sections';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

const SINGLE_DOMAIN_RESULTS_BRIDGE_LINE =
  'On their own, these signals describe you. Together, they explain how you actually operate.';

export type SingleDomainResultsMetadataItem = {
  label: string;
  value: string;
};

export type SingleDomainSignalNarrativeTier =
  | 'primary'
  | 'secondary'
  | 'supporting'
  | 'underplayed';

export type SingleDomainSignalNarrativeSection = {
  key: 'how_it_shows_up' | 'value_outcome' | 'team_effect' | 'risk_behaviour' | 'risk_impact' | 'development_line';
  label: string;
  body: string;
};

export type SingleDomainSignalChapterViewModel = {
  anchorId: string;
  signalKey: string;
  signalLabel: string;
  rank: number;
  normalizedScore: number;
  rawScore: number;
  tier: SingleDomainSignalNarrativeTier;
  positionLabel: string;
  chapterIntro: string;
  howItShowsUp: string;
  valueOutcome: string;
  teamEffect: string;
  riskBehaviour: string;
  riskImpact: string;
  developmentLine: string;
  narrativeSections: readonly SingleDomainSignalNarrativeSection[];
};

export type SingleDomainResultsViewModel = {
  assessmentTitle: string;
  version: string;
  metadataItems: readonly SingleDomainResultsMetadataItem[];
  readingSections: typeof SINGLE_DOMAIN_RESULT_READING_SECTIONS;
  intro: {
    sectionTitle: string;
    introParagraph: string;
    meaningParagraph: string;
    bridgeToSignals: string;
    blueprintContextLine: string;
  };
  hero: {
    sectionLabel: string;
    pairLabel: string;
    pairSignalLabels: readonly string[];
    headline: string;
    subheadline: string;
    opening: string;
    strengthParagraph: string;
    tensionParagraph: string;
    closeParagraph: string;
  };
  signals: readonly SingleDomainSignalChapterViewModel[];
  bridgeLine: string;
  balancing: {
    sectionTitle: string;
    currentPatternParagraph: string;
    practicalMeaningParagraph: string;
    systemRiskParagraph: string;
    rebalanceIntro: string;
    rebalanceActions: readonly string[];
  };
  pairSummary: {
    sectionTitle: string;
    headline: string;
    openingParagraph: string;
    strengthParagraph: string;
    tensionParagraph: string;
    closeParagraph: string;
  };
  application: {
    strengths: SingleDomainResultPayload['application']['strengths'];
    watchouts: SingleDomainResultPayload['application']['watchouts'];
    developmentFocus: SingleDomainResultPayload['application']['developmentFocus'];
  };
};

const COPY_REPLACEMENTS: ReadonlyArray<readonly [pattern: RegExp, replacement: string]> = Object.freeze([
  [/\bpersisted\b/gi, ''],
  [/\brecomputing in the ui\b/gi, 'working it out again here'],
  [/\brecomputing\b/gi, 'working it out again'],
  [/\bintegrated meaning\b/gi, 'combined meaning'],
  [/\bbalancing diagnosis\b/gi, 'balance reading'],
  [/\bruntime definition\b/gi, 'current picture'],
  [/\bcanonical\b/gi, ''],
  [/\branked signals\b/gi, 'leading tendencies'],
  [/\bnormalized signal weight\b/gi, 'overall emphasis'],
  [/\bnormalized\b/gi, 'overall'],
  [/\bsystem risk\b/gi, 'watchout'],
  [/\bblueprint context\b/gi, 'focus'],
  [/\bvision_results\b/gi, 'Direction and Delivery'],
  [/\bVISION_RESULTS\b/g, 'Direction and Delivery'],
  [/\bresults\b/gi, 'report'],
]);

function cleanWhitespace(value: string): string {
  return value.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
}

function formatRawKeyLabel(value: string): string {
  const cleaned = value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

  return cleanWhitespace(cleaned);
}

function cleanResultCopy(value: string): string {
  let cleaned = value;

  for (const [pattern, replacement] of COPY_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = cleaned.replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (match) => formatRawKeyLabel(match));

  return cleanWhitespace(cleaned);
}

function cleanNullableCopy(value: string | null | undefined): string {
  return cleanResultCopy(value ?? '');
}

function formatResultTimestamp(value: string | null): {
  date: string;
  time: string | null;
} {
  if (!value) {
    return {
      date: 'No completion date',
      time: null,
    };
  }

  const timestamp = new Date(value);

  return {
    date: timestamp.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: timestamp.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

function getSignalNarrativeTier(signal: SingleDomainResultPayload['signals'][number]): SingleDomainSignalNarrativeTier {
  if (signal.normalized_score <= 0 || signal.raw_score <= 0 || signal.position === 'underplayed') {
    return 'underplayed';
  }

  if (signal.position === 'primary') {
    return 'primary';
  }

  if (signal.position === 'secondary') {
    return 'secondary';
  }

  return 'supporting';
}

function getSignalPositionLabel(tier: SingleDomainSignalNarrativeTier): string {
  switch (tier) {
    case 'primary':
      return 'Most present';
    case 'secondary':
      return 'Strong support';
    case 'supporting':
      return 'Supporting note';
    case 'underplayed':
      return 'Less present';
    default:
      return 'Supporting note';
  }
}

function getNarrativeSections(signal: SingleDomainResultPayload['signals'][number]): readonly SingleDomainSignalNarrativeSection[] {
  const allSections: readonly SingleDomainSignalNarrativeSection[] = Object.freeze([
    { key: 'how_it_shows_up', label: 'How it shows up', body: cleanNullableCopy(signal.chapter_how_it_shows_up) },
    { key: 'value_outcome', label: 'What it adds', body: cleanNullableCopy(signal.chapter_value_outcome) },
    { key: 'team_effect', label: 'Effect on others', body: cleanNullableCopy(signal.chapter_value_team_effect) },
    { key: 'risk_behaviour', label: 'When it overreaches', body: cleanNullableCopy(signal.chapter_risk_behaviour) },
    { key: 'risk_impact', label: 'What to watch', body: cleanNullableCopy(signal.chapter_risk_impact) },
    { key: 'development_line', label: 'How to stretch it', body: cleanNullableCopy(signal.chapter_development) },
  ]);

  const tier = getSignalNarrativeTier(signal);

  if (tier === 'primary') {
    return allSections;
  }

  if (tier === 'secondary') {
    return Object.freeze(
      allSections.filter((section) => (
        section.key === 'how_it_shows_up'
        || section.key === 'value_outcome'
        || section.key === 'risk_behaviour'
        || section.key === 'development_line'
      )),
    );
  }

  if (tier === 'supporting') {
    return Object.freeze(
      allSections.filter((section) => (
        section.key === 'how_it_shows_up'
        || section.key === 'value_outcome'
        || section.key === 'development_line'
      )),
    );
  }

  return Object.freeze(
    allSections.filter((section) => (
      section.key === 'risk_impact'
      || section.key === 'development_line'
    )),
  );
}

export function createSingleDomainResultsViewModel(
  payload: SingleDomainResultPayload,
): SingleDomainResultsViewModel {
  const completionTimestamp = formatResultTimestamp(payload.metadata.completedAt ?? payload.metadata.generatedAt);
  const orderedSignals = [...payload.signals].sort((left, right) => (
    left.rank - right.rank || left.signal_key.localeCompare(right.signal_key)
  ));
  const pairSignalLabels = orderedSignals.slice(0, 2).map((signal) => cleanResultCopy(signal.signal_label));
  const pairLabel =
    pairSignalLabels.length >= 2
      ? `${pairSignalLabels[0]} and ${pairSignalLabels[1]}`
      : cleanResultCopy(payload.hero.pair_key);

  return {
    assessmentTitle: payload.metadata.assessmentTitle,
    version: payload.metadata.version,
    metadataItems: [
      { label: 'Completed', value: completionTimestamp.date },
      ...(completionTimestamp.time ? [{ label: 'Time', value: completionTimestamp.time }] : []),
      { label: 'Assessment', value: payload.metadata.assessmentTitle },
      { label: 'Version', value: payload.metadata.version },
    ],
    readingSections: createSingleDomainResultReadingSections({
      introLabel: cleanResultCopy(payload.intro.section_title),
      heroLabel: 'Behaviour pattern',
      signalsLabel: 'Inside this domain',
      balancingLabel: cleanResultCopy(payload.balancing.balancing_section_title),
      pairSummaryLabel: cleanResultCopy(payload.pairSummary.pair_section_title),
      applicationLabel: 'Application',
    }),
    intro: {
      sectionTitle: cleanResultCopy(payload.intro.section_title),
      introParagraph: cleanResultCopy(payload.intro.intro_paragraph),
      meaningParagraph: cleanResultCopy(payload.intro.meaning_paragraph),
      bridgeToSignals: cleanResultCopy(payload.intro.bridge_to_signals),
      blueprintContextLine: cleanResultCopy(payload.intro.blueprint_context_line),
    },
    hero: {
      sectionLabel: 'Behaviour pattern',
      pairLabel,
      pairSignalLabels,
      headline: cleanResultCopy(payload.hero.hero_headline),
      subheadline: cleanResultCopy(payload.hero.hero_subheadline),
      opening: cleanResultCopy(payload.hero.hero_opening),
      strengthParagraph: cleanResultCopy(payload.hero.hero_strength_paragraph),
      tensionParagraph: cleanResultCopy(payload.hero.hero_tension_paragraph),
      closeParagraph: cleanResultCopy(payload.hero.hero_close_paragraph),
    },
    signals: orderedSignals.map((signal) => ({
      anchorId: `signal-${String(signal.rank).padStart(2, '0')}`,
      signalKey: signal.signal_key,
      signalLabel: cleanResultCopy(signal.signal_label),
      rank: signal.rank,
      normalizedScore: signal.normalized_score,
      rawScore: signal.raw_score,
      tier: getSignalNarrativeTier(signal),
      positionLabel: getSignalPositionLabel(getSignalNarrativeTier(signal)),
      chapterIntro: cleanResultCopy(signal.chapter_intro),
      howItShowsUp: cleanNullableCopy(signal.chapter_how_it_shows_up),
      valueOutcome: cleanNullableCopy(signal.chapter_value_outcome),
      teamEffect: cleanNullableCopy(signal.chapter_value_team_effect),
      riskBehaviour: cleanNullableCopy(signal.chapter_risk_behaviour),
      riskImpact: cleanNullableCopy(signal.chapter_risk_impact),
      developmentLine: cleanNullableCopy(signal.chapter_development),
      narrativeSections: getNarrativeSections(signal),
    })),
    bridgeLine: SINGLE_DOMAIN_RESULTS_BRIDGE_LINE,
    balancing: {
      sectionTitle: cleanResultCopy(payload.balancing.balancing_section_title),
      currentPatternParagraph: cleanResultCopy(payload.balancing.current_pattern_paragraph),
      practicalMeaningParagraph: cleanResultCopy(payload.balancing.practical_meaning_paragraph),
      systemRiskParagraph: cleanResultCopy(payload.balancing.system_risk_paragraph),
      rebalanceIntro: cleanResultCopy(payload.balancing.rebalance_intro),
      rebalanceActions: payload.balancing.rebalance_actions.map((action) => cleanResultCopy(action)),
    },
    pairSummary: {
      sectionTitle: cleanResultCopy(payload.pairSummary.pair_section_title),
      headline: cleanResultCopy(payload.pairSummary.pair_headline),
      openingParagraph: cleanResultCopy(payload.pairSummary.pair_opening_paragraph),
      strengthParagraph: cleanResultCopy(payload.pairSummary.pair_strength_paragraph),
      tensionParagraph: cleanResultCopy(payload.pairSummary.pair_tension_paragraph),
      closeParagraph: cleanResultCopy(payload.pairSummary.pair_close_paragraph),
    },
    application: {
      strengths: payload.application.strengths.map((item) => ({
        ...item,
        signal_label: cleanResultCopy(item.signal_label),
        statement: cleanResultCopy(item.statement),
      })),
      watchouts: payload.application.watchouts.map((item) => ({
        ...item,
        signal_label: cleanResultCopy(item.signal_label),
        statement: cleanResultCopy(item.statement),
      })),
      developmentFocus: payload.application.developmentFocus.map((item) => ({
        ...item,
        signal_label: cleanResultCopy(item.signal_label),
        statement: cleanResultCopy(item.statement),
      })),
    },
  };
}

export { SINGLE_DOMAIN_RESULTS_BRIDGE_LINE };
