import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getNextAssessmentVersionTag,
  incrementAssessmentVersionTag,
  initialAdminAssessmentVersionActionState,
} from '@/lib/admin/admin-assessment-versioning';
import {
  createDraftVersionActionWithDependencies,
  createNextDraftAssessmentVersionRecords,
  publishDraftAssessmentVersionRecords,
  publishDraftVersionActionWithDependencies,
} from '@/lib/server/admin-assessment-versioning';

type StoredAssessment = {
  id: string;
  assessmentKey: string;
  title?: string;
  description?: string | null;
};

type StoredVersion = {
  id: string;
  assessmentId: string;
  versionTag: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  titleOverride: string | null;
  descriptionOverride: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoredDomain = {
  id: string;
  assessmentVersionId: string;
  domainKey: string;
  label: string;
  description: string | null;
  domainType: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  orderIndex: number;
};

type StoredSignal = {
  id: string;
  assessmentVersionId: string;
  domainId: string;
  signalKey: string;
  label: string;
  description: string | null;
  orderIndex: number;
  isOverlay: boolean;
};

type StoredQuestion = {
  id: string;
  assessmentVersionId: string;
  domainId: string;
  questionKey: string;
  prompt: string;
  orderIndex: number;
};

type StoredOption = {
  id: string;
  assessmentVersionId: string;
  questionId: string;
  optionKey: string;
  optionLabel: string | null;
  optionText: string;
  orderIndex: number;
};

type StoredWeight = {
  id: string;
  optionId: string;
  signalId: string;
  weight: string;
  sourceWeightKey: string | null;
};

function createFakeDb(seed?: {
  assessments?: StoredAssessment[];
  versions?: StoredVersion[];
  domains?: StoredDomain[];
  signals?: StoredSignal[];
  questions?: StoredQuestion[];
  options?: StoredOption[];
  weights?: StoredWeight[];
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    domains: [...(seed?.domains ?? [])],
    signals: [...(seed?.signals ?? [])],
    questions: [...(seed?.questions ?? [])],
    options: [...(seed?.options ?? [])],
    weights: [...(seed?.weights ?? [])],
  };

  function nextId(prefix: string, length: number) {
    return `${prefix}-${length + 1}`;
  }

  return {
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        if (text.includes('FROM assessments') && text.includes('WHERE assessment_key = $1')) {
          const assessmentKey = params?.[0] as string;
          const assessment = state.assessments.find((item) => item.assessmentKey === assessmentKey);
          return {
            rows: (assessment
              ? [{
                  id: assessment.id,
                  assessment_key: assessment.assessmentKey,
                  title: assessment.title ?? assessment.assessmentKey.toUpperCase(),
                  description: assessment.description ?? null,
                  created_at: '2026-03-01T00:00:00.000Z',
                  updated_at: '2026-03-01T00:00:00.000Z',
                }]
              : []) as T[],
          };
        }

        if (text.includes('FROM assessment_versions') && text.includes('WHERE id = $1')) {
          const versionId = params?.[0] as string;
          const version = state.versions.find((item) => item.id === versionId);
          return {
            rows: (version
              ? [{
                  id: version.id,
                  assessment_id: version.assessmentId,
                  version: version.versionTag,
                  lifecycle_status: version.lifecycleStatus,
                  published_at: version.publishedAt,
                  created_at: version.createdAt,
                  updated_at: version.updatedAt,
                }]
              : []) as T[],
          };
        }

        if (text.includes('row_to_json(a.*) AS a') && text.includes('row_to_json(av.*) AS v')) {
          const versionId = params?.[0] as string;
          const version = state.versions.find((item) => item.id === versionId);
          const assessment = version
            ? state.assessments.find((item) => item.id === version.assessmentId) ?? null
            : null;
          return {
            rows: (version && assessment
              ? [{
                  a: {
                    id: assessment.id,
                    assessment_key: assessment.assessmentKey,
                    title: assessment.title ?? assessment.assessmentKey.toUpperCase(),
                    description: assessment.description ?? null,
                    created_at: '2026-03-01T00:00:00.000Z',
                    updated_at: '2026-03-01T00:00:00.000Z',
                  },
                  v: {
                    id: version.id,
                    assessment_id: version.assessmentId,
                    version: version.versionTag,
                    lifecycle_status: version.lifecycleStatus,
                    published_at: version.publishedAt,
                    created_at: version.createdAt,
                    updated_at: version.updatedAt,
                  },
                }]
              : []) as T[],
          };
        }

        if (text.includes('FROM assessments a') && text.includes('INNER JOIN assessment_versions av ON av.assessment_id = a.id')) {
          const assessmentKey = params?.[0] as string;
          const assessment = state.assessments.find((item) => item.assessmentKey === assessmentKey);
          if (!assessment) {
            return { rows: [] as T[] };
          }

          const rows = state.versions
            .filter((version) => version.assessmentId === assessment.id)
            .map((version) => ({
              assessment_id: assessment.id,
              assessment_version_id: version.id,
              version_tag: version.versionTag,
              lifecycle_status: version.lifecycleStatus,
              title_override: version.titleOverride,
              description_override: version.descriptionOverride,
              published_at: version.publishedAt,
              created_at: version.createdAt,
              updated_at: version.updatedAt,
            }));

          return { rows: rows as T[] };
        }

        if (text.includes('LEFT JOIN LATERAL') && text.includes('draft_version_id')) {
          const assessmentKey = params?.[0] as string;
          const assessment = state.assessments.find((item) => item.assessmentKey === assessmentKey);
          const draft = assessment
            ? state.versions
                .filter((version) => version.assessmentId === assessment.id && version.lifecycleStatus === 'DRAFT')
                .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
            : null;

          if (!assessment) {
            return { rows: [] as T[] };
          }

          return {
            rows: [
              {
                assessment_id: assessment.id,
                assessment_key: assessment.assessmentKey,
                draft_version_id: draft?.id ?? null,
                draft_version_tag: draft?.versionTag ?? null,
              },
            ] as T[],
          };
        }

        if (text.includes('AS domain_count') && text.includes('AS signal_count')) {
          const draftVersionId = params?.[0] as string;
          const domainIds = new Set(
            state.domains
              .filter((domain) => domain.assessmentVersionId === draftVersionId)
              .map((domain) => domain.id),
          );
          const signals = state.signals.filter((signal) => signal.assessmentVersionId === draftVersionId);

          return {
            rows: [
              {
                domain_count: String(domainIds.size),
                signal_count: String(signals.length),
                orphan_signal_count: String(
                  signals.filter((signal) => !domainIds.has(signal.domainId)).length,
                ),
                cross_version_signal_count: '0',
              },
            ] as T[],
          };
        }

        if (text.includes('AS question_count') && text.includes('questions_without_options_count')) {
          const draftVersionId = params?.[0] as string;
          const questionIds = state.questions
            .filter((question) => question.assessmentVersionId === draftVersionId)
            .map((question) => question.id);
          const questionIdSet = new Set(questionIds);
          const optionCount = state.options.filter((option) => questionIdSet.has(option.questionId)).length;
          const questionsWithoutOptionsCount = questionIds.filter(
            (questionId) => !state.options.some((option) => option.questionId === questionId),
          ).length;

          return {
            rows: [
              {
                question_count: String(questionIds.length),
                option_count: String(optionCount),
                questions_without_options_count: String(questionsWithoutOptionsCount),
                orphan_question_count: '0',
                cross_version_question_count: '0',
                orphan_option_count: '0',
                cross_version_option_count: '0',
              },
            ] as T[],
          };
        }

        if (text.includes('AS weighted_option_count') && text.includes('cross_version_weight_signal_count')) {
          const draftVersionId = params?.[0] as string;
          const questionIds = new Set(
            state.questions
              .filter((question) => question.assessmentVersionId === draftVersionId)
              .map((question) => question.id),
          );
          const optionIds = state.options
            .filter((option) => questionIds.has(option.questionId))
            .map((option) => option.id);
          const optionIdSet = new Set(optionIds);
          const signalIds = new Set(
            state.signals
              .filter((signal) => signal.assessmentVersionId === draftVersionId)
              .map((signal) => signal.id),
          );
          const weightsForDraft = state.weights.filter(
            (weight) => optionIdSet.has(weight.optionId) && signalIds.has(weight.signalId),
          );
          const weightedOptionIds = new Set(weightsForDraft.map((weight) => weight.optionId));
          const unmappedOptionCount = optionIds.filter((optionId) => !weightedOptionIds.has(optionId)).length;

          return {
            rows: [
              {
                weighted_option_count: String(weightedOptionIds.size),
                unmapped_option_count: String(unmappedOptionCount),
                weight_mapping_count: String(weightsForDraft.length),
                orphan_weight_option_count: '0',
                orphan_weight_signal_count: '0',
                cross_version_weight_option_count: '0',
                cross_version_weight_signal_count: '0',
              },
            ] as T[],
          };
        }

        if (text.includes("UPDATE assessment_versions") && text.includes("lifecycle_status = 'ARCHIVED'")) {
          const [assessmentId, excludedId] = params as [string, string];
          for (const version of state.versions) {
            if (version.assessmentId === assessmentId && version.lifecycleStatus === 'PUBLISHED' && version.id !== excludedId) {
              version.lifecycleStatus = 'ARCHIVED';
              version.updatedAt = '2026-03-29T10:00:00.000Z';
            }
          }
          return { rows: [] as T[] };
        }

        if (text.includes("UPDATE assessment_versions") && text.includes("lifecycle_status = 'PUBLISHED'")) {
          const [versionId, assessmentId] = params as [string, string];
          const match = state.versions.find(
            (version) => version.id === versionId && version.assessmentId === assessmentId && version.lifecycleStatus === 'DRAFT',
          );
          if (match) {
            match.lifecycleStatus = 'PUBLISHED';
            match.publishedAt = '2026-03-29T10:00:00.000Z';
            match.updatedAt = '2026-03-29T10:00:00.000Z';
            return { rows: ([{ id: match.id }] as unknown) as T[] };
          }
          return { rows: [] as T[] };
        }

        if (text.includes('INSERT INTO assessment_versions')) {
          const versionId = nextId('version', state.versions.length);
          state.versions.push({
            id: versionId,
            assessmentId: params?.[0] as string,
            versionTag: params?.[1] as string,
            lifecycleStatus: 'DRAFT',
            titleOverride: (params?.[2] as string | null) ?? null,
            descriptionOverride: (params?.[3] as string | null) ?? null,
            publishedAt: null,
            createdAt: '2026-03-29T10:00:00.000Z',
            updatedAt: '2026-03-29T10:00:00.000Z',
          });
          return { rows: ([{ id: versionId }] as unknown) as T[] };
        }

        if (text.includes('FROM domains') && text.includes('WHERE assessment_version_id = $1')) {
          const assessmentVersionId = params?.[0] as string;
          const rows = state.domains
            .filter((domain) => domain.assessmentVersionId === assessmentVersionId)
            .map((domain) => ({
              id: domain.id,
              assessment_version_id: domain.assessmentVersionId,
              domain_id: domain.id,
              domain_key: domain.domainKey,
              label: domain.label,
              description: domain.description,
              domain_type: domain.domainType,
              order_index: domain.orderIndex,
              created_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-01T00:00:00.000Z',
            }));
          return { rows: rows as T[] };
        }

        if (text.includes('INSERT INTO domains')) {
          const id = nextId('domain', state.domains.length);
          state.domains.push({
            id,
            assessmentVersionId: params?.[0] as string,
            domainKey: params?.[1] as string,
            label: params?.[2] as string,
            description: (params?.[3] as string | null) ?? null,
            domainType: params?.[4] as 'QUESTION_SECTION' | 'SIGNAL_GROUP',
            orderIndex: params?.[5] as number,
          });
          return { rows: ([{ id }] as unknown) as T[] };
        }

        if (text.includes('FROM signals') && text.includes('WHERE assessment_version_id = $1')) {
          const assessmentVersionId = params?.[0] as string;
          const rows = state.signals
            .filter((signal) => signal.assessmentVersionId === assessmentVersionId)
            .map((signal) => ({
              id: signal.id,
              assessment_version_id: signal.assessmentVersionId,
              signal_id: signal.id,
              domain_id: signal.domainId,
              signal_key: signal.signalKey,
              label: signal.label,
              description: signal.description,
              order_index: signal.orderIndex,
              is_overlay: signal.isOverlay,
              created_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-01T00:00:00.000Z',
            }));
          return { rows: rows as T[] };
        }

        if (text.includes('INSERT INTO signals')) {
          const id = nextId('signal', state.signals.length);
          state.signals.push({
            id,
            assessmentVersionId: params?.[0] as string,
            domainId: params?.[1] as string,
            signalKey: params?.[2] as string,
            label: params?.[3] as string,
            description: (params?.[4] as string | null) ?? null,
            orderIndex: params?.[5] as number,
            isOverlay: params?.[6] as boolean,
          });
          return { rows: ([{ id }] as unknown) as T[] };
        }

        if (text.includes('FROM questions') && text.includes('WHERE assessment_version_id = $1')) {
          const assessmentVersionId = params?.[0] as string;
          const rows = state.questions
            .filter((question) => question.assessmentVersionId === assessmentVersionId)
            .map((question) => ({
              id: question.id,
              assessment_version_id: question.assessmentVersionId,
              question_id: question.id,
              domain_id: question.domainId,
              question_key: question.questionKey,
              prompt: question.prompt,
              order_index: question.orderIndex,
              created_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-01T00:00:00.000Z',
            }));
          return { rows: rows as T[] };
        }

        if (text.includes('INSERT INTO questions')) {
          const id = nextId('question', state.questions.length);
          state.questions.push({
            id,
            assessmentVersionId: params?.[0] as string,
            domainId: params?.[1] as string,
            questionKey: params?.[2] as string,
            prompt: params?.[3] as string,
            orderIndex: params?.[4] as number,
          });
          return { rows: ([{ id }] as unknown) as T[] };
        }

        if (text.includes('FROM options o') && text.includes('INNER JOIN questions q ON q.id = o.question_id')) {
          const assessmentVersionId = params?.[0] as string;
          const questionIds = new Set(
            state.questions
              .filter((question) => question.assessmentVersionId === assessmentVersionId)
              .map((question) => question.id),
          );
          const rows = state.options
            .filter((option) => questionIds.has(option.questionId))
            .map((option) => ({
              id: option.id,
              option_id: option.id,
              assessment_version_id: option.assessmentVersionId,
              question_id: option.questionId,
              option_key: option.optionKey,
              option_label: option.optionLabel,
              option_text: option.optionText,
              order_index: option.orderIndex,
              created_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-01T00:00:00.000Z',
            }));
          return { rows: rows as T[] };
        }

        if (text.includes('INSERT INTO options')) {
          const id = nextId('option', state.options.length);
          state.options.push({
            id,
            assessmentVersionId: params?.[0] as string,
            questionId: params?.[1] as string,
            optionKey: params?.[2] as string,
            optionLabel: (params?.[3] as string | null) ?? null,
            optionText: params?.[4] as string,
            orderIndex: params?.[5] as number,
          });
          return { rows: ([{ id }] as unknown) as T[] };
        }

        if (text.includes('FROM option_signal_weights osw')) {
          const assessmentVersionId = params?.[0] as string;
          const questionIds = new Set(
            state.questions
              .filter((question) => question.assessmentVersionId === assessmentVersionId)
              .map((question) => question.id),
          );
          const optionIds = new Set(
            state.options.filter((option) => questionIds.has(option.questionId)).map((option) => option.id),
          );
          const rows = state.weights
            .filter((weight) => optionIds.has(weight.optionId))
            .map((weight) => ({
              option_signal_weight_id: weight.id,
              id: weight.id,
              option_id: weight.optionId,
              signal_id: weight.signalId,
              weight: weight.weight,
              source_weight_key: weight.sourceWeightKey,
              created_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-01T00:00:00.000Z',
            }));
          return { rows: rows as T[] };
        }

        if (text.includes('INSERT INTO option_signal_weights')) {
          state.weights.push({
            id: nextId('weight', state.weights.length),
            optionId: params?.[0] as string,
            signalId: params?.[1] as string,
            weight: params?.[2] as string,
            sourceWeightKey: (params?.[3] as string | null) ?? null,
          });
          return { rows: [] as T[] };
        }

        return { rows: [] as T[] };
      },
    },
    state,
  };
}

test('increments assessment version tags deterministically', () => {
  assert.equal(incrementAssessmentVersionTag('1.0.0'), '1.0.1');
  assert.equal(getNextAssessmentVersionTag(['1.0.0', '1.0.9', '1.0.10']), '1.0.11');
});

test('publishes the selected draft and archives the previously published version', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [
      {
        id: 'version-1',
        assessmentId: 'assessment-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'PUBLISHED',
        titleOverride: null,
        descriptionOverride: null,
        publishedAt: '2026-03-01T00:00:00.000Z',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
      {
        id: 'version-2',
        assessmentId: 'assessment-1',
        versionTag: '1.0.1',
        lifecycleStatus: 'DRAFT',
        titleOverride: null,
        descriptionOverride: null,
        publishedAt: null,
        createdAt: '2026-03-02T00:00:00.000Z',
        updatedAt: '2026-03-02T00:00:00.000Z',
      },
    ],
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-2',
        domainKey: 'section-one',
        label: 'Section One',
        description: null,
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-2',
        domainKey: 'leadership',
        label: 'Leadership',
        description: null,
        domainType: 'SIGNAL_GROUP',
        orderIndex: 1,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-2',
        domainId: 'domain-2',
        signalKey: 'directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
        isOverlay: false,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-2',
        domainId: 'domain-1',
        questionKey: 'decision-speed',
        prompt: 'I make decisions quickly when direction is clear.',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-2',
        questionId: 'question-1',
        optionKey: 'agree',
        optionLabel: 'A',
        optionText: 'Agree',
        orderIndex: 0,
      },
    ],
    weights: [
      {
        id: 'weight-1',
        optionId: 'option-1',
        signalId: 'signal-1',
        weight: '1.0000',
        sourceWeightKey: '1|A',
      },
    ],
  });

  const result = await publishDraftAssessmentVersionRecords({
    db: fake.db,
    assessmentKey: 'wplp80',
    draftVersionId: 'version-2',
  });

  assert.equal(result.publishedVersionTag, '1.0.1');
  assert.equal(fake.state.versions.find((version) => version.id === 'version-1')?.lifecycleStatus, 'ARCHIVED');
  assert.equal(fake.state.versions.find((version) => version.id === 'version-2')?.lifecycleStatus, 'PUBLISHED');
});

test('creates a new draft version by duplicating canonical authoring structure from the published version', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [
      {
        id: 'version-1',
        assessmentId: 'assessment-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'PUBLISHED',
        titleOverride: 'Published title',
        descriptionOverride: 'Published description',
        publishedAt: '2026-03-01T00:00:00.000Z',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section One',
        description: null,
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-1',
        domainKey: 'leadership',
        label: 'Leadership',
        description: null,
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-2',
        signalKey: 'directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
        isOverlay: false,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'decision-speed',
        prompt: 'I make decisions quickly when direction is clear.',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'agree',
        optionLabel: 'A',
        optionText: 'Agree',
        orderIndex: 0,
      },
    ],
    weights: [
      {
        id: 'weight-1',
        optionId: 'option-1',
        signalId: 'signal-1',
        weight: '1.2500',
        sourceWeightKey: '1|A',
      },
    ],
  });

  const result = await createNextDraftAssessmentVersionRecords({
    db: fake.db,
    assessmentKey: 'wplp80',
  });

  assert.equal(result.draftVersionTag, '1.0.1');
  assert.equal(result.sourceVersionTag, '1.0.0');

  const newVersion = fake.state.versions.find((version) => version.id === result.draftVersionId);
  assert.equal(newVersion?.lifecycleStatus, 'DRAFT');
  assert.equal(newVersion?.titleOverride, 'Published title');

  const newDomains = fake.state.domains.filter((domain) => domain.assessmentVersionId === result.draftVersionId);
  const newSignals = fake.state.signals.filter((signal) => signal.assessmentVersionId === result.draftVersionId);
  const newQuestions = fake.state.questions.filter((question) => question.assessmentVersionId === result.draftVersionId);
  const newQuestionIds = new Set(newQuestions.map((question) => question.id));
  const newOptions = fake.state.options.filter((option) => newQuestionIds.has(option.questionId));
  const newOptionIds = new Set(newOptions.map((option) => option.id));
  const newSignalIds = new Set(newSignals.map((signal) => signal.id));
  const newWeights = fake.state.weights.filter(
    (weight) => newOptionIds.has(weight.optionId) && newSignalIds.has(weight.signalId),
  );

  assert.equal(newDomains.length, 2);
  assert.equal(newSignals.length, 1);
  assert.equal(newQuestions.length, 1);
  assert.equal(newOptions.length, 1);
  assert.equal(newWeights.length, 1);
  assert.equal(newWeights[0]?.sourceWeightKey, '1|A');
});

test('publish action revalidates dashboard and detail routes after success', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [
      {
        id: 'version-1',
        assessmentId: 'assessment-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'DRAFT',
        titleOverride: null,
        descriptionOverride: null,
        publishedAt: null,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section One',
        description: null,
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-1',
        domainKey: 'leadership',
        label: 'Leadership',
        description: null,
        domainType: 'SIGNAL_GROUP',
        orderIndex: 1,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-2',
        signalKey: 'directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
        isOverlay: false,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'decision-speed',
        prompt: 'I make decisions quickly when direction is clear.',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'agree',
        optionLabel: 'A',
        optionText: 'Agree',
        orderIndex: 0,
      },
    ],
    weights: [
      {
        id: 'weight-1',
        optionId: 'option-1',
        signalId: 'signal-1',
        weight: '1.0000',
        sourceWeightKey: '1|A',
      },
    ],
  });

  const revalidatedPaths: string[] = [];

  const result = await publishDraftVersionActionWithDependencies(
    {
      assessmentKey: 'wplp80',
      assessmentVersionId: 'version-1',
    },
    initialAdminAssessmentVersionActionState,
    new FormData(),
    {
      getDbPool: () => ({
        async connect() {
          return {
            async query<T>(text: string, params?: readonly unknown[]) {
              if (text.trim() === 'BEGIN' || text.trim() === 'COMMIT') {
                return { rows: [] as T[] };
              }
              return fake.db.query<T>(text, params);
            },
            release() {},
          };
        },
      }),
      revalidatePath(path: string): void {
        revalidatedPaths.push(path);
      },
    },
  );

  assert.equal(result.formError, null);
  assert.ok(result.formSuccess?.includes('1.0.0'));
  assert.ok(result.formWarnings.length > 0);
  assert.deepEqual(revalidatedPaths, ['/admin/assessments', '/admin/assessments/wplp80']);
});

test('publish action returns an inline error when validation blocks readiness', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [
      {
        id: 'version-1',
        assessmentId: 'assessment-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'DRAFT',
        titleOverride: null,
        descriptionOverride: null,
        publishedAt: null,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section One',
        description: null,
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-1',
        domainKey: 'leadership',
        label: 'Leadership',
        description: null,
        domainType: 'SIGNAL_GROUP',
        orderIndex: 1,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-2',
        signalKey: 'directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
        isOverlay: false,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'decision-speed',
        prompt: 'I make decisions quickly when direction is clear.',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'agree',
        optionLabel: 'A',
        optionText: 'Agree',
        orderIndex: 0,
      },
    ],
  });

  const result = await publishDraftVersionActionWithDependencies(
    {
      assessmentKey: 'wplp80',
      assessmentVersionId: 'version-1',
    },
    initialAdminAssessmentVersionActionState,
    new FormData(),
    {
      getDbPool: () => ({
        async connect() {
          return {
            async query<T>(text: string, params?: readonly unknown[]) {
              if (text.trim() === 'BEGIN' || text.trim() === 'ROLLBACK') {
                return { rows: [] as T[] };
              }
              return fake.db.query<T>(text, params);
            },
            release() {},
          };
        },
      }),
      revalidatePath(): void {},
    },
  );

  assert.equal(
    result.formError,
    'The current draft is not publish-ready yet. Resolve the blocking validation issues before publishing.',
  );
  assert.equal(result.formSuccess, null);
  assert.deepEqual(result.formWarnings, []);
  assert.equal(fake.state.versions[0]?.lifecycleStatus, 'DRAFT');
});

test('publish action blocks when engine diagnostics detect runtime integrity errors', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [
      {
        id: 'version-1',
        assessmentId: 'assessment-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'DRAFT',
        titleOverride: null,
        descriptionOverride: null,
        publishedAt: null,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section One',
        description: null,
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-1',
        domainKey: 'leadership',
        label: 'Leadership',
        description: null,
        domainType: 'SIGNAL_GROUP',
        orderIndex: 1,
      },
      {
        id: 'domain-unused',
        assessmentVersionId: 'version-1',
        domainKey: 'unused',
        label: 'Unused',
        description: null,
        domainType: 'SIGNAL_GROUP',
        orderIndex: 2,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-2',
        signalKey: 'directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
        isOverlay: false,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'decision-speed',
        prompt: 'I make decisions quickly when direction is clear.',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'agree',
        optionLabel: 'A',
        optionText: 'Agree',
        orderIndex: 0,
      },
    ],
    weights: [
      {
        id: 'weight-1',
        optionId: 'option-1',
        signalId: 'signal-1',
        weight: '1.0000',
        sourceWeightKey: '1|A',
      },
    ],
  });

  const result = await publishDraftVersionActionWithDependencies(
    {
      assessmentKey: 'wplp80',
      assessmentVersionId: 'version-1',
    },
    initialAdminAssessmentVersionActionState,
    new FormData(),
    {
      getDbPool: () => ({
        async connect() {
          return {
            async query<T>(text: string, params?: readonly unknown[]) {
              if (text.trim() === 'BEGIN' || text.trim() === 'ROLLBACK') {
                return { rows: [] as T[] };
              }
              return fake.db.query<T>(text, params);
            },
            release() {},
          };
        },
      }),
      revalidatePath(): void {},
    },
  );

  assert.equal(
    result.formError,
    'The current draft failed engine diagnostics. Resolve the blocking engine issues before publishing.',
  );
  assert.equal(result.formSuccess, null);
  assert.deepEqual(result.formWarnings, []);
  assert.equal(fake.state.versions[0]?.lifecycleStatus, 'DRAFT');
});

test('create draft action returns an inline error when a draft already exists', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [
      {
        id: 'version-1',
        assessmentId: 'assessment-1',
        versionTag: '1.0.0',
        lifecycleStatus: 'PUBLISHED',
        titleOverride: null,
        descriptionOverride: null,
        publishedAt: '2026-03-01T00:00:00.000Z',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
      {
        id: 'version-2',
        assessmentId: 'assessment-1',
        versionTag: '1.0.1',
        lifecycleStatus: 'DRAFT',
        titleOverride: null,
        descriptionOverride: null,
        publishedAt: null,
        createdAt: '2026-03-02T00:00:00.000Z',
        updatedAt: '2026-03-02T00:00:00.000Z',
      },
    ],
  });

  const result = await createDraftVersionActionWithDependencies(
    {
      assessmentKey: 'wplp80',
    },
    initialAdminAssessmentVersionActionState,
    new FormData(),
    {
      getDbPool: () => ({
        async connect() {
          return {
            async query<T>(text: string, params?: readonly unknown[]) {
              if (text.trim() === 'BEGIN' || text.trim() === 'ROLLBACK') {
                return { rows: [] as T[] };
              }
              return fake.db.query<T>(text, params);
            },
            release() {},
          };
        },
      }),
      revalidatePath(): void {},
    },
  );

  assert.equal(
    result.formError,
    'A draft version already exists. Continue authoring that draft instead of creating another one.',
  );
  assert.equal(result.formSuccess, null);
  assert.deepEqual(result.formWarnings, []);
});


