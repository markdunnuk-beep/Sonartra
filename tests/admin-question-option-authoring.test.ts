import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOptionRecord,
  createQuestionRecord,
  deleteOptionRecord,
  deleteQuestionRecord,
  updateOptionRecord,
  updateQuestionRecord,
} from '@/lib/server/admin-question-option-authoring';

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

function createFakeDb(seed?: {
  domains?: StoredDomain[];
  questions?: StoredQuestion[];
  options?: StoredOption[];
}) {
  const state = {
    domains: [...(seed?.domains ?? [])],
    questions: [...(seed?.questions ?? [])],
    options: [...(seed?.options ?? [])],
  };

  return {
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
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

        if (text.includes('INSERT INTO questions')) {
          state.questions.push({
            id: `question-${state.questions.length + 1}`,
            assessmentVersionId: params?.[0] as string,
            domainId: params?.[1] as string,
            questionKey: params?.[2] as string,
            prompt: params?.[3] as string,
            orderIndex: params?.[4] as number,
          });
          return { rows: [] as T[] };
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
          const [assessmentVersionId, optionKey, excludedOptionId] = params as [
            string,
            string,
            string | null,
          ];
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

        if (text.includes('INSERT INTO options')) {
          state.options.push({
            id: `option-${state.options.length + 1}`,
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
      },
    },
    state,
  };
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

  await createQuestionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    values: {
      domainId: 'domain-1',
      key: 'new-question',
      prompt: 'New question',
    },
  });

  await createOptionRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    questionId: 'question-1',
    values: {
      key: 'disagree',
      label: 'B',
      text: 'Disagree',
    },
  });

  assert.equal(fake.state.questions[1]?.orderIndex, 1);
  assert.equal(fake.state.options[1]?.orderIndex, 1);
  assert.equal(fake.state.questions[1]?.questionKey, 'q02');
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
