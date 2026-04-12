import { SINGLE_DOMAIN_RESULT_READING_SECTIONS } from '@/lib/results/result-reading-sections';
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
    pairKey: string;
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

function getNarrativeSections(signal: SingleDomainResultPayload['signals'][number]): readonly SingleDomainSignalNarrativeSection[] {
  const allSections: readonly SingleDomainSignalNarrativeSection[] = Object.freeze([
    { key: 'how_it_shows_up', label: 'How it shows up', body: signal.chapter_how_it_shows_up },
    { key: 'value_outcome', label: 'Value outcome', body: signal.chapter_value_outcome },
    { key: 'team_effect', label: 'Team effect', body: signal.chapter_value_team_effect },
    { key: 'risk_behaviour', label: 'Risk behaviour', body: signal.chapter_risk_behaviour },
    { key: 'risk_impact', label: 'Risk impact', body: signal.chapter_risk_impact },
    { key: 'development_line', label: 'Development line', body: signal.chapter_development },
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

  return {
    assessmentTitle: payload.metadata.assessmentTitle,
    version: payload.metadata.version,
    metadataItems: [
      { label: 'Completed', value: completionTimestamp.date },
      ...(completionTimestamp.time ? [{ label: 'Time', value: completionTimestamp.time }] : []),
      { label: 'Assessment', value: payload.metadata.assessmentTitle },
      { label: 'Version', value: payload.metadata.version },
    ],
    readingSections: SINGLE_DOMAIN_RESULT_READING_SECTIONS,
    intro: {
      sectionTitle: payload.intro.section_title,
      introParagraph: payload.intro.intro_paragraph,
      meaningParagraph: payload.intro.meaning_paragraph,
      bridgeToSignals: payload.intro.bridge_to_signals,
      blueprintContextLine: payload.intro.blueprint_context_line,
    },
    hero: {
      pairKey: payload.hero.pair_key,
      pairSignalLabels: orderedSignals.slice(0, 2).map((signal) => signal.signal_label),
      headline: payload.hero.hero_headline,
      subheadline: payload.hero.hero_subheadline,
      opening: payload.hero.hero_opening,
      strengthParagraph: payload.hero.hero_strength_paragraph,
      tensionParagraph: payload.hero.hero_tension_paragraph,
      closeParagraph: payload.hero.hero_close_paragraph,
    },
    signals: orderedSignals.map((signal) => ({
      anchorId: `signal-${signal.signal_key}`,
      signalKey: signal.signal_key,
      signalLabel: signal.signal_label,
      rank: signal.rank,
      normalizedScore: signal.normalized_score,
      rawScore: signal.raw_score,
      tier: getSignalNarrativeTier(signal),
      positionLabel: signal.position_label,
      chapterIntro: signal.chapter_intro,
      howItShowsUp: signal.chapter_how_it_shows_up,
      valueOutcome: signal.chapter_value_outcome,
      teamEffect: signal.chapter_value_team_effect,
      riskBehaviour: signal.chapter_risk_behaviour,
      riskImpact: signal.chapter_risk_impact,
      developmentLine: signal.chapter_development,
      narrativeSections: getNarrativeSections(signal),
    })),
    bridgeLine: SINGLE_DOMAIN_RESULTS_BRIDGE_LINE,
    balancing: {
      sectionTitle: payload.balancing.balancing_section_title,
      currentPatternParagraph: payload.balancing.current_pattern_paragraph,
      practicalMeaningParagraph: payload.balancing.practical_meaning_paragraph,
      systemRiskParagraph: payload.balancing.system_risk_paragraph,
      rebalanceIntro: payload.balancing.rebalance_intro,
      rebalanceActions: payload.balancing.rebalance_actions,
    },
    pairSummary: {
      sectionTitle: payload.pairSummary.pair_section_title,
      headline: payload.pairSummary.pair_headline,
      openingParagraph: payload.pairSummary.pair_opening_paragraph,
      strengthParagraph: payload.pairSummary.pair_strength_paragraph,
      tensionParagraph: payload.pairSummary.pair_tension_paragraph,
      closeParagraph: payload.pairSummary.pair_close_paragraph,
    },
    application: {
      strengths: payload.application.strengths,
      watchouts: payload.application.watchouts,
      developmentFocus: payload.application.developmentFocus,
    },
  };
}

export { SINGLE_DOMAIN_RESULTS_BRIDGE_LINE };
