import test from 'node:test';
import assert from 'node:assert/strict';

import { createAssessmentDefinitionRepository } from '@/lib/engine/repository';
import { getSingleDomainDraftReadiness } from '@/lib/server/single-domain-draft-readiness';
import {
  loadSingleDomainRuntimeDefinition,
  SingleDomainRuntimeDefinitionError,
} from '@/lib/server/single-domain-runtime-definition';
import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SignalChaptersRow,
} from '@/lib/types/single-domain-language';

type RuntimeFixture = {
  context: {
    assessment_id: string;
    assessment_key: string;
    assessment_title: string;
    assessment_description: string | null;
    assessment_version_id: string;
    assessment_version_tag: string;
    assessment_mode: string | null;
  } | null;
  domains: Array<{
    domain_id: string;
    domain_key: string;
    domain_label: string;
    domain_description: string | null;
    domain_order_index: number;
  }>;
  signals: Array<{
    signal_id: string;
    signal_key: string;
    signal_label: string;
    signal_description: string | null;
    signal_order_index: number;
    domain_id: string;
  }>;
  questions: Array<{
    question_id: string;
    question_key: string;
    prompt: string;
    question_order_index: number;
    domain_id: string;
    domain_key: string;
  }>;
  options: Array<{
    option_id: string;
    option_key: string;
    option_label: string | null;
    option_text: string;
    option_order_index: number;
    question_id: string | null;
  }>;
  weights: Array<{
    option_signal_weight_id: string;
    option_id: string;
    signal_id: string | null;
    signal_key: string | null;
    weight: string;
    source_weight_key: string | null;
  }>;
  language?: {
    DOMAIN_FRAMING?: DomainFramingRow[];
    HERO_PAIRS?: HeroPairsRow[];
    SIGNAL_CHAPTERS?: SignalChaptersRow[];
    BALANCING_SECTIONS?: BalancingSectionsRow[];
    PAIR_SUMMARIES?: PairSummariesRow[];
    APPLICATION_STATEMENTS?: ApplicationStatementsRow[];
  };
};

function createSingleDomainDb(fixture: RuntimeFixture) {
  const language = {
    DOMAIN_FRAMING: fixture.language?.DOMAIN_FRAMING ?? [],
    HERO_PAIRS: fixture.language?.HERO_PAIRS ?? [],
    SIGNAL_CHAPTERS: fixture.language?.SIGNAL_CHAPTERS ?? [],
    BALANCING_SECTIONS: fixture.language?.BALANCING_SECTIONS ?? [],
    PAIR_SUMMARIES: fixture.language?.PAIR_SUMMARIES ?? [],
    APPLICATION_STATEMENTS: fixture.language?.APPLICATION_STATEMENTS ?? [],
  };

  return {
    async query<T>(text: string) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql.includes('FROM assessment_versions av INNER JOIN assessments a ON a.id = av.assessment_id WHERE av.id = $1')) {
        return { rows: fixture.context ? ([fixture.context] as unknown as T[]) : ([] as T[]) };
      }

      if (sql.includes('FROM domains WHERE assessment_version_id = $1')) {
        return { rows: fixture.domains as T[] };
      }

      if (sql.includes('FROM signals s WHERE s.assessment_version_id = $1')) {
        return { rows: fixture.signals as T[] };
      }

      if (sql.includes('FROM questions q LEFT JOIN domains d ON d.id = q.domain_id')) {
        return { rows: fixture.questions as T[] };
      }

      if (sql.includes('FROM options o WHERE o.assessment_version_id = $1')) {
        return { rows: fixture.options as T[] };
      }

      if (sql.includes('FROM option_signal_weights osw INNER JOIN options o ON o.id = osw.option_id LEFT JOIN signals s ON s.id = osw.signal_id')) {
        return { rows: fixture.weights as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_framing')) {
        return { rows: language.DOMAIN_FRAMING as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_hero_pairs')) {
        return { rows: language.HERO_PAIRS as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_signal_chapters')) {
        return { rows: language.SIGNAL_CHAPTERS as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_balancing_sections')) {
        return { rows: language.BALANCING_SECTIONS as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_pair_summaries')) {
        return { rows: language.PAIR_SUMMARIES as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_application_statements')) {
        return { rows: language.APPLICATION_STATEMENTS as T[] };
      }

      throw new Error(`Unhandled SQL in single-domain runtime test: ${sql}`);
    },
  };
}

function buildFixture(overrides?: Partial<RuntimeFixture>): RuntimeFixture {
  return {
    context: {
      assessment_id: 'assessment-1',
      assessment_key: 'role-focus',
      assessment_title: 'Role Focus',
      assessment_description: 'Single-domain draft',
      assessment_version_id: 'version-1',
      assessment_version_tag: '0.1.0',
      assessment_mode: 'single_domain',
    },
    domains: [{
      domain_id: 'domain-1',
      domain_key: 'leadership-style',
      domain_label: 'Leadership style',
      domain_description: null,
      domain_order_index: 0,
    }],
    signals: [
      {
        signal_id: 'signal-1',
        signal_key: 'directive',
        signal_label: 'Directive',
        signal_description: null,
        signal_order_index: 0,
        domain_id: 'domain-1',
      },
      {
        signal_id: 'signal-2',
        signal_key: 'supportive',
        signal_label: 'Supportive',
        signal_description: null,
        signal_order_index: 1,
        domain_id: 'domain-1',
      },
      {
        signal_id: 'signal-3',
        signal_key: 'analytical',
        signal_label: 'Analytical',
        signal_description: null,
        signal_order_index: 2,
        domain_id: 'domain-1',
      },
    ],
    questions: [{
      question_id: 'question-1',
      question_key: 'q01',
      prompt: 'How do you lead?',
      question_order_index: 0,
      domain_id: 'domain-1',
      domain_key: 'leadership-style',
    }],
    options: [
      {
        option_id: 'option-1',
        option_key: 'q01_a',
        option_label: 'A',
        option_text: 'Lead from the front',
        option_order_index: 0,
        question_id: 'question-1',
      },
      {
        option_id: 'option-2',
        option_key: 'q01_b',
        option_label: 'B',
        option_text: 'Coach and support',
        option_order_index: 1,
        question_id: 'question-1',
      },
    ],
    weights: [
      {
        option_signal_weight_id: 'weight-1',
        option_id: 'option-1',
        signal_id: 'signal-1',
        signal_key: 'directive',
        weight: '1.0',
        source_weight_key: '1|A|directive',
      },
      {
        option_signal_weight_id: 'weight-2',
        option_id: 'option-2',
        signal_id: 'signal-2',
        signal_key: 'supportive',
        weight: '1.0',
        source_weight_key: '1|B|supportive',
      },
    ],
    language: {
      DOMAIN_FRAMING: [{
        domain_key: 'leadership-style',
        section_title: 'Leadership style',
        intro_paragraph: 'Intro',
        meaning_paragraph: 'Meaning',
        bridge_to_signals: 'Bridge',
        blueprint_context_line: 'Blueprint',
      }],
      HERO_PAIRS: [
        {
          pair_key: 'directive_supportive',
          hero_headline: 'Directive and Supportive',
          hero_subheadline: 'Subtitle',
          hero_opening: 'Opening',
          hero_strength_paragraph: 'Strength',
          hero_tension_paragraph: 'Tension',
          hero_close_paragraph: 'Close',
        },
        {
          pair_key: 'directive_analytical',
          hero_headline: 'Directive and Analytical',
          hero_subheadline: 'Subtitle',
          hero_opening: 'Opening',
          hero_strength_paragraph: 'Strength',
          hero_tension_paragraph: 'Tension',
          hero_close_paragraph: 'Close',
        },
        {
          pair_key: 'supportive_analytical',
          hero_headline: 'Supportive and Analytical',
          hero_subheadline: 'Subtitle',
          hero_opening: 'Opening',
          hero_strength_paragraph: 'Strength',
          hero_tension_paragraph: 'Tension',
          hero_close_paragraph: 'Close',
        },
      ],
      SIGNAL_CHAPTERS: [
        {
          signal_key: 'directive',
          position_primary_label: 'Primary',
          position_secondary_label: 'Secondary',
          position_supporting_label: 'Supporting',
          position_underplayed_label: 'Underplayed',
          chapter_intro_primary: 'A',
          chapter_intro_secondary: 'B',
          chapter_intro_supporting: 'C',
          chapter_intro_underplayed: 'D',
          chapter_how_it_shows_up: 'E',
          chapter_value_outcome: 'F',
          chapter_value_team_effect: 'G',
          chapter_risk_behaviour: 'H',
          chapter_risk_impact: 'I',
          chapter_development: 'J',
        },
        {
          signal_key: 'supportive',
          position_primary_label: 'Primary',
          position_secondary_label: 'Secondary',
          position_supporting_label: 'Supporting',
          position_underplayed_label: 'Underplayed',
          chapter_intro_primary: 'A',
          chapter_intro_secondary: 'B',
          chapter_intro_supporting: 'C',
          chapter_intro_underplayed: 'D',
          chapter_how_it_shows_up: 'E',
          chapter_value_outcome: 'F',
          chapter_value_team_effect: 'G',
          chapter_risk_behaviour: 'H',
          chapter_risk_impact: 'I',
          chapter_development: 'J',
        },
        {
          signal_key: 'analytical',
          position_primary_label: 'Primary',
          position_secondary_label: 'Secondary',
          position_supporting_label: 'Supporting',
          position_underplayed_label: 'Underplayed',
          chapter_intro_primary: 'A',
          chapter_intro_secondary: 'B',
          chapter_intro_supporting: 'C',
          chapter_intro_underplayed: 'D',
          chapter_how_it_shows_up: 'E',
          chapter_value_outcome: 'F',
          chapter_value_team_effect: 'G',
          chapter_risk_behaviour: 'H',
          chapter_risk_impact: 'I',
          chapter_development: 'J',
        },
      ],
      BALANCING_SECTIONS: [
        {
          pair_key: 'directive_supportive',
          balancing_section_title: 'Balance',
          current_pattern_paragraph: 'Pattern',
          practical_meaning_paragraph: 'Meaning',
          system_risk_paragraph: 'Risk',
          rebalance_intro: 'Intro',
          rebalance_action_1: 'A1',
          rebalance_action_2: 'A2',
          rebalance_action_3: 'A3',
        },
        {
          pair_key: 'directive_analytical',
          balancing_section_title: 'Balance',
          current_pattern_paragraph: 'Pattern',
          practical_meaning_paragraph: 'Meaning',
          system_risk_paragraph: 'Risk',
          rebalance_intro: 'Intro',
          rebalance_action_1: 'A1',
          rebalance_action_2: 'A2',
          rebalance_action_3: 'A3',
        },
        {
          pair_key: 'supportive_analytical',
          balancing_section_title: 'Balance',
          current_pattern_paragraph: 'Pattern',
          practical_meaning_paragraph: 'Meaning',
          system_risk_paragraph: 'Risk',
          rebalance_intro: 'Intro',
          rebalance_action_1: 'A1',
          rebalance_action_2: 'A2',
          rebalance_action_3: 'A3',
        },
      ],
      PAIR_SUMMARIES: [
        {
          pair_key: 'directive_supportive',
          pair_section_title: 'Section',
          pair_headline: 'Headline',
          pair_opening_paragraph: 'Opening',
          pair_strength_paragraph: 'Strength',
          pair_tension_paragraph: 'Tension',
          pair_close_paragraph: 'Close',
        },
        {
          pair_key: 'directive_analytical',
          pair_section_title: 'Section',
          pair_headline: 'Headline',
          pair_opening_paragraph: 'Opening',
          pair_strength_paragraph: 'Strength',
          pair_tension_paragraph: 'Tension',
          pair_close_paragraph: 'Close',
        },
        {
          pair_key: 'supportive_analytical',
          pair_section_title: 'Section',
          pair_headline: 'Headline',
          pair_opening_paragraph: 'Opening',
          pair_strength_paragraph: 'Strength',
          pair_tension_paragraph: 'Tension',
          pair_close_paragraph: 'Close',
        },
      ],
      APPLICATION_STATEMENTS: [
        {
          signal_key: 'directive',
          strength_statement_1: 'S1',
          strength_statement_2: 'S2',
          watchout_statement_1: 'W1',
          watchout_statement_2: 'W2',
          development_statement_1: 'D1',
          development_statement_2: 'D2',
        },
        {
          signal_key: 'supportive',
          strength_statement_1: 'S1',
          strength_statement_2: 'S2',
          watchout_statement_1: 'W1',
          watchout_statement_2: 'W2',
          development_statement_1: 'D1',
          development_statement_2: 'D2',
        },
        {
          signal_key: 'analytical',
          strength_statement_1: 'S1',
          strength_statement_2: 'S2',
          watchout_statement_1: 'W1',
          watchout_statement_2: 'W2',
          development_statement_1: 'D1',
          development_statement_2: 'D2',
        },
      ],
    },
    ...overrides,
  };
}

test('single-domain runtime loader assembles a deterministic runtime object from authored DB state', async () => {
  const runtime = await loadSingleDomainRuntimeDefinition(createSingleDomainDb(buildFixture()), 'version-1');

  assert.equal(runtime.metadata.mode, 'single_domain');
  assert.equal(runtime.domain.key, 'leadership-style');
  assert.equal(runtime.signals.length, 3);
  assert.equal(runtime.derivedPairs.length, 3);
  assert.deepEqual(runtime.derivedPairs.map((pair) => pair.pairKey), [
    'directive_supportive',
    'directive_analytical',
    'supportive_analytical',
  ]);
  assert.equal(runtime.questions.length, 1);
  assert.equal(runtime.questions[0]?.options.length, 2);
  assert.equal(runtime.optionSignalWeights.length, 2);
  assert.equal(runtime.languageBundle.SIGNAL_CHAPTERS.length, 3);
});

test('single-domain runtime readiness accepts reversed pair language keys as aliases', async () => {
  const fixture = buildFixture();
  fixture.language.HERO_PAIRS = fixture.language.HERO_PAIRS.map((row) => (
    row.pair_key === 'directive_supportive'
      ? { ...row, pair_key: 'supportive_directive' }
      : row
  ));
  fixture.language.BALANCING_SECTIONS = fixture.language.BALANCING_SECTIONS.map((row) => (
    row.pair_key === 'directive_supportive'
      ? { ...row, pair_key: 'supportive_directive' }
      : row
  ));
  fixture.language.PAIR_SUMMARIES = fixture.language.PAIR_SUMMARIES.map((row) => (
    row.pair_key === 'directive_supportive'
      ? { ...row, pair_key: 'supportive_directive' }
      : row
  ));

  const readiness = await getSingleDomainDraftReadiness(createSingleDomainDb(fixture), 'version-1');

  assert.equal(readiness.isReady, true);
});

test('unknown or undefined mode values never resolve through the single-domain runtime path', async () => {
  await assert.rejects(
    () => loadSingleDomainRuntimeDefinition(
      createSingleDomainDb(buildFixture({
        context: {
          ...buildFixture().context!,
          assessment_mode: 'experimental_mode',
        },
      })),
      'version-1',
    ),
    (error: unknown) =>
      error instanceof SingleDomainRuntimeDefinitionError
      && error.code === 'single_domain_mode_required',
  );
});

test('single-domain runtime readiness enforces exactly one domain', async () => {
  const readiness = await getSingleDomainDraftReadiness(
    createSingleDomainDb(buildFixture({
      domains: [
        buildFixture().domains[0]!,
        {
          domain_id: 'domain-2',
          domain_key: 'extra-domain',
          domain_label: 'Extra domain',
          domain_description: null,
          domain_order_index: 1,
        },
      ],
    })),
    'version-1',
  );

  assert.equal(readiness.isReady, false);
  assert.ok(readiness.issues.some((issue) => issue.code === 'multiple_domains'));
});

test('derived pair count comes from the current authored signal count instead of a fixed template', async () => {
  const readiness = await getSingleDomainDraftReadiness(createSingleDomainDb(buildFixture()), 'version-1');

  assert.equal(readiness.counts.signalCount, 3);
  assert.equal(readiness.counts.derivedPairCount, 3);
  assert.equal(readiness.expectations.expectedDerivedPairCount, 3);
});

test('missing options or weights fail readiness explicitly', async () => {
  const readiness = await getSingleDomainDraftReadiness(
    createSingleDomainDb(buildFixture({
      options: [{
        option_id: 'option-1',
        option_key: 'q01_a',
        option_label: 'A',
        option_text: 'Lead from the front',
        option_order_index: 0,
        question_id: 'question-1',
      }],
      weights: [],
    })),
    'version-1',
  );

  assert.equal(readiness.isReady, false);
  assert.ok(readiness.issues.some((issue) => issue.code === 'missing_weights'));
  assert.ok(readiness.issues.some((issue) => issue.code === 'option_without_weights'));
});

test('missing language datasets fail readiness explicitly where required', async () => {
  const readiness = await getSingleDomainDraftReadiness(
    createSingleDomainDb(buildFixture({
      language: {
        DOMAIN_FRAMING: [],
        HERO_PAIRS: [],
        SIGNAL_CHAPTERS: [],
        BALANCING_SECTIONS: [],
        PAIR_SUMMARIES: [],
        APPLICATION_STATEMENTS: [],
      },
    })),
    'version-1',
  );

  assert.equal(readiness.isReady, false);
  assert.ok(readiness.issues.some((issue) => issue.code === 'domain_framing_count_mismatch'));
  assert.ok(readiness.issues.some((issue) => issue.code === 'signal_chapters_count_mismatch'));
  assert.ok(readiness.issues.some((issue) => issue.code === 'application_statements_count_mismatch'));
  assert.equal(readiness.issues.some((issue) => issue.code === 'hero_pairs_count_mismatch'), false);
  assert.equal(readiness.issues.some((issue) => issue.code === 'balancing_sections_count_mismatch'), false);
  assert.equal(readiness.issues.some((issue) => issue.code === 'pair_summaries_count_mismatch'), false);
});

test('readiness bridge exposes explicit issues, counts, and expectations', async () => {
  const readiness = await getSingleDomainDraftReadiness(
    createSingleDomainDb(buildFixture({
      weights: [{
        option_signal_weight_id: 'weight-1',
        option_id: 'option-1',
        signal_id: null,
        signal_key: null,
        weight: '1.0',
        source_weight_key: '1|A|missing',
      }],
    })),
    'version-1',
  );

  assert.equal(readiness.counts.optionCount, 2);
  assert.equal(readiness.expectations.expectedLanguageRowCounts.HERO_PAIRS, 3);
  assert.ok(readiness.issues.some((issue) => issue.code === 'weight_signal_unresolved'));
  assert.equal(readiness.runtimeDefinition, null);
});

test('existing multi-domain runtime loading remains available through the engine repository path', async () => {
  const db = {
    async query<T>(text: string, params?: unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql.includes('SELECT id, assessment_key, mode, title, description, created_at, updated_at FROM assessments WHERE assessment_key = $1')) {
        return {
          rows: ([{
            id: 'assessment-1',
            assessment_key: 'wplp80',
            mode: 'multi_domain',
            title: 'WPLP-80',
            description: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('FROM assessment_versions WHERE assessment_id = $1 AND lifecycle_status = \'PUBLISHED\'')) {
        return {
          rows: ([{
            id: 'version-1',
            assessment_id: 'assessment-1',
            mode: 'multi_domain',
            version: '1.0.0',
            lifecycle_status: 'PUBLISHED',
            published_at: '2026-01-01T00:00:00.000Z',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('SELECT row_to_json(a.*) AS a, row_to_json(av.*) AS v FROM assessment_versions av INNER JOIN assessments a ON a.id = av.assessment_id WHERE av.id = $1')) {
        return {
          rows: ([{
            a: {
              id: 'assessment-1',
              assessment_key: 'wplp80',
              mode: 'multi_domain',
              title: 'WPLP-80',
              description: null,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
            v: {
              id: 'version-1',
              assessment_id: 'assessment-1',
              mode: 'multi_domain',
              version: '1.0.0',
              lifecycle_status: 'PUBLISHED',
              published_at: '2026-01-01T00:00:00.000Z',
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('FROM assessment_version_intro WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_pair_trait_weights WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_hero_pattern_rules WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_hero_pattern_language WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM domains WHERE assessment_version_id = $1 ORDER BY order_index ASC, id ASC')) {
        return {
          rows: ([{
            id: 'domain-1',
            assessment_version_id: 'version-1',
            domain_key: 'section',
            label: 'Section',
            description: null,
            domain_type: 'QUESTION_SECTION',
            order_index: 0,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('FROM signals WHERE assessment_version_id = $1 ORDER BY order_index ASC, id ASC')) {
        return {
          rows: ([{
            id: 'signal-1',
            assessment_version_id: 'version-1',
            domain_id: 'domain-1',
            signal_key: 'core',
            label: 'Core',
            description: null,
            order_index: 0,
            is_overlay: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('FROM questions WHERE assessment_version_id = $1 ORDER BY order_index ASC, id ASC')) {
        return {
          rows: ([{
            id: 'question-1',
            assessment_version_id: 'version-1',
            domain_id: 'domain-1',
            question_key: 'q01',
            prompt: 'Question',
            order_index: 0,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('FROM options o INNER JOIN questions q ON q.id = o.question_id WHERE q.assessment_version_id = $1')) {
        return {
          rows: ([{
            id: 'option-1',
            assessment_version_id: 'version-1',
            question_id: 'question-1',
            option_key: 'q01_a',
            option_label: 'A',
            option_text: 'Option',
            order_index: 0,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('FROM option_signal_weights osw INNER JOIN options o ON o.id = osw.option_id INNER JOIN questions q ON q.id = o.question_id WHERE q.assessment_version_id = $1')) {
        return {
          rows: ([{
            id: 'weight-1',
            option_id: 'option-1',
            signal_id: 'signal-1',
            weight: '1.0',
            source_weight_key: '1|A',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }] as unknown[]) as T[],
        };
      }

      throw new Error(`Unhandled SQL in multi-domain repository regression test: ${sql}`);
    },
  };

  const repository = createAssessmentDefinitionRepository({ db });
  const definition = await repository.getPublishedAssessmentDefinitionByKey('wplp80');

  assert.ok(definition);
  assert.equal(definition?.assessment.mode, 'multi_domain');
  await assert.rejects(
    () => loadSingleDomainRuntimeDefinition(createSingleDomainDb(buildFixture({
      context: {
        assessment_id: 'assessment-1',
        assessment_key: 'wplp80',
        assessment_title: 'WPLP-80',
        assessment_description: null,
        assessment_version_id: 'version-1',
        assessment_version_tag: '1.0.0',
        assessment_mode: 'multi_domain',
      },
    })), 'version-1'),
    /single_domain/i,
  );
});
