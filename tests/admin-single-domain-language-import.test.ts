import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-single-domain-language-import';

type SingleDomainTableState = {
  framing: Array<{
    domain_key: string;
    section_title: string;
    intro_paragraph: string;
    meaning_paragraph: string;
    bridge_to_signals: string;
    blueprint_context_line: string;
  }>;
};

function createFakeDb(seed?: Partial<SingleDomainTableState>) {
  const state: SingleDomainTableState = {
    framing: [...(seed?.framing ?? [])],
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

      if (sql.includes('FROM assessment_version_single_domain_framing')) {
        return { rows: [...state.framing] as T[] };
      }

      if (
        sql.includes('FROM assessment_version_single_domain_hero_pairs') ||
        sql.includes('FROM assessment_version_single_domain_driver_claims') ||
        sql.includes('FROM assessment_version_single_domain_signal_chapters') ||
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
  assert.equal(result.validationErrors.length, 1);
  assert.match(
    result.validationErrors[0]?.message ?? '',
    /claim_type" must be "driver_secondary" when driver_role is "secondary_driver/i,
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
  assert.equal(result.validationErrors.length, 1);
  assert.match(result.validationErrors[0]?.message ?? '', /priority" must be a positive integer/i);
});
