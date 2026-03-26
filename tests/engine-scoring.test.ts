import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRuntimeExecutionModel } from '@/lib/engine/runtime-loader';
import { scoreAssessmentResponses, ScoringError } from '@/lib/engine/scoring';
import type { RuntimeAssessmentDefinition, RuntimeExecutionModel, RuntimeResponseSet } from '@/lib/engine/types';

function buildDefinition(): RuntimeAssessmentDefinition {
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
        id: 'domain-signals',
        key: 'signals',
        title: 'Signals',
        description: null,
        source: 'signal_group',
        orderIndex: 2,
      },
      {
        id: 'domain-section',
        key: 'section_a',
        title: 'Section A',
        description: null,
        source: 'question_section',
        orderIndex: 1,
      },
    ],
    signals: [
      {
        id: 'signal-core',
        key: 'core_focus',
        title: 'Core Focus',
        description: null,
        domainId: 'domain-signals',
        orderIndex: 1,
        isOverlay: false,
        overlayType: 'none',
      },
      {
        id: 'signal-support',
        key: 'support_drive',
        title: 'Support Drive',
        description: null,
        domainId: 'domain-signals',
        orderIndex: 2,
        isOverlay: false,
        overlayType: 'none',
      },
      {
        id: 'signal-overlay',
        key: 'role_executor',
        title: 'Role Executor',
        description: null,
        domainId: 'domain-signals',
        orderIndex: 3,
        isOverlay: true,
        overlayType: 'role',
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
          {
            id: 'option-4',
            key: 'q2_b',
            label: 'Option 4',
            description: 'B',
            questionId: 'question-2',
            orderIndex: 2,
            signalWeights: [
              {
                signalId: 'signal-support',
                weight: 2,
                reverseFlag: false,
                sourceWeightKey: '2|B',
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
                signalId: 'signal-support',
                weight: 4,
                reverseFlag: false,
                sourceWeightKey: '1|B',
              },
              {
                signalId: 'signal-overlay',
                weight: 1,
                reverseFlag: false,
                sourceWeightKey: '1|B-role',
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

function buildExecutionModel(): RuntimeExecutionModel {
  return loadRuntimeExecutionModel(buildDefinition());
}

function buildResponses(
  selectedOptionsByQuestionId: Record<string, string>,
): RuntimeResponseSet {
  const responsesByQuestionId = Object.fromEntries(
    Object.entries(selectedOptionsByQuestionId).map(([questionId, optionId], index) => [
      questionId,
      {
        responseId: `response-${index + 1}`,
        attemptId: 'attempt-1',
        questionId,
        value: { selectedOptionId: optionId },
        updatedAt: `2026-01-01T00:00:0${index + 1}.000Z`,
      },
    ]),
  );

  return {
    attemptId: 'attempt-1',
    assessmentKey: 'wplp80',
    versionTag: '1.0.0',
    status: 'submitted',
    responsesByQuestionId,
    submittedAt: '2026-01-01T00:01:00.000Z',
  };
}

test('scores a minimal valid response', () => {
  const result = scoreAssessmentResponses({
    executionModel: buildExecutionModel(),
    responses: buildResponses({ 'question-1': 'option-1' }),
  });

  assert.equal(result.signalScores[0]?.rawTotal, 1);
  assert.equal(result.signalScores[1]?.rawTotal, 0);
  assert.equal(result.signalScores[2]?.rawTotal, 0);
  assert.equal(result.diagnostics.totalResponsesProcessed, 1);
});

test('accumulates scores from multiple questions into the same signal', () => {
  const result = scoreAssessmentResponses({
    executionModel: buildExecutionModel(),
    responses: buildResponses({
      'question-1': 'option-1',
      'question-2': 'option-3',
    }),
  });

  assert.equal(result.signalScores[0]?.signalKey, 'core_focus');
  assert.equal(result.signalScores[0]?.rawTotal, 4);
});

test('applies one option weight set to multiple signals', () => {
  const result = scoreAssessmentResponses({
    executionModel: buildExecutionModel(),
    responses: buildResponses({ 'question-1': 'option-2' }),
  });

  assert.equal(result.signalScores[1]?.rawTotal, 4);
  assert.equal(result.signalScores[2]?.rawTotal, 1);
  assert.equal(result.diagnostics.totalWeightsApplied, 2);
  assert.equal(result.diagnostics.totalScoreMass, 5);
});

test('includes zero-score signals in the result', () => {
  const result = scoreAssessmentResponses({
    executionModel: buildExecutionModel(),
    responses: buildResponses({ 'question-2': 'option-4' }),
  });

  assert.deepEqual(
    result.signalScores.map((signalScore) => signalScore.rawTotal),
    [0, 2, 0],
  );
  assert.equal(result.diagnostics.zeroScoreSignalCount, 2);
});

test('allows unanswered questions without failure', () => {
  const result = scoreAssessmentResponses({
    executionModel: buildExecutionModel(),
    responses: buildResponses({ 'question-1': 'option-1' }),
  });

  assert.equal(result.diagnostics.answeredQuestions, 1);
  assert.equal(result.diagnostics.unansweredQuestions, 1);
  assert.deepEqual(result.diagnostics.warnings, ['incomplete_response_set']);
});

test('builds domain summaries deterministically', () => {
  const result = scoreAssessmentResponses({
    executionModel: buildExecutionModel(),
    responses: buildResponses({
      'question-1': 'option-2',
      'question-2': 'option-3',
    }),
  });

  assert.deepEqual(
    result.domainSummaries.map((summary) => ({
      domainKey: summary.domainKey,
      rawTotal: summary.rawTotal,
      signalCount: summary.signalCount,
      answeredQuestionCount: summary.answeredQuestionCount,
    })),
    [
      {
        domainKey: 'section_a',
        rawTotal: 0,
        signalCount: 0,
        answeredQuestionCount: 2,
      },
      {
        domainKey: 'signals',
        rawTotal: 8,
        signalCount: 3,
        answeredQuestionCount: 2,
      },
    ],
  );
});

test('preserves deterministic ordering for signals and domains', () => {
  const result = scoreAssessmentResponses({
    executionModel: buildExecutionModel(),
    responses: buildResponses({
      'question-1': 'option-2',
      'question-2': 'option-4',
    }),
  });

  assert.deepEqual(result.signalScores.map((signal) => signal.signalId), [
    'signal-core',
    'signal-support',
    'signal-overlay',
  ]);
  assert.deepEqual(result.domainSummaries.map((domain) => domain.domainId), [
    'domain-section',
    'domain-signals',
  ]);
  assert.deepEqual(
    result.domainSummaries[1]?.signalScores.map((signal) => signal.signalId),
    ['signal-core', 'signal-support', 'signal-overlay'],
  );
});

test('fails on unknown response question', () => {
  assert.throws(
    () =>
      scoreAssessmentResponses({
        executionModel: buildExecutionModel(),
        responses: buildResponses({ 'question-missing': 'option-1' }),
      }),
    (error: unknown) => error instanceof ScoringError && error.code === 'unknown_response_question',
  );
});

test('fails on invalid option for a known question', () => {
  assert.throws(
    () =>
      scoreAssessmentResponses({
        executionModel: buildExecutionModel(),
        responses: buildResponses({ 'question-1': 'option-4' }),
      }),
    (error: unknown) => error instanceof ScoringError && error.code === 'invalid_response_option',
  );
});

test('scores overlay signals exactly like other signals', () => {
  const result = scoreAssessmentResponses({
    executionModel: buildExecutionModel(),
    responses: buildResponses({ 'question-1': 'option-2' }),
  });

  const overlaySignal = result.signalScores.find((signal) => signal.signalId === 'signal-overlay');
  assert.equal(overlaySignal?.rawTotal, 1);
  assert.equal(overlaySignal?.isOverlay, true);
  assert.equal(overlaySignal?.overlayType, 'role');
});

test('returns zero totals with sane diagnostics for zero-answer submission', () => {
  const result = scoreAssessmentResponses({
    executionModel: buildExecutionModel(),
    responses: buildResponses({}),
  });

  assert.deepEqual(
    result.signalScores.map((signal) => signal.rawTotal),
    [0, 0, 0],
  );
  assert.equal(result.diagnostics.zeroAnswerSubmission, true);
  assert.equal(result.diagnostics.totalResponsesProcessed, 0);
  assert.deepEqual(result.diagnostics.warnings, [
    'incomplete_response_set',
    'no_answers_submitted',
  ]);
});

test('produces byte-stable equivalent output for repeated runs', () => {
  const executionModel = buildExecutionModel();
  const responses = buildResponses({
    'question-1': 'option-2',
    'question-2': 'option-3',
  });

  const first = scoreAssessmentResponses({ executionModel, responses });
  const second = scoreAssessmentResponses({ executionModel, responses });

  assert.equal(JSON.stringify(first), JSON.stringify(second));
});
