import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDomainInterpretation,
  resolveSignalIntensityBand,
} from '@/lib/engine/domain-interpretation';
import type { EngineLanguageBundle, NormalizedDomainSummary, NormalizedSignalScore } from '@/lib/engine/types';

function buildSignal(params: {
  signalId: string;
  signalKey: string;
  title: string;
  domainId: string;
  domainKey: string;
  domainPercentage: number;
  rank: number;
  percentage?: number;
}): NormalizedSignalScore {
  return {
    signalId: params.signalId,
    signalKey: params.signalKey,
    signalTitle: params.title,
    domainId: params.domainId,
    domainKey: params.domainKey,
    domainSource: 'signal_group',
    isOverlay: false,
    overlayType: 'none',
    rawTotal: params.domainPercentage,
    normalizedValue: params.percentage ?? params.domainPercentage,
    percentage: params.percentage ?? params.domainPercentage,
    domainPercentage: params.domainPercentage,
    rank: params.rank,
  };
}

function buildDomainSummary(params: {
  domainId: string;
  domainKey: string;
  title: string;
  signalScores: readonly NormalizedSignalScore[];
}): NormalizedDomainSummary {
  return {
    domainId: params.domainId,
    domainKey: params.domainKey,
    domainTitle: params.title,
    domainSource: 'signal_group',
    rawTotal: params.signalScores.reduce((sum, signal) => sum + signal.rawTotal, 0),
    normalizedValue: 100,
    percentage: 100,
    signalScores: params.signalScores,
    signalCount: params.signalScores.length,
    answeredQuestionCount: 8,
    rankedSignalIds: Object.freeze(params.signalScores.map((signal) => signal.signalId)),
  };
}

function createEmptyLanguageBundle(): EngineLanguageBundle {
  return {
    signals: {},
    pairs: {},
    domains: {},
    overview: {},
  };
}

test('intensity resolver assigns deterministic bands', () => {
  assert.equal(resolveSignalIntensityBand(46), 'dominant');
  assert.equal(resolveSignalIntensityBand(38), 'strong');
  assert.equal(resolveSignalIntensityBand(24), 'moderate');
  assert.equal(resolveSignalIntensityBand(15), 'secondary');
  assert.equal(resolveSignalIntensityBand(6), 'low');
});

test('pairwise style rule selects richer Driver plus Analyst summary', () => {
  const interpretation = buildDomainInterpretation(
    buildDomainSummary({
      domainId: 'domain-style',
      domainKey: 'signal_style',
      title: 'Behaviour Style',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          domainPercentage: 39,
          rank: 1,
        }),
        buildSignal({
          signalId: 'signal-analyst',
          signalKey: 'style_analyst',
          title: 'Analyst',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          domainPercentage: 24,
          rank: 2,
        }),
      ]),
    }),
  );

  assert.ok(interpretation);
  assert.equal(interpretation?.primaryPercent, 39);
  assert.equal(interpretation?.secondaryPercent, 24);
  assert.match(interpretation?.summary ?? '', /moves quickly toward outcomes/i);
  assert.match(interpretation?.summary ?? '', /logic and structure/i);
  assert.match(interpretation?.tensionClause ?? '', /urgency cuts short reflection|precision slows decisions/i);
  assert.equal(interpretation?.diagnostics?.strategy, 'pairwise_rule');
  assert.equal(interpretation?.diagnostics?.ruleKey, 'style_driver_analyst');
});

test('primary and secondary signals follow domain percentage order even when input arrays are unsorted', () => {
  const interpretation = buildDomainInterpretation(
    buildDomainSummary({
      domainId: 'domain-lead',
      domainKey: 'signal_lead',
      title: 'Leadership',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-results',
          signalKey: 'lead_results',
          title: 'Results',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          domainPercentage: 25,
          percentage: 25,
          rank: 2,
        }),
        buildSignal({
          signalId: 'signal-vision',
          signalKey: 'lead_vision',
          title: 'Vision',
          domainId: 'domain-lead',
          domainKey: 'signal_lead',
          domainPercentage: 29,
          percentage: 29,
          rank: 1,
        }),
      ]),
    }),
  );

  assert.ok(interpretation);
  assert.equal(interpretation?.primarySignalKey, 'lead_vision');
  assert.equal(interpretation?.primaryPercent, 29);
  assert.equal(interpretation?.secondarySignalKey, 'lead_results');
  assert.equal(interpretation?.secondaryPercent, 25);
  assert.ok((interpretation?.primaryPercent ?? 0) >= (interpretation?.secondaryPercent ?? 0));
});

test('domain tie handling stays deterministic for primary and secondary signals', () => {
  const interpretation = buildDomainInterpretation(
    buildDomainSummary({
      domainId: 'domain-style',
      domainKey: 'signal_style',
      title: 'Behaviour Style',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-operator',
          signalKey: 'style_operator',
          title: 'Operator',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          domainPercentage: 30,
          percentage: 30,
          rank: 2,
        }),
        buildSignal({
          signalId: 'signal-driver',
          signalKey: 'style_driver',
          title: 'Driver',
          domainId: 'domain-style',
          domainKey: 'signal_style',
          domainPercentage: 30,
          percentage: 30,
          rank: 1,
        }),
      ]),
    }),
  );

  assert.ok(interpretation);
  assert.equal(interpretation?.primarySignalKey, 'style_driver');
  assert.equal(interpretation?.secondarySignalKey, 'style_operator');
  assert.equal(interpretation?.primaryPercent, 30);
  assert.equal(interpretation?.secondaryPercent, 30);
});

test('generic non-core domain uses fallback assembly rather than empty output', () => {
  const interpretation = buildDomainInterpretation(
    buildDomainSummary({
      domainId: 'domain-decision',
      domainKey: 'signal_decision',
      title: 'Decision',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-evidence',
          signalKey: 'decision_evidence',
          title: 'Evidence',
          domainId: 'domain-decision',
          domainKey: 'signal_decision',
          domainPercentage: 58,
          rank: 1,
        }),
      ]),
    }),
  );

  assert.ok(interpretation);
  assert.equal(interpretation?.diagnostics?.strategy, 'single_signal_fallback');
  assert.match(interpretation?.summary ?? '', /Evidence/i);
});

test('conflict pairwise rules now read as one coherent behavioural pattern', () => {
  const interpretation = buildDomainInterpretation(
    buildDomainSummary({
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      title: 'Conflict',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-collaborate',
          signalKey: 'conflict_collaborate',
          title: 'Collaborate',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          domainPercentage: 35,
          rank: 1,
        }),
        buildSignal({
          signalId: 'signal-accommodate',
          signalKey: 'conflict_accommodate',
          title: 'Accommodate',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          domainPercentage: 28,
          rank: 2,
        }),
      ]),
    }),
  );

  assert.ok(interpretation);
  assert.equal(interpretation?.diagnostics?.ruleKey, 'conflict_collaborate_accommodate');
  assert.match(interpretation?.summary ?? '', /relationship intact|tone constructive|workable/i);
  assert.match(interpretation?.supportingLine ?? '', /trust|future cooperation|issue matters/i);
  assert.match(interpretation?.tensionClause ?? '', /challenge too soft|firmer challenge/i);
});

test('stress pairwise rules now show sequence and trade-off more credibly', () => {
  const interpretation = buildDomainInterpretation(
    buildDomainSummary({
      domainId: 'domain-stress',
      domainKey: 'signal_stress',
      title: 'Stress',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-control',
          signalKey: 'stress_control',
          title: 'Control',
          domainId: 'domain-stress',
          domainKey: 'signal_stress',
          domainPercentage: 36,
          rank: 1,
        }),
        buildSignal({
          signalId: 'signal-criticality',
          signalKey: 'stress_criticality',
          title: 'Criticality',
          domainId: 'domain-stress',
          domainKey: 'signal_stress',
          domainPercentage: 28,
          rank: 2,
        }),
      ]),
    }),
  );

  assert.ok(interpretation);
  assert.equal(interpretation?.diagnostics?.ruleKey, 'stress_control_criticality');
  assert.match(interpretation?.summary ?? '', /control, accuracy, and firmer judgement|exacting/i);
  assert.match(interpretation?.supportingLine ?? '', /standards need tightening|ambiguity/i);
  assert.match(interpretation?.tensionClause ?? '', /perspective narrows|contribute less freely/i);
});

test('conflict fallback remains natural and deterministic for unmapped combinations', () => {
  const interpretation = buildDomainInterpretation(
    buildDomainSummary({
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      title: 'Conflict',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-compete',
          signalKey: 'conflict_compete',
          title: 'Compete',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          domainPercentage: 31,
          rank: 1,
        }),
        buildSignal({
          signalId: 'signal-collaborate',
          signalKey: 'conflict_collaborate',
          title: 'Collaborate',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          domainPercentage: 31,
          rank: 2,
        }),
        buildSignal({
          signalId: 'signal-accommodate',
          signalKey: 'conflict_accommodate',
          title: 'Accommodate',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          domainPercentage: 30,
          rank: 3,
        }),
      ]),
    }),
  );

  assert.ok(interpretation);
  assert.match(interpretation?.summary ?? '', /address tension directly|shared answer|usable/i);
  assert.doesNotMatch(interpretation?.summary ?? '', /undefined|null/i);
  assert.doesNotMatch(interpretation?.summary ?? '', /\s{2,}/);
});

test('representative fixtures produce stable, differentiated domain copy', () => {
  const fixtures = [
    buildDomainSummary({
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      title: 'Conflict',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-accommodate',
          signalKey: 'conflict_accommodate',
          title: 'Accommodate',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          domainPercentage: 34,
          rank: 1,
        }),
        buildSignal({
          signalId: 'signal-compromise',
          signalKey: 'conflict_compromise',
          title: 'Compromise',
          domainId: 'domain-conflict',
          domainKey: 'signal_conflict',
          domainPercentage: 29,
          rank: 2,
        }),
      ]),
    }),
    buildDomainSummary({
      domainId: 'domain-culture',
      domainKey: 'signal_culture',
      title: 'Culture',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-market',
          signalKey: 'culture_market',
          title: 'Market',
          domainId: 'domain-culture',
          domainKey: 'signal_culture',
          domainPercentage: 41,
          rank: 1,
        }),
        buildSignal({
          signalId: 'signal-hierarchy',
          signalKey: 'culture_hierarchy',
          title: 'Hierarchy',
          domainId: 'domain-culture',
          domainKey: 'signal_culture',
          domainPercentage: 27,
          rank: 2,
        }),
      ]),
    }),
    buildDomainSummary({
      domainId: 'domain-stress',
      domainKey: 'signal_stress',
      title: 'Stress',
      signalScores: Object.freeze([
        buildSignal({
          signalId: 'signal-scatter',
          signalKey: 'stress_scatter',
          title: 'Scatter',
          domainId: 'domain-stress',
          domainKey: 'signal_stress',
          domainPercentage: 33,
          rank: 1,
        }),
        buildSignal({
          signalId: 'signal-criticality',
          signalKey: 'stress_criticality',
          title: 'Criticality',
          domainId: 'domain-stress',
          domainKey: 'signal_stress',
          domainPercentage: 31,
          rank: 2,
        }),
      ]),
    }),
  ];

  const outputs = fixtures.map((fixture) => buildDomainInterpretation(fixture));

  assert.equal(new Set(outputs.map((output) => output?.summary)).size, outputs.length);
  for (const output of outputs) {
    assert.ok(output?.summary);
    assert.ok(output?.tensionClause);
    assert.doesNotMatch(output?.summary ?? '', /\s{2,}/);
    assert.doesNotMatch(output?.tensionClause ?? '', /\s{2,}/);
    assert.doesNotMatch(output?.summary ?? '', /undefined|null/i);
    assert.doesNotMatch(output?.summary ?? '', /[.?!]{2,}/);
    assert.doesNotMatch(output?.tensionClause ?? '', /undefined|null/i);
  }

  assert.match(outputs[0]?.summary ?? '', /relationship|workable|friction/i);
  assert.match(outputs[1]?.summary ?? '', /environment|performance|structure/i);
  assert.match(outputs[2]?.summary ?? '', /pressure|focus|strain/i);
  assert.match(outputs[1]?.tensionClause ?? '', /process|pressure|standards/i);
  assert.match(outputs[2]?.tensionClause ?? '', /scrutiny rises|concentration falls|prioritise calmly/i);
});

test('domain language summary overrides fallback domain summary text when present', () => {
  const domainSummary = buildDomainSummary({
    domainId: 'domain-style',
    domainKey: 'signal_style',
    title: 'Behaviour Style',
    signalScores: Object.freeze([
      buildSignal({
        signalId: 'signal-driver',
        signalKey: 'style_driver',
        title: 'Driver',
        domainId: 'domain-style',
        domainKey: 'signal_style',
        domainPercentage: 39,
        rank: 1,
      }),
      buildSignal({
        signalId: 'signal-analyst',
        signalKey: 'style_analyst',
        title: 'Analyst',
        domainId: 'domain-style',
        domainKey: 'signal_style',
        domainPercentage: 24,
        rank: 2,
      }),
    ]),
  });

  const baseline = buildDomainInterpretation(domainSummary, {
    assessmentVersionId: 'version-1',
    languageBundle: createEmptyLanguageBundle(),
  });

  const interpretation = buildDomainInterpretation(domainSummary, {
    assessmentVersionId: 'version-1',
    languageBundle: {
      signals: {},
      pairs: {},
      domains: {
        signal_style: {
          chapterOpening: 'Assessment-owned domain summary for behaviour style.',
        },
      },
      overview: {},
    },
  });

  assert.ok(interpretation);
  assert.equal(interpretation?.summary, 'Assessment-owned domain summary for behaviour style.');
  assert.equal(interpretation?.supportingLine, baseline?.supportingLine);
  assert.equal(interpretation?.tensionClause, baseline?.tensionClause);
  assert.deepEqual(interpretation?.diagnostics, baseline?.diagnostics);
});

test('domain summary falls back unchanged when domain language summary is missing', () => {
  const domainSummary = buildDomainSummary({
    domainId: 'domain-style',
    domainKey: 'signal_style',
    title: 'Behaviour Style',
    signalScores: Object.freeze([
      buildSignal({
        signalId: 'signal-driver',
        signalKey: 'style_driver',
        title: 'Driver',
        domainId: 'domain-style',
        domainKey: 'signal_style',
        domainPercentage: 39,
        rank: 1,
      }),
      buildSignal({
        signalId: 'signal-analyst',
        signalKey: 'style_analyst',
        title: 'Analyst',
        domainId: 'domain-style',
        domainKey: 'signal_style',
        domainPercentage: 24,
        rank: 2,
      }),
    ]),
  });

  const baseline = buildDomainInterpretation(domainSummary, {
    assessmentVersionId: 'version-1',
    languageBundle: createEmptyLanguageBundle(),
  });

  const interpretation = buildDomainInterpretation(domainSummary, {
    assessmentVersionId: 'version-1',
    languageBundle: {
      signals: {},
      pairs: {},
      domains: {
        signal_style: {
          pressure: 'Present but out of scope.',
        },
      },
      overview: {},
    },
  });

  assert.deepEqual(interpretation, baseline);
});
