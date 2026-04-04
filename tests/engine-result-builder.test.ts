import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isCanonicalResultPayload } from '@/lib/engine/result-contract';
import { buildCanonicalResultPayload as buildCanonicalResultPayloadBase } from '@/lib/engine/result-builder';
import {
  buildDomainSummaries,
  createResultInterpretationContext,
} from '@/lib/engine/result-builder-helpers';
import type { CanonicalResultBuilderInput } from '@/lib/engine/result-builder';
import type {
  CanonicalResultPayload,
  EngineLanguageBundle,
  NormalizedDomainSummary,
  NormalizedSignalScore,
} from '@/lib/engine/types';

const resultInterpretationPath = join(process.cwd(), 'lib', 'engine', 'result-interpretation.ts');
const DISALLOWED_GENERIC_HERO_HEADLINES = Object.freeze([
  'A clear working style is coming through',
  'A clear source of motivation is coming through',
  'A clear leadership pattern is coming through',
  'A clear conflict response is coming through',
  'A clear environment preference is coming through',
  'A pressure pattern is coming through',
  'A clear decision pattern is coming through',
  'A clear role fit is coming through',
]);

function createEmptyLanguageBundle(): EngineLanguageBundle {
  return {
    signals: {},
    pairs: {},
    domains: {},
    overview: {},
  };
}

type LegacyResultPayloadView = CanonicalResultPayload & {
  topSignal: {
    signalId: string;
    signalKey: string;
    title: string;
    percentage: number;
    rank: 1;
  } | null;
  rankedSignals: Array<{
    signalId: string;
    signalKey: string;
    title: string;
    percentage: number;
    domainPercentage: number;
    isOverlay: boolean;
    overlayType: 'none' | 'decision' | 'role';
    rank: number;
  }>;
  normalizedScores: readonly NormalizedSignalScore[];
  domainSummaries: ReturnType<typeof buildDomainSummaries>;
  overviewSummary: {
    headline: string | null;
    narrative: string | null;
  };
};

function buildCanonicalResultPayload(params: {
  normalizedResult: CanonicalResultBuilderInput;
}): LegacyResultPayloadView {
  const payload = buildCanonicalResultPayloadBase(params);
  const legacyPayload = {
    ...payload,
  };
  const interpretationContext = createResultInterpretationContext(params.normalizedResult);
  const rankedSignals = [...params.normalizedResult.signalScores].sort((left, right) => left.rank - right.rank);
  const topSignalScore =
    params.normalizedResult.topSignalId === null
      ? null
      : params.normalizedResult.signalScores.find((signalScore) => signalScore.signalId === params.normalizedResult.topSignalId) ?? null;

  return Object.defineProperties(legacyPayload, {
    topSignal: {
      value: topSignalScore
        ? {
            signalId: topSignalScore.signalId,
            signalKey: topSignalScore.signalKey,
            title: topSignalScore.signalTitle,
            percentage: topSignalScore.percentage,
            rank: 1 as const,
          }
        : null,
    },
    rankedSignals: {
      value: rankedSignals.map((signalScore) => ({
        signalId: signalScore.signalId,
        signalKey: signalScore.signalKey,
        title: signalScore.signalTitle,
        percentage: signalScore.percentage,
        domainPercentage: signalScore.domainPercentage,
        isOverlay: signalScore.isOverlay,
        overlayType: signalScore.overlayType,
        rank: signalScore.rank,
      })),
    },
    normalizedScores: {
      value: params.normalizedResult.signalScores,
    },
    domainSummaries: {
      value: buildDomainSummaries(params.normalizedResult, interpretationContext),
    },
    overviewSummary: {
      value: payload.hero,
    },
  }) as LegacyResultPayloadView;
}

function buildNormalizedSignal(params: {
  signalId: string;
  signalKey: string;
  title?: string;
  domainId: string;
  domainKey: string;
  domainSource?: 'question_section' | 'signal_group';
  rawTotal: number;
  percentage: number;
  domainPercentage: number;
  rank: number;
  isOverlay?: boolean;
  overlayType?: 'none' | 'decision' | 'role';
}): NormalizedSignalScore {
  return {
    signalId: params.signalId,
    signalKey: params.signalKey,
    signalTitle: params.title ?? params.signalKey,
    domainId: params.domainId,
    domainKey: params.domainKey,
    domainSource: params.domainSource ?? 'signal_group',
    isOverlay: params.isOverlay ?? false,
    overlayType: params.overlayType ?? 'none',
    rawTotal: params.rawTotal,
    normalizedValue: params.percentage,
    percentage: params.percentage,
    domainPercentage: params.domainPercentage,
    rank: params.rank,
  };
}

function buildDomainSummary(params: {
  domainId: string;
  domainKey: string;
  title?: string;
  domainSource?: 'question_section' | 'signal_group';
  rawTotal: number;
  percentage: number;
  signalScores: readonly NormalizedSignalScore[];
  answeredQuestionCount?: number;
}): NormalizedDomainSummary {
  return {
    domainId: params.domainId,
    domainKey: params.domainKey,
    domainTitle: params.title ?? params.domainKey,
    domainSource: params.domainSource ?? 'signal_group',
    rawTotal: params.rawTotal,
    normalizedValue: params.percentage,
    percentage: params.percentage,
    signalScores: params.signalScores,
    signalCount: params.signalScores.length,
    answeredQuestionCount: params.answeredQuestionCount ?? 0,
    rankedSignalIds: Object.freeze(
      [...params.signalScores]
        .sort((left, right) => left.rank - right.rank)
        .map((signalScore) => signalScore.signalId),
    ),
  };
}

function buildNormalizedResultFixture(overrides?: {
  signalScores?: readonly NormalizedSignalScore[];
  domainSummaries?: readonly NormalizedDomainSummary[];
  topSignalId?: string | null;
  zeroMass?: boolean;
  normalizationWarnings?: readonly string[];
  scoringWarnings?: readonly string[];
  answeredQuestions?: number;
  totalQuestions?: number;
  languageBundle?: EngineLanguageBundle;
  assessmentDescription?: string | null;
}): CanonicalResultBuilderInput {
  const signalScores =
    overrides?.signalScores ??
    Object.freeze([
      buildNormalizedSignal({
        signalId: 'signal-focus',
        signalKey: 'focus',
        title: 'Focus',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 5,
        percentage: 50,
        domainPercentage: 50,
        rank: 1,
      }),
      buildNormalizedSignal({
        signalId: 'signal-drive',
        signalKey: 'drive',
        title: 'Drive',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 3,
        percentage: 30,
        domainPercentage: 30,
        rank: 2,
      }),
      buildNormalizedSignal({
        signalId: 'signal-balance',
        signalKey: 'balance',
        title: 'Balance',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 2,
        percentage: 20,
        domainPercentage: 20,
        rank: 3,
      }),
    ]);

  const domainSummaries =
    overrides?.domainSummaries ??
    Object.freeze([
      buildDomainSummary({
        domainId: 'domain-section',
        domainKey: 'section_a',
        title: 'Section A',
        domainSource: 'question_section',
        rawTotal: 0,
        percentage: 0,
        signalScores: Object.freeze([]),
        answeredQuestionCount: 3,
      }),
      buildDomainSummary({
        domainId: 'domain-signals',
        domainKey: 'signals',
        title: 'Signals',
        domainSource: 'signal_group',
        rawTotal: 10,
        percentage: 100,
        signalScores,
        answeredQuestionCount: 3,
      }),
    ]);

  const answeredQuestions = overrides?.answeredQuestions ?? 3;
  const totalQuestions = overrides?.totalQuestions ?? 4;

  return {
    assessmentVersionId: 'version-1',
    metadata: {
      assessmentKey: 'wplp80',
      assessmentTitle: 'WPLP-80',
      version: '1.0.0',
      attemptId: 'attempt-1',
      completedAt: '2026-01-01T00:01:00.000Z',
      assessmentDescription: overrides?.assessmentDescription,
    },
    scoringDiagnostics: {
      scoringMethod: 'option_signal_weights_only',
      totalQuestions,
      answeredQuestions,
      unansweredQuestions: totalQuestions - answeredQuestions,
      totalResponsesProcessed: answeredQuestions,
      totalWeightsApplied: answeredQuestions,
      totalScoreMass: signalScores.reduce((sum, signalScore) => sum + signalScore.rawTotal, 0),
      zeroScoreSignalCount: signalScores.filter((signalScore) => signalScore.rawTotal === 0).length,
      zeroAnswerSubmission: answeredQuestions === 0,
      warnings: overrides?.scoringWarnings ?? Object.freeze(['incomplete_response_set']),
      generatedAt: '2026-01-01T00:01:00.000Z',
    },
    languageBundle: overrides?.languageBundle ?? createEmptyLanguageBundle(),
    signalScores,
    domainSummaries,
    topSignalId: overrides?.topSignalId ?? signalScores[0]?.signalId ?? null,
    diagnostics: {
      normalizationMethod: 'largest_remainder_integer_percentages',
      totalScoreMass: signalScores.reduce((sum, signalScore) => sum + signalScore.rawTotal, 0),
      zeroMass: overrides?.zeroMass ?? false,
      globalPercentageSum: signalScores.reduce((sum, signalScore) => sum + signalScore.percentage, 0),
      domainPercentageSums: Object.freeze(
        Object.fromEntries(
          domainSummaries.map((domainSummary) => [
            domainSummary.domainId,
            domainSummary.signalScores.reduce((sum, signalScore) => sum + signalScore.domainPercentage, 0),
          ]),
        ),
      ),
      roundingAdjustmentsApplied: 0,
      zeroScoreSignalCount: signalScores.filter((signalScore) => signalScore.rawTotal === 0).length,
      warnings: overrides?.normalizationWarnings ?? Object.freeze([]),
      generatedAt: '2026-01-01T00:01:00.000Z',
    },
  };
}

test('interpretation boundary receives language bundle context even when unused', () => {
  const normalizedResult = buildNormalizedResultFixture({
    domainSummaries: Object.freeze([
      buildDomainSummary({
        domainId: 'domain-style',
        domainKey: 'signal_style',
        title: 'Behaviour Style',
        rawTotal: 8,
        percentage: 100,
        signalScores: Object.freeze([
          buildNormalizedSignal({
            signalId: 'signal-driver',
            signalKey: 'style_driver',
            title: 'Driver',
            domainId: 'domain-style',
            domainKey: 'signal_style',
            rawTotal: 5,
            percentage: 39,
            domainPercentage: 39,
            rank: 1,
          }),
          buildNormalizedSignal({
            signalId: 'signal-analyst',
            signalKey: 'style_analyst',
            title: 'Analyst',
            domainId: 'domain-style',
            domainKey: 'signal_style',
            rawTotal: 3,
            percentage: 24,
            domainPercentage: 24,
            rank: 2,
          }),
        ]),
        answeredQuestionCount: 8,
      }),
    ]),
    languageBundle: {
      signals: {
        style_driver: {
          summary: 'Unused custom summary',
        },
      },
      pairs: {
        analyst_driver: {
          summary: 'Unused pair summary',
        },
      },
      domains: {
        signal_style: {
          summary: 'Unused domain summary',
        },
      },
      overview: {
        analyst_driver: {
          headline: 'Unused overview headline',
        },
      },
    },
  });

  const context = createResultInterpretationContext(normalizedResult);
  const domainSummaries = buildDomainSummaries(normalizedResult, context);

  assert.deepEqual(context.languageBundle, normalizedResult.languageBundle);
  assert.equal(context.assessmentVersionId, 'version-1');
  assert.equal(domainSummaries[0]?.interpretation?.diagnostics?.ruleKey, 'style_driver_analyst');
});

test('minimal valid payload construction returns a complete canonical result payload', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.ok(isCanonicalResultPayload(payload));
  assert.deepEqual(Object.keys(payload), ['metadata', 'intro', 'hero', 'domains', 'actions', 'diagnostics']);
  assert.equal(payload.metadata.assessmentKey, 'wplp80');
  assert.equal(payload.metadata.assessmentTitle, 'WPLP-80');
  assert.equal(payload.metadata.version, '1.0.0');
  assert.equal(payload.metadata.attemptId, 'attempt-1');
  assert.equal(payload.metadata.completedAt, '2026-01-01T00:01:00.000Z');
  assert.equal(payload.metadata.assessmentDescription, null);
  assert.equal(payload.intro.assessmentDescription, null);
  assert.equal(payload.hero.headline, 'Focus');
  assert.equal(payload.hero.primaryPattern?.signalKey, 'focus');
  assert.equal(payload.domains.length, 2);
  assert.deepEqual(Object.keys(payload.actions), ['strengths', 'watchouts', 'developmentFocus']);
});

test('canonical actions are emitted only in structured attributed arrays', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 55,
          domainPercentage: 55,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-control',
          signalKey: 'stress_control',
          title: 'Control',
          domainId: 'domain-stress',
          domainKey: 'signal_stress',
          rawTotal: 4,
          percentage: 30,
          domainPercentage: 30,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-evidence',
          signalKey: 'decision_evidence',
          title: 'Evidence',
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          rawTotal: 1,
          percentage: 15,
          domainPercentage: 15,
          rank: 3,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.ok(!('strengths' in payload));
  assert.ok(!('watchouts' in payload));
  assert.ok(!('developmentFocus' in payload));

  for (const item of payload.actions.strengths) {
    assert.deepEqual(Object.keys(item), ['signalKey', 'signalLabel', 'text']);
  }

  for (const item of payload.actions.watchouts) {
    assert.deepEqual(Object.keys(item), ['signalKey', 'signalLabel', 'text']);
  }

  for (const item of payload.actions.developmentFocus) {
    assert.deepEqual(Object.keys(item), ['signalKey', 'signalLabel', 'text']);
  }
});

test('metadata includes assessmentDescription when provided by the engine context', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      assessmentDescription: 'Assessment-owned description for this version.',
    }),
  });

  assert.equal(payload.metadata.assessmentDescription, 'Assessment-owned description for this version.');
  assert.equal(payload.intro.assessmentDescription, 'Assessment-owned description for this version.');
});

test('hero summary uses overview resolution path and top-ranked overall signal for primaryPattern', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.equal(payload.hero.headline, 'Focus');
  assert.match(payload.hero.narrative ?? '', /dependable way to approach work/i);
  assert.deepEqual(payload.hero.primaryPattern, {
    label: 'Focus',
    signalKey: 'focus',
    signalLabel: 'Focus',
  });
});

test('hero domain highlights stay in authored domain order and use each domain top-ranked signal', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-vision',
          signalKey: 'lead_vision',
          title: 'Vision',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          rawTotal: 4,
          percentage: 31,
          domainPercentage: 60,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-results',
          signalKey: 'lead_results',
          title: 'Results',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          rawTotal: 2,
          percentage: 15,
          domainPercentage: 40,
          rank: 3,
        }),
        buildNormalizedSignal({
          signalId: 'signal-evidence',
          signalKey: 'decision_evidence',
          title: 'Evidence',
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          rawTotal: 3,
          percentage: 24,
          domainPercentage: 75,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-instinct',
          signalKey: 'decision_instinct',
          title: 'Instinct',
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          rawTotal: 1,
          percentage: 8,
          domainPercentage: 25,
          rank: 4,
        }),
      ]),
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          title: 'Leadership',
          rawTotal: 6,
          percentage: 60,
          signalScores: Object.freeze([
            buildNormalizedSignal({
              signalId: 'signal-results',
              signalKey: 'lead_results',
              title: 'Results',
              domainId: 'domain-lead',
              domainKey: 'signal_lead',
              rawTotal: 2,
              percentage: 15,
              domainPercentage: 40,
              rank: 3,
            }),
            buildNormalizedSignal({
              signalId: 'signal-vision',
              signalKey: 'lead_vision',
              title: 'Vision',
              domainId: 'domain-lead',
              domainKey: 'signal_lead',
              rawTotal: 4,
              percentage: 31,
              domainPercentage: 60,
              rank: 1,
            }),
          ]),
          answeredQuestionCount: 3,
        }),
        buildDomainSummary({
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          title: 'Decision',
          rawTotal: 4,
          percentage: 40,
          signalScores: Object.freeze([
            buildNormalizedSignal({
              signalId: 'signal-instinct',
              signalKey: 'decision_instinct',
              title: 'Instinct',
              domainId: 'domain-decision',
              domainKey: 'signal_decision',
              rawTotal: 1,
              percentage: 8,
              domainPercentage: 25,
              rank: 4,
            }),
            buildNormalizedSignal({
              signalId: 'signal-evidence',
              signalKey: 'decision_evidence',
              title: 'Evidence',
              domainId: 'domain-decision',
              domainKey: 'signal_decision',
              rawTotal: 3,
              percentage: 24,
              domainPercentage: 75,
              rank: 2,
            }),
          ]),
          answeredQuestionCount: 3,
        }),
      ]),
      topSignalId: 'signal-vision',
    }),
  });

  assert.deepEqual(payload.hero.domainHighlights, [
    {
      domainKey: 'signal_lead',
      domainLabel: 'Leadership',
      primarySignalKey: 'lead_vision',
      primarySignalLabel: 'Vision',
      summary: null,
    },
    {
      domainKey: 'signal_decision',
      domainLabel: 'Decision',
      primarySignalKey: 'decision_evidence',
      primarySignalLabel: 'Evidence',
      summary: null,
    },
  ]);
});

test('hero domain highlight summary uses primary signal summary only and stays null when missing', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 55,
          domainPercentage: 55,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-evidence',
          signalKey: 'decision_evidence',
          title: 'Evidence',
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          rawTotal: 4,
          percentage: 45,
          domainPercentage: 45,
          rank: 2,
        }),
      ]),
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-style',
          domainKey: 'signal_style',
          title: 'Behaviour Style',
          rawTotal: 5,
          percentage: 55,
          signalScores: Object.freeze([
            buildNormalizedSignal({
              signalId: 'signal-driver',
              signalKey: 'style_driver',
              title: 'Driver',
              domainId: 'domain-style',
              domainKey: 'signal_style',
              rawTotal: 5,
              percentage: 55,
              domainPercentage: 55,
              rank: 1,
            }),
          ]),
          answeredQuestionCount: 2,
        }),
        buildDomainSummary({
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          title: 'Decision',
          rawTotal: 4,
          percentage: 45,
          signalScores: Object.freeze([
            buildNormalizedSignal({
              signalId: 'signal-evidence',
              signalKey: 'decision_evidence',
              title: 'Evidence',
              domainId: 'domain-decision',
              domainKey: 'signal_decision',
              rawTotal: 4,
              percentage: 45,
              domainPercentage: 45,
              rank: 2,
            }),
          ]),
          answeredQuestionCount: 2,
        }),
      ]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {
          style_driver: {
            summary: 'Signal-authored summary for the Driver signal.',
          },
        },
        pairs: {},
        domains: {
          signal_decision: {
            summary: 'Domain-authored summary that should not be used in hero.',
          },
        },
        overview: {},
      },
    }),
  });

  assert.equal(payload.hero.domainHighlights[0]?.summary, 'Signal-authored summary for the Driver signal.');
  assert.equal(payload.hero.domainHighlights[1]?.summary, null);
});

test('domains expand to structured report chapters in authored order with authored language where available', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 38,
          domainPercentage: 60,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-analyst',
          signalKey: 'style_analyst',
          title: 'Analyst',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 3,
          percentage: 24,
          domainPercentage: 40,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-evidence',
          signalKey: 'decision_evidence',
          title: 'Evidence',
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          rawTotal: 2,
          percentage: 20,
          domainPercentage: 100,
          rank: 3,
        }),
      ]),
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-section',
          domainKey: 'section_a',
          title: 'Section A',
          domainSource: 'question_section',
          rawTotal: 0,
          percentage: 0,
          signalScores: Object.freeze([]),
          answeredQuestionCount: 3,
        }),
        buildDomainSummary({
          domainId: 'domain-style',
          domainKey: 'signal_style',
          title: 'Behaviour Style',
          rawTotal: 8,
          percentage: 80,
          signalScores: Object.freeze([
            buildNormalizedSignal({
              signalId: 'signal-analyst',
              signalKey: 'style_analyst',
              title: 'Analyst',
              domainId: 'domain-style',
              domainKey: 'signal_style',
              rawTotal: 3,
              percentage: 24,
              domainPercentage: 40,
              rank: 2,
            }),
            buildNormalizedSignal({
              signalId: 'signal-driver',
              signalKey: 'style_driver',
              title: 'Driver',
              domainId: 'domain-style',
              domainKey: 'signal_style',
              rawTotal: 5,
              percentage: 38,
              domainPercentage: 60,
              rank: 1,
            }),
          ]),
          answeredQuestionCount: 3,
        }),
        buildDomainSummary({
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          title: 'Decision',
          rawTotal: 2,
          percentage: 20,
          signalScores: Object.freeze([
            buildNormalizedSignal({
              signalId: 'signal-evidence',
              signalKey: 'decision_evidence',
              title: 'Evidence',
              domainId: 'domain-decision',
              domainKey: 'signal_decision',
              rawTotal: 2,
              percentage: 20,
              domainPercentage: 100,
              rank: 3,
            }),
          ]),
          answeredQuestionCount: 3,
        }),
      ]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {
          style_driver: {
            summary: 'Driver summary.',
            strength: 'Driver strength.',
            watchout: 'Driver watchout.',
            development: 'Driver development.',
          },
          style_analyst: {
            summary: 'Analyst summary.',
            strength: 'Analyst strength.',
          },
        },
        pairs: {
          analyst_driver: {
            summary: 'Driver and Analyst pair summary.',
          },
        },
        domains: {
          signal_style: {
            summary: 'Authored behaviour style summary.',
            focus: 'Authored focus.',
            pressure: 'Authored pressure.',
            environment: 'Authored environment.',
          },
        },
        overview: {},
      },
    }),
  });

  assert.deepEqual(
    payload.domains.map((domain) => domain.domainKey),
    ['section_a', 'signal_style', 'signal_decision'],
  );

  assert.deepEqual(payload.domains[0], {
    domainKey: 'section_a',
    domainLabel: 'Section A',
    summary: null,
    focus: null,
    pressure: null,
    environment: null,
    primarySignal: null,
    secondarySignal: null,
    pairSummary: null,
    signals: [],
  });

  assert.deepEqual(payload.domains[1], {
    domainKey: 'signal_style',
    domainLabel: 'Behaviour Style',
    summary: 'Authored behaviour style summary.',
    focus: 'Authored focus.',
    pressure: 'Authored pressure.',
    environment: 'Authored environment.',
    primarySignal: {
      signalKey: 'style_driver',
      signalLabel: 'Driver',
      summary: 'Driver summary.',
      strength: 'Driver strength.',
      watchout: 'Driver watchout.',
      development: 'Driver development.',
    },
    secondarySignal: {
      signalKey: 'style_analyst',
      signalLabel: 'Analyst',
      summary: 'Analyst summary.',
      strength: 'Analyst strength.',
      watchout: null,
      development: null,
    },
    pairSummary: {
      pairKey: 'analyst_driver',
      text: 'Driver and Analyst pair summary.',
    },
    signals: [
      {
        signalKey: 'style_driver',
        signalLabel: 'Driver',
        score: 38,
        withinDomainPercent: 60,
        rank: 1,
        isPrimary: true,
        isSecondary: false,
      },
      {
        signalKey: 'style_analyst',
        signalLabel: 'Analyst',
        score: 24,
        withinDomainPercent: 40,
        rank: 2,
        isPrimary: false,
        isSecondary: true,
      },
    ],
  });

  assert.equal(payload.domains[2]?.domainKey, 'signal_decision');
  assert.ok(payload.domains[2]?.summary);
  assert.equal(payload.domains[2]?.focus, null);
  assert.equal(payload.domains[2]?.pressure, null);
  assert.equal(payload.domains[2]?.environment, null);
  assert.deepEqual(payload.domains[2]?.primarySignal, {
    signalKey: 'decision_evidence',
    signalLabel: 'Evidence',
    summary: null,
    strength: null,
    watchout: null,
    development: null,
  });
  assert.equal(payload.domains[2]?.secondarySignal, null);
  assert.equal(payload.domains[2]?.pairSummary, null);
  assert.deepEqual(payload.domains[2]?.signals, [
    {
      signalKey: 'decision_evidence',
      signalLabel: 'Evidence',
      score: 20,
      withinDomainPercent: 100,
      rank: 3,
      isPrimary: true,
      isSecondary: false,
    },
  ]);
});

test('top signal projection matches normalization ranking', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.equal(payload.topSignal?.signalId, 'signal-focus');
  assert.equal(payload.topSignal?.percentage, 50);
  assert.equal(payload.topSignal?.rank, 1);
});

test('ranked signals include all signals in deterministic ranked order', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.deepEqual(
    payload.rankedSignals.map((signal) => signal.signalId),
    ['signal-focus', 'signal-drive', 'signal-balance'],
  );
});

test('normalized scores preserve canonical stable projection and metadata', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.deepEqual(
    payload.normalizedScores.map((signal) => signal.signalId),
    ['signal-focus', 'signal-drive', 'signal-balance'],
  );
  assert.equal(payload.normalizedScores[0]?.domainKey, 'signals');
  assert.equal(payload.normalizedScores[0]?.rawTotal, 5);
});

test('domain summaries include all domains including empty question-section domains', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.deepEqual(
    payload.domainSummaries.map((domain) => domain.domainId),
    ['domain-section', 'domain-signals'],
  );
  assert.equal(payload.domainSummaries[0]?.signalScores.length, 0);
  assert.equal(payload.domainSummaries[0]?.domainSource, 'question_section');
  assert.equal(payload.domainSummaries[0]?.interpretation, null);
});

test('core signal-group domains receive persisted interpretation with pairwise diagnostics', () => {
  const styleSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 39,
      domainPercentage: 39,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 3,
      percentage: 24,
      domainPercentage: 24,
      rank: 2,
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: styleSignals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-style',
          domainKey: 'signal_style',
          title: 'Behaviour Style',
          rawTotal: 8,
          percentage: 100,
          signalScores: styleSignals,
          answeredQuestionCount: 8,
        }),
      ]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.equal(payload.domainSummaries[0]?.interpretation?.primarySignalKey, 'style_driver');
  assert.equal(payload.domainSummaries[0]?.interpretation?.primaryPercent, 39);
  assert.equal(payload.domainSummaries[0]?.interpretation?.secondarySignalKey, 'style_analyst');
  assert.equal(payload.domainSummaries[0]?.interpretation?.secondaryPercent, 24);
  assert.match(payload.domainSummaries[0]?.interpretation?.summary ?? '', /moves quickly toward outcomes/i);
  assert.match(payload.domainSummaries[0]?.interpretation?.tensionClause ?? '', /urgency cuts short reflection|precision slows decisions/i);
  assert.equal(payload.domainSummaries[0]?.interpretation?.diagnostics?.ruleKey, 'style_driver_analyst');
});

test('domain summaries persist signal scores in canonical display order and align interpretation fields', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-results',
          signalKey: 'lead_results',
          title: 'Results',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          rawTotal: 2,
          percentage: 25,
          domainPercentage: 25,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-vision',
          signalKey: 'lead_vision',
          title: 'Vision',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          rawTotal: 3,
          percentage: 29,
          domainPercentage: 29,
          rank: 1,
        }),
      ]),
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          title: 'Leadership',
          rawTotal: 5,
          percentage: 100,
          signalScores: Object.freeze([
            buildNormalizedSignal({
              signalId: 'signal-results',
              signalKey: 'lead_results',
              title: 'Results',
              domainId: 'domain-lead',
              domainKey: 'signal_lead',
              rawTotal: 2,
              percentage: 25,
              domainPercentage: 25,
              rank: 2,
            }),
            buildNormalizedSignal({
              signalId: 'signal-vision',
              signalKey: 'lead_vision',
              title: 'Vision',
              domainId: 'domain-lead',
              domainKey: 'signal_lead',
              rawTotal: 3,
              percentage: 29,
              domainPercentage: 29,
              rank: 1,
            }),
          ]),
          answeredQuestionCount: 8,
        }),
      ]),
      topSignalId: 'signal-vision',
    }),
  });

  const domain = payload.domainSummaries[0];
  assert.deepEqual(domain?.signalScores.map((signal) => signal.signalKey), ['lead_vision', 'lead_results']);
  assert.deepEqual(domain?.rankedSignalIds, ['signal-vision', 'signal-results']);
  assert.equal(domain?.interpretation?.primarySignalKey, domain?.signalScores[0]?.signalKey);
  assert.equal(domain?.interpretation?.primaryPercent, domain?.signalScores[0]?.domainPercentage);
  assert.equal(domain?.interpretation?.secondarySignalKey, domain?.signalScores[1]?.signalKey);
  assert.equal(domain?.interpretation?.secondaryPercent, domain?.signalScores[1]?.domainPercentage);
  assert.ok((domain?.interpretation?.primaryPercent ?? 0) >= (domain?.interpretation?.secondaryPercent ?? 0));
});

test('domain language summary overrides persisted domain interpretation summary only', () => {
  const domainSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 39,
      domainPercentage: 39,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 3,
      percentage: 24,
      domainPercentage: 24,
      rank: 2,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: domainSignals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-style',
          domainKey: 'signal_style',
          title: 'Behaviour Style',
          rawTotal: 8,
          percentage: 100,
          signalScores: domainSignals,
          answeredQuestionCount: 8,
        }),
      ]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: domainSignals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-style',
          domainKey: 'signal_style',
          title: 'Behaviour Style',
          rawTotal: 8,
          percentage: 100,
          signalScores: domainSignals,
          answeredQuestionCount: 8,
        }),
      ]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {},
        pairs: {},
        domains: {
          signal_style: {
            summary: 'Assessment-owned domain summary for Behaviour Style.',
          },
        },
        overview: {},
      },
    }),
  });

  assert.equal(payload.domainSummaries[0]?.interpretation?.summary, 'Assessment-owned domain summary for Behaviour Style.');
  assert.equal(
    payload.domainSummaries[0]?.interpretation?.supportingLine,
    baseline.domainSummaries[0]?.interpretation?.supportingLine,
  );
  assert.equal(
    payload.domainSummaries[0]?.interpretation?.tensionClause,
    baseline.domainSummaries[0]?.interpretation?.tensionClause,
  );
  assert.equal(payload.overviewSummary.headline, baseline.overviewSummary.headline);
  assert.equal(payload.overviewSummary.narrative, baseline.overviewSummary.narrative);
  assert.deepEqual(payload.actions.strengths, baseline.actions.strengths);
  assert.deepEqual(payload.actions.watchouts, baseline.actions.watchouts);
  assert.deepEqual(payload.actions.developmentFocus, baseline.actions.developmentFocus);
});

test('domain summary fallback remains unchanged when domain language summary is missing', () => {
  const domainSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 39,
      domainPercentage: 39,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 3,
      percentage: 24,
      domainPercentage: 24,
      rank: 2,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: domainSignals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-style',
          domainKey: 'signal_style',
          title: 'Behaviour Style',
          rawTotal: 8,
          percentage: 100,
          signalScores: domainSignals,
          answeredQuestionCount: 8,
        }),
      ]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: domainSignals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-style',
          domainKey: 'signal_style',
          title: 'Behaviour Style',
          rawTotal: 8,
          percentage: 100,
          signalScores: domainSignals,
          answeredQuestionCount: 8,
        }),
      ]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {},
        pairs: {},
        domains: {
          signal_style: {
            environment: 'Present but out of scope.',
          },
        },
        overview: {},
      },
    }),
  });

  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
  assert.deepEqual(payload.overviewSummary, baseline.overviewSummary);
  assert.deepEqual(payload.actions.strengths, baseline.actions.strengths);
  assert.deepEqual(payload.actions.watchouts, baseline.actions.watchouts);
  assert.deepEqual(payload.actions.developmentFocus, baseline.actions.developmentFocus);
});

test('domain ordering tie handling is deterministic in persisted payloads', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-operator',
          signalKey: 'style_operator',
          title: 'Operator',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 3,
          percentage: 30,
          domainPercentage: 30,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 3,
          percentage: 30,
          domainPercentage: 30,
          rank: 1,
        }),
      ]),
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-style',
          domainKey: 'signal_style',
          title: 'Behaviour Style',
          rawTotal: 6,
          percentage: 100,
          signalScores: Object.freeze([
            buildNormalizedSignal({
              signalId: 'signal-operator',
              signalKey: 'style_operator',
              title: 'Operator',
              domainId: 'domain-style',
              domainKey: 'signal_style',
              rawTotal: 3,
              percentage: 30,
              domainPercentage: 30,
              rank: 2,
            }),
            buildNormalizedSignal({
              signalId: 'signal-driver',
              signalKey: 'style_driver',
              title: 'Driver',
              domainId: 'domain-style',
              domainKey: 'signal_style',
              rawTotal: 3,
              percentage: 30,
              domainPercentage: 30,
              rank: 1,
            }),
          ]),
          answeredQuestionCount: 8,
        }),
      ]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.deepEqual(payload.domainSummaries[0]?.signalScores.map((signal) => signal.signalKey), [
    'style_driver',
    'style_operator',
  ]);
  assert.equal(payload.domainSummaries[0]?.interpretation?.primarySignalKey, 'style_driver');
  assert.equal(payload.domainSummaries[0]?.interpretation?.secondarySignalKey, 'style_operator');
});

test('conflict and stress interpretations persist refined pairwise language in the canonical payload', () => {
  const signals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-collaborate',
      signalKey: 'conflict_collaborate',
      title: 'Collaborate',
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      rawTotal: 4,
      percentage: 35,
      domainPercentage: 35,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-accommodate',
      signalKey: 'conflict_accommodate',
      title: 'Accommodate',
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      rawTotal: 3,
      percentage: 28,
      domainPercentage: 28,
      rank: 2,
    }),
    buildNormalizedSignal({
      signalId: 'signal-control',
      signalKey: 'stress_control',
      title: 'Control',
      domainId: 'domain-stress',
      domainKey: 'signal_stress',
      rawTotal: 5,
      percentage: 37,
      domainPercentage: 37,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-avoidance',
      signalKey: 'stress_avoidance',
      title: 'Avoidance',
      domainId: 'domain-stress',
      domainKey: 'signal_stress',
      rawTotal: 3,
      percentage: 29,
      domainPercentage: 29,
      rank: 2,
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          title: 'Conflict',
          rawTotal: 7,
          percentage: 100,
          signalScores: signals.filter((signal) => signal.domainKey === 'signal_conflict'),
          answeredQuestionCount: 8,
        }),
        buildDomainSummary({
          domainId: 'domain-stress',
          domainKey: 'signal_stress',
          title: 'Stress',
          rawTotal: 8,
          percentage: 100,
          signalScores: signals.filter((signal) => signal.domainKey === 'signal_stress'),
          answeredQuestionCount: 8,
        }),
      ]),
      topSignalId: 'signal-control',
    }),
  });

  assert.equal(payload.domainSummaries[0]?.interpretation?.diagnostics?.ruleKey, 'conflict_collaborate_accommodate');
  assert.match(payload.domainSummaries[0]?.interpretation?.summary ?? '', /relationship intact|tone constructive/i);
  assert.equal(payload.domainSummaries[1]?.interpretation?.diagnostics?.ruleKey, 'stress_control_avoidance');
  assert.match(payload.domainSummaries[1]?.interpretation?.tensionClause ?? '', /manage around the problem|real tension stays untouched/i);
});

test('overview summary classification is deterministic for concentrated profiles', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture(),
  });

  assert.equal(payload.overviewSummary.headline, 'Focus');
  assert.match(payload.overviewSummary.narrative, /dependable way to approach work/i);
});

test('overview summary uses overview language summary when the resolved canonical pattern has one', () => {
  const signals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 46,
      domainPercentage: 46,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 4,
      percentage: 33,
      domainPercentage: 33,
      rank: 2,
    }),
    buildNormalizedSignal({
      signalId: 'signal-mastery',
      signalKey: 'mot_mastery',
      title: 'Mastery',
      domainId: 'domain-mot',
      domainKey: 'signal_mot',
      rawTotal: 2,
      percentage: 21,
      domainPercentage: 21,
      rank: 3,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {},
        pairs: {},
        domains: {},
        overview: {
          analyst_driver: {
            summary: 'Overview-language summary for the dominant analyst-driver combination.',
          },
        },
      },
    }),
  });

  assert.ok(isCanonicalResultPayload(payload));
  assert.equal(payload.overviewSummary.headline, baseline.overviewSummary.headline);
  assert.equal(
    payload.overviewSummary.narrative,
    'Overview-language summary for the dominant analyst-driver combination.',
  );
  assert.deepEqual(payload.actions.strengths, baseline.actions.strengths);
  assert.deepEqual(payload.actions.watchouts, baseline.actions.watchouts);
  assert.deepEqual(payload.actions.developmentFocus, baseline.actions.developmentFocus);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
});

test('overview summary uses overview template headline when the resolved canonical pattern has one', () => {
  const signals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 46,
      domainPercentage: 46,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 4,
      percentage: 33,
      domainPercentage: 33,
      rank: 2,
    }),
    buildNormalizedSignal({
      signalId: 'signal-mastery',
      signalKey: 'mot_mastery',
      title: 'Mastery',
      domainId: 'domain-mot',
      domainKey: 'signal_mot',
      rawTotal: 2,
      percentage: 21,
      domainPercentage: 21,
      rank: 3,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {},
        pairs: {
          analyst_driver: {
            summary: 'Reserved pair-level summary.',
          },
        },
        domains: {},
        overview: {
          analyst_driver: {
            headline: 'Assessment-authored overview headline.',
            summary: 'Assessment-authored overview summary.',
          },
        },
      },
    }),
  });

  assert.ok(isCanonicalResultPayload(payload));
  assert.equal(payload.overviewSummary.headline, 'Assessment-authored overview headline.');
  assert.equal(payload.overviewSummary.narrative, 'Assessment-authored overview summary.');
  assert.deepEqual(payload.actions.strengths, baseline.actions.strengths);
  assert.deepEqual(payload.actions.watchouts, baseline.actions.watchouts);
  assert.deepEqual(payload.actions.developmentFocus, baseline.actions.developmentFocus);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
});

test('overview summary falls back unchanged when overview language summary is missing', () => {
  const signals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 46,
      domainPercentage: 46,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 4,
      percentage: 33,
      domainPercentage: 33,
      rank: 2,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {},
        pairs: {
          analyst_driver: {
            summary: 'Reserved pair summary should not affect overview narrative.',
          },
        },
        domains: {},
        overview: {},
      },
    }),
  });

  assert.deepEqual(payload.overviewSummary, baseline.overviewSummary);
});

test('overview summary headline falls back unchanged when overview template headline is missing', () => {
  const signals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 46,
      domainPercentage: 46,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 4,
      percentage: 33,
      domainPercentage: 33,
      rank: 2,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {},
        pairs: {
          analyst_driver: {
            summary: 'Reserved pair summary.',
          },
        },
        domains: {},
        overview: {
          analyst_driver: {
            summary: 'Present but not used for headline.',
          },
        },
      },
    }),
  });

  assert.equal(payload.overviewSummary.headline, baseline.overviewSummary.headline);
  assert.equal(payload.overviewSummary.narrative, 'Present but not used for headline.');
  assert.deepEqual(payload.actions.strengths, baseline.actions.strengths);
  assert.deepEqual(payload.actions.watchouts, baseline.actions.watchouts);
  assert.deepEqual(payload.actions.developmentFocus, baseline.actions.developmentFocus);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
});

test('overview summary headline falls back to the top signal title when only a prefix template exists', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-mastery',
          signalKey: 'mot_mastery',
          title: 'Mastery',
          domainId: 'domain-mot',
          domainKey: 'signal_mot',
          rawTotal: 5,
          percentage: 47,
          domainPercentage: 47,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 4,
          percentage: 34,
          domainPercentage: 34,
          rank: 2,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-mastery',
    }),
  });

  assert.equal(payload.overviewSummary.headline, 'Mastery');
  assert.doesNotMatch(
    payload.overviewSummary.headline ?? '',
    /A clear (working style|source of motivation|leadership pattern|conflict response|environment preference|decision pattern|role fit) is coming through|A pressure pattern is coming through/,
  );
});

test('overview summary lookup is canonical even when the top two signals resolve in reverse lexical order', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 44,
          domainPercentage: 44,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-analyst',
          signalKey: 'style_analyst',
          title: 'Analyst',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 4,
          percentage: 39,
          domainPercentage: 39,
          rank: 2,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {},
        pairs: {},
        domains: {},
        overview: {
          analyst_driver: {
            summary: 'Canonical overview summary.',
          },
        },
      },
    }),
  });

  assert.equal(payload.overviewSummary.narrative, 'Canonical overview summary.');
});

test('overview template headline lookup is canonical even when the top two signals resolve in reverse lexical order', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 44,
          domainPercentage: 44,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-analyst',
          signalKey: 'style_analyst',
          title: 'Analyst',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 4,
          percentage: 39,
          domainPercentage: 39,
          rank: 2,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {},
        pairs: {},
        domains: {},
        overview: {
          analyst_driver: {
            headline: 'Canonical overview headline.',
          },
        },
      },
    }),
  });

  assert.equal(payload.overviewSummary.headline, 'Canonical overview headline.');
});

test('overview summary uses top-signal interpretation when a mapped signal leads', () => {
  const mappedSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 46,
      domainPercentage: 46,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-evidence',
      signalKey: 'decision_evidence',
      title: 'Evidence',
      domainId: 'domain-decision',
      domainKey: 'signal_decision',
      rawTotal: 3,
      percentage: 31,
      domainPercentage: 31,
      rank: 2,
      isOverlay: true,
      overlayType: 'decision',
    }),
    buildNormalizedSignal({
      signalId: 'signal-mastery',
      signalKey: 'mot_mastery',
      title: 'Mastery',
      domainId: 'domain-mot',
      domainKey: 'signal_mot',
      rawTotal: 2,
      percentage: 23,
      domainPercentage: 23,
      rank: 3,
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: mappedSignals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-analyst',
    }),
  });

  assert.equal(payload.overviewSummary.headline, 'Structured, thoughtful and evidence-led');
  assert.match(payload.overviewSummary.narrative, /logic rather than impulse/i);
  assert.match(payload.overviewSummary.narrative, /accuracy, sound judgement, and careful problem-solving/i);
});

test('generic prefix-level hero fallback headlines are absent from result interpretation source', () => {
  const source = readFileSync(resultInterpretationPath, 'utf8');

  for (const headline of DISALLOWED_GENERIC_HERO_HEADLINES) {
    assert.doesNotMatch(source, new RegExp(headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('overview summary uses secondary support language for balanced profiles', () => {
  const balancedSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-a',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 4,
      percentage: 36,
      domainPercentage: 36,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-b',
      signalKey: 'mot_achievement',
      title: 'Achievement',
      domainId: 'domain-mot',
      domainKey: 'signal_mot',
      rawTotal: 4,
      percentage: 34,
      domainPercentage: 34,
      rank: 2,
    }),
    buildNormalizedSignal({
      signalId: 'signal-c',
      signalKey: 'decision_agility',
      title: 'Agility',
      domainId: 'domain-decision',
      domainKey: 'signal_decision',
      rawTotal: 3,
      percentage: 30,
      domainPercentage: 30,
      rank: 3,
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: balancedSignals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-a',
    }),
  });

  assert.match(payload.overviewSummary.narrative, /close secondary signal in Achievement/i);
  assert.match(payload.overviewSummary.narrative, /more visible drive and stretch/i);
});

test('strengths are generated deterministically from top-ranked signals', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 50,
          domainPercentage: 50,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-results',
          signalKey: 'lead_results',
          title: 'Results',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          rawTotal: 3,
          percentage: 30,
          domainPercentage: 30,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-achievement',
          signalKey: 'mot_achievement',
          title: 'Achievement',
          domainId: 'domain-mot',
          domainKey: 'signal_mot',
          rawTotal: 2,
          percentage: 20,
          domainPercentage: 20,
          rank: 3,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.equal(payload.actions.strengths.length, 3);
  assert.deepEqual(payload.actions.strengths[0], {
    signalKey: 'style_driver',
    signalLabel: 'Driver',
    text: payload.actions.strengths[0]?.text ?? '',
  });
  assert.match(payload.actions.strengths[0]?.text ?? '', /direction, urgency, or firmer calls/i);
  assert.match(payload.actions.strengths[0]?.text ?? '', /create movement quickly/i);
  assert.doesNotMatch(payload.actions.strengths[0]?.text ?? '', /\d+%/);
});

test('signal language strength overrides fallback strength text when present', () => {
  const signals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 50,
      domainPercentage: 50,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-results',
      signalKey: 'lead_results',
      title: 'Results',
      domainId: 'domain-lead',
      domainKey: 'signal_lead',
      rawTotal: 3,
      percentage: 30,
      domainPercentage: 30,
      rank: 2,
    }),
    buildNormalizedSignal({
      signalId: 'signal-achievement',
      signalKey: 'mot_achievement',
      title: 'Achievement',
      domainId: 'domain-mot',
      domainKey: 'signal_mot',
      rawTotal: 2,
      percentage: 20,
      domainPercentage: 20,
      rank: 3,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {
          style_driver: {
            strength: 'Assessment-owned strength language for the Driver signal.',
          },
        },
        pairs: {},
        domains: {},
        overview: {},
      },
    }),
  });

  assert.equal(payload.actions.strengths.length, baseline.actions.strengths.length);
  assert.equal(payload.actions.strengths[0]?.text, 'Assessment-owned strength language for the Driver signal.');
  assert.equal(payload.actions.strengths[0]?.signalLabel, baseline.actions.strengths[0]?.signalLabel);
  assert.equal(payload.overviewSummary.narrative, baseline.overviewSummary.narrative);
  assert.deepEqual(payload.actions.watchouts, baseline.actions.watchouts);
  assert.deepEqual(payload.actions.developmentFocus, baseline.actions.developmentFocus);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
});

test('watchouts are generated deterministically from overuse, pressure rules, and lower-access signals', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 42,
          domainPercentage: 42,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-control',
          signalKey: 'stress_control',
          title: 'Control',
          domainId: 'domain-stress',
          domainKey: 'signal_stress',
          rawTotal: 4,
          percentage: 33,
          domainPercentage: 33,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-avoid',
          signalKey: 'conflict_avoid',
          title: 'Avoid',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          rawTotal: 1,
          percentage: 10,
          domainPercentage: 10,
          rank: 3,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.equal(payload.actions.watchouts.length, 2);
  assert.equal(payload.actions.watchouts[0]?.signalKey, 'style_driver');
  assert.match(payload.actions.watchouts[0]?.text ?? '', /too forceful, too fast, or too impatient/i);
  assert.doesNotMatch(payload.actions.watchouts[0]?.text ?? '', /undefined|null/i);
  assert.equal(payload.actions.watchouts[1]?.signalKey, 'conflict_avoid');
});

test('structured actions drop unattributable watchout lines instead of fabricating signal provenance', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 42,
          domainPercentage: 42,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-control',
          signalKey: 'stress_control',
          title: 'Control',
          domainId: 'domain-stress',
          domainKey: 'signal_stress',
          rawTotal: 4,
          percentage: 33,
          domainPercentage: 33,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-avoid',
          signalKey: 'conflict_avoid',
          title: 'Avoid',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          rawTotal: 1,
          percentage: 10,
          domainPercentage: 10,
          rank: 3,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.deepEqual(
    payload.actions.watchouts.map((item) => item.signalKey),
    ['style_driver', 'conflict_avoid'],
  );
  assert.equal(payload.actions.watchouts.length, 2);
});

test('signal language watchout overrides signal-led watchout text when present', () => {
  const signals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 42,
      domainPercentage: 42,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-control',
      signalKey: 'stress_control',
      title: 'Control',
      domainId: 'domain-stress',
      domainKey: 'signal_stress',
      rawTotal: 4,
      percentage: 33,
      domainPercentage: 33,
      rank: 2,
    }),
    buildNormalizedSignal({
      signalId: 'signal-avoid',
      signalKey: 'conflict_avoid',
      title: 'Avoid',
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      rawTotal: 1,
      percentage: 10,
      domainPercentage: 10,
      rank: 3,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {
          style_driver: {
            watchout: 'Assessment-owned watchout language for the Driver signal.',
          },
        },
        pairs: {},
        domains: {},
        overview: {},
      },
    }),
  });

  assert.equal(payload.actions.watchouts.length, baseline.actions.watchouts.length);
  assert.equal(payload.actions.watchouts[0]?.text, 'Assessment-owned watchout language for the Driver signal.');
  assert.equal(payload.actions.watchouts[1]?.text, baseline.actions.watchouts[1]?.text);
  assert.equal(payload.actions.watchouts[2]?.text, baseline.actions.watchouts[2]?.text);
  assert.deepEqual(payload.actions.strengths, baseline.actions.strengths);
  assert.deepEqual(payload.actions.developmentFocus, baseline.actions.developmentFocus);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
  assert.deepEqual(payload.overviewSummary, baseline.overviewSummary);
});

test('development focus is generated deterministically from lower-ranked signals', () => {
  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: Object.freeze([
        buildNormalizedSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          rawTotal: 5,
          percentage: 55,
          domainPercentage: 55,
          rank: 1,
        }),
        buildNormalizedSignal({
          signalId: 'signal-collaborate',
          signalKey: 'conflict_collaborate',
          title: 'Collaborate',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          rawTotal: 3,
          percentage: 29,
          domainPercentage: 29,
          rank: 2,
        }),
        buildNormalizedSignal({
          signalId: 'signal-evidence',
          signalKey: 'decision_evidence',
          title: 'Evidence',
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          rawTotal: 1,
          percentage: 10,
          domainPercentage: 10,
          rank: 3,
        }),
        buildNormalizedSignal({
          signalId: 'signal-people',
          signalKey: 'lead_people',
          title: 'People',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          rawTotal: 1,
          percentage: 6,
          domainPercentage: 6,
          rank: 4,
        }),
      ]),
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  assert.equal(payload.actions.developmentFocus.length, 2);
  assert.equal(payload.actions.developmentFocus[0]?.signalKey, 'decision_evidence');
  assert.match(payload.actions.developmentFocus[0]?.text ?? '', /concise evidence checks/i);
  assert.match(payload.actions.developmentFocus[0]?.text ?? '', /sharper calls/i);
  assert.equal(payload.actions.developmentFocus[1]?.signalKey, 'lead_people');
});

test('signal language development overrides fallback development text when present', () => {
  const signals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 55,
      domainPercentage: 55,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-collaborate',
      signalKey: 'conflict_collaborate',
      title: 'Collaborate',
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      rawTotal: 3,
      percentage: 29,
      domainPercentage: 29,
      rank: 2,
    }),
    buildNormalizedSignal({
      signalId: 'signal-evidence',
      signalKey: 'decision_evidence',
      title: 'Evidence',
      domainId: 'domain-decision',
      domainKey: 'signal_decision',
      rawTotal: 1,
      percentage: 10,
      domainPercentage: 10,
      rank: 3,
    }),
    buildNormalizedSignal({
      signalId: 'signal-people',
      signalKey: 'lead_people',
      title: 'People',
      domainId: 'domain-lead',
      domainKey: 'signal_lead',
      rawTotal: 1,
      percentage: 6,
      domainPercentage: 6,
      rank: 4,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {
          decision_evidence: {
            development: 'Assessment-owned development language for evidence-led judgement.',
          },
        },
        pairs: {},
        domains: {},
        overview: {},
      },
    }),
  });

  assert.equal(payload.actions.developmentFocus.length, baseline.actions.developmentFocus.length);
  assert.equal(
    payload.actions.developmentFocus[0]?.text,
    'Assessment-owned development language for evidence-led judgement.',
  );
  assert.equal(payload.actions.developmentFocus[1]?.text, baseline.actions.developmentFocus[1]?.text);
  assert.deepEqual(payload.actions.strengths, baseline.actions.strengths);
  assert.deepEqual(payload.actions.watchouts, baseline.actions.watchouts);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
  assert.deepEqual(payload.overviewSummary, baseline.overviewSummary);
});

test('signal language fallback remains unchanged when required entries are missing', () => {
  const signals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 42,
      domainPercentage: 42,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-control',
      signalKey: 'stress_control',
      title: 'Control',
      domainId: 'domain-stress',
      domainKey: 'signal_stress',
      rawTotal: 4,
      percentage: 33,
      domainPercentage: 33,
      rank: 2,
    }),
    buildNormalizedSignal({
      signalId: 'signal-avoid',
      signalKey: 'conflict_avoid',
      title: 'Avoid',
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      rawTotal: 1,
      percentage: 10,
      domainPercentage: 10,
      rank: 3,
    }),
  ]);

  const baseline = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
    }),
  });

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: signals,
      domainSummaries: Object.freeze([]),
      topSignalId: 'signal-driver',
      languageBundle: {
        signals: {
          style_driver: {
            summary: 'Present but irrelevant for this task.',
          },
        },
        pairs: {},
        domains: {},
        overview: {},
      },
    }),
  });

  assert.deepEqual(payload.actions.strengths, baseline.actions.strengths);
  assert.deepEqual(payload.actions.watchouts, baseline.actions.watchouts);
  assert.deepEqual(payload.actions.developmentFocus, baseline.actions.developmentFocus);
  assert.deepEqual(payload.overviewSummary, baseline.overviewSummary);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
});

test('zero-mass behavior remains explicit and still builds successfully', () => {
  const zeroSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-focus',
      signalKey: 'focus',
      title: 'Focus',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 0,
      percentage: 0,
      domainPercentage: 0,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-drive',
      signalKey: 'drive',
      title: 'Drive',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 0,
      percentage: 0,
      domainPercentage: 0,
      rank: 2,
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: zeroSignals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-section',
          domainKey: 'section_a',
          title: 'Section A',
          domainSource: 'question_section',
          rawTotal: 0,
          percentage: 0,
          signalScores: Object.freeze([]),
          answeredQuestionCount: 0,
        }),
        buildDomainSummary({
          domainId: 'domain-signals',
          domainKey: 'signals',
          title: 'Signals',
          rawTotal: 0,
          percentage: 0,
          signalScores: zeroSignals,
          answeredQuestionCount: 0,
        }),
      ]),
      topSignalId: 'signal-focus',
      zeroMass: true,
      normalizationWarnings: Object.freeze(['zero_score_mass']),
      answeredQuestions: 0,
      totalQuestions: 4,
      scoringWarnings: Object.freeze(['incomplete_response_set', 'no_answers_submitted']),
    }),
  });

  assert.ok(payload.topSignal);
  assert.equal(payload.diagnostics.zeroMass, true);
  assert.equal(payload.diagnostics.zeroMassTopSignalFallbackApplied, true);
  assert.ok(payload.diagnostics.warnings.includes('zero_score_mass'));
});

test('overlay-like signals remain valid in ranked and normalized outputs', () => {
  const overlaySignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-core',
      signalKey: 'core',
      title: 'Core',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 4,
      percentage: 80,
      domainPercentage: 80,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-overlay',
      signalKey: 'role_executor',
      title: 'Role Executor',
      domainId: 'domain-signals',
      domainKey: 'signals',
      rawTotal: 1,
      percentage: 20,
      domainPercentage: 20,
      rank: 2,
      isOverlay: true,
      overlayType: 'role',
    }),
  ]);

  const payload = buildCanonicalResultPayload({
    normalizedResult: buildNormalizedResultFixture({
      signalScores: overlaySignals,
      domainSummaries: Object.freeze([
        buildDomainSummary({
          domainId: 'domain-signals',
          domainKey: 'signals',
          title: 'Signals',
          rawTotal: 5,
          percentage: 100,
          signalScores: overlaySignals,
          answeredQuestionCount: 2,
        }),
      ]),
      topSignalId: 'signal-core',
    }),
  });

  assert.equal(payload.rankedSignals[1]?.signalId, 'signal-overlay');
  assert.equal(payload.rankedSignals[1]?.isOverlay, true);
  assert.equal(payload.normalizedScores[1]?.overlayType, 'role');
});

test('repeated runs with the same normalized input are byte-stable', () => {
  const normalizedResult = buildNormalizedResultFixture();

  const first = buildCanonicalResultPayload({ normalizedResult });
  const second = buildCanonicalResultPayload({ normalizedResult });

  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('repeated runs with overview-language summary remain byte-stable', () => {
  const normalizedResult = buildNormalizedResultFixture({
    signalScores: Object.freeze([
      buildNormalizedSignal({
        signalId: 'signal-support',
        signalKey: 'support_drive',
        title: 'Support Drive',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 4,
        percentage: 57,
        domainPercentage: 57,
        rank: 1,
      }),
      buildNormalizedSignal({
        signalId: 'signal-core',
        signalKey: 'core_focus',
        title: 'Core Focus',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 3,
        percentage: 43,
        domainPercentage: 43,
        rank: 2,
      }),
    ]),
    domainSummaries: Object.freeze([]),
    topSignalId: 'signal-support',
    languageBundle: {
      signals: {},
      pairs: {
        drive_focus: {
          summary: 'Reserved pair summary.',
        },
      },
      domains: {},
      overview: {
        drive_focus: {
          summary: 'Consistent custom overview.',
        },
      },
    },
  });

  const first = buildCanonicalResultPayload({ normalizedResult });
  const second = buildCanonicalResultPayload({ normalizedResult });

  assert.equal(first.overviewSummary.narrative, 'Consistent custom overview.');
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('repeated runs with overview template headline remain byte-stable', () => {
  const normalizedResult = buildNormalizedResultFixture({
    signalScores: Object.freeze([
      buildNormalizedSignal({
        signalId: 'signal-support',
        signalKey: 'support_drive',
        title: 'Support Drive',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 4,
        percentage: 57,
        domainPercentage: 57,
        rank: 1,
      }),
      buildNormalizedSignal({
        signalId: 'signal-core',
        signalKey: 'core_focus',
        title: 'Core Focus',
        domainId: 'domain-signals',
        domainKey: 'signals',
        rawTotal: 3,
        percentage: 43,
        domainPercentage: 43,
        rank: 2,
      }),
    ]),
    domainSummaries: Object.freeze([]),
    topSignalId: 'signal-support',
    languageBundle: {
      signals: {},
      pairs: {
        drive_focus: {
          summary: 'Reserved pair summary.',
        },
      },
      domains: {},
      overview: {
        drive_focus: {
          summary: 'Consistent custom overview.',
          headline: 'Consistent custom overview headline.',
        },
      },
    },
  });

  const first = buildCanonicalResultPayload({ normalizedResult });
  const second = buildCanonicalResultPayload({ normalizedResult });

  assert.equal(first.overviewSummary.headline, 'Consistent custom overview headline.');
  assert.equal(first.overviewSummary.narrative, 'Consistent custom overview.');
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('repeated runs with signal-language sections remain byte-stable', () => {
  const normalizedResult = buildNormalizedResultFixture({
    signalScores: Object.freeze([
      buildNormalizedSignal({
        signalId: 'signal-driver',
        signalKey: 'style_driver',
        title: 'Driver',
        domainId: 'domain-style',
        domainKey: 'signal_style',
        rawTotal: 5,
        percentage: 42,
        domainPercentage: 42,
        rank: 1,
      }),
      buildNormalizedSignal({
        signalId: 'signal-control',
        signalKey: 'stress_control',
        title: 'Control',
        domainId: 'domain-stress',
        domainKey: 'signal_stress',
        rawTotal: 4,
        percentage: 33,
        domainPercentage: 33,
        rank: 2,
      }),
      buildNormalizedSignal({
        signalId: 'signal-evidence',
        signalKey: 'decision_evidence',
        title: 'Evidence',
        domainId: 'domain-decision',
        domainKey: 'signal_decision',
        rawTotal: 1,
        percentage: 14,
        domainPercentage: 14,
        rank: 3,
      }),
      buildNormalizedSignal({
        signalId: 'signal-avoid',
        signalKey: 'conflict_avoid',
        title: 'Avoid',
        domainId: 'domain-conflict',
        domainKey: 'signal_conflict',
        rawTotal: 1,
        percentage: 11,
        domainPercentage: 11,
        rank: 4,
      }),
    ]),
    domainSummaries: Object.freeze([]),
    topSignalId: 'signal-driver',
    languageBundle: {
      signals: {
        style_driver: {
          strength: 'Stable custom strength.',
          watchout: 'Stable custom watchout.',
        },
        decision_evidence: {
          development: 'Stable custom development.',
        },
      },
      pairs: {},
      domains: {},
      overview: {},
    },
  });

  const first = buildCanonicalResultPayload({ normalizedResult });
  const second = buildCanonicalResultPayload({ normalizedResult });

  assert.equal(first.actions.strengths[0]?.text, 'Stable custom strength.');
  assert.equal(first.actions.watchouts[0]?.text, 'Stable custom watchout.');
  assert.equal(first.actions.developmentFocus[0]?.text, 'Stable custom development.');
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('repeated runs with domain-language summaries remain byte-stable', () => {
  const domainSignals = Object.freeze([
    buildNormalizedSignal({
      signalId: 'signal-driver',
      signalKey: 'style_driver',
      title: 'Driver',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 5,
      percentage: 39,
      domainPercentage: 39,
      rank: 1,
    }),
    buildNormalizedSignal({
      signalId: 'signal-analyst',
      signalKey: 'style_analyst',
      title: 'Analyst',
      domainId: 'domain-style',
      domainKey: 'signal_style',
      rawTotal: 3,
      percentage: 24,
      domainPercentage: 24,
      rank: 2,
    }),
  ]);

  const normalizedResult = buildNormalizedResultFixture({
    signalScores: domainSignals,
    domainSummaries: Object.freeze([
      buildDomainSummary({
        domainId: 'domain-style',
        domainKey: 'signal_style',
        title: 'Behaviour Style',
        rawTotal: 8,
        percentage: 100,
        signalScores: domainSignals,
        answeredQuestionCount: 8,
      }),
    ]),
    topSignalId: 'signal-driver',
    languageBundle: {
      signals: {},
      pairs: {},
      domains: {
        signal_style: {
          summary: 'Stable custom domain summary.',
        },
      },
      overview: {},
    },
  });

  const first = buildCanonicalResultPayload({ normalizedResult });
  const second = buildCanonicalResultPayload({ normalizedResult });

  assert.equal(first.domainSummaries[0]?.interpretation?.summary, 'Stable custom domain summary.');
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});
