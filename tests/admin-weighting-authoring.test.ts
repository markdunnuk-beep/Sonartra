import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOptionSignalWeightRecord,
  deleteOptionSignalWeightRecord,
  updateOptionSignalWeightRecord,
} from '@/lib/server/admin-weighting-authoring';

type StoredQuestion = {
  id: string;
  assessmentVersionId: string;
};

type StoredOption = {
  id: string;
  questionId: string;
};

type StoredSignal = {
  id: string;
  assessmentVersionId: string;
};

type StoredOptionSignalWeight = {
  id: string;
  optionId: string;
  signalId: string;
  weight: string;
};

function createFakeDb(seed?: {
  questions?: StoredQuestion[];
  options?: StoredOption[];
  signals?: StoredSignal[];
  weights?: StoredOptionSignalWeight[];
}) {
  const state = {
    questions: [...(seed?.questions ?? [])],
    options: [...(seed?.options ?? [])],
    signals: [...(seed?.signals ?? [])],
    weights: [...(seed?.weights ?? [])],
  };

  return {
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        if (text.includes('FROM options o') && text.includes('INNER JOIN questions q ON q.id = o.question_id')) {
          const [optionId, assessmentVersionId] = params as [string, string];
          const option = state.options.find((candidate) => candidate.id === optionId);
          const question = option
            ? state.questions.find(
                (candidate) =>
                  candidate.id === option.questionId && candidate.assessmentVersionId === assessmentVersionId,
              )
            : null;

          return {
            rows:
              option && question
                ? ([
                    {
                      option_id: option.id,
                      question_id: question.id,
                      assessment_version_id: question.assessmentVersionId,
                    },
                  ] as unknown as T[])
                : ([] as T[]),
          };
        }

        if (text.includes('FROM signals') && text.includes('assessment_version_id = $2')) {
          const [signalId, assessmentVersionId] = params as [string, string];
          const signal = state.signals.find(
            (candidate) => candidate.id === signalId && candidate.assessmentVersionId === assessmentVersionId,
          );
          return {
            rows: signal
              ? ([{ signal_id: signal.id, assessment_version_id: signal.assessmentVersionId }] as unknown as T[])
              : ([] as T[]),
          };
        }

        if (text.includes('FROM option_signal_weights') && text.includes('signal_id = $2') && text.includes('$3::uuid IS NULL')) {
          const [optionId, signalId, excludedId] = params as [string, string, string | null];
          const rows = state.weights
            .filter(
              (weight) =>
                weight.optionId === optionId &&
                weight.signalId === signalId &&
                (excludedId === null || weight.id !== excludedId),
            )
            .map((weight) => ({ option_signal_weight_id: weight.id }));
          return { rows: rows as T[] };
        }

        if (text.includes('FROM option_signal_weights osw') && text.includes('INNER JOIN options o ON o.id = osw.option_id')) {
          const [optionSignalWeightId, optionId, assessmentVersionId] = params as [string, string, string];
          const weight = state.weights.find(
            (candidate) => candidate.id === optionSignalWeightId && candidate.optionId === optionId,
          );
          const option = weight
            ? state.options.find((candidate) => candidate.id === weight.optionId)
            : null;
          const question = option
            ? state.questions.find(
                (candidate) =>
                  candidate.id === option.questionId && candidate.assessmentVersionId === assessmentVersionId,
              )
            : null;
          const signal = weight
            ? state.signals.find(
                (candidate) =>
                  candidate.id === weight.signalId && candidate.assessmentVersionId === assessmentVersionId,
              )
            : null;

          return {
            rows:
              weight && option && question && signal
                ? ([{ option_signal_weight_id: weight.id }] as unknown as T[])
                : ([] as T[]),
          };
        }

        if (text.includes('INSERT INTO option_signal_weights')) {
          state.weights.push({
            id: `weight-${state.weights.length + 1}`,
            optionId: params?.[0] as string,
            signalId: params?.[1] as string,
            weight: String(params?.[2] as string),
          });
          return { rows: [] as T[] };
        }

        if (text.includes('UPDATE option_signal_weights')) {
          const [optionSignalWeightId, optionId, signalId, weight] = params as [string, string, string, string];
          const match = state.weights.find(
            (candidate) => candidate.id === optionSignalWeightId && candidate.optionId === optionId,
          );
          if (match) {
            match.signalId = signalId;
            match.weight = String(weight);
          }
          return { rows: [] as T[] };
        }

        if (text.includes('DELETE FROM option_signal_weights')) {
          const [optionSignalWeightId, optionId] = params as [string, string];
          state.weights = state.weights.filter(
            (candidate) => !(candidate.id === optionSignalWeightId && candidate.optionId === optionId),
          );
          return { rows: [] as T[] };
        }

        return { rows: [] as T[] };
      },
    },
    state,
  };
}

test('creates, updates, and deletes option signal weights inside the same draft version', async () => {
  const fake = createFakeDb({
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1' }],
    options: [{ id: 'option-1', questionId: 'question-1' }],
    signals: [
      { id: 'signal-1', assessmentVersionId: 'version-1' },
      { id: 'signal-2', assessmentVersionId: 'version-1' },
    ],
    weights: [{ id: 'weight-1', optionId: 'option-1', signalId: 'signal-1', weight: '1.0000' }],
  });

  await createOptionSignalWeightRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    optionId: 'option-1',
    values: {
      signalId: 'signal-2',
      weight: '2.5000',
    },
  });

  await updateOptionSignalWeightRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    optionId: 'option-1',
    optionSignalWeightId: 'weight-1',
    values: {
      signalId: 'signal-1',
      weight: '3.7500',
    },
  });

  await deleteOptionSignalWeightRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    optionId: 'option-1',
    optionSignalWeightId: 'weight-1',
  });

  assert.equal(fake.state.weights.length, 1);
  assert.equal(fake.state.weights[0]?.signalId, 'signal-2');
  assert.equal(fake.state.weights[0]?.weight, '2.5000');
});

test('blocks duplicate mappings and cross-version signal leakage', async () => {
  const fake = createFakeDb({
    questions: [{ id: 'question-1', assessmentVersionId: 'version-1' }],
    options: [{ id: 'option-1', questionId: 'question-1' }],
    signals: [
      { id: 'signal-1', assessmentVersionId: 'version-1' },
      { id: 'signal-foreign', assessmentVersionId: 'version-2' },
    ],
    weights: [{ id: 'weight-1', optionId: 'option-1', signalId: 'signal-1', weight: '1.0000' }],
  });

  await assert.rejects(
    () =>
      createOptionSignalWeightRecord({
        db: fake.db,
        assessmentVersionId: 'version-1',
        optionId: 'option-1',
        values: {
          signalId: 'signal-1',
          weight: '2.0000',
        },
      }),
    /OPTION_SIGNAL_MAPPING_EXISTS/,
  );

  await assert.rejects(
    () =>
      createOptionSignalWeightRecord({
        db: fake.db,
        assessmentVersionId: 'version-1',
        optionId: 'option-1',
        values: {
          signalId: 'signal-foreign',
          weight: '2.0000',
        },
      }),
    /SIGNAL_NOT_FOUND/,
  );
});
