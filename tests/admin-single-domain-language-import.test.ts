import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-single-domain-language-import';
import {
  importSingleDomainLanguageDatasetActionWithExecutor,
} from '@/lib/server/admin-single-domain-language-import-actions';
import { getExpectedDriverClaimTuples } from '@/lib/assessment-language/single-domain-canonical';

type SingleDomainTableState = {
  signals: string[];
  framing: Array<{
    domain_key: string;
    section_title: string;
    intro_paragraph: string;
    meaning_paragraph: string;
    bridge_to_signals: string;
    blueprint_context_line: string;
  }>;
  signalChapters: Array<{
    signal_key: string;
    position_primary_label: string;
    position_secondary_label: string;
    position_supporting_label: string;
    position_underplayed_label: string;
    chapter_intro_primary: string;
    chapter_intro_secondary: string;
    chapter_intro_supporting: string;
    chapter_intro_underplayed: string;
    chapter_how_it_shows_up: string;
    chapter_value_outcome: string;
    chapter_value_team_effect: string;
    chapter_risk_behaviour: string;
    chapter_risk_impact: string;
    chapter_development: string;
  }>;
};

function createFakeDb(seed?: Partial<SingleDomainTableState>) {
  const state: SingleDomainTableState = {
    signals: ['results', 'process', 'vision', 'people'],
    framing: [...(seed?.framing ?? [])],
    signalChapters: [],
  };

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_versions av INNER JOIN assessments a ON a.id = av.assessment_id WHERE av.id = $1')) {
        return {
          rows: [{
            assessment_key: 'role-focus',
            assessment_version_id: String(params?.[0] ?? 'version-draft'),
            lifecycle_status: 'DRAFT',
          }] as T[],
        };
      }

      if (sql.includes('COALESCE(av.mode, a.mode) AS assessment_mode')) {
        return {
          rows: [{ assessment_mode: 'single_domain' }] as T[],
        };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_framing')) {
        state.framing = [];
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_signal_chapters')) {
        state.signalChapters = [];
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_framing')) {
        const [
          ,
          domain_key,
          section_title,
          intro_paragraph,
          meaning_paragraph,
          bridge_to_signals,
          blueprint_context_line,
        ] = params as [string, string, string, string, string, string, string];
        state.framing.push({
          domain_key,
          section_title,
          intro_paragraph,
          meaning_paragraph,
          bridge_to_signals,
          blueprint_context_line,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_signal_chapters')) {
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
        state.signalChapters.push({
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

      if (sql.includes('FROM assessment_version_single_domain_framing')) {
        return { rows: [...state.framing] as T[] };
      }

      if (sql.includes('FROM signals') && sql.includes('WHERE assessment_version_id = $1')) {
        return {
          rows: state.signals.map((signal_key) => ({ signal_key })) as T[],
        };
      }

      if (sql.includes('FROM domains') && sql.includes('WHERE assessment_version_id = $1')) {
        return {
          rows: [{ domain_key: 'leadership-style' }] as T[],
        };
      }

      if (sql.includes('FROM assessment_version_single_domain_signal_chapters')) {
        return { rows: [...state.signalChapters] as T[] };
      }

      if (
        sql.includes('FROM assessment_version_single_domain_hero_pairs') ||
        sql.includes('FROM assessment_version_single_domain_driver_claims') ||
        sql.includes('FROM assessment_version_single_domain_balancing_sections') ||
        sql.includes('FROM assessment_version_single_domain_pair_summaries') ||
        sql.includes('FROM assessment_version_single_domain_application_statements')
      ) {
        return { rows: [] as T[] };
      }

      return { rows: [] as T[] };
    },
    async connect() {
      return client;
    },
    release() {},
  };

  return { db: client, state };
}

test('valid DOMAIN_FRAMING import persists rows successfully', async () => {
  const fake = createFakeDb();
  const paths: string[] = [];

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'DOMAIN_FRAMING',
    rawInput: [
      'domain_key|section_title|intro_paragraph|meaning_paragraph|bridge_to_signals|blueprint_context_line',
      'leadership-style|Leadership style|Intro text|Meaning text|Bridge text|Blueprint text',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath(path) {
      paths.push(path);
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.summary.importedRowCount, 1);
  assert.equal(fake.state.framing.length, 1);
  assert.equal(fake.state.framing[0]?.domain_key, 'leadership-style');
  assert.ok(paths.includes('/admin/assessments/single-domain/role-focus/language'));
  assert.ok(paths.includes('/admin/assessments/single-domain/role-focus/review'));
});

test('SIGNAL_CHAPTERS import is rejected from admin authoring even when structurally valid', async () => {
  const fake = createFakeDb();

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'SIGNAL_CHAPTERS',
    rawInput: [
      'signal_key|position_primary_label|position_secondary_label|position_supporting_label|position_underplayed_label|chapter_intro_primary|chapter_intro_secondary|chapter_intro_supporting|chapter_intro_underplayed|chapter_how_it_shows_up|chapter_value_outcome|chapter_value_team_effect|chapter_risk_behaviour|chapter_risk_impact|chapter_development',
      'results|Primary driver|Secondary driver|Supporting context|Underplayed signal|Results leads with visible outcome pressure and delivery urgency.|Results in second position reinforces momentum without owning the whole pattern.|Results in a supporting role keeps execution standards present in the background.|When underplayed, results pressure can become too soft or delayed.|It shows up as a clear push toward measurable progress and closure.|The value is faster movement from intent to tangible outcomes.|Teams feel stronger accountability and clearer completion signals.|Risk appears when pace outruns context and options narrow too quickly.|Impact can include missed perspectives and lower sustained commitment.|Development focus is to pair speed with explicit check points and reflection.',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, false);
  assert.equal(result.parseErrors.length, 0);
  assert.match(result.planErrors[0]?.message ?? '', /SIGNAL_CHAPTERS is no longer available in the admin single-domain language importer/i);
  assert.equal(fake.state.signalChapters.length, 0);
});

test('SIGNAL_CHAPTERS import through the UI server action path is rejected', async () => {
  const fake = createFakeDb();
  const rawInput = [
    'signal_key|position_primary_label|position_secondary_label|position_supporting_label|position_underplayed_label|chapter_intro_primary|chapter_intro_secondary|chapter_intro_supporting|chapter_intro_underplayed|chapter_how_it_shows_up|chapter_value_outcome|chapter_value_team_effect|chapter_risk_behaviour|chapter_risk_impact|chapter_development',
    'results|Primary driver|Secondary driver|Supporting context|Underplayed signal|Results leads with visible outcome pressure and delivery urgency.|Results in second position reinforces momentum without owning the whole pattern.|Results in a supporting role keeps execution standards present in the background.|When underplayed, results pressure can become too soft or delayed.|It shows up as a clear push toward measurable progress and closure.|The value is faster movement from intent to tangible outcomes.|Teams feel stronger accountability and clearer completion signals.|Risk appears when pace outruns context and options narrow too quickly.|Impact can include missed perspectives and lower sustained commitment.|Development focus is to pair speed with explicit check points and reflection.',
  ].join('\n');

  const formData = new FormData();
  formData.set('datasetKey', 'SIGNAL_CHAPTERS');
  formData.set('rawInput', rawInput);

  const result = await importSingleDomainLanguageDatasetActionWithExecutor(
    { assessmentVersionId: 'version-draft' },
    {
      datasetKey: 'SIGNAL_CHAPTERS',
      rawInput: '',
      success: false,
      parseErrors: [],
      validationErrors: [],
      planErrors: [],
      previewGroups: [],
      summary: {
        assessmentVersionId: null,
        rowCount: 0,
        targetCount: 0,
        existingRowCount: 0,
        importedRowCount: 0,
        importedTargetCount: 0,
      },
      executionError: null,
      formError: null,
    },
    formData,
    async (command) => importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies(command, {
      db: fake.db,
      revalidatePath() {},
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.parseErrors.length, 0);
  assert.match(result.planErrors[0]?.message ?? '', /SIGNAL_CHAPTERS is no longer available in the admin single-domain language importer/i);
  assert.equal(fake.state.signalChapters.length, 0);
});

test('DRIVER_CLAIMS validates role claim type and materiality mapping', async () => {
  const fake = createFakeDb();

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'DRIVER_CLAIMS',
    rawInput: [
      'domain_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority',
      'leadership|process_results|process|secondary_driver|driver_primary|Process supports results|core|1',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((error) => error.message).join('\n'),
    /claim_type" must be "driver_secondary" when driver_role is "secondary_driver/i,
  );
});

test('DRIVER_CLAIMS rejects rows that do not match the exact runtime lookup tuple', async () => {
  const fake = createFakeDb({
    signals: ['results', 'process', 'vision', 'people'],
  });

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'DRIVER_CLAIMS',
    rawInput: [
      'domain_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority',
      'leadership-style|results_vision|vision|primary_driver|driver_primary|Vision leads this pair.|core|1',
      'leadership-style|results_vision|results|secondary_driver|driver_secondary|Results supports this pair.|core|2',
      'leadership-style|results_vision|people|supporting_context|driver_supporting_context|People supports this pair.|supporting|3',
      'leadership-style|results_vision|process|range_limitation|driver_range_limitation|Process is underplayed.|material_underplay|4',
      'leadership-style|results_process|process|primary_driver|driver_primary|Process leads this pair.|core|1',
      'leadership-style|results_process|results|secondary_driver|driver_secondary|Results supports this pair.|core|2',
      'leadership-style|results_process|vision|supporting_context|driver_supporting_context|Vision supports this pair.|supporting|3',
      'leadership-style|results_process|people|range_limitation|driver_range_limitation|People is underplayed.|material_underplay|4',
      'leadership-style|results_people|results|primary_driver|driver_primary|Results leads this pair.|core|1',
      'leadership-style|results_people|people|secondary_driver|driver_secondary|People supports this pair.|core|2',
      'leadership-style|results_people|process|supporting_context|driver_supporting_context|Process supports this pair.|supporting|3',
      'leadership-style|results_people|vision|range_limitation|driver_range_limitation|Vision is underplayed.|material_underplay|4',
      'leadership-style|process_vision|process|primary_driver|driver_primary|Process leads this pair.|core|1',
      'leadership-style|process_vision|vision|secondary_driver|driver_secondary|Vision supports this pair.|core|2',
      'leadership-style|process_vision|results|supporting_context|driver_supporting_context|Results supports this pair.|supporting|3',
      'leadership-style|process_vision|people|range_limitation|driver_range_limitation|People is underplayed.|material_underplay|4',
      'leadership-style|process_people|process|primary_driver|driver_primary|Process leads this pair.|core|1',
      'leadership-style|process_people|people|secondary_driver|driver_secondary|People supports this pair.|core|2',
      'leadership-style|process_people|results|supporting_context|driver_supporting_context|Results supports this pair.|supporting|3',
      'leadership-style|process_people|vision|range_limitation|driver_range_limitation|Vision is underplayed.|material_underplay|4',
      'leadership-style|vision_people|vision|primary_driver|driver_primary|Vision leads this pair.|core|1',
      'leadership-style|vision_people|people|secondary_driver|driver_secondary|People supports this pair.|core|2',
      'leadership-style|vision_people|process|supporting_context|driver_supporting_context|Process supports this pair.|supporting|3',
      'leadership-style|vision_people|results|range_limitation|driver_range_limitation|Results is underplayed.|material_underplay|4',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((error) => error.message).join('\n'),
    /results_vision\|results\|primary_driver/i,
  );
  assert.match(
    result.validationErrors.map((error) => error.message).join('\n'),
    /results_vision\|vision\|secondary_driver/i,
  );
});

test('DRIVER_CLAIMS rejects 24-row datasets that omit the reverse-ranking tuples', async () => {
  const fake = createFakeDb({
    signals: ['results', 'process', 'vision', 'people'],
  });

  const rawRows = [
    'domain_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority',
    'leadership-style|results_process|results|primary_driver|driver_primary|Results leads this pair.|core|1',
    'leadership-style|results_process|process|secondary_driver|driver_secondary|Process supports this pair.|core|2',
    'leadership-style|results_process|vision|supporting_context|driver_supporting_context|Vision supports this pair.|supporting|3',
    'leadership-style|results_process|people|range_limitation|driver_range_limitation|People is underplayed.|material_underplay|4',
    'leadership-style|results_vision|results|primary_driver|driver_primary|Results leads this pair.|core|1',
    'leadership-style|results_vision|vision|secondary_driver|driver_secondary|Vision supports this pair.|core|2',
    'leadership-style|results_vision|process|supporting_context|driver_supporting_context|Process supports this pair.|supporting|3',
    'leadership-style|results_vision|people|range_limitation|driver_range_limitation|People is underplayed.|material_underplay|4',
    'leadership-style|results_people|results|primary_driver|driver_primary|Results leads this pair.|core|1',
    'leadership-style|results_people|people|secondary_driver|driver_secondary|People supports this pair.|core|2',
    'leadership-style|results_people|process|supporting_context|driver_supporting_context|Process supports this pair.|supporting|3',
    'leadership-style|results_people|vision|range_limitation|driver_range_limitation|Vision is underplayed.|material_underplay|4',
    'leadership-style|process_vision|process|primary_driver|driver_primary|Process leads this pair.|core|1',
    'leadership-style|process_vision|vision|secondary_driver|driver_secondary|Vision supports this pair.|core|2',
    'leadership-style|process_vision|results|supporting_context|driver_supporting_context|Results supports this pair.|supporting|3',
    'leadership-style|process_vision|people|range_limitation|driver_range_limitation|People is underplayed.|material_underplay|4',
    'leadership-style|process_people|process|primary_driver|driver_primary|Process leads this pair.|core|1',
    'leadership-style|process_people|people|secondary_driver|driver_secondary|People supports this pair.|core|2',
    'leadership-style|process_people|results|supporting_context|driver_supporting_context|Results supports this pair.|supporting|3',
    'leadership-style|process_people|vision|range_limitation|driver_range_limitation|Vision is underplayed.|material_underplay|4',
    'leadership-style|vision_people|vision|primary_driver|driver_primary|Vision leads this pair.|core|1',
    'leadership-style|vision_people|people|secondary_driver|driver_secondary|People supports this pair.|core|2',
    'leadership-style|vision_people|results|supporting_context|driver_supporting_context|Results supports this pair.|supporting|3',
    'leadership-style|vision_people|process|range_limitation|driver_range_limitation|Process is underplayed.|material_underplay|4',
  ];

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'DRIVER_CLAIMS',
    rawInput: rawRows.join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((error) => error.message).join('\n'),
    /must contain exactly 48 rows/i,
  );
  assert.match(
    result.validationErrors.map((error) => error.message).join('\n'),
    /results_process\|process\|primary_driver/i,
  );
});

test('DRIVER_CLAIMS rejects reversed pair keys even when the row count is otherwise complete', async () => {
  const fake = createFakeDb({
    signals: ['results', 'process', 'vision', 'people'],
  });

  const rawRows = [
    'domain_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority',
    ...getExpectedDriverClaimTuples({
      domainKey: 'leadership-style',
      signalKeys: ['results', 'process', 'vision', 'people'],
    }).map((tuple) => {
      const pairKey = tuple.pairKey === 'results_process' ? 'process_results' : tuple.pairKey;
      const claimType = tuple.driverRole === 'primary_driver'
        ? 'driver_primary'
        : tuple.driverRole === 'secondary_driver'
          ? 'driver_secondary'
          : tuple.driverRole === 'supporting_context'
            ? 'driver_supporting_context'
            : 'driver_range_limitation';
      const materiality = tuple.driverRole === 'range_limitation'
        ? 'material_underplay'
        : tuple.driverRole === 'supporting_context'
          ? 'supporting'
          : 'core';
      const priority = tuple.driverRole === 'primary_driver'
        ? 1
        : tuple.driverRole === 'secondary_driver'
          ? 2
          : tuple.driverRole === 'supporting_context'
            ? 3
            : 4;

      return [
        tuple.domainKey,
        pairKey,
        tuple.signalKey,
        tuple.driverRole,
        claimType,
        `${pairKey} ${tuple.signalKey} ${tuple.driverRole}`,
        materiality,
        String(priority),
      ].join('|');
    }),
  ];

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'DRIVER_CLAIMS',
    rawInput: rawRows.join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((error) => error.message).join('\n'),
    /process_results\|results\|primary_driver/i,
  );
});

test('DRIVER_CLAIMS requires positive integer priority', async () => {
  const fake = createFakeDb();

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'DRIVER_CLAIMS',
    rawInput: [
      'domain_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority',
      'leadership|process_results|process|primary_driver|driver_primary|Process leads the pair|core|0',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, false);
  assert.match(
    result.validationErrors.map((error) => error.message).join('\n'),
    /priority" must be a positive integer/i,
  );
});
