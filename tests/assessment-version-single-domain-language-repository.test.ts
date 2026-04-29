import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSingleDomainApplicationStatementRows,
  getSingleDomainBalancingSectionRows,
  getSingleDomainDriverClaimRows,
  getSingleDomainFramingRows,
  getSingleDomainHeroPairRows,
  getSingleDomainLanguageBundle,
  getSingleDomainPairSummaryRows,
  getSingleDomainSignalChapterRows,
  replaceSingleDomainApplicationStatementRows,
  replaceSingleDomainBalancingSectionRows,
  replaceSingleDomainDriverClaimRows,
  replaceSingleDomainFramingRows,
  replaceSingleDomainHeroPairRows,
  replaceSingleDomainPairSummaryRows,
  replaceSingleDomainSignalChapterRows,
  saveSingleDomainLanguageDataset,
  SingleDomainLanguageModeError,
} from '@/lib/server/assessment-version-single-domain-language';
import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DriverClaimsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SignalChaptersRow,
} from '@/lib/types/single-domain-language';

type SingleDomainTableState = {
  framing: DomainFramingRow[];
  heroPairs: HeroPairsRow[];
  driverClaims: DriverClaimsRow[];
  signalChapters: SignalChaptersRow[];
  balancingSections: BalancingSectionsRow[];
  pairSummaries: PairSummariesRow[];
  applicationStatements: ApplicationStatementsRow[];
};

function createFakeSingleDomainLanguageDb(seed?: Partial<SingleDomainTableState>, config?: {
  modeByVersion?: Record<string, string | null>;
  failInsertTable?: keyof SingleDomainTableState;
  missingTables?: Partial<Record<keyof SingleDomainTableState, boolean>>;
  missingModeColumns?: boolean;
}) {
  const state: SingleDomainTableState = {
    framing: [...(seed?.framing ?? [])],
    heroPairs: [...(seed?.heroPairs ?? [])],
    driverClaims: [...(seed?.driverClaims ?? [])],
    signalChapters: [...(seed?.signalChapters ?? [])],
    balancingSections: [...(seed?.balancingSections ?? [])],
    pairSummaries: [...(seed?.pairSummaries ?? [])],
    applicationStatements: [...(seed?.applicationStatements ?? [])],
  };

  let snapshot: SingleDomainTableState | null = null;

  const cloneState = (): SingleDomainTableState => ({
    framing: state.framing.map((row) => ({ ...row })),
    heroPairs: state.heroPairs.map((row) => ({ ...row })),
    driverClaims: state.driverClaims.map((row) => ({ ...row })),
    signalChapters: state.signalChapters.map((row) => ({ ...row })),
    balancingSections: state.balancingSections.map((row) => ({ ...row })),
    pairSummaries: state.pairSummaries.map((row) => ({ ...row })),
    applicationStatements: state.applicationStatements.map((row) => ({ ...row })),
  });

  function maybeThrowMissingTable(tableName: string, stateKey: keyof SingleDomainTableState) {
    if (config?.missingTables?.[stateKey]) {
      throw new Error(`relation "${tableName}" does not exist`);
    }
  }

  function sortByKey<TRow>(rows: readonly TRow[], getKey: (row: TRow) => string): TRow[] {
    return [...rows].sort((left, right) => getKey(left).localeCompare(getKey(right)));
  }

  function getRowKey(row: DomainFramingRow | HeroPairsRow | SignalChaptersRow | BalancingSectionsRow | PairSummariesRow | ApplicationStatementsRow): string {
    if ('pattern_key' in row && row.pattern_key) {
      return [
        row.domain_key,
        row.pattern_key,
        row.focus_area,
        row.guidance_type,
        row.driver_role,
      ].join('|');
    }

    if ('domain_key' in row) {
      return row.domain_key;
    }

    if ('signal_key' in row) {
      return row.signal_key;
    }

    return row.pair_key;
  }

  function pushUnique<TKey extends keyof SingleDomainTableState>(
    table: TKey,
    row: SingleDomainTableState[TKey][number],
  ) {
    if (state[table].some((existingRow) => getRowKey(existingRow) === getRowKey(row))) {
      throw new Error(`duplicate key value violates unique constraint for ${getRowKey(row)}`);
    }

    state[table].push(row);
  }

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql === 'BEGIN') {
        snapshot = cloneState();
        return { rows: [] as T[] };
      }

      if (sql === 'COMMIT') {
        snapshot = null;
        return { rows: [] as T[] };
      }

      if (sql === 'ROLLBACK') {
        if (snapshot) {
          state.framing = snapshot.framing;
          state.heroPairs = snapshot.heroPairs;
          state.driverClaims = snapshot.driverClaims;
          state.signalChapters = snapshot.signalChapters;
          state.balancingSections = snapshot.balancingSections;
          state.pairSummaries = snapshot.pairSummaries;
          state.applicationStatements = snapshot.applicationStatements;
        }
        snapshot = null;
        return { rows: [] as T[] };
      }

      if (sql.includes('COALESCE(av.mode, a.mode) AS assessment_mode')) {
        if (config?.missingModeColumns) {
          throw new Error('column av.mode does not exist');
        }

        const assessmentVersionId = String(params?.[0] ?? '');
        return {
          rows: [{ assessment_mode: config?.modeByVersion?.[assessmentVersionId] ?? null }] as T[],
        };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_framing')) {
        state.framing = [];
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_hero_pairs')) {
        state.heroPairs = [];
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_driver_claims')) {
        state.driverClaims = [];
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_signal_chapters')) {
        state.signalChapters = [];
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_balancing_sections')) {
        state.balancingSections = [];
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_pair_summaries')) {
        state.pairSummaries = [];
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_application_statements')) {
        state.applicationStatements = [];
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_framing')) {
        maybeThrowMissingTable('assessment_version_single_domain_framing', 'framing');
        return { rows: sortByKey(state.framing, (row) => row.domain_key) as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_hero_pairs')) {
        maybeThrowMissingTable('assessment_version_single_domain_hero_pairs', 'heroPairs');
        return { rows: sortByKey(state.heroPairs, (row) => row.pair_key) as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_driver_claims')) {
        maybeThrowMissingTable('assessment_version_single_domain_driver_claims', 'driverClaims');
        return {
          rows: [...state.driverClaims].sort((left, right) => (
            left.domain_key.localeCompare(right.domain_key)
            || left.pair_key.localeCompare(right.pair_key)
            || left.driver_role.localeCompare(right.driver_role)
            || left.priority - right.priority
            || left.signal_key.localeCompare(right.signal_key)
          )) as T[],
        };
      }

      if (sql.includes('FROM assessment_version_single_domain_signal_chapters')) {
        maybeThrowMissingTable('assessment_version_single_domain_signal_chapters', 'signalChapters');
        return { rows: sortByKey(state.signalChapters, (row) => row.signal_key) as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_balancing_sections')) {
        maybeThrowMissingTable('assessment_version_single_domain_balancing_sections', 'balancingSections');
        return { rows: sortByKey(state.balancingSections, (row) => row.pair_key) as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_pair_summaries')) {
        maybeThrowMissingTable('assessment_version_single_domain_pair_summaries', 'pairSummaries');
        return { rows: sortByKey(state.pairSummaries, (row) => row.pair_key) as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_application_statements')) {
        maybeThrowMissingTable('assessment_version_single_domain_application_statements', 'applicationStatements');
        return {
          rows: [...state.applicationStatements].sort((left, right) => (
            String(left.domain_key ?? '').localeCompare(String(right.domain_key ?? ''))
            || String(left.pattern_key ?? '').localeCompare(String(right.pattern_key ?? ''))
            || String(left.focus_area ?? '').localeCompare(String(right.focus_area ?? ''))
            || (Number(left.priority ?? 0) - Number(right.priority ?? 0))
            || String(left.driver_role ?? '').localeCompare(String(right.driver_role ?? ''))
            || left.signal_key.localeCompare(right.signal_key)
          )) as T[],
        };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_framing')) {
        if (config?.failInsertTable === 'framing') {
          throw new Error('FRAMING_INSERT_FAILED');
        }

        const [, domain_key, section_title, intro_paragraph, meaning_paragraph, bridge_to_signals, blueprint_context_line] =
          params as [string, string, string, string, string, string, string];
        pushUnique('framing', {
          domain_key,
          section_title,
          intro_paragraph,
          meaning_paragraph,
          bridge_to_signals,
          blueprint_context_line,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_hero_pairs')) {
        if (config?.failInsertTable === 'heroPairs') {
          throw new Error('HERO_PAIRS_INSERT_FAILED');
        }

        const [, pair_key, hero_headline, hero_subheadline, hero_opening, hero_strength_paragraph, hero_tension_paragraph, hero_close_paragraph] =
          params as [string, string, string, string, string, string, string, string];
        pushUnique('heroPairs', {
          pair_key,
          hero_headline,
          hero_subheadline,
          hero_opening,
          hero_strength_paragraph,
          hero_tension_paragraph,
          hero_close_paragraph,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_driver_claims')) {
        if (config?.failInsertTable === 'driverClaims') {
          throw new Error('DRIVER_CLAIMS_INSERT_FAILED');
        }

        const [
          ,
          domain_key,
          pair_key,
          signal_key,
          driver_role,
          claim_type,
          claim_text,
          materiality,
          priority,
        ] = params as [string, string, string, string, DriverClaimsRow['driver_role'], DriverClaimsRow['claim_type'], string, DriverClaimsRow['materiality'], number];

        if (state.driverClaims.some((existingRow) => (
          existingRow.domain_key === domain_key
          && existingRow.pair_key === pair_key
          && existingRow.signal_key === signal_key
          && existingRow.driver_role === driver_role
          && existingRow.priority === priority
        ))) {
          throw new Error(`duplicate key value violates unique constraint for ${domain_key}:${pair_key}:${signal_key}:${driver_role}:${priority}`);
        }

        state.driverClaims.push({
          domain_key,
          pair_key,
          signal_key,
          driver_role,
          claim_type,
          claim_text,
          materiality,
          priority,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_signal_chapters')) {
        if (config?.failInsertTable === 'signalChapters') {
          throw new Error('SIGNAL_CHAPTERS_INSERT_FAILED');
        }

        const [
          ,
          signal_key,
          position_primary_label,
          position_secondary_label,
          position_supporting_label,
          position_underplayed_label,
          chapter_intro_primary,
          chapter_intro_secondary,
          chapter_intro_supporting,
          chapter_intro_underplayed,
          chapter_how_it_shows_up,
          chapter_value_outcome,
          chapter_value_team_effect,
          chapter_risk_behaviour,
          chapter_risk_impact,
          chapter_development,
        ] = params as [string, ...string[]];
        pushUnique('signalChapters', {
          signal_key,
          position_primary_label,
          position_secondary_label,
          position_supporting_label,
          position_underplayed_label,
          chapter_intro_primary,
          chapter_intro_secondary,
          chapter_intro_supporting,
          chapter_intro_underplayed,
          chapter_how_it_shows_up,
          chapter_value_outcome,
          chapter_value_team_effect,
          chapter_risk_behaviour,
          chapter_risk_impact,
          chapter_development,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_balancing_sections')) {
        if (config?.failInsertTable === 'balancingSections') {
          throw new Error('BALANCING_SECTIONS_INSERT_FAILED');
        }

        const [
          ,
          pair_key,
          balancing_section_title,
          current_pattern_paragraph,
          practical_meaning_paragraph,
          system_risk_paragraph,
          rebalance_intro,
          rebalance_action_1,
          rebalance_action_2,
          rebalance_action_3,
        ] = params as [string, ...string[]];
        pushUnique('balancingSections', {
          pair_key,
          balancing_section_title,
          current_pattern_paragraph,
          practical_meaning_paragraph,
          system_risk_paragraph,
          rebalance_intro,
          rebalance_action_1,
          rebalance_action_2,
          rebalance_action_3,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_pair_summaries')) {
        if (config?.failInsertTable === 'pairSummaries') {
          throw new Error('PAIR_SUMMARIES_INSERT_FAILED');
        }

        const [
          ,
          pair_key,
          pair_section_title,
          pair_headline,
          pair_opening_paragraph,
          pair_strength_paragraph,
          pair_tension_paragraph,
          pair_close_paragraph,
        ] = params as [string, ...string[]];
        pushUnique('pairSummaries', {
          pair_key,
          pair_section_title,
          pair_headline,
          pair_opening_paragraph,
          pair_strength_paragraph,
          pair_tension_paragraph,
          pair_close_paragraph,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_application_statements')) {
        if (config?.failInsertTable === 'applicationStatements') {
          throw new Error('APPLICATION_STATEMENTS_INSERT_FAILED');
        }

        const [
          ,
          domain_key,
          pattern_key,
          pair_key,
          focus_area,
          guidance_type,
          driver_role,
          signal_key,
          priority,
          guidance_text,
          linked_claim_type,
        ] = params as [
          string,
          string,
          string,
          string,
          NonNullable<ApplicationStatementsRow['focus_area']>,
          NonNullable<ApplicationStatementsRow['guidance_type']>,
          NonNullable<ApplicationStatementsRow['driver_role']>,
          string,
          number,
          string,
          string,
        ];
        pushUnique('applicationStatements', {
          domain_key,
          pattern_key,
          pair_key,
          focus_area,
          guidance_type,
          driver_role,
          signal_key,
          priority,
          guidance_text,
          linked_claim_type,
          strength_statement_1: '',
          strength_statement_2: '',
          watchout_statement_1: '',
          watchout_statement_2: '',
          development_statement_1: '',
          development_statement_2: '',
        });
        return { rows: [] as T[] };
      }

      return { rows: [] as T[] };
    },
    async connect() {
      return client;
    },
    release() {},
  };

  return {
    db: client,
    state,
  };
}

function buildApplicationStatementRow(params: {
  domain_key?: string;
  pattern_key: string;
  pair_key: string;
  focus_area: NonNullable<ApplicationStatementsRow['focus_area']>;
  guidance_type: NonNullable<ApplicationStatementsRow['guidance_type']>;
  driver_role: NonNullable<ApplicationStatementsRow['driver_role']>;
  signal_key: string;
  priority: number;
  guidance_text?: string;
  linked_claim_type?: string;
}): ApplicationStatementsRow {
  return {
    domain_key: params.domain_key ?? 'leadership-approach',
    pattern_key: params.pattern_key,
    pair_key: params.pair_key,
    focus_area: params.focus_area,
    guidance_type: params.guidance_type,
    driver_role: params.driver_role,
    signal_key: params.signal_key,
    priority: params.priority,
    guidance_text: params.guidance_text ?? 'Placeholder application guidance.',
    linked_claim_type: params.linked_claim_type ?? params.guidance_type,
    strength_statement_1: '',
    strength_statement_2: '',
    watchout_statement_1: '',
    watchout_statement_2: '',
    development_statement_1: '',
    development_statement_2: '',
  };
}

test('reading empty single-domain datasets returns empty collections cleanly', async () => {
  const fake = createFakeSingleDomainLanguageDb();

  const bundle = await getSingleDomainLanguageBundle(fake.db, 'version-1');

  assert.deepEqual(bundle, {
    DOMAIN_FRAMING: [],
    HERO_PAIRS: [],
    DRIVER_CLAIMS: [],
    SIGNAL_CHAPTERS: [],
    BALANCING_SECTIONS: [],
    PAIR_SUMMARIES: [],
    APPLICATION_STATEMENTS: [],
  });
});

test('replace functions fully replace prior rows', async () => {
  const fake = createFakeSingleDomainLanguageDb({
    framing: [{
      domain_key: 'old_domain',
      section_title: 'Old title',
      intro_paragraph: 'Old intro',
      meaning_paragraph: 'Old meaning',
      bridge_to_signals: 'Old bridge',
      blueprint_context_line: 'Old blueprint',
    }],
  });

  await replaceSingleDomainFramingRows(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [{
      domain_key: 'new_domain',
      section_title: 'New title',
      intro_paragraph: 'New intro',
      meaning_paragraph: 'New meaning',
      bridge_to_signals: 'New bridge',
      blueprint_context_line: 'New blueprint',
    }],
  });

  const rows = await getSingleDomainFramingRows(fake.db, 'version-1');

  assert.deepEqual(rows, [{
    domain_key: 'new_domain',
    section_title: 'New title',
    intro_paragraph: 'New intro',
    meaning_paragraph: 'New meaning',
    bridge_to_signals: 'New bridge',
    blueprint_context_line: 'New blueprint',
  }]);
});

test('getSingleDomainLanguageBundle returns all seven datasets', async () => {
  const fake = createFakeSingleDomainLanguageDb({
    framing: [{
      domain_key: 'execution',
      section_title: 'Execution',
      intro_paragraph: 'Intro',
      meaning_paragraph: 'Meaning',
      bridge_to_signals: 'Bridge',
      blueprint_context_line: 'Blueprint',
    }],
    heroPairs: [{
      pair_key: 'driver_analyst',
      hero_headline: 'Headline',
      hero_subheadline: 'Subheadline',
      hero_opening: 'Opening',
      hero_strength_paragraph: 'Strength',
      hero_tension_paragraph: 'Tension',
      hero_close_paragraph: 'Close',
    }],
    driverClaims: [{
      domain_key: 'leadership',
      pair_key: 'driver_analyst',
      signal_key: 'driver',
      driver_role: 'primary_driver',
      claim_type: 'driver_primary',
      claim_text: 'Driver primary claim',
      materiality: 'core',
      priority: 1,
    }],
    signalChapters: [{
      signal_key: 'lead_people',
      position_primary_label: 'Primary',
      position_secondary_label: 'Secondary',
      position_supporting_label: 'Supporting',
      position_underplayed_label: 'Underplayed',
      chapter_intro_primary: 'Intro primary',
      chapter_intro_secondary: 'Intro secondary',
      chapter_intro_supporting: 'Intro supporting',
      chapter_intro_underplayed: 'Intro underplayed',
      chapter_how_it_shows_up: 'Shows up',
      chapter_value_outcome: 'Outcome',
      chapter_value_team_effect: 'Team effect',
      chapter_risk_behaviour: 'Risk behaviour',
      chapter_risk_impact: 'Risk impact',
      chapter_development: 'Development',
    }],
    balancingSections: [{
      pair_key: 'driver_analyst',
      balancing_section_title: 'Balance',
      current_pattern_paragraph: 'Pattern',
      practical_meaning_paragraph: 'Meaning',
      system_risk_paragraph: 'Risk',
      rebalance_intro: 'Intro',
      rebalance_action_1: 'A1',
      rebalance_action_2: 'A2',
      rebalance_action_3: 'A3',
    }],
    pairSummaries: [{
      pair_key: 'driver_analyst',
      pair_section_title: 'Section',
      pair_headline: 'Headline',
      pair_opening_paragraph: 'Opening',
      pair_strength_paragraph: 'Strength',
      pair_tension_paragraph: 'Tension',
      pair_close_paragraph: 'Close',
    }],
    applicationStatements: [{
      signal_key: 'lead_people',
      strength_statement_1: 'S1',
      strength_statement_2: 'S2',
      watchout_statement_1: 'W1',
      watchout_statement_2: 'W2',
      development_statement_1: 'D1',
      development_statement_2: 'D2',
    }],
  });

  const bundle = await getSingleDomainLanguageBundle(fake.db, 'version-1');

  assert.equal(bundle.DOMAIN_FRAMING.length, 1);
  assert.equal(bundle.HERO_PAIRS.length, 1);
  assert.equal(bundle.DRIVER_CLAIMS.length, 1);
  assert.equal(bundle.SIGNAL_CHAPTERS.length, 1);
  assert.equal(bundle.BALANCING_SECTIONS.length, 1);
  assert.equal(bundle.PAIR_SUMMARIES.length, 1);
  assert.equal(bundle.APPLICATION_STATEMENTS.length, 1);
});

test('deterministic ordering is preserved for pair and signal keyed datasets', async () => {
  const fake = createFakeSingleDomainLanguageDb();

  await replaceSingleDomainHeroPairRows(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [
      {
        pair_key: 'operator_guardian',
        hero_headline: 'B',
        hero_subheadline: 'B',
        hero_opening: 'B',
        hero_strength_paragraph: 'B',
        hero_tension_paragraph: 'B',
        hero_close_paragraph: 'B',
      },
      {
        pair_key: 'driver_analyst',
        hero_headline: 'A',
        hero_subheadline: 'A',
        hero_opening: 'A',
        hero_strength_paragraph: 'A',
        hero_tension_paragraph: 'A',
        hero_close_paragraph: 'A',
      },
    ],
  });

  await replaceSingleDomainApplicationStatementRows(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [
      buildApplicationStatementRow({
        domain_key: 'leadership',
        pattern_key: 'stress_stability_decision_evidence',
        pair_key: 'stress_stability',
        focus_area: 'rely_on',
        guidance_type: 'applied_strength',
        driver_role: 'primary_driver',
        signal_key: 'stress_stability',
        priority: 1,
        guidance_text: 'B1',
      }),
      buildApplicationStatementRow({
        domain_key: 'leadership',
        pattern_key: 'decision_evidence_stress_stability',
        pair_key: 'decision_evidence',
        focus_area: 'rely_on',
        guidance_type: 'applied_strength',
        driver_role: 'primary_driver',
        signal_key: 'decision_evidence',
        priority: 1,
        guidance_text: 'A1',
      }),
    ],
  });

  const heroRows = await getSingleDomainHeroPairRows(fake.db, 'version-1');
  const applicationRows = await getSingleDomainApplicationStatementRows(fake.db, 'version-1');

  assert.deepEqual(heroRows.map((row) => row.pair_key), ['driver_analyst', 'operator_guardian']);
  assert.deepEqual(applicationRows.map((row) => row.pattern_key), [
    'decision_evidence_stress_stability',
    'stress_stability_decision_evidence',
  ]);
});

test('driver claim rows are replaced and ordered by domain, pair, role, priority, and signal', async () => {
  const fake = createFakeSingleDomainLanguageDb({
    driverClaims: [{
      domain_key: 'old',
      pair_key: 'old_pair',
      signal_key: 'old_signal',
      driver_role: 'primary_driver',
      claim_type: 'driver_primary',
      claim_text: 'Old claim',
      materiality: 'core',
      priority: 1,
    }],
  });

  await replaceSingleDomainDriverClaimRows(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [
      {
        domain_key: 'leadership',
        pair_key: 'results_process',
        signal_key: 'process',
        driver_role: 'secondary_driver',
        claim_type: 'driver_secondary',
        claim_text: 'Secondary process claim',
        materiality: 'core',
        priority: 2,
      },
      {
        domain_key: 'leadership',
        pair_key: 'process_people',
        signal_key: 'process',
        driver_role: 'primary_driver',
        claim_type: 'driver_primary',
        claim_text: 'Primary process claim',
        materiality: 'core',
        priority: 1,
      },
      {
        domain_key: 'leadership',
        pair_key: 'results_process',
        signal_key: 'results',
        driver_role: 'secondary_driver',
        claim_type: 'driver_secondary',
        claim_text: 'Secondary results claim',
        materiality: 'core',
        priority: 1,
      },
    ],
  });

  const rows = await getSingleDomainDriverClaimRows(fake.db, 'version-1');

  assert.deepEqual(
    rows.map((row) => `${row.domain_key}|${row.pair_key}|${row.driver_role}|${row.priority}|${row.signal_key}`),
    [
      'leadership|process_people|primary_driver|1|process',
      'leadership|results_process|secondary_driver|1|results',
      'leadership|results_process|secondary_driver|2|process',
    ],
  );
  assert.equal(fake.state.driverClaims.some((row) => row.domain_key === 'old'), false);
});

test('full-pattern application rows persist without pair-level collisions', async () => {
  const fake = createFakeSingleDomainLanguageDb();
  const signals = ['results', 'vision', 'people', 'process'];
  const pairs = [
    ['results', 'vision'],
    ['results', 'people'],
    ['results', 'process'],
    ['vision', 'people'],
    ['process', 'vision'],
    ['process', 'people'],
  ];
  const focusAreas = [
    ['rely_on', 'applied_strength'],
    ['notice', 'watchout'],
    ['develop', 'development_focus'],
  ] as const;
  const roles = [
    ['primary_driver', 1],
    ['secondary_driver', 2],
    ['supporting_context', 3],
    ['range_limitation', 4],
  ] as const;

  const rows = pairs.flatMap(([first, second]) => {
    const [third, fourth] = signals.filter((signal) => signal !== first && signal !== second);
    const patternSignals = [
      [first, second, third, fourth],
      [first, second, fourth, third],
    ];

    return patternSignals.flatMap((pattern) =>
      focusAreas.flatMap(([focus_area, guidance_type]) =>
        roles.map(([driver_role, priority], index) => buildApplicationStatementRow({
          pattern_key: pattern.join('_'),
          pair_key: `${first}_${second}`,
          focus_area,
          guidance_type,
          driver_role,
          signal_key: pattern[index] ?? '',
          priority,
        })),
      ),
    );
  });

  await replaceSingleDomainApplicationStatementRows(fake.db, {
    assessmentVersionId: 'version-1',
    rows,
  });

  const storedRows = await getSingleDomainApplicationStatementRows(fake.db, 'version-1');

  assert.equal(storedRows.length, 144);
  assert.equal(fake.state.applicationStatements.length, 144);
  assert.equal(
    storedRows.some((row) =>
      row.pair_key === 'results_vision'
      && row.pattern_key === 'results_vision_people_process'
      && row.driver_role === 'primary_driver'),
    true,
  );
  assert.equal(
    storedRows.some((row) =>
      row.pair_key === 'results_vision'
      && row.pattern_key === 'results_vision_process_people'
      && row.driver_role === 'primary_driver'),
    true,
  );
});

test('duplicate full-pattern application uniqueness key is rejected and rolled back', async () => {
  const original = buildApplicationStatementRow({
    pattern_key: 'results_vision_people_process',
    pair_key: 'results_vision',
    focus_area: 'rely_on',
    guidance_type: 'applied_strength',
    driver_role: 'primary_driver',
    signal_key: 'results',
    priority: 1,
  });
  const fake = createFakeSingleDomainLanguageDb({
    applicationStatements: [original],
  });

  await assert.rejects(
    () => replaceSingleDomainApplicationStatementRows(fake.db, {
      assessmentVersionId: 'version-1',
      rows: [
        original,
        {
          ...original,
          guidance_text: 'Different text with the same deterministic key.',
        },
      ],
    }),
    /duplicate key value violates unique constraint/i,
  );

  assert.deepEqual(fake.state.applicationStatements, [original]);
});

test('write paths reject multi_domain versions while read paths short-circuit cleanly', async () => {
  const fake = createFakeSingleDomainLanguageDb(undefined, {
    modeByVersion: {
      'version-multi': 'multi_domain',
    },
  });

  const rows = await getSingleDomainPairSummaryRows(fake.db, 'version-multi');
  assert.deepEqual(rows, []);

  await assert.rejects(
    () => replaceSingleDomainPairSummaryRows(fake.db, {
      assessmentVersionId: 'version-multi',
      rows: [{
        pair_key: 'driver_analyst',
        pair_section_title: 'Section',
        pair_headline: 'Headline',
        pair_opening_paragraph: 'Opening',
        pair_strength_paragraph: 'Strength',
        pair_tension_paragraph: 'Tension',
        pair_close_paragraph: 'Close',
      }],
    }),
    SingleDomainLanguageModeError,
  );
});

test('exact field names are preserved round-trip', async () => {
  const fake = createFakeSingleDomainLanguageDb();

  const input: SignalChaptersRow = {
    signal_key: 'lead_people',
    position_primary_label: 'Primary',
    position_secondary_label: 'Secondary',
    position_supporting_label: 'Supporting',
    position_underplayed_label: 'Underplayed',
    chapter_intro_primary: 'Primary intro',
    chapter_intro_secondary: 'Secondary intro',
    chapter_intro_supporting: 'Supporting intro',
    chapter_intro_underplayed: 'Underplayed intro',
    chapter_how_it_shows_up: 'Shows up',
    chapter_value_outcome: 'Outcome',
    chapter_value_team_effect: 'Team',
    chapter_risk_behaviour: 'Behaviour',
    chapter_risk_impact: 'Impact',
    chapter_development: 'Development',
  };

  await replaceSingleDomainSignalChapterRows(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [input],
  });

  const [row] = await getSingleDomainSignalChapterRows(fake.db, 'version-1');

  assert.deepEqual(row, input);
  assert.deepEqual(Object.keys(row ?? {}), Object.keys(input));
});

test('missing single-domain tables read back as empty datasets', async () => {
  const fake = createFakeSingleDomainLanguageDb(undefined, {
    missingTables: {
      heroPairs: true,
      balancingSections: true,
    },
  });

  const heroRows = await getSingleDomainHeroPairRows(fake.db, 'version-1');
  const balancingRows = await getSingleDomainBalancingSectionRows(fake.db, 'version-1');

  assert.deepEqual(heroRows, []);
  assert.deepEqual(balancingRows, []);
});

test('duplicate key inserts are rejected and rolled back', async () => {
  const fake = createFakeSingleDomainLanguageDb({
    heroPairs: [{
      pair_key: 'driver_analyst',
      hero_headline: 'Original',
      hero_subheadline: 'Original',
      hero_opening: 'Original',
      hero_strength_paragraph: 'Original',
      hero_tension_paragraph: 'Original',
      hero_close_paragraph: 'Original',
    }],
  });

  await assert.rejects(
    () => replaceSingleDomainHeroPairRows(fake.db, {
      assessmentVersionId: 'version-1',
      rows: [
        {
          pair_key: 'driver_analyst',
          hero_headline: 'New A',
          hero_subheadline: 'New A',
          hero_opening: 'New A',
          hero_strength_paragraph: 'New A',
          hero_tension_paragraph: 'New A',
          hero_close_paragraph: 'New A',
        },
        {
          pair_key: 'driver_analyst',
          hero_headline: 'New B',
          hero_subheadline: 'New B',
          hero_opening: 'New B',
          hero_strength_paragraph: 'New B',
          hero_tension_paragraph: 'New B',
          hero_close_paragraph: 'New B',
        },
      ],
    }),
    /duplicate key value violates unique constraint/i,
  );

  assert.deepEqual(fake.state.heroPairs, [{
    pair_key: 'driver_analyst',
    hero_headline: 'Original',
    hero_subheadline: 'Original',
    hero_opening: 'Original',
    hero_strength_paragraph: 'Original',
    hero_tension_paragraph: 'Original',
    hero_close_paragraph: 'Original',
  }]);
});

test('dispatcher save function routes to the correct dataset repository', async () => {
  const fake = createFakeSingleDomainLanguageDb(undefined, {
    missingModeColumns: true,
  });

  await saveSingleDomainLanguageDataset(fake.db, {
    assessmentVersionId: 'version-1',
    datasetKey: 'DRIVER_CLAIMS',
    rows: [{
      domain_key: 'leadership',
      pair_key: 'driver_analyst',
      signal_key: 'driver',
      driver_role: 'primary_driver',
      claim_type: 'driver_primary',
      claim_text: 'Driver primary claim',
      materiality: 'core',
      priority: 1,
    }],
  });

  const rows = await getSingleDomainDriverClaimRows(fake.db, 'version-1');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.pair_key, 'driver_analyst');
});
