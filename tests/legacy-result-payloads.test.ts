import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXACT_LEGACY_HERO_HEADLINE,
  analyzeReadyResultRow,
} from '@/scripts/lib/legacy-result-payloads';

function buildReadyRow(overrides?: Partial<Parameters<typeof analyzeReadyResultRow>[0]>): Parameters<typeof analyzeReadyResultRow>[0] {
  return {
    result_id: 'result-1',
    attempt_id: 'attempt-1',
    user_id: 'user-1',
    assessment_id: 'assessment-1',
    assessment_version_id: 'version-1',
    assessment_key: 'wplp80',
    assessment_title: 'WPLP-80',
    version_tag: '1.0.0',
    attempt_lifecycle_status: 'RESULT_READY',
    pipeline_status: 'COMPLETED',
    readiness_status: 'READY',
    generated_at: '2026-04-04T00:00:00.000Z',
    created_at: '2026-04-04T00:00:00.000Z',
    response_count: 80,
    answered_question_count: 80,
    question_count: 80,
    overview_language_row_count: 2,
    version_signal_keys: ['stress_scatter', 'style_analyst', 'style_driver'],
    version_domain_keys: ['signal_stress', 'signal_style'],
    canonical_result_payload: {
      metadata: {
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        version: '1.0.0',
        attemptId: 'attempt-1',
        completedAt: '2026-04-04T00:00:00.000Z',
      },
      intro: {
        assessmentDescription: 'Intro',
      },
      hero: {
        headline: 'Structured, thoughtful and evidence-led',
        narrative: 'Narrative',
        primaryPattern: {
          label: 'Scatter',
          signalKey: 'stress_scatter',
          signalLabel: 'Scatter',
        },
        domainHighlights: [
          {
            domainKey: 'signal_stress',
            domainLabel: 'Stress',
            primarySignalKey: 'stress_scatter',
            primarySignalLabel: 'Scatter',
            summary: 'Summary',
          },
        ],
      },
      domains: [
        {
          domainKey: 'signal_stress',
          domainLabel: 'Stress',
          chapterOpening: 'Summary',
          signalBalance: {
            items: [
              {
                signalKey: 'stress_scatter',
                signalLabel: 'Scatter',
                withinDomainPercent: 44,
                rank: 1,
                isPrimary: true,
                isSecondary: false,
                summary: 'Summary',
              },
            ],
          },
          primarySignal: {
            signalKey: 'stress_scatter',
            signalLabel: 'Scatter',
            summary: 'Summary',
            strength: 'Strength',
            watchout: 'Watchout',
            development: 'Development',
          },
          secondarySignal: null,
          signalPair: null,
          pressureFocus: null,
          environmentFocus: null,
        },
      ],
      actions: {
        strengths: [
          { signalKey: 'stress_scatter', signalLabel: 'Scatter', text: 'Strength' },
        ],
        watchouts: [
          { signalKey: 'stress_scatter', signalLabel: 'Scatter', text: 'Watchout' },
        ],
        developmentFocus: [
          { signalKey: 'stress_scatter', signalLabel: 'Scatter', text: 'Development' },
        ],
      },
      application: {
        thesis: { headline: '', summary: '', sourceKeys: { heroPatternKey: '' } },
        signatureContribution: { title: 'Where you create the most value', summary: '', items: [] },
        patternRisks: { title: 'Where this pattern can work against you', summary: '', items: [] },
        rangeBuilder: { title: 'Where to build more range', summary: '', items: [] },
        actionPlan30: { keepDoing: '', watchFor: '', practiceNext: '', askOthers: '' },
      },
      diagnostics: {
        readinessStatus: 'ready',
        scoring: {},
        normalization: {},
        answeredQuestionCount: 80,
        totalQuestionCount: 80,
        missingQuestionIds: [],
        topSignalSelectionBasis: 'normalized_rank',
        rankedSignalCount: 1,
        domainCount: 1,
        zeroMass: false,
        zeroMassTopSignalFallbackApplied: false,
        warnings: [],
        generatedAt: '2026-04-04T00:00:00.000Z',
      },
    },
    ...overrides,
  };
}

test('analyzeReadyResultRow ignores canonical current-runtime payloads', () => {
  const finding = analyzeReadyResultRow(buildReadyRow());
  assert.equal(finding, null);
});

test('analyzeReadyResultRow flags exact legacy headline and unprefixed taxonomy mismatch', () => {
  const finding = analyzeReadyResultRow(buildReadyRow({
    overview_language_row_count: 0,
    version_signal_keys: ['stress_scatter', 'style_analyst', 'style_driver'],
    version_domain_keys: ['signal_stress', 'signal_style'],
    canonical_result_payload: {
      metadata: {
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        version: '1.0.0',
        attemptId: 'attempt-1',
        completedAt: '2026-04-04T00:00:00.000Z',
      },
      intro: {
        assessmentDescription: 'Intro',
      },
      hero: {
        headline: EXACT_LEGACY_HERO_HEADLINE,
        narrative: 'Narrative',
        primaryPattern: {
          label: 'Scatter',
          signalKey: 'scatter',
          signalLabel: 'Scatter',
        },
        domainHighlights: [
          {
            domainKey: 'pressure-response',
            domainLabel: 'Pressure Response',
            primarySignalKey: 'scatter',
            primarySignalLabel: 'Scatter',
            summary: 'Summary',
          },
        ],
      },
      domains: [
        {
          domainKey: 'pressure-response',
          domainLabel: 'Pressure Response',
          chapterOpening: 'Summary',
          signalBalance: {
            items: [
              {
                signalKey: 'scatter',
                signalLabel: 'Scatter',
                withinDomainPercent: 44,
                rank: 1,
                isPrimary: true,
                isSecondary: false,
                summary: 'Summary',
              },
            ],
          },
          primarySignal: {
            signalKey: 'scatter',
            signalLabel: 'Scatter',
            summary: 'Summary',
            strength: 'Strength',
            watchout: 'Watchout',
            development: 'Development',
          },
          secondarySignal: null,
          signalPair: null,
          pressureFocus: null,
          environmentFocus: null,
        },
      ],
      actions: {
        strengths: [
          { signalKey: 'scatter', signalLabel: 'Scatter', text: 'Strength' },
        ],
        watchouts: [
          { signalKey: 'scatter', signalLabel: 'Scatter', text: 'Watchout' },
        ],
        developmentFocus: [
          { signalKey: 'scatter', signalLabel: 'Scatter', text: 'Development' },
        ],
      },
      application: {
        thesis: { headline: '', summary: '', sourceKeys: { heroPatternKey: '' } },
        signatureContribution: { title: 'Where you create the most value', summary: '', items: [] },
        patternRisks: { title: 'Where this pattern can work against you', summary: '', items: [] },
        rangeBuilder: { title: 'Where to build more range', summary: '', items: [] },
        actionPlan30: { keepDoing: '', watchFor: '', practiceNext: '', askOthers: '' },
      },
      diagnostics: {
        readinessStatus: 'ready',
        scoring: {},
        normalization: {},
        answeredQuestionCount: 80,
        totalQuestionCount: 80,
        missingQuestionIds: [],
        topSignalSelectionBasis: 'normalized_rank',
        rankedSignalCount: 1,
        domainCount: 1,
        zeroMass: false,
        zeroMassTopSignalFallbackApplied: false,
        warnings: [],
        generatedAt: '2026-04-04T00:00:00.000Z',
      },
    },
  }));

  assert.ok(finding);
  assert.equal(finding?.signatures.exactLegacyHeroHeadline, true);
  assert.equal(finding?.signatures.heroPrimarySignalMissingFromVersion, true);
  assert.deepEqual(finding?.signatures.unexpectedSignalKeys, ['scatter']);
  assert.deepEqual(finding?.signatures.unexpectedDomainKeys, ['pressure-response']);
  assert.equal(finding?.signatures.missingOverviewLanguageRows, true);
  assert.equal(finding?.remediationClass, 'rebuildable');
});
