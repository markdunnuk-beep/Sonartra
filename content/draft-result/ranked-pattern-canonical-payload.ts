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
      assessmentKey: 'test_assessment',
      assessmentTitle: 'Test Assessment',
      version: '1.0.0',
      attemptId,
      mode: 'single_domain',
      resultModelKey: 'ranked_pattern',
      domainKey: 'test_domain',
      generatedAt,
      completedAt: generatedAt,
    },
    assessment: {
      assessmentKey: 'test_assessment',
      title: 'Test Assessment',
      version: '1.0.0',
    },
    attempt: {
      attemptId,
      completedAt: generatedAt,
    },
    domain: {
      domainKey: 'test_domain',
      label: 'Test Domain',
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
      lookupKey: 'context_test_domain',
      fieldValues: {
        title: 'The result context',
        definition: 'This result describes the ranked signal pattern for the active domain.',
        scope: 'It uses the persisted canonical result payload only.',
      },
    },
    orientation: {
      lookupKey: 'orientation_alpha_beta_gamma_delta_concentrated',
      fieldValues: {
        title: 'Alpha gives this result its first direction',
        summary: 'The strongest signal sets the starting point for reading the rest of the pattern.',
      },
    },
    recognition: {
      lookupKey: 'recognition_alpha_beta_gamma_delta_concentrated',
      fieldValues: {
        headline: 'You may recognise this as a clear first-route pattern.',
        recognitionStatement: 'The result starts with the strongest signal and then reads the supporting order.',
      },
    },
    signalRoles: rankedSignals.map((signal) => ({
      lookupKey: `role_${signal.signalKey}_${signal.rank}`,
      signalKey: signal.signalKey,
      rankPosition: signal.rank,
      fieldValues: {
        title: `${signal.signalLabel} at rank ${signal.rank}`,
        productiveExpression: `${signal.signalLabel} contributes from its persisted rank position.`,
        developmentNote: 'Use this role as a reading aid, not as a recomputed score.',
      },
    })),
    patternMechanics: {
      lookupKey: 'mechanics_alpha_beta_gamma_delta_concentrated',
      fieldValues: {
        title: 'How this pattern works',
        coreMechanism: 'The top signal gives direction while the other signals shape the range around it.',
        whatItProtects: 'This keeps the result anchored in the persisted rank order.',
      },
    },
    patternSynthesis: {
      lookupKey: 'synthesis_alpha_beta_gamma_delta_concentrated',
      fieldValues: {
        title: 'What the pattern adds up to',
        gift: 'The pattern gives the reader a clear starting point.',
        trap: 'It can narrow if the lower-ranked signals are ignored.',
        takeaway: 'Read the full order rather than only the first signal.',
      },
    },
    strengths: [
      {
        lookupKey: 'strength_1',
        itemKey: 'strength_1',
        priority: 1,
        fieldValues: {
          title: 'Clear starting point',
          text: 'The reader can see which signal currently leads the pattern.',
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
        memorableLine: 'The order matters because it shows how the result is currently organised.',
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
        'context_test_domain',
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
