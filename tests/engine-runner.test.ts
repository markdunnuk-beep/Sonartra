import test from 'node:test';
import assert from 'node:assert/strict';

import { runAssessmentEngine, EngineNotFoundError } from '@/lib/engine/engine-runner';
import type { AssessmentDefinitionRepository } from '@/lib/engine/repository';
import { ScoringError } from '@/lib/engine/scoring';
import { CANONICAL_RESULT_PAYLOAD_FIELDS, isCanonicalResultPayload } from '@/lib/engine/result-contract';
import type { EngineLanguageBundle, RuntimeAssessmentDefinition, RuntimeResponseSet } from '@/lib/engine/types';

function createEmptyLanguageBundle(): EngineLanguageBundle {
  return {
    signals: {},
    pairs: {},
    domains: {},
    overview: {},
  };
}

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
    language: number;
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
    language: 0,
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
      async getAssessmentVersionLanguageBundle() {
        calls.language += 1;
        return createEmptyLanguageBundle();
      },
    },
    calls,
  };
}

function createRepositoryWithLanguageBundle(
  definition: RuntimeAssessmentDefinition,
  languageBundle: EngineLanguageBundle,
): AssessmentDefinitionRepository {
  return {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return languageBundle;
    },
  };
}

function assertCanonicalPayloadShape(payload: Record<string, unknown>): void {
  assert.deepEqual(Object.keys(payload), [...CANONICAL_RESULT_PAYLOAD_FIELDS]);
  assert.deepEqual(Object.keys(payload.overviewSummary as Record<string, unknown>), ['headline', 'narrative']);
  assert.ok(Array.isArray(payload.strengths));
  assert.ok(Array.isArray(payload.watchouts));
  assert.ok(Array.isArray(payload.developmentFocus));
  assert.ok(Array.isArray(payload.domainSummaries));
  assert.ok(Array.isArray(payload.rankedSignals));
  assert.ok(Array.isArray(payload.normalizedScores));
  assert.equal(typeof payload.diagnostics, 'object');
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
  assert.equal(calls.language, 1);
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
  assert.equal(calls.language, 1);
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
  assert.equal(calls.language, 1);
  assert.deepEqual(calls.lastVersionParams, {
    assessmentVersionId: 'version-1',
  });
  assert.equal(payload.metadata.version, '1.0.0');
});

test('engine path loads language bundle for a valid assessment version and leaves output unchanged', async () => {
  const definition = buildDefinition();
  let loadedAssessmentVersionId: string | null = null;
  const repository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle(assessmentVersionId) {
      loadedAssessmentVersionId = assessmentVersionId;
      return {
        signals: {
          core_focus: {
            summary: 'Unused summary',
          },
        },
        pairs: {},
        domains: {},
        overview: {},
      };
    },
  };

  const payload = await runAssessmentEngine({
    repository,
    assessmentVersionId: 'version-1',
    responses: buildResponses({ 'question-1': 'option-1' }),
  });

  assert.equal(loadedAssessmentVersionId, 'version-1');
  assert.equal(payload.overviewSummary.headline, 'A clear operating preference is coming through');
  assert.match(payload.overviewSummary.narrative, /dependable way to approach work/i);
});

test('engine path uses overview-language summary for overview narrative only when available', async () => {
  const definition = buildDefinition();
  const repository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return {
        signals: {},
        pairs: {
          drive_focus: {
            summary: 'Reserved pair-level summary.',
          },
        },
        domains: {},
        overview: {
          drive_focus: {
            summary: 'Custom overview summary from the assessment version.',
          },
        },
      };
    },
  };

  const baselineRepository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return createEmptyLanguageBundle();
    },
  };

  const baseline = await runAssessmentEngine({
    repository: baselineRepository,
    assessmentVersionId: 'version-1',
    responses: buildResponses({
      'question-1': 'option-2',
      'question-2': 'option-3',
    }),
  });

  const payload = await runAssessmentEngine({
    repository,
    assessmentVersionId: 'version-1',
    responses: buildResponses({
      'question-1': 'option-2',
      'question-2': 'option-3',
    }),
  });

  assert.equal(payload.overviewSummary.headline, baseline.overviewSummary.headline);
  assert.equal(payload.overviewSummary.narrative, 'Custom overview summary from the assessment version.');
  assert.deepEqual(payload.strengths, baseline.strengths);
  assert.deepEqual(payload.watchouts, baseline.watchouts);
  assert.deepEqual(payload.developmentFocus, baseline.developmentFocus);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
});

test('engine path uses overview template headline for overview headline only when available', async () => {
  const definition = buildDefinition();
  const repository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return {
        signals: {},
        pairs: {
          drive_focus: {
            summary: 'Reserved pair-level summary.',
          },
        },
        domains: {},
        overview: {
          drive_focus: {
            headline: 'Custom overview headline from the assessment version.',
            summary: 'Custom overview summary from the assessment version.',
          },
        },
      };
    },
  };

  const baselineRepository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return createEmptyLanguageBundle();
    },
  };

  const responses = buildResponses({
    'question-1': 'option-2',
    'question-2': 'option-3',
  });

  const baseline = await runAssessmentEngine({
    repository: baselineRepository,
    assessmentVersionId: 'version-1',
    responses,
  });

  const payload = await runAssessmentEngine({
    repository,
    assessmentVersionId: 'version-1',
    responses,
  });

  assert.equal(payload.overviewSummary.headline, 'Custom overview headline from the assessment version.');
  assert.equal(payload.overviewSummary.narrative, 'Custom overview summary from the assessment version.');
  assert.notEqual(payload.overviewSummary.headline, baseline.overviewSummary.headline);
  assert.deepEqual(payload.strengths, baseline.strengths);
  assert.deepEqual(payload.watchouts, baseline.watchouts);
  assert.deepEqual(payload.developmentFocus, baseline.developmentFocus);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
});

test('engine path uses signal-language sections for strengths watchouts and development only when available', async () => {
  const definition = buildDefinition();
  const repository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return {
        signals: {
          support_drive: {
            strength: 'Custom strength for Support Drive.',
            watchout: 'Custom watchout for Support Drive.',
          },
          role_executor: {
            development: 'Custom development for Role Executor.',
          },
        },
        pairs: {},
        domains: {},
        overview: {},
      };
    },
  };

  const baselineRepository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return createEmptyLanguageBundle();
    },
  };

  const responses = buildResponses({
    'question-1': 'option-2',
    'question-2': 'option-3',
  });

  const baseline = await runAssessmentEngine({
    repository: baselineRepository,
    assessmentVersionId: 'version-1',
    responses,
  });

  const payload = await runAssessmentEngine({
    repository,
    assessmentVersionId: 'version-1',
    responses,
  });

  assert.equal(payload.strengths[0]?.detail, 'Custom strength for Support Drive.');
  assert.equal(payload.watchouts[0]?.detail, 'Custom watchout for Support Drive.');
  assert.equal(payload.developmentFocus[0]?.detail, 'Custom development for Role Executor.');
  assert.deepEqual(payload.overviewSummary, baseline.overviewSummary);
  assert.deepEqual(payload.domainSummaries, baseline.domainSummaries);
  assert.equal(payload.strengths.length, baseline.strengths.length);
  assert.equal(payload.watchouts.length, baseline.watchouts.length);
  assert.equal(payload.developmentFocus.length, baseline.developmentFocus.length);
});

test('engine path uses domain-language summary for domain summaries only when available', async () => {
  const definition = buildDefinition();
  const repository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return {
        signals: {},
        pairs: {},
        domains: {
          signals: {
            summary: 'Custom domain summary for the Signals domain.',
          },
        },
        overview: {},
      };
    },
  };

  const baselineRepository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return createEmptyLanguageBundle();
    },
  };

  const responses = buildResponses({
    'question-1': 'option-2',
    'question-2': 'option-3',
  });

  const baseline = await runAssessmentEngine({
    repository: baselineRepository,
    assessmentVersionId: 'version-1',
    responses,
  });

  const payload = await runAssessmentEngine({
    repository,
    assessmentVersionId: 'version-1',
    responses,
  });

  const payloadSignalsDomain = payload.domainSummaries.find((domain) => domain.domainKey === 'signals');
  const baselineSignalsDomain = baseline.domainSummaries.find((domain) => domain.domainKey === 'signals');

  assert.equal(payloadSignalsDomain?.interpretation?.summary, 'Custom domain summary for the Signals domain.');
  assert.equal(
    payloadSignalsDomain?.interpretation?.supportingLine,
    baselineSignalsDomain?.interpretation?.supportingLine,
  );
  assert.equal(
    payloadSignalsDomain?.interpretation?.tensionClause,
    baselineSignalsDomain?.interpretation?.tensionClause,
  );
  assert.deepEqual(payload.overviewSummary, baseline.overviewSummary);
  assert.deepEqual(payload.strengths, baseline.strengths);
  assert.deepEqual(payload.watchouts, baseline.watchouts);
  assert.deepEqual(payload.developmentFocus, baseline.developmentFocus);
  assert.equal(payload.domainSummaries.length, baseline.domainSummaries.length);
});

test('engine language regression matrix preserves the canonical payload contract and section scope', async () => {
  const definition = buildDefinition();
  const responses = buildResponses({
    'question-1': 'option-2',
    'question-2': 'option-3',
  });
  const baseline = await runAssessmentEngine({
    repository: createRepositoryWithLanguageBundle(definition, createEmptyLanguageBundle()),
    assessmentVersionId: 'version-1',
    responses,
  });

  const scenarios = [
    {
      name: 'no language rows at all',
      languageBundle: createEmptyLanguageBundle(),
      expected: {
        headline: baseline.overviewSummary.headline,
        narrative: baseline.overviewSummary.narrative,
        strength: baseline.strengths[0]?.detail,
        watchout: baseline.watchouts[0]?.detail,
        development: baseline.developmentFocus[0]?.detail,
        domainSummary: baseline.domainSummaries.find((domain) => domain.domainKey === 'signals')?.interpretation?.summary,
      },
    },
    {
      name: 'pair language only',
      languageBundle: {
        signals: {},
        pairs: {
          drive_focus: {
            summary: 'Pair-only overview narrative.',
          },
        },
        domains: {},
        overview: {},
      },
      expected: {
        headline: baseline.overviewSummary.headline,
        narrative: baseline.overviewSummary.narrative,
        strength: baseline.strengths[0]?.detail,
        watchout: baseline.watchouts[0]?.detail,
        development: baseline.developmentFocus[0]?.detail,
        domainSummary: baseline.domainSummaries.find((domain) => domain.domainKey === 'signals')?.interpretation?.summary,
      },
    },
    {
      name: 'signal language only',
      languageBundle: {
        signals: {
          support_drive: {
            strength: 'Signal-only strength.',
            watchout: 'Signal-only watchout.',
          },
          role_executor: {
            development: 'Signal-only development.',
          },
        },
        pairs: {},
        domains: {},
        overview: {},
      },
      expected: {
        headline: baseline.overviewSummary.headline,
        narrative: baseline.overviewSummary.narrative,
        strength: 'Signal-only strength.',
        watchout: 'Signal-only watchout.',
        development: 'Signal-only development.',
        domainSummary: baseline.domainSummaries.find((domain) => domain.domainKey === 'signals')?.interpretation?.summary,
      },
    },
    {
      name: 'domain language only',
      languageBundle: {
        signals: {},
        pairs: {},
        domains: {
          signals: {
            summary: 'Domain-only summary.',
          },
        },
        overview: {},
      },
      expected: {
        headline: baseline.overviewSummary.headline,
        narrative: baseline.overviewSummary.narrative,
        strength: baseline.strengths[0]?.detail,
        watchout: baseline.watchouts[0]?.detail,
        development: baseline.developmentFocus[0]?.detail,
        domainSummary: 'Domain-only summary.',
      },
    },
    {
      name: 'overview headline only',
      languageBundle: {
        signals: {},
        pairs: {},
        domains: {},
        overview: {
          drive_focus: {
            headline: 'Overview-headline-only.',
          },
        },
      },
      expected: {
        headline: 'Overview-headline-only.',
        narrative: baseline.overviewSummary.narrative,
        strength: baseline.strengths[0]?.detail,
        watchout: baseline.watchouts[0]?.detail,
        development: baseline.developmentFocus[0]?.detail,
        domainSummary: baseline.domainSummaries.find((domain) => domain.domainKey === 'signals')?.interpretation?.summary,
      },
    },
    {
      name: 'mixed partial language rows',
      languageBundle: {
        signals: {
          support_drive: {
            strength: 'Mixed strength.',
          },
        },
        pairs: {
          drive_focus: {
            summary: 'Mixed narrative.',
          },
        },
        domains: {},
        overview: {
          drive_focus: {
            headline: 'Mixed headline.',
            summary: 'Mixed overview summary.',
          },
        },
      },
      expected: {
        headline: 'Mixed headline.',
        narrative: 'Mixed overview summary.',
        strength: 'Mixed strength.',
        watchout: baseline.watchouts[0]?.detail,
        development: baseline.developmentFocus[0]?.detail,
        domainSummary: baseline.domainSummaries.find((domain) => domain.domainKey === 'signals')?.interpretation?.summary,
      },
    },
    {
      name: 'full language bundle present',
      languageBundle: {
        signals: {
          support_drive: {
            strength: 'Full strength.',
            watchout: 'Full watchout.',
          },
          role_executor: {
            development: 'Full development.',
          },
        },
        pairs: {
          drive_focus: {
            summary: 'Full narrative.',
          },
        },
        domains: {
          signals: {
            summary: 'Full domain summary.',
          },
        },
        overview: {
          drive_focus: {
            headline: 'Full headline.',
            summary: 'Full overview summary.',
          },
        },
      },
      expected: {
        headline: 'Full headline.',
        narrative: 'Full overview summary.',
        strength: 'Full strength.',
        watchout: 'Full watchout.',
        development: 'Full development.',
        domainSummary: 'Full domain summary.',
      },
    },
  ] as const;

  for (const scenario of scenarios) {
    const payload = await runAssessmentEngine({
      repository: createRepositoryWithLanguageBundle(definition, scenario.languageBundle),
      assessmentVersionId: 'version-1',
      responses,
    });

    assert.ok(isCanonicalResultPayload(payload), scenario.name);
    assertCanonicalPayloadShape(payload as unknown as Record<string, unknown>);
    assert.equal(payload.overviewSummary.headline, scenario.expected.headline, `${scenario.name} headline`);
    assert.equal(payload.overviewSummary.narrative, scenario.expected.narrative, `${scenario.name} narrative`);
    assert.equal(payload.strengths[0]?.detail, scenario.expected.strength, `${scenario.name} strength`);
    assert.equal(payload.watchouts[0]?.detail, scenario.expected.watchout, `${scenario.name} watchout`);
    assert.equal(payload.developmentFocus[0]?.detail, scenario.expected.development, `${scenario.name} development`);
    assert.equal(
      payload.domainSummaries.find((domain) => domain.domainKey === 'signals')?.interpretation?.summary,
      scenario.expected.domainSummary,
      `${scenario.name} domain summary`,
    );
    assert.deepEqual(payload.rankedSignals, baseline.rankedSignals, `${scenario.name} ranked signals`);
    assert.deepEqual(payload.normalizedScores, baseline.normalizedScores, `${scenario.name} normalized scores`);
    assert.deepEqual(payload.topSignal, baseline.topSignal, `${scenario.name} top signal`);
    assert.equal(payload.diagnostics.readinessStatus, baseline.diagnostics.readinessStatus, `${scenario.name} readiness`);
    assert.deepEqual(payload.diagnostics.scoring, baseline.diagnostics.scoring, `${scenario.name} scoring diagnostics`);
    assert.deepEqual(
      payload.diagnostics.normalization,
      baseline.diagnostics.normalization,
      `${scenario.name} normalization diagnostics`,
    );
    assert.notEqual(payload.overviewSummary.headline.trim(), '', `${scenario.name} non-empty headline`);
    assert.notEqual(payload.overviewSummary.narrative.trim(), '', `${scenario.name} non-empty narrative`);
  }
});

test('empty language bundle is handled safely and result generation still succeeds', async () => {
  const definition = buildDefinition();
  const repository: AssessmentDefinitionRepository = {
    async getPublishedAssessmentDefinitionByKey() {
      return definition;
    },
    async getAssessmentDefinitionByVersion() {
      return definition;
    },
    async getAssessmentVersionLanguageBundle() {
      return createEmptyLanguageBundle();
    },
  };

  const payload = await runAssessmentEngine({
    repository,
    assessmentVersionId: 'version-1',
    responses: buildResponses({}),
  });

  assert.ok(isCanonicalResultPayload(payload));
  assert.equal(payload.diagnostics.zeroMass, true);
  assert.equal(payload.topSignal?.signalId, 'signal-core');
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
