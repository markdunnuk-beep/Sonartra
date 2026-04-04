import type {
  NormalizedResult,
  NormalizedSignalScore,
  ResultBulletItem,
  ResultInterpretationContext,
  ResultOverviewSummary,
} from '@/lib/engine/types';
import { canonicalizeSignalPairKey } from '@/lib/admin/pair-language-import';

/**
 * Canonical result-language ownership for the persisted report fields.
 *
 * Active:
 * - Overview_Language.headline -> hero.headline via the overview-backed hero storage bridge
 * - Overview_Language.summary -> hero.narrative via the overview-backed hero storage bridge
 * - Signal_Language.strength -> strengths[]
 * - Signal_Language.watchout -> watchouts[]
 * - Signal_Language.development -> developmentFocus[]
 *
 * Reserved / inactive for future wiring:
 * - Signal_Language.summary
 * - Pair_Language.summary
 * - Pair_Language.strength
 * - Pair_Language.watchout
 * - Overview_Language.strengths
 * - Overview_Language.watchouts
 * - Overview_Language.development
 *
 * Signal summaries and pair summaries are active elsewhere in the canonical
 * report payload. This helper remains focused on hero text plus derived action
 * blocks. The results UI reads persisted fields directly and must not recreate
 * behavioural copy client-side.
 */
const CONCENTRATED_TOP_SIGNAL_THRESHOLD = 45;
const BALANCED_TOP_TWO_GAP_THRESHOLD = 8;
const BALANCED_TOP_SIGNAL_THRESHOLD = 40;
const DEVELOPMENT_SIGNAL_THRESHOLD = 16;
const MAX_STRENGTH_COUNT = 3;
const MAX_WATCHOUT_COUNT = 3;
const MAX_DEVELOPMENT_COUNT = 2;

type SignalTemplate = {
  headline: string;
  hero: string;
  impact: string;
  supportFragment: string;
  strength: string;
  watchout: string;
  lowSignalRisk: string;
  development: string;
};

const DEFAULT_TEMPLATE: SignalTemplate = {
  headline: '',
  hero: 'You tend to rely on this signal when deciding how to respond and where to place your effort.',
  impact: 'This is usually most useful when you need a dependable way to approach work and make progress.',
  supportFragment: 'additional range around how you apply it',
  strength: 'This signal is likely to be one of the more available ways you add value day to day. It tends to help most when the situation rewards a clear, dependable response rather than constant reinvention.',
  watchout: 'When overused, this preference can become too dominant and crowd out other useful responses. The risk is usually less about the strength itself and more about applying it after the situation has changed.',
  lowSignalRisk: 'When this signal is less available, you may miss some useful options in situations that call for it.',
  development: 'Practise using this signal deliberately in lower-risk situations so it is available when the context changes. Building range here usually improves judgement, not just versatility.',
};

const PREFIX_TEMPLATES: Record<string, SignalTemplate> = {
  style_: {
    headline: 'A clear working style is coming through',
    hero: 'You tend to approach work in a consistent way that shapes how quickly you move, how much structure you use, and how you show up with others.',
    impact: 'This is usually most useful because it gives people a reliable sense of how you operate when work needs to move.',
    supportFragment: 'additional style range',
    strength: 'This working style is likely to be one of the clearest ways you add value in day-to-day situations. It usually becomes most useful when others need a consistent way of working they can read and rely on.',
    watchout: 'When overused, this style can become too dominant and make it harder to flex with people or context. What works well as a strength can start reducing range once the environment asks for a different pace or tone.',
    lowSignalRisk: 'When this style is less available, you may have less range when a different response is needed.',
    development: 'Practise using this style more deliberately in lower-risk situations so it is easier to access when needed. The aim is broader control over your range, not behaving out of character.',
  },
  mot_: {
    headline: 'A clear source of motivation is coming through',
    hero: 'You are likely to stay most engaged when the work rewards this kind of progress, environment, or contribution.',
    impact: 'This matters because motivation tends to shape where you sustain effort and where your energy drops.',
    supportFragment: 'extra energy in that direction',
    strength: 'This motivation is likely to help you sustain effort and stay invested when the work matches it. It often becomes especially useful because it tells you what kind of progress or environment keeps energy honest over time.',
    watchout: 'When overused, this driver can narrow what feels worthwhile and reduce your flexibility in other settings. The trade-off is usually not lack of motivation, but becoming too selective about what deserves your effort.',
    lowSignalRisk: 'When this driver is less available, you may underuse a useful source of motivation in the right context.',
    development: 'Look for small ways to activate this driver more deliberately so it becomes easier to access when the role needs it. That usually makes effort more sustainable without needing the whole role to change.',
  },
  lead_: {
    headline: 'A clear leadership pattern is coming through',
    hero: 'When you step into leadership, this is one of the clearest ways you are likely to guide people and shape the work.',
    impact: 'This matters because it affects what people get from you first when direction, accountability, or support is needed.',
    supportFragment: 'more leadership range',
    strength: 'This leadership pattern is likely to be a dependable way you create value when others need direction. It often works best when people need a clear signal about what to focus on and how to move.',
    watchout: 'When overused, this approach can lean too far in one direction and leave other leadership needs under-served. A reliable leadership instinct can still become limiting when it answers every situation the same way.',
    lowSignalRisk: 'When this pattern is less available, you may have less range in leadership situations that call for it.',
    development: 'Build more deliberate range in this leadership pattern so it is available without taking over every situation. Better timing here usually improves trust as much as effectiveness.',
  },
  conflict_: {
    headline: 'A clear conflict response is coming through',
    hero: 'When tension appears, this is one of the clearest ways you are likely to respond.',
    impact: 'This matters because conflict style shapes whether issues get surfaced, softened, shared, or delayed.',
    supportFragment: 'more range in conflict',
    strength: 'This response is likely to help you in some conflict situations because it gives you a dependable way to engage. It is most useful when tension needs handling intentionally rather than by drift or avoidance.',
    watchout: 'When overused, this response can become too fixed and make it harder to adapt to what the disagreement needs. Conflict usually turns costly when the instinct is right in principle but wrong in timing or tone.',
    lowSignalRisk: 'When this response is less available, you may miss a useful option when tension rises.',
    development: 'Practise this response in lower-risk disagreements so it becomes easier to use deliberately rather than by habit. The goal is more choice under tension, not more conflict for its own sake.',
  },
  culture_: {
    headline: 'A clear environment preference is coming through',
    hero: 'You are likely to do your best work when the surrounding culture rewards this kind of behaviour and operating rhythm.',
    impact: 'This matters because environment fit affects how naturally your strengths come through.',
    supportFragment: 'extra environmental fit in that direction',
    strength: 'This preference is likely to help you recognise the environments where you can contribute most naturally. It often becomes useful because fit affects how easily your strengths show up without unnecessary friction.',
    watchout: 'When overused, this preference can become too narrow and make other workable environments feel harder than they need to. The risk is dismissing a usable setting before you have learned how to work it well.',
    lowSignalRisk: 'When this preference is less available, you may overlook some environments where you could still work effectively.',
    development: 'Build more conscious range around this environment preference so you can adapt without losing your best work. That usually improves fit judgement and resilience at the same time.',
  },
  stress_: {
    headline: 'A pressure pattern is coming through',
    hero: 'Under strain, this is one of the clearest ways your behaviour may shift.',
    impact: 'This matters because pressure patterns often show up faster than intention unless you recognise them early.',
    supportFragment: 'additional pressure awareness',
    strength: 'Recognising this pressure pattern gives you a better chance of using it well before it runs too far. That awareness is valuable because pressure usually changes behaviour earlier than people notice.',
    watchout: 'When overused, this pressure response can start to reduce judgement, range, or trust with others. The cost often comes from staying in the pattern after it has stopped being useful.',
    lowSignalRisk: 'When this pressure response is less available, you may miss a useful warning sign about how strain shows up.',
    development: 'Build a simple pressure reset around this pattern so it becomes easier to spot and manage early. Early intervention usually matters more than a perfect recovery later.',
  },
  decision_: {
    headline: 'A clear decision pattern is coming through',
    hero: 'This is one of the clearest ways you are likely to make decisions when there is uncertainty or trade-off.',
    impact: 'This matters because decision style shapes pace, involvement, confidence, and the quality of the call.',
    supportFragment: 'more decision range',
    strength: 'This decision pattern is likely to be one of the clearest ways you add value when choices need to be made.',
    watchout: 'When overused, this decision pattern can lean too far one way and reduce the quality of the final call.',
    lowSignalRisk: 'When this decision pattern is less available, you may miss a useful way of making decisions when the context changes.',
    development: 'Practise using this decision pattern more deliberately so it becomes available without dominating every choice.',
  },
  role_: {
    headline: 'A clear role fit is coming through',
    hero: 'This signal suggests a kind of work where your pattern may feel especially natural and effective.',
    impact: 'This matters because role fit often affects where your strengths are easiest to apply at a high level.',
    supportFragment: 'additional role fit',
    strength: 'This role signal is likely to point to work where your strengths can become especially useful.',
    watchout: 'When overused, this role preference can narrow how broadly you see your contribution.',
    lowSignalRisk: 'When this role signal is less available, you may be less inclined to use a mode that could still be useful in context.',
    development: 'Test this mode in targeted situations so it becomes a conscious option rather than a fixed identity.',
  },
};

const SIGNAL_TEMPLATES: Record<string, SignalTemplate> = {
  style_driver: {
    headline: 'Direct, fast-moving and outcome-led',
    hero: 'You tend to move quickly, take charge, and push for a clear outcome rather than waiting for conditions to settle.',
    impact: 'This is often most useful when decisions need pace, direction, and visible momentum.',
    supportFragment: 'more pace and visible drive',
    strength: 'You are likely to be most effective when progress is stuck and a team needs direction, urgency, or firmer calls. This pattern tends to create movement quickly, especially where others are hesitating or waiting for clarity.',
    watchout: 'When overused, this can come across as too forceful, too fast, or too impatient with slower thinkers. The likely consequence is that people comply with the pace but contribute less judgement, challenge, or ownership than they otherwise would.',
    lowSignalRisk: 'When this signal is less available, you may hesitate to take ownership or make the hard call when momentum is needed.',
    development: 'Build more conscious range in direct challenge and decisive ownership so you can step forward earlier when pace matters. The gain is not just speed, but being able to create movement without losing people who need a little more processing time.',
  },
  style_influencer: {
    headline: 'Engaging, visible and momentum-building',
    hero: 'You tend to work through connection, energy, and visible engagement, helping people move with an idea rather than just understand it.',
    impact: 'This is often most useful when buy-in, communication, and positive momentum matter as much as the plan itself.',
    supportFragment: 'extra visibility and relational lift',
    strength: 'You are likely to add value by lifting energy, opening conversations, and helping people engage quickly. This tends to be especially useful when an idea needs traction, visibility, or stronger buy-in to get moving.',
    watchout: 'When overused, this can become too impression-led, too broad, or too light on detail and follow-through. The risk is that momentum feels real in the room, but lands less clearly in decisions, priorities, or delivery discipline afterward.',
    lowSignalRisk: 'When this signal is less available, others may experience you as harder to read, engage, or rally around.',
    development: 'Practise making your thinking more visible and engaging others earlier so communication becomes a more available strength. Used well, this gives you more influence without needing to rely on volume or personality alone.',
  },
  style_operator: {
    headline: 'Steady, dependable and execution-focused',
    hero: 'You tend to value consistency, follow-through, and practical execution, preferring a reliable path over unnecessary disruption.',
    impact: 'This is often most useful when work depends on dependability, continuity, and disciplined delivery.',
    supportFragment: 'more steadiness and execution discipline',
    strength: 'You are likely to add value by keeping work grounded, dependable, and moving without unnecessary noise. This tends to matter most where consistency, trust, and disciplined follow-through are more valuable than constant reinvention.',
    watchout: 'When overused, this can become too cautious, too change-resistant, or too slow to adapt when conditions shift. The consequence is often not poor intent, but staying loyal to a reliable method after the situation has already moved on.',
    lowSignalRisk: 'When this signal is less available, consistency and completion can suffer when work needs patience and disciplined follow-through.',
    development: 'Build more deliberate range in steady execution and routine discipline so reliability stays available under pressure. The benefit is being able to create stability without becoming fixed when adaptation is genuinely needed.',
  },
  style_analyst: {
    headline: 'Structured, thoughtful and evidence-led',
    hero: 'You tend to slow situations down enough to think clearly, test assumptions, and work from logic rather than impulse.',
    impact: 'This is often most useful when accuracy, sound judgement, and careful problem-solving matter.',
    supportFragment: 'more structure and analytical discipline',
    strength: 'You are likely to add value by spotting patterns, improving quality, and bringing stronger reasoning into decisions. This pattern is often most useful when weak assumptions are costly and better judgement matters more than moving first.',
    watchout: 'When overused, this can become over-analysis, excessive caution, or a reluctance to move before everything feels resolved. The likely impact is that decision quality improves, but pace, ownership, or confidence in the room starts to drop.',
    lowSignalRisk: 'When this signal is less available, decisions may move ahead without enough challenge, rigour, or evidence.',
    development: 'Build more deliberate range in structured review and evidence-checking so clear judgement is available before key decisions. The aim is to keep rigour accessible without making every important call wait for perfect certainty.',
  },
  mot_achievement: {
    headline: 'Driven by progress, stretch and visible traction',
    hero: 'You are likely to stay most engaged when effort turns into movement, improvement, or a result you can clearly see.',
    impact: 'This is often most useful when a role needs ambition, momentum, and a strong link between effort and outcome.',
    supportFragment: 'more visible drive and stretch',
    strength: 'You are likely to add value when a team needs momentum, higher standards, or a stronger push toward visible progress. This pattern often helps maintain energy where the work would otherwise drift or settle too early.',
    watchout: 'When overused, this can make slower progress feel less worthwhile than it is, or narrow attention toward winning, pace, and visible proof. The impact is usually pressure on yourself and others to keep moving before the foundations are fully secure.',
    lowSignalRisk: 'When this signal is less available, worthwhile stretch, ambition, or momentum may be underused when the role would benefit from more drive.',
    development: 'Build more deliberate range in how you define progress so motivation does not depend only on speed or visible wins. That usually makes your drive more sustainable and more effective across uneven conditions.',
  },
  lead_results: {
    headline: 'Leads through standards, pace and accountability',
    hero: 'When leading, you are likely to make expectations visible quickly and keep attention on what needs to be delivered.',
    impact: 'This is often most useful when performance needs tightening and drift would otherwise be tolerated for too long.',
    supportFragment: 'more delivery pressure and accountability',
    strength: 'You are likely to be effective when expectations are unclear and a team needs firmer accountability, clearer priorities, or stronger follow-through. This pattern often creates traction by making the standard visible and hard to ignore.',
    watchout: 'When overused, this can make leadership feel too hard-edged, too pace-driven, or too focused on the outcome at the expense of support. The likely consequence is short-term compliance with less long-term trust, ownership, or honest upward challenge.',
    lowSignalRisk: 'When this signal is less available, standards can soften and performance issues may stay unaddressed for longer than they should.',
    development: 'Build more range in how you combine accountability with context, support, and explanation. That usually makes tough standards easier for others to absorb without diluting the expectation itself.',
  },
  culture_market: {
    headline: 'Most energised by pace, standards and visible outcomes',
    hero: 'You are likely to work best in environments where performance is visible, ownership is clear, and progress is not allowed to drift for long.',
    impact: 'This is often most useful because it helps you recognise settings where urgency and accountability bring out your strongest contribution.',
    supportFragment: 'stronger performance orientation',
    strength: 'You are likely to add value in environments that need commercial sharpness, pace, and clear ownership. This preference often helps you stay energised where standards are visible and outcomes matter in practical terms.',
    watchout: 'When overused, this can make reflective, consensus-led, or slower-moving environments feel weaker than they really are. The consequence is that you may underuse contexts that would still suit you once trust, quality, or complexity are fully understood.',
    lowSignalRisk: 'When this signal is less available, you may under-recognise environments where stronger pace and accountability would actually help you perform well.',
    development: 'Build more deliberate judgement about when pace and pressure are genuinely useful and when they are simply familiar. That usually improves culture fit decisions without dulling your performance edge.',
  },
  stress_control: {
    headline: 'Under strain, control and certainty become more important',
    hero: 'When pressure rises, you are likely to tighten the grip on pace, standards, and what others are doing so the situation feels more manageable.',
    impact: 'This is often most useful in the short term because it can create order quickly when things feel loose or risky.',
    supportFragment: 'stronger control under strain',
    strength: 'You are likely to be useful in pressure situations that need firmer containment, clearer priorities, or quicker decisions. This pattern can stabilise a noisy environment early by creating more structure and direction.',
    watchout: 'When overused, this can harden into over-control, reduced trust, or a narrower view of what is happening. The likely impact is that you get more compliance in the moment while losing perspective, challenge, and calm judgement around you.',
    lowSignalRisk: 'When this signal is less available, you may miss an early warning that pressure is starting to tighten your behaviour and decision style.',
    development: 'Build a simple reset between noticing the pressure and acting on it, especially when certainty feels urgent. That pause usually protects judgement and keeps control from becoming the problem it was trying to solve.',
  },
  decision_evidence: {
    headline: 'Prefers evidence, logic and proof in decisions',
    hero: 'You tend to make decisions by checking facts, testing assumptions, and building enough evidence to trust the call.',
    impact: 'This is often most useful when judgement quality matters and weak assumptions carry real cost.',
    supportFragment: 'more rigour and evidence-checking',
    strength: 'You are likely to add value by improving decision quality and reducing avoidable risk caused by weak assumptions. This tends to matter most where poor logic carries hidden cost or confidence is outrunning the facts.',
    watchout: 'When overused, this can delay action or make it harder to move when evidence will only become clear through action. The trade-off is usually better judgement at the cost of pace if the review never quite feels sufficient.',
    lowSignalRisk: 'When this signal is less available, decisions may move faster but carry more avoidable assumption risk.',
    development: 'Practise using concise evidence checks so rigour stays available without turning every decision into a long review. The goal is sharper calls, not heavier process.',
  },
  lead_people: {
    headline: 'Leads through trust, support and people growth',
    hero: 'When leading, you are likely to focus on how people are doing, what support they need, and how to help them grow and contribute well.',
    impact: 'This is often most useful when trust, engagement, and team development are essential to performance.',
    supportFragment: 'more trust-building and support',
    strength: 'You are likely to add value by strengthening relationships, creating support, and helping people stay engaged in the work. This tends to be especially useful when performance depends on trust, retention, and people feeling safe enough to contribute well.',
    watchout: 'When overused, this can soften challenge, delay difficult calls, or protect harmony at the expense of performance. The likely consequence is that people feel supported, but the harder standard or corrective conversation arrives later than it should.',
    lowSignalRisk: 'When this signal is less available, leadership may miss the human support and trust that help teams sustain performance.',
    development: 'Practise more active coaching, check-ins, and trust-building conversations so people leadership is easier to access when needed. Used well, this increases challenge tolerance as well as support because people better understand your intent.',
  },
};

const RULE_BASED_WATCHOUTS = [
  {
    keys: ['style_driver', 'stress_control'],
    title: 'Pressure Pattern',
    detail: 'Under strain, your drive for results can harden into over-control. What begins as useful decisiveness can start narrowing judgement and leave others feeling managed rather than trusted.',
  },
  {
    keys: ['style_analyst', 'stress_criticality'],
    title: 'Pressure Pattern',
    detail: 'Under strain, your standards can harden into excessive criticism or over-analysis. The result is often sharper flaw-finding without the same level of movement or practical resolution.',
  },
  {
    keys: ['style_operator', 'stress_avoidance'],
    title: 'Pressure Pattern',
    detail: 'Under strain, your preference for stability can become withdrawal from difficult issues. The likely cost is that unresolved tension sits longer and becomes harder to address cleanly later.',
  },
  {
    keys: ['style_influencer', 'stress_scatter'],
    title: 'Pressure Pattern',
    detail: 'Under strain, your energy can become diffuse and less focused. Activity may stay high, but prioritisation and follow-through can become less disciplined at the point they matter most.',
  },
];

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

function classifyDistribution(signalScores: readonly NormalizedSignalScore[]): 'concentrated' | 'balanced' | 'mixed' {
  const rankedSignals = getTopSignalsInRankOrder(signalScores);
  const first = rankedSignals[0];
  const second = rankedSignals[1];

  if (!first) {
    return 'mixed';
  }

  if (first.percentage >= CONCENTRATED_TOP_SIGNAL_THRESHOLD) {
    return 'concentrated';
  }

  if (
    second &&
    first.percentage <= BALANCED_TOP_SIGNAL_THRESHOLD &&
    Math.abs(first.percentage - second.percentage) <= BALANCED_TOP_TWO_GAP_THRESHOLD
  ) {
    return 'balanced';
  }

  return 'mixed';
}

function getSignalTemplate(signalKey: string): SignalTemplate {
  const exact = SIGNAL_TEMPLATES[signalKey];
  if (exact) {
    return exact;
  }

  const prefix = Object.keys(PREFIX_TEMPLATES).find((candidate) => signalKey.startsWith(candidate));
  if (prefix) {
    return PREFIX_TEMPLATES[prefix];
  }

  return DEFAULT_TEMPLATE;
}

function makeBulletItem(params: {
  key: string;
  title: string;
  detail: string;
  signalId?: string;
}): ResultBulletItem {
  return {
    key: params.key,
    title: params.title,
    detail: params.detail,
    signalId: params.signalId,
  };
}

function toSentenceCase(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function getActionFocusSignalLabel(signalScore: NormalizedSignalScore): string {
  switch (signalScore.signalKey) {
    case 'style_driver':
      return 'Driver';
    case 'style_influencer':
      return 'Influence';
    case 'style_operator':
      return 'Steady execution';
    case 'style_analyst':
      return 'Analysis';
    case 'conflict_avoid':
      return 'Use of avoidance';
    case 'role_technical_specialist':
      return 'Deep technical focus';
    case 'role_business_development':
      return 'Business development focus';
    case 'role_operations_management':
      return 'Operational leadership focus';
    case 'role_commercial_leadership':
      return 'Commercial leadership focus';
    default:
      return signalScore.signalTitle;
  }
}

function getWatchoutLabel(signalScore: NormalizedSignalScore): string {
  switch (signalScore.signalKey) {
    case 'style_driver':
      return 'drive';
    case 'conflict_avoid':
      return 'avoidance';
    default:
      return toSentenceCase(getActionFocusSignalLabel(signalScore));
  }
}

function getLowAccessLabel(signalScore: NormalizedSignalScore): string {
  switch (signalScore.signalKey) {
    case 'conflict_avoid':
      return 'avoidance';
    default:
      return toSentenceCase(getActionFocusSignalLabel(signalScore));
  }
}

function getUniqueSignals(signalScores: readonly NormalizedSignalScore[], count: number): readonly NormalizedSignalScore[] {
  const seen = new Set<string>();
  const unique: NormalizedSignalScore[] = [];

  for (const signalScore of signalScores) {
    if (seen.has(signalScore.signalId)) {
      continue;
    }

    seen.add(signalScore.signalId);
    unique.push(signalScore);
    if (unique.length >= count) {
      break;
    }
  }

  return unique;
}

function getSignalPairLookupToken(signalKey: string): string {
  const segments = signalKey.split('_').filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? signalKey;
}

function resolveCanonicalHeroPatternKey(
  signalScores: readonly NormalizedSignalScore[],
): string | null {
  const rankedSignals = getTopSignalsInRankOrder(signalScores);
  const topSignal = rankedSignals[0];
  const secondSignal = rankedSignals[1];

  if (!topSignal || !secondSignal) {
    return null;
  }

  const canonicalPair = canonicalizeSignalPairKey(
    `${getSignalPairLookupToken(topSignal.signalKey)}_${getSignalPairLookupToken(secondSignal.signalKey)}`,
  );
  return canonicalPair.success ? canonicalPair.canonicalSignalPair : null;
}

function resolveHeroOverviewStorageSection(
  signalScores: readonly NormalizedSignalScore[],
  section: 'headline' | 'summary',
  context?: ResultInterpretationContext,
): string | null {
  if (!context) {
    return null;
  }

  const canonicalPatternKey = resolveCanonicalHeroPatternKey(signalScores);
  if (!canonicalPatternKey) {
    return null;
  }

  const content = context.languageBundle.overview[canonicalPatternKey]?.[section]?.trim();
  return content ? content : null;
}

function resolveSignalLanguageSection(
  signalKey: string,
  section: 'strength' | 'watchout' | 'development',
  context?: ResultInterpretationContext,
): string | null {
  const content = context?.languageBundle.signals[signalKey]?.[section]?.trim();
  return content ? content : null;
}

export function buildOverviewSummary(
  normalizedResult: NormalizedResult,
  context?: ResultInterpretationContext,
): ResultOverviewSummary {
  const rankedSignals = getTopSignalsInRankOrder(normalizedResult.signalScores);
  const topSignal = rankedSignals[0];
  const secondSignal = rankedSignals[1];

  if (!topSignal) {
    return {
      headline: 'No leading signal available',
      narrative: 'This result is ready, but no signal activity was recorded in the persisted payload.',
    };
  }

  const topTemplate = getSignalTemplate(topSignal.signalKey);
  // Hero authoring still reads from overview-backed storage. This bridge keeps
  // the report-facing Hero model aligned without changing persisted storage.
  const overviewTemplateHeadline = resolveHeroOverviewStorageSection(rankedSignals, 'headline', context);
  const overviewTemplateSummary = resolveHeroOverviewStorageSection(rankedSignals, 'summary', context);
  const distribution = classifyDistribution(rankedSignals);
  let supportSentence = topTemplate.impact;

  if (
    distribution === 'balanced' &&
    secondSignal &&
    Math.abs(topSignal.percentage - secondSignal.percentage) <= BALANCED_TOP_TWO_GAP_THRESHOLD
  ) {
    supportSentence = `A close secondary signal in ${secondSignal.signalTitle} adds ${
      getSignalTemplate(secondSignal.signalKey).supportFragment
    }.`;
  }

  return {
    headline:
      overviewTemplateHeadline ??
      (topTemplate === DEFAULT_TEMPLATE ? topSignal.signalTitle : topTemplate.headline),
    narrative: overviewTemplateSummary ?? `${topTemplate.hero} ${supportSentence}`,
  };
}

export function buildStrengths(
  normalizedResult: NormalizedResult,
  context?: ResultInterpretationContext,
): readonly ResultBulletItem[] {
  return Object.freeze(
    getUniqueSignals(getTopSignalsInRankOrder(normalizedResult.signalScores), MAX_STRENGTH_COUNT).map((signalScore) =>
      makeBulletItem({
        key: `strength_${signalScore.signalKey}`,
        title: getActionFocusSignalLabel(signalScore),
        detail:
          resolveSignalLanguageSection(signalScore.signalKey, 'strength', context) ??
          getSignalTemplate(signalScore.signalKey).strength,
        signalId: signalScore.signalId,
      }),
    ),
  );
}

export function buildWatchouts(
  normalizedResult: NormalizedResult,
  context?: ResultInterpretationContext,
): readonly ResultBulletItem[] {
  const rankedSignals = getTopSignalsInRankOrder(normalizedResult.signalScores);
  const topSignal = rankedSignals[0];
  const lowestSignal = rankedSignals[rankedSignals.length - 1];
  const topKeys = new Set(rankedSignals.slice(0, 5).map((signalScore) => signalScore.signalKey));
  const bullets: ResultBulletItem[] = [];

  if (topSignal) {
    bullets.push(
      makeBulletItem({
        key: `watchout_overuse_${topSignal.signalKey}`,
        title: `Over-reliance on ${getWatchoutLabel(topSignal)}`,
        detail:
          resolveSignalLanguageSection(topSignal.signalKey, 'watchout', context) ??
          getSignalTemplate(topSignal.signalKey).watchout,
        signalId: topSignal.signalId,
      }),
    );
  }

  for (const rule of RULE_BASED_WATCHOUTS) {
    if (bullets.length >= MAX_WATCHOUT_COUNT) {
      break;
    }

    if (rule.keys.every((key) => topKeys.has(key))) {
      bullets.push(
        makeBulletItem({
          key: `watchout_rule_${rule.keys.join('_')}`,
          title: rule.title === 'Pressure Pattern' ? 'Pattern under pressure' : rule.title,
          detail: rule.detail,
        }),
      );
    }
  }

  if (bullets.length < MAX_WATCHOUT_COUNT && lowestSignal && lowestSignal.percentage <= DEVELOPMENT_SIGNAL_THRESHOLD) {
    bullets.push(
      makeBulletItem({
        key: `watchout_low_${lowestSignal.signalKey}`,
        title: `Limited use of ${getLowAccessLabel(lowestSignal)}`,
        detail:
          resolveSignalLanguageSection(lowestSignal.signalKey, 'watchout', context) ??
          getSignalTemplate(lowestSignal.signalKey).lowSignalRisk,
        signalId: lowestSignal.signalId,
      }),
    );
  }

  return Object.freeze(bullets.slice(0, MAX_WATCHOUT_COUNT));
}

export function buildDevelopmentFocus(
  normalizedResult: NormalizedResult,
  context?: ResultInterpretationContext,
): readonly ResultBulletItem[] {
  const lowestSignals = [...getTopSignalsInRankOrder(normalizedResult.signalScores)]
    .reverse()
    .filter((signalScore, index, values) => values.findIndex((candidate) => candidate.signalId === signalScore.signalId) === index)
    .filter((signalScore, index) => signalScore.percentage <= DEVELOPMENT_SIGNAL_THRESHOLD || index === 0)
    .slice(0, MAX_DEVELOPMENT_COUNT)
    .reverse();

  return Object.freeze(
    lowestSignals.map((signalScore) =>
      makeBulletItem({
        key: `development_${signalScore.signalKey}`,
        title: getActionFocusSignalLabel(signalScore),
        detail:
          resolveSignalLanguageSection(signalScore.signalKey, 'development', context) ??
          getSignalTemplate(signalScore.signalKey).development,
        signalId: signalScore.signalId,
      }),
    ),
  );
}
