import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildSingleDomainQuestionImportPlan,
  formatSingleDomainQuestionImportError,
  parseSingleDomainQuestionImport,
} from '@/lib/admin/single-domain-question-import';
import {
  formatSingleDomainResponseImportError,
  parseSingleDomainResponseImport,
} from '@/lib/admin/single-domain-response-import';
import {
  formatSingleDomainWeightingsImportError,
  parseSingleDomainWeightingsImport,
} from '@/lib/admin/single-domain-weightings-import';
import {
  importSingleDomainResponsesActionWithDependencies,
  importSingleDomainWeightingsActionWithDependencies,
  importSingleDomainQuestionsActionWithDependencies,
} from '@/lib/server/admin-single-domain-structural-authoring';
import { buildSingleDomainStructuralValidation } from '@/lib/admin/single-domain-structural-validation';

type StoredDomain = {
  id: string;
  assessmentVersionId: string;
  domainType: 'SIGNAL_GROUP';
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
  optionLabel: string;
  optionText: string;
  orderIndex: number;
};

type StoredSignal = {
  id: string;
  assessmentVersionId: string;
  domainId: string;
  signalKey: string;
  orderIndex: number;
};

type StoredWeight = {
  optionId: string;
  signalId: string;
  weight: string;
  sourceWeightKey: string;
};

function buildImportFormData(questionLines: string) {
  const formData = new FormData();
  formData.set('questionLines', questionLines);
  return formData;
}

function buildResponseImportFormData(responseLines: string) {
  const formData = new FormData();
  formData.set('responseLines', responseLines);
  return formData;
}

function buildWeightingsImportFormData(weightingLines: string) {
  const formData = new FormData();
  formData.set('weightingLines', weightingLines);
  return formData;
}

function createFakeDb(seed?: {
  domains?: StoredDomain[];
  questions?: StoredQuestion[];
  options?: StoredOption[];
  signals?: StoredSignal[];
  weights?: StoredWeight[];
}) {
  const state = {
    domains: [...(seed?.domains ?? [])],
    questions: [...(seed?.questions ?? [])],
    options: [...(seed?.options ?? [])],
    signals: [...(seed?.signals ?? [])],
    weights: [...(seed?.weights ?? [])],
  };

  let snapshot: typeof state | null = null;

  function clone() {
    return {
      domains: state.domains.map((domain) => ({ ...domain })),
      questions: state.questions.map((question) => ({ ...question })),
      options: state.options.map((option) => ({ ...option })),
      signals: state.signals.map((signal) => ({ ...signal })),
      weights: state.weights.map((weight) => ({ ...weight })),
    };
  }

  async function query<T>(text: string, params?: readonly unknown[]) {
    if (text === 'BEGIN') {
      snapshot = clone();
      return { rows: [] as T[] };
    }

    if (text === 'COMMIT') {
      snapshot = null;
      return { rows: [] as T[] };
    }

    if (text === 'ROLLBACK') {
      if (snapshot) {
        state.domains = snapshot.domains;
        state.questions = snapshot.questions;
        state.options = snapshot.options;
        state.signals = snapshot.signals;
        state.weights = snapshot.weights;
      }
      snapshot = null;
      return { rows: [] as T[] };
    }

    if (text.includes('COALESCE(av.mode, a.mode) AS resolved_mode')) {
      return {
        rows: ([{ assessment_key: 'role-focus', resolved_mode: 'single_domain' }] as unknown) as T[],
      };
    }

    if (text.includes('FROM domains') && text.includes("domain_type = 'SIGNAL_GROUP'")) {
      const [assessmentVersionId] = params as [string];
      return {
        rows: state.domains
          .filter((domain) => domain.assessmentVersionId === assessmentVersionId)
          .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
          .map((domain) => ({ domain_id: domain.id })) as unknown as T[],
      };
    }

    if (text.includes('SELECT id AS question_id, order_index') && text.includes('FROM questions')) {
      const [assessmentVersionId] = params as [string];
      return {
        rows: state.questions
          .filter((question) => question.assessmentVersionId === assessmentVersionId)
          .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
          .map((question) => ({
            question_id: question.id,
            order_index: question.orderIndex,
          })) as unknown as T[],
      };
    }

    if (text.includes('UPDATE questions') && text.includes('order_index = $3')) {
      const [questionId, assessmentVersionId, orderIndex] = params as [string, string, number];
      const question = state.questions.find(
        (entry) => entry.id === questionId && entry.assessmentVersionId === assessmentVersionId,
      );
      if (question) {
        question.orderIndex = orderIndex;
      }
      return { rows: [] as T[] };
    }

    if (text.includes('INSERT INTO questions') && text.includes('RETURNING id')) {
      const id = `question-${state.questions.length + 1}`;
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

    if (text.includes('INSERT INTO options') && text.includes('RETURNING id')) {
      const id = `option-${state.options.length + 1}`;
      state.options.push({
        id,
        assessmentVersionId: params?.[0] as string,
        questionId: params?.[1] as string,
        optionKey: params?.[2] as string,
        optionLabel: params?.[3] as string,
        optionText: params?.[4] as string,
        orderIndex: params?.[5] as number,
      });
      return { rows: ([{ id }] as unknown) as T[] };
    }

    if (text.includes('SELECT id, order_index') && text.includes('FROM options')) {
      const [questionId, assessmentVersionId] = params as [string, string];
      return {
        rows: state.options
          .filter(
            (option) =>
              option.questionId === questionId && option.assessmentVersionId === assessmentVersionId,
          )
          .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
          .map((option) => ({
            id: option.id,
            order_index: option.orderIndex,
          })) as unknown as T[],
      };
    }

    if (text.includes('FROM questions q') && text.includes('INNER JOIN options o ON o.question_id = q.id')) {
      const [assessmentVersionId, domainId] = params as [string, string];
      return {
        rows: state.questions
          .filter((question) => question.assessmentVersionId === assessmentVersionId && question.domainId === domainId)
          .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
          .flatMap((question) =>
            state.options
              .filter((option) => option.questionId === question.id)
              .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
              .map((option) => ({
                question_id: question.id,
                question_order_index: question.orderIndex,
                option_id: option.id,
                option_label: option.optionLabel,
              })),
          ) as unknown as T[],
      };
    }

    if (text.includes('UPDATE options') && text.includes('option_text = $3')) {
      const [optionId, questionId, optionText] = params as [string, string, string];
      const option = state.options.find((entry) => entry.id === optionId && entry.questionId === questionId);
      if (!option) {
        return { rows: [] as T[] };
      }

      option.optionText = optionText;
      return {
        rows: ([{ id: option.id, option_text: option.optionText, option_key: option.optionKey }] as unknown) as T[],
      };
    }

    if (text.includes('SELECT id AS signal_id, signal_key') && text.includes('FROM signals')) {
      const [assessmentVersionId, domainId] = params as [string, string];
      return {
        rows: state.signals
          .filter((signal) => signal.assessmentVersionId === assessmentVersionId && signal.domainId === domainId)
          .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
          .map((signal) => ({ signal_id: signal.id, signal_key: signal.signalKey })) as unknown as T[],
      };
    }

    if (text.includes('DELETE FROM option_signal_weights')) {
      const [optionId] = params as [string];
      state.weights = state.weights.filter((weight) => weight.optionId !== optionId);
      return { rows: [] as T[] };
    }

    if (text.includes('INSERT INTO option_signal_weights')) {
      const [optionId, signalId, weight, sourceWeightKey] = params as [string, string, string, string];
      state.weights.push({ optionId, signalId, weight, sourceWeightKey });
      return { rows: [] as T[] };
    }

    if (text.includes('UPDATE questions') && text.includes('question_key = $3')) {
      const [questionId, assessmentVersionId, questionKey] = params as [string, string, string];
      const question = state.questions.find(
        (entry) => entry.id === questionId && entry.assessmentVersionId === assessmentVersionId,
      );
      if (question) {
        question.questionKey = questionKey;
      }
      return { rows: [] as T[] };
    }

    if (text.includes('UPDATE options') && text.includes('option_key = $3')) {
      const [optionId, assessmentVersionId, optionKey] = params as [string, string, string];
      const option = state.options.find(
        (entry) => entry.id === optionId && entry.assessmentVersionId === assessmentVersionId,
      );
      if (option) {
        option.optionKey = optionKey;
      }
      return { rows: [] as T[] };
    }

    throw new Error(`Unhandled SQL: ${text}`);
  }

  return {
    state,
    client: {
      query,
      release() {},
    },
  };
}

test('single-domain import parser accepts valid rows and ignores blanks', () => {
  const parsed = parseSingleDomainQuestionImport([
    '1 | First question',
    '',
    '  2| Second question  ',
  ].join('\n'));

  assert.deepEqual(parsed, [
    { lineNumber: 1, requestedOrder: 1, prompt: 'First question' },
    { lineNumber: 3, requestedOrder: 2, prompt: 'Second question' },
  ]);
});

test('single-domain import parser rejects malformed rows and duplicate orders with clear messages', () => {
  assert.equal(
    formatSingleDomainQuestionImportError('SINGLE_DOMAIN_IMPORT_LINE_2_INVALID_FORMAT'),
    'Line 2 must use exactly 2 pipe-delimited columns: order | question_text.',
  );
  assert.equal(
    formatSingleDomainQuestionImportError('SINGLE_DOMAIN_IMPORT_LINE_4_DUPLICATE_ORDER_1'),
    'Line 4 repeats an order already used on line 1.',
  );
  assert.equal(
    formatSingleDomainQuestionImportError('SINGLE_DOMAIN_IMPORT_EXISTING_ORDERS_1,2,3,5'),
    'Questions already exist for orders 1-3, 5. This import only creates new questions, so update those prompts in the authored question cards instead of re-importing them.',
  );
});

test('single-domain import plan preserves explicit final order while keeping existing questions stable', () => {
  const plan = buildSingleDomainQuestionImportPlan({
    existingQuestions: [
      { questionId: 'question-a', orderIndex: 0 },
      { questionId: 'question-b', orderIndex: 1 },
    ],
    rows: [
      { lineNumber: 1, requestedOrder: 1, prompt: 'Imported first' },
      { lineNumber: 2, requestedOrder: 3, prompt: 'Imported third' },
    ],
  });

  assert.deepEqual(plan, [
    { type: 'new', lineNumber: 1, requestedOrder: 1, prompt: 'Imported first', orderIndex: 0 },
    { type: 'existing', questionId: 'question-a', orderIndex: 1 },
    { type: 'new', lineNumber: 2, requestedOrder: 3, prompt: 'Imported third', orderIndex: 2 },
    { type: 'existing', questionId: 'question-b', orderIndex: 3 },
  ]);
});

test('single-domain import action persists ordered questions, canonical keys, and default responses atomically', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
  });

  const result = await importSingleDomainQuestionsActionWithDependencies(
    {
      assessmentKey: 'role-focus',
      assessmentVersionId: 'version-1',
    },
    {
      formError: null,
      fieldErrors: {},
      values: { questionLines: '' },
    },
    buildImportFormData(['2 | Second question', '1 | First question'].join('\n')),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.formError, null);
  assert.deepEqual(
    fake.state.questions
      .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
      .map((question) => ({
        prompt: question.prompt,
        orderIndex: question.orderIndex,
        key: question.questionKey,
      })),
    [
      { prompt: 'First question', orderIndex: 0, key: 'q01' },
      { prompt: 'Second question', orderIndex: 1, key: 'q02' },
    ],
  );
  assert.deepEqual(
    fake.state.options
      .sort((left, right) => left.questionId.localeCompare(right.questionId) || left.orderIndex - right.orderIndex)
      .map((option) => ({
        questionId: option.questionId,
        key: option.optionKey,
        label: option.optionLabel,
        text: option.optionText,
        orderIndex: option.orderIndex,
      })),
    [
      { questionId: 'question-1', key: 'q01_a', label: 'A', text: '', orderIndex: 1 },
      { questionId: 'question-1', key: 'q01_b', label: 'B', text: '', orderIndex: 2 },
      { questionId: 'question-1', key: 'q01_c', label: 'C', text: '', orderIndex: 3 },
      { questionId: 'question-1', key: 'q01_d', label: 'D', text: '', orderIndex: 4 },
      { questionId: 'question-2', key: 'q02_a', label: 'A', text: '', orderIndex: 1 },
      { questionId: 'question-2', key: 'q02_b', label: 'B', text: '', orderIndex: 2 },
      { questionId: 'question-2', key: 'q02_c', label: 'C', text: '', orderIndex: 3 },
      { questionId: 'question-2', key: 'q02_d', label: 'D', text: '', orderIndex: 4 },
    ],
  );
  assert.equal(result.values.questionLines, '');
});

test('single-domain import action rejects empty and invalid rows safely', async () => {
  const emptyResult = await importSingleDomainQuestionsActionWithDependencies(
    {
      assessmentKey: 'role-focus',
      assessmentVersionId: 'version-1',
    },
    {
      formError: null,
      fieldErrors: {},
      values: { questionLines: '' },
    },
    buildImportFormData('   '),
    {
      connect: async () => createFakeDb().client,
      revalidatePath() {},
    },
  );
  assert.equal(emptyResult.fieldErrors.questionLines, 'Paste at least one question row.');

  const invalidFake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
  });
  const invalidResult = await importSingleDomainQuestionsActionWithDependencies(
    {
      assessmentKey: 'role-focus',
      assessmentVersionId: 'version-1',
    },
    {
      formError: null,
      fieldErrors: {},
      values: { questionLines: '' },
    },
    buildImportFormData(['1 | First question', '1 | Duplicate order'].join('\n')),
    {
      connect: async () => invalidFake.client,
      revalidatePath() {},
    },
  );
  assert.equal(
    invalidResult.formError,
    'Line 2 repeats an order already used on line 1.',
  );
});

test('single-domain question import rejects re-importing existing question orders with a specific message', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
    questions: [
      {
        id: 'question-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q01',
        prompt: 'Existing first question',
        orderIndex: 0,
      },
      {
        id: 'question-2',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        questionKey: 'q02',
        prompt: 'Existing second question',
        orderIndex: 1,
      },
    ],
  });

  const result = await importSingleDomainQuestionsActionWithDependencies(
    {
      assessmentKey: 'role-focus',
      assessmentVersionId: 'version-1',
    },
    {
      formError: null,
      fieldErrors: {},
      values: { questionLines: '' },
    },
    buildImportFormData(['1 | Existing first question', '2 | Existing second question'].join('\n')),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(
    result.formError,
    'Questions already exist for orders 1-2. This import only creates new questions, so update those prompts in the authored question cards instead of re-importing them.',
  );
  assert.deepEqual(
    fake.state.questions.map((question) => ({ prompt: question.prompt, orderIndex: question.orderIndex })),
    [
      { prompt: 'Existing first question', orderIndex: 0 },
      { prompt: 'Existing second question', orderIndex: 1 },
    ],
  );
});

test('single-domain structural validation reflects imported questions and response scaffolds through canonical data only', () => {
  const validation = buildSingleDomainStructuralValidation({
    authoredDomains: [
      {
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        label: 'Leadership style',
        description: null,
        orderIndex: 0,
        domainType: 'SIGNAL_GROUP',
        createdAt: '',
        updatedAt: '',
        signals: [
          {
            signalId: 'signal-1',
            signalKey: 'directive',
            label: 'Directive',
            description: null,
            orderIndex: 0,
            createdAt: '',
            updatedAt: '',
          },
        ],
      },
    ],
    authoredQuestions: [
      {
        questionId: 'question-1',
        questionKey: 'q01',
        prompt: 'First question',
        orderIndex: 0,
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        domainLabel: 'Leadership style',
        domainType: 'SIGNAL_GROUP',
        createdAt: '',
        updatedAt: '',
        options: [
          {
            optionId: 'option-1',
            optionKey: 'q01_a',
            optionLabel: 'A',
            optionText: '',
            orderIndex: 1,
            createdAt: '',
            updatedAt: '',
            weightingStatus: 'unmapped',
            signalWeights: [],
          },
        ],
      },
    ],
  });

  assert.equal(validation.questionCount, 1);
  assert.equal(validation.optionCount, 1);
  assert.equal(validation.sections.find((section) => section.key === 'questions')?.status, 'ready');
  assert.equal(validation.sections.find((section) => section.key === 'responses')?.status, 'attention');
});

test('single-domain questions stage source includes the dedicated import surface and shared dirty-state guard', () => {
  const source = readFileSync(
    join(process.cwd(), 'components', 'admin', 'single-domain-structural-authoring.tsx'),
    'utf8',
  );

  assert.match(source, /order \| question_text/);
  assert.match(source, /importSingleDomainQuestionsAction/);
  assert.match(source, /useSingleDomainDirtyForm\(\{ state: importState \}\)/);
  assert.match(source, /default A-D responses are now persisted in the draft/);
  assert.match(source, /This import creates new questions only/);
  assert.doesNotMatch(source, /idleLabel="Add question"/);
});

test('single-domain responses parser rejects malformed rows and duplicates clearly', () => {
  assert.equal(
    formatSingleDomainResponseImportError('SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_2_INVALID_FORMAT'),
    'Line 2 must use exactly 3 pipe-delimited columns: question_order | option_label | response_text.',
  );
  assert.equal(
    formatSingleDomainResponseImportError('SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_4_DUPLICATE_ROW_1'),
    'Line 4 repeats a question_order and option_label already used on line 1.',
  );

  assert.throws(
    () => parseSingleDomainResponseImport(['1|A|First', '1|A|Duplicate'].join('\n')),
    /DUPLICATE_ROW/,
  );
});

test('single-domain responses import updates canonical option text atomically', async () => {
  const fake = createFakeDb({
    domains: [
      { id: 'domain-1', assessmentVersionId: 'version-1', domainType: 'SIGNAL_GROUP', orderIndex: 0 },
    ],
    questions: [
      { id: 'question-1', assessmentVersionId: 'version-1', domainId: 'domain-1', questionKey: 'q01', prompt: 'Question one', orderIndex: 0 },
      { id: 'question-2', assessmentVersionId: 'version-1', domainId: 'domain-1', questionKey: 'q02', prompt: 'Question two', orderIndex: 1 },
    ],
    options: [
      { id: 'option-1', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', optionText: '', orderIndex: 1 },
      { id: 'option-2', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_b', optionLabel: 'B', optionText: '', orderIndex: 2 },
      { id: 'option-3', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_c', optionLabel: 'C', optionText: '', orderIndex: 3 },
      { id: 'option-4', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_d', optionLabel: 'D', optionText: '', orderIndex: 4 },
      { id: 'option-5', assessmentVersionId: 'version-1', questionId: 'question-2', optionKey: 'q02_a', optionLabel: 'A', optionText: '', orderIndex: 1 },
      { id: 'option-6', assessmentVersionId: 'version-1', questionId: 'question-2', optionKey: 'q02_b', optionLabel: 'B', optionText: '', orderIndex: 2 },
      { id: 'option-7', assessmentVersionId: 'version-1', questionId: 'question-2', optionKey: 'q02_c', optionLabel: 'C', optionText: '', orderIndex: 3 },
      { id: 'option-8', assessmentVersionId: 'version-1', questionId: 'question-2', optionKey: 'q02_d', optionLabel: 'D', optionText: '', orderIndex: 4 },
    ],
  });

  const result = await importSingleDomainResponsesActionWithDependencies(
    {
      assessmentKey: 'role-focus',
      assessmentVersionId: 'version-1',
    },
    {
      formError: null,
      fieldErrors: {},
      values: { responseLines: '' },
    },
    buildResponseImportFormData([
      '1 | A | Delivering strong outcomes',
      '1 | B | Setting future direction',
      '1 | C | Growing people well',
      '1 | D | Building consistent process',
    ].join('\n')),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.formError, null);
  assert.equal(result.values.responseLines, '');
  assert.equal(result.updatedQuestionCount, 1);
  assert.equal(result.updatedOptionCount, 4);
  assert.deepEqual(
    fake.state.options
      .filter((option) => option.questionId === 'question-1')
      .map((option) => option.optionText),
    [
      'Delivering strong outcomes',
      'Setting future direction',
      'Growing people well',
      'Building consistent process',
    ],
  );
});

test('single-domain responses import rejects unknown question order without partial writes', async () => {
  const fake = createFakeDb({
    domains: [
      { id: 'domain-1', assessmentVersionId: 'version-1', domainType: 'SIGNAL_GROUP', orderIndex: 0 },
    ],
    questions: [
      { id: 'question-1', assessmentVersionId: 'version-1', domainId: 'domain-1', questionKey: 'q01', prompt: 'Question one', orderIndex: 0 },
    ],
    options: [
      { id: 'option-1', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', optionText: '', orderIndex: 1 },
      { id: 'option-2', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_b', optionLabel: 'B', optionText: '', orderIndex: 2 },
      { id: 'option-3', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_c', optionLabel: 'C', optionText: '', orderIndex: 3 },
      { id: 'option-4', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_d', optionLabel: 'D', optionText: '', orderIndex: 4 },
    ],
  });

  const result = await importSingleDomainResponsesActionWithDependencies(
    {
      assessmentKey: 'role-focus',
      assessmentVersionId: 'version-1',
    },
    {
      formError: null,
      fieldErrors: {},
      values: { responseLines: '' },
    },
    buildResponseImportFormData(['1 | A | Valid', '2 | A | Missing question'].join('\n')),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(
    result.formError,
    'Line 2 references question order 2, which does not exist in the persisted draft.',
  );
  assert.deepEqual(
    fake.state.options.map((option) => option.optionText),
    ['', '', '', ''],
  );
});

test('single-domain weightings parser rejects malformed rows and duplicates clearly', () => {
  assert.equal(
    formatSingleDomainWeightingsImportError('SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_2_INVALID_FORMAT'),
    'Line 2 must use exactly 4 pipe-delimited columns: question_order | option_label | signal_key | weight.',
  );
  assert.equal(
    formatSingleDomainWeightingsImportError('SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_4_DUPLICATE_ROW_1'),
    'Line 4 repeats a question_order, option_label, and signal_key already used on line 1.',
  );

  assert.throws(
    () => parseSingleDomainWeightingsImport(['1|A|vision|1', '1|A|vision|2'].join('\n')),
    /DUPLICATE_ROW/,
  );
});

test('single-domain weightings import replaces canonical weight groups atomically', async () => {
  const fake = createFakeDb({
    domains: [
      { id: 'domain-1', assessmentVersionId: 'version-1', domainType: 'SIGNAL_GROUP', orderIndex: 0 },
    ],
    questions: [
      { id: 'question-1', assessmentVersionId: 'version-1', domainId: 'domain-1', questionKey: 'q01', prompt: 'Question one', orderIndex: 0 },
    ],
    options: [
      { id: 'option-1', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', optionText: 'A', orderIndex: 1 },
      { id: 'option-2', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_b', optionLabel: 'B', optionText: 'B', orderIndex: 2 },
      { id: 'option-3', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_c', optionLabel: 'C', optionText: 'C', orderIndex: 3 },
      { id: 'option-4', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_d', optionLabel: 'D', optionText: 'D', orderIndex: 4 },
    ],
    signals: [
      { id: 'signal-1', assessmentVersionId: 'version-1', domainId: 'domain-1', signalKey: 'results', orderIndex: 0 },
      { id: 'signal-2', assessmentVersionId: 'version-1', domainId: 'domain-1', signalKey: 'vision', orderIndex: 1 },
    ],
    weights: [{ optionId: 'option-1', signalId: 'signal-1', weight: '9', sourceWeightKey: 'legacy' }],
  });

  const result = await importSingleDomainWeightingsActionWithDependencies(
    {
      assessmentKey: 'role-focus',
      assessmentVersionId: 'version-1',
    },
    {
      formError: null,
      fieldErrors: {},
      values: { weightingLines: '' },
    },
    buildWeightingsImportFormData([
      '1 | A | results | 1',
      '1 | A | vision | 0.5',
      '1 | B | vision | 1',
    ].join('\n')),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.formError, null);
  assert.equal(result.values.weightingLines, '');
  assert.equal(result.updatedOptionGroupCount, 2);
  assert.equal(result.updatedWeightCount, 3);
  assert.deepEqual(fake.state.weights, [
    { optionId: 'option-1', signalId: 'signal-1', weight: '1', sourceWeightKey: '1|A|results' },
    { optionId: 'option-1', signalId: 'signal-2', weight: '0.5', sourceWeightKey: '1|A|vision' },
    { optionId: 'option-2', signalId: 'signal-2', weight: '1', sourceWeightKey: '1|B|vision' },
  ]);
});

test('single-domain weightings import rejects unknown signal keys without partial writes', async () => {
  const fake = createFakeDb({
    domains: [
      { id: 'domain-1', assessmentVersionId: 'version-1', domainType: 'SIGNAL_GROUP', orderIndex: 0 },
    ],
    questions: [
      { id: 'question-1', assessmentVersionId: 'version-1', domainId: 'domain-1', questionKey: 'q01', prompt: 'Question one', orderIndex: 0 },
    ],
    options: [
      { id: 'option-1', assessmentVersionId: 'version-1', questionId: 'question-1', optionKey: 'q01_a', optionLabel: 'A', optionText: 'A', orderIndex: 1 },
    ],
    signals: [
      { id: 'signal-1', assessmentVersionId: 'version-1', domainId: 'domain-1', signalKey: 'results', orderIndex: 0 },
    ],
    weights: [{ optionId: 'option-1', signalId: 'signal-1', weight: '9', sourceWeightKey: 'legacy' }],
  });

  const result = await importSingleDomainWeightingsActionWithDependencies(
    {
      assessmentKey: 'role-focus',
      assessmentVersionId: 'version-1',
    },
    {
      formError: null,
      fieldErrors: {},
      values: { weightingLines: '' },
    },
    buildWeightingsImportFormData('1 | A | missing_signal | 1'),
    {
      connect: async () => fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(
    result.formError,
    'Line 1 references signal key "missing_signal", which does not exist in the persisted draft.',
  );
  assert.deepEqual(fake.state.weights, [
    { optionId: 'option-1', signalId: 'signal-1', weight: '9', sourceWeightKey: 'legacy' },
  ]);
});

test('single-domain responses and weightings stage source include the bulk import surfaces', () => {
  const source = readFileSync(
    join(process.cwd(), 'components', 'admin', 'single-domain-structural-authoring.tsx'),
    'utf8',
  );

  assert.match(source, /question_order \| option_label \| response_text/);
  assert.match(source, /importSingleDomainResponsesAction/);
  assert.match(source, /question_order \| option_label \| signal_key \| weight/);
  assert.match(source, /importSingleDomainWeightingsAction/);
  assert.match(source, /Allowed signal keys/);
});
