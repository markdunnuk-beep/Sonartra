import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadRuntimeExecutionModel,
  RuntimeExecutionModelValidationError,
} from '@/lib/engine/runtime-loader';
import type { RuntimeAssessmentDefinition } from '@/lib/engine/types';

function buildValidDefinition(): RuntimeAssessmentDefinition {
  return {
    assessment: {
      id: 'assessment-1',
      key: 'wplp80',
      title: 'WPLP-80',
      description: 'Assessment',
      estimatedTimeMinutes: 29,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    version: {
      id: 'version-1',
      assessmentId: 'assessment-1',
      versionTag: '1.0.0',
      status: 'published',
      isPublished: true,
      publishedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    domains: [
      {
        id: 'domain-signal',
        key: 'signal_group',
        title: 'Signal Group',
        description: null,
        source: 'signal_group',
        orderIndex: 2,
      },
      {
        id: 'domain-section',
        key: 'question_section',
        title: 'Question Section',
        description: null,
        source: 'question_section',
        orderIndex: 1,
      },
    ],
    signals: [
      {
        id: 'signal-overlay',
        key: 'role_executor',
        title: 'Role Executor',
        description: null,
        domainId: 'domain-signal',
        orderIndex: 2,
        isOverlay: true,
        overlayType: 'role',
      },
      {
        id: 'signal-core',
        key: 'core_focus',
        title: 'Core Focus',
        description: null,
        domainId: 'domain-signal',
        orderIndex: 1,
        isOverlay: false,
        overlayType: 'none',
      },
    ],
    questions: [
      {
        id: 'question-2',
        key: 'q2',
        prompt: 'Second question?',
        description: null,
        domainId: 'domain-section',
        orderIndex: 2,
        options: [
          {
            id: 'option-3',
            key: 'q2_a',
            label: 'Option 3',
            description: 'A',
            questionId: 'question-2',
            orderIndex: 1,
            signalWeights: [
              {
                signalId: 'signal-core',
                weight: 3,
                reverseFlag: false,
                sourceWeightKey: '2|A',
              },
            ],
          },
        ],
      },
      {
        id: 'question-1',
        key: 'q1',
        prompt: 'First question?',
        description: null,
        domainId: 'domain-section',
        orderIndex: 1,
        options: [
          {
            id: 'option-2',
            key: 'q1_b',
            label: 'Option 2',
            description: 'B',
            questionId: 'question-1',
            orderIndex: 2,
            signalWeights: [
              {
                signalId: 'signal-overlay',
                weight: 2,
                reverseFlag: false,
                sourceWeightKey: '1|B',
              },
            ],
          },
          {
            id: 'option-1',
            key: 'q1_a',
            label: 'Option 1',
            description: 'A',
            questionId: 'question-1',
            orderIndex: 1,
            signalWeights: [
              {
                signalId: 'signal-core',
                weight: 1,
                reverseFlag: false,
                sourceWeightKey: '1|A',
              },
            ],
          },
        ],
      },
    ],
  };
}

test('constructs an execution model from a valid runtime definition', () => {
  const definition = buildValidDefinition();
  const model = loadRuntimeExecutionModel(definition);

  assert.equal(model.definition, definition);
  assert.equal(model.domains.length, 2);
  assert.equal(model.signals.length, 2);
  assert.equal(model.questions.length, 2);
  assert.equal(model.options.length, 3);
  assert.ok(Object.isFrozen(model));
  assert.ok(Object.isFrozen(model.indexes));
});

test('builds correct deterministic indexes', () => {
  const model = loadRuntimeExecutionModel(buildValidDefinition());

  assert.equal(model.indexes.domainById['domain-section']?.key, 'question_section');
  assert.equal(model.indexes.domainByKey.question_section?.id, 'domain-section');
  assert.equal(model.indexes.signalById['signal-core']?.key, 'core_focus');
  assert.equal(model.indexes.signalByKey.role_executor?.id, 'signal-overlay');
  assert.equal(model.indexes.questionById['question-1']?.key, 'q1');
  assert.equal(model.indexes.questionByKey.q2?.id, 'question-2');
  assert.equal(model.indexes.optionById['option-1']?.key, 'q1_a');
  assert.deepEqual(
    model.indexes.optionsByQuestionId['question-1']?.map((option) => option.id),
    ['option-1', 'option-2'],
  );
});

test('preserves deterministic ordering across domains, signals, questions, and options', () => {
  const model = loadRuntimeExecutionModel(buildValidDefinition());

  assert.deepEqual(model.domains.map((domain) => domain.id), ['domain-section', 'domain-signal']);
  assert.deepEqual(model.signals.map((signal) => signal.id), ['signal-core', 'signal-overlay']);
  assert.deepEqual(model.questions.map((question) => question.id), ['question-1', 'question-2']);
  assert.deepEqual(model.options.map((option) => option.id), ['option-1', 'option-2', 'option-3']);
  assert.deepEqual(
    model.indexes.optionsByQuestionId['question-1']?.map((option) => option.id),
    ['option-1', 'option-2'],
  );
});

test('fails when a question references a missing domain', () => {
  const definition = buildValidDefinition();
  definition.questions[0] = {
    ...definition.questions[0],
    domainId: 'missing-domain',
  };

  assert.throws(
    () => loadRuntimeExecutionModel(definition),
    (error: unknown) =>
      error instanceof RuntimeExecutionModelValidationError && error.code === 'missing_question_domain',
  );
});

test('fails when an option references a missing question', () => {
  const definition = buildValidDefinition();
  definition.questions[0] = {
    ...definition.questions[0],
    options: [
      {
        ...definition.questions[0]!.options[0]!,
        questionId: 'missing-question',
      },
    ],
  };

  assert.throws(
    () => loadRuntimeExecutionModel(definition),
    (error: unknown) =>
      error instanceof RuntimeExecutionModelValidationError && error.code === 'missing_option_question',
  );
});

test('fails when an option signal weight references a missing signal', () => {
  const definition = buildValidDefinition();
  definition.questions[0] = {
    ...definition.questions[0],
    options: [
      {
        ...definition.questions[0]!.options[0]!,
        signalWeights: [
          {
            ...definition.questions[0]!.options[0]!.signalWeights[0]!,
            signalId: 'missing-signal',
          },
        ],
      },
    ],
  };

  assert.throws(
    () => loadRuntimeExecutionModel(definition),
    (error: unknown) =>
      error instanceof RuntimeExecutionModelValidationError && error.code === 'missing_weight_signal',
  );
});

test('fails on duplicate keys', () => {
  const definition = buildValidDefinition();
  definition.signals[1] = {
    ...definition.signals[1],
    key: definition.signals[0]!.key,
  };

  assert.throws(
    () => loadRuntimeExecutionModel(definition),
    (error: unknown) =>
      error instanceof RuntimeExecutionModelValidationError && error.code === 'duplicate_signal_key',
  );
});

test('preserves overlay signals in the execution model indexes', () => {
  const model = loadRuntimeExecutionModel(buildValidDefinition());
  const overlaySignal = model.indexes.signalByKey.role_executor;

  assert.equal(overlaySignal?.isOverlay, true);
  assert.equal(overlaySignal?.overlayType, 'role');
});

test('returns a deterministic structure across repeated runs', () => {
  const first = loadRuntimeExecutionModel(buildValidDefinition());
  const second = loadRuntimeExecutionModel(buildValidDefinition());

  assert.deepEqual(first, second);
});
