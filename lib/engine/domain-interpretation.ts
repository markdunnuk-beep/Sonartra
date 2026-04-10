import type {
  DomainBlendProfile,
  DomainInterpretationInput,
  DomainInterpretationOutput,
  NormalizedDomainSummary,
  NormalizedSignalScore,
  ResultInterpretationContext,
  SentenceFragmentCategory,
  SignalIntensityBand,
  SignalKey,
} from '@/lib/engine/types';
import { sortDomainSignalsForDisplay } from '@/lib/engine/domain-signal-ranking';

/**
 * Current domain-language ownership for persisted domain chapters:
 * - Active: Domain_Language.chapterOpening -> domainSummaries[*].interpretation.summary
 * - Legacy read compatibility: Domain_Language.summary -> domainSummaries[*].interpretation.summary
 *
 * Supporting and tension lines remain deterministic engine output. Domain summary
 * is the only authored override applied inside interpretation assembly itself.
 */
type CoreDomainKey =
  | 'signal_style'
  | 'signal_mot'
  | 'signal_lead'
  | 'signal_conflict'
  | 'signal_culture'
  | 'signal_stress';

type DomainInterpretationContext = {
  input: DomainInterpretationInput;
  primarySignal: NormalizedSignalScore | null;
  secondarySignal: NormalizedSignalScore | null;
  primaryBand: SignalIntensityBand | null;
  secondaryBand: SignalIntensityBand | null;
  blendProfile: DomainBlendProfile | null;
  primarySecondaryGap: number | null;
};

type SignalFragmentSet = Partial<Record<SentenceFragmentCategory, string>> & {
  label: string;
  core_trait: string;
  supporting_line: string;
  risk_clause: string;
};

type PairwiseInterpretationRule = {
  key: string;
  domainKey: CoreDomainKey;
  primarySignalKey: SignalKey;
  secondarySignalKey: SignalKey;
  summary: string;
  supportingLine?: string;
  tensionClause?: string;
};

const CORE_DOMAIN_KEYS = new Set<CoreDomainKey>([
  'signal_style',
  'signal_mot',
  'signal_lead',
  'signal_conflict',
  'signal_culture',
  'signal_stress',
]);

const DOMAIN_EMPTY_SUMMARIES: Record<CoreDomainKey, string> = {
  signal_style: 'A clear working-style pattern was not available in this domain.',
  signal_mot: 'A clear motivation pattern was not available in this domain.',
  signal_lead: 'A clear leadership pattern was not available in this domain.',
  signal_conflict: 'A clear conflict pattern was not available in this domain.',
  signal_culture: 'A clear culture-fit pattern was not available in this domain.',
  signal_stress: 'A clear pressure pattern was not available in this domain.',
};

function toInterpretationInput(domainSummary: NormalizedDomainSummary): DomainInterpretationInput {
  const rankedSignals = getRankedSignals(domainSummary.signalScores);
  const primarySignal = rankedSignals[0] ?? null;
  const secondarySignal = rankedSignals[1] ?? null;

  return {
    domainKey: domainSummary.domainKey,
    primarySignalKey: primarySignal?.signalKey ?? null,
    primaryPercent: primarySignal?.domainPercentage ?? null,
    secondarySignalKey: secondarySignal?.signalKey ?? null,
    secondaryPercent: secondarySignal?.domainPercentage ?? null,
    rankedSignals: rankedSignals.map((signalScore) => ({
      signalKey: signalScore.signalKey,
      percent: signalScore.domainPercentage,
    })),
  };
}

function toPairToken(signalKey: string): string {
  const segments = signalKey.split('_').filter((segment) => segment.length > 0);
  const rawToken = segments[segments.length - 1] ?? signalKey;

  switch (rawToken) {
    case 'adhocracy':
      return 'creative';
    case 'market':
      return 'competitive';
    case 'clan':
      return 'collaborative';
    case 'hierarchy':
      return 'structured';
    case 'avoid':
      return 'avoidance';
    default:
      return rawToken;
  }
}

function buildPairTokenKey(primarySignalKey: string, secondarySignalKey: string): string | null {
  const primaryToken = toPairToken(primarySignalKey);
  const secondaryToken = toPairToken(secondarySignalKey);

  if (!primaryToken || !secondaryToken || primaryToken === secondaryToken) {
    return null;
  }

  return [primaryToken, secondaryToken].sort((left, right) => left.localeCompare(right)).join('_');
}

function getRankedSignals(signalScores: readonly NormalizedSignalScore[]): readonly NormalizedSignalScore[] {
  return sortDomainSignalsForDisplay(signalScores);
}

export function resolveSignalIntensityBand(percent: number): SignalIntensityBand {
  if (percent >= 45) {
    return 'dominant';
  }

  if (percent >= 34) {
    return 'strong';
  }

  if (percent >= 24) {
    return 'moderate';
  }

  if (percent >= 12) {
    return 'secondary';
  }

  return 'low';
}

function resolveBlendProfile(primaryPercent: number | null, secondaryPercent: number | null): DomainBlendProfile | null {
  if (primaryPercent === null) {
    return null;
  }

  const gap = primaryPercent - (secondaryPercent ?? 0);
  if (primaryPercent >= 45 || gap >= 18) {
    return 'concentrated';
  }

  if (secondaryPercent !== null && gap <= 7) {
    return 'balanced';
  }

  return 'layered';
}

function buildContext(domainSummary: NormalizedDomainSummary): DomainInterpretationContext {
  const input = toInterpretationInput(domainSummary);
  const rankedSignals = getRankedSignals(domainSummary.signalScores);
  const primarySignal = rankedSignals[0] ?? null;
  const secondarySignal = rankedSignals[1] ?? null;
  const primaryPercent = primarySignal?.domainPercentage ?? null;
  const secondaryPercent = secondarySignal?.domainPercentage ?? null;

  return {
    input,
    primarySignal,
    secondarySignal,
    primaryBand: primaryPercent === null ? null : resolveSignalIntensityBand(primaryPercent),
    secondaryBand: secondaryPercent === null ? null : resolveSignalIntensityBand(secondaryPercent),
    blendProfile: resolveBlendProfile(primaryPercent, secondaryPercent),
    primarySecondaryGap:
      primaryPercent === null ? null : primaryPercent - (secondaryPercent ?? 0),
  };
}

function getIntensityQualifier(band: SignalIntensityBand | null): string {
  switch (band) {
    case 'dominant':
      return 'strongly';
    case 'strong':
      return 'clearly';
    case 'moderate':
      return 'consistently';
    case 'secondary':
      return 'partly';
    case 'low':
      return 'lightly';
    default:
      return 'clearly';
  }
}

const SIGNAL_FRAGMENTS: Record<string, SignalFragmentSet> = {
  style_driver: {
    label: 'Driver',
    core_trait: 'results-focused and direct',
    pace_orientation: 'move quickly toward outcomes and make the call visible',
    decision_orientation: 'prefer clarity, pace, and decisive ownership',
    balancing_clause: 'still needing enough alignment to keep people with the direction',
    supporting_line: 'This pattern often works well when momentum, ownership, and visible progress matter.',
    risk_clause: 'If overextended, pace may outstrip consultation and reduce patience with slower contributors.',
  },
  style_influencer: {
    label: 'Influencer',
    core_trait: 'engaging, visible, and momentum-building',
    pace_orientation: 'build energy quickly by making ideas visible and involving others early',
    collaboration_orientation: 'work through connection, persuasion, and visible encouragement',
    balancing_clause: 'still needing enough structure to convert energy into follow-through',
    supporting_line: 'This pattern often works well when buy-in, visibility, and momentum matter as much as the plan.',
    risk_clause: 'If overextended, communication can outrun depth, detail, or disciplined follow-through.',
  },
  style_operator: {
    label: 'Operator',
    core_trait: 'steady, dependable, and execution-focused',
    pace_orientation: 'keep work moving through consistency, follow-through, and practical discipline',
    decision_orientation: 'prefer reliability, continuity, and low-disruption delivery',
    balancing_clause: 'still needing enough flexibility to adjust when conditions change',
    supporting_line: 'This pattern often works well when consistency, delivery discipline, and trust matter.',
    risk_clause: 'If overextended, steadiness can become caution or unnecessary resistance to change.',
  },
  style_analyst: {
    label: 'Analyst',
    core_trait: 'structured, logical, and accuracy-oriented',
    pace_orientation: 'slow the situation down long enough to test the logic and improve the quality of the call',
    decision_orientation: 'prefer evidence, precision, and clear reasoning before committing',
    balancing_clause: 'still needing enough pace to avoid over-analysis',
    supporting_line: 'This pattern often works well when accuracy, judgement, and problem-solving quality matter.',
    risk_clause: 'If overextended, caution or over-analysis may delay movement more than the context requires.',
  },
  mot_achievement: {
    label: 'Achievement',
    core_trait: 'driven by progress, stretch, and visible success',
    decision_orientation: 'links effort to targets, momentum, and measurable outcomes',
    supporting_line: 'Energy is usually strongest when effort links clearly to progress and tangible results.',
    risk_clause: 'If overextended, value can become tied too narrowly to winning, pace, or external proof of progress.',
  },
  mot_influence: {
    label: 'Influence',
    core_trait: 'energised by visibility, reach, and the chance to shape others',
    collaboration_orientation: 'stays engaged when ideas can travel, connect, and shift the wider picture',
    supporting_line: 'Energy is usually strongest when there is room to persuade, connect, and create visible impact.',
    risk_clause: 'If overextended, attention may drift toward exposure or recognition over substance or staying power.',
  },
  mot_stability: {
    label: 'Stability',
    core_trait: 'motivated by reliability, security, and low-friction execution',
    environment_preference: 'stays engaged when expectations are clear and the environment feels dependable',
    supporting_line: 'Energy is usually strongest when work feels stable enough to build confidence and consistency.',
    risk_clause: 'If overextended, change or ambiguity may feel less worthwhile than they really are.',
  },
  mot_mastery: {
    label: 'Mastery',
    core_trait: 'motivated by expertise, quality, and continual improvement',
    decision_orientation: 'stays engaged when there is room to deepen capability and raise standards',
    supporting_line: 'Energy is usually strongest when the work rewards learning, quality, and stronger judgement.',
    risk_clause: 'If overextended, standards can become so exacting that progress feels harder to sustain.',
  },
  lead_results: {
    label: 'Results',
    core_trait: 'sets direction through standards, accountability, and delivery',
    pace_orientation: 'make expectations clear and keep pressure on execution',
    supporting_line: 'This leadership pattern often works well when outcomes, pace, and accountability need to tighten quickly.',
    risk_clause: 'If overextended, challenge can outrun support and make the leadership feel overly hard-edged.',
  },
  lead_vision: {
    label: 'Vision',
    core_trait: 'sets direction through future focus, belief, and momentum',
    collaboration_orientation: 'bring people forward by giving them a bigger picture to move toward',
    supporting_line: 'This leadership pattern often works well when people need meaning, momentum, and a clear future direction.',
    risk_clause: 'If overextended, inspiration can outrun detail, discipline, or operational grip.',
  },
  lead_people: {
    label: 'People',
    core_trait: 'leads through trust, support, and team development',
    collaboration_orientation: 'bring people along through coaching, attention, and steady support',
    supporting_line: 'This leadership pattern often works well when trust, engagement, and development are central to performance.',
    risk_clause: 'If overextended, harmony or support may crowd out challenge and harder performance calls.',
  },
  lead_process: {
    label: 'Process',
    core_trait: 'leads through structure, clarity, and system discipline',
    decision_orientation: 'set direction by creating order, roles, and dependable operating rhythm',
    supporting_line: 'This leadership pattern often works well when consistency, clarity, and repeatable execution matter.',
    risk_clause: 'If overextended, control or process fidelity can slow adaptation and initiative.',
  },
  conflict_compete: {
    label: 'Compete',
    core_trait: 'firm, direct, and resolution-seeking in disagreement',
    tension_pattern: 'surface tension quickly and push for a clear position',
    supporting_line: 'This can help when disagreement needs to be surfaced directly instead of softened or delayed.',
    risk_clause: 'If overextended, disagreement can harden into pressure, defensiveness, or win-lose framing.',
  },
  conflict_collaborate: {
    label: 'Collaborate',
    core_trait: 'solution-focused and keen to work through tension together',
    tension_pattern: 'keep people in the conversation and work toward a stronger shared answer',
    supporting_line: 'This can help when disagreement needs open dialogue, shared ownership, and better-quality resolution.',
    risk_clause: 'If overextended, the process can become slower or too dependent on everyone staying engaged.',
  },
  conflict_compromise: {
    label: 'Compromise',
    core_trait: 'middle-ground seeking and practically adaptive in disagreement',
    tension_pattern: 'look for workable movement that both sides can live with',
    supporting_line: 'This can help when tension needs to reduce quickly and a practical way forward matters more than a perfect answer.',
    risk_clause: 'If overextended, the middle ground may be reached before the real issue is fully worked through.',
  },
  conflict_accommodate: {
    label: 'Accommodate',
    core_trait: 'harmony-preserving and relationship-conscious in disagreement',
    tension_pattern: 'reduce friction by adjusting, yielding, or lowering the emotional temperature',
    supporting_line: 'This can help when the relationship needs protecting and direct escalation would do more harm than good.',
    risk_clause: 'If overextended, personal needs or harder truths may be suppressed for too long.',
  },
  conflict_avoid: {
    label: 'Avoid',
    core_trait: 'cautious, low-exposure, and inclined to step back from friction',
    tension_pattern: 'create space until emotion, risk, or uncertainty feels more manageable',
    supporting_line: 'This can help when immediate confrontation would only intensify noise rather than improve the outcome.',
    risk_clause: 'If overextended, important issues may remain under-addressed until they become harder to recover cleanly.',
  },
  culture_market: {
    label: 'Market',
    core_trait: 'prefers pace, competition, and visible performance standards',
    environment_preference: 'operate best where outcomes are clear and accountability is high',
    supporting_line: 'Fit is often strongest where targets, ownership, and commercial pressure are visible.',
    risk_clause: 'If overextended, cultures that value reflection or consensus may feel slower than they really are.',
  },
  culture_adhocracy: {
    label: 'Adhocracy',
    core_trait: 'prefers experimentation, innovation, and room to move',
    environment_preference: 'operate best where initiative, change, and fresh thinking are rewarded',
    supporting_line: 'Fit is often strongest where curiosity, initiative, and movement are encouraged.',
    risk_clause: 'If overextended, looser environments may be preferred even when they need more discipline than they appear to.',
  },
  culture_clan: {
    label: 'Clan',
    core_trait: 'prefers trust, cohesion, and people-centred collaboration',
    environment_preference: 'operate best where support, belonging, and team connection are visible',
    supporting_line: 'Fit is often strongest where relationships, trust, and collaboration shape how work gets done.',
    risk_clause: 'If overextended, harder-edged or highly political environments may feel disproportionately draining.',
  },
  culture_hierarchy: {
    label: 'Hierarchy',
    core_trait: 'prefers clarity, structure, and dependable process',
    environment_preference: 'operate best where roles, expectations, and control points are clear',
    supporting_line: 'Fit is often strongest where order, predictability, and process discipline are respected.',
    risk_clause: 'If overextended, looser environments may feel harder to trust even when they are workable.',
  },
  stress_control: {
    label: 'Control',
    core_trait: 'tightens grip, pace, and standards under pressure',
    stress_expression: 'become more directive, less tolerant of delay, and quicker to take over',
    supporting_line: 'The early sign is often a sharper push for control, pace, and certainty.',
    risk_clause: 'If unmanaged, others may experience the pressure response as harder, tighter, or less trusting.',
  },
  stress_scatter: {
    label: 'Scatter',
    core_trait: 'loses focus and becomes more diffuse under pressure',
    stress_expression: 'shift attention quickly, react to noise, and find it harder to hold one line cleanly',
    supporting_line: 'The early sign is often rising activity without the same level of clear prioritisation.',
    risk_clause: 'If unmanaged, energy can spread too widely and important decisions may become less disciplined.',
  },
  stress_avoidance: {
    label: 'Avoidance',
    core_trait: 'withdraws, delays, or lowers exposure under pressure',
    stress_expression: 'pull back from difficult conversations or unresolved issues until the temperature drops',
    supporting_line: 'The early sign is often more distance from tension, ambiguity, or emotionally loaded conversations.',
    risk_clause: 'If unmanaged, necessary issues may sit too long and become harder to resolve directly.',
  },
  stress_criticality: {
    label: 'Criticality',
    core_trait: 'becomes more exacting, critical, and fault-focused under pressure',
    stress_expression: 'raise standards, notice flaws quickly, and become less tolerant of weak thinking',
    supporting_line: 'The early sign is often sharper scrutiny, more fault-finding, and a lower tolerance for looseness.',
    risk_clause: 'If unmanaged, pressure can come through as excessive criticism or perfectionism.',
  },
};

const PAIRWISE_RULES: readonly PairwiseInterpretationRule[] = [
  { key: 'style_driver_influencer', domainKey: 'signal_style', primarySignalKey: 'style_driver', secondarySignalKey: 'style_influencer', summary: 'Moves quickly toward outcomes and tends to set direction early, while using visibility and engagement to bring people with the pace rather than leaving them behind it. This often lands as energetic and galvanising, though at times faster-moving than more reflective styles prefer.', supportingLine: 'This often creates momentum fast, especially when a team needs both urgency and belief in where the work is heading.', tensionClause: 'The pace can become limiting if alignment is assumed too quickly or enthusiasm starts to stand in for full scrutiny.' },
  { key: 'style_driver_operator', domainKey: 'signal_style', primarySignalKey: 'style_driver', secondarySignalKey: 'style_operator', summary: 'A strongly execution-focused style that combines urgency with reliability. Tends to push for outcomes quickly while still wanting disciplined follow-through and practical control.' },
  { key: 'style_driver_analyst', domainKey: 'signal_style', primarySignalKey: 'style_driver', secondarySignalKey: 'style_analyst', summary: 'Moves quickly toward outcomes and tends to set direction early, while still relying on logic and structure to keep decisions clear, defensible, and well grounded. This can be experienced as decisive and dependable, though at times faster-moving than more reflective styles prefer.', supportingLine: 'This pattern is often effective when action matters but the reasoning also needs to hold up under pressure or scrutiny.', tensionClause: 'It can become limiting when urgency cuts short reflection, or when precision slows decisions that need a firmer call.' },
  { key: 'style_influencer_driver', domainKey: 'signal_style', primarySignalKey: 'style_influencer', secondarySignalKey: 'style_driver', summary: 'An engaging, fast-moving style that builds momentum through visibility and directness. Tends to win people into the direction early, then keep pushing until the outcome feels real and immediate.' },
  { key: 'style_influencer_operator', domainKey: 'signal_style', primarySignalKey: 'style_influencer', secondarySignalKey: 'style_operator', summary: 'A relational, momentum-building style with a steady delivery bias. Tends to keep people engaged while creating enough consistency for plans to land in practice.' },
  { key: 'style_influencer_analyst', domainKey: 'signal_style', primarySignalKey: 'style_influencer', secondarySignalKey: 'style_analyst', summary: 'An expressive, people-facing style supported by clear thinking and structure. Tends to communicate ideas with energy while still wanting the logic to hold up under scrutiny, which can make the style feel both engaging and thought-through when the balance holds.' },
  { key: 'style_operator_driver', domainKey: 'signal_style', primarySignalKey: 'style_operator', secondarySignalKey: 'style_driver', summary: 'A dependable, execution-led style with a decisive edge. Tends to value consistency and follow-through, but will raise the pace quickly when outcomes or accountability are at stake, which can reassure others in steady conditions and feel firmer when patience runs short.' },
  { key: 'style_operator_influencer', domainKey: 'signal_style', primarySignalKey: 'style_operator', secondarySignalKey: 'style_influencer', summary: 'A steady, approachable style that combines reliability with visible encouragement. Tends to create trust through consistency while keeping people included and informed.' },
  { key: 'style_operator_analyst', domainKey: 'signal_style', primarySignalKey: 'style_operator', secondarySignalKey: 'style_analyst', summary: 'A measured, disciplined style with a strong preference for logic and precision. Tends to work carefully, keep commitments, and reduce avoidable disruption through planning and control.' },
  { key: 'style_analyst_driver', domainKey: 'signal_style', primarySignalKey: 'style_analyst', secondarySignalKey: 'style_driver', summary: 'A structured, analytical style with a clear results bias. Tends to test the logic first, then move decisively once the case feels sound.' },
  { key: 'style_analyst_influencer', domainKey: 'signal_style', primarySignalKey: 'style_analyst', secondarySignalKey: 'style_influencer', summary: 'A thoughtful, evidence-led style that still values communication and visibility. Tends to explain the reasoning clearly and bring others with the logic rather than relying on force alone.' },
  { key: 'style_analyst_operator', domainKey: 'signal_style', primarySignalKey: 'style_analyst', secondarySignalKey: 'style_operator', summary: 'A highly structured style built on accuracy, consistency, and dependable execution. Tends to create order, reduce ambiguity, and move forward carefully rather than impulsively.' },

  { key: 'mot_achievement_influence', domainKey: 'signal_mot', primarySignalKey: 'mot_achievement', secondarySignalKey: 'mot_influence', summary: 'Effort rises when progress is visible and the work creates a noticeable mark on people, outcomes, or the wider direction. Motivation is strongest when momentum can be seen and felt, not just privately measured.', supportingLine: 'This usually shows up as high energy around stretch goals, visible wins, and work that carries reach beyond the immediate task.', tensionClause: 'It can lose traction if recognition replaces substance, or if steady progress feels too slow to be meaningful.' },
  { key: 'mot_achievement_stability', domainKey: 'signal_mot', primarySignalKey: 'mot_achievement', secondarySignalKey: 'mot_stability', summary: 'Effort is pulled by progress and tangible achievement, but tends to last best when the path feels reliable enough to trust. Stretch matters, though so does having enough stability to build momentum without unnecessary drag.', supportingLine: 'This combination often works well in roles that reward progress while still providing clear expectations, support, and a workable base.', tensionClause: 'Motivation can dip when progress feels blocked by instability, or when stability is maintained so tightly that stretch starts to disappear.' },
  { key: 'mot_achievement_mastery', domainKey: 'signal_mot', primarySignalKey: 'mot_achievement', secondarySignalKey: 'mot_mastery', summary: 'Effort is driven by improvement that can be seen and earned. Engagement usually stays high when stretch goals also build expertise, quality, or a stronger standard of work.' },
  { key: 'mot_influence_achievement', domainKey: 'signal_mot', primarySignalKey: 'mot_influence', secondarySignalKey: 'mot_achievement', summary: 'Effort is energised by reach, visibility, and the sense of making something happen. Engagement tends to stay high when influence also produces clear progress and recognisable outcomes.' },
  { key: 'mot_influence_stability', domainKey: 'signal_mot', primarySignalKey: 'mot_influence', secondarySignalKey: 'mot_stability', summary: 'Effort is energised by shaping people and outcomes, but it lasts best in environments that feel steady enough to trust. Visibility matters, though not at the cost of consistency or dependable support.' },
  { key: 'mot_influence_mastery', domainKey: 'signal_mot', primarySignalKey: 'mot_influence', secondarySignalKey: 'mot_mastery', summary: 'Effort is energised by the chance to shape others through credible expertise. Engagement often rises when ideas can travel outward and still be backed by depth, quality, or specialist confidence.' },
  { key: 'mot_stability_achievement', domainKey: 'signal_mot', primarySignalKey: 'mot_stability', secondarySignalKey: 'mot_achievement', summary: 'Effort is sustained by reliability, clarity, and a stable base, with added energy from visible progress. Predictability matters, but motivation increases when steady work also leads somewhere meaningful.' },
  { key: 'mot_stability_influence', domainKey: 'signal_mot', primarySignalKey: 'mot_stability', secondarySignalKey: 'mot_influence', summary: 'Effort is sustained by consistency and a dependable environment, with a secondary lift from connection and reach. Engagement tends to hold best when there is both relational impact and enough stability to trust the path.' },
  { key: 'mot_stability_mastery', domainKey: 'signal_mot', primarySignalKey: 'mot_stability', secondarySignalKey: 'mot_mastery', summary: 'Effort is sustained by steady conditions, clear expectations, and the chance to get better over time. Engagement is likely to stay strongest when reliability and growing expertise reinforce each other.' },
  { key: 'mot_mastery_achievement', domainKey: 'signal_mot', primarySignalKey: 'mot_mastery', secondarySignalKey: 'mot_achievement', summary: 'Effort is pulled by high standards, capability growth, and work that feels worth doing well. Engagement tends to deepen when improving quality also leads to visible progress or recognised success.' },
  { key: 'mot_mastery_influence', domainKey: 'signal_mot', primarySignalKey: 'mot_mastery', secondarySignalKey: 'mot_influence', summary: 'Effort is pulled by expertise and improvement, with added energy from being able to shape others through that strength. Engagement tends to rise when credibility and influence grow together.' },
  { key: 'mot_mastery_stability', domainKey: 'signal_mot', primarySignalKey: 'mot_mastery', secondarySignalKey: 'mot_stability', summary: 'Effort is pulled by learning, quality, and strong craft, but best sustained in an environment that feels reliable and low-friction. Engagement often strengthens when there is room to improve without constant disruption.' },

  { key: 'lead_results_vision', domainKey: 'signal_lead', primarySignalKey: 'lead_results', secondarySignalKey: 'lead_vision', summary: 'Sets a strong line on outcomes while giving people a clear sense of where the work is heading and why it matters. Direction tends to feel purposeful as well as demanding, which can create momentum quickly when pace matters.', supportingLine: 'This often lands well when people need both sharper accountability and a reason to stretch beyond the immediate task.', tensionClause: 'The balance can slip if vision outruns follow-through, or if delivery pressure starts to crowd out reflection and commitment.' },
  { key: 'lead_results_people', domainKey: 'signal_lead', primarySignalKey: 'lead_results', secondarySignalKey: 'lead_people', summary: 'Leadership tends to be performance-led, but not purely hard-edged. Outcomes come first, while support and trust still matter enough to keep people engaged behind the standard, which can feel both clear and fair when the balance holds.', supportingLine: 'This often works well when standards need to stay visible without making support feel secondary or optional.', tensionClause: 'It can lose effectiveness if accountability starts to outrun coaching, or if support softens the standard once a firmer call is needed.' },
  { key: 'lead_results_process', domainKey: 'signal_lead', primarySignalKey: 'lead_results', secondarySignalKey: 'lead_process', summary: 'Leadership tends to be outcome-led with a strong preference for clear structure. Direction is usually set through standards, accountability, and systems that keep execution on track.' },
  { key: 'lead_vision_results', domainKey: 'signal_lead', primarySignalKey: 'lead_vision', secondarySignalKey: 'lead_results', summary: 'Leadership tends to create momentum by connecting people to a compelling direction, then tightening toward delivery. This can feel energising and clear when pace matters, though it still relies on enough follow-through to turn intent into visible outcomes.', supportingLine: 'This often works well when people need belief in where the work is going as well as confidence that it will actually land.', tensionClause: 'The pattern can lose force if inspiration outruns execution, or if delivery pressure arrives so abruptly that people feel pushed rather than brought with the work.' },
  { key: 'lead_vision_people', domainKey: 'signal_lead', primarySignalKey: 'lead_vision', secondarySignalKey: 'lead_people', summary: 'Leadership tends to bring people along through belief, encouragement, and a sense of shared direction. The emphasis is on momentum with meaning, which can make the leadership feel engaging and inclusive rather than purely top-down.', supportingLine: 'This often works well when people need encouragement, connection, and a clearer sense of why the work matters.', tensionClause: 'It can become less effective if encouragement starts replacing harder calls, or if shared belief is expected to carry more weight than disciplined follow-through.' },
  { key: 'lead_vision_process', domainKey: 'signal_lead', primarySignalKey: 'lead_vision', secondarySignalKey: 'lead_process', summary: 'Leadership tends to pair future focus with enough structure to make change usable. Big-picture direction comes first, but systems and clarity matter in turning it into action.' },
  { key: 'lead_people_results', domainKey: 'signal_lead', primarySignalKey: 'lead_people', secondarySignalKey: 'lead_results', summary: 'Leadership tends to lead with trust and support, while still holding a visible line on delivery. People are likely to feel backed, but expectations do not disappear.' },
  { key: 'lead_people_vision', domainKey: 'signal_lead', primarySignalKey: 'lead_people', secondarySignalKey: 'lead_vision', summary: 'Leadership tends to bring people with the work through support, encouragement, and a positive sense of direction. Connection matters first, though momentum still needs a clear destination if the reassurance is going to translate into movement.', supportingLine: 'This often works well when trust needs strengthening and people still need a clear reason to keep stretching into the work.', tensionClause: 'It can become limiting if support starts to blur accountability, or if the positive direction stays uplifting without becoming specific enough to guide action.' },
  { key: 'lead_people_process', domainKey: 'signal_lead', primarySignalKey: 'lead_people', secondarySignalKey: 'lead_process', summary: 'Leadership tends to support people through clarity, steadiness, and dependable structure. The emphasis is on creating an environment where expectations are clear and people can contribute with confidence.' },
  { key: 'lead_process_results', domainKey: 'signal_lead', primarySignalKey: 'lead_process', secondarySignalKey: 'lead_results', summary: 'Leadership tends to create order first, then use that structure to drive delivery. Clear systems, defined roles, and follow-through are likely to be the preferred route to performance.' },
  { key: 'lead_process_vision', domainKey: 'signal_lead', primarySignalKey: 'lead_process', secondarySignalKey: 'lead_vision', summary: 'Leadership tends to make direction usable by turning ideas into clear structures and repeatable rhythms. The future matters, but the route to it also needs to feel organised and dependable.' },
  { key: 'lead_process_people', domainKey: 'signal_lead', primarySignalKey: 'lead_process', secondarySignalKey: 'lead_people', summary: 'Leadership tends to support others through clarity, consistency, and dependable operating rhythm. People are brought along by making roles, expectations, and support feel more stable.' },

  { key: 'conflict_compete_collaborate', domainKey: 'signal_conflict', primarySignalKey: 'conflict_compete', secondarySignalKey: 'conflict_collaborate', summary: 'Tends to address tension directly and early, but usually in service of getting to a stronger shared answer rather than simply winning the exchange. The pattern is candid, active, and more willing than most to stay in the disagreement until something usable is reached.', supportingLine: 'This often helps when issues are being avoided, but the quality of the resolution still matters more than scoring a point quickly.', tensionClause: 'It can become too sharp if directness outruns collaboration, or too slow if shared resolution matters more than making the hard call.' },
  { key: 'conflict_compete_compromise', domainKey: 'signal_conflict', primarySignalKey: 'conflict_compete', secondarySignalKey: 'conflict_compromise', summary: 'Tends to engage disagreement firmly when something needs addressing, but still looks for a practical route out rather than prolonging the stand-off. This often helps meetings move when drift is the bigger risk than discomfort.', supportingLine: 'The pattern usually prioritises getting the issue onto the table and then steering it toward a workable decision.', tensionClause: 'It can become limiting if the push for movement softens important differences too early, or if urgency makes the exchange feel more pressured than productive.' },
  { key: 'conflict_compete_accommodate', domainKey: 'signal_conflict', primarySignalKey: 'conflict_compete', secondarySignalKey: 'conflict_accommodate', summary: 'Can address disagreement directly when something matters, while still keeping one eye on the relationship cost of pushing too hard. The pattern often surfaces the issue clearly, then softens the tone enough to keep the conversation usable and future working contact intact.', supportingLine: 'This can work well when the problem needs naming but the working relationship still has to function afterward.', tensionClause: 'The balance can slip if directness lands as force, or if relationship-protection takes over once the harder challenge has only partly been made.' },
  { key: 'conflict_compete_avoid', domainKey: 'signal_conflict', primarySignalKey: 'conflict_compete', secondarySignalKey: 'conflict_avoid', summary: 'May hold back from tension briefly, but once the cost of leaving it alone becomes too visible the response often turns direct and outcome-focused. This can make disagreement look delayed at first and unexpectedly firm once the issue feels unavoidable.', supportingLine: 'The pattern usually reflects caution about timing rather than comfort with leaving the issue unresolved indefinitely.', tensionClause: 'It becomes harder to manage when delay lets frustration build, because the eventual challenge can land more abruptly than the situation really needed.' },
  { key: 'conflict_collaborate_compete', domainKey: 'signal_conflict', primarySignalKey: 'conflict_collaborate', secondarySignalKey: 'conflict_compete', summary: 'Usually tries to work through disagreement openly and with others, but keeps enough edge to stop the discussion becoming polite drift. The pattern often stays constructive while still signalling that the issue needs a real answer, not just a better atmosphere.', supportingLine: 'This tends to work well when a team needs honest debate without losing forward movement or shared ownership.', tensionClause: 'It can become less effective if collaboration slows the call for too long, or if the harder edge starts to crowd out listening once time pressure rises.' },
  { key: 'conflict_collaborate_compromise', domainKey: 'signal_conflict', primarySignalKey: 'conflict_collaborate', secondarySignalKey: 'conflict_compromise', summary: 'Tends to keep disagreement active and solution-focused, while also looking for enough middle ground to help people move together again. The conversation often stays practical rather than adversarial, especially when several views need to stay engaged.', supportingLine: 'This pattern often helps in working sessions where the goal is to resolve friction without turning the exchange into a contest.', tensionClause: 'It can become limiting if common ground is reached before the real difference has been properly tested, or if the search for agreement starts to slow a needed decision.' },
  { key: 'conflict_collaborate_accommodate', domainKey: 'signal_conflict', primarySignalKey: 'conflict_collaborate', secondarySignalKey: 'conflict_accommodate', summary: 'Usually stays in disagreement with a genuine effort to keep the relationship intact and the tone constructive. The pattern often sounds measured, engaged, and considerate, which can help difficult conversations remain workable rather than defensive, though stronger differences may sometimes be softened more than the situation requires.', supportingLine: 'This is often useful when the issue matters but trust, inclusion, and future cooperation matter as well.', tensionClause: 'It can lose strength if protecting the relationship makes the challenge too soft, particularly when clearer boundaries or firmer challenge would improve the outcome.' },
  { key: 'conflict_collaborate_avoid', domainKey: 'signal_conflict', primarySignalKey: 'conflict_collaborate', secondarySignalKey: 'conflict_avoid', summary: 'Prefers to work through disagreement once the conditions feel calm enough for a constructive exchange, rather than forcing it at the hottest moment. This can help conversations stay thoughtful and less reactive, especially where escalation would only create noise.', supportingLine: 'The pattern usually waits for a workable opening, then tries to resolve the issue through shared discussion rather than positional pressure.', tensionClause: 'It becomes limiting when caution about timing delays the conversation so long that the issue hardens before collaboration even begins.' },
  { key: 'conflict_compromise_compete', domainKey: 'signal_conflict', primarySignalKey: 'conflict_compromise', secondarySignalKey: 'conflict_compete', summary: 'Usually looks for a practical middle ground, but is more willing than a purely accommodating style to push when the discussion starts drifting or avoiding the point. This can help tension move toward resolution without turning every disagreement into a drawn-out debate.', supportingLine: 'The instinct is often to keep the issue moving and land on something workable before positions harden unnecessarily.', tensionClause: 'It can become less useful if the push for movement settles too quickly for an easier answer, or if firmness arrives only after frustration has already built.' },
  { key: 'conflict_compromise_collaborate', domainKey: 'signal_conflict', primarySignalKey: 'conflict_compromise', secondarySignalKey: 'conflict_collaborate', summary: 'Tends to reduce friction by finding practical movement, while still valuing enough discussion to keep the outcome shared rather than imposed. The pattern often feels constructive and workable in meetings where people need progress without a winner and loser.', supportingLine: 'This usually helps keep disagreement from dragging on while still giving others enough voice to stay engaged in the answer.', tensionClause: 'The trade-off is that conversations can settle for a workable answer before the strongest one is found, especially when speed matters more than depth.' },
  { key: 'conflict_compromise_accommodate', domainKey: 'signal_conflict', primarySignalKey: 'conflict_compromise', secondarySignalKey: 'conflict_accommodate', summary: 'Tends to reduce tension by adapting to others or finding middle ground quickly, which can help conversations keep moving and preserve working relationships. The pattern usually lowers heat early and looks for an answer people can live with rather than a point to win.', supportingLine: 'This often works well when the disagreement is real but the cost of prolonged friction would be higher than the benefit of a harder stand.', tensionClause: 'Important differences can be softened too early, particularly when clearer challenge would produce a better outcome than quick harmony.' },
  { key: 'conflict_compromise_avoid', domainKey: 'signal_conflict', primarySignalKey: 'conflict_compromise', secondarySignalKey: 'conflict_avoid', summary: 'Often looks for a lower-friction route through disagreement rather than meeting it head-on, using small adjustments or partial agreements to keep things moving. This can help when the issue needs handling without triggering a bigger escalation than the situation can support.', supportingLine: 'The pattern usually prefers manageable progress over sharp confrontation, especially in tense or politically sensitive settings.', tensionClause: 'It can become limiting if reduced exposure starts replacing real resolution and the issue is only managed around rather than properly addressed.' },
  { key: 'conflict_accommodate_compete', domainKey: 'signal_conflict', primarySignalKey: 'conflict_accommodate', secondarySignalKey: 'conflict_compete', summary: 'Usually tries to soften tension first, but can become noticeably firmer when the issue starts affecting outcomes or fairness too directly to ignore. This often preserves calm early while still leaving some capacity to challenge when yielding too much would become costly.', supportingLine: 'The pattern often prioritises relationship stability, then raises the level of directness only when keeping the peace is no longer solving the problem.', tensionClause: 'It can feel inconsistent to others if challenge arrives late and more sharply after a long period of accommodation.' },
  { key: 'conflict_accommodate_collaborate', domainKey: 'signal_conflict', primarySignalKey: 'conflict_accommodate', secondarySignalKey: 'conflict_collaborate', summary: 'Tends to protect the relationship while still trying to keep the conversation open enough for a shared answer to emerge. The pattern often shows up as careful listening, reduced heat, and a real effort to help the other person stay in the discussion, which can make disagreement feel safer to work through.', supportingLine: 'This can be especially useful where trust is fragile and the disagreement still needs to be worked through rather than quietly absorbed.', tensionClause: 'It becomes limiting when preserving calm starts to outweigh stating the harder truth clearly, because others may leave feeling comfortable without being fully aligned.' },
  { key: 'conflict_accommodate_compromise', domainKey: 'signal_conflict', primarySignalKey: 'conflict_accommodate', secondarySignalKey: 'conflict_compromise', summary: 'Tends to reduce tension by adapting to others or finding middle ground early, which can help conversations stay constructive and preserve working relationships. It often keeps meetings moving, though at times the wish to restore ease can settle the issue before the real difference has been fully aired.' },
  { key: 'conflict_accommodate_avoid', domainKey: 'signal_conflict', primarySignalKey: 'conflict_accommodate', secondarySignalKey: 'conflict_avoid', summary: 'Often tries to lower friction by stepping back, softening the issue, or adapting around it rather than meeting it head-on. This can preserve calm in the short term, especially when emotions are already high, but it also keeps the disagreement at a distance.', supportingLine: 'The pattern usually favours maintaining working relationships and reducing escalation over forcing the issue into the open immediately.', tensionClause: 'If maintained too long, important concerns can remain insufficiently expressed and the apparent calm may hide unresolved strain underneath.' },
  { key: 'conflict_avoid_compete', domainKey: 'signal_conflict', primarySignalKey: 'conflict_avoid', secondarySignalKey: 'conflict_compete', summary: 'May step back from disagreement at first, but can switch into a much firmer response once the issue feels costly enough that avoiding it is no longer workable. This often makes the pattern look cautious on entry and unexpectedly direct once the threshold for action has been crossed, which others may experience as a sharper turn than the earlier calm suggested.', supportingLine: 'The delay usually reflects an attempt to avoid unnecessary heat, not an unlimited willingness to leave the issue unresolved.', tensionClause: 'It can become difficult for others to read if concerns stay quiet for too long and then surface with more force than the moment requires.' },
  { key: 'conflict_avoid_collaborate', domainKey: 'signal_conflict', primarySignalKey: 'conflict_avoid', secondarySignalKey: 'conflict_collaborate', summary: 'Usually approaches disagreement cautiously and prefers to engage once the discussion feels safe enough to be constructive rather than purely heated. This can make conflict handling seem quieter and more measured, with real effort to resolve the issue once the temperature has dropped.', supportingLine: 'The pattern often works best when people need space before they can return to the disagreement productively.', tensionClause: 'It becomes limiting when the wait for better conditions keeps pushing the conversation back and the issue grows larger in the meantime.' },
  { key: 'conflict_avoid_compromise', domainKey: 'signal_conflict', primarySignalKey: 'conflict_avoid', secondarySignalKey: 'conflict_compromise', summary: 'Often tries to reduce heat before dealing with the disagreement, then looks for a practical route through that does not require a sharp confrontation. This can help in tense situations where a smaller step forward is more realistic than an immediate full resolution.', supportingLine: 'The pattern usually values reducing exposure first and only then finding a workable adjustment that lets people move on.', tensionClause: 'It can become limiting if the search for a low-friction answer keeps the real issue partly untouched or repeatedly postpones the harder conversation.' },
  { key: 'conflict_avoid_accommodate', domainKey: 'signal_conflict', primarySignalKey: 'conflict_avoid', secondarySignalKey: 'conflict_accommodate', summary: 'Often tries to lower friction by stepping back, softening the issue, or adapting around it rather than meeting it head-on. This can preserve calm in the short term, but it may leave important concerns insufficiently expressed if maintained for too long.', supportingLine: 'The pattern often protects immediate working relationships by reducing heat rather than escalating a disagreement that may already feel overloaded.', tensionClause: 'The trade-off is that unresolved concerns can remain in the background and become harder to address cleanly once the moment for easier discussion has passed.' },

  { key: 'culture_market_adhocracy', domainKey: 'signal_culture', primarySignalKey: 'culture_market', secondarySignalKey: 'culture_adhocracy', summary: 'The strongest fit is usually an environment that is fast, commercially focused, and comfortable with change. Pace and accountability matter, but so does room to experiment and push into new opportunities.' },
  { key: 'culture_market_clan', domainKey: 'signal_culture', primarySignalKey: 'culture_market', secondarySignalKey: 'culture_clan', summary: 'Fits best in environments that expect visible performance without becoming cold, political, or disconnected from people. Standards matter, but the work is easier to trust when accountability sits alongside cohesion and team support.', supportingLine: 'This tends to suit cultures that want results from people, not results at their expense.', tensionClause: 'The fit can weaken when support dilutes standards, or when performance pressure strips out trust and belonging for too long.' },
  { key: 'culture_market_hierarchy', domainKey: 'signal_culture', primarySignalKey: 'culture_market', secondarySignalKey: 'culture_hierarchy', summary: 'Fits best in environments that combine hard targets with clear structure, defined roles, and a dependable operating rhythm. Performance matters most, though it tends to work better when expectations are organised enough to trust rather than improvised on the fly.', supportingLine: 'This often shows up as a preference for commercially sharp cultures that still know how decisions get made and who owns what.', tensionClause: 'The fit can narrow when process starts to slow competitive pace, or when constant pressure erodes the structure needed to deliver cleanly.' },
  { key: 'culture_adhocracy_market', domainKey: 'signal_culture', primarySignalKey: 'culture_adhocracy', secondarySignalKey: 'culture_market', summary: 'The strongest fit is usually an environment that rewards initiative, fresh thinking, and outward movement. Change matters, but it also helps when that energy is tied to visible outcomes and commercial traction.' },
  { key: 'culture_adhocracy_clan', domainKey: 'signal_culture', primarySignalKey: 'culture_adhocracy', secondarySignalKey: 'culture_clan', summary: 'The strongest fit is usually an environment that feels innovative without becoming isolating. Freedom to experiment matters, though collaboration and trust still help the work stay grounded.' },
  { key: 'culture_adhocracy_hierarchy', domainKey: 'signal_culture', primarySignalKey: 'culture_adhocracy', secondarySignalKey: 'culture_hierarchy', summary: 'The strongest fit is usually an environment that allows experimentation within a usable level of structure. Innovation matters, but there also needs to be enough clarity to turn ideas into repeatable action.' },
  { key: 'culture_clan_market', domainKey: 'signal_culture', primarySignalKey: 'culture_clan', secondarySignalKey: 'culture_market', summary: 'The strongest fit is usually an environment where people feel connected, but standards still stay visible. Trust and cohesion matter most, though performance expectations still need to be credible.' },
  { key: 'culture_clan_adhocracy', domainKey: 'signal_culture', primarySignalKey: 'culture_clan', secondarySignalKey: 'culture_adhocracy', summary: 'The strongest fit is usually an environment that feels collaborative, human, and open to new thinking. Connection matters first, but the culture also benefits from curiosity and movement rather than pure stability.' },
  { key: 'culture_clan_hierarchy', domainKey: 'signal_culture', primarySignalKey: 'culture_clan', secondarySignalKey: 'culture_hierarchy', summary: 'The strongest fit is usually an environment that feels supportive and well organised. Trust matters first, though clear roles and dependable process also help the best work show up consistently.' },
  { key: 'culture_hierarchy_market', domainKey: 'signal_culture', primarySignalKey: 'culture_hierarchy', secondarySignalKey: 'culture_market', summary: 'The strongest fit is usually an environment where order and clarity support visible performance. Structure matters first, though it is expected to help delivery rather than slow it down unnecessarily.' },
  { key: 'culture_hierarchy_adhocracy', domainKey: 'signal_culture', primarySignalKey: 'culture_hierarchy', secondarySignalKey: 'culture_adhocracy', summary: 'The strongest fit is usually an environment with clear structure, but not so much that initiative disappears. Reliability matters first, though there still needs to be some room to adapt and improve.' },
  { key: 'culture_hierarchy_clan', domainKey: 'signal_culture', primarySignalKey: 'culture_hierarchy', secondarySignalKey: 'culture_clan', summary: 'The strongest fit is usually an environment that feels orderly, dependable, and people-aware. Clarity matters first, though the culture also works better when relationships are handled with respect and care.' },

  { key: 'stress_control_scatter', domainKey: 'signal_stress', primarySignalKey: 'stress_control', secondarySignalKey: 'stress_scatter', summary: 'Under pressure, the first instinct is usually to tighten control, increase pace, and impose more certainty on the situation. If the strain continues, focus can start to fragment and the response may shift from firm direction into restless over-management.', supportingLine: 'The early pattern often looks decisive and highly active, especially when the environment feels too loose or unpredictable.', tensionClause: 'It can become costly when urgency and control are maintained too long, because judgement narrows just as attention starts spreading too widely.' },
  { key: 'stress_control_avoidance', domainKey: 'signal_stress', primarySignalKey: 'stress_control', secondarySignalKey: 'stress_avoidance', summary: 'Under pressure, there is often an immediate push to regain control, restore order, and keep things moving, even while the hardest unresolved tension becomes less comfortable to face directly. This can make the response look decisive around visible tasks but more avoidant around the conversation that feels most charged, especially when unresolved pressure continues beneath the surface.', supportingLine: 'The pattern often helps briefly by containing noise and creating structure when the situation feels loose or risky.', tensionClause: 'It becomes limiting when control is used to manage around the problem rather than through it, because the visible work may keep moving while the real tension stays untouched.' },
  { key: 'stress_control_criticality', domainKey: 'signal_stress', primarySignalKey: 'stress_control', secondarySignalKey: 'stress_criticality', summary: 'Stress is likely to increase the need for control, accuracy, and firmer judgement, which can help bring order back into a difficult situation. If pressure keeps building, the response often becomes more exacting, more fault-sensitive, and narrower in what it still sees as acceptable.', supportingLine: 'This pattern can be useful in the early stages of strain when standards need tightening and ambiguity needs reducing quickly.', tensionClause: 'If overextended, perspective narrows and others may contribute less freely because the environment starts feeling harder, tighter, and more heavily judged.' },
  { key: 'stress_scatter_control', domainKey: 'signal_stress', primarySignalKey: 'stress_scatter', secondarySignalKey: 'stress_control', summary: 'Pressure may first show up as attention spreading across too many things at once, followed by a stronger attempt to force order back into the situation. This can create bursts of reactive activity and then sharper efforts to re-establish control once the loss of clarity becomes harder to tolerate.', supportingLine: 'The pattern often reflects a genuine attempt to recover grip after focus has already started slipping under strain.', tensionClause: 'It becomes costly when the swing between fragmentation and control keeps resetting priorities, because people experience both urgency and instability at the same time.' },
  { key: 'stress_scatter_avoidance', domainKey: 'signal_stress', primarySignalKey: 'stress_scatter', secondarySignalKey: 'stress_avoidance', summary: 'Under pressure, attention can spread quickly across too many moving parts while the hardest point of tension becomes easier to step away from. The pattern may look active on the surface, but less settled around the issue that most needs direct engagement.', supportingLine: 'This often shows up as rising activity, more switching, and a growing preference to postpone the most emotionally loaded conversation.', tensionClause: 'If maintained too long, fragmentation and withdrawal can reinforce each other and leave important issues unresolved until they are harder to recover cleanly.' },
  { key: 'stress_scatter_criticality', domainKey: 'signal_stress', primarySignalKey: 'stress_scatter', secondarySignalKey: 'stress_criticality', summary: 'Pressure may first show up as a loss of focus, with attention spreading across multiple issues rather than settling cleanly on the most important one. As the strain continues, judgement can also become sharper and more fault-sensitive, creating a restless pattern that notices problems quickly but can make the room feel more tense than clear.', supportingLine: 'This can feel busy and highly alert in the moment, particularly when the environment is noisy, interrupted, or hard to stabilise.', tensionClause: 'If maintained too long, scrutiny rises at the same time as concentration falls, which makes it harder to prioritise calmly or use criticism in a way others can absorb well.' },
  { key: 'stress_avoidance_control', domainKey: 'signal_stress', primarySignalKey: 'stress_avoidance', secondarySignalKey: 'stress_control', summary: 'When pressure builds, the first move may be to reduce exposure, delay engagement, or step back until the situation feels more manageable. At the same time, some parts of the situation can still trigger a strong need to regain control, so the pattern may alternate between withdrawal and tighter containment.', supportingLine: 'This can create short-term breathing space and stop an already heated situation from escalating too quickly.', tensionClause: 'It becomes limiting when stepping back and taking control start chasing each other in cycles, because the underlying issue receives neither sustained attention nor fully trusted ownership.' },
  { key: 'stress_avoidance_scatter', domainKey: 'signal_stress', primarySignalKey: 'stress_avoidance', secondarySignalKey: 'stress_scatter', summary: 'Under strain, there may be an early move to pull back from the hardest edge of the issue while attention also becomes less settled and more widely spread. This can make the response look quieter on the surface, but internally less focused and less willing to stay with the most difficult point for long.', supportingLine: 'The pattern can briefly protect against overload by reducing both confrontation and exposure to the noisiest part of the problem.', tensionClause: 'It becomes harder to manage when withdrawal and fragmentation reinforce each other, because clarity drops at the same time as engagement does.' },
  { key: 'stress_avoidance_criticality', domainKey: 'signal_stress', primarySignalKey: 'stress_avoidance', secondarySignalKey: 'stress_criticality', summary: 'When pressure rises, difficult issues may be delayed outwardly even while inner standards become sharper and more exacting. This can make the pattern look calmer than it feels from the inside, especially when unresolved pressure continues to build.', supportingLine: 'The early benefit is often reduced visible escalation, especially when a more immediate confrontation would only add heat.', tensionClause: 'It becomes limiting when the harder judgement stays mostly internal, because concerns are neither released cleanly nor addressed directly while the strain continues to build.' },
  { key: 'stress_criticality_control', domainKey: 'signal_stress', primarySignalKey: 'stress_criticality', secondarySignalKey: 'stress_control', summary: 'Under pressure, flaws and weak thinking may stand out quickly, and the response often tightens into firmer standards, sharper scrutiny, and more direct control of what happens next. This can help bring discipline back into a difficult situation, especially when looseness is making the pressure worse.', supportingLine: 'The pattern often looks exacting and highly corrective, with a strong need for cleaner thinking, tighter execution, and fewer errors.', tensionClause: 'If held too long, it narrows perspective and makes contribution harder for others because the environment starts to feel judged, tightly managed, or unsafe to test ideas in.' },
  { key: 'stress_criticality_scatter', domainKey: 'signal_stress', primarySignalKey: 'stress_criticality', secondarySignalKey: 'stress_scatter', summary: 'Pressure can sharpen judgement and flaw-detection at the same time as attention becomes less settled and harder to hold in one place. The result is often a tense mix of close scrutiny and reduced concentration, where problems are noticed quickly but the response becomes harder to sequence cleanly.', supportingLine: 'This may look highly alert and mentally active, particularly in fast-moving situations where the noise level keeps changing.', tensionClause: 'It becomes limiting when fault-finding outruns prioritisation, because energy is spent spotting what is wrong without the same level of calm focus on what to do next.' },
  { key: 'stress_criticality_avoidance', domainKey: 'signal_stress', primarySignalKey: 'stress_criticality', secondarySignalKey: 'stress_avoidance', summary: 'Under pressure, standards may harden and flaws become more visible, even while direct engagement with the issue becomes less comfortable. This can create a pattern where judgement grows sharper internally before the difficult conversation happens openly, if it happens at all.', supportingLine: 'The response may help briefly by catching weaknesses early and avoiding a premature confrontation that would only escalate the heat.', tensionClause: 'It becomes limiting when concerns stay largely unspoken, because the criticism remains active but the issue is not addressed directly enough to reduce the pressure.' },
];

const PAIRWISE_RULE_LOOKUP = new Map<string, PairwiseInterpretationRule>(
  PAIRWISE_RULES.map((rule) => [`${rule.domainKey}:${rule.primarySignalKey}:${rule.secondarySignalKey}`, rule] as const),
);
const PAIRWISE_RULE_LOOKUP_BY_SIGNALS = new Map<string, PairwiseInterpretationRule>(
  PAIRWISE_RULES.map((rule) => [`${rule.primarySignalKey}:${rule.secondarySignalKey}`, rule] as const),
);
const PAIRWISE_RULE_LOOKUP_BY_PAIR_KEY = new Map<string, PairwiseInterpretationRule>(
  PAIRWISE_RULES
    .map((rule) => [buildPairTokenKey(rule.primarySignalKey, rule.secondarySignalKey), rule] as const)
    .filter((entry): entry is readonly [string, PairwiseInterpretationRule] => entry[0] !== null),
);

function buildSupportLine(
  context: DomainInterpretationContext,
  explicitSupportingLine?: string | null,
): string | null {
  if (explicitSupportingLine) {
    return explicitSupportingLine;
  }

  if (!context.primarySignal) {
    return null;
  }

  const primaryFragments = SIGNAL_FRAGMENTS[context.primarySignal.signalKey];
  if (!primaryFragments) {
    return null;
  }

  const secondaryTitle = context.secondarySignal?.signalTitle ?? null;
  const rangeLine =
    context.blendProfile === 'balanced' && secondaryTitle
      ? `${secondaryTitle} remains close enough to shape how this area comes through day to day.`
      : context.secondarySignal
        ? `${secondaryTitle} adds a secondary pull, rather than leaving this area to one signal alone.`
        : null;

  return [primaryFragments.supporting_line, rangeLine].filter(Boolean).join(' ');
}

function buildTensionClause(
  context: DomainInterpretationContext,
  explicitTensionClause?: string | null,
): string | null {
  if (explicitTensionClause) {
    return explicitTensionClause;
  }

  if (!context.primarySignal) {
    return null;
  }

  const primaryFragments = SIGNAL_FRAGMENTS[context.primarySignal.signalKey];
  if (!primaryFragments?.risk_clause) {
    return null;
  }

  return primaryFragments.risk_clause;
}

function buildSingleSignalSummary(context: DomainInterpretationContext): string {
  const primarySignal = context.primarySignal;
  if (!primarySignal) {
    const domainKey = context.input.domainKey as CoreDomainKey;
    return DOMAIN_EMPTY_SUMMARIES[domainKey] ?? 'A clear pattern was not available in this domain.';
  }

  const fragments = SIGNAL_FRAGMENTS[primarySignal.signalKey];
  if (!fragments) {
    return `${primarySignal.signalTitle} is the clearest signal in this domain.`;
  }

  switch (primarySignal.domainKey) {
    case 'signal_style':
      return `A ${getIntensityQualifier(context.primaryBand)} ${fragments.core_trait} style. Tends to ${fragments.pace_orientation ?? 'show up in a consistent way'} and ${fragments.decision_orientation ?? 'rely on a familiar approach'}.`;
    case 'signal_mot':
      return `A ${getIntensityQualifier(context.primaryBand)} ${fragments.core_trait} motivation pattern. Effort is usually sustained when work ${fragments.decision_orientation ?? fragments.environment_preference ?? 'matches this preference'}.`;
    case 'signal_lead':
      return `A ${getIntensityQualifier(context.primaryBand)} leadership pattern built around ${fragments.core_trait}. Direction is likely to come through by how you ${fragments.pace_orientation ?? fragments.collaboration_orientation ?? fragments.decision_orientation ?? 'lead in practice'}.`;
    case 'signal_conflict':
      return `A ${getIntensityQualifier(context.primaryBand)} conflict response that is ${fragments.core_trait}. Tension is likely to be handled by how you ${fragments.tension_pattern ?? 'engage with disagreement'}.`;
    case 'signal_culture':
      return `A ${getIntensityQualifier(context.primaryBand)} environment preference centred on ${fragments.core_trait}. Fit is strongest where you can ${fragments.environment_preference ?? 'work in a way that matches this pattern'}.`;
    case 'signal_stress':
      return `A ${getIntensityQualifier(context.primaryBand)} pressure pattern where behaviour may ${fragments.core_trait}. Under strain, you may ${fragments.stress_expression ?? 'show this pattern more clearly'}.`;
    default:
      return `${primarySignal.signalTitle} is the clearest signal in this domain.`;
  }
}

function buildConflictFallbackSummary(
  context: DomainInterpretationContext,
  primaryFragments: SignalFragmentSet,
  secondaryFragments: SignalFragmentSet,
): string {
  const blendLead =
    context.blendProfile === 'balanced'
      ? 'Disagreement is likely to be handled through a fairly even blend'
      : 'Disagreement is likely to be handled through a pattern led';

  return `${blendLead} of ${primaryFragments.core_trait} and ${secondaryFragments.core_trait}. In practice, that usually means you ${primaryFragments.tension_pattern ?? 'engage with tension'} while ${secondaryFragments.tension_pattern ?? 'adding some secondary range'}, which can keep the exchange workable without treating every disagreement the same way.`;
}

function buildStressFallbackSummary(
  context: DomainInterpretationContext,
  primaryFragments: SignalFragmentSet,
  secondaryFragments: SignalFragmentSet,
): string {
  const opening =
    context.blendProfile === 'balanced'
      ? 'When strain builds, pressure may show up through a fairly even mix'
      : 'When strain builds, the first response is likely to be led';

  return `${opening} of ${primaryFragments.core_trait} and ${secondaryFragments.core_trait}. This often means you ${primaryFragments.stress_expression ?? 'show the primary pattern first'} while ${secondaryFragments.stress_expression ?? 'the secondary pattern starts shaping the response'}, which can help briefly but is harder to sustain cleanly when pressure stays high.`;
}

function buildFallbackSummary(context: DomainInterpretationContext): string {
  if (!context.primarySignal) {
    const domainKey = context.input.domainKey as CoreDomainKey;
    return DOMAIN_EMPTY_SUMMARIES[domainKey] ?? 'A clear pattern was not available in this domain.';
  }

  if (!context.secondarySignal) {
    return buildSingleSignalSummary(context);
  }

  const primaryFragments = SIGNAL_FRAGMENTS[context.primarySignal.signalKey];
  const secondaryFragments = SIGNAL_FRAGMENTS[context.secondarySignal.signalKey];

  if (!primaryFragments || !secondaryFragments) {
    return `${context.primarySignal.signalTitle} leads this domain, with ${context.secondarySignal.signalTitle} adding a secondary influence.`;
  }

  switch (context.primarySignal.domainKey) {
    case 'signal_style':
      return `A ${getIntensityQualifier(context.primaryBand)} ${primaryFragments.core_trait} style with a secondary pull toward ${secondaryFragments.core_trait}. Tends to ${primaryFragments.pace_orientation ?? 'move in a consistent way'} while ${secondaryFragments.balancing_clause ?? 'adding some useful range around the main pattern'}.`;
    case 'signal_mot':
      return `A motivation pattern led by ${primaryFragments.core_trait}, with a secondary need for ${secondaryFragments.core_trait}. Effort is most likely to last when both forms of reward are present in a usable way.`;
    case 'signal_lead':
      return `A leadership pattern led by ${primaryFragments.core_trait}, with a secondary pull toward ${secondaryFragments.core_trait}. Direction is likely to come through most clearly when both outcome and relational needs are given enough room.`;
    case 'signal_conflict':
      return buildConflictFallbackSummary(context, primaryFragments, secondaryFragments);
    case 'signal_culture':
      return `A culture-fit pattern led by ${primaryFragments.core_trait}, with a secondary preference for ${secondaryFragments.core_trait}. The best environments are likely to reward the main preference without excluding the secondary one.`;
    case 'signal_stress':
      return buildStressFallbackSummary(context, primaryFragments, secondaryFragments);
    default:
      return `${context.primarySignal.signalTitle} leads this domain, with ${context.secondarySignal.signalTitle} adding a secondary influence.`;
  }
}

function buildPairwiseSummary(context: DomainInterpretationContext): {
  summary: string;
  supportingLine: string | null;
  tensionClause: string | null;
  ruleKey: string | null;
} {
  if (!context.primarySignal || !context.secondarySignal) {
    return {
      summary: buildSingleSignalSummary(context),
      supportingLine: buildSupportLine(context),
      tensionClause: buildTensionClause(context),
      ruleKey: null,
    };
  }

  const rule = PAIRWISE_RULE_LOOKUP.get(
    `${context.input.domainKey}:${context.primarySignal.signalKey}:${context.secondarySignal.signalKey}`,
  ) ?? PAIRWISE_RULE_LOOKUP_BY_SIGNALS.get(
    `${context.primarySignal.signalKey}:${context.secondarySignal.signalKey}`,
  ) ?? PAIRWISE_RULE_LOOKUP_BY_PAIR_KEY.get(
    buildPairTokenKey(context.primarySignal.signalKey, context.secondarySignal.signalKey) ?? '',
  );

  if (!rule) {
    return {
      summary: buildFallbackSummary(context),
      supportingLine: buildSupportLine(context),
      tensionClause: buildTensionClause(context),
      ruleKey: null,
    };
  }

  return {
    summary: rule.summary,
    supportingLine: buildSupportLine(context, rule.supportingLine ?? null),
    tensionClause: buildTensionClause(context, rule.tensionClause ?? null),
    ruleKey: rule.key,
  };
}

export function buildDomainPairInterpretationSummary(
  domainSummary: NormalizedDomainSummary,
): string | null {
  if (domainSummary.domainSource !== 'signal_group') {
    return null;
  }

  const context = buildContext(domainSummary);
  if (!context.primarySignal || !context.secondarySignal) {
    return null;
  }

  return buildPairwiseSummary(context).summary;
}

function resolveDomainSummaryOverride(
  domainKey: string,
  interpretationContext?: ResultInterpretationContext,
): string | null {
  const chapterOpening =
    interpretationContext?.languageBundle.domains[domainKey]?.chapterOpening?.trim();
  if (chapterOpening) {
    return chapterOpening;
  }

  const legacySummary = interpretationContext?.languageBundle.domains[domainKey]?.summary?.trim();
  return legacySummary ? legacySummary : null;
}

function buildGenericInterpretation(domainSummary: NormalizedDomainSummary): DomainInterpretationOutput | null {
  const context = buildContext(domainSummary);
  const summary = buildFallbackSummary(context);

  return {
    domainKey: domainSummary.domainKey,
    primarySignalKey: context.primarySignal?.signalKey ?? null,
    primaryPercent: context.primarySignal?.domainPercentage ?? null,
    secondarySignalKey: context.secondarySignal?.signalKey ?? null,
    secondaryPercent: context.secondarySignal?.domainPercentage ?? null,
    summary,
    supportingLine: buildSupportLine(context),
    tensionClause: buildTensionClause(context),
    diagnostics: {
      strategy: context.secondarySignal ? 'fragment_fallback' : 'single_signal_fallback',
      ruleKey: null,
      primaryBand: context.primaryBand,
      secondaryBand: context.secondaryBand,
      blendProfile: context.blendProfile,
      primarySecondaryGap: context.primarySecondaryGap,
    },
  };
}

export function buildDomainInterpretation(
  domainSummary: NormalizedDomainSummary,
  interpretationContext?: ResultInterpretationContext,
): DomainInterpretationOutput | null {
  if (domainSummary.domainSource !== 'signal_group') {
    return null;
  }

  const context = buildContext(domainSummary);
  const isCoreDomain = CORE_DOMAIN_KEYS.has(domainSummary.domainKey as CoreDomainKey);

  if (!context.primarySignal) {
    if (!isCoreDomain) {
      return null;
    }

    return {
      domainKey: domainSummary.domainKey,
      primarySignalKey: null,
      primaryPercent: null,
      secondarySignalKey: null,
      secondaryPercent: null,
      summary: DOMAIN_EMPTY_SUMMARIES[domainSummary.domainKey as CoreDomainKey],
      supportingLine: null,
      tensionClause: null,
      diagnostics: {
        strategy: 'empty_domain',
        ruleKey: null,
        primaryBand: null,
        secondaryBand: null,
        blendProfile: null,
        primarySecondaryGap: null,
      },
    };
  }

  if (!isCoreDomain) {
    const interpretation = buildGenericInterpretation(domainSummary);
    if (!interpretation) {
      return interpretation;
    }

    return {
      ...interpretation,
      summary: resolveDomainSummaryOverride(domainSummary.domainKey, interpretationContext) ?? interpretation.summary,
    };
  }

  const pairwise = buildPairwiseSummary(context);

  return {
    domainKey: domainSummary.domainKey,
    primarySignalKey: context.primarySignal.signalKey,
    primaryPercent: context.primarySignal.domainPercentage,
    secondarySignalKey: context.secondarySignal?.signalKey ?? null,
    secondaryPercent: context.secondarySignal?.domainPercentage ?? null,
    summary: resolveDomainSummaryOverride(domainSummary.domainKey, interpretationContext) ?? pairwise.summary,
    supportingLine: pairwise.supportingLine,
    tensionClause: pairwise.tensionClause,
    diagnostics: {
      strategy: pairwise.ruleKey
        ? 'pairwise_rule'
        : context.secondarySignal
          ? 'fragment_fallback'
          : 'single_signal_fallback',
      ruleKey: pairwise.ruleKey,
      primaryBand: context.primaryBand,
      secondaryBand: context.secondaryBand,
      blendProfile: context.blendProfile,
      primarySecondaryGap: context.primarySecondaryGap,
    },
  };
}
