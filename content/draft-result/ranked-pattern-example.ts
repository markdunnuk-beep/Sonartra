export const rankedPatternSectionOrder = [
    "05_Context",
    "06_Orientation",
    "07_Recognition",
    "08_Signal_Roles",
    "09_Pattern_Mechanics",
    "10_Pattern_Synthesis",
    "11_Strengths",
    "12_Narrowing",
    "13_Application",
    "14_Closing_Integration"
  ] as const;

export type RankedPatternSectionKey = (typeof rankedPatternSectionOrder)[number];

export const rankedPatternExample = {
    "05_Context": [
      {
        "domain_key": "flow-state",
        "section_key": "05_Context",
        "domain_title": "Flow State",
        "domain_definition": "Flow State describes the conditions under which attention becomes absorbed, effort feels steady, and progress starts to feel self-sustaining.",
        "domain_scope": "This domain looks at the conditions that make useful work easier to enter and easier to keep going across focus, ideas, movement, and conversation.",
        "interpretation_guidance": "Read the ranked signals as likely flow conditions, not as a fixed identity. Lower-ranked signals are range to use deliberately, not weaknesses.",
        "intro_note": "This is a ranked reading of the conditions most likely to help flow start, deepen, reset, and become useful.",
        "status": "active"
      }
    ],
    "06_Orientation": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "balanced",
        "rank_1_signal_key": "deep_focus",
        "rank_2_signal_key": "creative_movement",
        "rank_3_signal_key": "physical_rhythm",
        "rank_4_signal_key": "social_exchange",
        "orientation_title": "Deep focus first",
        "orientation_summary": "Start by looking at Deep focus. Bring in ideas, expression, and new angles when the work needs more range.",
        "score_shape_summary": "Your scores are close together. Treat the ranking lightly and read this as a flexible flow profile.",
        "rank_1_phrase": "Your main route is focused time with one demanding problem.",
        "rank_2_phrase": "What adds energy: ideas, expression, and new angles.",
        "rank_3_phrase": "What helps you reset: movement, pace, and a change of physical state.",
        "rank_4_phrase": "What to use deliberately: conversation and feedback before the work becomes too private.",
        "status": "draft"
      }
    ],
    "07_Recognition": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "balanced",
        "rank_1_signal_key": "deep_focus",
        "rank_2_signal_key": "creative_movement",
        "rank_3_signal_key": "physical_rhythm",
        "rank_4_signal_key": "social_exchange",
        "headline": "Several ways into flow",
        "recognition_statement": "You are likely to find flow through different conditions depending on the work in front of you.",
        "recognition_expansion": "Deep Focus appears first, but not by enough to make the result one-sided. You may use quiet concentration, fresh ideas, movement, or conversation at different points. The useful question is not which signal defines you. It is which condition the work needs now.",
        "status": "active"
      }
    ],
    "08_Signal_Roles": [
      {
        "domain_key": "flow-state",
        "signal_key": "deep_focus",
        "signal_label": "Deep Focus",
        "rank_position": "1",
        "rank_role": "dominant",
        "title": "Deep Focus as a light starting point",
        "description": "Deep Focus is the first place to look, especially when the work needs attention, care, or enough time to settle. In this balanced result, it is a starting point rather than the whole route.",
        "productive_expression": "This can help you stay with the work long enough to see what matters.",
        "risk_pattern": "The risk is treating focus as the answer when the task may need movement, a new angle, or another person.",
        "development_note": "Start with focus when the work needs depth, then check whether another condition would help it move.",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "signal_key": "creative_movement",
        "signal_label": "Creative Movement",
        "rank_position": "2",
        "rank_role": "secondary",
        "title": "Creative Movement as a close option",
        "description": "Creative Movement is close enough to matter. It can help when the work needs ideas, alternatives, expression, or a different way through.",
        "productive_expression": "This can help you stop the work becoming too fixed, narrow, or over-controlled.",
        "risk_pattern": "The risk is opening more possibilities when the work already needs a clearer choice.",
        "development_note": "Use ideas to widen the work when needed, then decide which angle is worth keeping.",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "signal_key": "physical_rhythm",
        "signal_label": "Physical Rhythm",
        "rank_position": "3",
        "rank_role": "tertiary",
        "title": "Physical Rhythm as a useful change of state",
        "description": "Physical Rhythm gives this pattern a practical way to shift attention. Movement, pace, or a change of setting may help when sitting still is not helping.",
        "productive_expression": "This can help you reset energy, clear mental clutter, and return to the task with more steadiness.",
        "risk_pattern": "The risk is missing the point where a physical reset would help, or staying active when the work now needs focus.",
        "development_note": "Bring in movement when the work feels stuck, heavy, or too mental.",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "signal_key": "social_exchange",
        "signal_label": "Social Exchange",
        "rank_position": "4",
        "rank_role": "least_expressed",
        "title": "Social Exchange as deliberate range",
        "description": "Social Exchange sits fourth, but it is still meaningful in a balanced profile. Conversation, feedback, or shared thinking can help when the work needs testing outside your own view.",
        "productive_expression": "This can help you check whether the work makes sense to someone else.",
        "risk_pattern": "The risk is using conversation too late, after you have already spent energy trying to solve everything alone.",
        "development_note": "Bring in one useful person when the work needs clarity, response, or a reality check.",
        "status": "active"
      }
    ],
    "09_Pattern_Mechanics": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "balanced",
        "rank_1_signal_key": "deep_focus",
        "rank_2_signal_key": "creative_movement",
        "rank_3_signal_key": "physical_rhythm",
        "rank_4_signal_key": "social_exchange",
        "mechanics_title": "Why the route changes",
        "core_mechanism": "This pattern works by giving the person several usable entry points into flow, rather than one fixed route.",
        "why_it_shows_up": "It may show up because different kinds of work ask for different conditions. A demanding problem may need quiet focus. A blank page may need ideas. A heavy day may need movement. A decision may need conversation.",
        "what_it_protects": "It protects adaptability. The trade-off is that the person may switch conditions too quickly instead of choosing the one that best fits the task.",
        "status": "active"
      }
    ],
    "10_Pattern_Synthesis": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "balanced",
        "rank_1_signal_key": "deep_focus",
        "rank_2_signal_key": "creative_movement",
        "rank_3_signal_key": "physical_rhythm",
        "rank_4_signal_key": "social_exchange",
        "synthesis_title": "Flexible flow with a light first route",
        "gift": "You can adapt how you enter flow depending on the work, the setting, and your energy.",
        "trap": "You may keep changing conditions instead of giving one route enough time to work.",
        "takeaway": "Choose the condition before you begin, then give it a fair chance.",
        "synthesis_text": "This pattern is strongest when flexibility becomes deliberate. Deep Focus can help you settle into the work. Creative Movement can open a better angle. Physical Rhythm can change your state. Social Exchange can test the result with another person. The skill is choosing the right condition for the moment, not trying to use every route at once.",
        "status": "active"
      }
    ],
    "11_Strengths": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "strength_key": "strength_1",
        "priority": "1",
        "strength_title": "Adapting to the task",
        "strength_text": "You can change how you approach work depending on what it needs. This helps when one fixed routine would be too narrow.",
        "linked_signal_key": "deep_focus",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "strength_key": "strength_2",
        "priority": "2",
        "strength_title": "Using more than one route",
        "strength_text": "You may be able to move between focus, ideas, movement, and conversation without treating any one condition as the only answer.",
        "linked_signal_key": "creative_movement",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "strength_key": "strength_3",
        "priority": "3",
        "strength_title": "Reading your state",
        "strength_text": "You can often notice when the work needs a shift in pace, setting, attention, or input. This gives you more ways to recover progress.",
        "linked_signal_key": "physical_rhythm",
        "status": "active"
      }
    ],
    "12_Narrowing": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "narrowing_key": "narrowing_1",
        "priority": "1",
        "narrowing_title": "Switching too soon",
        "narrowing_text": "You may change conditions before the work has had enough time to develop. A different route can feel useful, even when the real need is to stay with the current one a little longer.",
        "missing_range_signal_key": "deep_focus",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "narrowing_key": "narrowing_2",
        "priority": "2",
        "narrowing_title": "Mistaking flexibility for progress",
        "narrowing_text": "Trying a new angle, moving around, or talking something through can feel productive. The risk is using variety when the work now needs a choice.",
        "missing_range_signal_key": "creative_movement",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "narrowing_key": "narrowing_3",
        "priority": "3",
        "narrowing_title": "Leaving feedback until later",
        "narrowing_text": "Because several routes are available, you may try to solve the work through your own process first. A timely outside response can stop you spending too long choosing alone.",
        "missing_range_signal_key": "social_exchange",
        "status": "active"
      }
    ],
    "13_Application": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "application_area": "use_this_when",
        "guidance_type": "guidance",
        "priority": "1",
        "guidance_text": "Use this pattern when the work could start in more than one way. Before you begin, name the condition the task most needs: quiet focus, a fresh angle, movement, or a useful conversation.",
        "linked_signal_key": "deep_focus",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "application_area": "watch_for",
        "guidance_type": "guidance",
        "priority": "2",
        "guidance_text": "Watch for the moment when changing conditions becomes a way to avoid deciding. If the work is already moving, stay with it long enough to see what it produces.",
        "linked_signal_key": "creative_movement",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "application_area": "develop_by",
        "guidance_type": "guidance",
        "priority": "3",
        "guidance_text": "Develop by choosing one route for the first stretch of work. Set a simple checkpoint, then decide whether to stay focused, move, open ideas, or ask for input.",
        "linked_signal_key": "social_exchange",
        "status": "active"
      }
    ],
    "14_Closing_Integration": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "balanced",
        "closing_summary": "This result points to a flexible flow profile. Deep Focus is the first signal to check, but Creative Movement, Physical Rhythm, and Social Exchange are all close enough to matter. You are likely to work best when you choose the condition that fits the task, then give it enough time to work.",
        "core_gift": "Your gift is the ability to adapt your route into flow without being locked into one method.",
        "core_trap": "The trap is changing conditions before the work has enough direction or depth.",
        "development_edge": "The useful edge is to choose the route the work needs now, then review it at a clear checkpoint.",
        "memorable_line": "Choose the condition. Give it time. Then adjust with purpose.",
        "status": "active"
      }
    ]
  } as const;

const requiredRowCounts = {
    "05_Context": 1,
    "06_Orientation": 1,
    "07_Recognition": 1,
    "08_Signal_Roles": 4,
    "09_Pattern_Mechanics": 1,
    "10_Pattern_Synthesis": 1,
    "11_Strengths": 3,
    "12_Narrowing": 3,
    "13_Application": 3,
    "14_Closing_Integration": 1
  } as const satisfies Record<RankedPatternSectionKey, number>;

const expectedPatternKey = "deep_focus_creative_movement_physical_rhythm_social_exchange";
const expectedSignalRankOrder = [
    "deep_focus",
    "creative_movement",
    "physical_rhythm",
    "social_exchange"
  ] as const;

type RankedPatternExample = typeof rankedPatternExample;
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
