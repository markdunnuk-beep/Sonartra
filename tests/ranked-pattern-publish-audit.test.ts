import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditRankedPatternAssessmentVersion,
  type RankedPatternPublishAuditResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-publish-audit';
import type { RankedPatternPersistenceDbClient } from '@/content/assessment-packages/import-contract/ranked-pattern-import-persistence';
import { buildPatternKeyFromRankedSignalKeys } from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';

type Fixture = {
  version: readonly Record<string, unknown>[];
  domains: readonly Record<string, unknown>[];
  signals: readonly Record<string, unknown>[];
  questions: readonly Record<string, unknown>[];
  options: readonly Record<string, unknown>[];
  optionWeights: readonly Record<string, unknown>[];
  rankedPatterns: readonly Record<string, unknown>[];
  scoreShapeRules: readonly Record<string, unknown>[];
  sectionDefinitions: readonly Record<string, unknown>[];
  resultLanguageRows: readonly Record<string, unknown>[];
  previewCases: readonly Record<string, unknown>[];
};

const signalKeys = ['signal_a', 'signal_b', 'signal_c', 'signal_d'] as const;
const scoreShapes = ['concentrated', 'paired', 'graduated', 'balanced'] as const;
const patternScoreShapeSections = [
  'orientation',
  'recognition',
  'pattern_mechanics',
  'pattern_synthesis',
  'closing_integration',
] as const;
const patternOnlySections = ['strengths', 'narrowing', 'application'] as const;

function allPatterns(): readonly {
  readonly patternKey: string;
  readonly ranks: readonly [string, string, string, string];
}[] {
  const patterns: {
    readonly patternKey: string;
    readonly ranks: readonly [string, string, string, string];
  }[] = [];
  for (const a of signalKeys) {
    for (const b of signalKeys) {
      for (const c of signalKeys) {
        for (const d of signalKeys) {
          if (new Set([a, b, c, d]).size === 4) {
            patterns.push({
              patternKey: buildPatternKeyFromRankedSignalKeys(a, b, c, d),
              ranks: [a, b, c, d],
            });
          }
        }
      }
    }
  }
  return patterns;
}

function completeFixture(): Fixture {
  const patterns = allPatterns();
  return {
    version: [
      {
        assessment_version_id: 'version-1',
        assessment_id: 'assessment-1',
        version: '1.0.0',
        lifecycle_status: 'DRAFT',
        mode: 'single_domain',
        result_model_key: 'ranked_pattern',
        assessment_key: 'assessment_key',
        assessment_title: 'Assessment title',
        is_active: true,
      },
    ],
    domains: [
      {
        id: 'domain-1',
        domain_key: 'domain_key',
        label: 'Domain',
        domain_type: 'SIGNAL_GROUP',
        order_index: 0,
      },
    ],
    signals: signalKeys.map((signalKey, index) => ({
      id: `signal-${index + 1}`,
      domain_id: 'domain-1',
      signal_key: signalKey,
      label: `Signal ${index + 1}`,
      order_index: index + 1,
      is_overlay: false,
    })),
    questions: [
      {
        id: 'question-1',
        domain_id: 'domain-1',
        question_key: 'question_1',
        order_index: 1,
      },
    ],
    options: [
      {
        id: 'option-1',
        question_id: 'question-1',
        option_key: 'A',
        order_index: 1,
      },
    ],
    optionWeights: [
      {
        id: 'weight-1',
        option_id: 'option-1',
        signal_id: 'signal-1',
        weight: '1',
      },
    ],
    rankedPatterns: patterns.map(({ patternKey, ranks }, index) => {
      return {
        id: `pattern-${index + 1}`,
        domain_key: 'domain_key',
        pattern_key: patternKey,
        rank_1_signal_key: ranks[0],
        rank_2_signal_key: ranks[1],
        rank_3_signal_key: ranks[2],
        rank_4_signal_key: ranks[3],
        status: 'active',
      };
    }),
    scoreShapeRules: scoreShapes.map((scoreShape, index) => ({
      id: `rule-${index + 1}`,
      score_shape: scoreShape,
      rule_key: `${scoreShape}_rule`,
      rule_config: { policy: scoreShape },
      status: 'active',
    })),
    sectionDefinitions: [
      ['context', '05_Context'],
      ['orientation', '06_Orientation'],
      ['recognition', '07_Recognition'],
      ['signal_roles', '08_Signal_Roles'],
      ['pattern_mechanics', '09_Pattern_Mechanics'],
      ['pattern_synthesis', '10_Pattern_Synthesis'],
      ['strengths', '11_Strengths'],
      ['narrowing', '12_Narrowing'],
      ['application', '13_Application'],
      ['closing_integration', '14_Closing_Integration'],
    ].map(([sectionKey, sourceSheetKey], index) => ({
      id: `section-${index + 1}`,
      section_key: sectionKey,
      section_order: index + 1,
      source_sheet_key: sourceSheetKey,
      runtime_category: 'runtime_result_content',
      status: 'active',
    })),
    resultLanguageRows: [
      {
        id: 'language-context',
        section_key: 'context',
        lookup_key: 'context::domain',
        domain_key: 'domain_key',
        pattern_key: null,
        score_shape: null,
        signal_key: null,
        rank_position: null,
        item_key: null,
        priority: null,
        field_values: { heading: 'Context' },
        status: 'active',
      },
      ...patternScoreShapeSections.flatMap((sectionKey) =>
        patterns.flatMap(({ patternKey }) =>
          scoreShapes.map((scoreShape) => ({
            id: `${sectionKey}-${patternKey}-${scoreShape}`,
            section_key: sectionKey,
            lookup_key: `${sectionKey}::${patternKey}::${scoreShape}`,
            domain_key: 'domain_key',
            pattern_key: patternKey,
            score_shape: scoreShape,
            signal_key: null,
            rank_position: null,
            item_key: null,
            priority: null,
            field_values: { text: `${sectionKey} ${scoreShape}` },
            status: 'active',
          })),
        ),
      ),
      ...signalKeys.flatMap((signalKey) =>
        [1, 2, 3, 4].map((rankPosition) => ({
          id: `role-${signalKey}-${rankPosition}`,
          section_key: 'signal_roles',
          lookup_key: `signal_roles::${signalKey}::${rankPosition}`,
          domain_key: 'domain_key',
          pattern_key: null,
          score_shape: null,
          signal_key: signalKey,
          rank_position: rankPosition,
          item_key: null,
          priority: null,
          field_values: { text: `${signalKey} rank ${rankPosition}` },
          status: 'active',
        })),
      ),
      ...patternOnlySections.flatMap((sectionKey) =>
        patterns.map(({ patternKey }) => ({
          id: `${sectionKey}-${patternKey}`,
          section_key: sectionKey,
          lookup_key: `${sectionKey}::${patternKey}::1`,
          domain_key: 'domain_key',
          pattern_key: patternKey,
          score_shape: null,
          signal_key: null,
          rank_position: null,
          item_key: `${sectionKey}_1`,
          priority: 1,
          field_values: { text: `${sectionKey} ${patternKey}` },
          status: 'active',
        })),
      ),
    ],
    previewCases: [
      {
        id: 'preview-1',
        preview_case_key: 'case_1',
        domain_key: 'domain_key',
        ranked_signal_keys: ['signal_a', 'signal_b', 'signal_c', 'signal_d'],
        normalized_scores: { signal_a: 40, signal_b: 30, signal_c: 20, signal_d: 10 },
        expected_score_shape: 'balanced',
        expected_pattern_key: 'signal_a_signal_b_signal_c_signal_d',
        expected_payload_snapshot: null,
        status: 'active',
      },
    ],
  };
}

function mutateFixture(mutator: (fixture: Fixture) => Fixture): Fixture {
  return mutator(completeFixture());
}

function dbForFixture(fixture: Fixture): RankedPatternPersistenceDbClient {
  return {
    async query<T>(text: string) {
      let rows: readonly Record<string, unknown>[] = [];
      if (text.includes('FROM assessment_versions av')) {
        rows = fixture.version;
      } else if (text.includes('FROM domains')) {
        rows = fixture.domains;
      } else if (text.includes('FROM signals')) {
        rows = fixture.signals;
      } else if (text.includes('FROM questions')) {
        rows = fixture.questions;
      } else if (text.includes('FROM options')) {
        rows = fixture.options;
      } else if (text.includes('FROM option_signal_weights')) {
        rows = fixture.optionWeights;
      } else if (text.includes('FROM assessment_ranked_patterns')) {
        rows = fixture.rankedPatterns.filter((row) => row.status === 'active');
      } else if (text.includes('FROM assessment_score_shape_rules')) {
        rows = fixture.scoreShapeRules.filter((row) => row.status === 'active');
      } else if (text.includes('FROM assessment_result_section_definitions')) {
        rows = fixture.sectionDefinitions.filter((row) => row.status === 'active');
      } else if (text.includes('FROM assessment_result_language_rows')) {
        rows = fixture.resultLanguageRows.filter((row) => row.status === 'active');
      } else if (text.includes('FROM assessment_report_preview_cases')) {
        rows = fixture.previewCases.filter((row) => row.status === 'active');
      }
      return { rows: rows as readonly T[] };
    },
  };
}

async function auditFixture(fixture: Fixture): Promise<RankedPatternPublishAuditResult> {
  return auditRankedPatternAssessmentVersion({
    assessmentVersionId: 'version-1',
    db: dbForFixture(fixture),
  });
}

function hasCode(result: RankedPatternPublishAuditResult, code: string): boolean {
  return result.findings.some((finding) => finding.code === code);
}

test('publish audit accepts a minimal complete persisted ranked-pattern fixture', async () => {
  const result = await auditFixture(completeFixture());

  assert.equal(result.canPublish, true);
  assert.equal(result.blockingCount, 0);
});

test('publish audit blocks missing assessment version', async () => {
  const result = await auditFixture(mutateFixture((fixture) => ({ ...fixture, version: [] })));

  assert.equal(result.canPublish, false);
  assert.equal(hasCode(result, 'ASSESSMENT_VERSION_NOT_FOUND'), true);
});

test('publish audit blocks unsupported mode and missing result model key', async () => {
  const result = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      version: [{ ...fixture.version[0], mode: 'multi_domain', result_model_key: null }],
    })),
  );

  assert.equal(hasCode(result, 'UNSUPPORTED_ASSESSMENT_MODE'), true);
  assert.equal(hasCode(result, 'UNSUPPORTED_RESULT_MODEL_KEY'), true);
});

test('publish audit blocks fewer or more than four active scored signals', async () => {
  const fewer = await auditFixture(
    mutateFixture((fixture) => ({ ...fixture, signals: fixture.signals.slice(0, 3) })),
  );
  const more = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      signals: [...fixture.signals, { ...fixture.signals[0], id: 'signal-5', signal_key: 'signal_e', order_index: 5 }],
    })),
  );

  assert.equal(hasCode(fewer, 'INVALID_ACTIVE_SCORED_SIGNAL_COUNT'), true);
  assert.equal(hasCode(more, 'INVALID_ACTIVE_SCORED_SIGNAL_COUNT'), true);
});

test('publish audit blocks missing active questions and active question with no options', async () => {
  const missing = await auditFixture(mutateFixture((fixture) => ({ ...fixture, questions: [], options: [] })));
  const noOptions = await auditFixture(mutateFixture((fixture) => ({ ...fixture, options: [] })));

  assert.equal(hasCode(missing, 'MISSING_ACTIVE_QUESTIONS'), true);
  assert.equal(hasCode(noOptions, 'QUESTION_WITHOUT_OPTIONS'), true);
});

test('publish audit blocks option weights referencing unknown signal or option', async () => {
  const result = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      optionWeights: [{ ...fixture.optionWeights[0], option_id: 'unknown-option', signal_id: 'unknown-signal' }],
    })),
  );

  assert.equal(hasCode(result, 'WEIGHT_UNKNOWN_OPTION'), true);
  assert.equal(hasCode(result, 'WEIGHT_UNKNOWN_SIGNAL'), true);
});

test('publish audit blocks fewer than twenty-four ranked patterns and invalid pattern rows', async () => {
  const result = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      rankedPatterns: [
        {
          ...fixture.rankedPatterns[0],
          pattern_key: 'signal_a_signal_b_signal_d_signal_c',
          rank_4_signal_key: 'signal_b',
        },
      ],
    })),
  );

  assert.equal(hasCode(result, 'INVALID_RANKED_PATTERN_COUNT'), true);
  assert.equal(hasCode(result, 'PATTERN_KEY_RANK_ORDER_MISMATCH'), true);
  assert.equal(hasCode(result, 'RANK_TUPLE_SIGNAL_SET_MISMATCH'), true);
});

test('publish audit ignores draft ranked patterns and blocks active language references to them', async () => {
  const result = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      rankedPatterns: fixture.rankedPatterns.map((pattern) => ({ ...pattern, status: 'draft' })),
    })),
  );

  assert.equal(hasCode(result, 'INVALID_RANKED_PATTERN_COUNT'), true);
  assert.equal(hasCode(result, 'MISSING_RANKED_PATTERN_PERMUTATIONS'), true);
  assert.equal(hasCode(result, 'RESULT_LANGUAGE_UNKNOWN_PATTERN'), true);
});

test('publish audit blocks duplicate pattern keys and duplicate rank tuples', async () => {
  const result = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      rankedPatterns: [fixture.rankedPatterns[0], { ...fixture.rankedPatterns[0], id: 'pattern-duplicate' }, ...fixture.rankedPatterns.slice(2)],
    })),
  );

  assert.equal(hasCode(result, 'DUPLICATE_PATTERN_KEY'), true);
  assert.equal(hasCode(result, 'DUPLICATE_RANK_TUPLE'), true);
});

test('publish audit uses the fixed platform score-shape policy when explicit rules are absent', async () => {
  const result = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      scoreShapeRules: [],
    })),
  );

  assert.equal(result.canPublish, true);
  assert.equal(hasCode(result, 'MISSING_SCORE_SHAPE_POLICY'), false);
  assert.equal(hasCode(result, 'FIXED_SCORE_SHAPE_POLICY_ACTIVE'), true);
});

test('publish audit blocks unsupported score shape and incomplete explicit score-shape rules', async () => {
  const unsupported = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      resultLanguageRows: [{ ...fixture.resultLanguageRows[1], score_shape: 'unsupported_shape' }, ...fixture.resultLanguageRows.slice(2)],
    })),
  );
  const incompleteRules = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      scoreShapeRules: fixture.scoreShapeRules.slice(0, 3),
    })),
  );

  assert.equal(hasCode(unsupported, 'UNSUPPORTED_SCORE_SHAPE_IN_RESULT_LANGUAGE'), true);
  assert.equal(hasCode(incompleteRules, 'INCOMPLETE_SCORE_SHAPE_RULES'), true);
});

test('publish audit blocks missing section definitions and admin support runtime sections', async () => {
  const result = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      sectionDefinitions: [
        ...fixture.sectionDefinitions.slice(1),
        {
          id: 'section-preview',
          section_key: '15_Report_Preview',
          section_order: 99,
          source_sheet_key: '15_Report_Preview',
          runtime_category: 'runtime_result_content',
          status: 'active',
        },
      ],
    })),
  );

  assert.equal(hasCode(result, 'INVALID_SECTION_DEFINITION_COUNT'), true);
  assert.equal(hasCode(result, 'ADMIN_SUPPORT_SECTION_MARKED_RUNTIME'), true);
});

test('publish audit blocks missing context row and incomplete required coverage', async () => {
  const result = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      resultLanguageRows: fixture.resultLanguageRows.filter(
        (row) =>
          row.section_key !== 'context' &&
          !(row.section_key === 'orientation' && row.pattern_key === 'signal_a_signal_b_signal_c_signal_d') &&
          !(row.section_key === 'signal_roles' && row.signal_key === 'signal_a' && row.rank_position === 1) &&
          !(row.section_key === 'strengths' && row.pattern_key === 'signal_a_signal_b_signal_c_signal_d'),
      ),
    })),
  );

  assert.equal(hasCode(result, 'INVALID_CONTEXT_ROW_COUNT'), true);
  assert.equal(hasCode(result, 'INCOMPLETE_PATTERN_SCORE_SHAPE_COVERAGE'), true);
  assert.equal(hasCode(result, 'INCOMPLETE_SIGNAL_RANK_COVERAGE'), true);
  assert.equal(hasCode(result, 'INCOMPLETE_PATTERN_COVERAGE'), true);
});

test('publish audit blocks missing preview case and invalid preview references', async () => {
  const missing = await auditFixture(mutateFixture((fixture) => ({ ...fixture, previewCases: [] })));
  const invalid = await auditFixture(
    mutateFixture((fixture) => ({
      ...fixture,
      previewCases: [
        {
          ...fixture.previewCases[0],
          expected_pattern_key: 'unknown_pattern',
          expected_score_shape: 'unsupported_shape',
          ranked_signal_keys: ['signal_a', 'signal_a', 'signal_b', 'signal_c'],
          normalized_scores: '',
        },
      ],
    })),
  );

  assert.equal(hasCode(missing, 'MISSING_PREVIEW_CASE'), true);
  assert.equal(hasCode(invalid, 'PREVIEW_UNKNOWN_PATTERN'), true);
  assert.equal(hasCode(invalid, 'PREVIEW_UNSUPPORTED_SCORE_SHAPE'), true);
  assert.equal(hasCode(invalid, 'PREVIEW_RANKED_SIGNAL_KEYS_INVALID'), true);
  assert.equal(hasCode(invalid, 'PREVIEW_NORMALIZED_SCORES_INVALID'), true);
});
