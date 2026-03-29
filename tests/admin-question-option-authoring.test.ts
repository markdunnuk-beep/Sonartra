import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBulkQuestionRecords,
  createBulkQuestionsActionWithDependencies,
  createOptionRecord,
  createQuestionRecord,
  deleteOptionRecord,
  deleteQuestionRecord,
  updateOptionRecord,
  updateQuestionRecord,
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
};

function cloneState(state: FakeState): FakeState {
  return {
    domains: state.domains.map((domain) => ({ ...domain })),
    questions: state.questions.map((question) => ({ ...question })),
    options: state.options.map((option) => ({ ...option })),
  };
}

function createFakeDb(
  seed?: {
    domains?: StoredDomain[];
    questions?: StoredQuestion[];
    options?: StoredOption[];
  },
  config?: {
    failOptionKey?: string;
  },
) {
  const state: FakeState = {
    domains: [...(seed?.domains ?? [])],
    questions: [...(seed?.questions ?? [])],
    options: [...(seed?.options ?? [])],
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
      }
      transactionSnapshot = null;
      return { rows: [] as T[] };
    }

    if (text.includes('DELETE FROM questions')) {
      const [questionId, assessmentVersionId] = params as [string, string];
      state.questions = state.questions.filter(
        (question) => !(question.id === questionId && question.assessmentVersionId === assessmentVersionId),
      );
      state.options = state.options.filter((option) => option.questionId !== questionId);
      return { rows: [] as T[] };
    }

    if (text.includes('DELETE FROM options')) {
      const [optionId, questionId] = params as [string, string];
      state.options = state.options.filter(
        (option) => !(option.id === optionId && option.questionId === questionId),
      );
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

    if (text.includes('SELECT id') && text.includes('FROM options') && text.includes('WHERE id = $1')) {
      const [optionId, questionId] = params as [string, string];
      const match = state.options.find(
        (option) => option.id === optionId && option.questionId === questionId,
      );
      return { rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]) };
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

function buildBulkFormData(count: string) {
  const formData = new FormData();
  formData.set('count', count);
  return formData;
}

test('creates questions and options with deterministic appended order indexes', async () => {
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

  const createdQuestion = await createQuestionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    values: {
      domainId: 'domain-1',
      key: 'new-question',
      prompt: 'New question',
    },
  });

  assert.equal(fake.state.questions[1]?.orderIndex, 1);
  assert.equal(fake.state.questions[1]?.questionKey, 'q02');
  assert.equal(fake.state.options.length, 5);
  assert.equal(createdQuestion.key, 'q02');
  assert.equal(createdQuestion.questionId, 'question-2');
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

test('bulk creation appends deterministic questions with default options', async () => {
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
    count: 3,
  });

  assert.equal(createdQuestions.length, 3);
  assert.deepEqual(
    createdQuestions.map((question) => ({
      key: question.key,
      orderIndex: question.orderIndex,
      domainId: question.domainId,
      assessmentVersionId: question.assessmentVersionId,
    })),
    [
      { key: 'q02', orderIndex: 1, domainId: 'domain-1', assessmentVersionId: 'version-1' },
      { key: 'q03', orderIndex: 2, domainId: 'domain-1', assessmentVersionId: 'version-1' },
      { key: 'q04', orderIndex: 3, domainId: 'domain-1', assessmentVersionId: 'version-1' },
    ],
  );
  assert.equal(fake.state.questions.length, 4);
  assert.equal(fake.state.options.length, 13);
  assert.deepEqual(
    createdQuestions[0]?.options.map((option) => option.key),
    ['q02_a', 'q02_b', 'q02_c', 'q02_d'],
  );
  assert.deepEqual(
    createdQuestions[2]?.options.map((option) => option.key),
    ['q04_a', 'q04_b', 'q04_c', 'q04_d'],
  );
  assert.ok(createdQuestions.every((question) => question.options.length === 4));
  assert.ok(createdQuestions.every((question) => question.options.every((option) => option.assessmentVersionId === 'version-1')));
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
    buildBulkFormData('2'),
    {
      connect: async () => fake.client,
      revalidatePath(path: string): void {
        revalidatedPaths.push(path);
      },
    },
  );

  assert.equal(result.formError, 'Bulk question generation could not be saved. Try again.');
  assert.equal(fake.state.questions.length, 1);
  assert.equal(fake.state.options.length, 1);
  assert.deepEqual(revalidatedPaths, []);
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
