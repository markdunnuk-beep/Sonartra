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
        "domain_definition": "Draft definition",
        "domain_scope": "Draft scope",
        "interpretation_guidance": "Draft guidance",
        "intro_note": "Draft intro",
        "status": "draft"
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
        "status": "draft"
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
        "headline": "Draft headline",
        "recognition_statement": "Draft recognition",
        "recognition_expansion": "Draft expansion",
        "status": "draft"
      }
    ],
    "08_Signal_Roles": [
      {
        "domain_key": "flow-state",
        "signal_key": "deep_focus",
        "signal_label": "deep_focus",
        "rank_position": "1",
        "rank_role": "dominant",
        "title": "Draft role",
        "description": "Draft description",
        "productive_expression": "Draft productive expression",
        "risk_pattern": "Draft risk",
        "development_note": "Draft development note",
        "status": "draft"
      },
      {
        "domain_key": "flow-state",
        "signal_key": "creative_movement",
        "signal_label": "creative_movement",
        "rank_position": "2",
        "rank_role": "secondary",
        "title": "Draft role",
        "description": "Draft description",
        "productive_expression": "Draft productive expression",
        "risk_pattern": "Draft risk",
        "development_note": "Draft development note",
        "status": "draft"
      },
      {
        "domain_key": "flow-state",
        "signal_key": "physical_rhythm",
        "signal_label": "physical_rhythm",
        "rank_position": "3",
        "rank_role": "tertiary",
        "title": "Draft role",
        "description": "Draft description",
        "productive_expression": "Draft productive expression",
        "risk_pattern": "Draft risk",
        "development_note": "Draft development note",
        "status": "draft"
      },
      {
        "domain_key": "flow-state",
        "signal_key": "social_exchange",
        "signal_label": "social_exchange",
        "rank_position": "4",
        "rank_role": "least_expressed",
        "title": "Draft role",
        "description": "Draft description",
        "productive_expression": "Draft productive expression",
        "risk_pattern": "Draft risk",
        "development_note": "Draft development note",
        "status": "draft"
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
        "mechanics_title": "Draft mechanics",
        "core_mechanism": "Draft mechanism",
        "why_it_shows_up": "Draft reason",
        "what_it_protects": "Draft protection",
        "status": "draft"
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
        "synthesis_title": "Draft synthesis",
        "gift": "Draft gift",
        "trap": "Draft trap",
        "takeaway": "Draft takeaway",
        "synthesis_text": "Draft synthesis text",
        "status": "draft"
      }
    ],
    "11_Strengths": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "strength_key": "strength_1",
        "priority": "1",
        "strength_title": "Draft strength",
        "strength_text": "Draft strength text",
        "linked_signal_key": "deep_focus",
        "status": "draft"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "strength_key": "strength_2",
        "priority": "2",
        "strength_title": "Draft strength",
        "strength_text": "Draft strength text",
        "linked_signal_key": "creative_movement",
        "status": "draft"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "strength_key": "strength_3",
        "priority": "3",
        "strength_title": "Draft strength",
        "strength_text": "Draft strength text",
        "linked_signal_key": "physical_rhythm",
        "status": "draft"
      }
    ],
    "12_Narrowing": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "narrowing_key": "narrowing_1",
        "priority": "1",
        "narrowing_title": "Draft narrowing",
        "narrowing_text": "Draft narrowing text",
        "missing_range_signal_key": "creative_movement",
        "status": "draft"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "narrowing_key": "narrowing_2",
        "priority": "2",
        "narrowing_title": "Draft narrowing",
        "narrowing_text": "Draft narrowing text",
        "missing_range_signal_key": "physical_rhythm",
        "status": "draft"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "narrowing_key": "narrowing_3",
        "priority": "3",
        "narrowing_title": "Draft narrowing",
        "narrowing_text": "Draft narrowing text",
        "missing_range_signal_key": "social_exchange",
        "status": "draft"
      }
    ],
    "13_Application": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "application_area": "use_this_when",
        "guidance_type": "use_this_when",
        "priority": "1",
        "guidance_text": "Draft guidance",
        "linked_signal_key": "deep_focus",
        "status": "draft"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "application_area": "watch_for",
        "guidance_type": "watch_for",
        "priority": "2",
        "guidance_text": "Draft guidance",
        "linked_signal_key": "creative_movement",
        "status": "draft"
      },
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "application_area": "develop_by",
        "guidance_type": "develop_by",
        "priority": "3",
        "guidance_text": "Draft guidance",
        "linked_signal_key": "physical_rhythm",
        "status": "draft"
      }
    ],
    "14_Closing_Integration": [
      {
        "domain_key": "flow-state",
        "pattern_key": "deep_focus_creative_movement_physical_rhythm_social_exchange",
        "score_shape": "concentrated",
        "closing_summary": "Draft closing",
        "core_gift": "Draft gift",
        "core_trap": "Draft trap",
        "development_edge": "Draft edge",
        "memorable_line": "Draft line",
        "status": "draft"
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
