import test from 'node:test';
import assert from 'node:assert/strict';

import { getExpectedDriverClaimTuples } from '@/lib/assessment-language/single-domain-canonical';
import { createAssessmentDefinitionRepository } from '@/lib/engine/repository';
import { getSingleDomainDraftReadiness } from '@/lib/server/single-domain-draft-readiness';
import {
  loadSingleDomainRuntimeDefinition,
  SingleDomainRuntimeDefinitionError,
} from '@/lib/server/single-domain-runtime-definition';
import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DriverClaimsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
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
    DRIVER_CLAIMS?: DriverClaimsRow[];
    BALANCING_SECTIONS?: BalancingSectionsRow[];
    PAIR_SUMMARIES?: PairSummariesRow[];
    APPLICATION_STATEMENTS?: ApplicationStatementsRow[];
  };
};

function createSingleDomainDb(fixture: RuntimeFixture) {
  const language = {
    DOMAIN_FRAMING: fixture.language?.DOMAIN_FRAMING ?? [],
    HERO_PAIRS: fixture.language?.HERO_PAIRS ?? [],
    DRIVER_CLAIMS: fixture.language?.DRIVER_CLAIMS ?? [],
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

      if (sql.includes('FROM assessment_version_single_domain_driver_claims')) {
        return { rows: language.DRIVER_CLAIMS as T[] };
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

function buildCompleteDriverClaims(): DriverClaimsRow[] {
  return getExpectedDriverClaimTuples({
    domainKey: 'leadership-style',
    signalKeys: ['directive', 'supportive', 'analytical'],
    pairKeys: ['directive_supportive', 'directive_analytical', 'supportive_analytical'],
  }).map((tuple) => ({
    domain_key: tuple.domainKey,
    pair_key: tuple.pairKey,
    signal_key: tuple.signalKey,
    driver_role: tuple.driverRole,
    claim_type: tuple.driverRole === 'primary_driver'
      ? 'driver_primary'
      : tuple.driverRole === 'secondary_driver'
        ? 'driver_secondary'
        : tuple.driverRole === 'supporting_context'
          ? 'driver_supporting_context'
          : 'driver_range_limitation',
    claim_text: `${tuple.pairKey} ${tuple.driverRole}`,
    materiality: tuple.driverRole === 'range_limitation'
      ? 'material_underplay'
      : tuple.driverRole === 'supporting_context'
        ? 'supporting'
        : 'core',
    priority: tuple.driverRole === 'primary_driver'
      ? 1
      : tuple.driverRole === 'secondary_driver'
        ? 2
        : tuple.driverRole === 'supporting_context'
          ? 3
          : 4,
  }));
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
      DRIVER_CLAIMS: buildCompleteDriverClaims(),
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
          pair_section_title: 'directive_supportive section',
          pair_headline: 'directive_supportive headline',
          pair_opening_paragraph: 'directive_supportive opening',
          pair_strength_paragraph: 'directive_supportive strength',
          pair_tension_paragraph: 'directive_supportive tension',
          pair_close_paragraph: 'directive_supportive close',
        },
        {
          pair_key: 'directive_analytical',
          pair_section_title: 'directive_analytical section',
          pair_headline: 'directive_analytical headline',
          pair_opening_paragraph: 'directive_analytical opening',
          pair_strength_paragraph: 'directive_analytical strength',
          pair_tension_paragraph: 'directive_analytical tension',
          pair_close_paragraph: 'directive_analytical close',
        },
        {
          pair_key: 'supportive_analytical',
          pair_section_title: 'supportive_analytical section',
          pair_headline: 'supportive_analytical headline',
          pair_opening_paragraph: 'supportive_analytical opening',
          pair_strength_paragraph: 'supportive_analytical strength',
          pair_tension_paragraph: 'supportive_analytical tension',
          pair_close_paragraph: 'supportive_analytical close',
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
  assert.equal(runtime.languageBundle.DRIVER_CLAIMS.length, 15);
  assert.equal(runtime.languageBundle.SIGNAL_CHAPTERS.length, 0);
});

test('single-domain runtime readiness rejects reversed pair language keys', async () => {
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

  assert.equal(readiness.isReady, false);
  assert.ok(readiness.issues.some((issue) => issue.code === 'hero_pairs_key_mismatch'));
  assert.ok(readiness.issues.some((issue) => issue.code === 'balancing_sections_key_mismatch'));
  assert.ok(readiness.issues.some((issue) => issue.code === 'pair_summaries_key_mismatch'));
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
        BALANCING_SECTIONS: [],
        PAIR_SUMMARIES: [],
        APPLICATION_STATEMENTS: [],
      },
    })),
    'version-1',
  );

  assert.equal(readiness.isReady, false);
  assert.ok(readiness.issues.some((issue) => issue.code === 'domain_framing_count_mismatch'));
  assert.ok(readiness.issues.some((issue) => issue.code === 'application_statements_count_mismatch'));
  assert.equal(readiness.issues.some((issue) => issue.code === 'hero_pairs_count_mismatch'), false);
  assert.equal(readiness.issues.some((issue) => issue.code === 'balancing_sections_count_mismatch'), false);
  assert.equal(readiness.issues.some((issue) => issue.code === 'pair_summaries_count_mismatch'), false);
});

test('hero pair runtime readiness fails when visible text does not reference the active pair', async () => {
  const fixture = buildFixture();
  fixture.language.HERO_PAIRS = fixture.language.HERO_PAIRS.map((row) => (
    row.pair_key === 'directive_supportive'
      ? {
          ...row,
          hero_headline: 'Shared direction',
          hero_subheadline: 'Shared direction',
          hero_opening: 'Shared direction',
          hero_strength_paragraph: 'Shared direction',
          hero_tension_paragraph: 'Shared direction',
          hero_close_paragraph: 'Shared direction',
        }
      : row
  ));

  const readiness = await getSingleDomainDraftReadiness(createSingleDomainDb(fixture), 'version-1');

  assert.equal(readiness.isReady, false);
  assert.ok(readiness.issues.some((issue) => issue.code === 'hero_pairs_content_mismatch'));
});

test('hero pair runtime readiness accepts visible text that references the active pair key', async () => {
  const fixture = buildFixture();
  fixture.language.HERO_PAIRS = fixture.language.HERO_PAIRS.map((row) => (
    row.pair_key === 'directive_supportive'
      ? { ...row, hero_headline: 'directive_supportive' }
      : row
  ));

  const readiness = await getSingleDomainDraftReadiness(createSingleDomainDb(fixture), 'version-1');

  assert.equal(readiness.isReady, true);
  assert.equal(readiness.issues.some((issue) => issue.code === 'hero_pairs_content_mismatch'), false);
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
  assert.equal(readiness.expectations.expectedLanguageRowCounts.DRIVER_CLAIMS, 15);
  assert.ok(readiness.issues.some((issue) => issue.code === 'weight_signal_unresolved'));
  assert.equal(readiness.runtimeDefinition, null);
});

test('driver claims readiness accepts complete pair-role coverage', async () => {
  const readiness = await getSingleDomainDraftReadiness(createSingleDomainDb(buildFixture()), 'version-1');

  assert.equal(readiness.isReady, true);
  assert.equal(readiness.counts.languageRowCounts.DRIVER_CLAIMS, 15);
  assert.equal(readiness.expectations.expectedLanguageRowCounts.DRIVER_CLAIMS, 15);
  assert.equal(readiness.issues.some((issue) => issue.code === 'driver_claims_coverage_incomplete'), false);
});

test('driver claims readiness blocks when one exact runtime tuple is missing', async () => {
  const fixture = buildFixture();
  fixture.language.DRIVER_CLAIMS = fixture.language.DRIVER_CLAIMS.filter(
    (row) => !(row.pair_key === 'directive_supportive'
      && row.signal_key === 'analytical'
      && row.driver_role === 'supporting_context'),
  );

  const readiness = await getSingleDomainDraftReadiness(createSingleDomainDb(fixture), 'version-1');
  const issue = readiness.issues.find((entry) => entry.code === 'driver_claims_coverage_incomplete');

  assert.equal(readiness.isReady, false);
  assert.equal(issue?.severity, 'blocking');
  assert.ok(issue?.relatedKeys?.includes('leadership-style:directive_supportive:analytical:supporting_context:0'));
});

test('driver claims readiness warns for invalid pair and signal keys', async () => {
  const fixture = buildFixture();
  fixture.language.DRIVER_CLAIMS = [
    ...fixture.language.DRIVER_CLAIMS,
    {
      domain_key: 'leadership-style',
      pair_key: 'missing_pair',
      signal_key: 'missing_signal',
      driver_role: 'primary_driver',
      claim_type: 'driver_primary',
      claim_text: 'Invalid key claim',
      materiality: 'core',
      priority: 1,
    },
  ];

  const readiness = await getSingleDomainDraftReadiness(createSingleDomainDb(fixture), 'version-1');
  const keyIssues = readiness.issues.filter((entry) => entry.code === 'driver_claims_key_mismatch');

  assert.equal(readiness.isReady, false);
  assert.equal(keyIssues.length >= 2, true);
  assert.ok(keyIssues.some((issue) => issue.relatedKeys?.includes('missing_pair')));
  assert.ok(keyIssues.some((issue) => issue.relatedKeys?.includes('missing_signal')));
});

test('driver claims readiness warns for invalid role claim and materiality mapping', async () => {
  const fixture = buildFixture();
  fixture.language.DRIVER_CLAIMS = fixture.language.DRIVER_CLAIMS.map((row, index) => (
    index === 0
      ? ({
          ...row,
          claim_type: 'driver_secondary',
          materiality: 'supporting',
        } as DriverClaimsRow)
      : row
  ));

  const readiness = await getSingleDomainDraftReadiness(createSingleDomainDb(fixture), 'version-1');
  const issue = readiness.issues.find((entry) => entry.code === 'driver_claims_role_mapping_mismatch');

  assert.equal(readiness.isReady, false);
  assert.equal(issue?.severity, 'blocking');
  assert.ok(issue?.relatedKeys?.some((key) => key.includes('directive_supportive:directive:primary_driver')));
});

test('driver claims readiness blocks when rows do not match the exact runtime lookup tuple', async () => {
  const fixture = buildFixture({
    domains: [{
      domain_id: 'domain-1',
      domain_key: 'leadership-approach',
      domain_label: 'Leadership approach',
      domain_description: null,
      domain_order_index: 0,
    }],
    signals: [
      {
        signal_id: 'signal-1',
        signal_key: 'results',
        signal_label: 'Results',
        signal_description: null,
        signal_order_index: 0,
        domain_id: 'domain-1',
      },
      {
        signal_id: 'signal-2',
        signal_key: 'process',
        signal_label: 'Process',
        signal_description: null,
        signal_order_index: 1,
        domain_id: 'domain-1',
      },
      {
        signal_id: 'signal-3',
        signal_key: 'vision',
        signal_label: 'Vision',
        signal_description: null,
        signal_order_index: 2,
        domain_id: 'domain-1',
      },
      {
        signal_id: 'signal-4',
        signal_key: 'people',
        signal_label: 'People',
        signal_description: null,
        signal_order_index: 3,
        domain_id: 'domain-1',
      },
    ],
    language: {
      DOMAIN_FRAMING: [{
        domain_key: 'leadership-approach',
        section_title: 'Leadership approach',
        intro_paragraph: 'Intro',
        meaning_paragraph: 'Meaning',
        bridge_to_signals: 'Bridge',
        blueprint_context_line: 'Blueprint',
      }],
      HERO_PAIRS: [
        'results_process',
        'results_vision',
        'results_people',
        'process_vision',
        'process_people',
        'vision_people',
      ].map((pair_key) => ({
        pair_key,
        hero_headline: `Hero ${pair_key}`,
        hero_subheadline: 'Subtitle',
        hero_opening: 'Opening',
        hero_strength_paragraph: 'Strength',
        hero_tension_paragraph: 'Tension',
        hero_close_paragraph: 'Close',
      })),
      DRIVER_CLAIMS: [
        {
          domain_key: 'leadership-approach',
          pair_key: 'results_vision',
          signal_key: 'vision',
          driver_role: 'primary_driver',
          claim_type: 'driver_primary',
          claim_text: 'Vision primary',
          materiality: 'core',
          priority: 1,
        },
        {
          domain_key: 'leadership-approach',
          pair_key: 'results_vision',
          signal_key: 'results',
          driver_role: 'secondary_driver',
          claim_type: 'driver_secondary',
          claim_text: 'Results secondary',
          materiality: 'core',
          priority: 2,
        },
        {
          domain_key: 'leadership-approach',
          pair_key: 'results_vision',
          signal_key: 'people',
          driver_role: 'supporting_context',
          claim_type: 'driver_supporting_context',
          claim_text: 'People supporting',
          materiality: 'supporting',
          priority: 3,
        },
        {
          domain_key: 'leadership-approach',
          pair_key: 'results_vision',
          signal_key: 'process',
          driver_role: 'range_limitation',
          claim_type: 'driver_range_limitation',
          claim_text: 'Process range',
          materiality: 'material_underplay',
          priority: 4,
        },
      ],
      BALANCING_SECTIONS: [
        'results_process',
        'results_vision',
        'results_people',
        'process_vision',
        'process_people',
        'vision_people',
      ].map((pair_key) => ({
        pair_key,
        balancing_section_title: 'Balance',
        current_pattern_paragraph: 'Pattern',
        practical_meaning_paragraph: 'Meaning',
        system_risk_paragraph: 'Risk',
        rebalance_intro: 'Intro',
        rebalance_action_1: 'A1',
        rebalance_action_2: 'A2',
        rebalance_action_3: 'A3',
      })),
      PAIR_SUMMARIES: [
        'results_process',
        'results_vision',
        'results_people',
        'process_vision',
        'process_people',
        'vision_people',
      ].map((pair_key) => ({
        pair_key,
        pair_section_title: `${pair_key} section`,
        pair_headline: `${pair_key} headline`,
        pair_opening_paragraph: `${pair_key} opening`,
        pair_strength_paragraph: `${pair_key} strength`,
        pair_tension_paragraph: `${pair_key} tension`,
        pair_close_paragraph: `${pair_key} close`,
      })),
      APPLICATION_STATEMENTS: ['results', 'process', 'vision', 'people'].map((signal_key) => ({
        signal_key,
        strength_statement_1: 'S1',
        strength_statement_2: 'S2',
        watchout_statement_1: 'W1',
        watchout_statement_2: 'W2',
        development_statement_1: 'D1',
        development_statement_2: 'D2',
      })),
    },
  });

  const readiness = await getSingleDomainDraftReadiness(createSingleDomainDb(fixture), 'version-1');
  const issue = readiness.issues.find((entry) => entry.code === 'driver_claims_coverage_incomplete');

  assert.equal(readiness.isReady, false);
  assert.equal(issue?.severity, 'blocking');
  assert.ok(issue?.relatedKeys?.some((key) => key.includes('leadership-approach:results_vision:results:primary_driver:0')));
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
