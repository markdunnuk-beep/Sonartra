import { SINGLE_DOMAIN_RESULT_READING_SECTIONS } from '@/lib/results/result-reading-sections';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

const SINGLE_DOMAIN_RESULTS_BRIDGE_LINE =
  'On their own, these signals describe you. Together, they explain how you actually operate.';

export type SingleDomainResultsMetadataItem = {
  label: string;
  value: string;
};

export type SingleDomainSignalChapterViewModel = {
  anchorId: string;
  signalKey: string;
  signalLabel: string;
  rank: number;
  normalizedScore: number;
  positionLabel: string;
  chapterIntro: string;
  howItShowsUp: string;
  valueOutcome: string;
  teamEffect: string;
  riskBehaviour: string;
  riskImpact: string;
  developmentLine: string;
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
      positionLabel: signal.position_label,
      chapterIntro: signal.chapter_intro,
      howItShowsUp: signal.chapter_how_it_shows_up,
      valueOutcome: signal.chapter_value_outcome,
      teamEffect: signal.chapter_value_team_effect,
      riskBehaviour: signal.chapter_risk_behaviour,
      riskImpact: signal.chapter_risk_impact,
      developmentLine: signal.chapter_development,
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
