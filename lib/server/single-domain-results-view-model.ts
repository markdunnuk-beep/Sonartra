import {
  SINGLE_DOMAIN_RESULT_READING_SECTIONS,
  createSingleDomainResultReadingSections,
} from '@/lib/results/result-reading-sections';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

const SINGLE_DOMAIN_RESULTS_BRIDGE_LINE =
  'The signals below show what is carrying this pattern, what supports it, and what stays quieter in the background.';

export type SingleDomainResultsMetadataItem = {
  label: string;
  value: string;
};

export type SingleDomainSignalNarrativeTier =
  | 'primary'
  | 'secondary'
  | 'supporting'
  | 'underplayed';

export type SingleDomainSignalNarrativeSemanticState =
  | 'dominant'
  | 'reinforcing'
  | 'contextual'
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
  semanticState: SingleDomainSignalNarrativeSemanticState;
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
]);

const SINGLE_DOMAIN_SIGNAL_DISPLAY_LABELS = new Map<string, string>([
  ['results', 'Delivery'],
  ['result', 'Delivery'],
  ['report', 'Delivery'],
  ['delivery', 'Delivery'],
  ['vision', 'Vision'],
  ['people', 'People'],
  ['process', 'Process'],
  ['rigor', 'Rigor'],
  ['clarity', 'Clarity'],
]);

const APPROVED_SINGLE_DOMAIN_SIGNAL_TOKENS = Array.from(SINGLE_DOMAIN_SIGNAL_DISPLAY_LABELS.keys())
  .sort((left, right) => right.length - left.length)
  .join('|');

const STRONG_SIGNAL_LANGUAGE_PATTERNS: readonly RegExp[] = Object.freeze([
  /\bplays?\s+a\s+strong\s+role\b/i,
  /\bstrongly\s+shapes?\b/i,
  /\bdrives?\s+your\s+(?:behaviou?r|style|approach)\b/i,
  /\byou\s+rely\s+on\b/i,
  /\bcentral\s+to\s+how\s+you\b/i,
  /\bcore\s+part\s+of\s+your\s+(?:approach|style)\b/i,
  /\bdominant\s+force\b/i,
  /\bsets?\s+the\s+tone\b/i,
  /\bdefining\s+force\b/i,
  /\bmain\s+driver\b/i,
]);

function cleanWhitespace(value: string): string {
  return value.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
}

function normalizeDisplayLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function resolveApprovedSignalDisplayLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return SINGLE_DOMAIN_SIGNAL_DISPLAY_LABELS.get(normalizeDisplayLookupKey(value)) ?? null;
}

function resolveApprovedPairDisplayLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parts = value
    .split(/[_-]+/)
    .map((part) => resolveApprovedSignalDisplayLabel(part))
    .filter((part): part is string => Boolean(part));

  if (parts.length >= 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return null;
}

function formatRawKeyLabel(value: string): string {
  const cleaned = value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

  return cleanWhitespace(cleaned);
}

function replaceApprovedPairDisplayLabels(value: string): string {
  return value.replace(
    new RegExp(
      `\\b(${APPROVED_SINGLE_DOMAIN_SIGNAL_TOKENS})\\b\\s*(?:×|x|and)\\s*\\b(${APPROVED_SINGLE_DOMAIN_SIGNAL_TOKENS})\\b`,
      'gi',
    ),
    (match, left, right) => {
      const leftLabel = resolveApprovedSignalDisplayLabel(left);
      const rightLabel = resolveApprovedSignalDisplayLabel(right);

      if (!leftLabel || !rightLabel) {
        return match;
      }

      return `${leftLabel} and ${rightLabel}`;
    },
  );
}

function cleanResultCopy(value: string): string {
  let cleaned = value;

  for (const [pattern, replacement] of COPY_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = replaceApprovedPairDisplayLabels(cleaned);

  cleaned = cleaned.replace(/\b[a-z]+(?:[_-][a-z]+)+\b/gi, (match) => (
    resolveApprovedPairDisplayLabel(match) ?? formatRawKeyLabel(match)
  ));

  return cleanWhitespace(cleaned);
}

function cleanNullableCopy(value: string | null | undefined): string {
  return cleanResultCopy(value ?? '');
}

function getApprovedSignalLabel(signalKey: string | null | undefined, signalLabel: string | null | undefined): string {
  return (
    resolveApprovedSignalDisplayLabel(signalKey)
    ?? resolveApprovedSignalDisplayLabel(signalLabel)
    ?? cleanResultCopy(signalLabel ?? '')
  );
}

function hasStrongSignalLanguage(value: string): boolean {
  return STRONG_SIGNAL_LANGUAGE_PATTERNS.some((pattern) => pattern.test(value));
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

function getSignalSemanticState(
  tier: SingleDomainSignalNarrativeTier,
): SingleDomainSignalNarrativeSemanticState {
  switch (tier) {
    case 'primary':
      return 'dominant';
    case 'secondary':
      return 'reinforcing';
    case 'supporting':
      return 'contextual';
    case 'underplayed':
    default:
      return 'underplayed';
  }
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

type SignalNarrativeCopyRole =
  | 'chapter_intro'
  | 'how_it_shows_up'
  | 'value_outcome'
  | 'team_effect'
  | 'risk_behaviour'
  | 'risk_impact'
  | 'development_line';

function buildSignalFallbackCopy(params: {
  tier: SingleDomainSignalNarrativeTier;
  role: SignalNarrativeCopyRole;
  signalLabel: string;
  normalizedScore: number;
}): string {
  const isZeroSignal = params.normalizedScore <= 0;

  if (params.tier === 'secondary') {
    switch (params.role) {
      case 'chapter_intro':
        return `${params.signalLabel} gives this domain steady support, but it works behind the leading signal rather than setting the tone on its own.`;
      case 'how_it_shows_up':
        return `It shows up consistently, although it is not the main force shaping this pattern.`;
      case 'value_outcome':
        return `It adds useful range and follow-through without carrying the same weight as the strongest signal here.`;
      case 'team_effect':
        return `Other people are likely to notice it as a clear influence, but not as the defining feature of your approach.`;
      default:
        return '';
    }
  }

  if (params.tier === 'supporting') {
    switch (params.role) {
      case 'chapter_intro':
        return `${params.signalLabel} adds context to this domain, but it stays in a supporting position rather than defining the pattern.`;
      case 'how_it_shows_up':
        return `It appears in the background of this result and adds nuance without leading your behaviour here.`;
      case 'value_outcome':
        return `It contributes some useful range, but it is not a primary driver in this domain.`;
      case 'team_effect':
        return `Others may notice it in moments, though it is not the strongest signal they are likely to experience.`;
      default:
        return '';
    }
  }

  switch (params.role) {
    case 'chapter_intro':
      return isZeroSignal
        ? `${params.signalLabel} is less present in this result and is not a primary driver in this domain.`
        : `${params.signalLabel} sits further in the background here and tends to take a back seat to the leading signals.`;
    case 'how_it_shows_up':
      return isZeroSignal
        ? `It does not show up as an instinctive pattern here and is less relied on than the stronger signals in this domain.`
        : `It appears more occasionally here and is less instinctive than the leading parts of the pattern.`;
    case 'value_outcome':
      return `Its contribution is lighter in this result, so it adds context rather than momentum.`;
    case 'team_effect':
      return `Other people are less likely to experience this as a defining force in how you operate here.`;
    case 'risk_behaviour':
      return `Because it is less present, it is less likely to overreach unless the context starts demanding more of it.`;
    case 'risk_impact':
      return isZeroSignal
        ? `In this result, it is not a primary driver and tends to stay in the background unless the situation clearly calls for it.`
        : `In this result, it stays less relied on and usually takes a back seat unless the context calls it forward.`;
    case 'development_line':
      return `If the situation needs more of this signal, bring it in deliberately rather than expecting it to lead on instinct.`;
    default:
      return '';
  }
}

function gateSignalNarrativeCopy(params: {
  tier: SingleDomainSignalNarrativeTier;
  role: SignalNarrativeCopyRole;
  signalLabel: string;
  normalizedScore: number;
  source: string | null | undefined;
}): string {
  const cleaned = cleanNullableCopy(params.source);

  if (params.tier === 'primary') {
    return cleaned;
  }

  if (params.tier === 'underplayed') {
    const fallback = buildSignalFallbackCopy(params);

    if (params.role === 'chapter_intro') {
      return fallback;
    }

    if (!cleaned || hasStrongSignalLanguage(cleaned)) {
      return fallback;
    }

    return cleaned;
  }

  if (params.tier === 'secondary' || params.tier === 'supporting') {
    if (hasStrongSignalLanguage(cleaned)) {
      const fallback = buildSignalFallbackCopy(params);
      return fallback || cleaned;
    }
  }

  return cleaned;
}

function getNarrativeSections(signal: SingleDomainResultPayload['signals'][number]): readonly SingleDomainSignalNarrativeSection[] {
  const tier = getSignalNarrativeTier(signal);
  const signalLabel = getApprovedSignalLabel(signal.signal_key, signal.signal_label);
  const allSections: readonly SingleDomainSignalNarrativeSection[] = Object.freeze([
    {
      key: 'how_it_shows_up',
      label: 'How it shows up',
      body: gateSignalNarrativeCopy({
        tier,
        role: 'how_it_shows_up',
        signalLabel,
        normalizedScore: signal.normalized_score,
        source: signal.chapter_how_it_shows_up,
      }),
    },
    {
      key: 'value_outcome',
      label: 'What it adds',
      body: gateSignalNarrativeCopy({
        tier,
        role: 'value_outcome',
        signalLabel,
        normalizedScore: signal.normalized_score,
        source: signal.chapter_value_outcome,
      }),
    },
    {
      key: 'team_effect',
      label: 'Effect on others',
      body: gateSignalNarrativeCopy({
        tier,
        role: 'team_effect',
        signalLabel,
        normalizedScore: signal.normalized_score,
        source: signal.chapter_value_team_effect,
      }),
    },
    {
      key: 'risk_behaviour',
      label: 'When it overreaches',
      body: gateSignalNarrativeCopy({
        tier,
        role: 'risk_behaviour',
        signalLabel,
        normalizedScore: signal.normalized_score,
        source: signal.chapter_risk_behaviour,
      }),
    },
    {
      key: 'risk_impact',
      label: 'What to watch',
      body: gateSignalNarrativeCopy({
        tier,
        role: 'risk_impact',
        signalLabel,
        normalizedScore: signal.normalized_score,
        source: signal.chapter_risk_impact,
      }),
    },
    {
      key: 'development_line',
      label: 'How to stretch it',
      body: gateSignalNarrativeCopy({
        tier,
        role: 'development_line',
        signalLabel,
        normalizedScore: signal.normalized_score,
        source: signal.chapter_development,
      }),
    },
  ]);

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
  const resolvedPairLabel = resolveApprovedPairDisplayLabel(payload.hero.pair_key);
  const pairSignalLabels =
    resolvedPairLabel
      ? resolvedPairLabel.split(/\s+and\s+/)
      : orderedSignals.slice(0, 2).map((signal) => (
        resolveApprovedSignalDisplayLabel(signal.signal_key)
        ?? resolveApprovedSignalDisplayLabel(signal.signal_label)
        ?? cleanResultCopy(signal.signal_label)
      ));
  const pairLabel =
    resolvedPairLabel
    ?? (pairSignalLabels.length >= 2
      ? `${pairSignalLabels[0]} and ${pairSignalLabels[1]}`
      : cleanResultCopy(payload.hero.pair_key));

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
      ...(() => {
        const tier = getSignalNarrativeTier(signal);
        const signalLabel = getApprovedSignalLabel(signal.signal_key, signal.signal_label);
        return {
          tier,
          semanticState: getSignalSemanticState(tier),
          positionLabel: getSignalPositionLabel(tier),
          chapterIntro: gateSignalNarrativeCopy({
            tier,
            role: 'chapter_intro',
            signalLabel,
            normalizedScore: signal.normalized_score,
            source: signal.chapter_intro,
          }),
        };
      })(),
      anchorId: `signal-${String(signal.rank).padStart(2, '0')}`,
      signalKey: signal.signal_key,
      signalLabel: getApprovedSignalLabel(signal.signal_key, signal.signal_label),
      rank: signal.rank,
      normalizedScore: signal.normalized_score,
      rawScore: signal.raw_score,
      howItShowsUp: gateSignalNarrativeCopy({
        tier: getSignalNarrativeTier(signal),
        role: 'how_it_shows_up',
        signalLabel: getApprovedSignalLabel(signal.signal_key, signal.signal_label),
        normalizedScore: signal.normalized_score,
        source: signal.chapter_how_it_shows_up,
      }),
      valueOutcome: gateSignalNarrativeCopy({
        tier: getSignalNarrativeTier(signal),
        role: 'value_outcome',
        signalLabel: getApprovedSignalLabel(signal.signal_key, signal.signal_label),
        normalizedScore: signal.normalized_score,
        source: signal.chapter_value_outcome,
      }),
      teamEffect: gateSignalNarrativeCopy({
        tier: getSignalNarrativeTier(signal),
        role: 'team_effect',
        signalLabel: getApprovedSignalLabel(signal.signal_key, signal.signal_label),
        normalizedScore: signal.normalized_score,
        source: signal.chapter_value_team_effect,
      }),
      riskBehaviour: gateSignalNarrativeCopy({
        tier: getSignalNarrativeTier(signal),
        role: 'risk_behaviour',
        signalLabel: getApprovedSignalLabel(signal.signal_key, signal.signal_label),
        normalizedScore: signal.normalized_score,
        source: signal.chapter_risk_behaviour,
      }),
      riskImpact: gateSignalNarrativeCopy({
        tier: getSignalNarrativeTier(signal),
        role: 'risk_impact',
        signalLabel: getApprovedSignalLabel(signal.signal_key, signal.signal_label),
        normalizedScore: signal.normalized_score,
        source: signal.chapter_risk_impact,
      }),
      developmentLine: gateSignalNarrativeCopy({
        tier: getSignalNarrativeTier(signal),
        role: 'development_line',
        signalLabel: getApprovedSignalLabel(signal.signal_key, signal.signal_label),
        normalizedScore: signal.normalized_score,
        source: signal.chapter_development,
      }),
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
        signal_label:
          resolveApprovedSignalDisplayLabel(item.signal_key)
          ?? resolveApprovedSignalDisplayLabel(item.signal_label)
          ?? cleanResultCopy(item.signal_label),
        statement: cleanResultCopy(item.statement),
      })),
      watchouts: payload.application.watchouts.map((item) => ({
        ...item,
        signal_label:
          resolveApprovedSignalDisplayLabel(item.signal_key)
          ?? resolveApprovedSignalDisplayLabel(item.signal_label)
          ?? cleanResultCopy(item.signal_label),
        statement: cleanResultCopy(item.statement),
      })),
      developmentFocus: payload.application.developmentFocus.map((item) => ({
        ...item,
        signal_label:
          resolveApprovedSignalDisplayLabel(item.signal_key)
          ?? resolveApprovedSignalDisplayLabel(item.signal_label)
          ?? cleanResultCopy(item.signal_label),
        statement: cleanResultCopy(item.statement),
      })),
    },
  };
}

export { SINGLE_DOMAIN_RESULTS_BRIDGE_LINE };
