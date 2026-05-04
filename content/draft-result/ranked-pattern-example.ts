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
        "score_shape": "concentrated",
        "rank_1_signal_key": "deep_focus",
        "rank_2_signal_key": "creative_movement",
        "rank_3_signal_key": "physical_rhythm",
        "rank_4_signal_key": "social_exchange",
        "orientation_title": "Deep focus first",
        "orientation_summary": "Start by looking at Deep focus. Bring in ideas, expression, and new angles when the work needs more range.",
        "score_shape_summary": "One signal is doing most of the work here. Deep focus is the clearest starting point for this result.",
        "rank_1_phrase": "Your main route is focused time with one demanding problem.",
        "rank_2_phrase": "What adds energy: ideas, expression, and new angles.",
        "rank_3_phrase": "What helps you reset: movement, pace, and a change of physical state.",
        "rank_4_phrase": "What to use deliberately: conversation and feedback before the work becomes too private.",
        "status": "active"
      }
    ],
    "07_Recognition": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "concentrated",
        "rank_1_signal_key": "deep_focus",
        "rank_2_signal_key": "creative_movement",
        "rank_3_signal_key": "physical_rhythm",
        "rank_4_signal_key": "social_exchange",
        "headline": "Better ideas after focused work",
        "recognition_statement": "You are most likely to find flow when you have time to stay with one demanding thing before opening it up.",
        "recognition_expansion": "This pattern often shows up when you need quiet time to understand the work properly. You may reread the brief, sit with the problem, or build a first version alone before you want input. Creative Movement then helps the work loosen and develop. Physical Rhythm helps when concentration starts to feel heavy. Social Exchange becomes useful when the idea needs to make sense to someone else.",
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
        "title": "Deep Focus as the starting point",
        "description": "Deep Focus is where this pattern usually begins. Attention settles best when there is one substantial problem, enough time, and limited interruption.",
        "productive_expression": "This can give you patience, careful judgement, and the ability to move beyond the first obvious answer.",
        "risk_pattern": "The risk is treating more thinking as the answer when the work now needs testing, movement, or a decision.",
        "development_note": "Protect serious focus, then choose a point where the work has to meet a practical test.",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "signal_key": "creative_movement",
        "signal_label": "Creative Movement",
        "rank_position": "2",
        "rank_role": "secondary",
        "title": "Creative Movement as the source of range",
        "description": "Creative Movement helps the work develop once the first layer of understanding is in place. It brings new angles, expression, and a less rigid way forward.",
        "productive_expression": "This can turn careful thinking into work with more originality, shape, and point of view.",
        "risk_pattern": "The risk is adding possibilities after the work already needs finishing.",
        "development_note": "Use new ideas to refresh the work, then return to the clearest next decision.",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "signal_key": "physical_rhythm",
        "signal_label": "Physical Rhythm",
        "rank_position": "3",
        "rank_role": "tertiary",
        "title": "Physical Rhythm as a practical reset",
        "description": "Physical Rhythm helps when attention becomes heavy, static, or too enclosed. Movement, pace, or a change of setting can make progress easier again.",
        "productive_expression": "This can help you recover attention without abandoning the work.",
        "risk_pattern": "The risk is ignoring physical cues until concentration becomes forced or circular.",
        "development_note": "Use movement earlier when you notice that staying still is no longer improving the work.",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "signal_key": "social_exchange",
        "signal_label": "Social Exchange",
        "rank_position": "4",
        "rank_role": "least_expressed",
        "title": "Social Exchange as useful outside perspective",
        "description": "Social Exchange may not be your first way into flow, but it can add range when the work needs to be tested beyond your own view.",
        "productive_expression": "This can help you check whether the idea is clear, useful, and easy for another person to understand.",
        "risk_pattern": "The risk is waiting until the work feels finished before letting anyone respond to it.",
        "development_note": "Invite one useful person in while the work is still easy to improve.",
        "status": "active"
      }
    ],
    "09_Pattern_Mechanics": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "concentrated",
        "rank_1_signal_key": "deep_focus",
        "rank_2_signal_key": "creative_movement",
        "rank_3_signal_key": "physical_rhythm",
        "rank_4_signal_key": "social_exchange",
        "mechanics_title": "Why this pattern stays private at first",
        "core_mechanism": "This pattern works by creating trust in the work before it is shared. Focus gives the person enough contact with the problem to know what matters, then ideas, movement, and feedback each have a clearer job.",
        "why_it_shows_up": "It may show up because early input can feel distracting before the person has found their own line of thought. The work feels safer and more useful once there is something solid to respond to.",
        "what_it_protects": "It protects depth, judgement, and the space needed to form a real point of view. The trade-off is that outside perspective can arrive later than it needs to.",
        "status": "active"
      }
    ],
    "10_Pattern_Synthesis": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "concentrated",
        "rank_1_signal_key": "deep_focus",
        "rank_2_signal_key": "creative_movement",
        "rank_3_signal_key": "physical_rhythm",
        "rank_4_signal_key": "social_exchange",
        "synthesis_title": "Depth that becomes original work",
        "gift": "You can stay with the work long enough to see what other people might miss.",
        "trap": "You may wait too long to find out whether the idea is clear to anyone else.",
        "takeaway": "Let focus do its job, then test the work before it hardens.",
        "synthesis_text": "This pattern is strongest when depth turns into usable originality. Creative Movement helps the work avoid becoming too narrow. Physical Rhythm gives you a way to restart when attention gets stuck. Social Exchange adds the reality check that helps the work become clearer outside your own process.",
        "status": "active"
      }
    ],
    "11_Strengths": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "strength_key": "strength_1",
        "priority": "1",
        "strength_title": "Careful thought under pressure",
        "strength_text": "You can stay with complex work without rushing to the easiest answer. This helps you notice detail, tension, and meaning that may not be obvious at first.",
        "linked_signal_key": "deep_focus",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "strength_key": "strength_2",
        "priority": "2",
        "strength_title": "Originality with substance",
        "strength_text": "Your ideas are likely to carry more weight because they come from real contact with the problem. Creative Movement adds freshness without losing the value of careful thinking.",
        "linked_signal_key": "creative_movement",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "strength_key": "strength_3",
        "priority": "3",
        "strength_title": "A practical way back in",
        "strength_text": "When attention gets heavy, movement or a change of pace can help you return without forcing it. This gives the pattern a simple recovery route.",
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
        "narrowing_title": "Keeping the work private too long",
        "narrowing_text": "You may continue refining the work alone after it has reached the point where another person could help sharpen it.",
        "missing_range_signal_key": "social_exchange",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "narrowing_key": "narrowing_2",
        "priority": "2",
        "narrowing_title": "Thinking harder when a reset would help",
        "narrowing_text": "When attention gets stuck, you may try to solve it with more focus. A change of pace or movement may be more useful.",
        "missing_range_signal_key": "physical_rhythm",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "narrowing_key": "narrowing_3",
        "priority": "3",
        "narrowing_title": "Opening ideas without choosing the next step",
        "narrowing_text": "Creative Movement can refresh the work, but it can also add more options when the useful move is to decide what to finish.",
        "missing_range_signal_key": "creative_movement",
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
        "guidance_text": "Use this pattern when the work needs careful judgement, original thinking, or a first version that cannot be rushed. Give yourself a focused block before meetings, feedback, or group input.",
        "linked_signal_key": "deep_focus",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "application_area": "watch_for",
        "guidance_type": "guidance",
        "priority": "2",
        "guidance_text": "Watch for the moment when you are polishing privately instead of learning anything new. That is often the point to move, pause, or ask one useful person what is clear and what is not.",
        "linked_signal_key": "social_exchange",
        "status": "active"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "application_area": "develop_by",
        "guidance_type": "guidance",
        "priority": "3",
        "guidance_text": "Develop by sharing a rough version earlier than you normally would. Choose someone who can test clarity without taking over the direction of the work.",
        "linked_signal_key": "social_exchange",
        "status": "active"
      }
    ],
    "14_Closing_Integration": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "concentrated",
        "closing_summary": "This result points to a flow style built around depth, then range. You are likely to do your best work when you first have space to understand the problem, then use ideas, movement, and one well-timed conversation to make the work clearer.",
        "core_gift": "Your gift is the ability to turn sustained attention into thoughtful, original work.",
        "core_trap": "The trap is staying inside your own process after the work would benefit from response.",
        "development_edge": "The useful edge is to share the work while it is still flexible, not only when it feels complete.",
        "memorable_line": "Focus gives the work depth. A timely conversation helps it land.",
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
