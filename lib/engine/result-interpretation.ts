import type {
  NormalizedResult,
  NormalizedSignalScore,
  ResultBulletItem,
  ResultOverviewSummary,
} from '@/lib/engine/types';

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
  headline: 'A clear operating preference is coming through',
  hero: 'You tend to rely on this signal when deciding how to respond and where to place your effort.',
  impact: 'This is usually most useful when you need a dependable way to approach work and make progress.',
  supportFragment: 'additional range around how you apply it',
  strength: 'This signal is likely to be one of the most available ways you add value day to day.',
  watchout: 'When overused, this preference can become too dominant and crowd out other useful responses.',
  lowSignalRisk: 'When this signal is less available, you may miss some useful options in situations that call for it.',
  development: 'Practise using this signal deliberately in lower-risk situations so it is available when the context changes.',
};

const PREFIX_TEMPLATES: Record<string, SignalTemplate> = {
  style_: {
    headline: 'A clear working style is coming through',
    hero: 'You tend to approach work in a consistent way that shapes how quickly you move, how much structure you use, and how you show up with others.',
    impact: 'This is usually most useful because it gives people a reliable sense of how you operate when work needs to move.',
    supportFragment: 'additional style range',
    strength: 'This working style is likely to be one of the clearest ways you add value in day-to-day situations.',
    watchout: 'When overused, this style can become too dominant and make it harder to flex with people or context.',
    lowSignalRisk: 'When this style is less available, you may have less range when a different response is needed.',
    development: 'Practise using this style more deliberately in lower-risk situations so it is easier to access when needed.',
  },
  mot_: {
    headline: 'A clear source of motivation is coming through',
    hero: 'You are likely to stay most engaged when the work rewards this kind of progress, environment, or contribution.',
    impact: 'This matters because motivation tends to shape where you sustain effort and where your energy drops.',
    supportFragment: 'extra energy in that direction',
    strength: 'This motivation is likely to help you sustain effort and stay invested when the work matches it.',
    watchout: 'When overused, this driver can narrow what feels worthwhile and reduce your flexibility in other settings.',
    lowSignalRisk: 'When this driver is less available, you may underuse a useful source of motivation in the right context.',
    development: 'Look for small ways to activate this driver more deliberately so it becomes easier to access when the role needs it.',
  },
  lead_: {
    headline: 'A clear leadership pattern is coming through',
    hero: 'When you step into leadership, this is one of the clearest ways you are likely to guide people and shape the work.',
    impact: 'This matters because it affects what people get from you first when direction, accountability, or support is needed.',
    supportFragment: 'more leadership range',
    strength: 'This leadership pattern is likely to be a dependable way you create value when others need direction.',
    watchout: 'When overused, this approach can lean too far in one direction and leave other leadership needs under-served.',
    lowSignalRisk: 'When this pattern is less available, you may have less range in leadership situations that call for it.',
    development: 'Build more deliberate range in this leadership pattern so it is available without taking over every situation.',
  },
  conflict_: {
    headline: 'A clear conflict response is coming through',
    hero: 'When tension appears, this is one of the clearest ways you are likely to respond.',
    impact: 'This matters because conflict style shapes whether issues get surfaced, softened, shared, or delayed.',
    supportFragment: 'more range in conflict',
    strength: 'This response is likely to help you in some conflict situations because it gives you a dependable way to engage.',
    watchout: 'When overused, this response can become too fixed and make it harder to adapt to what the disagreement needs.',
    lowSignalRisk: 'When this response is less available, you may miss a useful option when tension rises.',
    development: 'Practise this response in lower-risk disagreements so it becomes easier to use deliberately rather than by habit.',
  },
  culture_: {
    headline: 'A clear environment preference is coming through',
    hero: 'You are likely to do your best work when the surrounding culture rewards this kind of behaviour and operating rhythm.',
    impact: 'This matters because environment fit affects how naturally your strengths come through.',
    supportFragment: 'extra environmental fit in that direction',
    strength: 'This preference is likely to help you recognise the environments where you can contribute most naturally.',
    watchout: 'When overused, this preference can become too narrow and make other workable environments feel harder than they need to.',
    lowSignalRisk: 'When this preference is less available, you may overlook some environments where you could still work effectively.',
    development: 'Build more conscious range around this environment preference so you can adapt without losing your best work.',
  },
  stress_: {
    headline: 'A pressure pattern is coming through',
    hero: 'Under strain, this is one of the clearest ways your behaviour may shift.',
    impact: 'This matters because pressure patterns often show up faster than intention unless you recognise them early.',
    supportFragment: 'additional pressure awareness',
    strength: 'Recognising this pressure pattern gives you a better chance of using it well before it runs too far.',
    watchout: 'When overused, this pressure response can start to reduce judgement, range, or trust with others.',
    lowSignalRisk: 'When this pressure response is less available, you may miss a useful warning sign about how strain shows up.',
    development: 'Build a simple pressure reset around this pattern so it becomes easier to spot and manage early.',
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
    strength: 'You are likely to be effective when progress is stuck and a team needs direction, urgency, or firmer calls.',
    watchout: 'When overused, this can come across as too forceful, too fast, or too impatient with slower thinkers.',
    lowSignalRisk: 'When this signal is less available, you may hesitate to take ownership or make the hard call when momentum is needed.',
    development: 'Build more conscious range in direct challenge and decisive ownership so you can step forward earlier when pace matters.',
  },
  style_influencer: {
    headline: 'Engaging, visible and momentum-building',
    hero: 'You tend to work through connection, energy, and visible engagement, helping people move with an idea rather than just understand it.',
    impact: 'This is often most useful when buy-in, communication, and positive momentum matter as much as the plan itself.',
    supportFragment: 'extra visibility and relational lift',
    strength: 'You are likely to add value by lifting energy, opening conversations, and helping people engage quickly.',
    watchout: 'When overused, this can become too impression-led, too broad, or too light on detail and follow-through.',
    lowSignalRisk: 'When this signal is less available, others may experience you as harder to read, engage, or rally around.',
    development: 'Practise making your thinking more visible and engaging others earlier so communication becomes a more available strength.',
  },
  style_operator: {
    headline: 'Steady, dependable and execution-focused',
    hero: 'You tend to value consistency, follow-through, and practical execution, preferring a reliable path over unnecessary disruption.',
    impact: 'This is often most useful when work depends on dependability, continuity, and disciplined delivery.',
    supportFragment: 'more steadiness and execution discipline',
    strength: 'You are likely to add value by keeping work grounded, dependable, and moving without unnecessary noise.',
    watchout: 'When overused, this can become too cautious, too change-resistant, or too slow to adapt when conditions shift.',
    lowSignalRisk: 'When this signal is less available, consistency and completion can suffer when work needs patience and disciplined follow-through.',
    development: 'Build more deliberate range in steady execution and routine discipline so reliability stays available under pressure.',
  },
  style_analyst: {
    headline: 'Structured, thoughtful and evidence-led',
    hero: 'You tend to slow situations down enough to think clearly, test assumptions, and work from logic rather than impulse.',
    impact: 'This is often most useful when accuracy, sound judgement, and careful problem-solving matter.',
    supportFragment: 'more structure and analytical discipline',
    strength: 'You are likely to add value by spotting patterns, improving quality, and bringing stronger reasoning into decisions.',
    watchout: 'When overused, this can become over-analysis, excessive caution, or a reluctance to move before everything feels resolved.',
    lowSignalRisk: 'When this signal is less available, decisions may move ahead without enough challenge, rigour, or evidence.',
    development: 'Build more deliberate range in structured review and evidence-checking so clear judgement is available before key decisions.',
  },
  decision_evidence: {
    headline: 'Prefers evidence, logic and proof in decisions',
    hero: 'You tend to make decisions by checking facts, testing assumptions, and building enough evidence to trust the call.',
    impact: 'This is often most useful when judgement quality matters and weak assumptions carry real cost.',
    supportFragment: 'more rigour and evidence-checking',
    strength: 'You are likely to add value by improving decision quality and reducing avoidable risk caused by weak assumptions.',
    watchout: 'When overused, this can delay action or make it harder to move when evidence will only become clear through action.',
    lowSignalRisk: 'When this signal is less available, decisions may move faster but carry more avoidable assumption risk.',
    development: 'Practise using concise evidence checks so rigour stays available without turning every decision into a long review.',
  },
  lead_people: {
    headline: 'Leads through trust, support and people growth',
    hero: 'When leading, you are likely to focus on how people are doing, what support they need, and how to help them grow and contribute well.',
    impact: 'This is often most useful when trust, engagement, and team development are essential to performance.',
    supportFragment: 'more trust-building and support',
    strength: 'You are likely to add value by strengthening relationships, creating support, and helping people stay engaged in the work.',
    watchout: 'When overused, this can soften challenge, delay difficult calls, or protect harmony at the expense of performance.',
    lowSignalRisk: 'When this signal is less available, leadership may miss the human support and trust that help teams sustain performance.',
    development: 'Practise more active coaching, check-ins, and trust-building conversations so people leadership is easier to access when needed.',
  },
};

const RULE_BASED_WATCHOUTS = [
  {
    keys: ['style_driver', 'stress_control'],
    title: 'Pressure Pattern',
    detail: 'Under strain, your drive for results can harden into over-control.',
  },
  {
    keys: ['style_analyst', 'stress_criticality'],
    title: 'Pressure Pattern',
    detail: 'Under strain, your standards can harden into excessive criticism or over-analysis.',
  },
  {
    keys: ['style_operator', 'stress_avoidance'],
    title: 'Pressure Pattern',
    detail: 'Under strain, your preference for stability can become withdrawal from difficult issues.',
  },
  {
    keys: ['style_influencer', 'stress_scatter'],
    title: 'Pressure Pattern',
    detail: 'Under strain, your energy can become diffuse and less focused.',
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

export function buildOverviewSummary(normalizedResult: NormalizedResult): ResultOverviewSummary {
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
    headline: topTemplate.headline,
    narrative: `${topTemplate.hero} ${supportSentence}`,
  };
}

export function buildStrengths(normalizedResult: NormalizedResult): readonly ResultBulletItem[] {
  return Object.freeze(
    getUniqueSignals(getTopSignalsInRankOrder(normalizedResult.signalScores), MAX_STRENGTH_COUNT).map((signalScore) =>
      makeBulletItem({
        key: `strength_${signalScore.signalKey}`,
        title: signalScore.signalTitle,
        detail: getSignalTemplate(signalScore.signalKey).strength,
        signalId: signalScore.signalId,
      }),
    ),
  );
}

export function buildWatchouts(normalizedResult: NormalizedResult): readonly ResultBulletItem[] {
  const rankedSignals = getTopSignalsInRankOrder(normalizedResult.signalScores);
  const topSignal = rankedSignals[0];
  const lowestSignal = rankedSignals[rankedSignals.length - 1];
  const topKeys = new Set(rankedSignals.slice(0, 5).map((signalScore) => signalScore.signalKey));
  const bullets: ResultBulletItem[] = [];

  if (topSignal) {
    bullets.push(
      makeBulletItem({
        key: `watchout_overuse_${topSignal.signalKey}`,
        title: `Overused ${topSignal.signalTitle}`,
        detail: getSignalTemplate(topSignal.signalKey).watchout,
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
          title: rule.title,
          detail: rule.detail,
        }),
      );
    }
  }

  if (bullets.length < MAX_WATCHOUT_COUNT && lowestSignal && lowestSignal.percentage <= DEVELOPMENT_SIGNAL_THRESHOLD) {
    bullets.push(
      makeBulletItem({
        key: `watchout_low_${lowestSignal.signalKey}`,
        title: `Lower access to ${lowestSignal.signalTitle}`,
        detail: getSignalTemplate(lowestSignal.signalKey).lowSignalRisk,
        signalId: lowestSignal.signalId,
      }),
    );
  }

  return Object.freeze(bullets.slice(0, MAX_WATCHOUT_COUNT));
}

export function buildDevelopmentFocus(normalizedResult: NormalizedResult): readonly ResultBulletItem[] {
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
        title: signalScore.signalTitle,
        detail: getSignalTemplate(signalScore.signalKey).development,
        signalId: signalScore.signalId,
      }),
    ),
  );
}
