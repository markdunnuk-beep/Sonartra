import { buildDomainInterpretation } from '@/lib/engine/domain-interpretation';
import type { NormalizedDomainSummary, NormalizedSignalScore } from '@/lib/engine/types';

function buildSignal(params: {
  signalId: string;
  signalKey: string;
  title: string;
  domainId: string;
  domainKey: string;
  domainPercentage: number;
  rank: number;
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
    normalizedValue: params.domainPercentage,
    percentage: params.domainPercentage,
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

const samples = [
  {
    label: 'Behaviour Style / Driver + Analyst',
    domain: buildDomainSummary({
      domainId: 'domain-style',
      domainKey: 'signal_style',
      title: 'Behaviour Style',
      signalScores: Object.freeze([
        buildSignal({ signalId: 'style-driver', signalKey: 'style_driver', title: 'Driver', domainId: 'domain-style', domainKey: 'signal_style', domainPercentage: 39, rank: 1 }),
        buildSignal({ signalId: 'style-analyst', signalKey: 'style_analyst', title: 'Analyst', domainId: 'domain-style', domainKey: 'signal_style', domainPercentage: 24, rank: 2 }),
      ]),
    }),
  },
  {
    label: 'Motivators / Achievement + Stability',
    domain: buildDomainSummary({
      domainId: 'domain-mot',
      domainKey: 'signal_mot',
      title: 'Motivators',
      signalScores: Object.freeze([
        buildSignal({ signalId: 'mot-achievement', signalKey: 'mot_achievement', title: 'Achievement', domainId: 'domain-mot', domainKey: 'signal_mot', domainPercentage: 36, rank: 1 }),
        buildSignal({ signalId: 'mot-stability', signalKey: 'mot_stability', title: 'Stability', domainId: 'domain-mot', domainKey: 'signal_mot', domainPercentage: 29, rank: 2 }),
      ]),
    }),
  },
  {
    label: 'Conflict / Accommodate + Compromise',
    domain: buildDomainSummary({
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      title: 'Conflict',
      signalScores: Object.freeze([
        buildSignal({ signalId: 'conflict-accommodate', signalKey: 'conflict_accommodate', title: 'Accommodate', domainId: 'domain-conflict', domainKey: 'signal_conflict', domainPercentage: 34, rank: 1 }),
        buildSignal({ signalId: 'conflict-compromise', signalKey: 'conflict_compromise', title: 'Compromise', domainId: 'domain-conflict', domainKey: 'signal_conflict', domainPercentage: 29, rank: 2 }),
      ]),
    }),
  },
  {
    label: 'Conflict / Compete + Accommodate',
    domain: buildDomainSummary({
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      title: 'Conflict',
      signalScores: Object.freeze([
        buildSignal({ signalId: 'conflict-compete', signalKey: 'conflict_compete', title: 'Compete', domainId: 'domain-conflict', domainKey: 'signal_conflict', domainPercentage: 37, rank: 1 }),
        buildSignal({ signalId: 'conflict-accommodate', signalKey: 'conflict_accommodate', title: 'Accommodate', domainId: 'domain-conflict', domainKey: 'signal_conflict', domainPercentage: 26, rank: 2 }),
      ]),
    }),
  },
  {
    label: 'Conflict / Collaborate + Avoid',
    domain: buildDomainSummary({
      domainId: 'domain-conflict',
      domainKey: 'signal_conflict',
      title: 'Conflict',
      signalScores: Object.freeze([
        buildSignal({ signalId: 'conflict-collaborate', signalKey: 'conflict_collaborate', title: 'Collaborate', domainId: 'domain-conflict', domainKey: 'signal_conflict', domainPercentage: 33, rank: 1 }),
        buildSignal({ signalId: 'conflict-avoid', signalKey: 'conflict_avoid', title: 'Avoid', domainId: 'domain-conflict', domainKey: 'signal_conflict', domainPercentage: 29, rank: 2 }),
      ]),
    }),
  },
  {
    label: 'Culture / Market + Hierarchy',
    domain: buildDomainSummary({
      domainId: 'domain-culture',
      domainKey: 'signal_culture',
      title: 'Culture',
      signalScores: Object.freeze([
        buildSignal({ signalId: 'culture-market', signalKey: 'culture_market', title: 'Market', domainId: 'domain-culture', domainKey: 'signal_culture', domainPercentage: 41, rank: 1 }),
        buildSignal({ signalId: 'culture-hierarchy', signalKey: 'culture_hierarchy', title: 'Hierarchy', domainId: 'domain-culture', domainKey: 'signal_culture', domainPercentage: 27, rank: 2 }),
      ]),
    }),
  },
  {
    label: 'Stress / Scatter + Criticality',
    domain: buildDomainSummary({
      domainId: 'domain-stress',
      domainKey: 'signal_stress',
      title: 'Stress',
      signalScores: Object.freeze([
        buildSignal({ signalId: 'stress-scatter', signalKey: 'stress_scatter', title: 'Scatter', domainId: 'domain-stress', domainKey: 'signal_stress', domainPercentage: 33, rank: 1 }),
        buildSignal({ signalId: 'stress-criticality', signalKey: 'stress_criticality', title: 'Criticality', domainId: 'domain-stress', domainKey: 'signal_stress', domainPercentage: 31, rank: 2 }),
      ]),
    }),
  },
  {
    label: 'Stress / Control + Avoidance',
    domain: buildDomainSummary({
      domainId: 'domain-stress',
      domainKey: 'signal_stress',
      title: 'Stress',
      signalScores: Object.freeze([
        buildSignal({ signalId: 'stress-control', signalKey: 'stress_control', title: 'Control', domainId: 'domain-stress', domainKey: 'signal_stress', domainPercentage: 35, rank: 1 }),
        buildSignal({ signalId: 'stress-avoidance', signalKey: 'stress_avoidance', title: 'Avoidance', domainId: 'domain-stress', domainKey: 'signal_stress', domainPercentage: 29, rank: 2 }),
      ]),
    }),
  },
  {
    label: 'Stress / Criticality + Avoidance',
    domain: buildDomainSummary({
      domainId: 'domain-stress',
      domainKey: 'signal_stress',
      title: 'Stress',
      signalScores: Object.freeze([
        buildSignal({ signalId: 'stress-criticality', signalKey: 'stress_criticality', title: 'Criticality', domainId: 'domain-stress', domainKey: 'signal_stress', domainPercentage: 34, rank: 1 }),
        buildSignal({ signalId: 'stress-avoidance', signalKey: 'stress_avoidance', title: 'Avoidance', domainId: 'domain-stress', domainKey: 'signal_stress', domainPercentage: 27, rank: 2 }),
      ]),
    }),
  },
];

for (const sample of samples) {
  const interpretation = buildDomainInterpretation(sample.domain);
  console.log(`\n${sample.label}`);
  console.log(`Primary: ${interpretation?.primarySignalKey ?? 'n/a'} ${interpretation?.primaryPercent ?? 0}%`);
  console.log(`Secondary: ${interpretation?.secondarySignalKey ?? 'n/a'} ${interpretation?.secondaryPercent ?? 0}%`);
  console.log(`Summary: ${interpretation?.summary ?? 'n/a'}`);
  if (interpretation?.supportingLine) {
    console.log(`Support: ${interpretation.supportingLine}`);
  }
  if (interpretation?.tensionClause) {
    console.log(`Tension: ${interpretation.tensionClause}`);
  }
  if (interpretation?.diagnostics) {
    console.log(`Diagnostics: ${JSON.stringify(interpretation.diagnostics)}`);
  }
}
