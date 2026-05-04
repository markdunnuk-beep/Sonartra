export const readerFirstSectionKeys = [
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

export type ReaderFirstSectionKey = (typeof readerFirstSectionKeys)[number];

export const readerFirstSectionDisplayLabels: Record<ReaderFirstSectionKey, string> = {
  '05_Context': 'Context',
  '06_Orientation': 'Orientation',
  '07_Recognition': 'Recognition',
  '08_Signal_Roles': 'Signal Roles',
  '09_Pattern_Mechanics': 'Pattern Mechanics',
  '10_Pattern_Synthesis': 'Pattern Synthesis',
  '11_Strengths': 'Strengths',
  '12_Narrowing': 'Narrowing',
  '13_Application': 'Application',
  '14_Closing_Integration': 'Closing Integration',
};

export const readerFirstRequiredHeaders: Record<ReaderFirstSectionKey, readonly string[]> = {
  '05_Context': [
    'domain_key',
    'section_key',
    'domain_title',
    'domain_definition',
    'domain_scope',
    'interpretation_guidance',
    'intro_note',
    'status',
    'lookup_key',
  ],
  '06_Orientation': [
    'domain_key',
    'pattern_key',
    'score_shape',
    'rank_1_signal_key',
    'rank_2_signal_key',
    'rank_3_signal_key',
    'rank_4_signal_key',
    'orientation_title',
    'orientation_summary',
    'score_shape_summary',
    'rank_1_phrase',
    'rank_2_phrase',
    'rank_3_phrase',
    'rank_4_phrase',
    'status',
    'lookup_key',
  ],
  '07_Recognition': [
    'domain_key',
    'pattern_key',
    'score_shape',
    'rank_1_signal_key',
    'rank_2_signal_key',
    'rank_3_signal_key',
    'rank_4_signal_key',
    'headline',
    'recognition_statement',
    'recognition_expansion',
    'status',
    'lookup_key',
  ],
  '08_Signal_Roles': [
    'domain_key',
    'signal_key',
    'signal_label',
    'rank_position',
    'rank_role',
    'title',
    'description',
    'productive_expression',
    'risk_pattern',
    'development_note',
    'status',
    'lookup_key',
  ],
  '09_Pattern_Mechanics': [
    'domain_key',
    'pattern_key',
    'score_shape',
    'rank_1_signal_key',
    'rank_2_signal_key',
    'rank_3_signal_key',
    'rank_4_signal_key',
    'mechanics_title',
    'core_mechanism',
    'why_it_shows_up',
    'what_it_protects',
    'status',
    'lookup_key',
  ],
  '10_Pattern_Synthesis': [
    'domain_key',
    'pattern_key',
    'score_shape',
    'rank_1_signal_key',
    'rank_2_signal_key',
    'rank_3_signal_key',
    'rank_4_signal_key',
    'synthesis_title',
    'gift',
    'trap',
    'takeaway',
    'synthesis_text',
    'status',
    'lookup_key',
  ],
  '11_Strengths': [
    'domain_key',
    'pattern_key',
    'strength_key',
    'priority',
    'strength_title',
    'strength_text',
    'linked_signal_key',
    'status',
    'lookup_key',
  ],
  '12_Narrowing': [
    'domain_key',
    'pattern_key',
    'narrowing_key',
    'priority',
    'narrowing_title',
    'narrowing_text',
    'missing_range_signal_key',
    'status',
    'lookup_key',
  ],
  '13_Application': [
    'domain_key',
    'pattern_key',
    'application_area',
    'guidance_type',
    'priority',
    'guidance_text',
    'linked_signal_key',
    'status',
    'lookup_key',
  ],
  '14_Closing_Integration': [
    'domain_key',
    'pattern_key',
    'score_shape',
    'closing_summary',
    'core_gift',
    'core_trap',
    'development_edge',
    'memorable_line',
    'status',
    'lookup_key',
  ],
};

export type ReaderFirstRowCountRule = {
  readonly basis: string;
  readonly expectedRows: number;
  readonly note?: string;
};

export const readerFirstRowCountRules: Record<ReaderFirstSectionKey, ReaderFirstRowCountRule> = {
  '05_Context': {
    basis: 'one row per domain',
    expectedRows: 1,
  },
  '06_Orientation': {
    basis: '24 ranked patterns x 4 score shapes',
    expectedRows: 96,
  },
  '07_Recognition': {
    basis: '24 ranked patterns x 4 score shapes',
    expectedRows: 96,
  },
  '08_Signal_Roles': {
    basis: '4 signals x 4 rank roles',
    expectedRows: 16,
  },
  '09_Pattern_Mechanics': {
    basis: '24 ranked patterns x 4 score shapes',
    expectedRows: 96,
  },
  '10_Pattern_Synthesis': {
    basis: '24 ranked patterns x 4 score shapes',
    expectedRows: 96,
  },
  '11_Strengths': {
    basis: 'pattern-level rows',
    expectedRows: 24,
    note: 'May become score-shape-specific later if explicit variants are added.',
  },
  '12_Narrowing': {
    basis: 'pattern-level rows',
    expectedRows: 24,
    note: 'May become score-shape-specific later if explicit variants are added.',
  },
  '13_Application': {
    basis: '24 ranked patterns x 3 application areas',
    expectedRows: 72,
    note: 'Pattern-level application rows; score-shape-specific variants are not required in this scaffold.',
  },
  '14_Closing_Integration': {
    basis: '24 ranked patterns x 4 score shapes',
    expectedRows: 96,
  },
};

export const flowStateAuthoringConstants = {
  domainKey: 'flow-state',
  signals: [
    'deep_focus',
    'creative_movement',
    'physical_rhythm',
    'social_exchange',
  ],
  scoreShapes: ['concentrated', 'paired', 'graduated', 'balanced'],
  rankRoles: ['dominant', 'secondary', 'tertiary', 'least_expressed'],
  applicationAreas: ['use_this_when', 'watch_for', 'develop_by'],
  requiredPatternCount: 24,
  requiredScoreShapeCount: 4,
} as const;

export const readerFirstLookupKeyRecommendation = {
  delimiter: '::',
  warning: 'Do not use pipe characters inside lookup_key values if exporting pipe-delimited data.',
  example:
    'flow-state::deep_focus_creative_movement_physical_rhythm_social_exchange::concentrated',
} as const;

export const readerFirstAllowedScoreShapes = flowStateAuthoringConstants.scoreShapes;
export const readerFirstAllowedSignalKeys = flowStateAuthoringConstants.signals;
export const readerFirstAllowedRankRoles = flowStateAuthoringConstants.rankRoles;
export const readerFirstAllowedApplicationAreas = flowStateAuthoringConstants.applicationAreas;
