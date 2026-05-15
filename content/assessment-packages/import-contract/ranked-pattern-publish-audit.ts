import {
  buildPatternKeyFromRankedSignalKeys,
  rankedPatternAssessmentMode,
  rankedPatternResultModelKey,
  rankedPatternSupportedRankPositions,
  rankedPatternSupportedScoreShapes,
} from './ranked-pattern-import-manifest';
import type { RankedPatternPersistenceDbClient } from './ranked-pattern-import-persistence';
import { getRankedPatternScoreShapePolicySummary } from './ranked-pattern-score-shape-policy';

export type RankedPatternPublishAuditSeverity = 'blocking' | 'warning' | 'info';

export type RankedPatternPublishAuditCategory =
  | 'metadata'
  | 'domain'
  | 'signals'
  | 'questions_options'
  | 'option_weights'
  | 'ranked_patterns'
  | 'score_shapes'
  | 'section_definitions'
  | 'result_language'
  | 'preview_cases'
  | 'report_first_templates';

export type RankedPatternPublishAuditFinding = {
  readonly severity: RankedPatternPublishAuditSeverity;
  readonly code: string;
  readonly message: string;
  readonly category: RankedPatternPublishAuditCategory;
  readonly tableName?: string;
  readonly rowKey?: string;
  readonly lookupKey?: string;
  readonly relatedKeys?: readonly string[];
};

export type RankedPatternPublishAuditInput = {
  readonly assessmentVersionId: string;
  readonly db: RankedPatternPersistenceDbClient;
  readonly mode?: 'strict' | 'preview';
  readonly includeWarnings?: boolean;
  readonly auditReportFirstTemplates?: boolean;
};

export type RankedPatternPublishAuditSummaryCount = {
  readonly blocking: number;
  readonly warning: number;
  readonly info: number;
};

export type RankedPatternPublishAuditResult = {
  readonly assessmentVersionId: string;
  readonly canPublish: boolean;
  readonly blockingCount: number;
  readonly warningCount: number;
  readonly findings: readonly RankedPatternPublishAuditFinding[];
  readonly summaryCountsByCategory: Readonly<
    Record<RankedPatternPublishAuditCategory, RankedPatternPublishAuditSummaryCount>
  >;
};

type VersionRow = {
  readonly assessment_version_id: string;
  readonly assessment_id: string | null;
  readonly version: string | null;
  readonly lifecycle_status: string | null;
  readonly mode: string | null;
  readonly result_model_key: string | null;
  readonly assessment_key: string | null;
  readonly assessment_title: string | null;
  readonly is_active: boolean | null;
};

type DomainRow = {
  readonly id: string;
  readonly domain_key: string | null;
  readonly label: string | null;
  readonly domain_type: string | null;
  readonly order_index: number | null;
};

type SignalRow = {
  readonly id: string;
  readonly domain_id: string | null;
  readonly signal_key: string | null;
  readonly label: string | null;
  readonly order_index: number | null;
  readonly is_overlay: boolean | null;
};

type QuestionRow = {
  readonly id: string;
  readonly domain_id: string | null;
  readonly question_key: string | null;
  readonly order_index: number | null;
};

type OptionRow = {
  readonly id: string;
  readonly question_id: string | null;
  readonly option_key: string | null;
  readonly order_index: number | null;
};

type OptionWeightRow = {
  readonly id: string;
  readonly option_id: string | null;
  readonly signal_id: string | null;
  readonly weight: string | number | null;
};

type RankedPatternRow = {
  readonly id: string;
  readonly domain_key: string | null;
  readonly pattern_key: string | null;
  readonly rank_1_signal_key: string | null;
  readonly rank_2_signal_key: string | null;
  readonly rank_3_signal_key: string | null;
  readonly rank_4_signal_key: string | null;
  readonly status: string | null;
};

type ScoreShapeRuleRow = {
  readonly id: string;
  readonly score_shape: string | null;
  readonly rule_key: string | null;
  readonly rule_config: unknown;
  readonly status: string | null;
};

type SectionDefinitionRow = {
  readonly id: string;
  readonly section_key: string | null;
  readonly section_order: number | null;
  readonly source_sheet_key: string | null;
  readonly runtime_category: string | null;
  readonly status: string | null;
};

type ResultLanguageRow = {
  readonly id: string;
  readonly section_key: string | null;
  readonly lookup_key: string | null;
  readonly domain_key: string | null;
  readonly pattern_key: string | null;
  readonly score_shape: string | null;
  readonly signal_key: string | null;
  readonly rank_position: number | null;
  readonly item_key: string | null;
  readonly priority: number | null;
  readonly field_values: unknown;
  readonly status: string | null;
};

type PreviewCaseRow = {
  readonly id: string;
  readonly preview_case_key: string | null;
  readonly domain_key: string | null;
  readonly ranked_signal_keys: unknown;
  readonly normalized_scores: unknown;
  readonly expected_score_shape: string | null;
  readonly expected_pattern_key: string | null;
  readonly expected_payload_snapshot: unknown;
  readonly status: string | null;
};

type ReportFirstTemplateRow = {
  readonly id: string;
  readonly assessment_version_id: string | null;
  readonly domain_key: string | null;
  readonly pattern_key: string | null;
  readonly report_key: string | null;
  readonly report_contract: string | null;
  readonly report_template_json: unknown;
  readonly content_hash: string | null;
  readonly status: string | null;
};

type PersistedRankedPatternState = {
  readonly version: VersionRow | null;
  readonly domains: readonly DomainRow[];
  readonly signals: readonly SignalRow[];
  readonly questions: readonly QuestionRow[];
  readonly options: readonly OptionRow[];
  readonly optionWeights: readonly OptionWeightRow[];
  readonly rankedPatterns: readonly RankedPatternRow[];
  readonly scoreShapeRules: readonly ScoreShapeRuleRow[];
  readonly sectionDefinitions: readonly SectionDefinitionRow[];
  readonly resultLanguageRows: readonly ResultLanguageRow[];
  readonly previewCases: readonly PreviewCaseRow[];
  readonly reportFirstTemplates: readonly ReportFirstTemplateRow[];
};

const reportFirstTemplateContract = 'report_first_canonical_payload_v1';
const supportedScoreShapeSet = new Set<string>(rankedPatternSupportedScoreShapes);
const supportedRankPositionSet = new Set<number>(rankedPatternSupportedRankPositions);

const expectedRuntimeSections = [
  { sectionKey: 'context', sourceSheetKey: '05_Context', order: 1 },
  { sectionKey: 'orientation', sourceSheetKey: '06_Orientation', order: 2 },
  { sectionKey: 'recognition', sourceSheetKey: '07_Recognition', order: 3 },
  { sectionKey: 'signal_roles', sourceSheetKey: '08_Signal_Roles', order: 4 },
  { sectionKey: 'pattern_mechanics', sourceSheetKey: '09_Pattern_Mechanics', order: 5 },
  { sectionKey: 'pattern_synthesis', sourceSheetKey: '10_Pattern_Synthesis', order: 6 },
  { sectionKey: 'strengths', sourceSheetKey: '11_Strengths', order: 7 },
  { sectionKey: 'narrowing', sourceSheetKey: '12_Narrowing', order: 8 },
  { sectionKey: 'application', sourceSheetKey: '13_Application', order: 9 },
  { sectionKey: 'closing_integration', sourceSheetKey: '14_Closing_Integration', order: 10 },
] as const;

const adminSupportSectionKeys = new Set([
  'report_preview',
  'import_summary',
  'validation_reference',
  'lookups',
  '15_Report_Preview',
  '16_Import_Summary',
  '17_Validation_Reference',
  '18_Lookups',
]);

const patternScoreShapeSections = new Set([
  'orientation',
  'recognition',
  'pattern_mechanics',
  'pattern_synthesis',
  'closing_integration',
]);

const patternOnlySections = new Set(['strengths', 'narrowing', 'application']);

const emptySummaryCounts: Readonly<
  Record<RankedPatternPublishAuditCategory, RankedPatternPublishAuditSummaryCount>
> = Object.freeze({
  metadata: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  domain: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  signals: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  questions_options: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  option_weights: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  ranked_patterns: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  score_shapes: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  section_definitions: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  result_language: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  preview_cases: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
  report_first_templates: Object.freeze({ blocking: 0, warning: 0, info: 0 }),
});

function textValue(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function statusActive(status: string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === 'active';
}

function makeFinding(params: RankedPatternPublishAuditFinding): RankedPatternPublishAuditFinding {
  return Object.freeze(params);
}

function addBlocking(
  findings: RankedPatternPublishAuditFinding[],
  params: Omit<RankedPatternPublishAuditFinding, 'severity'>,
): void {
  findings.push(makeFinding({ ...params, severity: 'blocking' }));
}

function addInfo(
  findings: RankedPatternPublishAuditFinding[],
  params: Omit<RankedPatternPublishAuditFinding, 'severity'>,
): void {
  findings.push(makeFinding({ ...params, severity: 'info' }));
}

function uniqueTextValues(values: readonly (string | null)[]): readonly string[] {
  return [...new Set(values.filter((value): value is string => Boolean(textValue(value))))];
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

function toNumber(value: string | number | null): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parsedJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function isNonEmptyObject(value: unknown): boolean {
  const parsed = parsedJsonValue(value);
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    Object.keys(parsed).length > 0
  );
}

function isReadableScores(value: unknown): boolean {
  const parsed = parsedJsonValue(value);
  if (Array.isArray(parsed)) {
    return parsed.length > 0 && parsed.every((entry) => typeof Number(entry) === 'number' && Number.isFinite(Number(entry)));
  }
  return isNonEmptyObject(parsed);
}

function toStringArray(value: unknown): readonly string[] | null {
  const parsed = parsedJsonValue(value);
  if (!Array.isArray(parsed)) {
    return null;
  }
  const values = parsed.map((entry) => (typeof entry === 'string' ? entry.trim() : ''));
  return values.every((entry) => entry.length > 0) ? values : null;
}

function permutationKeys(signalKeys: readonly string[]): readonly string[] {
  const result: string[] = [];
  for (const a of signalKeys) {
    for (const b of signalKeys) {
      for (const c of signalKeys) {
        for (const d of signalKeys) {
          if (new Set([a, b, c, d]).size === 4) {
            result.push(buildPatternKeyFromRankedSignalKeys(a, b, c, d));
          }
        }
      }
    }
  }
  return result;
}

async function loadPersistedRankedPatternState(
  db: RankedPatternPersistenceDbClient,
  assessmentVersionId: string,
  loadOptions: { readonly includeReportFirstTemplates: boolean },
): Promise<PersistedRankedPatternState> {
  const version = await db.query<VersionRow>(
    `
    SELECT
      av.id AS assessment_version_id,
      av.assessment_id,
      av.version,
      av.lifecycle_status,
      av.mode,
      av.result_model_key,
      a.assessment_key,
      a.title AS assessment_title,
      a.is_active
    FROM assessment_versions av
    LEFT JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );
  const domains = await db.query<DomainRow>(
    `
    SELECT id, domain_key, label, domain_type, order_index
    FROM domains
    WHERE assessment_version_id = $1
    ORDER BY order_index, domain_key
    `,
    [assessmentVersionId],
  );
  const signals = await db.query<SignalRow>(
    `
    SELECT id, domain_id, signal_key, label, order_index, is_overlay
    FROM signals
    WHERE assessment_version_id = $1
    ORDER BY order_index, signal_key
    `,
    [assessmentVersionId],
  );
  const questions = await db.query<QuestionRow>(
    `
    SELECT id, domain_id, question_key, order_index
    FROM questions
    WHERE assessment_version_id = $1
    ORDER BY order_index, question_key
    `,
    [assessmentVersionId],
  );
  const options = await db.query<OptionRow>(
    `
    SELECT id, question_id, option_key, order_index
    FROM options
    WHERE assessment_version_id = $1
    ORDER BY question_id, order_index, option_key
    `,
    [assessmentVersionId],
  );
  const optionWeights = await db.query<OptionWeightRow>(
    `
    SELECT osw.id, osw.option_id, osw.signal_id, osw.weight::text AS weight
    FROM option_signal_weights osw
    JOIN options o ON o.id = osw.option_id
    WHERE o.assessment_version_id = $1
    ORDER BY osw.option_id, osw.signal_id
    `,
    [assessmentVersionId],
  );
  const rankedPatterns = await db.query<RankedPatternRow>(
    `
    SELECT
      id,
      domain_key,
      pattern_key,
      rank_1_signal_key,
      rank_2_signal_key,
      rank_3_signal_key,
      rank_4_signal_key,
      status
    FROM assessment_ranked_patterns
    WHERE assessment_version_id = $1 AND status = 'active'
    ORDER BY domain_key, pattern_key
    `,
    [assessmentVersionId],
  );
  const scoreShapeRules = await db.query<ScoreShapeRuleRow>(
    `
    SELECT id, score_shape, rule_key, rule_config, status
    FROM assessment_score_shape_rules
    WHERE assessment_version_id = $1 AND status = 'active'
    ORDER BY priority, score_shape, rule_key
    `,
    [assessmentVersionId],
  );
  const sectionDefinitions = await db.query<SectionDefinitionRow>(
    `
    SELECT id, section_key, section_order, source_sheet_key, runtime_category, status
    FROM assessment_result_section_definitions
    WHERE assessment_version_id = $1 AND status = 'active'
    ORDER BY section_order, section_key
    `,
    [assessmentVersionId],
  );
  const resultLanguageRows = await db.query<ResultLanguageRow>(
    `
    SELECT
      id,
      section_key,
      lookup_key,
      domain_key,
      pattern_key,
      score_shape,
      signal_key,
      rank_position,
      item_key,
      priority,
      field_values,
      status
    FROM assessment_result_language_rows
    WHERE assessment_version_id = $1 AND status = 'active'
    ORDER BY section_key, lookup_key
    `,
    [assessmentVersionId],
  );
  const previewCases = await db.query<PreviewCaseRow>(
    `
    SELECT
      id,
      preview_case_key,
      domain_key,
      ranked_signal_keys,
      normalized_scores,
      expected_score_shape,
      expected_pattern_key,
      expected_payload_snapshot,
      status
    FROM assessment_report_preview_cases
    WHERE assessment_version_id = $1 AND status = 'active'
    ORDER BY preview_case_key
    `,
    [assessmentVersionId],
  );
  const reportFirstTemplates = loadOptions.includeReportFirstTemplates
    ? await db.query<ReportFirstTemplateRow>(
      `
      SELECT
        id,
        assessment_version_id,
        domain_key,
        pattern_key,
        report_key,
        report_contract,
        report_template_json,
        content_hash,
        status
      FROM assessment_report_first_templates
      WHERE assessment_version_id = $1 AND status = 'active'
      ORDER BY domain_key, pattern_key, id
      `,
      [assessmentVersionId],
    )
    : { rows: [] as ReportFirstTemplateRow[] };

  return Object.freeze({
    version: version.rows[0] ?? null,
    domains: Object.freeze([...domains.rows]),
    signals: Object.freeze([...signals.rows]),
    questions: Object.freeze([...questions.rows]),
    options: Object.freeze([...options.rows]),
    optionWeights: Object.freeze([...optionWeights.rows]),
    rankedPatterns: Object.freeze([...rankedPatterns.rows]),
    scoreShapeRules: Object.freeze([...scoreShapeRules.rows]),
    sectionDefinitions: Object.freeze([...sectionDefinitions.rows]),
    resultLanguageRows: Object.freeze([...resultLanguageRows.rows]),
    previewCases: Object.freeze([...previewCases.rows]),
    reportFirstTemplates: Object.freeze([...reportFirstTemplates.rows]),
  });
}

function auditMetadata(
  state: PersistedRankedPatternState,
  findings: RankedPatternPublishAuditFinding[],
): void {
  const version = state.version;
  if (!version) {
    addBlocking(findings, {
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'Assessment version does not exist.',
      category: 'metadata',
      tableName: 'assessment_versions',
    });
    return;
  }
  if (!version.assessment_id || !version.assessment_key) {
    addBlocking(findings, {
      code: 'ASSESSMENT_NOT_FOUND',
      message: 'Assessment version must resolve to an assessment row.',
      category: 'metadata',
      tableName: 'assessments',
      rowKey: version.assessment_version_id,
    });
  }
  if (version.mode !== rankedPatternAssessmentMode) {
    addBlocking(findings, {
      code: 'UNSUPPORTED_ASSESSMENT_MODE',
      message: `assessment_versions.mode must be ${rankedPatternAssessmentMode}.`,
      category: 'metadata',
      tableName: 'assessment_versions',
      rowKey: version.assessment_version_id,
      relatedKeys: [version.mode ?? 'null'],
    });
  }
  if (version.result_model_key !== rankedPatternResultModelKey) {
    addBlocking(findings, {
      code: 'UNSUPPORTED_RESULT_MODEL_KEY',
      message: `assessment_versions.result_model_key must be ${rankedPatternResultModelKey}.`,
      category: 'metadata',
      tableName: 'assessment_versions',
      rowKey: version.assessment_version_id,
      relatedKeys: [version.result_model_key ?? 'null'],
    });
  }
  if (!textValue(version.assessment_key) || !textValue(version.assessment_title) || !textValue(version.version)) {
    addBlocking(findings, {
      code: 'MISSING_VERSION_METADATA',
      message: 'Assessment key, title, and version must be present before publish.',
      category: 'metadata',
      tableName: 'assessment_versions',
      rowKey: version.assessment_version_id,
    });
  }
  if ((version.lifecycle_status ?? '').toUpperCase() === 'ARCHIVED') {
    addBlocking(findings, {
      code: 'ARCHIVED_VERSION_NOT_PUBLISHABLE',
      message: 'Archived assessment versions cannot be considered publishable.',
      category: 'metadata',
      tableName: 'assessment_versions',
      rowKey: version.assessment_version_id,
    });
  }
}

function auditDomainAndRuntimeRows(
  state: PersistedRankedPatternState,
  findings: RankedPatternPublishAuditFinding[],
): DomainRow | null {
  if (state.domains.length !== 1) {
    addBlocking(findings, {
      code: 'INVALID_ACTIVE_DOMAIN_COUNT',
      message: 'Exactly one active domain is required for a ranked-pattern assessment version.',
      category: 'domain',
      tableName: 'domains',
      relatedKeys: state.domains.map((domain) => domain.domain_key ?? domain.id),
    });
    return state.domains[0] ?? null;
  }
  const domain = state.domains[0];
  if (!textValue(domain.domain_key)) {
    addBlocking(findings, {
      code: 'MISSING_DOMAIN_KEY',
      message: 'The active domain must have a domain_key.',
      category: 'domain',
      tableName: 'domains',
      rowKey: domain.id,
    });
  }
  const domainId = domain.id;
  const domainKey = domain.domain_key;
  for (const signal of state.signals) {
    if (signal.domain_id !== domainId) {
      addBlocking(findings, {
        code: 'SIGNAL_DOMAIN_MISMATCH',
        message: 'Signal must reference the active domain.',
        category: 'domain',
        tableName: 'signals',
        rowKey: signal.signal_key ?? signal.id,
      });
    }
  }
  for (const question of state.questions) {
    if (question.domain_id !== domainId) {
      addBlocking(findings, {
        code: 'QUESTION_DOMAIN_MISMATCH',
        message: 'Question must reference the active domain.',
        category: 'domain',
        tableName: 'questions',
        rowKey: question.question_key ?? question.id,
      });
    }
  }
  for (const row of [...state.rankedPatterns, ...state.resultLanguageRows, ...state.previewCases]) {
    if ('domain_key' in row && row.domain_key !== domainKey) {
      addBlocking(findings, {
        code: 'RUNTIME_DOMAIN_KEY_MISMATCH',
        message: 'Persisted ranked-pattern runtime rows must use the active domain key.',
        category: 'domain',
        tableName: 'domain_key' in row && 'section_key' in row ? 'assessment_result_language_rows' : undefined,
        rowKey: 'pattern_key' in row ? (row.pattern_key ?? row.id) : row.id,
        relatedKeys: [row.domain_key ?? 'null', domainKey ?? 'null'],
      });
    }
  }
  return domain;
}

function auditSignals(
  state: PersistedRankedPatternState,
  findings: RankedPatternPublishAuditFinding[],
): readonly SignalRow[] {
  // The current runtime schema has no explicit scored flag. Non-overlay signals are treated as scored.
  const activeScoredSignals = state.signals.filter((signal) => signal.is_overlay !== true);
  const signalKeys = activeScoredSignals.map((signal) => textValue(signal.signal_key));
  const concreteKeys = signalKeys.filter((value): value is string => value !== null);

  if (activeScoredSignals.length !== 4) {
    addBlocking(findings, {
      code: 'INVALID_ACTIVE_SCORED_SIGNAL_COUNT',
      message: 'Exactly four active scored, non-overlay signals are required.',
      category: 'signals',
      tableName: 'signals',
      relatedKeys: activeScoredSignals.map((signal) => signal.signal_key ?? signal.id),
    });
  }
  if (concreteKeys.length !== activeScoredSignals.length) {
    addBlocking(findings, {
      code: 'MISSING_SIGNAL_KEY',
      message: 'Every active scored signal must have a non-empty signal_key.',
      category: 'signals',
      tableName: 'signals',
    });
  }
  const duplicates = duplicateValues(concreteKeys);
  if (duplicates.length > 0) {
    addBlocking(findings, {
      code: 'DUPLICATE_SIGNAL_KEY',
      message: 'Signal keys must be unique within the assessment version.',
      category: 'signals',
      tableName: 'signals',
      relatedKeys: duplicates,
    });
  }
  const orderValues = activeScoredSignals.map((signal) => signal.order_index);
  if (orderValues.some((value) => value === null) || duplicateValues(orderValues.map(String)).length > 0) {
    addBlocking(findings, {
      code: 'NON_DETERMINISTIC_SIGNAL_ORDER',
      message: 'Signal order_index values must be present and unique.',
      category: 'signals',
      tableName: 'signals',
    });
  }
  return activeScoredSignals;
}

function auditQuestionsAndOptions(
  state: PersistedRankedPatternState,
  findings: RankedPatternPublishAuditFinding[],
): void {
  if (state.questions.length === 0) {
    addBlocking(findings, {
      code: 'MISSING_ACTIVE_QUESTIONS',
      message: 'At least one active question is required.',
      category: 'questions_options',
      tableName: 'questions',
    });
  }
  const questionKeys = state.questions.map((question) => textValue(question.question_key));
  const concreteQuestionKeys = questionKeys.filter((value): value is string => value !== null);
  if (concreteQuestionKeys.length !== state.questions.length) {
    addBlocking(findings, {
      code: 'MISSING_QUESTION_KEY',
      message: 'Every active question must have a question_key.',
      category: 'questions_options',
      tableName: 'questions',
    });
  }
  const duplicateQuestionKeys = duplicateValues(concreteQuestionKeys);
  if (duplicateQuestionKeys.length > 0) {
    addBlocking(findings, {
      code: 'DUPLICATE_QUESTION_KEY',
      message: 'Question keys must be unique within the assessment version.',
      category: 'questions_options',
      tableName: 'questions',
      relatedKeys: duplicateQuestionKeys,
    });
  }
  const questionOrders = state.questions.map((question) => question.order_index);
  if (questionOrders.some((value) => value === null) || duplicateValues(questionOrders.map(String)).length > 0) {
    addBlocking(findings, {
      code: 'NON_DETERMINISTIC_QUESTION_ORDER',
      message: 'Question order_index values must be present and unique.',
      category: 'questions_options',
      tableName: 'questions',
    });
  }

  const questionIds = new Set(state.questions.map((question) => question.id));
  const optionsByQuestion = new Map<string, OptionRow[]>();
  for (const option of state.options) {
    if (!option.question_id || !questionIds.has(option.question_id)) {
      addBlocking(findings, {
        code: 'OPTION_UNKNOWN_QUESTION',
        message: 'Every active option must resolve to an active question.',
        category: 'questions_options',
        tableName: 'options',
        rowKey: option.option_key ?? option.id,
      });
      continue;
    }
    optionsByQuestion.set(option.question_id, [...(optionsByQuestion.get(option.question_id) ?? []), option]);
  }
  for (const question of state.questions) {
    if ((optionsByQuestion.get(question.id) ?? []).length === 0) {
      addBlocking(findings, {
        code: 'QUESTION_WITHOUT_OPTIONS',
        message: 'Every active question must have active options.',
        category: 'questions_options',
        tableName: 'questions',
        rowKey: question.question_key ?? question.id,
      });
    }
  }
  for (const [questionId, options] of optionsByQuestion) {
    const optionKeys = options.map((option) => textValue(option.option_key));
    const concreteOptionKeys = optionKeys.filter((value): value is string => value !== null);
    if (concreteOptionKeys.length !== options.length) {
      addBlocking(findings, {
        code: 'MISSING_OPTION_KEY',
        message: 'Every active option must have an option_key.',
        category: 'questions_options',
        tableName: 'options',
        rowKey: questionId,
      });
    }
    const duplicateOptionKeys = duplicateValues(concreteOptionKeys);
    if (duplicateOptionKeys.length > 0) {
      addBlocking(findings, {
        code: 'DUPLICATE_OPTION_KEY',
        message: 'Option keys must be unique within each question.',
        category: 'questions_options',
        tableName: 'options',
        rowKey: questionId,
        relatedKeys: duplicateOptionKeys,
      });
    }
    const optionOrders = options.map((option) => option.order_index);
    if (optionOrders.some((value) => value === null) || duplicateValues(optionOrders.map(String)).length > 0) {
      addBlocking(findings, {
        code: 'NON_DETERMINISTIC_OPTION_ORDER',
        message: 'Option order_index values must be present and unique within each question.',
        category: 'questions_options',
        tableName: 'options',
        rowKey: questionId,
      });
    }
  }
}

function auditOptionWeights(
  state: PersistedRankedPatternState,
  activeSignals: readonly SignalRow[],
  findings: RankedPatternPublishAuditFinding[],
): void {
  const optionIds = new Set(state.options.map((option) => option.id));
  const signalIds = new Set(activeSignals.map((signal) => signal.id));
  const optionSignalPairs: string[] = [];
  const optionsWithWeights = new Set<string>();

  for (const weight of state.optionWeights) {
    if (!weight.option_id || !optionIds.has(weight.option_id)) {
      addBlocking(findings, {
        code: 'WEIGHT_UNKNOWN_OPTION',
        message: 'Option weight must resolve to an active option.',
        category: 'option_weights',
        tableName: 'option_signal_weights',
        rowKey: weight.id,
      });
    } else {
      optionsWithWeights.add(weight.option_id);
    }
    if (!weight.signal_id || !signalIds.has(weight.signal_id)) {
      addBlocking(findings, {
        code: 'WEIGHT_UNKNOWN_SIGNAL',
        message: 'Option weight must resolve to one of the four active scored signals.',
        category: 'option_weights',
        tableName: 'option_signal_weights',
        rowKey: weight.id,
      });
    }
    if (toNumber(weight.weight) === null) {
      addBlocking(findings, {
        code: 'INVALID_OPTION_WEIGHT',
        message: 'Option weight must be numeric.',
        category: 'option_weights',
        tableName: 'option_signal_weights',
        rowKey: weight.id,
      });
    }
    optionSignalPairs.push(`${weight.option_id ?? ''}::${weight.signal_id ?? ''}`);
  }
  const duplicatePairs = duplicateValues(optionSignalPairs);
  if (duplicatePairs.length > 0) {
    addBlocking(findings, {
      code: 'DUPLICATE_OPTION_SIGNAL_WEIGHT',
      message: 'Duplicate option/signal weight rows are not publishable.',
      category: 'option_weights',
      tableName: 'option_signal_weights',
      relatedKeys: duplicatePairs,
    });
  }
  for (const option of state.options) {
    if (!optionsWithWeights.has(option.id)) {
      addBlocking(findings, {
        code: 'OPTION_WITHOUT_WEIGHTS',
        message: 'Every active scored option requires at least one explicit option_signal_weight.',
        category: 'option_weights',
        tableName: 'options',
        rowKey: option.option_key ?? option.id,
      });
    }
  }
}

function auditRankedPatterns(
  state: PersistedRankedPatternState,
  activeSignals: readonly SignalRow[],
  findings: RankedPatternPublishAuditFinding[],
): readonly string[] {
  const signalKeys = activeSignals.map((signal) => signal.signal_key).filter((value): value is string => Boolean(textValue(value)));
  const patternKeys = state.rankedPatterns.map((pattern) => textValue(pattern.pattern_key));
  const concretePatternKeys = patternKeys.filter((value): value is string => value !== null);
  const validPatternKeys = new Set<string>();
  const rankTupleKeys: string[] = [];

  if (state.rankedPatterns.length !== 24) {
    addBlocking(findings, {
      code: 'INVALID_RANKED_PATTERN_COUNT',
      message: 'Exactly twenty-four active ranked patterns are required.',
      category: 'ranked_patterns',
      tableName: 'assessment_ranked_patterns',
      relatedKeys: [String(state.rankedPatterns.length)],
    });
  }
  const duplicatePatternKeys = duplicateValues(concretePatternKeys);
  if (duplicatePatternKeys.length > 0) {
    addBlocking(findings, {
      code: 'DUPLICATE_PATTERN_KEY',
      message: 'Active pattern_key values must be unique.',
      category: 'ranked_patterns',
      tableName: 'assessment_ranked_patterns',
      relatedKeys: duplicatePatternKeys,
    });
  }
  for (const pattern of state.rankedPatterns) {
    const ranks = [
      textValue(pattern.rank_1_signal_key),
      textValue(pattern.rank_2_signal_key),
      textValue(pattern.rank_3_signal_key),
      textValue(pattern.rank_4_signal_key),
    ];
    const patternKey = textValue(pattern.pattern_key);
    if (!textValue(pattern.domain_key) || !patternKey || ranks.some((rank) => rank === null)) {
      addBlocking(findings, {
        code: 'INCOMPLETE_RANKED_PATTERN',
        message: 'Active ranked patterns require domain_key, pattern_key, and four rank signal keys.',
        category: 'ranked_patterns',
        tableName: 'assessment_ranked_patterns',
        rowKey: pattern.pattern_key ?? pattern.id,
      });
      continue;
    }
    const rankValues = ranks as readonly string[];
    const rankSet = new Set(rankValues);
    const hasAllActiveSignals = signalKeys.length === 4 && signalKeys.every((signalKey) => rankSet.has(signalKey));
    if (rankSet.size !== 4 || !hasAllActiveSignals) {
      addBlocking(findings, {
        code: 'RANK_TUPLE_SIGNAL_SET_MISMATCH',
        message: 'Each ranked pattern tuple must contain the four active signal keys exactly once.',
        category: 'ranked_patterns',
        tableName: 'assessment_ranked_patterns',
        rowKey: pattern.pattern_key ?? pattern.id,
        relatedKeys: rankValues,
      });
    }
    const expectedPatternKey = buildPatternKeyFromRankedSignalKeys(
      rankValues[0],
      rankValues[1],
      rankValues[2],
      rankValues[3],
    );
    if (patternKey !== expectedPatternKey) {
      addBlocking(findings, {
        code: 'PATTERN_KEY_RANK_ORDER_MISMATCH',
        message: 'pattern_key must match rank_1 through rank_4 signal keys in order.',
        category: 'ranked_patterns',
        tableName: 'assessment_ranked_patterns',
        rowKey: patternKey,
        relatedKeys: [expectedPatternKey],
      });
    }
    rankTupleKeys.push(expectedPatternKey);
    validPatternKeys.add(patternKey);
  }
  const duplicateRankTuples = duplicateValues(rankTupleKeys);
  if (duplicateRankTuples.length > 0) {
    addBlocking(findings, {
      code: 'DUPLICATE_RANK_TUPLE',
      message: 'Active rank tuples must be unique.',
      category: 'ranked_patterns',
      tableName: 'assessment_ranked_patterns',
      relatedKeys: duplicateRankTuples,
    });
  }
  if (signalKeys.length === 4) {
    const expectedPermutations = permutationKeys(signalKeys);
    const missingPermutations = expectedPermutations.filter((patternKey) => !validPatternKeys.has(patternKey));
    if (missingPermutations.length > 0) {
      addBlocking(findings, {
        code: 'MISSING_RANKED_PATTERN_PERMUTATIONS',
        message: 'All 24 permutations of the four active signals must be covered exactly once.',
        category: 'ranked_patterns',
        tableName: 'assessment_ranked_patterns',
        relatedKeys: missingPermutations.slice(0, 8),
      });
    }
  }
  return concretePatternKeys;
}

function auditScoreShapes(
  state: PersistedRankedPatternState,
  findings: RankedPatternPublishAuditFinding[],
): void {
  const activeRuleShapes = uniqueTextValues(state.scoreShapeRules.map((rule) => rule.score_shape));
  for (const rule of state.scoreShapeRules) {
    if (!rule.score_shape || !supportedScoreShapeSet.has(rule.score_shape)) {
      addBlocking(findings, {
        code: 'UNSUPPORTED_SCORE_SHAPE_RULE',
        message: 'Score-shape rules may only use concentrated, paired, graduated, or balanced.',
        category: 'score_shapes',
        tableName: 'assessment_score_shape_rules',
        rowKey: rule.rule_key ?? rule.id,
      });
    }
  }
  if (state.scoreShapeRules.length === 0) {
    const policy = getRankedPatternScoreShapePolicySummary();
    addInfo(findings, {
      code: 'FIXED_SCORE_SHAPE_POLICY_ACTIVE',
      message: `No explicit score-shape rules are stored; publish audit will use fixed platform policy ${policy.policyKey} ${policy.policyVersion}.`,
      category: 'score_shapes',
      relatedKeys: [policy.policyKey, policy.policyVersion],
    });
  } else {
    const missingShapes = rankedPatternSupportedScoreShapes.filter((shape) => !activeRuleShapes.includes(shape));
    if (missingShapes.length > 0) {
      addBlocking(findings, {
        code: 'INCOMPLETE_SCORE_SHAPE_RULES',
        message: 'Active score-shape rules must represent all four supported score shapes.',
        category: 'score_shapes',
        tableName: 'assessment_score_shape_rules',
        relatedKeys: missingShapes,
      });
    }
  }
}

function auditSectionDefinitions(
  state: PersistedRankedPatternState,
  findings: RankedPatternPublishAuditFinding[],
): void {
  for (const expected of expectedRuntimeSections) {
    const matches = state.sectionDefinitions.filter((section) => section.section_key === expected.sectionKey);
    if (matches.length !== 1) {
      addBlocking(findings, {
        code: 'INVALID_SECTION_DEFINITION_COUNT',
        message: `Exactly one active section definition is required for ${expected.sourceSheetKey}.`,
        category: 'section_definitions',
        tableName: 'assessment_result_section_definitions',
        rowKey: expected.sectionKey,
      });
      continue;
    }
    const match = matches[0];
    if (match.source_sheet_key !== expected.sourceSheetKey) {
      addBlocking(findings, {
        code: 'SECTION_SOURCE_SHEET_MISMATCH',
        message: 'Section definition source_sheet_key must match the ranked-pattern manifest.',
        category: 'section_definitions',
        tableName: 'assessment_result_section_definitions',
        rowKey: expected.sectionKey,
        relatedKeys: [match.source_sheet_key ?? 'null', expected.sourceSheetKey],
      });
    }
  }
  for (const section of state.sectionDefinitions) {
    if (section.section_key && adminSupportSectionKeys.has(section.section_key)) {
      addBlocking(findings, {
        code: 'ADMIN_SUPPORT_SECTION_MARKED_RUNTIME',
        message: 'Sheets 15 through 18 must not be active runtime result sections.',
        category: 'section_definitions',
        tableName: 'assessment_result_section_definitions',
        rowKey: section.section_key,
      });
    }
  }
  const orders = state.sectionDefinitions.map((section) => section.section_order);
  if (orders.some((order) => order === null) || duplicateValues(orders.map(String)).length > 0) {
    addBlocking(findings, {
      code: 'NON_DETERMINISTIC_SECTION_ORDER',
      message: 'Result section order values must be present and unique.',
      category: 'section_definitions',
      tableName: 'assessment_result_section_definitions',
    });
  }
}

function auditResultLanguage(
  state: PersistedRankedPatternState,
  activeSignals: readonly SignalRow[],
  activePatternKeys: readonly string[],
  activeDomainKey: string | null,
  findings: RankedPatternPublishAuditFinding[],
): void {
  const patternKeySet = new Set(activePatternKeys);
  const signalKeySet = new Set(activeSignals.map((signal) => signal.signal_key).filter((value): value is string => Boolean(textValue(value))));
  const rowsBySection = new Map<string, ResultLanguageRow[]>();
  for (const row of state.resultLanguageRows) {
    if (!row.section_key) {
      addBlocking(findings, {
        code: 'MISSING_RESULT_SECTION_KEY',
        message: 'Active result language rows require section_key.',
        category: 'result_language',
        tableName: 'assessment_result_language_rows',
        rowKey: row.id,
      });
      continue;
    }
    if (adminSupportSectionKeys.has(row.section_key)) {
      addBlocking(findings, {
        code: 'ADMIN_SUPPORT_ROW_MARKED_RUNTIME',
        message: 'Sheets 15 through 18 must not become runtime result-language rows.',
        category: 'result_language',
        tableName: 'assessment_result_language_rows',
        rowKey: row.lookup_key ?? row.id,
      });
    }
    rowsBySection.set(row.section_key, [...(rowsBySection.get(row.section_key) ?? []), row]);
    if (!textValue(row.lookup_key)) {
      addBlocking(findings, {
        code: 'MISSING_LOOKUP_KEY',
        message: 'Active result language rows require lookup_key.',
        category: 'result_language',
        tableName: 'assessment_result_language_rows',
        rowKey: row.id,
      });
    }
    if (!isNonEmptyObject(row.field_values)) {
      addBlocking(findings, {
        code: 'EMPTY_FIELD_VALUES',
        message: 'Active result language rows must contain non-empty field_values.',
        category: 'result_language',
        tableName: 'assessment_result_language_rows',
        rowKey: row.lookup_key ?? row.id,
      });
    }
    if (row.score_shape && !supportedScoreShapeSet.has(row.score_shape)) {
      addBlocking(findings, {
        code: 'UNSUPPORTED_SCORE_SHAPE_IN_RESULT_LANGUAGE',
        message: 'Result language score_shape must be supported.',
        category: 'score_shapes',
        tableName: 'assessment_result_language_rows',
        rowKey: row.lookup_key ?? row.id,
        relatedKeys: [row.score_shape],
      });
    }
    if (row.pattern_key && !patternKeySet.has(row.pattern_key)) {
      addBlocking(findings, {
        code: 'RESULT_LANGUAGE_UNKNOWN_PATTERN',
        message: 'Result language pattern_key must resolve to an active ranked pattern.',
        category: 'result_language',
        tableName: 'assessment_result_language_rows',
        rowKey: row.lookup_key ?? row.id,
        relatedKeys: [row.pattern_key],
      });
    }
    if (row.signal_key && !signalKeySet.has(row.signal_key)) {
      addBlocking(findings, {
        code: 'RESULT_LANGUAGE_UNKNOWN_SIGNAL',
        message: 'Result language signal_key must resolve to an active scored signal.',
        category: 'result_language',
        tableName: 'assessment_result_language_rows',
        rowKey: row.lookup_key ?? row.id,
        relatedKeys: [row.signal_key],
      });
    }
  }

  for (const [sectionKey, rows] of rowsBySection) {
    const duplicateLookupKeys = duplicateValues(rows.map((row) => row.lookup_key ?? '').filter(Boolean));
    if (duplicateLookupKeys.length > 0) {
      addBlocking(findings, {
        code: 'DUPLICATE_LOOKUP_KEY_WITHIN_SECTION',
        message: 'lookup_key values must be unique within each result section.',
        category: 'result_language',
        tableName: 'assessment_result_language_rows',
        rowKey: sectionKey,
        relatedKeys: duplicateLookupKeys,
      });
    }
  }

  const contextRows = rowsBySection.get('context') ?? [];
  if (contextRows.filter((row) => row.domain_key === activeDomainKey).length !== 1) {
    addBlocking(findings, {
      code: 'INVALID_CONTEXT_ROW_COUNT',
      message: '05_Context requires exactly one active row for the active domain.',
      category: 'result_language',
      tableName: 'assessment_result_language_rows',
      rowKey: 'context',
    });
  }

  for (const sectionKey of patternScoreShapeSections) {
    const rows = rowsBySection.get(sectionKey) ?? [];
    const rowKeys = new Set(rows.map((row) => `${row.pattern_key ?? ''}::${row.score_shape ?? ''}`));
    for (const patternKey of activePatternKeys) {
      for (const scoreShape of rankedPatternSupportedScoreShapes) {
        if (!rowKeys.has(`${patternKey}::${scoreShape}`)) {
          addBlocking(findings, {
            code: 'INCOMPLETE_PATTERN_SCORE_SHAPE_COVERAGE',
            message: 'Pattern + score_shape coverage is incomplete for a required result section.',
            category: 'result_language',
            tableName: 'assessment_result_language_rows',
            rowKey: sectionKey,
            relatedKeys: [patternKey, scoreShape],
          });
        }
      }
    }
  }

  for (const sectionKey of patternOnlySections) {
    const rows = rowsBySection.get(sectionKey) ?? [];
    const patternKeysInSection = new Set(rows.map((row) => row.pattern_key).filter((value): value is string => Boolean(textValue(value))));
    for (const patternKey of activePatternKeys) {
      if (!patternKeysInSection.has(patternKey)) {
        addBlocking(findings, {
          code: 'INCOMPLETE_PATTERN_COVERAGE',
          message: 'Pattern coverage is incomplete for a required result section.',
          category: 'result_language',
          tableName: 'assessment_result_language_rows',
          rowKey: sectionKey,
          relatedKeys: [patternKey],
        });
      }
    }
    const prioritiesByPattern = new Map<string, number[]>();
    for (const row of rows) {
      if (!row.pattern_key) {
        continue;
      }
      prioritiesByPattern.set(row.pattern_key, [...(prioritiesByPattern.get(row.pattern_key) ?? []), row.priority ?? Number.NaN]);
    }
    for (const [patternKey, priorities] of prioritiesByPattern) {
      if (priorities.some((priority) => !Number.isInteger(priority)) || duplicateValues(priorities.map(String)).length > 0) {
        addBlocking(findings, {
          code: 'NON_DETERMINISTIC_PATTERN_PRIORITY',
          message: 'Priority values must be present and unique within section + pattern_key.',
          category: 'result_language',
          tableName: 'assessment_result_language_rows',
          rowKey: sectionKey,
          relatedKeys: [patternKey],
        });
      }
    }
  }

  const roleRows = rowsBySection.get('signal_roles') ?? [];
  const roleKeys = new Set(roleRows.map((row) => `${row.signal_key ?? ''}::${row.rank_position ?? ''}`));
  for (const signalKey of signalKeySet) {
    for (const rankPosition of rankedPatternSupportedRankPositions) {
      if (!roleKeys.has(`${signalKey}::${rankPosition}`)) {
        addBlocking(findings, {
          code: 'INCOMPLETE_SIGNAL_RANK_COVERAGE',
          message: '08_Signal_Roles must cover rank positions 1 through 4 for each active signal.',
          category: 'result_language',
          tableName: 'assessment_result_language_rows',
          rowKey: 'signal_roles',
          relatedKeys: [signalKey, String(rankPosition)],
        });
      }
    }
  }
  for (const row of roleRows) {
    if (row.rank_position === null || !supportedRankPositionSet.has(row.rank_position)) {
      addBlocking(findings, {
        code: 'UNSUPPORTED_RANK_POSITION',
        message: 'Signal role rank_position must be 1, 2, 3, or 4.',
        category: 'result_language',
        tableName: 'assessment_result_language_rows',
        rowKey: row.lookup_key ?? row.id,
      });
    }
  }
}

function auditPreviewCases(
  state: PersistedRankedPatternState,
  activeSignals: readonly SignalRow[],
  activePatternKeys: readonly string[],
  findings: RankedPatternPublishAuditFinding[],
): void {
  const patternKeySet = new Set(activePatternKeys);
  const signalKeySet = new Set(activeSignals.map((signal) => signal.signal_key).filter((value): value is string => Boolean(textValue(value))));
  if (state.previewCases.length === 0) {
    addBlocking(findings, {
      code: 'MISSING_PREVIEW_CASE',
      message: 'At least one active report preview case is required for publish proof.',
      category: 'preview_cases',
      tableName: 'assessment_report_preview_cases',
    });
  }
  for (const preview of state.previewCases) {
    if (!preview.expected_pattern_key || !patternKeySet.has(preview.expected_pattern_key)) {
      addBlocking(findings, {
        code: 'PREVIEW_UNKNOWN_PATTERN',
        message: 'Preview case expected_pattern_key must resolve to an active ranked pattern.',
        category: 'preview_cases',
        tableName: 'assessment_report_preview_cases',
        rowKey: preview.preview_case_key ?? preview.id,
      });
    }
    if (!preview.expected_score_shape || !supportedScoreShapeSet.has(preview.expected_score_shape)) {
      addBlocking(findings, {
        code: 'PREVIEW_UNSUPPORTED_SCORE_SHAPE',
        message: 'Preview case expected_score_shape must be supported.',
        category: 'preview_cases',
        tableName: 'assessment_report_preview_cases',
        rowKey: preview.preview_case_key ?? preview.id,
      });
    }
    const rankedSignalKeys = toStringArray(preview.ranked_signal_keys);
    if (
      !rankedSignalKeys ||
      rankedSignalKeys.length !== 4 ||
      new Set(rankedSignalKeys).size !== 4 ||
      rankedSignalKeys.some((signalKey) => !signalKeySet.has(signalKey))
    ) {
      addBlocking(findings, {
        code: 'PREVIEW_RANKED_SIGNAL_KEYS_INVALID',
        message: 'Preview ranked_signal_keys must contain exactly the four active signal keys in ranked order.',
        category: 'preview_cases',
        tableName: 'assessment_report_preview_cases',
        rowKey: preview.preview_case_key ?? preview.id,
      });
    }
    if (!isReadableScores(preview.normalized_scores)) {
      addBlocking(findings, {
        code: 'PREVIEW_NORMALIZED_SCORES_INVALID',
        message: 'Preview normalized_scores must be readable as a deterministic object or array.',
        category: 'preview_cases',
        tableName: 'assessment_report_preview_cases',
        rowKey: preview.preview_case_key ?? preview.id,
      });
    }
  }
}

function auditReportFirstTemplates(
  state: PersistedRankedPatternState,
  activePatternKeys: readonly string[],
  activeDomainKey: string | null,
  findings: RankedPatternPublishAuditFinding[],
): void {
  const patternKeySet = new Set(activePatternKeys);
  const concreteTemplatePatternKeys = state.reportFirstTemplates
    .map((template) => textValue(template.pattern_key))
    .filter((value): value is string => value !== null);

  if (state.reportFirstTemplates.length !== 24) {
    addBlocking(findings, {
      code: 'REPORT_FIRST_TEMPLATE_COUNT_INVALID',
      message: 'Report-first publish readiness requires exactly twenty-four active report-first templates.',
      category: 'report_first_templates',
      tableName: 'assessment_report_first_templates',
      relatedKeys: [String(state.reportFirstTemplates.length)],
    });
  }

  const duplicatePatternKeys = duplicateValues(concreteTemplatePatternKeys);
  if (duplicatePatternKeys.length > 0) {
    addBlocking(findings, {
      code: 'REPORT_FIRST_TEMPLATE_DUPLICATE_PATTERN',
      message: 'Active report-first templates must contain no duplicate pattern_key values.',
      category: 'report_first_templates',
      tableName: 'assessment_report_first_templates',
      relatedKeys: duplicatePatternKeys,
    });
  }

  for (const template of state.reportFirstTemplates) {
    const rowKey = template.pattern_key ?? template.report_key ?? template.id;
    const requiredFields: readonly { readonly field: string; readonly value: string | null }[] = [
      { field: 'assessment_version_id', value: template.assessment_version_id },
      { field: 'domain_key', value: template.domain_key },
      { field: 'pattern_key', value: template.pattern_key },
      { field: 'report_key', value: template.report_key },
      { field: 'report_contract', value: template.report_contract },
      { field: 'content_hash', value: template.content_hash },
      { field: 'status', value: template.status },
    ];
    const missingFields = requiredFields
      .filter(({ value }) => !textValue(value))
      .map(({ field }) => field);

    if (missingFields.length > 0) {
      addBlocking(findings, {
        code: 'REPORT_FIRST_TEMPLATE_MISSING_REQUIRED_FIELD',
        message: 'Active report-first templates require assessment_version_id, domain_key, pattern_key, report_key, report_contract, content_hash, and status.',
        category: 'report_first_templates',
        tableName: 'assessment_report_first_templates',
        rowKey,
        relatedKeys: missingFields,
      });
    }

    if (template.status !== 'active') {
      addBlocking(findings, {
        code: 'REPORT_FIRST_TEMPLATE_STATUS_INVALID',
        message: 'Report-first publish readiness only accepts active report-first templates.',
        category: 'report_first_templates',
        tableName: 'assessment_report_first_templates',
        rowKey,
        relatedKeys: [template.status ?? 'null'],
      });
    }

    if (template.report_contract !== reportFirstTemplateContract) {
      addBlocking(findings, {
        code: 'REPORT_FIRST_TEMPLATE_INVALID_CONTRACT',
        message: `Active report-first templates must use ${reportFirstTemplateContract}.`,
        category: 'report_first_templates',
        tableName: 'assessment_report_first_templates',
        rowKey,
        relatedKeys: [template.report_contract ?? 'null'],
      });
    }

    if (!isNonEmptyObject(template.report_template_json)) {
      addBlocking(findings, {
        code: 'REPORT_FIRST_TEMPLATE_EMPTY_JSON',
        message: 'Active report-first templates must contain non-empty report_template_json.',
        category: 'report_first_templates',
        tableName: 'assessment_report_first_templates',
        rowKey,
      });
    }

    if (!textValue(template.content_hash)) {
      addBlocking(findings, {
        code: 'REPORT_FIRST_TEMPLATE_MISSING_CONTENT_HASH',
        message: 'Active report-first templates must store content_hash for deterministic import/change tracking.',
        category: 'report_first_templates',
        tableName: 'assessment_report_first_templates',
        rowKey,
      });
    }

    if (template.pattern_key && !patternKeySet.has(template.pattern_key)) {
      addBlocking(findings, {
        code: 'REPORT_FIRST_TEMPLATE_UNKNOWN_PATTERN',
        message: 'Active report-first template pattern_key must resolve to an active ranked pattern.',
        category: 'report_first_templates',
        tableName: 'assessment_report_first_templates',
        rowKey,
        relatedKeys: [template.pattern_key],
      });
    }

    if (activeDomainKey && template.domain_key !== activeDomainKey) {
      addBlocking(findings, {
        code: 'REPORT_FIRST_TEMPLATE_DOMAIN_MISMATCH',
        message: 'Active report-first templates must use the assessment version active domain_key.',
        category: 'report_first_templates',
        tableName: 'assessment_report_first_templates',
        rowKey,
        relatedKeys: [template.domain_key ?? 'null', activeDomainKey],
      });
    }
  }

  const templatePatternKeySet = new Set(concreteTemplatePatternKeys);
  for (const patternKey of patternKeySet) {
    if (!templatePatternKeySet.has(patternKey)) {
      addBlocking(findings, {
        code: 'REPORT_FIRST_TEMPLATE_MISSING_FOR_PATTERN',
        message: 'Every active ranked pattern must have exactly one matching active report-first template.',
        category: 'report_first_templates',
        tableName: 'assessment_report_first_templates',
        rowKey: patternKey,
      });
    }
  }
}

function summaryCounts(
  findings: readonly RankedPatternPublishAuditFinding[],
): Readonly<Record<RankedPatternPublishAuditCategory, RankedPatternPublishAuditSummaryCount>> {
  const counts: Record<RankedPatternPublishAuditCategory, RankedPatternPublishAuditSummaryCount> =
    { ...emptySummaryCounts };
  for (const finding of findings) {
    const current = counts[finding.category];
    counts[finding.category] = Object.freeze({
      blocking: current.blocking + (finding.severity === 'blocking' ? 1 : 0),
      warning: current.warning + (finding.severity === 'warning' ? 1 : 0),
      info: current.info + (finding.severity === 'info' ? 1 : 0),
    });
  }
  return Object.freeze(counts);
}

export async function auditRankedPatternAssessmentVersion(
  input: RankedPatternPublishAuditInput,
): Promise<RankedPatternPublishAuditResult> {
  const state = await loadPersistedRankedPatternState(input.db, input.assessmentVersionId, {
    includeReportFirstTemplates: input.auditReportFirstTemplates === true,
  });
  const findings: RankedPatternPublishAuditFinding[] = [];

  auditMetadata(state, findings);
  const activeDomain = auditDomainAndRuntimeRows(state, findings);
  const activeSignals = auditSignals(state, findings);
  auditQuestionsAndOptions(state, findings);
  auditOptionWeights(state, activeSignals, findings);
  const activePatternKeys = auditRankedPatterns(state, activeSignals, findings);
  auditScoreShapes(state, findings);
  auditSectionDefinitions(state, findings);
  auditResultLanguage(state, activeSignals, activePatternKeys, activeDomain?.domain_key ?? null, findings);
  auditPreviewCases(state, activeSignals, activePatternKeys, findings);
  if (input.auditReportFirstTemplates === true) {
    auditReportFirstTemplates(state, activePatternKeys, activeDomain?.domain_key ?? null, findings);
  }

  const visibleFindings = input.includeWarnings === false
    ? findings.filter((finding) => finding.severity === 'blocking')
    : findings;
  const blockingCount = findings.filter((finding) => finding.severity === 'blocking').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  return Object.freeze({
    assessmentVersionId: input.assessmentVersionId,
    canPublish: blockingCount === 0,
    blockingCount,
    warningCount,
    findings: Object.freeze(visibleFindings),
    summaryCountsByCategory: summaryCounts(findings),
  });
}
