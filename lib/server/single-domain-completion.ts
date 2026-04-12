import { loadRuntimeExecutionModel } from '@/lib/engine/runtime-loader';
import { normalizeScoreResult } from '@/lib/engine/normalization';
import { scoreAssessmentResponses } from '@/lib/engine/scoring';
import type {
  RuntimeAssessmentDefinition,
  RuntimeResponseSet,
} from '@/lib/engine/types';
import { loadSingleDomainRuntimeDefinition } from '@/lib/server/single-domain-runtime-definition';
import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SignalChaptersRow,
} from '@/lib/types/single-domain-language';
import type {
  SingleDomainApplicationStatement,
  SingleDomainResultApplication,
  SingleDomainResultBalancing,
  SingleDomainResultHero,
  SingleDomainResultIntro,
  SingleDomainResultPairSummary,
  SingleDomainResultPayload,
  SingleDomainResultSignal,
  SingleDomainSignalPosition,
} from '@/lib/types/single-domain-result';
import type { Queryable } from '@/lib/engine/repository-sql';

const FALLBACK_VERSION_TIMESTAMP = '1970-01-01T00:00:00.000Z';

class SingleDomainCompletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SingleDomainCompletionError';
  }
}

function toExecutionDefinition(
  runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>,
): RuntimeAssessmentDefinition {
  return {
    assessment: {
      id: runtimeDefinition.metadata.assessmentId,
      key: runtimeDefinition.metadata.assessmentKey,
      mode: 'single_domain',
      title: runtimeDefinition.metadata.assessmentTitle,
      description: runtimeDefinition.metadata.assessmentDescription,
      estimatedTimeMinutes: null,
      createdAt: FALLBACK_VERSION_TIMESTAMP,
      updatedAt: FALLBACK_VERSION_TIMESTAMP,
    },
    version: {
      id: runtimeDefinition.metadata.assessmentVersionId,
      assessmentId: runtimeDefinition.metadata.assessmentId,
      mode: 'single_domain',
      versionTag: runtimeDefinition.metadata.assessmentVersionTag,
      status: 'published',
      isPublished: true,
      publishedAt: null,
      createdAt: FALLBACK_VERSION_TIMESTAMP,
      updatedAt: FALLBACK_VERSION_TIMESTAMP,
    },
    assessmentIntro: null,
    heroDefinition: null,
    domains: [{
      id: runtimeDefinition.domain.id,
      key: runtimeDefinition.domain.key,
      title: runtimeDefinition.domain.title,
      description: runtimeDefinition.domain.description,
      source: 'signal_group',
      orderIndex: runtimeDefinition.domain.orderIndex,
    }],
    signals: runtimeDefinition.signals.map((signal) => ({
      id: signal.id,
      key: signal.key,
      title: signal.title,
      description: signal.description,
      domainId: signal.domainId,
      orderIndex: signal.orderIndex,
      isOverlay: false,
      overlayType: 'none' as const,
    })),
    questions: runtimeDefinition.questions.map((question) => ({
      id: question.id,
      key: question.key,
      prompt: question.prompt,
      description: null,
      domainId: question.domainId,
      orderIndex: question.orderIndex,
      options: question.options.map((option) => ({
        id: option.id,
        key: option.key,
        label: option.label,
        description: option.description,
        questionId: option.questionId,
        orderIndex: option.orderIndex,
        signalWeights: option.signalWeights.map((weight) => ({
          signalId: weight.signalId,
          weight: weight.weight,
          reverseFlag: weight.reverseFlag,
          sourceWeightKey: weight.sourceWeightKey,
        })),
      })),
    })),
  };
}

function requireRow<TRow>(row: TRow | undefined, message: string): TRow {
  if (!row) {
    throw new SingleDomainCompletionError(message);
  }

  return row;
}

function getSignalPosition(rank: number, signalCount: number): SingleDomainSignalPosition {
  if (rank === 1) {
    return 'primary';
  }

  if (rank === 2) {
    return 'secondary';
  }

  if (signalCount >= 4 && rank === signalCount) {
    return 'underplayed';
  }

  return 'supporting';
}

function getPositionLabel(params: {
  row: SignalChaptersRow;
  position: SingleDomainSignalPosition;
}): {
  label: string;
  intro: string;
} {
  switch (params.position) {
    case 'primary':
      return {
        label: params.row.position_primary_label,
        intro: params.row.chapter_intro_primary,
      };
    case 'secondary':
      return {
        label: params.row.position_secondary_label,
        intro: params.row.chapter_intro_secondary,
      };
    case 'underplayed':
      return {
        label: params.row.position_underplayed_label,
        intro: params.row.chapter_intro_underplayed,
      };
    case 'supporting':
    default:
      return {
        label: params.row.position_supporting_label,
        intro: params.row.chapter_intro_supporting,
      };
  }
}

function createLanguageMaps(runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>) {
  return {
    framingByDomainKey: new Map(
      runtimeDefinition.languageBundle.DOMAIN_FRAMING.map((row) => [row.domain_key, row]),
    ),
    heroByPairKey: new Map(
      runtimeDefinition.languageBundle.HERO_PAIRS.map((row) => [row.pair_key, row]),
    ),
    signalChapterBySignalKey: new Map(
      runtimeDefinition.languageBundle.SIGNAL_CHAPTERS.map((row) => [row.signal_key, row]),
    ),
    balancingByPairKey: new Map(
      runtimeDefinition.languageBundle.BALANCING_SECTIONS.map((row) => [row.pair_key, row]),
    ),
    pairSummaryByPairKey: new Map(
      runtimeDefinition.languageBundle.PAIR_SUMMARIES.map((row) => [row.pair_key, row]),
    ),
    applicationBySignalKey: new Map(
      runtimeDefinition.languageBundle.APPLICATION_STATEMENTS.map((row) => [row.signal_key, row]),
    ),
  };
}

function deriveTopPairKey(params: {
  topSignalKey: string;
  secondSignalKey: string;
  runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>;
}): string {
  const pair = params.runtimeDefinition.derivedPairs.find((candidate) => (
    (candidate.leftSignalKey === params.topSignalKey && candidate.rightSignalKey === params.secondSignalKey)
    || (candidate.leftSignalKey === params.secondSignalKey && candidate.rightSignalKey === params.topSignalKey)
  ));

  if (!pair) {
    throw new SingleDomainCompletionError(
      `Unable to derive a canonical pair key for "${params.topSignalKey}" and "${params.secondSignalKey}".`,
    );
  }

  return pair.pairKey;
}

function toIntro(row: DomainFramingRow): SingleDomainResultIntro {
  return {
    section_title: row.section_title,
    intro_paragraph: row.intro_paragraph,
    meaning_paragraph: row.meaning_paragraph,
    bridge_to_signals: row.bridge_to_signals,
    blueprint_context_line: row.blueprint_context_line,
  };
}

function toHero(row: HeroPairsRow): SingleDomainResultHero {
  return {
    pair_key: row.pair_key,
    hero_headline: row.hero_headline,
    hero_subheadline: row.hero_subheadline,
    hero_opening: row.hero_opening,
    hero_strength_paragraph: row.hero_strength_paragraph,
    hero_tension_paragraph: row.hero_tension_paragraph,
    hero_close_paragraph: row.hero_close_paragraph,
  };
}

function toBalancing(row: BalancingSectionsRow): SingleDomainResultBalancing {
  return {
    pair_key: row.pair_key,
    balancing_section_title: row.balancing_section_title,
    current_pattern_paragraph: row.current_pattern_paragraph,
    practical_meaning_paragraph: row.practical_meaning_paragraph,
    system_risk_paragraph: row.system_risk_paragraph,
    rebalance_intro: row.rebalance_intro,
    rebalance_actions: Object.freeze([
      row.rebalance_action_1,
      row.rebalance_action_2,
      row.rebalance_action_3,
    ]),
  };
}

function toPairSummary(row: PairSummariesRow): SingleDomainResultPairSummary {
  return {
    pair_key: row.pair_key,
    pair_section_title: row.pair_section_title,
    pair_headline: row.pair_headline,
    pair_opening_paragraph: row.pair_opening_paragraph,
    pair_strength_paragraph: row.pair_strength_paragraph,
    pair_tension_paragraph: row.pair_tension_paragraph,
    pair_close_paragraph: row.pair_close_paragraph,
  };
}

function buildApplicationStatements(params: {
  rankedSignals: readonly SingleDomainResultSignal[];
  applicationBySignalKey: ReadonlyMap<string, ApplicationStatementsRow>;
}): SingleDomainResultApplication {
  const ranked = [...params.rankedSignals].sort((left, right) => left.rank - right.rank);
  const lowestFirst = [...ranked].sort((left, right) => right.rank - left.rank);

  const strengths = ranked
    .slice(0, Math.min(3, ranked.length))
    .map((signal, index) => {
      const row = requireRow(
        params.applicationBySignalKey.get(signal.signal_key),
        `Missing APPLICATION_STATEMENTS language for signal "${signal.signal_key}".`,
      );

      return Object.freeze({
        signal_key: signal.signal_key,
        signal_label: signal.signal_label,
        rank: signal.rank,
        statement: index === 0 ? row.strength_statement_1 : row.strength_statement_2,
      } satisfies SingleDomainApplicationStatement);
    });

  const watchoutCandidates = [ranked[0], ranked[1], lowestFirst[0]].filter(
    (signal): signal is SingleDomainResultSignal => Boolean(signal),
  );
  const watchouts: SingleDomainApplicationStatement[] = [];
  const seenWatchoutKeys = new Set<string>();

  for (const candidate of watchoutCandidates) {
    if (seenWatchoutKeys.has(candidate.signal_key)) {
      continue;
    }

    const row = requireRow(
      params.applicationBySignalKey.get(candidate.signal_key),
      `Missing APPLICATION_STATEMENTS language for signal "${candidate.signal_key}".`,
    );

    watchouts.push(Object.freeze({
      signal_key: candidate.signal_key,
      signal_label: candidate.signal_label,
      rank: candidate.rank,
      statement: watchouts.length === 0 ? row.watchout_statement_1 : row.watchout_statement_2,
    }));
    seenWatchoutKeys.add(candidate.signal_key);
  }

  const developmentCandidates = [lowestFirst[0], lowestFirst[1], ranked[1]].filter(
    (signal): signal is SingleDomainResultSignal => Boolean(signal),
  );
  const developmentFocus: SingleDomainApplicationStatement[] = [];
  const seenDevelopmentKeys = new Set<string>();

  for (const candidate of developmentCandidates) {
    if (seenDevelopmentKeys.has(candidate.signal_key)) {
      continue;
    }

    const row = requireRow(
      params.applicationBySignalKey.get(candidate.signal_key),
      `Missing APPLICATION_STATEMENTS language for signal "${candidate.signal_key}".`,
    );

    developmentFocus.push(Object.freeze({
      signal_key: candidate.signal_key,
      signal_label: candidate.signal_label,
      rank: candidate.rank,
      statement: developmentFocus.length === 0
        ? row.development_statement_1
        : row.development_statement_2,
    }));
    seenDevelopmentKeys.add(candidate.signal_key);
  }

  return {
    strengths: Object.freeze(strengths),
    watchouts: Object.freeze(watchouts),
    developmentFocus: Object.freeze(developmentFocus),
  };
}

export async function buildSingleDomainResultPayload(params: {
  db: Queryable;
  assessmentVersionId: string;
  responses: RuntimeResponseSet;
}): Promise<SingleDomainResultPayload> {
  const runtimeDefinition = await loadSingleDomainRuntimeDefinition(params.db, params.assessmentVersionId);
  const executionDefinition = toExecutionDefinition(runtimeDefinition);
  const executionModel = loadRuntimeExecutionModel(executionDefinition);
  const scoreResult = scoreAssessmentResponses({
    executionModel,
    responses: params.responses,
  });
  const normalizedResult = normalizeScoreResult({ scoreResult });

  if (scoreResult.diagnostics.answeredQuestions !== executionModel.questions.length) {
    throw new SingleDomainCompletionError('Single-domain completion requires every question to be answered.');
  }

  if (normalizedResult.signalScores.length === 0) {
    throw new SingleDomainCompletionError('Single-domain completion requires at least one scored signal.');
  }

  const rankedSignals = [...normalizedResult.signalScores].sort((left, right) => (
    left.rank - right.rank
    || left.signalKey.localeCompare(right.signalKey)
    || left.signalId.localeCompare(right.signalId)
  ));
  const topSignal = rankedSignals[0]!;
  const secondSignal = rankedSignals[1];
  const topPairKey = secondSignal
    ? deriveTopPairKey({
        topSignalKey: topSignal.signalKey,
        secondSignalKey: secondSignal.signalKey,
        runtimeDefinition,
      })
    : null;

  if (!topPairKey) {
    throw new SingleDomainCompletionError('Single-domain completion requires at least two ranked signals to derive a pair.');
  }

  const maps = createLanguageMaps(runtimeDefinition);
  const introRow = requireRow(
    maps.framingByDomainKey.get(runtimeDefinition.domain.key),
    `Missing DOMAIN_FRAMING row for domain "${runtimeDefinition.domain.key}".`,
  );
  const heroRow = requireRow(
    maps.heroByPairKey.get(topPairKey),
    `Missing HERO_PAIRS row for pair "${topPairKey}".`,
  );
  const balancingRow = requireRow(
    maps.balancingByPairKey.get(topPairKey),
    `Missing BALANCING_SECTIONS row for pair "${topPairKey}".`,
  );
  const pairSummaryRow = requireRow(
    maps.pairSummaryByPairKey.get(topPairKey),
    `Missing PAIR_SUMMARIES row for pair "${topPairKey}".`,
  );

  const signals: readonly SingleDomainResultSignal[] = Object.freeze(
    rankedSignals.map((signal) => {
      const chapterRow = requireRow(
        maps.signalChapterBySignalKey.get(signal.signalKey),
        `Missing SIGNAL_CHAPTERS row for signal "${signal.signalKey}".`,
      );
      const position = getSignalPosition(signal.rank, rankedSignals.length);
      const positionLanguage = getPositionLabel({
        row: chapterRow,
        position,
      });

      return Object.freeze({
        signal_key: signal.signalKey,
        signal_label: signal.signalTitle,
        rank: signal.rank,
        normalized_score: signal.percentage,
        raw_score: signal.rawTotal,
        position,
        position_label: positionLanguage.label,
        chapter_intro: positionLanguage.intro,
        chapter_how_it_shows_up: chapterRow.chapter_how_it_shows_up,
        chapter_value_outcome: chapterRow.chapter_value_outcome,
        chapter_value_team_effect: chapterRow.chapter_value_team_effect,
        chapter_risk_behaviour: chapterRow.chapter_risk_behaviour,
        chapter_risk_impact: chapterRow.chapter_risk_impact,
        chapter_development: chapterRow.chapter_development,
      });
    }),
  );

  const application = buildApplicationStatements({
    rankedSignals: signals,
    applicationBySignalKey: maps.applicationBySignalKey,
  });

  return Object.freeze({
    metadata: Object.freeze({
      assessmentKey: runtimeDefinition.metadata.assessmentKey,
      assessmentTitle: runtimeDefinition.metadata.assessmentTitle,
      version: runtimeDefinition.metadata.assessmentVersionTag,
      attemptId: params.responses.attemptId,
      mode: 'single_domain',
      domainKey: runtimeDefinition.domain.key,
      generatedAt: normalizedResult.diagnostics.generatedAt,
      completedAt: params.responses.submittedAt,
    }),
    intro: Object.freeze(toIntro(introRow)),
    hero: Object.freeze(toHero(heroRow)),
    signals,
    balancing: Object.freeze(toBalancing(balancingRow)),
    pairSummary: Object.freeze(toPairSummary(pairSummaryRow)),
    application: Object.freeze(application),
    diagnostics: Object.freeze({
      readinessStatus: 'ready' as const,
      scoringMethod: scoreResult.diagnostics.scoringMethod,
      normalizationMethod: normalizedResult.diagnostics.normalizationMethod,
      answeredQuestionCount: scoreResult.diagnostics.answeredQuestions,
      totalQuestionCount: scoreResult.diagnostics.totalQuestions,
      signalCount: runtimeDefinition.diagnostics.counts.signalCount,
      derivedPairCount: runtimeDefinition.diagnostics.counts.derivedPairCount,
      topPair: topPairKey,
      counts: {
        domainCount: runtimeDefinition.diagnostics.counts.domainCount,
        questionCount: runtimeDefinition.diagnostics.counts.questionCount,
        optionCount: runtimeDefinition.diagnostics.counts.optionCount,
        weightCount: runtimeDefinition.diagnostics.counts.weightCount,
      },
      warnings: Object.freeze([
        ...scoreResult.diagnostics.warnings,
        ...normalizedResult.diagnostics.warnings,
      ]),
    }),
  });
}
