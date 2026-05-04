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
        'Flow is a state of absorbed engagement where attention, effort, and progress start to align.',
      domain_scope: 'This assessment identifies the conditions under which flow is most likely to emerge.',
      interpretation_guidance:
        'Read the ranked pattern as a guide to likely flow conditions, not as a fixed identity.',
      intro_note: 'Draft example only. Replace with final domain copy before release.',
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
      orientation_title: 'Deep Focus pattern at a glance',
      orientation_summary:
        'Deep Focus leads the pattern, Creative Movement shapes it, Physical Rhythm gives it support, and Social Exchange is the least expressed route.',
      score_shape_summary:
        'Because the result is concentrated, Deep Focus should be read as the clear anchor rather than one equal signal among four.',
      rank_1_phrase: 'Deep Focus leads: private depth and sustained attention.',
      rank_2_phrase: 'Creative Movement shapes: ideas, expression, and possibility.',
      rank_3_phrase:
        'Physical Rhythm supports: Physical Rhythm helps reset energy, release pressure, and keep the pattern from becoming too static.',
      rank_4_phrase:
        'Social Exchange is least expressed: Social Exchange is the stretch route, so the pattern may need deliberate feedback before private clarity becomes private certainty.',
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
      headline: 'Deep Focus led, shaped by Creative Movement',
      recognition_statement:
        'Your flow is most likely to begin in depth, then open into ideas. You tend to do your best work when you can stay with a demanding problem long enough for new possibilities to appear inside it.',
      recognition_expansion:
        'This pattern suggests that Deep Focus is the main entry point, while Creative Movement gives that route its strongest shape. Physical Rhythm helps reset energy, release pressure, and keep the pattern from becoming too static. Social Exchange is the stretch route, so the pattern may need deliberate feedback before private clarity becomes private certainty. Because the result is concentrated, Deep Focus should be read as the clear anchor rather than one equal signal among four.',
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
        'Deep Focus is your strongest route into flow. You are most likely to become absorbed when your attention has a demanding problem to hold, enough quiet to settle, and enough time to move beyond the obvious first answer.',
      productive_expression:
        'At its best, this gives you sustained concentration, careful judgement, precision, and the ability to work through complexity without needing constant external stimulation.',
      risk_pattern:
        'When overused, Deep Focus can become narrowing. You may stay inside a problem for too long, resist interruption even when input would help, or mistake isolation for quality.',
      development_note:
        'Protect deep work, but build deliberate points where the work is moved, tested, or shared before it becomes too private.',
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
        'When Creative Movement sits second, it shapes and loosens your leading route into flow. You may begin through focus, movement, or exchange, but creativity helps the work develop beyond the obvious path.',
      productive_expression:
        'At its best, this helps you reframe problems, make connections, improve ideas, and bring freshness into work that might otherwise become too narrow or repetitive.',
      risk_pattern:
        'When underused, your primary route may become too fixed. When overused, it may pull you away from the discipline needed to finish.',
      development_note:
        'Use Creative Movement to open the work at the right moment, then return to enough structure to make the insight usable.',
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
        'When Physical Rhythm sits third, movement may support your flow without defining it. You may not always seek physical engagement first, but it can help you recover attention, shift state, and return to work with more clarity.',
      productive_expression:
        'At its best, this gives you a practical way to release pressure and change mental state when your primary routes become too intense or repetitive.',
      risk_pattern:
        'When neglected, your flow may become too mental, too static, or too dependent on ideal conditions.',
      development_note:
        'Use movement deliberately between work phases. Short walks, training, stretching, or changes of location can help your stronger signals work better.',
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
        'When Social Exchange is least expressed, conversation, group energy, and live collaboration may not be your most natural entry point into flow. You may prefer to work something through before exposing it to other people.',
      productive_expression:
        'At its best, Social Exchange can test, sharpen, and translate work that might otherwise stay too private or internally complete.',
      risk_pattern:
        'When neglected, your flow may become too private. You may delay sharing, miss useful challenge, or make it harder for others to engage with your best thinking.',
      development_note:
        'Develop Social Exchange as a deliberate refining tool. You do not need constant collaboration, but the right conversation at the right time can sharpen and extend your flow.',
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
      mechanics_title: 'Why this Deep Focus / Creative Movement pattern shows up',
      core_mechanism:
        'Deep Focus creates the entry point. Creative Movement gives that entry point its main character. Physical Rhythm provides a useful support route. Social Exchange names the range that may need to be developed deliberately.',
      why_it_shows_up:
        'You may return to this pattern because private depth and sustained attention feels like the most reliable way to organise attention. Creative Movement then makes that attention feel more productive, rewarding, or alive.',
      what_it_protects:
        'This pattern may protect the conditions you need most: enough access to sustained concentration, demanding problems, quiet depth, and careful thinking and enough reinforcement from ideas, expression, experimentation, reframing, and imaginative movement. The risk is that Social Exchange is only brought in after the pattern has already narrowed. Because the result is concentrated, Deep Focus should be read as the clear anchor rather than one equal signal among four.',
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
      synthesis_title: 'Deep Focus / Creative Movement synthesis',
      gift: 'You can find originality through depth, not just through quick inspiration.',
      trap:
        'The trap is that the same pattern that gives you flow may also make Social Exchange arrive too late, leaving the result narrower than it needs to be.',
      takeaway:
        'Use Deep Focus and Creative Movement deliberately, but build in Social Exchange before the work becomes too fixed.',
      synthesis_text:
        'This pattern suggests that flow begins when your attention can settle into something substantial. Creative Movement then gives that depth freshness, helping ideas emerge from sustained contact with the problem rather than from surface-level inspiration. Physical Rhythm may act as a reset route, helping you release pressure and return with clearer attention. Social Exchange is least expressed, so conversation may be most useful before the work becomes over-polished, not only after it is finished. Because the result is concentrated, Deep Focus should be read as the clear anchor rather than one equal signal among four.',
      status: 'active',
    },
  ],
  '11_Strengths': [
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      strength_key: 'strength_1',
      priority: '1',
      strength_title: 'Deep Focus with Creative Movement',
      strength_text:
        'This pattern combines private depth and sustained attention with ideas, expression, and possibility, giving flow both a clear entry point and a strong shaping force.',
      linked_signal_key: 'deep_focus',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      strength_key: 'strength_2',
      priority: '2',
      strength_title: 'Sustained problem solving',
      strength_text:
        'You can stay with difficult material long enough to see what is really happening. This supports patience, depth, and careful judgement.',
      linked_signal_key: 'deep_focus',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      strength_key: 'strength_3',
      priority: '3',
      strength_title: 'Restorative rhythm',
      strength_text:
        'Physical Rhythm gives the pattern a practical reset route, helping you release pressure and return with better attention.',
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
      narrowing_title: 'Overworking in private',
      narrowing_text:
        'You may keep refining, researching, or thinking after the work now needs feedback, distance, or a decision.',
      missing_range_signal_key: 'deep_focus',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      narrowing_key: 'narrowing_2',
      priority: '2',
      narrowing_title: 'Delayed external testing',
      narrowing_text:
        'When Social Exchange is least expressed, the work may feel clear to you before it is clear to anyone else.',
      missing_range_signal_key: 'social_exchange',
      status: 'active',
    },
    {
      domain_key: 'flow-state',
      pattern_key: 'deep_focus_creative_movement_physical_rhythm_social_exchange',
      narrowing_key: 'narrowing_3',
      priority: '3',
      narrowing_title: 'Pattern becoming too self-contained',
      narrowing_text:
        'When Deep Focus and Creative Movement dominate, the pattern may keep repeating what already works instead of inviting Social Exchange early enough to widen the range.',
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
        'Use this pattern when the work needs protected depth and original thinking. Start with uninterrupted attention, then allow Creative Movement to open new angles before the work is closed down.',
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
        'Watch for the point where Deep Focus becomes too dominant. If the work stops improving, the missing range may be Social Exchange, not more of the same effort.',
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
        'Develop by bringing in one trusted person before the work feels fully finished. Use the conversation to test clarity, relevance, and whether your private logic can be understood by others.',
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
        'Your flow is strongest when Deep Focus comes first and Creative Movement gives it shape. Physical Rhythm can support the pattern, while Social Exchange is the range to bring in deliberately.',
      core_gift: 'You can find originality through depth, not just through quick inspiration.',
      core_trap:
        'The trap is that the same pattern that gives you flow may also make Social Exchange arrive too late, leaving the result narrower than it needs to be.',
      development_edge:
        'Your development edge is to invite Social Exchange earlier, before the lead pattern becomes too fixed.',
      memorable_line: 'Use Deep Focus to enter flow, but use Social Exchange to widen it.',
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
