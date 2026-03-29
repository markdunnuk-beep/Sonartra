import test from 'node:test';
import assert from 'node:assert/strict';

import { runAssessmentEngine, EngineNotFoundError } from '@/lib/engine/engine-runner';
import type { AssessmentDefinitionRepository } from '@/lib/engine/repository';
import { ScoringError } from '@/lib/engine/scoring';
import { isCanonicalResultPayload } from '@/lib/engine/result-contract';
import type { RuntimeAssessmentDefinition, RuntimeResponseSet } from '@/lib/engine/types';

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

function buildResponses(selectedOptionsByQuestionId: Record<string, string>): RuntimeResponseSet {
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

function createRepositoryFixture(definition: RuntimeAssessmentDefinition | null): {
  repository: AssessmentDefinitionRepository;
  calls: {
    published: number;
    version: number;
    lastVersionParams: {
      assessmentVersionId?: string;
      assessmentKey?: string;
      version?: string;
    } | null;
  };
} {
  const calls = {
    published: 0,
    version: 0,
    lastVersionParams: null as {
      assessmentVersionId?: string;
      assessmentKey?: string;
      version?: string;
    } | null,
  };

  return {
    repository: {
      async getPublishedAssessmentDefinitionByKey() {
        calls.published += 1;
        return definition;
      },
      async getAssessmentDefinitionByVersion(params) {
        calls.version += 1;
        calls.lastVersionParams = params;
        return definition;
      },
    },
    calls,
  };
}

test('full end-to-end execution returns a canonical result payload', async () => {
  const { repository } = createRepositoryFixture(buildDefinition());

  const payload = await runAssessmentEngine({
    repository,
    assessmentKey: 'wplp80',
    responses: buildResponses({
      'question-1': 'option-2',
      'question-2': 'option-3',
    }),
  });

  assert.ok(isCanonicalResultPayload(payload));
  assert.equal(payload.metadata.assessmentKey, 'wplp80');
  assert.equal(payload.topSignal?.signalId, 'signal-support');
});

test('published assessment path loads by assessment key', async () => {
  const { repository, calls } = createRepositoryFixture(buildDefinition());

  await runAssessmentEngine({
    repository,
    assessmentKey: 'wplp80',
    responses: buildResponses({ 'question-1': 'option-1' }),
  });

  assert.equal(calls.published, 1);
  assert.equal(calls.version, 0);
});

test('version path loads by explicit version key', async () => {
  const { repository, calls } = createRepositoryFixture(buildDefinition());

  const payload = await runAssessmentEngine({
    repository,
    assessmentKey: 'wplp80',
    versionKey: '1.0.0',
    responses: buildResponses({ 'question-1': 'option-1' }),
  });

  assert.equal(calls.published, 0);
  assert.equal(calls.version, 1);
  assert.deepEqual(calls.lastVersionParams, {
    assessmentKey: 'wplp80',
    version: '1.0.0',
  });
  assert.equal(payload.metadata.version, '1.0.0');
});

test('assessment version path loads by explicit assessmentVersionId', async () => {
  const { repository, calls } = createRepositoryFixture(buildDefinition());

  const payload = await runAssessmentEngine({
    repository,
    assessmentVersionId: 'version-1',
    responses: buildResponses({ 'question-1': 'option-1' }),
  });

  assert.equal(calls.published, 0);
  assert.equal(calls.version, 1);
  assert.deepEqual(calls.lastVersionParams, {
    assessmentVersionId: 'version-1',
  });
  assert.equal(payload.metadata.version, '1.0.0');
});

test('same input produces identical payload output', async () => {
  const { repository } = createRepositoryFixture(buildDefinition());
  const responses = buildResponses({
    'question-1': 'option-2',
    'question-2': 'option-3',
  });

  const first = await runAssessmentEngine({
    repository,
    assessmentKey: 'wplp80',
    responses,
  });
  const second = await runAssessmentEngine({
    repository,
    assessmentKey: 'wplp80',
    responses,
  });

  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('invalid assessment throws EngineNotFoundError', async () => {
  const { repository } = createRepositoryFixture(null);

  await assert.rejects(
    () =>
      runAssessmentEngine({
        repository,
        assessmentKey: 'missing',
        responses: buildResponses({ 'question-1': 'option-1' }),
      }),
    EngineNotFoundError,
  );
});

test('invalid responses propagate ScoringError', async () => {
  const { repository } = createRepositoryFixture(buildDefinition());

  await assert.rejects(
    () =>
      runAssessmentEngine({
        repository,
        assessmentKey: 'wplp80',
        responses: buildResponses({ 'question-1': 'option-4' }),
      }),
    ScoringError,
  );
});

test('zero-answer case still returns a valid payload', async () => {
  const { repository } = createRepositoryFixture(buildDefinition());

  const payload = await runAssessmentEngine({
    repository,
    assessmentKey: 'wplp80',
    responses: buildResponses({}),
  });

  assert.ok(isCanonicalResultPayload(payload));
  assert.equal(payload.diagnostics.zeroMass, true);
  assert.equal(payload.topSignal?.signalId, 'signal-core');
});

test('overlay signals are preserved through the full pipeline', async () => {
  const { repository } = createRepositoryFixture(buildDefinition());

  const payload = await runAssessmentEngine({
    repository,
    assessmentKey: 'wplp80',
    responses: buildResponses({ 'question-1': 'option-2' }),
  });

  const overlaySignal = payload.rankedSignals.find((signal) => signal.signalId === 'signal-overlay');
  assert.equal(overlaySignal?.isOverlay, true);
  assert.equal(overlaySignal?.overlayType, 'role');
});

test('empty domains are preserved through the full pipeline', async () => {
  const { repository } = createRepositoryFixture(buildDefinition());

  const payload = await runAssessmentEngine({
    repository,
    assessmentKey: 'wplp80',
    responses: buildResponses({ 'question-1': 'option-1' }),
  });

  const emptyDomain = payload.domainSummaries.find((domain) => domain.domainId === 'domain-section');
  assert.ok(emptyDomain);
  assert.equal(emptyDomain?.signalScores.length, 0);
  assert.equal(emptyDomain?.domainSource, 'question_section');
});
