export const rankedPatternSectionOrder = [
  '05_Context',
  '06_Orientation',
  '07_Recognition',
  '08_Signal_Roles',
  '09_Pattern_Mechanics',
  '10_Pattern_Synthesis',
  '11_Strengths',
  '12_Narrowing',
  '13_Application',
  '14_Closing_Integration',
] as const;

export type RankedPatternSectionKey = (typeof rankedPatternSectionOrder)[number];

type Status = 'active';
type DomainKey = 'flow-state';
type PatternKey = 'deep_focus_creative_movement_physical_rhythm_social_exchange';
type ScoreShape = 'concentrated';
type RankedSignalKey = 'deep_focus' | 'creative_movement' | 'physical_rhythm' | 'social_exchange';

type PatternIdentityFields = {
  domain_key: DomainKey;
  pattern_key: PatternKey;
  score_shape: ScoreShape;
  rank_1_signal_key: 'deep_focus';
  rank_2_signal_key: 'creative_movement';
  rank_3_signal_key: 'physical_rhythm';
  rank_4_signal_key: 'social_exchange';
};

type ContextRow = {
  domain_key: DomainKey;
  section_key: 'intro';
  domain_title: string;
  domain_definition: string;
  domain_scope: string;
  interpretation_guidance: string;
  intro_note: string;
  status: Status;
};

type OrientationRow = PatternIdentityFields & {
  orientation_title: string;
  orientation_summary: string;
  score_shape_summary: string;
  rank_1_phrase: string;
  rank_2_phrase: string;
  rank_3_phrase: string;
  rank_4_phrase: string;
  status: Status;
};

type RecognitionRow = PatternIdentityFields & {
  headline: string;
  recognition_statement: string;
  recognition_expansion: string;
  status: Status;
};

type SignalRoleRow = {
  domain_key: DomainKey;
  signal_key: RankedSignalKey;
  signal_label: string;
  rank_position: '1' | '2' | '3' | '4';
  rank_role: 'dominant' | 'secondary' | 'tertiary' | 'least_expressed';
  title: string;
  description: string;
  productive_expression: string;
  risk_pattern: string;
  development_note: string;
  status: Status;
};

type PatternMechanicsRow = PatternIdentityFields & {
  mechanics_title: string;
  core_mechanism: string;
  why_it_shows_up: string;
  what_it_protects: string;
  status: Status;
};

type PatternSynthesisRow = PatternIdentityFields & {
  synthesis_title: string;
  gift: string;
  trap: string;
  takeaway: string;
  synthesis_text: string;
  status: Status;
};

type StrengthRow = {
  domain_key: DomainKey;
  pattern_key: PatternKey;
  strength_key: 'strength_1' | 'strength_2' | 'strength_3';
  priority: '1' | '2' | '3';
  strength_title: string;
  strength_text: string;
  linked_signal_key: RankedSignalKey;
  status: Status;
};

type NarrowingRow = {
  domain_key: DomainKey;
  pattern_key: PatternKey;
  narrowing_key: 'narrowing_1' | 'narrowing_2' | 'narrowing_3';
  priority: '1' | '2' | '3';
  narrowing_title: string;
  narrowing_text: string;
  missing_range_signal_key: RankedSignalKey;
  status: Status;
};

type ApplicationRow = {
  domain_key: DomainKey;
  pattern_key: PatternKey;
  application_area: 'use_this_when' | 'watch_for' | 'develop_by';
  guidance_type: 'guidance';
  priority: '1' | '2' | '3';
  guidance_text: string;
  linked_signal_key: RankedSignalKey;
  status: Status;
};

type ClosingIntegrationRow = {
  domain_key: DomainKey;
  pattern_key: PatternKey;
  score_shape: ScoreShape;
  closing_summary: string;
  core_gift: string;
  core_trap: string;
  development_edge: string;
  memorable_line: string;
  status: Status;
};

export type RankedPatternExample = {
  '05_Context': readonly [ContextRow];
  '06_Orientation': readonly [OrientationRow];
  '07_Recognition': readonly [RecognitionRow];
  '08_Signal_Roles': readonly [SignalRoleRow, SignalRoleRow, SignalRoleRow, SignalRoleRow];
  '09_Pattern_Mechanics': readonly [PatternMechanicsRow];
  '10_Pattern_Synthesis': readonly [PatternSynthesisRow];
  '11_Strengths': readonly [StrengthRow, StrengthRow, StrengthRow];
  '12_Narrowing': readonly [NarrowingRow, NarrowingRow, NarrowingRow];
  '13_Application': readonly [ApplicationRow, ApplicationRow, ApplicationRow];
  '14_Closing_Integration': readonly [ClosingIntegrationRow];
};

export const rankedPatternExample = {
  '05_Context': [
    {
      domain_key: 'flow-state',
      section_key: 'intro',
      domain_title: 'Flow State',
      domain_definition:
        'Flow State describes the conditions under which attention becomes absorbed, effort feels steady, and progress starts to gather its own momentum.',
      domain_scope:
        'This domain looks at the kinds of work, movement, and contact that make absorbed engagement more likely to appear and easier to sustain.',
      interpretation_guidance:
        'Read the ranked signals as a practical map of likely flow conditions, not as a fixed identity or a complete account of how you work.',
      intro_note:
        'This is a ranked reading of the conditions most likely to help flow emerge, deepen, and stay useful.',
      status: 'active',
    },
  ],
  '06_Orientation': [
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      score_shape: 'concentrated',
      rank_1_signal_key: 'deep_focus',
      rank_2_signal_key: 'creative_movement',
      rank_3_signal_key: 'physical_rhythm',
      rank_4_signal_key: 'social_exchange',
      orientation_title: 'Pattern at a glance',
      orientation_summary:
        'Your flow gathers most quickly through private depth, then becomes more original when ideas can move. Physical Rhythm helps you reset, while Social Exchange is the range to bring in before the work becomes too private.',
      score_shape_summary:
        'The result is concentrated: Deep Focus is the clear anchor, with a noticeable drop before the other signals begin to shape, steady, and stretch the pattern.',
      rank_1_phrase: 'Rank 1: private depth, sustained attention, and demanding problems.',
      rank_2_phrase: 'Rank 2: ideas, expression, and movement that keep the depth alive.',
      rank_3_phrase: 'Rank 3: physical reset, energy change, and a way back into the work.',
      rank_4_phrase: 'Rank 4: conversation and feedback that may need to be invited deliberately.',
      status: 'active',
    },
  ],
  '07_Recognition': [
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      score_shape: 'concentrated',
      rank_1_signal_key: 'deep_focus',
      rank_2_signal_key: 'creative_movement',
      rank_3_signal_key: 'physical_rhythm',
      rank_4_signal_key: 'social_exchange',
      headline: 'Depth first, originality second',
      recognition_statement:
        'You are most likely to find flow when you can stay with something long enough for it to become interesting from the inside. The work usually needs quiet concentration first, then room for ideas to shift, connect, and take shape.',
      recognition_expansion:
        'This pattern often belongs to someone who does not need constant stimulation to feel engaged. You may prefer to work a problem privately until it starts to reveal its structure, then use creative movement to open new angles or make the thinking feel alive. Physical Rhythm helps when attention has become too enclosed or static. Social Exchange is useful, but it may arrive late: you may wait until the work feels clear to you before letting another person test it.',
      status: 'active',
    },
  ],
  '08_Signal_Roles': [
    {
      domain_key: 'flow-state',
      signal_key: 'deep_focus',
      signal_label: 'Deep Focus',
      rank_position: '1',
      rank_role: 'dominant',
      title: 'Deep Focus as dominant',
      description:
        'Deep Focus is the strongest condition for your flow. Absorption is most likely when your attention can settle on a substantial problem, stay there without too much interruption, and move past the first obvious answer.',
      productive_expression:
        'At its best, this gives you depth, patience, careful judgement, and the ability to keep working when the material is complex or unresolved.',
      risk_pattern:
        'When overused, the same depth can become private overwork. You may keep refining after the work needs feedback, movement, or a decision.',
      development_note:
        'Protect serious concentration, but set deliberate points where the work is tested before it becomes too complete in your own mind.',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      signal_key: 'creative_movement',
      signal_label: 'Creative Movement',
      rank_position: '2',
      rank_role: 'secondary',
      title: 'Creative Movement as secondary',
      description:
        'Creative Movement sits close behind the lead signal. It gives your depth more range, helping ideas shift, connect, and become more expressive rather than staying purely analytical.',
      productive_expression:
        'At its best, this brings originality, reframing, experimentation, and a sense that the work is opening rather than simply being solved.',
      risk_pattern:
        'When underused, your focus may become too fixed. When overused, possibility can pull attention away from the discipline needed to finish.',
      development_note:
        'Use creative movement to loosen the work at the right moment, then return to enough structure to make the insight usable.',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      signal_key: 'physical_rhythm',
      signal_label: 'Physical Rhythm',
      rank_position: '3',
      rank_role: 'tertiary',
      title: 'Physical Rhythm as tertiary',
      description:
        'Physical Rhythm is not the main source of flow, but it helps the system reset. Movement, pacing, or a change of physical state can make it easier to return with clearer attention.',
      productive_expression:
        'At its best, this gives you a practical way to release pressure, interrupt mental looping, and recover energy without abandoning the work.',
      risk_pattern:
        'When neglected, flow can become too mental and enclosed. You may try to think your way through a state that needs physical interruption.',
      development_note:
        'Build movement into transitions between phases of work, especially when concentration has become heavy, circular, or too still.',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      signal_key: 'social_exchange',
      signal_label: 'Social Exchange',
      rank_position: '4',
      rank_role: 'least_expressed',
      title: 'Social Exchange as least expressed',
      description:
        'Social Exchange is the least expressed signal, which means live discussion may not be your natural first move. You may prefer to understand something privately before exposing it to another person.',
      productive_expression:
        'At its best, Social Exchange sharpens, tests, and translates thinking that might otherwise remain too internal or over-finished.',
      risk_pattern:
        'When neglected, useful challenge can arrive too late. The work may feel complete to you before it has been made clear, relevant, or usable for others.',
      development_note:
        'Invite one well-chosen conversation earlier than feels natural, especially when the work has reached private clarity but not yet external proof.',
      status: 'active',
    },
  ],
  '09_Pattern_Mechanics': [
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      score_shape: 'concentrated',
      rank_1_signal_key: 'deep_focus',
      rank_2_signal_key: 'creative_movement',
      rank_3_signal_key: 'physical_rhythm',
      rank_4_signal_key: 'social_exchange',
      mechanics_title: 'Why this pattern shows up',
      core_mechanism:
        'Flow begins when attention can settle deeply, then gains energy when ideas start to move inside that depth. Physical Rhythm helps reset the system, while Social Exchange is the outside check that may need to be invited sooner.',
      why_it_shows_up:
        'This pattern tends to repeat because private concentration feels reliable. It gives the mind somewhere to go, and Creative Movement keeps that depth from becoming flat, repetitive, or purely controlled.',
      what_it_protects:
        'It protects the conditions needed for serious work: quiet, time, complexity, and the freedom to follow an idea until it becomes clearer. The cost is that feedback may be delayed until the thinking is already highly shaped.',
      status: 'active',
    },
  ],
  '10_Pattern_Synthesis': [
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      score_shape: 'concentrated',
      rank_1_signal_key: 'deep_focus',
      rank_2_signal_key: 'creative_movement',
      rank_3_signal_key: 'physical_rhythm',
      rank_4_signal_key: 'social_exchange',
      synthesis_title: 'The private-depth originality loop',
      gift: 'You can reach originality by staying with something longer than most people would.',
      trap:
        'The same privacy that creates depth can delay the feedback that would make the work sharper, clearer, or more useful.',
      takeaway:
        'Keep the depth, keep the originality, but bring in one external test before the work becomes too self-contained.',
      synthesis_text:
        'Your flow is not usually built from quick stimulation. It is built from sustained contact with a problem, followed by the point where ideas begin to move. Creative Movement gives the depth freshness; Physical Rhythm helps you reset when the work becomes too enclosed. Social Exchange matters most before the work is polished, because that is when a conversation can still widen it rather than simply react to it.',
      status: 'active',
    },
  ],
  '11_Strengths': [
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      strength_key: 'strength_1',
      priority: '1',
      strength_title: 'Originality through depth',
      strength_text:
        'You can produce ideas that feel earned rather than scattered, because they come from staying with the material until less obvious connections appear.',
      linked_signal_key: 'deep_focus',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      strength_key: 'strength_2',
      priority: '2',
      strength_title: 'Sustained problem contact',
      strength_text:
        'You can remain with difficult or unfinished material long enough to understand what is really happening beneath the surface.',
      linked_signal_key: 'deep_focus',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      strength_key: 'strength_3',
      priority: '3',
      strength_title: 'Useful reset rhythm',
      strength_text:
        'You have access to a practical recovery signal: movement, pacing, or physical change can help attention return without forcing a complete restart.',
      linked_signal_key: 'physical_rhythm',
      status: 'active',
    },
  ],
  '12_Narrowing': [
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      narrowing_key: 'narrowing_1',
      priority: '1',
      narrowing_title: 'Private over-refinement',
      narrowing_text:
        'You may keep improving the work internally after it has reached the point where feedback, distance, or a decision would be more useful.',
      missing_range_signal_key: 'deep_focus',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      narrowing_key: 'narrowing_2',
      priority: '2',
      narrowing_title: 'Late external testing',
      narrowing_text:
        'Because Social Exchange is least expressed, you may delay the conversation that would reveal whether the work is clear to anyone else.',
      missing_range_signal_key: 'social_exchange',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      narrowing_key: 'narrowing_3',
      priority: '3',
      narrowing_title: 'Self-contained certainty',
      narrowing_text:
        'Depth and originality can start to reinforce each other until the work feels convincing privately but has not yet been tested in the open.',
      missing_range_signal_key: 'social_exchange',
      status: 'active',
    },
  ],
  '13_Application': [
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      application_area: 'use_this_when',
      guidance_type: 'guidance',
      priority: '1',
      guidance_text:
        'Use this when the work requires protected thought, careful judgement, or an original angle. Give yourself enough uninterrupted time to find the real problem, then let Creative Movement open the next way in.',
      linked_signal_key: 'deep_focus',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      application_area: 'watch_for',
      guidance_type: 'guidance',
      priority: '2',
      guidance_text:
        'Watch for the moment when more private thinking stops improving the work. That is usually the sign to move, pause, or bring in one external view rather than keep tightening alone.',
      linked_signal_key: 'deep_focus',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      application_area: 'develop_by',
      guidance_type: 'guidance',
      priority: '3',
      guidance_text:
        'Develop by inviting feedback before the work feels fully finished. Choose one person who can test clarity, relevance, or usefulness without pulling the work away from its centre.',
      linked_signal_key: 'social_exchange',
      status: 'active',
    },
  ],
  '14_Closing_Integration': [
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      score_shape: 'concentrated',
      closing_summary:
        'Your flow is strongest when depth comes first and originality grows from sustained contact with the work. Physical Rhythm helps you reset the system; Social Exchange is the range to bring in before private clarity becomes too closed.',
      core_gift: 'You can find original insight by staying with complexity long enough for it to open.',
      core_trap: 'You may wait too long to let the work meet another mind.',
      development_edge:
        'Bring in one external test while the work is still shapeable, not only once it feels complete.',
      memorable_line: 'Let depth create the work, then let contact sharpen it.',
      status: 'active',
    },
  ],
} as const satisfies RankedPatternExample;

const requiredRowCounts = {
  '05_Context': 1,
  '06_Orientation': 1,
  '07_Recognition': 1,
  '08_Signal_Roles': 4,
  '09_Pattern_Mechanics': 1,
  '10_Pattern_Synthesis': 1,
  '11_Strengths': 3,
  '12_Narrowing': 3,
  '13_Application': 3,
  '14_Closing_Integration': 1,
} as const satisfies Record<RankedPatternSectionKey, number>;

const expectedPatternKey = 'deep_focus_creative_movement_physical_rhythm_social_exchange';
const expectedSignalRankOrder = [
  'deep_focus',
  'creative_movement',
  'physical_rhythm',
  'social_exchange',
] as const;

type PatternSpecificRow = { pattern_key: string };
type RankedPatternRow = PatternSpecificRow & {
  rank_1_signal_key: string;
  rank_2_signal_key: string;
  rank_3_signal_key: string;
  rank_4_signal_key: string;
};

function fail(message: string): never {
  throw new Error(`Invalid ranked pattern fixture: ${message}`);
}

function getPatternRows(example: RankedPatternExample): PatternSpecificRow[] {
  const patternRows: PatternSpecificRow[] = [];

  for (const sectionKey of rankedPatternSectionOrder) {
    for (const row of example[sectionKey]) {
      if ('pattern_key' in row) {
        patternRows.push(row);
      }
    }
  }

  return patternRows;
}

function getRankedRows(example: RankedPatternExample): RankedPatternRow[] {
  return getPatternRows(example).filter(
    (row): row is RankedPatternRow =>
      'rank_1_signal_key' in row &&
      'rank_2_signal_key' in row &&
      'rank_3_signal_key' in row &&
      'rank_4_signal_key' in row,
  );
}

export function validateRankedPatternExample(example: RankedPatternExample = rankedPatternExample): void {
  for (const sectionKey of rankedPatternSectionOrder) {
    if (!(sectionKey in example)) {
      fail(`missing section ${sectionKey}`);
    }

    const expectedCount = requiredRowCounts[sectionKey];
    const actualCount = example[sectionKey].length;

    if (actualCount !== expectedCount) {
      fail(`${sectionKey} row count must be ${expectedCount}, received ${actualCount}`);
    }
  }

  for (const row of getPatternRows(example)) {
    if (row.pattern_key !== expectedPatternKey) {
      fail(`pattern_key must be ${expectedPatternKey}, received ${row.pattern_key}`);
    }
  }

  for (const row of getRankedRows(example)) {
    const actualSignalRankOrder = [
      row.rank_1_signal_key,
      row.rank_2_signal_key,
      row.rank_3_signal_key,
      row.rank_4_signal_key,
    ];

    if (actualSignalRankOrder.join('|') !== expectedSignalRankOrder.join('|')) {
      fail(`signal rank order must be ${expectedSignalRankOrder.join(', ')}`);
    }
  }
}
