import test from 'node:test';
import assert from 'node:assert/strict';

import { buildApplicationSection } from '@/lib/engine/application-builder';
import type {
  NormalizedSignalScore,
  ResultDomainChapter,
  ResultHeroSummary,
} from '@/lib/engine/types';
import type { AssessmentVersionApplicationLanguageBundle } from '@/lib/server/assessment-version-application-language-types';

function buildSignal(params: {
  signalId: string;
  signalKey: string;
  signalTitle: string;
  rank: number;
  percentage: number;
  rawTotal: number;
}): NormalizedSignalScore {
  return {
    signalId: params.signalId,
    signalKey: params.signalKey,
    signalTitle: params.signalTitle,
    domainId: 'domain-1',
    domainKey: 'signal_style',
    domainSource: 'signal_group',
    isOverlay: false,
    overlayType: 'none',
    rawTotal: params.rawTotal,
    normalizedValue: params.percentage,
    percentage: params.percentage,
    domainPercentage: params.percentage,
    rank: params.rank,
  };
}

function buildHero(patternKey = 'pattern_alpha'): ResultHeroSummary {
  return {
    headline: null,
    subheadline: null,
    summary: null,
    narrative: null,
    pressureOverlay: null,
    environmentOverlay: null,
    primaryPattern: null,
    heroPattern: {
      patternKey,
      label: 'Pattern Alpha',
      priority: 1,
      isFallback: false,
    },
    domainPairWinners: [
      {
        profileDomainKey: 'operatingStyle',
        pairKey: 'driver_analyst',
        sourceDomainKey: 'signal_style',
        sourceDomainLabel: 'Style',
        primarySignalKey: 'style_driver',
        primarySignalLabel: 'Driver',
        secondarySignalKey: 'style_analyst',
        secondarySignalLabel: 'Analyst',
      },
      {
        profileDomainKey: 'coreDrivers',
        pairKey: 'vision_operator',
        sourceDomainKey: 'signal_motivation',
        sourceDomainLabel: 'Motivation',
        primarySignalKey: 'mot_vision',
        primarySignalLabel: 'Vision',
        secondarySignalKey: 'mot_operator',
        secondarySignalLabel: 'Operator',
      },
      {
        profileDomainKey: 'leadershipApproach',
        pairKey: 'coach_architect',
        sourceDomainKey: 'signal_lead',
        sourceDomainLabel: 'Leadership',
        primarySignalKey: 'lead_coach',
        primarySignalLabel: 'Coach',
        secondarySignalKey: 'lead_architect',
        secondarySignalLabel: 'Architect',
      },
    ],
    traitTotals: [],
    matchedPatterns: [],
    domainHighlights: [],
  };
}

function buildDomains(): readonly ResultDomainChapter[] {
  return [
    {
      domainKey: 'signal_style',
      domainLabel: 'Style',
      chapterOpening: null,
      signalBalance: { items: [] },
      primarySignal: null,
      secondarySignal: null,
      signalPair: {
        pairKey: 'driver_analyst',
        primarySignalKey: 'style_driver',
        primarySignalLabel: 'Driver',
        secondarySignalKey: 'style_analyst',
        secondarySignalLabel: 'Analyst',
        summary: null,
      },
      pressureFocus: null,
      environmentFocus: null,
    },
    {
      domainKey: 'signal_motivation',
      domainLabel: 'Motivation',
      chapterOpening: null,
      signalBalance: { items: [] },
      primarySignal: null,
      secondarySignal: null,
      signalPair: {
        pairKey: 'vision_operator',
        primarySignalKey: 'mot_vision',
        primarySignalLabel: 'Vision',
        secondarySignalKey: 'mot_operator',
        secondarySignalLabel: 'Operator',
        summary: null,
      },
      pressureFocus: null,
      environmentFocus: null,
    },
    {
      domainKey: 'signal_lead',
      domainLabel: 'Leadership',
      chapterOpening: null,
      signalBalance: { items: [] },
      primarySignal: null,
      secondarySignal: null,
      signalPair: {
        pairKey: 'coach_architect',
        primarySignalKey: 'lead_coach',
        primarySignalLabel: 'Coach',
        secondarySignalKey: 'lead_architect',
        secondarySignalLabel: 'Architect',
        summary: null,
      },
      pressureFocus: null,
      environmentFocus: null,
    },
  ];
}

function buildLanguage(): AssessmentVersionApplicationLanguageBundle {
  return {
    thesis: [
      {
        id: 'thesis-1',
        assessmentVersionId: 'version-1',
        heroPatternKey: 'pattern_alpha',
        headline: 'Pattern thesis headline',
        summary: 'Pattern thesis summary',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
    ],
    contribution: [
      {
        id: 'contribution-1',
        assessmentVersionId: 'version-1',
        sourceType: 'pair',
        sourceKey: 'driver_analyst',
        priority: 1,
        label: 'Structured pace',
        narrative: 'Creates traction through structured pace.',
        bestWhen: 'Goals are clear and sequencing matters.',
        watchFor: 'Can over-tighten the plan.',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'contribution-2',
        assessmentVersionId: 'version-1',
        sourceType: 'pair',
        sourceKey: 'vision_operator',
        priority: 2,
        label: 'Idea to execution',
        narrative: 'Links ambition to delivery.',
        bestWhen: 'Direction needs both lift and follow-through.',
        watchFor: null,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'contribution-3',
        assessmentVersionId: 'version-1',
        sourceType: 'pair',
        sourceKey: 'coach_architect',
        priority: 3,
        label: 'Calm design',
        narrative: 'Builds thoughtful, people-aware structure.',
        bestWhen: 'Teams need steadier operating norms.',
        watchFor: null,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
    ],
    risk: [
      {
        id: 'risk-1',
        assessmentVersionId: 'version-1',
        sourceType: 'pair',
        sourceKey: 'driver_analyst',
        priority: 1,
        label: 'Over-control',
        narrative: 'Can narrow too early around the plan.',
        impact: 'Other options get filtered out too soon.',
        earlyWarning: 'Discussion becomes one-track.',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'risk-2',
        assessmentVersionId: 'version-1',
        sourceType: 'pair',
        sourceKey: 'vision_operator',
        priority: 2,
        label: 'Stacking commitments',
        narrative: 'Can keep adding scope to the agenda.',
        impact: 'Execution gets diluted.',
        earlyWarning: null,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'risk-3',
        assessmentVersionId: 'version-1',
        sourceType: 'pair',
        sourceKey: 'coach_architect',
        priority: 3,
        label: 'Slow escalation',
        narrative: 'Can hold back feedback too long.',
        impact: 'Issues become harder to correct.',
        earlyWarning: null,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
    ],
    development: [
      {
        id: 'development-1',
        assessmentVersionId: 'version-1',
        sourceType: 'signal',
        sourceKey: 'signal_c',
        priority: 1,
        label: 'Build challenge',
        narrative: 'Practice speaking the harder point earlier.',
        practice: 'Name the tension in the first ten minutes.',
        successMarker: 'Others know what needs to change.',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'development-2',
        assessmentVersionId: 'version-1',
        sourceType: 'signal',
        sourceKey: 'signal_d',
        priority: 2,
        label: 'Sharpen evidence',
        narrative: 'Support instinct with clearer proof points.',
        practice: 'Bring two pieces of evidence to the decision.',
        successMarker: null,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'development-3',
        assessmentVersionId: 'version-1',
        sourceType: 'signal',
        sourceKey: 'signal_e',
        priority: 3,
        label: 'Finish stronger',
        narrative: 'Close loops more explicitly.',
        practice: 'End each week by naming the open commitments.',
        successMarker: null,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
    ],
    prompts: [
      {
        id: 'prompt-1',
        assessmentVersionId: 'version-1',
        sourceType: 'hero_pattern',
        sourceKey: 'pattern_alpha',
        keepDoing: 'Keep making the next step concrete.',
        watchFor: 'Watch for locking too soon.',
        practiceNext: 'Practice widening the option set before closing.',
        askOthers: 'Ask where your pace is helping or narrowing the work.',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
    ],
  };
}

test('builds thesis from hero pattern', () => {
  const application = buildApplicationSection({
    hero: buildHero(),
    domains: buildDomains(),
    signals: [],
    language: buildLanguage(),
  });

  assert.equal(application.thesis.headline, 'Pattern thesis headline');
  assert.equal(application.thesis.summary, 'Pattern thesis summary');
  assert.equal(application.thesis.sourceKeys.heroPatternKey, 'pattern_alpha');
});

test('selects top 3 pairs for contribution', () => {
  const application = buildApplicationSection({
    hero: buildHero(),
    domains: buildDomains(),
    signals: [],
    language: buildLanguage(),
  });

  assert.deepEqual(
    application.signatureContribution.items.map((item) => item.sourceKey),
    ['driver_analyst', 'vision_operator', 'coach_architect'],
  );
});

test('selects weakest signals for development', () => {
  const application = buildApplicationSection({
    hero: buildHero(),
    domains: buildDomains(),
    signals: [
      buildSignal({ signalId: 'a', signalKey: 'signal_a', signalTitle: 'A', rank: 1, percentage: 40, rawTotal: 4 }),
      buildSignal({ signalId: 'b', signalKey: 'signal_b', signalTitle: 'B', rank: 2, percentage: 25, rawTotal: 3 }),
      buildSignal({ signalId: 'c', signalKey: 'signal_c', signalTitle: 'C', rank: 3, percentage: 15, rawTotal: 2 }),
      buildSignal({ signalId: 'd', signalKey: 'signal_d', signalTitle: 'D', rank: 4, percentage: 12, rawTotal: 1 }),
      buildSignal({ signalId: 'e', signalKey: 'signal_e', signalTitle: 'E', rank: 5, percentage: 8, rawTotal: 1 }),
    ],
    language: buildLanguage(),
  });

  assert.deepEqual(
    application.rangeBuilder.items.map((item) => item.sourceKey),
    ['signal_c', 'signal_d', 'signal_e'],
  );
});

test('resolves action prompts correctly', () => {
  const application = buildApplicationSection({
    hero: buildHero(),
    domains: buildDomains(),
    signals: [],
    language: buildLanguage(),
  });

  assert.deepEqual(application.actionPlan30, {
    keepDoing: 'Keep making the next step concrete.',
    watchFor: 'Watch for locking too soon.',
    practiceNext: 'Practice widening the option set before closing.',
    askOthers: 'Ask where your pace is helping or narrowing the work.',
  });
});

test('returns empty-safe values if rows are missing', () => {
  const application = buildApplicationSection({
    hero: buildHero('pattern_missing'),
    domains: [],
    signals: [],
    language: {
      thesis: [],
      contribution: [],
      risk: [],
      development: [],
      prompts: [],
    },
  });

  assert.deepEqual(application, {
    thesis: {
      headline: '',
      summary: '',
      sourceKeys: {
        heroPatternKey: 'pattern_missing',
      },
    },
    signatureContribution: {
      title: 'Where you create the most value',
      summary: '',
      items: [],
    },
    patternRisks: {
      title: 'Where this pattern can work against you',
      summary: '',
      items: [],
    },
    rangeBuilder: {
      title: 'Where to build more range',
      summary: '',
      items: [],
    },
    actionPlan30: {
      keepDoing: '',
      watchFor: '',
      practiceNext: '',
      askOthers: '',
    },
  });
});

test('deterministic output is stable for the same input', () => {
  const input = {
    hero: buildHero(),
    domains: buildDomains(),
    signals: [
      buildSignal({ signalId: 'a', signalKey: 'signal_a', signalTitle: 'A', rank: 1, percentage: 40, rawTotal: 4 }),
      buildSignal({ signalId: 'b', signalKey: 'signal_b', signalTitle: 'B', rank: 2, percentage: 25, rawTotal: 3 }),
      buildSignal({ signalId: 'c', signalKey: 'signal_c', signalTitle: 'C', rank: 3, percentage: 15, rawTotal: 2 }),
      buildSignal({ signalId: 'd', signalKey: 'signal_d', signalTitle: 'D', rank: 4, percentage: 12, rawTotal: 1 }),
      buildSignal({ signalId: 'e', signalKey: 'signal_e', signalTitle: 'E', rank: 5, percentage: 8, rawTotal: 1 }),
    ] as const,
    language: buildLanguage(),
  };

  const first = buildApplicationSection(input);
  const second = buildApplicationSection(input);

  assert.equal(JSON.stringify(first), JSON.stringify(second));
});
