import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDraftVersionFromLatestPublishedAssessment,
  getNextMajorAssessmentVersionTag,
} from '@/lib/server/admin-assessment-draft-version-service';

type StoredAssessment = {
  id: string;
  assessmentKey: string;
  mode: 'multi_domain' | 'single_domain';
};

type StoredVersion = {
  id: string;
  assessmentId: string;
  mode: 'multi_domain' | 'single_domain';
  version: string;
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

type GenericVersionOwnedRow = Record<string, unknown> & {
  id: string;
  assessment_version_id: string;
};

const BASE_TIME = '2026-04-01T00:00:00.000Z';

function buildSeed(overrides?: {
  versions?: StoredVersion[];
  includeDraft?: boolean;
  includePublished?: boolean;
}) {
  const assessments: StoredAssessment[] = [
    {
      id: 'assessment-1',
      assessmentKey: 'leadership-pattern',
      mode: 'single_domain',
    },
  ];

  const versions: StoredVersion[] = overrides?.versions ?? [
    ...(overrides?.includePublished === false
      ? []
      : [{
          id: 'version-1',
          assessmentId: 'assessment-1',
          mode: 'single_domain' as const,
          version: '1.00',
          lifecycleStatus: 'PUBLISHED' as const,
          titleOverride: 'Published title',
          descriptionOverride: 'Published description',
          publishedAt: BASE_TIME,
          createdAt: BASE_TIME,
          updatedAt: BASE_TIME,
        }]),
    ...(overrides?.includeDraft
      ? [{
          id: 'version-draft',
          assessmentId: 'assessment-1',
          mode: 'single_domain' as const,
          version: '2.00',
          lifecycleStatus: 'DRAFT' as const,
          titleOverride: 'Draft title',
          descriptionOverride: 'Draft description',
          publishedAt: null,
          createdAt: '2026-04-02T00:00:00.000Z',
          updatedAt: '2026-04-02T00:00:00.000Z',
        }]
      : []),
  ];

  return {
    assessments,
    versions,
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'results',
        label: 'Results',
        description: 'Results domain',
        domainType: 'QUESTION_SECTION' as const,
        orderIndex: 1,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'drive',
        label: 'Drive',
        description: 'Drive signal',
        orderIndex: 1,
        isOverlay: false,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q1',
        prompt: 'Question one?',
        orderIndex: 1,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'a',
        optionLabel: 'A',
        optionText: 'Answer A',
        orderIndex: 1,
      },
    ],
    weights: [
      {
        id: 'weight-1',
        optionId: 'option-1',
        signalId: 'signal-1',
        weight: '1.0000',
        sourceWeightKey: 'w1',
      },
    ],
    versionOwnedTables: new Map<string, GenericVersionOwnedRow[]>([
      [
        'assessment_version_language_assessment',
        [
          {
            id: 'language-assessment-1',
            assessment_version_id: 'version-1',
            section: 'assessment_description',
            content: 'Assessment description',
          },
        ],
      ],
      [
        'assessment_version_single_domain_driver_claims',
        [
          {
            id: 'driver-claim-1',
            assessment_version_id: 'version-1',
            domain_key: 'results',
            pair_key: 'drive_care',
            signal_key: 'drive',
            driver_role: 'primary_driver',
            claim_type: 'driver_primary',
            claim_text: 'Claim text',
            materiality: 'core',
            priority: 1,
          },
        ],
      ],
    ]),
    attempts: [{ id: 'attempt-1', assessmentVersionId: 'version-1' }],
    responses: [{ id: 'response-1', attemptId: 'attempt-1' }],
    results: [{ id: 'result-1', assessmentVersionId: 'version-1' }],
  };
}

function snakeVersion(row: StoredVersion) {
  return {
    id: row.id,
    assessment_id: row.assessmentId,
    mode: row.mode,
    version: row.version,
    lifecycle_status: row.lifecycleStatus,
    title_override: row.titleOverride,
    description_override: row.descriptionOverride,
    published_at: row.publishedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function createFakePool(seed = buildSeed()) {
  const state = seed;
  const transactionLog: string[] = [];

  function nextId(prefix: string, length: number) {
    return `${prefix}-${length + 1}`;
  }

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.trim();

      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        transactionLog.push(sql);
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessments') && sql.includes('WHERE assessment_key = $1')) {
        const assessmentKeyOrId = params?.[0] as string;
        const assessment = state.assessments.find(
          (row) => row.assessmentKey === assessmentKeyOrId || row.id === assessmentKeyOrId,
        );

        return {
          rows: (assessment
            ? [{
                id: assessment.id,
                assessment_key: assessment.assessmentKey,
                mode: assessment.mode,
              }]
            : []) as T[],
        };
      }

      if (sql.includes('FROM assessment_versions') && sql.includes('lifecycle_status = $2')) {
        const assessmentId = params?.[0] as string;
        const lifecycleStatus = params?.[1] as StoredVersion['lifecycleStatus'];
        const versions = state.versions
          .filter((row) => row.assessmentId === assessmentId && row.lifecycleStatus === lifecycleStatus)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

        return { rows: versions.slice(0, 1).map(snakeVersion) as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_versions')) {
        const version: StoredVersion = {
          id: nextId('version', state.versions.length),
          assessmentId: params?.[0] as string,
          mode: params?.[1] as StoredVersion['mode'],
          version: params?.[2] as string,
          lifecycleStatus: 'DRAFT',
          titleOverride: params?.[3] as string | null,
          descriptionOverride: params?.[4] as string | null,
          publishedAt: null,
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
        };
        state.versions.push(version);
        return { rows: [{ id: version.id }] as T[] };
      }

      if (sql.includes('FROM domains')) {
        const sourceVersionId = params?.[0] as string;
        return {
          rows: state.domains
            .filter((row) => row.assessmentVersionId === sourceVersionId)
            .map((row) => ({
              id: row.id,
              domain_key: row.domainKey,
              label: row.label,
              description: row.description,
              domain_type: row.domainType,
              order_index: row.orderIndex,
            })) as T[],
        };
      }

      if (sql.startsWith('INSERT INTO domains')) {
        const domain: StoredDomain = {
          id: nextId('domain', state.domains.length),
          assessmentVersionId: params?.[0] as string,
          domainKey: params?.[1] as string,
          label: params?.[2] as string,
          description: params?.[3] as string | null,
          domainType: params?.[4] as StoredDomain['domainType'],
          orderIndex: params?.[5] as number,
        };
        state.domains.push(domain);
        return { rows: [{ id: domain.id }] as T[] };
      }

      if (sql.includes('FROM signals')) {
        const sourceVersionId = params?.[0] as string;
        return {
          rows: state.signals
            .filter((row) => row.assessmentVersionId === sourceVersionId)
            .map((row) => ({
              id: row.id,
              domain_id: row.domainId,
              signal_key: row.signalKey,
              label: row.label,
              description: row.description,
              order_index: row.orderIndex,
              is_overlay: row.isOverlay,
            })) as T[],
        };
      }

      if (sql.startsWith('INSERT INTO signals')) {
        const signal: StoredSignal = {
          id: nextId('signal', state.signals.length),
          assessmentVersionId: params?.[0] as string,
          domainId: params?.[1] as string,
          signalKey: params?.[2] as string,
          label: params?.[3] as string,
          description: params?.[4] as string | null,
          orderIndex: params?.[5] as number,
          isOverlay: params?.[6] as boolean,
        };
        state.signals.push(signal);
        return { rows: [{ id: signal.id }] as T[] };
      }

      if (sql.includes('FROM questions')) {
        const sourceVersionId = params?.[0] as string;
        return {
          rows: state.questions
            .filter((row) => row.assessmentVersionId === sourceVersionId)
            .map((row) => ({
              id: row.id,
              domain_id: row.domainId,
              question_key: row.questionKey,
              prompt: row.prompt,
              order_index: row.orderIndex,
            })) as T[],
        };
      }

      if (sql.startsWith('INSERT INTO questions')) {
        const question: StoredQuestion = {
          id: nextId('question', state.questions.length),
          assessmentVersionId: params?.[0] as string,
          domainId: params?.[1] as string,
          questionKey: params?.[2] as string,
          prompt: params?.[3] as string,
          orderIndex: params?.[4] as number,
        };
        state.questions.push(question);
        return { rows: [{ id: question.id }] as T[] };
      }

      if (sql.includes('FROM options') && !sql.startsWith('INSERT INTO options')) {
        const sourceVersionId = params?.[0] as string;
        return {
          rows: state.options
            .filter((row) => row.assessmentVersionId === sourceVersionId)
            .map((row) => ({
              id: row.id,
              question_id: row.questionId,
              option_key: row.optionKey,
              option_label: row.optionLabel,
              option_text: row.optionText,
              order_index: row.orderIndex,
            })) as T[],
        };
      }

      if (sql.startsWith('INSERT INTO options')) {
        const option: StoredOption = {
          id: nextId('option', state.options.length),
          assessmentVersionId: params?.[0] as string,
          questionId: params?.[1] as string,
          optionKey: params?.[2] as string,
          optionLabel: params?.[3] as string | null,
          optionText: params?.[4] as string,
          orderIndex: params?.[5] as number,
        };
        state.options.push(option);
        return { rows: [{ id: option.id }] as T[] };
      }

      if (sql.includes('FROM option_signal_weights')) {
        const sourceVersionId = params?.[0] as string;
        const sourceOptionIds = new Set(
          state.options
            .filter((row) => row.assessmentVersionId === sourceVersionId)
            .map((row) => row.id),
        );

        return {
          rows: state.weights
            .filter((row) => sourceOptionIds.has(row.optionId))
            .map((row) => ({
              option_id: row.optionId,
              signal_id: row.signalId,
              weight: row.weight,
              source_weight_key: row.sourceWeightKey,
            })) as T[],
        };
      }

      if (sql.startsWith('INSERT INTO option_signal_weights')) {
        const weight: StoredWeight = {
          id: nextId('weight', state.weights.length),
          optionId: params?.[0] as string,
          signalId: params?.[1] as string,
          weight: params?.[2] as string,
          sourceWeightKey: params?.[3] as string | null,
        };
        state.weights.push(weight);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_')) {
        const tableName = /^INSERT INTO ([a-z0-9_]+)/.exec(sql)?.[1] ?? '';
        const rows = state.versionOwnedTables.get(tableName) ?? [];
        const sourceVersionId = params?.[0] as string;
        const draftVersionId = params?.[1] as string;
        const sourceRows = rows.filter((row) => row.assessment_version_id === sourceVersionId);
        const insertedRows = sourceRows.map((row, index) => ({
          ...row,
          id: `${tableName}-${rows.length + index + 1}`,
          assessment_version_id: draftVersionId,
        }));

        state.versionOwnedTables.set(tableName, [...rows, ...insertedRows]);
        return { rows: insertedRows.map((row) => ({ id: row.id })) as T[] };
      }

      throw new Error(`Unhandled SQL in fake DB: ${sql}`);
    },
    release() {
      transactionLog.push('RELEASE');
    },
  };

  return {
    state,
    transactionLog,
    pool: {
      async connect() {
        return client;
      },
    },
  };
}

test('getNextMajorAssessmentVersionTag increments major tags for draft version creation', () => {
  assert.equal(getNextMajorAssessmentVersionTag('1.00'), '2.00');
  assert.equal(getNextMajorAssessmentVersionTag('2.00'), '3.00');
  assert.equal(getNextMajorAssessmentVersionTag('1.0.0'), '2.00');
});

test('creating v2.00 from v1.00 published succeeds and keeps the same assessment row', async () => {
  const fake = createFakePool();

  const result = await createDraftVersionFromLatestPublishedAssessment('leadership-pattern', {
    getDbPool: () => fake.pool,
  });

  assert.equal(result.status, 'created');
  assert.equal(result.assessmentId, 'assessment-1');
  assert.equal(result.sourceVersionTag, '1.00');
  assert.equal(result.draftVersionTag, '2.00');
  assert.equal(fake.state.assessments.length, 1);
  assert.equal(fake.state.versions.at(-1)?.assessmentId, 'assessment-1');
  assert.equal(fake.state.versions.at(-1)?.mode, 'single_domain');
});

test('creating v3.00 from v2.00 published succeeds', async () => {
  const fake = createFakePool(buildSeed({
    versions: [
      {
        id: 'version-2',
        assessmentId: 'assessment-1',
        mode: 'single_domain',
        version: '2.00',
        lifecycleStatus: 'PUBLISHED',
        titleOverride: null,
        descriptionOverride: null,
        publishedAt: '2026-04-10T00:00:00.000Z',
        createdAt: '2026-04-10T00:00:00.000Z',
        updatedAt: '2026-04-10T00:00:00.000Z',
      },
    ],
  }));

  const result = await createDraftVersionFromLatestPublishedAssessment('assessment-1', {
    getDbPool: () => fake.pool,
  });

  assert.equal(result.status, 'created');
  assert.equal(result.draftVersionTag, '3.00');
});

test('an existing draft blocks another draft and returns the existing draft', async () => {
  const fake = createFakePool(buildSeed({ includeDraft: true }));

  const result = await createDraftVersionFromLatestPublishedAssessment('leadership-pattern', {
    getDbPool: () => fake.pool,
  });

  assert.deepEqual(result, {
    status: 'draft_exists',
    assessmentId: 'assessment-1',
    assessmentKey: 'leadership-pattern',
    draftVersionId: 'version-draft',
    draftVersionTag: '2.00',
  });
  assert.equal(fake.state.versions.length, 2);
});

test('source published version remains unchanged after draft creation', async () => {
  const fake = createFakePool();
  const sourceBefore = { ...fake.state.versions[0] };

  await createDraftVersionFromLatestPublishedAssessment('leadership-pattern', {
    getDbPool: () => fake.pool,
  });

  assert.deepEqual(fake.state.versions[0], sourceBefore);
});

test('copied version-owned child records belong to the new draft version', async () => {
  const fake = createFakePool();

  const result = await createDraftVersionFromLatestPublishedAssessment('leadership-pattern', {
    getDbPool: () => fake.pool,
  });

  assert.equal(result.status, 'created');
  if (result.status !== 'created') {
    return;
  }

  assert.equal(result.copied.domains, 1);
  assert.equal(result.copied.signals, 1);
  assert.equal(result.copied.questions, 1);
  assert.equal(result.copied.options, 1);
  assert.equal(result.copied.optionSignalWeights, 1);
  assert.equal(result.copied.languageRows, 2);

  const copiedDomain = fake.state.domains.find((row) => row.assessmentVersionId === result.draftVersionId);
  const copiedSignal = fake.state.signals.find((row) => row.assessmentVersionId === result.draftVersionId);
  const copiedQuestion = fake.state.questions.find((row) => row.assessmentVersionId === result.draftVersionId);
  const copiedOption = fake.state.options.find((row) => row.assessmentVersionId === result.draftVersionId);
  const copiedLanguage = fake.state.versionOwnedTables
    .get('assessment_version_language_assessment')
    ?.find((row) => row.assessment_version_id === result.draftVersionId);
  const copiedDriverClaim = fake.state.versionOwnedTables
    .get('assessment_version_single_domain_driver_claims')
    ?.find((row) => row.assessment_version_id === result.draftVersionId);

  assert.ok(copiedDomain);
  assert.ok(copiedSignal);
  assert.ok(copiedQuestion);
  assert.ok(copiedOption);
  assert.ok(copiedLanguage);
  assert.ok(copiedDriverClaim);
  assert.equal(copiedSignal?.domainId, copiedDomain?.id);
  assert.equal(copiedQuestion?.domainId, copiedDomain?.id);
  assert.equal(copiedOption?.questionId, copiedQuestion?.id);
});

test('attempts, responses, and results are not copied or mutated', async () => {
  const fake = createFakePool();
  const attemptsBefore = structuredClone(fake.state.attempts);
  const responsesBefore = structuredClone(fake.state.responses);
  const resultsBefore = structuredClone(fake.state.results);

  await createDraftVersionFromLatestPublishedAssessment('leadership-pattern', {
    getDbPool: () => fake.pool,
  });

  assert.deepEqual(fake.state.attempts, attemptsBefore);
  assert.deepEqual(fake.state.responses, responsesBefore);
  assert.deepEqual(fake.state.results, resultsBefore);
});

test('missing assessment returns a clear typed error', async () => {
  const fake = createFakePool();

  const result = await createDraftVersionFromLatestPublishedAssessment('missing-key', {
    getDbPool: () => fake.pool,
  });

  assert.deepEqual(result, {
    status: 'assessment_not_found',
    assessmentKeyOrId: 'missing-key',
  });
});

test('missing published source version returns a clear typed error', async () => {
  const fake = createFakePool(buildSeed({ includePublished: false }));

  const result = await createDraftVersionFromLatestPublishedAssessment('leadership-pattern', {
    getDbPool: () => fake.pool,
  });

  assert.deepEqual(result, {
    status: 'published_source_not_found',
    assessmentId: 'assessment-1',
    assessmentKey: 'leadership-pattern',
  });
});
