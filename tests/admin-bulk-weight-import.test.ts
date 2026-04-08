import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBulkWeightImportPlan,
  type BulkWeightImportTargetAssessmentVersion,
  type BulkWeightImportTargetOption,
  type BulkWeightImportTargetQuestion,
  type BulkWeightImportTargetSignal,
  type ParsedBulkWeightRow,
  validateBulkWeightGroups,
} from '@/lib/admin/bulk-weight-import';
import {
  importBulkWeightsForAssessmentVersionWithDependencies,
  previewBulkWeightsForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-bulk-weight-import';

type StoredAssessment = {
  id: string;
  assessmentKey: string;
};

type StoredVersion = {
  id: string;
  assessmentId: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type StoredQuestion = {
  id: string;
  assessmentVersionId: string;
  questionKey: string;
  orderIndex: number;
};

type StoredOption = {
  id: string;
  questionId: string;
  optionKey: string;
  optionLabel: string | null;
  orderIndex: number;
};

type StoredSignal = {
  id: string;
  assessmentVersionId: string;
  signalKey: string;
};

type StoredWeight = {
  id: string;
  optionId: string;
  signalId: string;
  weight: string;
  sourceWeightKey: string | null;
};

function createRecord(
  questionNumber: number,
  optionLabel: ParsedBulkWeightRow['optionLabel'],
  signalKey: string,
  weight: number,
  lineNumber: number,
): ParsedBulkWeightRow {
  return {
    lineNumber,
    rawLine: `${questionNumber}|${optionLabel}|${signalKey}|${weight}`,
    questionNumberRaw: String(questionNumber),
    questionNumber,
    optionLabel,
    signalKeyRaw: signalKey,
    signalKey,
    weightRaw: String(weight),
    weight,
  };
}

function buildValidatedGroups(
  specs: ReadonlyArray<{
    questionNumber: number;
    optionLabel: ParsedBulkWeightRow['optionLabel'];
    signalKey: string;
    weight: number;
  }>,
): ReturnType<typeof validateBulkWeightGroups>['weightGroups'] {
  const records = specs.map((spec, index) =>
    createRecord(spec.questionNumber, spec.optionLabel, spec.signalKey, spec.weight, index + 1),
  );
  return validateBulkWeightGroups(records).weightGroups;
}

function createAssessmentVersion(
  lifecycleStatus: BulkWeightImportTargetAssessmentVersion['lifecycleStatus'] = 'DRAFT',
): BulkWeightImportTargetAssessmentVersion {
  return {
    assessmentVersionId: 'version-1',
    assessmentKey: 'signals',
    lifecycleStatus,
  };
}

function createQuestion(
  questionNumber: number,
  overrides?: Partial<BulkWeightImportTargetQuestion>,
): BulkWeightImportTargetQuestion {
  return {
    questionId: `question-${questionNumber}`,
    questionNumber,
    questionKey: `q${String(questionNumber).padStart(2, '0')}`,
    ...overrides,
  };
}

function createOption(
  questionNumber: number,
  optionLabel: BulkWeightImportTargetOption['optionLabel'],
  overrides?: Partial<BulkWeightImportTargetOption>,
): BulkWeightImportTargetOption {
  return {
    optionId: `option-${questionNumber}-${optionLabel.toLowerCase()}`,
    questionId: `question-${questionNumber}`,
    questionNumber,
    optionLabel,
    optionKey: `q${String(questionNumber).padStart(2, '0')}_${optionLabel.toLowerCase()}`,
    existingWeightRowIds: [`weight-${questionNumber}-${optionLabel.toLowerCase()}-1`],
    ...overrides,
  };
}

function createSignal(
  signalKey: string,
  overrides?: Partial<BulkWeightImportTargetSignal>,
): BulkWeightImportTargetSignal {
  return {
    signalId: `signal-${signalKey}`,
    signalKey,
    ...overrides,
  };
}

function createFakeDb(
  seed?: {
    assessments?: StoredAssessment[];
    versions?: StoredVersion[];
    questions?: StoredQuestion[];
    options?: StoredOption[];
    signals?: StoredSignal[];
    weights?: StoredWeight[];
  },
  config?: {
    failInsertForOptionId?: string;
  },
) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    questions: [...(seed?.questions ?? [])],
    options: [...(seed?.options ?? [])],
    signals: [...(seed?.signals ?? [])],
    weights: [...(seed?.weights ?? [])],
  };

  const snapshotState = () => ({
    assessments: state.assessments.map((item) => ({ ...item })),
    versions: state.versions.map((item) => ({ ...item })),
    questions: state.questions.map((item) => ({ ...item })),
    options: state.options.map((item) => ({ ...item })),
    signals: state.signals.map((item) => ({ ...item })),
    weights: state.weights.map((item) => ({ ...item })),
  });

  let transactionSnapshot: ReturnType<typeof snapshotState> | null = null;

  function nextId(prefix: string, length: number) {
    return `${prefix}-${length + 1}`;
  }

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      if (text === 'BEGIN') {
        transactionSnapshot = snapshotState();
        return { rows: [] as T[] };
      }

      if (text === 'COMMIT') {
        transactionSnapshot = null;
        return { rows: [] as T[] };
      }

      if (text === 'ROLLBACK') {
        if (transactionSnapshot) {
          state.assessments = transactionSnapshot.assessments;
          state.versions = transactionSnapshot.versions;
          state.questions = transactionSnapshot.questions;
          state.options = transactionSnapshot.options;
          state.signals = transactionSnapshot.signals;
          state.weights = transactionSnapshot.weights;
        }
        transactionSnapshot = null;
        return { rows: [] as T[] };
      }

      if (
        text.includes('FROM assessment_versions av') &&
        text.includes('INNER JOIN assessments a ON a.id = av.assessment_id')
      ) {
        const assessmentVersionId = params?.[0] as string;
        const version = state.versions.find((item) => item.id === assessmentVersionId);
        const assessment = version
          ? state.assessments.find((item) => item.id === version.assessmentId)
          : null;

        return {
          rows:
            version && assessment
              ? ([{
                  assessment_key: assessment.assessmentKey,
                  assessment_version_id: version.id,
                  lifecycle_status: version.lifecycleStatus,
                }] as unknown as T[])
              : ([] as T[]),
        };
      }

      if (text.includes('FROM questions') && text.includes('WHERE assessment_version_id = $1')) {
        const assessmentVersionId = params?.[0] as string;
        const rows = state.questions
          .filter((item) => item.assessmentVersionId === assessmentVersionId)
          .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
          .map((item) => ({
            question_id: item.id,
            question_key: item.questionKey,
            order_index: item.orderIndex,
          }));
        return { rows: rows as unknown as T[] };
      }

      if (
        text.includes('FROM options o') &&
        text.includes('INNER JOIN questions q ON q.id = o.question_id') &&
        text.includes('o.option_key')
      ) {
        const assessmentVersionId = params?.[0] as string;
        const questionOrder = new Map(
          state.questions
            .filter((question) => question.assessmentVersionId === assessmentVersionId)
            .map((question) => [question.id, question.orderIndex]),
        );
        const rows = state.options
          .filter((option) => questionOrder.has(option.questionId))
          .sort(
            (left, right) =>
              (questionOrder.get(left.questionId) ?? 0) - (questionOrder.get(right.questionId) ?? 0) ||
              left.orderIndex - right.orderIndex ||
              left.id.localeCompare(right.id),
          )
          .map((option) => ({
            option_id: option.id,
            question_id: option.questionId,
            option_key: option.optionKey,
            option_label: option.optionLabel,
            question_order_index: questionOrder.get(option.questionId) ?? 0,
          }));
        return { rows: rows as unknown as T[] };
      }

      if (
        text.includes('FROM option_signal_weights osw') &&
        text.includes('INNER JOIN options o ON o.id = osw.option_id') &&
        text.includes('WHERE q.assessment_version_id = $1')
      ) {
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
          .sort((left, right) => left.optionId.localeCompare(right.optionId) || left.id.localeCompare(right.id))
          .map((weight) => ({
            option_signal_weight_id: weight.id,
            option_id: weight.optionId,
          }));
        return { rows: rows as unknown as T[] };
      }

      if (text.includes('FROM signals') && text.includes('WHERE assessment_version_id = $1')) {
        const assessmentVersionId = params?.[0] as string;
        const rows = state.signals
          .filter((item) => item.assessmentVersionId === assessmentVersionId)
          .sort((left, right) => left.signalKey.localeCompare(right.signalKey) || left.id.localeCompare(right.id))
          .map((item) => ({
            signal_id: item.id,
            signal_key: item.signalKey,
          }));
        return { rows: rows as unknown as T[] };
      }

      if (text.includes('DELETE FROM option_signal_weights') && text.includes('RETURNING id')) {
        const [optionId] = params as [string];
        const deleted = state.weights.filter((weight) => weight.optionId === optionId);
        state.weights = state.weights.filter((weight) => weight.optionId !== optionId);
        return {
          rows: deleted.map((weight) => ({ id: weight.id })) as unknown as T[],
        };
      }

      if (text.includes('INSERT INTO option_signal_weights') && text.includes('RETURNING id')) {
        const [optionId, signalId, weight, sourceWeightKey] = params as [string, string, string, string];

        if (config?.failInsertForOptionId === optionId) {
          throw new Error('WEIGHT_INSERT_FAILED');
        }

        const id = nextId('weight', state.weights.length);
        state.weights.push({
          id,
          optionId,
          signalId,
          weight,
          sourceWeightKey,
        });

        return { rows: ([{ id }] as unknown) as T[] };
      }

      return { rows: [] as T[] };
    },
    release() {},
  };

  return {
    client,
    state,
  };
}

async function captureWeightImportLogs<T>(run: () => Promise<T>) {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const events: Array<Record<string, unknown>> = [];

  const capture = (...args: unknown[]) => {
    if (args[0] === '[admin-weight-bulk-import]' && typeof args[1] === 'string') {
      events.push(JSON.parse(args[1]));
    }
  };

  console.log = capture;
  console.error = capture;

  try {
    const result = await run();
    return { result, events };
  } finally {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  }
}

test('builds plan for one valid option group', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    options: [createOption(1, 'A')],
    signals: [createSignal('driver'), createSignal('influencer')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 1, optionLabel: 'A', signalKey: 'influencer', weight: 1 },
      { questionNumber: 1, optionLabel: 'A', signalKey: 'driver', weight: 3 },
    ]),
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.plannedOptionGroups, [
    {
      questionId: 'question-1',
      questionNumber: 1,
      optionId: 'option-1-a',
      optionLabel: 'A',
      optionKey: 'q01_a',
      existingWeightRowIds: ['weight-1-a-1'],
      replacementWeights: [
        { signalId: 'signal-driver', signalKey: 'driver', weight: 3 },
        { signalId: 'signal-influencer', signalKey: 'influencer', weight: 1 },
      ],
    },
  ]);
});

test('builds plan for multiple valid option groups', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1), createQuestion(2)],
    options: [createOption(1, 'A'), createOption(2, 'B')],
    signals: [createSignal('driver'), createSignal('analyst')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 2, optionLabel: 'B', signalKey: 'analyst', weight: 2 },
      { questionNumber: 1, optionLabel: 'A', signalKey: 'driver', weight: 3 },
    ]),
  });

  assert.equal(result.success, true);
  assert.equal(result.summary.questionCountMatched, 2);
  assert.equal(result.summary.optionGroupCountMatched, 2);
  assert.equal(result.summary.weightsToInsert, 2);
});

test('fails when assessment version not found', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: null,
    questions: [createQuestion(1)],
    options: [createOption(1, 'A')],
    signals: [createSignal('driver')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 1, optionLabel: 'A', signalKey: 'driver', weight: 3 },
    ]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: null,
      optionLabel: null,
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    },
  ]);
});

test('fails when assessment version is not editable', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion('PUBLISHED'),
    questions: [createQuestion(1)],
    options: [createOption(1, 'A')],
    signals: [createSignal('driver')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 1, optionLabel: 'A', signalKey: 'driver', weight: 3 },
    ]),
  });

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'ASSESSMENT_VERSION_NOT_EDITABLE');
});

test('fails when imported question number is not found', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    options: [createOption(1, 'A')],
    signals: [createSignal('driver')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 2, optionLabel: 'A', signalKey: 'driver', weight: 3 },
    ]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 2,
      optionLabel: 'A',
      code: 'QUESTION_NUMBER_NOT_FOUND',
      message: 'Question number 2 does not exist in the target assessment version.',
    },
  ]);
});

test('fails when imported option label is not found for a question', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    options: [createOption(1, 'A')],
    signals: [createSignal('driver')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 1, optionLabel: 'B', signalKey: 'driver', weight: 3 },
    ]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 1,
      optionLabel: 'B',
      code: 'OPTION_LABEL_NOT_FOUND',
      message: 'Question 1 does not contain option label B in the target assessment version.',
    },
  ]);
});

test('fails when imported signal key is not found', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    options: [createOption(1, 'A')],
    signals: [createSignal('driver')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 1, optionLabel: 'A', signalKey: 'mastery', weight: 3 },
    ]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 1,
      optionLabel: 'A',
      signalKey: 'mastery',
      code: 'SIGNAL_KEY_NOT_FOUND',
      message: 'Signal key mastery does not exist in the target assessment version.',
    },
  ]);
});

test('fails when assessment has duplicate question numbers', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [
      createQuestion(1, { questionId: 'question-1a' }),
      createQuestion(1, { questionId: 'question-1b', questionKey: 'q01b' }),
    ],
    options: [createOption(1, 'A')],
    signals: [createSignal('driver')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 1, optionLabel: 'A', signalKey: 'driver', weight: 3 },
    ]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 1,
      optionLabel: null,
      code: 'DUPLICATE_QUESTION_NUMBER_IN_ASSESSMENT',
      message: 'Question number 1 is duplicated in the target assessment version.',
    },
  ]);
});

test('fails when a question has duplicate option labels', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    options: [
      createOption(1, 'A', { optionId: 'option-1-a-1' }),
      createOption(1, 'A', { optionId: 'option-1-a-2', optionKey: 'q01_a_dup' }),
    ],
    signals: [createSignal('driver')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 1, optionLabel: 'A', signalKey: 'driver', weight: 3 },
    ]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 1,
      optionLabel: 'A',
      code: 'DUPLICATE_OPTION_LABEL_FOR_QUESTION',
      message: 'Question 1 contains duplicate option label A in the target assessment version.',
    },
  ]);
});

test('fails when assessment has duplicate signal keys', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    options: [createOption(1, 'A')],
    signals: [
      createSignal('driver', { signalId: 'signal-driver-1' }),
      createSignal('driver', { signalId: 'signal-driver-2' }),
    ],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 1, optionLabel: 'A', signalKey: 'driver', weight: 3 },
    ]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: null,
      optionLabel: null,
      signalKey: 'driver',
      code: 'DUPLICATE_SIGNAL_KEY_IN_ASSESSMENT',
      message: 'Signal key driver is duplicated in the target assessment version.',
    },
  ]);
});

test('fails when no valid grouped weight sets exist', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    options: [createOption(1, 'A')],
    signals: [createSignal('driver')],
    validatedWeightGroups: [],
  });

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'IMPORT_HAS_NO_VALID_GROUPS');
});

test('preserves deterministic replacement weight ordering', () => {
  const result = buildBulkWeightImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(3)],
    options: [createOption(3, 'D')],
    signals: [createSignal('driver'), createSignal('analyst'), createSignal('implementer')],
    validatedWeightGroups: buildValidatedGroups([
      { questionNumber: 3, optionLabel: 'D', signalKey: 'implementer', weight: 0 },
      { questionNumber: 3, optionLabel: 'D', signalKey: 'driver', weight: 3 },
      { questionNumber: 3, optionLabel: 'D', signalKey: 'analyst', weight: 2 },
    ]),
  });

  assert.deepEqual(
    result.plannedOptionGroups[0]?.replacementWeights.map((weight) => weight.signalKey),
    ['analyst', 'driver', 'implementer'],
  );
});

test('preview returns planned option groups for a valid draft payload', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 }],
    options: [
      { id: 'option-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', orderIndex: 1 },
      { id: 'option-2', questionId: 'question-1', optionKey: 'q01_b', optionLabel: 'B', orderIndex: 2 },
    ],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-1', signalKey: 'driver' },
      { id: 'signal-analyst', assessmentVersionId: 'version-1', signalKey: 'analyst' },
    ],
    weights: [{ id: 'weight-1', optionId: 'option-1', signalId: 'signal-driver', weight: '1.0000', sourceWeightKey: '1|A' }],
  });

  const result = await previewBulkWeightsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: ['1|A|driver|3', '1|A|analyst|2'].join('\n'),
    },
    {
      db: fake.client,
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.canImport, true);
  assert.equal(result.summary.optionGroupCount, 1);
  assert.equal(result.summary.optionGroupCountMatched, 1);
  assert.equal(result.summary.weightsInserted, 2);
  assert.equal(result.summary.weightsDeleted, 1);
});

test('preview returns planner errors and disables import for non-draft versions', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'PUBLISHED' }],
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 }],
    options: [{ id: 'option-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', orderIndex: 1 }],
    signals: [{ id: 'signal-driver', assessmentVersionId: 'version-1', signalKey: 'driver' }],
  });

  const result = await previewBulkWeightsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: '1|A|driver|3',
    },
    {
      db: fake.client,
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.canImport, false);
  assert.equal(result.planErrors[0]?.code, 'ASSESSMENT_VERSION_NOT_EDITABLE');
});

test('replaces existing weights for one option group in one transaction', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 }],
    options: [{ id: 'option-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', orderIndex: 1 }],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-1', signalKey: 'driver' },
      { id: 'signal-analyst', assessmentVersionId: 'version-1', signalKey: 'analyst' },
    ],
    weights: [
      { id: 'weight-1', optionId: 'option-1', signalId: 'signal-driver', weight: '1.0000', sourceWeightKey: '1|A' },
      { id: 'weight-2', optionId: 'option-1', signalId: 'signal-analyst', weight: '0.5000', sourceWeightKey: '1|A' },
    ],
  });

  const result = await importBulkWeightsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: ['1|A|driver|3', '1|A|analyst|2'].join('\n'),
    },
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.summary.optionGroupCountImported, 1);
  assert.equal(result.summary.weightsInserted, 2);
  assert.equal(result.summary.weightsDeleted, 2);
  assert.deepEqual(
    fake.state.weights
      .filter((weight) => weight.optionId === 'option-1')
      .map((weight) => ({
        signalId: weight.signalId,
        weight: weight.weight,
        sourceWeightKey: weight.sourceWeightKey,
      })),
    [
      { signalId: 'signal-analyst', weight: '2.0000', sourceWeightKey: '1|A' },
      { signalId: 'signal-driver', weight: '3.0000', sourceWeightKey: '1|A' },
    ],
  );
});

test('replaces existing weights for multiple option groups in one transaction', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    questions: [
      { id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 },
      { id: 'question-2', assessmentVersionId: 'version-1', questionKey: 'q02', orderIndex: 1 },
    ],
    options: [
      { id: 'option-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', orderIndex: 1 },
      { id: 'option-2', questionId: 'question-2', optionKey: 'q02_b', optionLabel: 'B', orderIndex: 2 },
    ],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-1', signalKey: 'driver' },
      { id: 'signal-analyst', assessmentVersionId: 'version-1', signalKey: 'analyst' },
    ],
    weights: [
      { id: 'weight-1', optionId: 'option-1', signalId: 'signal-driver', weight: '1.0000', sourceWeightKey: '1|A' },
      { id: 'weight-2', optionId: 'option-2', signalId: 'signal-analyst', weight: '1.0000', sourceWeightKey: '2|B' },
    ],
  });

  const result = await importBulkWeightsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: [
        '1|A|driver|3',
        '1|A|analyst|2',
        '2|B|driver|1',
        '2|B|analyst|0',
      ].join('\n'),
    },
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.summary.optionGroupCountImported, 2);
  assert.equal(result.summary.weightsInserted, 4);
});

test('surfaces the first failing insert step and logs row failure details', async () => {
  const fake = createFakeDb(
    {
      assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
      versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
      questions: [
        { id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 },
        { id: 'question-2', assessmentVersionId: 'version-1', questionKey: 'q02', orderIndex: 1 },
      ],
      options: [
        { id: 'option-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', orderIndex: 1 },
        { id: 'option-2', questionId: 'question-2', optionKey: 'q02_b', optionLabel: 'B', orderIndex: 2 },
      ],
      signals: [
        { id: 'signal-driver', assessmentVersionId: 'version-1', signalKey: 'driver' },
        { id: 'signal-analyst', assessmentVersionId: 'version-1', signalKey: 'analyst' },
      ],
      weights: [
        { id: 'weight-1', optionId: 'option-1', signalId: 'signal-driver', weight: '1.0000', sourceWeightKey: '1|A' },
        { id: 'weight-2', optionId: 'option-2', signalId: 'signal-analyst', weight: '1.0000', sourceWeightKey: '2|B' },
      ],
    },
    {
      failInsertForOptionId: 'option-2',
    },
  );

  const { result, events } = await captureWeightImportLogs(() =>
    importBulkWeightsForAssessmentVersionWithDependencies(
      {
        assessmentVersionId: 'version-1',
        rawInput: [
          '1|A|driver|3',
          '1|A|analyst|2',
          '2|B|driver|1',
        ].join('\n'),
      },
      {
        connect: async () => fake.client,
        revalidatePath() {},
      },
    ),
  );

  assert.equal(result.success, false);
  assert.equal(result.executionError, 'WEIGHT_INSERT_FAILED');
  assert.notEqual(
    result.executionError,
    'current transaction is aborted, commands ignored until end of transaction block',
  );
  assert.deepEqual(
    fake.state.weights.map((weight) => ({
      optionId: weight.optionId,
      signalId: weight.signalId,
      weight: weight.weight,
    })),
    [
      { optionId: 'option-1', signalId: 'signal-analyst', weight: '2.0000' },
      { optionId: 'option-1', signalId: 'signal-driver', weight: '3.0000' },
    ],
  );

  const handlerEnteredEvent = events.find((event) => event.event === 'bulk-import-handler-entered');
  assert.equal(handlerEnteredEvent?.assessmentVersionId, 'version-1');

  const rowFailureEvent = events.find((event) => event.event === 'row-failure');
  assert.deepEqual(rowFailureEvent, {
    event: 'row-failure',
    assessmentVersionId: 'version-1',
    step: 'weight-insert',
    lineIndex: 2,
    questionKey: 'q02',
    optionKey: 'q02_b',
    signalKey: 'driver',
    weight: 1,
    errorMessage: 'WEIGHT_INSERT_FAILED',
    postgresMessage: 'WEIGHT_INSERT_FAILED',
  });
});

test('does not persist anything when planner errors exist', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 }],
    options: [{ id: 'option-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', orderIndex: 1 }],
    signals: [{ id: 'signal-driver', assessmentVersionId: 'version-1', signalKey: 'driver' }],
    weights: [{ id: 'weight-1', optionId: 'option-1', signalId: 'signal-driver', weight: '1.0000', sourceWeightKey: '1|A' }],
  });

  const result = await importBulkWeightsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: '2|A|driver|3',
    },
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.planErrors[0]?.code, 'QUESTION_NUMBER_NOT_FOUND');
  assert.equal(fake.state.weights[0]?.weight, '1.0000');
});

test('returns correct summary counts after successful import', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    questions: [
      { id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 },
      { id: 'question-2', assessmentVersionId: 'version-1', questionKey: 'q02', orderIndex: 1 },
    ],
    options: [
      { id: 'option-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', orderIndex: 1 },
      { id: 'option-2', questionId: 'question-1', optionKey: 'q01_b', optionLabel: 'B', orderIndex: 2 },
      { id: 'option-3', questionId: 'question-2', optionKey: 'q02_a', optionLabel: 'A', orderIndex: 1 },
    ],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-1', signalKey: 'driver' },
      { id: 'signal-analyst', assessmentVersionId: 'version-1', signalKey: 'analyst' },
    ],
    weights: [
      { id: 'weight-1', optionId: 'option-1', signalId: 'signal-driver', weight: '1.0000', sourceWeightKey: '1|A' },
      { id: 'weight-2', optionId: 'option-1', signalId: 'signal-analyst', weight: '0.5000', sourceWeightKey: '1|A' },
      { id: 'weight-3', optionId: 'option-3', signalId: 'signal-driver', weight: '2.0000', sourceWeightKey: '2|A' },
    ],
  });

  const result = await importBulkWeightsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: [
        '1|A|driver|3',
        '1|A|analyst|2',
        '2|A|driver|1',
      ].join('\n'),
    },
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.summary, {
    assessmentVersionId: 'version-1',
    optionGroupCount: 2,
    questionCountMatched: 2,
    optionGroupCountMatched: 2,
    optionGroupCountImported: 2,
    weightsInserted: 3,
    weightsDeleted: 3,
  });
  assert.equal(result.importedOptionGroupCount, 2);
  assert.equal(result.insertedWeightCount, 3);
  assert.equal(result.deletedWeightCount, 3);
});
