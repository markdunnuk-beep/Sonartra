import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBulkOptionImportPlan,
  type BulkOptionImportTargetAssessmentVersion,
  type BulkOptionImportTargetQuestion,
  type ParsedBulkOptionRow,
  validateBulkOptionGroups,
} from '@/lib/admin/bulk-option-import';
import { importBulkOptionsForAssessmentVersionWithDependencies } from '@/lib/server/admin-bulk-option-import';

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
};

function createRecord(
  questionNumber: number,
  optionLabel: ParsedBulkOptionRow['optionLabel'],
  optionText: string,
  lineNumber: number,
): ParsedBulkOptionRow {
  return {
    lineNumber,
    rawLine: `${questionNumber}|${optionLabel}|${optionText}`,
    questionNumberRaw: String(questionNumber),
    questionNumber,
    optionLabel,
    optionText,
  };
}

function buildValidatedGroups(
  questionNumbers: readonly number[],
): ReturnType<typeof validateBulkOptionGroups>['questionGroups'] {
  const records: ParsedBulkOptionRow[] = [];
  let lineNumber = 0;

  for (const questionNumber of questionNumbers) {
    lineNumber += 1;
    records.push(createRecord(questionNumber, 'A', `Q${questionNumber} A`, lineNumber));
    lineNumber += 1;
    records.push(createRecord(questionNumber, 'B', `Q${questionNumber} B`, lineNumber));
    lineNumber += 1;
    records.push(createRecord(questionNumber, 'C', `Q${questionNumber} C`, lineNumber));
    lineNumber += 1;
    records.push(createRecord(questionNumber, 'D', `Q${questionNumber} D`, lineNumber));
  }

  return validateBulkOptionGroups(records).questionGroups;
}

function createAssessmentVersion(
  lifecycleStatus: BulkOptionImportTargetAssessmentVersion['lifecycleStatus'] = 'DRAFT',
): BulkOptionImportTargetAssessmentVersion {
  return {
    assessmentVersionId: 'version-1',
    assessmentKey: 'signals',
    lifecycleStatus,
  };
}

function createQuestion(
  questionNumber: number,
  overrides?: Partial<BulkOptionImportTargetQuestion>,
): BulkOptionImportTargetQuestion {
  return {
    questionId: `question-${questionNumber}`,
    questionNumber,
    questionKey: `q${String(questionNumber).padStart(2, '0')}`,
    existingOptionIds: [`option-${questionNumber}-a`, `option-${questionNumber}-b`],
    ...overrides,
  };
}

function createFakeDb(
  seed?: {
    assessments?: StoredAssessment[];
    versions?: StoredVersion[];
    questions?: StoredQuestion[];
    options?: StoredOption[];
    weights?: StoredWeight[];
  },
  config?: {
    failInsertForQuestionId?: string;
  },
) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    questions: [...(seed?.questions ?? [])],
    options: [...(seed?.options ?? [])],
    weights: [...(seed?.weights ?? [])],
  };

  const snapshotState = () => ({
    assessments: state.assessments.map((item) => ({ ...item })),
    versions: state.versions.map((item) => ({ ...item })),
    questions: state.questions.map((item) => ({ ...item })),
    options: state.options.map((item) => ({ ...item })),
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
          state.weights = transactionSnapshot.weights;
        }
        transactionSnapshot = null;
        return { rows: [] as T[] };
      }

      if (text.includes('FROM assessment_versions av') && text.includes('INNER JOIN assessments a ON a.id = av.assessment_id')) {
        const assessmentVersionId = params?.[0] as string;
        const version = state.versions.find((item) => item.id === assessmentVersionId);
        const assessment = version
          ? state.assessments.find((item) => item.id === version.assessmentId)
          : null;

        return {
          rows:
            version && assessment
              ? ([
                  {
                    assessment_key: assessment.assessmentKey,
                    assessment_version_id: version.id,
                    lifecycle_status: version.lifecycleStatus,
                  },
                ] as unknown as T[])
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

      if (text.includes('FROM options o') && text.includes('INNER JOIN questions q ON q.id = o.question_id')) {
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
          }));
        return { rows: rows as unknown as T[] };
      }

      if (text.includes('DELETE FROM options') && text.includes('RETURNING id')) {
        const [questionId, assessmentVersionId] = params as [string, string];
        const deleted = state.options.filter(
          (option) => option.questionId === questionId && option.assessmentVersionId === assessmentVersionId,
        );
        const deletedIds = deleted.map((option) => option.id);
        state.options = state.options.filter(
          (option) => !(option.questionId === questionId && option.assessmentVersionId === assessmentVersionId),
        );
        state.weights = state.weights.filter((weight) => !deletedIds.includes(weight.optionId));
        return {
          rows: deleted.map((option) => ({ id: option.id })) as unknown as T[],
        };
      }

      if (text.includes('INSERT INTO options') && text.includes('RETURNING id')) {
        const [assessmentVersionId, questionId, optionKey, optionLabel, optionText, orderIndex] = params as [
          string,
          string,
          string,
          string | null,
          string,
          number,
        ];

        if (config?.failInsertForQuestionId === questionId) {
          throw new Error('OPTION_INSERT_FAILED');
        }

        const id = nextId('option', state.options.length);
        state.options.push({
          id,
          assessmentVersionId,
          questionId,
          optionKey,
          optionLabel,
          optionText,
          orderIndex,
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

test('builds plan for one valid matched question', () => {
  const result = buildBulkOptionImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    validatedQuestionGroups: buildValidatedGroups([1]),
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.plannedQuestions, [
    {
      questionId: 'question-1',
      questionNumber: 1,
      questionKey: 'q01',
      existingOptionIds: ['option-1-a', 'option-1-b'],
      replacementOptions: [
        { label: 'A', text: 'Q1 A', order: 1 },
        { label: 'B', text: 'Q1 B', order: 2 },
        { label: 'C', text: 'Q1 C', order: 3 },
        { label: 'D', text: 'Q1 D', order: 4 },
      ],
    },
  ]);
});

test('builds plan for multiple valid matched questions', () => {
  const result = buildBulkOptionImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1), createQuestion(2)],
    validatedQuestionGroups: buildValidatedGroups([1, 2]),
  });

  assert.equal(result.success, true);
  assert.equal(result.summary.questionsMatched, 2);
  assert.equal(result.summary.optionsToInsert, 8);
});

test('fails when assessment version not found', () => {
  const result = buildBulkOptionImportPlan({
    assessmentVersion: null,
    questions: [createQuestion(1)],
    validatedQuestionGroups: buildValidatedGroups([1]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: null,
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    },
  ]);
});

test('fails when assessment version is not editable', () => {
  const result = buildBulkOptionImportPlan({
    assessmentVersion: createAssessmentVersion('PUBLISHED'),
    questions: [createQuestion(1)],
    validatedQuestionGroups: buildValidatedGroups([1]),
  });

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'ASSESSMENT_VERSION_NOT_EDITABLE');
});

test('fails when imported question number is not found in target version', () => {
  const result = buildBulkOptionImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    validatedQuestionGroups: buildValidatedGroups([2]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 2,
      code: 'QUESTION_NUMBER_NOT_FOUND',
      message: 'Question number 2 does not exist in the target assessment version.',
    },
  ]);
});

test('fails when target assessment has duplicate question numbers', () => {
  const result = buildBulkOptionImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [
      createQuestion(1, { questionId: 'question-1a' }),
      createQuestion(1, { questionId: 'question-1b', questionKey: 'q01b' }),
    ],
    validatedQuestionGroups: buildValidatedGroups([1]),
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, [
    {
      questionNumber: 1,
      code: 'DUPLICATE_QUESTION_NUMBER_IN_ASSESSMENT',
      message: 'Question number 1 is duplicated in the target assessment version.',
    },
  ]);
});

test('fails when no valid grouped question sets exist', () => {
  const invalidGroups = validateBulkOptionGroups([
    createRecord(1, 'A', 'Only A', 1),
    createRecord(1, 'B', 'Only B', 2),
  ]).questionGroups;

  const result = buildBulkOptionImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(1)],
    validatedQuestionGroups: invalidGroups,
  });

  assert.equal(result.success, false);
  assert.equal(result.errors[0]?.code, 'IMPORT_HAS_NO_VALID_GROUPS');
});

test('preserves A-D option ordering in replacement plan', () => {
  const shuffledGroups = validateBulkOptionGroups([
    createRecord(3, 'D', 'Q3 D', 1),
    createRecord(3, 'B', 'Q3 B', 2),
    createRecord(3, 'A', 'Q3 A', 3),
    createRecord(3, 'C', 'Q3 C', 4),
  ]).questionGroups;

  const result = buildBulkOptionImportPlan({
    assessmentVersion: createAssessmentVersion(),
    questions: [createQuestion(3)],
    validatedQuestionGroups: shuffledGroups,
  });

  assert.deepEqual(
    result.plannedQuestions[0]?.replacementOptions.map((option) => option.label),
    ['A', 'B', 'C', 'D'],
  );
});

test('replaces existing options for one question in one transaction', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 }],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'q01_a',
        optionLabel: 'A',
        optionText: 'Old A',
        orderIndex: 1,
      },
      {
        id: 'option-2',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'q01_b',
        optionLabel: 'B',
        optionText: 'Old B',
        orderIndex: 2,
      },
    ],
    weights: [{ id: 'weight-1', optionId: 'option-1' }],
  });

  const result = await importBulkOptionsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: ['1|A|New A', '1|B|New B', '1|C|New C', '1|D|New D'].join('\n'),
    },
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.summary.questionsImported, 1);
  assert.equal(result.summary.optionsInserted, 4);
  assert.equal(result.summary.existingOptionsDeleted, 2);
  assert.deepEqual(
    fake.state.options
      .filter((option) => option.questionId === 'question-1')
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((option) => ({
        key: option.optionKey,
        label: option.optionLabel,
        text: option.optionText,
        orderIndex: option.orderIndex,
      })),
    [
      { key: 'q01_a', label: 'A', text: 'New A', orderIndex: 1 },
      { key: 'q01_b', label: 'B', text: 'New B', orderIndex: 2 },
      { key: 'q01_c', label: 'C', text: 'New C', orderIndex: 3 },
      { key: 'q01_d', label: 'D', text: 'New D', orderIndex: 4 },
    ],
  );
  assert.deepEqual(fake.state.weights, []);
});

test('replaces existing options for multiple questions in one transaction', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    questions: [
      { id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 },
      { id: 'question-2', assessmentVersionId: 'version-1', questionKey: 'q02', orderIndex: 1 },
    ],
    options: [
      { id: 'option-1', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', optionText: 'Old', orderIndex: 1 },
      { id: 'option-2', assessmentVersionId: 'version-1', questionId: 'question-2', optionKey: 'q02_a', optionLabel: 'A', optionText: 'Old', orderIndex: 1 },
    ],
  });

  const result = await importBulkOptionsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: [
        '1|A|Q1 A',
        '1|B|Q1 B',
        '1|C|Q1 C',
        '1|D|Q1 D',
        '2|A|Q2 A',
        '2|B|Q2 B',
        '2|C|Q2 C',
        '2|D|Q2 D',
      ].join('\n'),
    },
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.summary.questionsImported, 2);
  assert.equal(result.summary.optionsInserted, 8);
});

test('rolls back everything if one insert fails', async () => {
  const fake = createFakeDb(
    {
      assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
      versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
      questions: [
        { id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 },
        { id: 'question-2', assessmentVersionId: 'version-1', questionKey: 'q02', orderIndex: 1 },
      ],
      options: [
        { id: 'option-1', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', optionText: 'Old 1', orderIndex: 1 },
        { id: 'option-2', assessmentVersionId: 'version-1', questionId: 'question-2', optionKey: 'q02_a', optionLabel: 'A', optionText: 'Old 2', orderIndex: 1 },
      ],
    },
    {
      failInsertForQuestionId: 'question-2',
    },
  );

  const result = await importBulkOptionsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: [
        '1|A|Q1 A',
        '1|B|Q1 B',
        '1|C|Q1 C',
        '1|D|Q1 D',
        '2|A|Q2 A',
        '2|B|Q2 B',
        '2|C|Q2 C',
        '2|D|Q2 D',
      ].join('\n'),
    },
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.executionError, 'Bulk option import could not be saved. Try again.');
  assert.deepEqual(
    fake.state.options.map((option) => ({
      questionId: option.questionId,
      text: option.optionText,
    })),
    [
      { questionId: 'question-1', text: 'Old 1' },
      { questionId: 'question-2', text: 'Old 2' },
    ],
  );
});

test('persists exactly 4 options per imported question', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 }],
  });

  const result = await importBulkOptionsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: ['1|A|A', '1|B|B', '1|C|C', '1|D|D'].join('\n'),
    },
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, true);
  assert.equal(fake.state.options.length, 4);
});

test('does not persist anything when planner errors exist', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1', questionKey: 'q01', orderIndex: 0 }],
    options: [{ id: 'option-1', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', optionText: 'Old', orderIndex: 1 }],
  });

  const result = await importBulkOptionsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: ['2|A|A', '2|B|B', '2|C|C', '2|D|D'].join('\n'),
    },
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.planErrors[0]?.code, 'QUESTION_NUMBER_NOT_FOUND');
  assert.equal(fake.state.options[0]?.optionText, 'Old');
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
      { id: 'option-1', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', optionText: 'Old', orderIndex: 1 },
      { id: 'option-2', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_b', optionLabel: 'B', optionText: 'Old', orderIndex: 2 },
      { id: 'option-3', assessmentVersionId: 'version-1', questionId: 'question-2', optionKey: 'q02_a', optionLabel: 'A', optionText: 'Old', orderIndex: 1 },
    ],
  });

  const result = await importBulkOptionsForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: [
        '1|A|Q1 A',
        '1|B|Q1 B',
        '1|C|Q1 C',
        '1|D|Q1 D',
        '2|A|Q2 A',
        '2|B|Q2 B',
        '2|C|Q2 C',
        '2|D|Q2 D',
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
    questionsMatched: 2,
    questionsImported: 2,
    optionsInserted: 8,
    existingOptionsDeleted: 3,
  });
  assert.equal(result.importedQuestionCount, 2);
  assert.equal(result.importedOptionCount, 8);
  assert.equal(result.skippedQuestionCount, 0);
});
