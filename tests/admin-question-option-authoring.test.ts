import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBulkQuestionRecords,
  createBulkQuestionsActionWithDependencies,
  createOptionRecord,
  createQuestionRecord,
  deleteOptionRecord,
  deleteQuestionRecord,
  duplicateQuestionRecord,
  updateOptionRecord,
  updateOptionText,
  updateQuestionRecord,
  updateQuestionText,
} from '@/lib/server/admin-question-option-authoring';
import { initialAdminBulkQuestionAuthoringFormState } from '@/lib/admin/admin-question-option-authoring';

type StoredDomain = {
  id: string;
  assessmentVersionId: string;
  domainKey: string;
  label: string;
  domainType: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  orderIndex: number;
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

type FakeState = {
  domains: StoredDomain[];
  questions: StoredQuestion[];
  options: StoredOption[];
  optionSignalWeights: StoredOptionSignalWeight[];
};

type StoredOptionSignalWeight = {
  id: string;
  optionId: string;
  signalId: string;
  weight: string;
};

function cloneState(state: FakeState): FakeState {
  return {
    domains: state.domains.map((domain) => ({ ...domain })),
    questions: state.questions.map((question) => ({ ...question })),
    options: state.options.map((option) => ({ ...option })),
    optionSignalWeights: state.optionSignalWeights.map((weight) => ({ ...weight })),
  };
}

function createFakeDb(
  seed?: {
    domains?: StoredDomain[];
    questions?: StoredQuestion[];
    options?: StoredOption[];
    optionSignalWeights?: StoredOptionSignalWeight[];
  },
  config?: {
    failOptionKey?: string;
    failWeightInsertForOptionId?: string;
  },
) {
  const state: FakeState = {
    domains: [...(seed?.domains ?? [])],
    questions: [...(seed?.questions ?? [])],
    options: [...(seed?.options ?? [])],
    optionSignalWeights: [...(seed?.optionSignalWeights ?? [])],
  };

  let transactionSnapshot: FakeState | null = null;

  function nextId(prefix: string, currentLength: number) {
    return `${prefix}-${currentLength + 1}`;
  }

  async function query<T>(text: string, params?: readonly unknown[]) {
    if (text === 'BEGIN') {
      transactionSnapshot = cloneState(state);
      return { rows: [] as T[] };
    }

    if (text === 'COMMIT') {
      transactionSnapshot = null;
      return { rows: [] as T[] };
    }

    if (text === 'ROLLBACK') {
      if (transactionSnapshot) {
        state.domains = transactionSnapshot.domains;
        state.questions = transactionSnapshot.questions;
        state.options = transactionSnapshot.options;
        state.optionSignalWeights = transactionSnapshot.optionSignalWeights;
      }
      transactionSnapshot = null;
      return { rows: [] as T[] };
    }

    if (text.includes('DELETE FROM questions')) {
      const [questionId, assessmentVersionId] = params as [string, string];
      state.questions = state.questions.filter(
        (question) => !(question.id === questionId && question.assessmentVersionId === assessmentVersionId),
      );
      const deletedOptionIds = state.options
        .filter((option) => option.questionId === questionId)
        .map((option) => option.id);
      state.options = state.options.filter((option) => option.questionId !== questionId);
      state.optionSignalWeights = state.optionSignalWeights.filter(
        (weight) => !deletedOptionIds.includes(weight.optionId),
      );
      return { rows: [] as T[] };
    }

    if (text.includes('DELETE FROM options')) {
      const [optionId, questionId] = params as [string, string];
      state.options = state.options.filter(
        (option) => !(option.id === optionId && option.questionId === questionId),
      );
      state.optionSignalWeights = state.optionSignalWeights.filter((weight) => weight.optionId !== optionId);
      return { rows: [] as T[] };
    }

    if (text.includes('SELECT id') && text.includes('FROM domains') && text.includes('WHERE id = $1')) {
      const [domainId, assessmentVersionId] = params as [string, string];
      const match = state.domains.find(
        (domain) => domain.id === domainId && domain.assessmentVersionId === assessmentVersionId,
      );
      return { rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]) };
    }

    if (text.includes('SELECT id') && text.includes('FROM domains') && text.includes('LIMIT 1')) {
      const [assessmentVersionId] = params as [string];
      const match = state.domains
        .filter((domain) => domain.assessmentVersionId === assessmentVersionId)
        .sort(
          (left, right) =>
            (left.domainType === 'QUESTION_SECTION' ? 0 : 1) -
              (right.domainType === 'QUESTION_SECTION' ? 0 : 1) ||
            left.orderIndex - right.orderIndex ||
            left.id.localeCompare(right.id),
        )[0];
      return { rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]) };
    }

    if (text.includes('FROM questions') && text.includes('question_key = $2')) {
      const [assessmentVersionId, questionKey, excludedQuestionId] = params as [string, string, string | null];
      const rows = state.questions
        .filter(
          (question) =>
            question.assessmentVersionId === assessmentVersionId &&
            question.questionKey === questionKey &&
            (excludedQuestionId === null || question.id !== excludedQuestionId),
        )
        .map((question) => ({ id: question.id }));
      return { rows: rows as T[] };
    }

    if (text.includes('MAX(order_index)') && text.includes('FROM questions')) {
      const [assessmentVersionId] = params as [string];
      const next =
        Math.max(
          -1,
          ...state.questions
            .filter((question) => question.assessmentVersionId === assessmentVersionId)
            .map((question) => question.orderIndex),
        ) + 1;
      return { rows: ([{ next_order_index: next }] as unknown) as T[] };
    }

    if (text.includes('INSERT INTO questions') && text.includes('RETURNING id, assessment_version_id, domain_id, question_key, prompt, order_index')) {
      const rows = [] as {
        id: string;
        assessment_version_id: string;
        domain_id: string;
        question_key: string;
        prompt: string;
        order_index: number;
      }[];
      for (let index = 0; index < (params?.length ?? 0); index += 5) {
        const id = nextId('question', state.questions.length);
        const record: StoredQuestion = {
          id,
          assessmentVersionId: params?.[index] as string,
          domainId: params?.[index + 1] as string,
          questionKey: params?.[index + 2] as string,
          prompt: params?.[index + 3] as string,
          orderIndex: params?.[index + 4] as number,
        };
        state.questions.push(record);
        rows.push({
          id,
          assessment_version_id: record.assessmentVersionId,
          domain_id: record.domainId,
          question_key: record.questionKey,
          prompt: record.prompt,
          order_index: record.orderIndex,
        });
      }
      return { rows: rows as unknown as T[] };
    }

    if (text.includes('INSERT INTO questions') && text.includes('RETURNING id')) {
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

    if (text.includes('SELECT id') && text.includes('FROM questions') && text.includes('WHERE id = $1')) {
      const [questionId, assessmentVersionId] = params as [string, string];
      const match = state.questions.find(
        (question) => question.id === questionId && question.assessmentVersionId === assessmentVersionId,
      );
      return { rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]) };
    }

    if (text.includes('SELECT') && text.includes('assessment_version_id') && text.includes('domain_id') && text.includes('prompt') && text.includes('FROM questions')) {
      const [questionId, assessmentVersionId] = params as [string, string];
      const match = state.questions.find(
        (question) => question.id === questionId && question.assessmentVersionId === assessmentVersionId,
      );
      return {
        rows: match
          ? ([{
              id: match.id,
              assessment_version_id: match.assessmentVersionId,
              domain_id: match.domainId,
              prompt: match.prompt,
              order_index: match.orderIndex,
            }] as unknown as T[])
          : ([] as T[]),
      };
    }

    if (text.includes('UPDATE questions') && text.includes('RETURNING id, prompt, question_key')) {
      const [questionId, assessmentVersionId, prompt] = params as [string, string, string];
      const match = state.questions.find(
        (question) => question.id === questionId && question.assessmentVersionId === assessmentVersionId,
      );
      if (!match) {
        return { rows: [] as T[] };
      }
      match.prompt = prompt;
      return {
        rows: ([{ id: match.id, prompt: match.prompt, question_key: match.questionKey }] as unknown) as T[],
      };
    }

    if (text.includes('UPDATE questions') && text.includes('order_index = order_index + 1')) {
      const [assessmentVersionId, sourceOrderIndex] = params as [string, number];
      state.questions = state.questions.map((question) =>
        question.assessmentVersionId === assessmentVersionId && question.orderIndex > sourceOrderIndex
          ? { ...question, orderIndex: question.orderIndex + 1 }
          : question,
      );
      return { rows: [] as T[] };
    }

    if (text.includes('SELECT id, order_index') && text.includes('FROM questions')) {
      const [assessmentVersionId, startingOrderIndex] = params as [string, number];
      const rows = state.questions
        .filter(
          (question) =>
            question.assessmentVersionId === assessmentVersionId &&
            question.orderIndex >= startingOrderIndex,
        )
        .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
        .map((question) => ({
          id: question.id,
          order_index: question.orderIndex,
        }));
      return { rows: rows as unknown as T[] };
    }

    if (text.includes('SET') && text.includes('question_key = $3') && text.includes('assessment_version_id = $2')) {
      const [questionId, assessmentVersionId, questionKey] = params as [string, string, string];
      const match = state.questions.find(
        (question) => question.id === questionId && question.assessmentVersionId === assessmentVersionId,
      );
      if (match) {
        match.questionKey = questionKey;
      }
      return { rows: [] as T[] };
    }

    if (text.includes('UPDATE questions')) {
      const [questionId, assessmentVersionId, domainId, questionKey, prompt] = params as [
        string,
        string,
        string,
        string,
        string,
      ];
      const match = state.questions.find(
        (question) => question.id === questionId && question.assessmentVersionId === assessmentVersionId,
      );
      if (match) {
        match.domainId = domainId;
        match.questionKey = questionKey;
        match.prompt = prompt;
      }
      return { rows: [] as T[] };
    }

    if (text.includes('SELECT order_index') && text.includes('FROM questions')) {
      const [questionId, assessmentVersionId] = params as [string, string];
      const match = state.questions.find(
        (question) => question.id === questionId && question.assessmentVersionId === assessmentVersionId,
      );
      return {
        rows: match ? ([{ order_index: match.orderIndex }] as unknown as T[]) : ([] as T[]),
      };
    }

    if (text.includes('FROM options o') && text.includes('o.assessment_version_id = $1')) {
      const [assessmentVersionId, optionKey, excludedOptionId] = params as [string, string, string | null];
      const rows = state.options
        .filter(
          (option) =>
            option.assessmentVersionId === assessmentVersionId &&
            option.optionKey === optionKey &&
            (excludedOptionId === null || option.id !== excludedOptionId),
        )
        .map((option) => ({ id: option.id }));
      return { rows: rows as T[] };
    }

    if (text.includes('MAX(order_index)') && text.includes('FROM options')) {
      const [questionId] = params as [string];
      const next =
        Math.max(
          -1,
          ...state.options
            .filter((option) => option.questionId === questionId)
            .map((option) => option.orderIndex),
        ) + 1;
      return { rows: ([{ next_order_index: next }] as unknown) as T[] };
    }

    if (text.includes('INSERT INTO options') && text.includes('RETURNING id, assessment_version_id, question_id, option_key, option_label, option_text, order_index')) {
      const rows = [] as {
        id: string;
        assessment_version_id: string;
        question_id: string;
        option_key: string;
        option_label: string | null;
        option_text: string;
        order_index: number;
      }[];
      for (let index = 0; index < (params?.length ?? 0); index += 6) {
        const optionKey = params?.[index + 2] as string;
        const id = nextId('option', state.options.length);
        const record: StoredOption = {
          id,
          assessmentVersionId: params?.[index] as string,
          questionId: params?.[index + 1] as string,
          optionKey,
          optionLabel: (params?.[index + 3] as string | null) ?? null,
          optionText: params?.[index + 4] as string,
          orderIndex: params?.[index + 5] as number,
        };
        state.options.push(record);
        if (config?.failOptionKey && optionKey === config.failOptionKey) {
          throw new Error('OPTION_INSERT_FAILED');
        }
        rows.push({
          id,
          assessment_version_id: record.assessmentVersionId,
          question_id: record.questionId,
          option_key: record.optionKey,
          option_label: record.optionLabel,
          option_text: record.optionText,
          order_index: record.orderIndex,
        });
      }
      return { rows: rows as unknown as T[] };
    }

    if (text.includes('INSERT INTO options') && text.includes('RETURNING id')) {
      const optionKey = params?.[2] as string;
      const id = nextId('option', state.options.length);
      state.options.push({
        id,
        assessmentVersionId: params?.[0] as string,
        questionId: params?.[1] as string,
        optionKey,
        optionLabel: (params?.[3] as string | null) ?? null,
        optionText: params?.[4] as string,
        orderIndex: params?.[5] as number,
      });
      if (config?.failOptionKey && optionKey === config.failOptionKey) {
        throw new Error('OPTION_INSERT_FAILED');
      }
      return { rows: ([{ id }] as unknown) as T[] };
    }

    if (text.includes('SELECT') && text.includes('o.assessment_version_id') && text.includes('o.question_id') && text.includes('o.option_label')) {
      const [questionId, assessmentVersionId] = params as [string, string];
      const rows = state.options
        .filter(
          (option) =>
            option.questionId === questionId &&
            option.assessmentVersionId === assessmentVersionId &&
            state.questions.some(
              (question) => question.id === option.questionId && question.assessmentVersionId === assessmentVersionId,
            ),
        )
        .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
        .map((option) => ({
          id: option.id,
          assessment_version_id: option.assessmentVersionId,
          question_id: option.questionId,
          option_label: option.optionLabel,
          option_text: option.optionText,
          order_index: option.orderIndex,
        }));
      return { rows: rows as unknown as T[] };
    }

    if (text.includes('SELECT id, option_label, order_index') && text.includes('FROM options')) {
      const [questionId, assessmentVersionId] = params as [string, string];
      const rows = state.options
        .filter(
          (option) => option.questionId === questionId && option.assessmentVersionId === assessmentVersionId,
        )
        .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
        .map((option) => ({
          id: option.id,
          option_label: option.optionLabel,
          order_index: option.orderIndex,
        }));
      return { rows: rows as unknown as T[] };
    }

    if (text.includes('INSERT INTO options')) {
      state.options.push({
        id: nextId('option', state.options.length),
        assessmentVersionId: params?.[0] as string,
        questionId: params?.[1] as string,
        optionKey: params?.[2] as string,
        optionLabel: (params?.[3] as string | null) ?? null,
        optionText: params?.[4] as string,
        orderIndex: params?.[5] as number,
      });
      return { rows: [] as T[] };
    }

    if (text.includes('FROM option_signal_weights osw') && text.includes('INNER JOIN signals s ON s.id = osw.signal_id')) {
      const [questionId, assessmentVersionId] = params as [string, string];
      const rows = state.optionSignalWeights
        .filter((weight) => {
          const option = state.options.find((candidate) => candidate.id === weight.optionId);
          const question = option
            ? state.questions.find((candidate) => candidate.id === option.questionId)
            : null;

          return (
            option !== undefined &&
            option.assessmentVersionId === assessmentVersionId &&
            question != null &&
            question.id === questionId &&
            question.assessmentVersionId === assessmentVersionId
          );
        })
        .map((weight) => ({
          option_id: weight.optionId,
          signal_id: weight.signalId,
          weight: weight.weight,
        }));
      return { rows: rows as unknown as T[] };
    }

    if (text.includes('INSERT INTO option_signal_weights')) {
      const [optionId, signalId, weight] = params as [string, string, string];
      if (config?.failWeightInsertForOptionId === optionId) {
        throw new Error('WEIGHT_INSERT_FAILED');
      }
      state.optionSignalWeights.push({
        id: nextId('weight', state.optionSignalWeights.length),
        optionId,
        signalId,
        weight,
      });
      return { rows: [] as T[] };
    }

    if (text.includes('SELECT id') && text.includes('FROM options') && text.includes('WHERE id = $1')) {
      const [optionId, questionId] = params as [string, string];
      const match = state.options.find(
        (option) => option.id === optionId && option.questionId === questionId,
      );
      return { rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]) };
    }

    if (text.includes('UPDATE options') && text.includes('RETURNING id, option_text, option_key')) {
      const [optionId, questionId, optionText] = params as [string, string, string];
      const match = state.options.find(
        (option) => option.id === optionId && option.questionId === questionId,
      );
      if (!match) {
        return { rows: [] as T[] };
      }
      match.optionText = optionText;
      return {
        rows: ([{ id: match.id, option_text: match.optionText, option_key: match.optionKey }] as unknown) as T[],
      };
    }

    if (
      text.includes('SET') &&
      text.includes('option_key = $3') &&
      text.includes('WHERE id = $1') &&
      !text.includes('option_label = $4')
    ) {
      const [optionId, questionId, optionKey] = params as [string, string, string];
      const match = state.options.find(
        (option) => option.id === optionId && option.questionId === questionId,
      );
      if (match) {
        match.optionKey = optionKey;
      }
      return { rows: [] as T[] };
    }

    if (text.includes('UPDATE options')) {
      const [optionId, questionId, optionKey, optionLabel, optionText] = params as [
        string,
        string,
        string,
        string | null,
        string,
      ];
      const match = state.options.find(
        (option) => option.id === optionId && option.questionId === questionId,
      );
      if (match) {
        match.optionKey = optionKey;
        match.optionLabel = optionLabel;
        match.optionText = optionText;
      }
      return { rows: [] as T[] };
    }

    return { rows: [] as T[] };
  }

  return {
    db: {
      query,
    },
    client: {
      query,
      release(): void {},
    },
    state,
  };
}

function buildBulkFormData(questionLines: string, domainId = 'domain-1') {
  const formData = new FormData();
  formData.set('questionLines', questionLines);
  formData.set('domainId', domainId);
  return formData;
}

test('creates questions and options with deterministic appended order indexes', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'operating-style',
        label: 'Operating Style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-1',
        domainKey: 'core-drivers',
        label: 'Core Drivers',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 1,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'existing-question',
        prompt: 'Existing question',
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

  const createdQuestion = await createQuestionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    values: {
      domainId: 'domain-2',
      key: 'new-question',
      prompt: 'New question',
    },
  });

  assert.equal(fake.state.questions[1]?.orderIndex, 1);
  assert.equal(fake.state.questions[1]?.questionKey, 'q02');
  assert.equal(fake.state.questions[1]?.domainId, 'domain-2');
  assert.equal(fake.state.options.length, 5);
  assert.equal(createdQuestion.key, 'q02');
  assert.equal(createdQuestion.questionId, 'question-2');
  assert.equal(createdQuestion.domainId, 'domain-2');
  assert.equal(createdQuestion.options.length, 4);
  assert.deepEqual(
    createdQuestion.options.map((option) => ({
      assessmentVersionId: option.assessmentVersionId,
      questionId: option.questionId,
      optionKey: option.key,
      optionLabel: option.label,
      orderIndex: option.orderIndex,
    })),
    [
      {
        assessmentVersionId: 'version-1',
        questionId: 'question-2',
        optionKey: 'q02_a',
        optionLabel: 'A',
        orderIndex: 1,
      },
      {
        assessmentVersionId: 'version-1',
        questionId: 'question-2',
        optionKey: 'q02_b',
        optionLabel: 'B',
        orderIndex: 2,
      },
      {
        assessmentVersionId: 'version-1',
        questionId: 'question-2',
        optionKey: 'q02_c',
        optionLabel: 'C',
        orderIndex: 3,
      },
      {
        assessmentVersionId: 'version-1',
        questionId: 'question-2',
        optionKey: 'q02_d',
        optionLabel: 'D',
        orderIndex: 4,
      },
    ],
  );
});

test('bulk import creates three questions in pasted order with default options', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q01',
        prompt: 'Existing question',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'q01_a',
        optionLabel: 'A',
        optionText: '',
        orderIndex: 1,
      },
    ],
  });

  const createdQuestions = await createBulkQuestionRecords({
    db: fake.db,
    assessmentVersionId: 'version-1',
    prompts: [
      'When starting a new initiative, what do you focus on first?',
      'How do you usually approach a new process?',
      'What matters most when work becomes ambiguous?',
    ],
    domainId: 'domain-1',
  });

  assert.equal(createdQuestions.length, 3);
  assert.deepEqual(
    createdQuestions.map((question) => ({
      key: question.key,
      prompt: question.prompt,
      orderIndex: question.orderIndex,
      domainId: question.domainId,
    })),
    [
      {
        key: 'q02',
        prompt: 'When starting a new initiative, what do you focus on first?',
        orderIndex: 1,
        domainId: 'domain-1',
      },
      {
        key: 'q03',
        prompt: 'How do you usually approach a new process?',
        orderIndex: 2,
        domainId: 'domain-1',
      },
      {
        key: 'q04',
        prompt: 'What matters most when work becomes ambiguous?',
        orderIndex: 3,
        domainId: 'domain-1',
      },
    ],
  );
  assert.equal(fake.state.questions.length, 4);
  assert.equal(fake.state.options.length, 13);
  assert.ok(createdQuestions.every((question) => question.options.length === 4));
  assert.deepEqual(
    createdQuestions[0]?.options.map((option) => option.key),
    ['q02_a', 'q02_b', 'q02_c', 'q02_d'],
  );
  assert.deepEqual(
    createdQuestions[2]?.options.map((option) => option.key),
    ['q04_a', 'q04_b', 'q04_c', 'q04_d'],
  );
});

test('bulk import trims lines and ignores blanks safely', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
  });

  const result = await createBulkQuestionsActionWithDependencies(
    {
      assessmentKey: 'signals',
      assessmentVersionId: 'version-1',
    },
    initialAdminBulkQuestionAuthoringFormState,
    buildBulkFormData('  First question  \n\n Second question\n   \nThird question   '),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.formError, null);
  assert.equal(result.createdQuestions?.length, 3);
  assert.deepEqual(
    fake.state.questions.map((question) => question.prompt),
    ['First question', 'Second question', 'Third question'],
  );
});

test('bulk import can create 80 questions with four deterministic options each', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
  });

  const prompts = Array.from({ length: 80 }, (_, index) => `Question prompt ${index + 1}`);
  const createdQuestions = await createBulkQuestionRecords({
    db: fake.db,
    assessmentVersionId: 'version-1',
    prompts,
    domainId: 'domain-1',
  });

  assert.equal(createdQuestions.length, 80);
  assert.equal(fake.state.questions.length, 80);
  assert.equal(fake.state.options.length, 320);
  assert.equal(createdQuestions[0]?.key, 'q01');
  assert.equal(createdQuestions[79]?.key, 'q80');
  assert.deepEqual(
    createdQuestions[79]?.options.map((option) => option.key),
    ['q80_a', 'q80_b', 'q80_c', 'q80_d'],
  );
  assert.equal(new Set(createdQuestions.map((question) => question.key)).size, 80);
  assert.ok(createdQuestions.every((question) => question.options.length === 4));
});

test('bulk import appends after existing questions without key or order collisions', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q01',
        prompt: 'Existing question one',
        orderIndex: 0,
      },
      {
        id: 'question-2',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q02',
        prompt: 'Existing question two',
        orderIndex: 1,
      },
    ],
  });

  const createdQuestions = await createBulkQuestionRecords({
    db: fake.db,
    assessmentVersionId: 'version-1',
    prompts: ['Third question', 'Fourth question', 'Fifth question'],
    domainId: 'domain-1',
  });

  assert.deepEqual(
    createdQuestions.map((question) => ({
      key: question.key,
      orderIndex: question.orderIndex,
    })),
    [
      { key: 'q03', orderIndex: 2 },
      { key: 'q04', orderIndex: 3 },
      { key: 'q05', orderIndex: 4 },
    ],
  );
  assert.equal(new Set(fake.state.questions.map((question) => question.questionKey)).size, 5);
});

test('bulk action rolls back all created records when option insertion fails', async () => {
  const fake = createFakeDb(
    {
      domains: [
        {
          id: 'domain-1',
          assessmentVersionId: 'version-1',
          domainKey: 'section-one',
          label: 'Section one',
          domainType: 'QUESTION_SECTION',
          orderIndex: 0,
        },
      ],
      questions: [
        {
          id: 'question-1',
          assessmentVersionId: 'version-1',
          domainId: 'domain-1',
          questionKey: 'q01',
          prompt: 'Existing question',
          orderIndex: 0,
        },
      ],
      options: [
        {
          id: 'option-1',
          assessmentVersionId: 'version-1',
          questionId: 'question-1',
          optionKey: 'q01_a',
          optionLabel: 'A',
          optionText: '',
          orderIndex: 1,
        },
      ],
    },
    {
      failOptionKey: 'q02_c',
    },
  );
  const revalidatedPaths: string[] = [];

  const result = await createBulkQuestionsActionWithDependencies(
    {
      assessmentKey: 'signals',
      assessmentVersionId: 'version-1',
    },
    initialAdminBulkQuestionAuthoringFormState,
    buildBulkFormData('First question\nSecond question'),
    {
      connect: async () => fake.client,
      revalidatePath(path: string): void {
        revalidatedPaths.push(path);
      },
    },
  );

  assert.equal(result.formError, 'Bulk question import could not be saved. Try again.');
  assert.equal(fake.state.questions.length, 1);
  assert.equal(fake.state.options.length, 1);
  assert.deepEqual(revalidatedPaths, []);
});

test('bulk import persists the explicitly selected domain instead of defaulting to the first domain', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'operating-style',
        label: 'Operating Style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-1',
        domainKey: 'leadership-approach',
        label: 'Leadership Approach',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 1,
      },
    ],
  });

  const createdQuestions = await createBulkQuestionRecords({
    db: fake.db,
    assessmentVersionId: 'version-1',
    prompts: ['Question one', 'Question two', 'Question three'],
    domainId: 'domain-2',
  });

  assert.deepEqual(
    createdQuestions.map((question) => question.domainId),
    ['domain-2', 'domain-2', 'domain-2'],
  );
  assert.deepEqual(
    fake.state.questions.map((question) => ({
      key: question.questionKey,
      domainId: question.domainId,
      orderIndex: question.orderIndex,
    })),
    [
      { key: 'q01', domainId: 'domain-2', orderIndex: 0 },
      { key: 'q02', domainId: 'domain-2', orderIndex: 1 },
      { key: 'q03', domainId: 'domain-2', orderIndex: 2 },
    ],
  );
});

test('bulk action fails validation when no domain is supplied', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'operating-style',
        label: 'Operating Style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
  });

  const result = await createBulkQuestionsActionWithDependencies(
    {
      assessmentKey: 'signals',
      assessmentVersionId: 'version-1',
    },
    initialAdminBulkQuestionAuthoringFormState,
    buildBulkFormData('Question one', ''),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.formError, null);
  assert.equal(result.fieldErrors.domainId, 'Question domain is required.');
  assert.equal(fake.state.questions.length, 0);
  assert.equal(fake.state.options.length, 0);
});

test('bulk action fails validation when textarea is empty', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'operating-style',
        label: 'Operating Style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
  });

  const result = await createBulkQuestionsActionWithDependencies(
    {
      assessmentKey: 'signals',
      assessmentVersionId: 'version-1',
    },
    initialAdminBulkQuestionAuthoringFormState,
    buildBulkFormData(''),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.formError, null);
  assert.equal(result.fieldErrors.questionLines, 'Paste at least one question.');
  assert.equal(fake.state.questions.length, 0);
});

test('bulk action fails validation when textarea contains only blank lines', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'operating-style',
        label: 'Operating Style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
  });

  const result = await createBulkQuestionsActionWithDependencies(
    {
      assessmentKey: 'signals',
      assessmentVersionId: 'version-1',
    },
    initialAdminBulkQuestionAuthoringFormState,
    buildBulkFormData('   \n\n   '),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.formError, null);
  assert.equal(result.fieldErrors.questionLines, 'Paste at least one question.');
  assert.equal(fake.state.questions.length, 0);
});

test('bulk action rejects stale domains instead of silently assigning Operating Style', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'operating-style',
        label: 'Operating Style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
  });

  const result = await createBulkQuestionsActionWithDependencies(
    {
      assessmentKey: 'signals',
      assessmentVersionId: 'version-1',
    },
    initialAdminBulkQuestionAuthoringFormState,
    buildBulkFormData('Question one\nQuestion two', 'domain-2'),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.formError, 'Select a valid question domain before importing questions.');
  assert.equal(fake.state.questions.length, 0);
  assert.equal(fake.state.options.length, 0);
});

test('duplicates a question below the source and copies options and weights deterministically', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q01',
        prompt: 'Existing question one',
        orderIndex: 0,
      },
      {
        id: 'question-2',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q02',
        prompt: 'Duplicate me',
        orderIndex: 1,
      },
      {
        id: 'question-3',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q03',
        prompt: 'Existing question three',
        orderIndex: 2,
      },
      {
        id: 'question-9',
        assessmentVersionId: 'version-2',
        domainId: 'domain-1',
        questionKey: 'q01',
        prompt: 'Other version question',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-2',
        optionKey: 'q02_a',
        optionLabel: 'A',
        optionText: 'Strongly agree',
        orderIndex: 1,
      },
      {
        id: 'option-2',
        assessmentVersionId: 'version-1',
        questionId: 'question-2',
        optionKey: 'q02_b',
        optionLabel: 'B',
        optionText: 'Agree',
        orderIndex: 2,
      },
      {
        id: 'option-3',
        assessmentVersionId: 'version-1',
        questionId: 'question-3',
        optionKey: 'q03_a',
        optionLabel: 'A',
        optionText: 'Downstream option',
        orderIndex: 1,
      },
      {
        id: 'option-9',
        assessmentVersionId: 'version-2',
        questionId: 'question-9',
        optionKey: 'q01_a',
        optionLabel: 'A',
        optionText: 'Other version option',
        orderIndex: 1,
      },
    ],
    optionSignalWeights: [
      {
        id: 'weight-1',
        optionId: 'option-1',
        signalId: 'signal-1',
        weight: '1.2500',
      },
      {
        id: 'weight-2',
        optionId: 'option-2',
        signalId: 'signal-2',
        weight: '-0.5000',
      },
      {
        id: 'weight-9',
        optionId: 'option-9',
        signalId: 'signal-9',
        weight: '2.0000',
      },
    ],
  });

  const duplicatedQuestion = await duplicateQuestionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    sourceQuestionId: 'question-2',
  });

  assert.equal(fake.state.questions.length, 5);
  assert.deepEqual(
    fake.state.questions
      .filter((question) => question.assessmentVersionId === 'version-1')
      .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
      .map((question) => ({
        id: question.id,
        key: question.questionKey,
        prompt: question.prompt,
        orderIndex: question.orderIndex,
      })),
    [
      { id: 'question-1', key: 'q01', prompt: 'Existing question one', orderIndex: 0 },
      { id: 'question-2', key: 'q02', prompt: 'Duplicate me', orderIndex: 1 },
      { id: 'question-5', key: 'q03', prompt: 'Duplicate me', orderIndex: 2 },
      { id: 'question-3', key: 'q04', prompt: 'Existing question three', orderIndex: 3 },
    ],
  );
  assert.equal(duplicatedQuestion.questionId, 'question-5');
  assert.equal(duplicatedQuestion.assessmentVersionId, 'version-1');
  assert.equal(duplicatedQuestion.domainId, 'domain-1');
  assert.equal(duplicatedQuestion.prompt, 'Duplicate me');
  assert.equal(duplicatedQuestion.key, 'q03');

  const duplicatedOptions = fake.state.options
    .filter((option) => option.questionId === duplicatedQuestion.questionId)
    .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id));

  assert.deepEqual(
    duplicatedOptions.map((option) => ({
      id: option.id,
      key: option.optionKey,
      label: option.optionLabel,
      text: option.optionText,
      orderIndex: option.orderIndex,
    })),
    [
      { id: 'option-5', key: 'q03_a', label: 'A', text: 'Strongly agree', orderIndex: 1 },
      { id: 'option-6', key: 'q03_b', label: 'B', text: 'Agree', orderIndex: 2 },
    ],
  );
  assert.notEqual(duplicatedOptions[0]?.id, 'option-1');
  assert.notEqual(duplicatedOptions[1]?.id, 'option-2');

  const downstreamOption = fake.state.options.find((option) => option.id === 'option-3');
  assert.equal(downstreamOption?.optionKey, 'q04_a');

  const duplicatedWeights = fake.state.optionSignalWeights
    .filter((weight) => duplicatedOptions.some((option) => option.id === weight.optionId))
    .map((weight) => ({
      optionId: weight.optionId,
      signalId: weight.signalId,
      weight: weight.weight,
    }));

  assert.deepEqual(duplicatedWeights, [
    { optionId: 'option-5', signalId: 'signal-1', weight: '1.2500' },
    { optionId: 'option-6', signalId: 'signal-2', weight: '-0.5000' },
  ]);
  assert.equal(
    fake.state.optionSignalWeights.filter((weight) => weight.optionId === 'option-9').length,
    1,
  );
});

test('duplicate question rolls back when copied weight insertion fails', async () => {
  const fake = createFakeDb(
    {
      domains: [
        {
          id: 'domain-1',
          assessmentVersionId: 'version-1',
          domainKey: 'section-one',
          label: 'Section one',
          domainType: 'QUESTION_SECTION',
          orderIndex: 0,
        },
      ],
      questions: [
        {
          id: 'question-1',
          assessmentVersionId: 'version-1',
          domainId: 'domain-1',
          questionKey: 'q01',
          prompt: 'Duplicate me',
          orderIndex: 0,
        },
        {
          id: 'question-2',
          assessmentVersionId: 'version-1',
          domainId: 'domain-1',
          questionKey: 'q02',
          prompt: 'After me',
          orderIndex: 1,
        },
      ],
      options: [
        {
          id: 'option-1',
          assessmentVersionId: 'version-1',
          questionId: 'question-1',
          optionKey: 'q01_a',
          optionLabel: 'A',
          optionText: 'Agree',
          orderIndex: 1,
        },
      ],
      optionSignalWeights: [
        {
          id: 'weight-1',
          optionId: 'option-1',
          signalId: 'signal-1',
          weight: '1.0000',
        },
      ],
    },
    {
      failWeightInsertForOptionId: 'option-2',
    },
  );

  await fake.client.query('BEGIN');
  await assert.rejects(
    () =>
      duplicateQuestionRecord({
        db: fake.client,
        assessmentVersionId: 'version-1',
        sourceQuestionId: 'question-1',
      }),
    /WEIGHT_INSERT_FAILED/,
  );
  await fake.client.query('ROLLBACK');

  assert.deepEqual(
    fake.state.questions.map((question) => ({
      id: question.id,
      key: question.questionKey,
      orderIndex: question.orderIndex,
    })),
    [
      { id: 'question-1', key: 'q01', orderIndex: 0 },
      { id: 'question-2', key: 'q02', orderIndex: 1 },
    ],
  );
  assert.deepEqual(
    fake.state.options.map((option) => ({
      id: option.id,
      questionId: option.questionId,
      key: option.optionKey,
    })),
    [{ id: 'option-1', questionId: 'question-1', key: 'q01_a' }],
  );
  assert.deepEqual(
    fake.state.optionSignalWeights.map((weight) => ({
      id: weight.id,
      optionId: weight.optionId,
      signalId: weight.signalId,
      weight: weight.weight,
    })),
    [{ id: 'weight-1', optionId: 'option-1', signalId: 'signal-1', weight: '1.0000' }],
  );
});

test('creates additional options with deterministic appended order indexes', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q01',
        prompt: 'Existing question',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'q01_a',
        optionLabel: 'A',
        optionText: '',
        orderIndex: 1,
      },
    ],
  });

  await createOptionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    questionId: 'question-1',
    values: {
      key: 'ignored',
      label: 'B',
      text: 'Disagree',
    },
  });

  assert.equal(fake.state.options[1]?.orderIndex, 2);
  assert.equal(fake.state.options[1]?.optionKey, 'q01_b');
});

test('updates question and option metadata in place', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-1',
        domainKey: 'section-two',
        label: 'Section two',
        domainType: 'QUESTION_SECTION',
        orderIndex: 1,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'existing-question',
        prompt: 'Existing question',
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

  await updateQuestionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    questionId: 'question-1',
    values: {
      domainId: 'domain-2',
      key: 'updated-question',
      prompt: 'Updated question prompt',
    },
  });

  await updateOptionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    questionId: 'question-1',
    optionId: 'option-1',
    values: {
      key: 'strongly-agree',
      label: 'AA',
      text: 'Strongly agree',
    },
  });

  assert.equal(fake.state.questions[0]?.domainId, 'domain-2');
  assert.equal(fake.state.questions[0]?.questionKey, 'updated-question');
  assert.equal(fake.state.options[0]?.optionKey, 'strongly-agree');
  assert.equal(fake.state.options[0]?.optionText, 'Strongly agree');
});

test('deleting a question removes its nested options from the same draft version', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'existing-question',
        prompt: 'Existing question',
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

  await deleteQuestionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    questionId: 'question-1',
  });

  assert.equal(fake.state.questions.length, 0);
  assert.equal(fake.state.options.length, 0);
});

test('deleting an option removes only that option', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'existing-question',
        prompt: 'Existing question',
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
      {
        id: 'option-2',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'disagree',
        optionLabel: 'B',
        optionText: 'Disagree',
        orderIndex: 1,
      },
    ],
  });

  await deleteOptionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    questionId: 'question-1',
    optionId: 'option-1',
  });

  assert.equal(fake.state.options.length, 1);
  assert.equal(fake.state.options[0]?.id, 'option-2');
});

test('updates question text inline without changing the question key', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q01',
        prompt: 'Existing question',
        orderIndex: 0,
      },
    ],
  });

  const updated = await updateQuestionText({
    db: fake.db,
    assessmentVersionId: 'version-1',
    questionId: 'question-1',
    prompt: '  Updated question prompt  ',
  });

  assert.equal(updated.prompt, 'Updated question prompt');
  assert.equal(updated.questionKey, 'q01');
  assert.equal(fake.state.questions[0]?.prompt, 'Updated question prompt');
  assert.equal(fake.state.questions[0]?.questionKey, 'q01');
});

test('updates option text inline without changing the option key', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q01',
        prompt: 'Existing question',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'q01_a',
        optionLabel: 'A',
        optionText: '',
        orderIndex: 1,
      },
    ],
  });

  const updated = await updateOptionText({
    db: fake.db,
    assessmentVersionId: 'version-1',
    questionId: 'question-1',
    optionId: 'option-1',
    text: '  Strongly agree  ',
  });

  assert.equal(updated.optionText, 'Strongly agree');
  assert.equal(updated.optionKey, 'q01_a');
  assert.equal(fake.state.options[0]?.optionText, 'Strongly agree');
  assert.equal(fake.state.options[0]?.optionKey, 'q01_a');
});

test('inline question and option text updates reject empty values', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'section-one',
        label: 'Section one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q01',
        prompt: 'Existing question',
        orderIndex: 0,
      },
    ],
    options: [
      {
        id: 'option-1',
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionKey: 'q01_a',
        optionLabel: 'A',
        optionText: '',
        orderIndex: 1,
      },
    ],
  });

  await assert.rejects(
    () =>
      updateQuestionText({
        db: fake.db,
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        prompt: '   ',
      }),
    /QUESTION_PROMPT_REQUIRED/,
  );

  await assert.rejects(
    () =>
      updateOptionText({
        db: fake.db,
        assessmentVersionId: 'version-1',
        questionId: 'question-1',
        optionId: 'option-1',
        text: '   ',
      }),
    /OPTION_TEXT_REQUIRED/,
  );
});
