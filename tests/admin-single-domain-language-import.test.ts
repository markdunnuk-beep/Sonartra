import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-single-domain-language-import';
import {
  importSingleDomainLanguageDatasetActionWithExecutor,
} from '@/lib/server/admin-single-domain-language-import-actions';

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

test('invalid SIGNAL_CHAPTERS headers are rejected visibly', async () => {
  const fake = createFakeDb();

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'SIGNAL_CHAPTERS',
    rawInput: [
      'signal_key|position_primary_label|position_secondary_label',
      'directive|Primary|Secondary',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, false);
  assert.equal(result.parseErrors.length, 1);
  assert.match(result.parseErrors[0]?.message ?? '', /Invalid headers for SIGNAL_CHAPTERS/i);
  assert.match(result.parseErrors[0]?.message ?? '', /Expected 15 header columns but found 3/i);
  assert.match(result.parseErrors[0]?.message ?? '', /Missing header field\(s\): position_supporting_label/i);
});

test('valid SIGNAL_CHAPTERS import accepts four leadership signal rows with header included', async () => {
  const fake = createFakeDb();

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'SIGNAL_CHAPTERS',
    rawInput: [
      'signal_key|position_primary_label|position_secondary_label|position_supporting_label|position_underplayed_label|chapter_intro_primary|chapter_intro_secondary|chapter_intro_supporting|chapter_intro_underplayed|chapter_how_it_shows_up|chapter_value_outcome|chapter_value_team_effect|chapter_risk_behaviour|chapter_risk_impact|chapter_development',
      'results|Primary driver|Secondary driver|Supporting context|Underplayed signal|Results leads with visible outcome pressure and delivery urgency.|Results in second position reinforces momentum without owning the whole pattern.|Results in a supporting role keeps execution standards present in the background.|When underplayed, results pressure can become too soft or delayed.|It shows up as a clear push toward measurable progress and closure.|The value is faster movement from intent to tangible outcomes.|Teams feel stronger accountability and clearer completion signals.|Risk appears when pace outruns context and options narrow too quickly.|Impact can include missed perspectives and lower sustained commitment.|Development focus is to pair speed with explicit check points and reflection.',
      'process|Primary driver|Secondary driver|Supporting context|Underplayed signal|Process leads by creating order, sequence, and repeatable rhythm.|Process as secondary gives structure to another leading signal.|Process in support keeps standards and handoffs reliable.|When underplayed, work can lose cadence and quality control.|It shows up through planning discipline and visible operating rhythm.|The value is dependable execution with fewer avoidable errors.|Teams experience clearer coordination and steadier follow-through.|Risk appears when process becomes rigid and adaptation slows.|Impact can include bureaucracy, delay, or reduced initiative.|Development focus is to keep structure while adjusting to context quickly.',
      'vision|Primary driver|Secondary driver|Supporting context|Underplayed signal|Vision leads by setting direction and framing future opportunity.|Vision as secondary expands options around the primary signal.|Vision in support keeps longer-range meaning connected to current work.|When underplayed, direction can shrink to short-term tasks only.|It shows up as strategic framing and pattern-seeing across decisions.|The value is stronger alignment around purpose and future outcomes.|Teams feel more motivated when direction is meaningful and coherent.|Risk appears when ideas outpace execution capacity.|Impact can include ambiguity, drift, or overextension.|Development focus is to translate strategy into concrete next steps.',
      'people|Primary driver|Secondary driver|Supporting context|Underplayed signal|People leads by centering trust, commitment, and relational awareness.|People as secondary improves adoption and follow-through of decisions.|People in support keeps culture and morale visible while work advances.|When underplayed, engagement can drop and resistance may stay hidden.|It shows up through listening, inclusion, and active relationship management.|The value is stronger commitment and healthier collaboration under pressure.|Teams feel seen, increasing trust and shared ownership.|Risk appears when harmony overrides necessary challenge or pace.|Impact can include slower decisions and unclear accountability.|Development focus is to pair empathy with firm standards and timely decisions.',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, true);
  assert.equal(result.parseErrors.length, 0);
  assert.equal(result.validationErrors.length, 0);
  assert.equal(result.summary.importedRowCount, 4);
  assert.equal(result.summary.targetCount, 4);
});

test('SIGNAL_CHAPTERS import through the UI server action path succeeds for known-good 4-row payload', async () => {
  const fake = createFakeDb();
  const rawInput = [
    'signal_key|position_primary_label|position_secondary_label|position_supporting_label|position_underplayed_label|chapter_intro_primary|chapter_intro_secondary|chapter_intro_supporting|chapter_intro_underplayed|chapter_how_it_shows_up|chapter_value_outcome|chapter_value_team_effect|chapter_risk_behaviour|chapter_risk_impact|chapter_development',
    'results|Primary driver|Secondary driver|Supporting context|Underplayed signal|Results leads with visible outcome pressure and delivery urgency.|Results in second position reinforces momentum without owning the whole pattern.|Results in a supporting role keeps execution standards present in the background.|When underplayed, results pressure can become too soft or delayed.|It shows up as a clear push toward measurable progress and closure.|The value is faster movement from intent to tangible outcomes.|Teams feel stronger accountability and clearer completion signals.|Risk appears when pace outruns context and options narrow too quickly.|Impact can include missed perspectives and lower sustained commitment.|Development focus is to pair speed with explicit check points and reflection.',
    'process|Primary driver|Secondary driver|Supporting context|Underplayed signal|Process leads by creating order, sequence, and repeatable rhythm.|Process as secondary gives structure to another leading signal.|Process in support keeps standards and handoffs reliable.|When underplayed, work can lose cadence and quality control.|It shows up through planning discipline and visible operating rhythm.|The value is dependable execution with fewer avoidable errors.|Teams experience clearer coordination and steadier follow-through.|Risk appears when process becomes rigid and adaptation slows.|Impact can include bureaucracy, delay, or reduced initiative.|Development focus is to keep structure while adjusting to context quickly.',
    'vision|Primary driver|Secondary driver|Supporting context|Underplayed signal|Vision leads by setting direction and framing future opportunity.|Vision as secondary expands options around the primary signal.|Vision in support keeps longer-range meaning connected to current work.|When underplayed, direction can shrink to short-term tasks only.|It shows up as strategic framing and pattern-seeing across decisions.|The value is stronger alignment around purpose and future outcomes.|Teams feel more motivated when direction is meaningful and coherent.|Risk appears when ideas outpace execution capacity.|Impact can include ambiguity, drift, or overextension.|Development focus is to translate strategy into concrete next steps.',
    'people|Primary driver|Secondary driver|Supporting context|Underplayed signal|People leads by centering trust, commitment, and relational awareness.|People as secondary improves adoption and follow-through of decisions.|People in support keeps culture and morale visible while work advances.|When underplayed, engagement can drop and resistance may stay hidden.|It shows up through listening, inclusion, and active relationship management.|The value is stronger commitment and healthier collaboration under pressure.|Teams feel seen, increasing trust and shared ownership.|Risk appears when harmony overrides necessary challenge or pace.|Impact can include slower decisions and unclear accountability.|Development focus is to pair empathy with firm standards and timely decisions.',
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

  assert.equal(result.success, true);
  assert.equal(result.parseErrors.length, 0);
  assert.equal(result.validationErrors.length, 0);
  assert.equal(result.summary.importedRowCount, 4);
  assert.equal(fake.state.signalChapters.length, 4);
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
