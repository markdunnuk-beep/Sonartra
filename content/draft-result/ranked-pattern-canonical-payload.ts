export function buildRankedPatternResultPayload(params?: {
  attemptId?: string;
  generatedAt?: string;
  scoreShape?: 'concentrated' | 'paired' | 'graduated' | 'balanced';
  patternKey?: string;
}): Record<string, unknown> {
  const attemptId = params?.attemptId ?? 'attempt-ranked-1';
  const generatedAt = params?.generatedAt ?? '2026-05-07T10:00:00.000Z';
  const scoreShape = params?.scoreShape ?? 'concentrated';
  const patternKey = params?.patternKey ?? 'alpha_beta_gamma_delta';
  const rankedSignals = [
    { signalKey: 'alpha', signalLabel: 'Alpha', rank: 1, rawScore: 55, normalizedPercentage: 55 },
    { signalKey: 'beta', signalLabel: 'Beta', rank: 2, rawScore: 25, normalizedPercentage: 25 },
    { signalKey: 'gamma', signalLabel: 'Gamma', rank: 3, rawScore: 12, normalizedPercentage: 12 },
    { signalKey: 'delta', signalLabel: 'Delta', rank: 4, rawScore: 8, normalizedPercentage: 8 },
  ] as const;

  return {
    metadata: {
      payloadVersion: 'ranked_pattern_v1',
      contract: 'single_domain_ranked_pattern',
      assessmentVersionId: 'version-ranked-1',
      assessmentKey: 'decision_style',
      assessmentTitle: 'Decision Style',
      version: '1.0.0',
      attemptId,
      mode: 'single_domain',
      resultModelKey: 'ranked_pattern',
      domainKey: 'decision_style',
      generatedAt,
      completedAt: generatedAt,
    },
    assessment: {
      assessmentKey: 'decision_style',
      title: 'Decision Style',
      version: '1.0.0',
    },
    attempt: {
      attemptId,
      completedAt: generatedAt,
    },
    domain: {
      domainKey: 'decision_style',
      label: 'Decision Style',
    },
    topSignal: rankedSignals[0],
    rankedSignals,
    normalizedScores: rankedSignals.map((signal) => ({
      signalKey: signal.signalKey,
      rawScore: signal.rawScore,
      normalizedPercentage: signal.normalizedPercentage,
    })),
    scoreShape: {
      value: scoreShape,
      policyKey: 'fixed_gap_v1',
      policyVersion: '1.0.0',
    },
    patternKey,
    context: {
      lookupKey: 'context_decision_style',
      fieldValues: {
        title: 'How to read this result',
        definition: 'This report describes the current signal pattern behind how decisions tend to organise.',
        scope: 'Read the order as a practical guide to attention, trade-offs, and range, not as a fixed identity.',
      },
    },
    orientation: {
      lookupKey: 'orientation_alpha_beta_gamma_delta_concentrated',
      fieldValues: {
        title: 'Alpha gives this result its first direction',
        summary: 'The strongest signal gives the first route into the result, while the supporting signals show the range around it.',
        scoreShapeSummary: 'This is a concentrated pattern: one signal is clearly ahead, but the full result still depends on how the remaining signals balance the reading.',
      },
    },
    recognition: {
      lookupKey: 'recognition_alpha_beta_gamma_delta_concentrated',
      fieldValues: {
        headline: 'You may recognise this as a clear first-route pattern.',
        recognitionStatement: 'Your result has a clear lead signal, with the other signals shaping how that lead becomes useful in practice.',
      },
    },
    signalRoles: rankedSignals.map((signal) => ({
      lookupKey: `role_${signal.signalKey}_${signal.rank}`,
      signalKey: signal.signalKey,
      rankPosition: signal.rank,
      fieldValues: {
        title: `${signal.signalLabel} at rank ${signal.rank}`,
        productiveExpression: `${signal.signalLabel} gives this part of the pattern a distinct role.`,
        riskPattern: `${signal.signalLabel} can become less useful when it is read in isolation from the full order.`,
        developmentNote: 'Use this role as one part of the whole pattern, then check what the next signal adds.',
      },
    })),
    patternMechanics: {
      lookupKey: 'mechanics_alpha_beta_gamma_delta_concentrated',
      fieldValues: {
        title: 'How this pattern works',
        coreMechanism: 'The top signal gives direction while the other signals shape the range around it.',
        whyItShowsUp: 'This pattern often appears when one route is clearly available, but the work still benefits from checking what the supporting signals add.',
        whatItProtects: 'It protects clarity without letting the result become too narrow.',
      },
    },
    patternSynthesis: {
      lookupKey: 'synthesis_alpha_beta_gamma_delta_concentrated',
      fieldValues: {
        title: 'What the pattern adds up to',
        gift: 'The pattern gives you a clear starting point.',
        trap: 'It can narrow if the lower-ranked signals are ignored.',
        takeaway: 'Read the full order rather than only the first signal.',
        synthesisText: 'This result is most useful when the lead signal starts the interpretation and the remaining signals keep the pattern flexible.',
      },
    },
    strengths: [
      {
        lookupKey: 'strength_1',
        itemKey: 'strength_1',
        priority: 1,
        fieldValues: {
          title: 'Clear starting point',
          text: 'You can see which signal currently gives the pattern its clearest direction.',
        },
      },
    ],
    narrowing: [
      {
        lookupKey: 'narrowing_1',
        itemKey: 'narrowing_1',
        priority: 1,
        fieldValues: {
          title: 'Range can compress',
          text: 'The pattern can become less flexible when lower-ranked signals are not used deliberately.',
        },
      },
    ],
    application: [
      {
        lookupKey: 'application_1',
        itemKey: 'application_1',
        priority: 1,
        fieldValues: {
          title: 'Use the ranked order',
          text: 'Start with the leading signal, then check what each following signal contributes.',
        },
      },
    ],
    closingIntegration: {
      lookupKey: 'closing_alpha_beta_gamma_delta_concentrated',
      fieldValues: {
        title: 'Take the whole pattern forward',
        coreGift: 'The strongest signal gives you a clear first route.',
        coreTrap: 'The result can become too narrow if the supporting signals are treated as irrelevant.',
        developmentEdge: 'The useful edge is to let the lead signal begin the interpretation, then deliberately widen the reading.',
        memorableLine: 'Start with the lead signal. Keep the whole pattern in view.',
      },
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoringMethod: 'option_signal_weights_only',
      normalizationMethod: 'largest_remainder_integer_percentages',
      answeredQuestionCount: 24,
      totalQuestionCount: 24,
      signalCount: 4,
      derivedPairCount: 0,
      topPair: null,
      scoreShapePolicy: {
        policyKey: 'fixed_gap_v1',
        policyVersion: '1.0.0',
      },
      patternLookup: {
        patternKey,
      },
      resultLanguageLookupKeys: [
        'context_decision_style',
        'orientation_alpha_beta_gamma_delta_concentrated',
        'recognition_alpha_beta_gamma_delta_concentrated',
        'role_alpha_1',
        'role_beta_2',
        'role_gamma_3',
        'role_delta_4',
        'mechanics_alpha_beta_gamma_delta_concentrated',
        'synthesis_alpha_beta_gamma_delta_concentrated',
        'strength_1',
        'narrowing_1',
        'application_1',
        'closing_alpha_beta_gamma_delta_concentrated',
      ],
      counts: {
        domainCount: 1,
        questionCount: 24,
        optionCount: 96,
        weightCount: 96,
      },
      warnings: [],
    },
  };
}
