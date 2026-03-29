import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdminWeightGridModel,
  resolveAdminWeightGridSaveMode,
} from '@/components/admin/admin-weight-grid';
import type {
  AdminAssessmentDetailAvailableSignal,
  AdminAssessmentDetailQuestion,
} from '@/lib/server/admin-assessment-detail';

function createSignal(params: {
  signalId: string;
  signalKey: string;
  signalLabel: string;
  domainLabel: string;
  signalOrderIndex: number;
}): AdminAssessmentDetailAvailableSignal {
  return {
    signalId: params.signalId,
    signalKey: params.signalKey,
    signalLabel: params.signalLabel,
    signalDescription: null,
    signalOrderIndex: params.signalOrderIndex,
    domainId: 'domain-1',
    domainKey: 'domain_1',
    domainLabel: params.domainLabel,
    domainOrderIndex: 0,
  };
}

function createQuestion(): AdminAssessmentDetailQuestion {
  return {
    questionId: 'question-1',
    questionKey: 'question_1',
    prompt: 'Which response fits best?',
    orderIndex: 0,
    domainId: 'domain-questions',
    domainKey: 'question_section',
    domainLabel: 'Section 1',
    domainType: 'QUESTION_SECTION',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    options: [
      {
        optionId: 'option-1',
        optionKey: 'question_1_a',
        optionLabel: 'A',
        optionText: 'Move first and refine later.',
        orderIndex: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        weightingStatus: 'weighted',
        signalWeights: [
          {
            optionSignalWeightId: 'weight-1',
            signalId: 'signal-1',
            signalKey: 'signal_speed',
            signalLabel: 'Speed',
            signalDomainId: 'domain-1',
            signalDomainKey: 'domain_1',
            signalDomainLabel: 'Execution',
            weight: '2.5000',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      {
        optionId: 'option-2',
        optionKey: 'question_1_b',
        optionLabel: 'B',
        optionText: 'Gather more input first.',
        orderIndex: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        weightingStatus: 'unmapped',
        signalWeights: [],
      },
    ],
  };
}

test('buildAdminWeightGridModel returns all option rows and signal columns for the selected question', () => {
  const question = createQuestion();
  const signals = [
    createSignal({
      signalId: 'signal-1',
      signalKey: 'signal_speed',
      signalLabel: 'Speed',
      domainLabel: 'Execution',
      signalOrderIndex: 0,
    }),
    createSignal({
      signalId: 'signal-2',
      signalKey: 'signal_deliberation',
      signalLabel: 'Deliberation',
      domainLabel: 'Execution',
      signalOrderIndex: 1,
    }),
  ];

  const model = buildAdminWeightGridModel(question, signals);

  assert.equal(model.rows.length, 2);
  assert.equal(model.columns.length, 2);
  assert.equal(model.rows[0]?.cells.length, 2);
  assert.equal(model.rows[1]?.cells.length, 2);
});

test('buildAdminWeightGridModel shows existing weights and leaves unrelated cells empty', () => {
  const question = createQuestion();
  const signals = [
    createSignal({
      signalId: 'signal-1',
      signalKey: 'signal_speed',
      signalLabel: 'Speed',
      domainLabel: 'Execution',
      signalOrderIndex: 0,
    }),
    createSignal({
      signalId: 'signal-2',
      signalKey: 'signal_deliberation',
      signalLabel: 'Deliberation',
      domainLabel: 'Execution',
      signalOrderIndex: 1,
    }),
  ];

  const model = buildAdminWeightGridModel(question, signals);

  assert.equal(model.rows[0]?.cells[0]?.value, '2.5000');
  assert.equal(model.rows[0]?.cells[0]?.mapping?.optionSignalWeightId, 'weight-1');
  assert.equal(model.rows[0]?.cells[1]?.value, '');
  assert.equal(model.rows[1]?.cells[0]?.value, '');
  assert.equal(model.rows[1]?.cells[1]?.value, '');
});

test('resolveAdminWeightGridSaveMode distinguishes create, update, delete, and noop', () => {
  const mapping = createQuestion().options[0]?.signalWeights[0] ?? null;

  assert.equal(
    resolveAdminWeightGridSaveMode({
      currentValue: '',
      nextValue: '1.2500',
      mapping: null,
    }),
    'create',
  );
  assert.equal(
    resolveAdminWeightGridSaveMode({
      currentValue: '2.5000',
      nextValue: '3.0000',
      mapping,
    }),
    'update',
  );
  assert.equal(
    resolveAdminWeightGridSaveMode({
      currentValue: '2.5000',
      nextValue: '',
      mapping,
    }),
    'delete',
  );
  assert.equal(
    resolveAdminWeightGridSaveMode({
      currentValue: '2.5000',
      nextValue: '2.5000',
      mapping,
    }),
    'noop',
  );
});
