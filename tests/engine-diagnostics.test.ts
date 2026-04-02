import test from 'node:test';
import assert from 'node:assert/strict';

import { runFullDiagnostics } from '@/lib/engine/engine-diagnostics';
import type {
  EngineLanguageBundle,
  NormalizedSignalScore,
  RuntimeExecutionModel,
} from '@/lib/engine/types';

function createEmptyLanguageBundle(): EngineLanguageBundle {
  return {
    signals: {},
    pairs: {},
    domains: {},
    overview: {},
  };
}

function createRuntimeModel(): RuntimeExecutionModel {
  const domains = Object.freeze([
    {
      id: 'domain-section',
      key: 'section_a',
      title: 'Section A',
      description: null,
      source: 'question_section' as const,
      orderIndex: 1,
    },
    {
      id: 'domain-signals',
      key: 'signals',
      title: 'Signals',
      description: null,
      source: 'signal_group' as const,
      orderIndex: 2,
    },
  ]);

  const signals = Object.freeze([
    {
      id: 'signal-a',
      key: 'signal_a',
      title: 'Signal A',
      description: null,
      domainId: 'domain-signals',
      orderIndex: 1,
      isOverlay: false,
      overlayType: 'none' as const,
    },
    {
      id: 'signal-b',
      key: 'signal_b',
      title: 'Signal B',
      description: null,
      domainId: 'domain-signals',
      orderIndex: 2,
      isOverlay: false,
      overlayType: 'none' as const,
    },
  ]);

  const questions = Object.freeze([
    {
      id: 'question-1',
      key: 'q1',
      prompt: 'Question 1',
      description: null,
      domainId: 'domain-section',
      orderIndex: 1,
      options: [
        {
          id: 'option-1',
          key: 'q1_a',
          label: 'A',
          description: null,
          questionId: 'question-1',
          orderIndex: 1,
          signalWeights: [
            {
              signalId: 'signal-a',
              weight: 1,
              reverseFlag: false,
              sourceWeightKey: '1|A',
            },
          ],
        },
      ],
    },
  ]);

  const options = Object.freeze(questions.flatMap((question) => question.options));

  return {
    definition: {
      assessment: {
        id: 'assessment-1',
        key: 'wplp80',
        title: 'WPLP-80',
        description: null,
        estimatedTimeMinutes: 29,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      version: {
        id: 'version-1',
        assessmentId: 'assessment-1',
        versionTag: '1.0.0',
        status: 'draft',
        isPublished: false,
        publishedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      domains,
      signals,
      questions,
    },
    indexes: {
      domainById: {},
      domainByKey: {},
      signalById: {},
      signalByKey: {},
      questionById: {},
      questionByKey: {},
      optionById: {},
      optionsByQuestionId: {},
    },
    domains,
    signals,
    questions,
    options,
  };
}

function createNormalizationScores(overrides?: {
  first?: Partial<NormalizedSignalScore>;
  second?: Partial<NormalizedSignalScore>;
}): readonly NormalizedSignalScore[] {
  return Object.freeze([
    {
      signalId: 'signal-a',
      signalKey: 'signal_a',
      signalTitle: 'Signal A',
      domainId: 'domain-signals',
      domainKey: 'signals',
      domainSource: 'signal_group',
      isOverlay: false,
      overlayType: 'none',
      rawTotal: 8,
      normalizedValue: 82,
      percentage: 82,
      domainPercentage: 82,
      rank: 1,
      ...overrides?.first,
    },
    {
      signalId: 'signal-b',
      signalKey: 'signal_b',
      signalTitle: 'Signal B',
      domainId: 'domain-signals',
      domainKey: 'signals',
      domainSource: 'signal_group',
      isOverlay: false,
      overlayType: 'none',
      rawTotal: 2,
      normalizedValue: 18,
      percentage: 18,
      domainPercentage: 18,
      rank: 2,
      ...overrides?.second,
    },
  ]);
}

test('diagnostics report missing weights as blocking errors', () => {
  const runtimeModel = createRuntimeModel();
  runtimeModel.questions[0]!.options[0]!.signalWeights = [];

  const diagnostics = runFullDiagnostics({
    runtimeModel,
  });

  assert.equal(diagnostics.ok, false);
  assert.ok(diagnostics.errors.some((issue) => issue.code === 'option_missing_weights'));
});

test('diagnostics report missing language coverage as warnings', () => {
  const diagnostics = runFullDiagnostics({
    languageConfig: createEmptyLanguageBundle(),
  });

  assert.equal(diagnostics.ok, true);
  assert.ok(diagnostics.warnings.some((issue) => issue.code === 'missing_signal_language'));
  assert.ok(diagnostics.warnings.some((issue) => issue.code === 'missing_domain_language'));
  assert.ok(diagnostics.warnings.some((issue) => issue.code === 'missing_overview_language'));
});

test('diagnostics warn when normalized scores are heavily uneven', () => {
  const diagnostics = runFullDiagnostics({
    normalizationScores: createNormalizationScores(),
  });

  assert.ok(diagnostics.warnings.some((issue) => issue.code === 'uneven_distribution'));
});

test('diagnostics fail invalid normalization sums', () => {
  const diagnostics = runFullDiagnostics({
    normalizationScores: createNormalizationScores({
      second: {
        percentage: 28,
        domainPercentage: 28,
      },
    }),
  });

  assert.equal(diagnostics.ok, false);
  assert.ok(diagnostics.errors.some((issue) => issue.code === 'global_percentage_sum_invalid'));
  assert.ok(diagnostics.errors.some((issue) => issue.code === 'domain_percentage_sum_invalid'));
});

test('diagnostics fail incomplete result payloads', () => {
  const diagnostics = runFullDiagnostics({
    result: {
      metadata: {
        assessmentKey: 'wplp80',
      },
    },
  });

  assert.equal(diagnostics.ok, false);
  assert.ok(diagnostics.errors.some((issue) => issue.code === 'result_payload_incomplete'));
});
