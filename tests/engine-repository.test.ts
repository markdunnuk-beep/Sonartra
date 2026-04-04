import test from 'node:test';
import assert from 'node:assert/strict';

import { createAssessmentDefinitionRepository } from '@/lib/engine/repository';
import { DefinitionGraphIntegrityError, assembleRuntimeAssessmentDefinition } from '@/lib/engine/repository-mappers';
import type {
  AssessmentRow,
  AssessmentIntroRow,
  AssessmentVersionRow,
  DefinitionGraphRows,
  DomainRow,
  OptionRow,
  OptionSignalWeightRow,
  Queryable,
  QuestionRow,
  SignalRow,
} from '@/lib/engine/repository-sql';

function buildGraphRows(): DefinitionGraphRows {
  const assessment: AssessmentRow = {
    id: 'a1',
    assessment_key: 'wplp80',
    title: 'WPLP-80',
    description: 'desc',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  const version: AssessmentVersionRow = {
    id: 'v1',
    assessment_id: 'a1',
    version: '1.0.0',
    lifecycle_status: 'PUBLISHED',
    published_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  const assessmentIntro: AssessmentIntroRow = {
    assessment_version_id: 'v1',
    intro_title: 'Welcome to WPLP-80',
    intro_summary: 'Measure the patterns that shape how you work.',
    intro_how_it_works: 'Work through each prompt and choose the option that fits best.',
    estimated_time_override: 'About 18 minutes',
    instructions: 'Answer from your typical behaviour.',
    confidentiality_note: 'Responses are handled confidentially.',
  };

  const domains: DomainRow[] = [
    {
      id: 'd2',
      assessment_version_id: 'v1',
      domain_key: 'signals',
      label: 'Signals',
      description: null,
      domain_type: 'SIGNAL_GROUP',
      order_index: 2,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'd1',
      assessment_version_id: 'v1',
      domain_key: 'section',
      label: 'Section',
      description: null,
      domain_type: 'QUESTION_SECTION',
      order_index: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  const signals: SignalRow[] = [
    {
      id: 's2',
      assessment_version_id: 'v1',
      domain_id: 'd2',
      signal_key: 'role_executor',
      label: 'Role Executor',
      description: null,
      order_index: 2,
      is_overlay: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 's1',
      assessment_version_id: 'v1',
      domain_id: 'd2',
      signal_key: 'core_focus',
      label: 'Core Focus',
      description: null,
      order_index: 1,
      is_overlay: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  const questions: QuestionRow[] = [
    {
      id: 'q2',
      assessment_version_id: 'v1',
      domain_id: 'd1',
      question_key: 'q2',
      prompt: 'Second?',
      order_index: 2,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'q1',
      assessment_version_id: 'v1',
      domain_id: 'd1',
      question_key: 'q1',
      prompt: 'First?',
      order_index: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  const options: OptionRow[] = [
    {
      id: 'o2',
      assessment_version_id: 'v1',
      question_id: 'q1',
      option_key: 'q1_b',
      option_label: 'B',
      option_text: 'Option B',
      order_index: 2,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'o1',
      assessment_version_id: 'v1',
      question_id: 'q1',
      option_key: 'q1_a',
      option_label: 'A',
      option_text: 'Option A',
      order_index: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'o3',
      assessment_version_id: 'v1',
      question_id: 'q2',
      option_key: 'q2_a',
      option_label: 'A',
      option_text: 'Option C',
      order_index: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  const optionSignalWeights: OptionSignalWeightRow[] = [
    {
      id: 'w1',
      option_id: 'o1',
      signal_id: 's1',
      weight: 1,
      source_weight_key: '1|A',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'w2',
      option_id: 'o2',
      signal_id: 's2',
      weight: 2,
      source_weight_key: '1|B',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'w3',
      option_id: 'o3',
      signal_id: 's1',
      weight: 3,
      source_weight_key: '2|A',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  return { assessment, version, assessmentIntro, domains, signals, questions, options, optionSignalWeights };
}

function createFakeDb(data: {
  assessmentByKey?: AssessmentRow;
  publishedVersion?: AssessmentVersionRow;
  versionById?: AssessmentVersionRow;
  versionByAssessmentAndVersion?: AssessmentVersionRow;
  graph?: DefinitionGraphRows;
}): Queryable {
  return {
    async query<T>(text: string, _params?: unknown[]) {
      if (text.includes('FROM assessments') && text.includes('assessment_key = $1')) {
        return { rows: (data.assessmentByKey ? [data.assessmentByKey] : []) as T[] };
      }

      if (text.includes('FROM assessment_versions') && text.includes("lifecycle_status = 'PUBLISHED'")) {
        return { rows: (data.publishedVersion ? [data.publishedVersion] : []) as T[] };
      }

      if (text.includes('FROM assessment_versions') && text.includes('WHERE id = $1')) {
        return { rows: (data.versionById ? [data.versionById] : []) as T[] };
      }

      if (text.includes('INNER JOIN assessments a ON a.id = av.assessment_id') && text.includes('av.version = $2')) {
        return { rows: (data.versionByAssessmentAndVersion ? [data.versionByAssessmentAndVersion] : []) as T[] };
      }

      if (text.includes('row_to_json(a.*) AS a')) {
        if (!data.graph) {
          return { rows: [] as T[] };
        }

        return { rows: ([{ a: data.graph.assessment, v: data.graph.version }] as unknown[]) as T[] };
      }

      if (text.includes('FROM assessment_version_intro')) {
        return { rows: ((data.graph?.assessmentIntro ? [data.graph.assessmentIntro] : []) as unknown[]) as T[] };
      }

      if (text.includes('FROM domains')) {
        return { rows: ((data.graph?.domains ?? []) as unknown[]) as T[] };
      }

      if (text.includes('FROM signals')) {
        return { rows: ((data.graph?.signals ?? []) as unknown[]) as T[] };
      }

      if (text.includes('FROM questions') && !text.includes('INNER JOIN')) {
        return { rows: ((data.graph?.questions ?? []) as unknown[]) as T[] };
      }

      if (text.includes('FROM options o')) {
        return { rows: ((data.graph?.options ?? []) as unknown[]) as T[] };
      }

      if (text.includes('FROM option_signal_weights')) {
        return { rows: ((data.graph?.optionSignalWeights ?? []) as unknown[]) as T[] };
      }

      return { rows: [] as T[] };
    },
  };
}

test('assembles a minimal valid runtime definition', () => {
  const graph = buildGraphRows();
  const definition = assembleRuntimeAssessmentDefinition(graph);

  assert.equal(definition.assessment.key, 'wplp80');
  assert.equal(definition.version.versionTag, '1.0.0');
  assert.equal(definition.assessmentIntro?.introTitle, 'Welcome to WPLP-80');
  assert.equal(definition.questions.length, 2);
  assert.equal(definition.questions[0]?.options.length, 2);
  assert.equal(definition.questions[0]?.options[0]?.signalWeights.length, 1);
});

test('preserves ordering for domains, signals, questions, and options', () => {
  const definition = assembleRuntimeAssessmentDefinition(buildGraphRows());

  assert.deepEqual(definition.domains.map((d) => d.id), ['d1', 'd2']);
  assert.deepEqual(definition.signals.map((s) => s.id), ['s1', 's2']);
  assert.deepEqual(definition.questions.map((q) => q.id), ['q1', 'q2']);
  assert.deepEqual(definition.questions[0]?.options.map((o) => o.id), ['o1', 'o2']);
});

test('resolves published version by assessment key', async () => {
  const graph = buildGraphRows();
  const repo = createAssessmentDefinitionRepository({
    db: createFakeDb({
      assessmentByKey: graph.assessment,
      publishedVersion: graph.version,
      graph,
    }),
  });

  const result = await repo.getPublishedAssessmentDefinitionByKey('wplp80');
  assert.ok(result);
  assert.equal(result.version.id, 'v1');
  assert.equal(result.assessmentIntro?.estimatedTimeOverride, 'About 18 minutes');
});

test('loads explicit version by assessmentVersionId and by assessmentKey+version', async () => {
  const graph = buildGraphRows();
  const repo = createAssessmentDefinitionRepository({
    db: createFakeDb({
      versionById: graph.version,
      versionByAssessmentAndVersion: graph.version,
      graph,
    }),
  });

  const byId = await repo.getAssessmentDefinitionByVersion({ assessmentVersionId: 'v1' });
  const byKeyVersion = await repo.getAssessmentDefinitionByVersion({ assessmentKey: 'wplp80', version: '1.0.0' });

  assert.ok(byId);
  assert.ok(byKeyVersion);
  assert.equal(byId.assessment.id, byKeyVersion.assessment.id);
});

test('returns null for not-found assessment and versions', async () => {
  const repo = createAssessmentDefinitionRepository({ db: createFakeDb({}) });

  const published = await repo.getPublishedAssessmentDefinitionByKey('missing');
  const explicit = await repo.getAssessmentDefinitionByVersion({ assessmentVersionId: 'missing' });

  assert.equal(published, null);
  assert.equal(explicit, null);
});

test('returns null assessmentIntro when no intro row exists for the resolved version', async () => {
  const graph = buildGraphRows();
  const repo = createAssessmentDefinitionRepository({
    db: createFakeDb({
      assessmentByKey: graph.assessment,
      publishedVersion: graph.version,
      graph: {
        ...graph,
        assessmentIntro: null,
      },
    }),
  });

  const result = await repo.getPublishedAssessmentDefinitionByKey('wplp80');

  assert.ok(result);
  assert.equal(result.assessmentIntro, null);
});

test('published runtime definition reads intro from the published version, not a different draft version', async () => {
  const publishedGraph = buildGraphRows();
  const draftGraph: DefinitionGraphRows = {
    ...buildGraphRows(),
    version: {
      ...buildGraphRows().version,
      id: 'v2',
      version: '1.1.0',
      lifecycle_status: 'DRAFT',
      published_at: null,
    },
    assessmentIntro: {
      assessment_version_id: 'v2',
      intro_title: 'Draft intro only',
      intro_summary: 'Draft summary',
      intro_how_it_works: 'Draft how it works',
      estimated_time_override: 'Draft timing',
      instructions: 'Draft instructions',
      confidentiality_note: 'Draft confidentiality',
    },
  };

  const db: Queryable = {
    async query<T>(text: string) {
      if (text.includes('FROM assessments') && text.includes('assessment_key = $1')) {
        return { rows: [publishedGraph.assessment] as T[] };
      }

      if (text.includes('FROM assessment_versions') && text.includes("lifecycle_status = 'PUBLISHED'")) {
        return { rows: [publishedGraph.version] as T[] };
      }

      if (text.includes('row_to_json(a.*) AS a')) {
        return { rows: ([{ a: publishedGraph.assessment, v: publishedGraph.version }] as unknown[]) as T[] };
      }

      if (text.includes('FROM assessment_version_intro')) {
        return { rows: ([publishedGraph.assessmentIntro] as unknown[]) as T[] };
      }

      if (text.includes('FROM domains')) {
        return { rows: (publishedGraph.domains as unknown[]) as T[] };
      }

      if (text.includes('FROM signals')) {
        return { rows: (publishedGraph.signals as unknown[]) as T[] };
      }

      if (text.includes('FROM questions') && !text.includes('INNER JOIN')) {
        return { rows: (publishedGraph.questions as unknown[]) as T[] };
      }

      if (text.includes('FROM options o')) {
        return { rows: (publishedGraph.options as unknown[]) as T[] };
      }

      if (text.includes('FROM option_signal_weights')) {
        return { rows: (publishedGraph.optionSignalWeights as unknown[]) as T[] };
      }

      return { rows: [] as T[] };
    },
  };

  const repo = createAssessmentDefinitionRepository({ db });
  const result = await repo.getPublishedAssessmentDefinitionByKey('wplp80');

  assert.ok(result);
  assert.equal(result.version.id, 'v1');
  assert.notEqual(draftGraph.assessmentIntro?.introTitle, result.assessmentIntro?.introTitle);
  assert.equal(result.assessmentIntro?.introTitle, 'Welcome to WPLP-80');
});

test('throws graph integrity error when linked data is missing', () => {
  const graph = buildGraphRows();
  graph.optionSignalWeights.push({
    id: 'w-missing',
    option_id: 'o-missing',
    signal_id: 's1',
    weight: 1,
    source_weight_key: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  });

  assert.throws(() => assembleRuntimeAssessmentDefinition(graph), DefinitionGraphIntegrityError);
});

test('preserves WPLP-80 compatibility fields (domain source + overlay)', () => {
  const definition = assembleRuntimeAssessmentDefinition(buildGraphRows());

  assert.equal(definition.domains[0]?.source, 'question_section');
  assert.equal(definition.domains[1]?.source, 'signal_group');
  assert.equal(definition.signals[1]?.isOverlay, true);
  assert.equal(definition.signals[1]?.overlayType, 'role');
});
