export const rankedPatternAssessmentMode = 'single_domain' as const;
export const rankedPatternResultModelKey = 'ranked_pattern' as const;

export const rankedPatternSupportedScoreShapes = [
  'concentrated',
  'paired',
  'graduated',
  'balanced',
] as const;

export const rankedPatternSupportedRankPositions = [1, 2, 3, 4] as const;

export const rankedPatternRuntimeDefinitionSheetKeys = [
  '00_Metadata',
  '01_Signals',
  '02_Questions',
  '03_Options',
  '04_Option_Weights',
] as const;

export const rankedPatternRuntimeResultSheetKeys = [
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

export const rankedPatternAdminImportSupportSheetKeys = [
  '15_Report_Preview',
  '16_Import_Summary',
  '17_Validation_Reference',
  '18_Lookups',
] as const;

export const rankedPatternImportSheetKeys = [
  ...rankedPatternRuntimeDefinitionSheetKeys,
  ...rankedPatternRuntimeResultSheetKeys,
  ...rankedPatternAdminImportSupportSheetKeys,
] as const;

export type RankedPatternAssessmentMode = typeof rankedPatternAssessmentMode;
export type RankedPatternResultModelKey = typeof rankedPatternResultModelKey;
export type RankedPatternScoreShape = (typeof rankedPatternSupportedScoreShapes)[number];
export type RankedPatternRankPosition = (typeof rankedPatternSupportedRankPositions)[number];
export type RankedPatternRuntimeDefinitionSheetKey =
  (typeof rankedPatternRuntimeDefinitionSheetKeys)[number];
export type RankedPatternRuntimeResultSheetKey =
  (typeof rankedPatternRuntimeResultSheetKeys)[number];
export type RankedPatternAdminImportSupportSheetKey =
  (typeof rankedPatternAdminImportSupportSheetKeys)[number];
export type RankedPatternImportSheetKey = (typeof rankedPatternImportSheetKeys)[number];

export type RankedPatternSheetCategory =
  | 'runtime_definition'
  | 'runtime_result_content'
  | 'admin_import_support';

export type RankedPatternImportSheetManifestEntry = {
  readonly sheet_key: RankedPatternImportSheetKey;
  readonly sheet_name: RankedPatternImportSheetKey;
  readonly category: RankedPatternSheetCategory;
  readonly database_target: readonly string[];
  readonly required_columns: readonly string[];
  readonly optional_columns: readonly string[];
  readonly required_relationship_keys: readonly string[];
  readonly runtime_allowed: boolean;
  readonly publish_required: boolean;
  readonly validation_summary: string;
};

const commonPatternColumns = [
  'domain_key',
  'pattern_key',
  'score_shape',
  'rank_1_signal_key',
  'rank_2_signal_key',
  'rank_3_signal_key',
  'rank_4_signal_key',
] as const;

export const rankedPatternImportManifest = [
  {
    sheet_key: '00_Metadata',
    sheet_name: '00_Metadata',
    category: 'runtime_definition',
    database_target: ['assessments', 'assessment_versions'],
    required_columns: [
      'assessment_key',
      'version',
      'assessment_title',
      'assessment_description',
      'model',
      'mode',
      'domain_key',
      'domain_title',
      'lifecycle_status',
      'status',
      'lookup_key',
    ],
    optional_columns: ['result_model_key'],
    required_relationship_keys: ['assessment_key', 'version', 'domain_key'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary:
      'Declares one single-domain ranked-pattern assessment version and its active domain.',
  },
  {
    sheet_key: '01_Signals',
    sheet_name: '01_Signals',
    category: 'runtime_definition',
    database_target: ['signals'],
    required_columns: [
      'domain_key',
      'signal_key',
      'signal_label',
      'signal_description',
      'signal_order',
      'scored',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: ['domain_key', 'signal_key'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Declares exactly four publishable scored signals for the active domain.',
  },
  {
    sheet_key: '02_Questions',
    sheet_name: '02_Questions',
    category: 'runtime_definition',
    database_target: ['questions'],
    required_columns: [
      'domain_key',
      'question_key',
      'question_order',
      'question_text',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: ['domain_key', 'question_key'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary:
      'Defines ordered runtime prompts; every active question must resolve to the active domain.',
  },
  {
    sheet_key: '03_Options',
    sheet_name: '03_Options',
    category: 'runtime_definition',
    database_target: ['options'],
    required_columns: [
      'domain_key',
      'question_key',
      'option_key',
      'option_order',
      'option_text',
      'is_scored',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: ['domain_key', 'question_key', 'option_key'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary:
      'Defines ordered selectable options; every active scored option must have explicit weights.',
  },
  {
    sheet_key: '04_Option_Weights',
    sheet_name: '04_Option_Weights',
    category: 'runtime_definition',
    database_target: ['option_signal_weights'],
    required_columns: [
      'domain_key',
      'question_key',
      'option_key',
      'signal_key',
      'weight',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: ['domain_key', 'question_key', 'option_key', 'signal_key'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary:
      'Maps selected options to scored signal weights; this is the only scoring source.',
  },
  {
    sheet_key: '05_Context',
    sheet_name: '05_Context',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
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
    optional_columns: [],
    required_relationship_keys: ['domain_key'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary:
      'Provides the one domain-level context row used during result payload assembly.',
  },
  {
    sheet_key: '06_Orientation',
    sheet_name: '06_Orientation',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
      ...commonPatternColumns,
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
    optional_columns: [],
    required_relationship_keys: [...commonPatternColumns],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Requires complete pattern_key plus score_shape coverage.',
  },
  {
    sheet_key: '07_Recognition',
    sheet_name: '07_Recognition',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
      ...commonPatternColumns,
      'headline',
      'recognition_statement',
      'recognition_expansion',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: [...commonPatternColumns],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Requires complete pattern_key plus score_shape coverage.',
  },
  {
    sheet_key: '08_Signal_Roles',
    sheet_name: '08_Signal_Roles',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
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
    optional_columns: [],
    required_relationship_keys: ['domain_key', 'signal_key', 'rank_position'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Requires every scored signal at rank positions 1 through 4.',
  },
  {
    sheet_key: '09_Pattern_Mechanics',
    sheet_name: '09_Pattern_Mechanics',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
      ...commonPatternColumns,
      'mechanics_title',
      'core_mechanism',
      'why_it_shows_up',
      'what_it_protects',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: [...commonPatternColumns],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Requires complete pattern_key plus score_shape coverage.',
  },
  {
    sheet_key: '10_Pattern_Synthesis',
    sheet_name: '10_Pattern_Synthesis',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
      ...commonPatternColumns,
      'synthesis_title',
      'gift',
      'trap',
      'takeaway',
      'synthesis_text',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: [...commonPatternColumns],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Requires complete pattern_key plus score_shape coverage.',
  },
  {
    sheet_key: '11_Strengths',
    sheet_name: '11_Strengths',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
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
    optional_columns: [],
    required_relationship_keys: ['domain_key', 'pattern_key', 'linked_signal_key'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Requires complete pattern-level ordered strength coverage.',
  },
  {
    sheet_key: '12_Narrowing',
    sheet_name: '12_Narrowing',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
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
    optional_columns: [],
    required_relationship_keys: ['domain_key', 'pattern_key', 'missing_range_signal_key'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Requires complete pattern-level ordered narrowing coverage.',
  },
  {
    sheet_key: '13_Application',
    sheet_name: '13_Application',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
      'domain_key',
      'pattern_key',
      'application_key',
      'priority',
      'application_title',
      'application_text',
      'linked_signal_key',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: ['domain_key', 'pattern_key', 'linked_signal_key'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Requires complete pattern-level ordered application coverage.',
  },
  {
    sheet_key: '14_Closing_Integration',
    sheet_name: '14_Closing_Integration',
    category: 'runtime_result_content',
    database_target: ['assessment_result_section_definitions', 'assessment_result_language_rows'],
    required_columns: [
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
    optional_columns: ['rank_1_signal_key', 'rank_2_signal_key', 'rank_3_signal_key', 'rank_4_signal_key'],
    required_relationship_keys: ['domain_key', 'pattern_key', 'score_shape'],
    runtime_allowed: true,
    publish_required: true,
    validation_summary: 'Requires complete pattern_key plus score_shape coverage.',
  },
  {
    sheet_key: '15_Report_Preview',
    sheet_name: '15_Report_Preview',
    category: 'admin_import_support',
    database_target: ['assessment_report_preview_cases'],
    required_columns: [
      'preview_case_key',
      'assessment_key',
      'version',
      'domain_key',
      'rank_1_signal_key',
      'rank_2_signal_key',
      'rank_3_signal_key',
      'rank_4_signal_key',
      'normalized_rank_1_percentage',
      'normalized_rank_2_percentage',
      'normalized_rank_3_percentage',
      'normalized_rank_4_percentage',
      'expected_score_shape',
      'expected_pattern_key',
      'expected_payload_sections',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: ['domain_key', 'expected_score_shape', 'expected_pattern_key'],
    runtime_allowed: false,
    publish_required: false,
    validation_summary: 'Admin/import preview cases only; not runtime result content.',
  },
  {
    sheet_key: '16_Import_Summary',
    sheet_name: '16_Import_Summary',
    category: 'admin_import_support',
    database_target: ['assessment_import_batches', 'assessment_import_files'],
    required_columns: [
      'import_summary_key',
      'assessment_key',
      'version',
      'package_identifier',
      'source_name',
      'runtime_definition_row_count',
      'runtime_result_content_row_count',
      'preview_row_count',
      'validation_notes',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: ['assessment_key', 'version', 'package_identifier'],
    runtime_allowed: false,
    publish_required: false,
    validation_summary: 'Admin/import provenance and summary metadata only.',
  },
  {
    sheet_key: '17_Validation_Reference',
    sheet_name: '17_Validation_Reference',
    category: 'admin_import_support',
    database_target: ['assessment_import_audit_items'],
    required_columns: [
      'validation_rule_key',
      'section_key',
      'field_key',
      'rule_type',
      'expected_value',
      'validation_guidance',
      'severity',
      'status',
      'lookup_key',
    ],
    optional_columns: [],
    required_relationship_keys: ['section_key', 'field_key'],
    runtime_allowed: false,
    publish_required: false,
    validation_summary: 'Admin/import validation reference only; does not override platform rules.',
  },
  {
    sheet_key: '18_Lookups',
    sheet_name: '18_Lookups',
    category: 'admin_import_support',
    database_target: ['import QA metadata'],
    required_columns: [
      'lookup_group',
      'lookup_key',
      'lookup_label',
      'lookup_value',
      'description',
      'status',
    ],
    optional_columns: [],
    required_relationship_keys: ['lookup_group', 'lookup_key'],
    runtime_allowed: false,
    publish_required: false,
    validation_summary: 'Controlled import lookup reference only; not runtime result content.',
  },
] as const satisfies readonly RankedPatternImportSheetManifestEntry[];

function buildRankedPatternManifestBySheetKey(): Readonly<
  Record<RankedPatternImportSheetKey, RankedPatternImportSheetManifestEntry>
> {
  const manifestBySheetKey: Partial<
    Record<RankedPatternImportSheetKey, RankedPatternImportSheetManifestEntry>
  > = {};

  for (const entry of rankedPatternImportManifest) {
    manifestBySheetKey[entry.sheet_key] = entry;
  }

  for (const sheetKey of rankedPatternImportSheetKeys) {
    if (!manifestBySheetKey[sheetKey]) {
      throw new Error(`Missing ranked-pattern import manifest entry for sheet ${sheetKey}`);
    }
  }

  return Object.freeze(
    manifestBySheetKey as Record<
      RankedPatternImportSheetKey,
      RankedPatternImportSheetManifestEntry
    >,
  );
}

export const rankedPatternImportManifestBySheetKey = buildRankedPatternManifestBySheetKey();

export function getRuntimeResultSectionKeys(): readonly RankedPatternRuntimeResultSheetKey[] {
  return rankedPatternRuntimeResultSheetKeys;
}

export function getAdminImportSupportSectionKeys(): readonly RankedPatternAdminImportSupportSheetKey[] {
  return rankedPatternAdminImportSupportSheetKeys;
}

export function buildPatternKeyFromRankedSignalKeys(
  rank1: string,
  rank2: string,
  rank3: string,
  rank4: string,
): string {
  return [rank1, rank2, rank3, rank4].join('_');
}

export function hasExactlyFourDistinctSignalKeys(signalKeys: readonly string[]): boolean {
  return signalKeys.length === 4 && new Set(signalKeys).size === 4;
}

export function expectedRankedPatternCount(signalCount: number): number | null {
  return signalCount === 4 ? 24 : null;
}

export function hasAllFourSupportedScoreShapes(scoreShapeRows: readonly string[]): boolean {
  const values = new Set(scoreShapeRows);
  return (
    values.size === rankedPatternSupportedScoreShapes.length &&
    rankedPatternSupportedScoreShapes.every((scoreShape) => values.has(scoreShape))
  );
}
