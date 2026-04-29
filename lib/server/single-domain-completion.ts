import { loadRuntimeExecutionModel } from '@/lib/engine/runtime-loader';
import { normalizeScoreResult } from '@/lib/engine/normalization';
import { scoreAssessmentResponses } from '@/lib/engine/scoring';
import { resolveSingleDomainPairKey } from '@/lib/assessment-language/single-domain-pair-keys';
import {
  buildSingleDomainApplicationPattern,
  isFullPatternApplicationRow,
  SINGLE_DOMAIN_APPLICATION_DRIVER_ROLES,
  type SingleDomainApplicationDriverRole,
} from '@/lib/assessment-language/single-domain-application-pattern';
import type {
  RuntimeAssessmentDefinition,
  RuntimeResponseSet,
} from '@/lib/engine/types';
import { loadSingleDomainRuntimeDefinition } from '@/lib/server/single-domain-runtime-definition';
import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DriverClaimsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
} from '@/lib/types/single-domain-language';
import type {
  SingleDomainApplicationStatement,
  SingleDomainResultApplicationRoleItem,
  SingleDomainResultApplicationSection,
  SingleDomainResultApplication,
  SingleDomainResultBalancing,
  SingleDomainResultHero,
  SingleDomainResultIntro,
  SingleDomainResultPairSummary,
  SingleDomainResultPayload,
  SingleDomainResultSignal,
  SingleDomainSignalPosition,
} from '@/lib/types/single-domain-result';
import { isSingleDomainResultPayload } from '@/lib/types/single-domain-result';
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

type DriverClaimSourceDiagnostic = {
  pairKey: string;
  signalKey: string;
  driverRole: DriverClaimsRow['driver_role'];
  source: 'driver_claims';
};

type ApplicationSourceDiagnostic = {
  source: 'full_pattern' | 'legacy_signal_bucket_fallback';
  patternKey?: string;
  pairKey?: string;
};

type SelectedSignalText = {
  text: string;
  source: string;
  generated: boolean;
};

const POSITION_LABELS: Record<SingleDomainSignalPosition, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  supporting: 'Supporting',
  underplayed: 'Underplayed',
};

function getDriverRoleForPosition(position: SingleDomainSignalPosition): DriverClaimsRow['driver_role'] {
  switch (position) {
    case 'primary':
      return 'primary_driver';
    case 'secondary':
      return 'secondary_driver';
    case 'underplayed':
      return 'range_limitation';
    case 'supporting':
    default:
      return 'supporting_context';
  }
}

function formatDriverClaimSourceDiagnostics(
  diagnostics: readonly DriverClaimSourceDiagnostic[],
): readonly string[] {
  const seen = new Set<string>();
  const formatted: string[] = [];

  diagnostics.forEach((diagnostic) => {
    const key = [
      diagnostic.pairKey,
      diagnostic.signalKey,
      diagnostic.driverRole,
      diagnostic.source,
    ].join('|');
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    formatted.push(
      `single_domain_driver_claim_source: pair_key=${diagnostic.pairKey}; signal_key=${diagnostic.signalKey}; role=${diagnostic.driverRole}; source=${diagnostic.source}`,
    );
  });

  return Object.freeze(formatted);
}

function formatApplicationSourceDiagnostic(diagnostic: ApplicationSourceDiagnostic): string {
  if (diagnostic.source === 'full_pattern') {
    return [
      'single_domain_application_full_pattern_source',
      `pattern_key=${diagnostic.patternKey ?? ''}`,
      `pair_key=${diagnostic.pairKey ?? ''}`,
    ].join(': ');
  }

  return 'single_domain_application_legacy_signal_bucket_fallback: no full-pattern application rows were available.';
}

function createDriverClaimKey(params: {
  domainKey: string;
  pairKey: string;
  signalKey: string;
  driverRole: DriverClaimsRow['driver_role'];
}): string {
  return [
    params.domainKey,
    params.pairKey,
    params.signalKey,
    params.driverRole,
  ].join('|');
}

function createDriverClaimMaps(
  runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>,
): {
  exactByKey: ReadonlyMap<string, readonly DriverClaimsRow[]>;
} {
  const exactByKey = new Map<string, DriverClaimsRow[]>();

  (runtimeDefinition.languageBundle.DRIVER_CLAIMS ?? []).forEach((row) => {
    const exactKey = createDriverClaimKey({
      domainKey: row.domain_key,
      pairKey: row.pair_key,
      signalKey: row.signal_key,
      driverRole: row.driver_role,
    });
    exactByKey.set(exactKey, [...(exactByKey.get(exactKey) ?? []), row]);
  });

  const sortRows = (rows: readonly DriverClaimsRow[]) => Object.freeze(
    [...rows].sort((left, right) => left.priority - right.priority || left.claim_text.localeCompare(right.claim_text)),
  );

  return {
    exactByKey: new Map([...exactByKey.entries()].map(([key, rows]) => [key, sortRows(rows)])),
  };
}

function resolvePairScopedDriverClaim(params: {
  domainKey: string;
  pairKey: string;
  signalKey: string;
  driverRole: DriverClaimsRow['driver_role'];
  maps: {
    exactByKey: ReadonlyMap<string, readonly DriverClaimsRow[]>;
  };
  sourceDiagnostics: DriverClaimSourceDiagnostic[];
}): SelectedSignalText | null {
  const key = createDriverClaimKey(params);
  const exactText = (params.maps.exactByKey.get(key) ?? [])
    .map((row) => row.claim_text.trim())
    .filter(Boolean)
    .join('\n');
  if (hasText(exactText)) {
    params.sourceDiagnostics.push({
      pairKey: params.pairKey,
      signalKey: params.signalKey,
      driverRole: params.driverRole,
      source: 'driver_claims',
    });

    return {
      text: exactText,
      source: 'driver_claims',
      generated: false,
    };
  }

  return null;
}

function createPairLanguageMap<TRow extends { pair_key: string }>(
  runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>,
  rows: readonly TRow[],
): ReadonlyMap<string, TRow> {
  const runtimePairKeys = runtimeDefinition.derivedPairs.map((pair) => pair.pairKey);
  const map = new Map<string, TRow>();

  rows.forEach((row) => {
    const resolution = resolveSingleDomainPairKey(runtimePairKeys, row.pair_key);
    if (resolution.success && !resolution.wasReversed) {
      map.set(resolution.canonicalPairKey, row);
    }
  });

  return map;
}

function createLanguageMaps(runtimeDefinition: Awaited<ReturnType<typeof loadSingleDomainRuntimeDefinition>>) {
  return {
    framingByDomainKey: new Map(
      runtimeDefinition.languageBundle.DOMAIN_FRAMING.map((row) => [row.domain_key, row]),
    ),
    heroByPairKey: createPairLanguageMap(runtimeDefinition, runtimeDefinition.languageBundle.HERO_PAIRS),
    driverClaimMaps: createDriverClaimMaps(runtimeDefinition),
    balancingByPairKey: createPairLanguageMap(
      runtimeDefinition,
      runtimeDefinition.languageBundle.BALANCING_SECTIONS,
    ),
    pairSummaryByPairKey: createPairLanguageMap(
      runtimeDefinition,
      runtimeDefinition.languageBundle.PAIR_SUMMARIES,
    ),
    applicationBySignalKey: new Map(
      runtimeDefinition.languageBundle.APPLICATION_STATEMENTS.map((row) => [row.signal_key, row]),
    ),
    applicationRows: runtimeDefinition.languageBundle.APPLICATION_STATEMENTS,
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

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function firstText(...values: Array<string | null | undefined>): string {
  return values.find(hasText)?.trim() ?? '';
}

function requireText(value: string, message: string): string {
  if (hasText(value)) {
    return value.trim();
  }

  throw new SingleDomainCompletionError(message);
}

function getApplicationSignalRow(params: {
  applicationBySignalKey: ReadonlyMap<string, ApplicationStatementsRow>;
  signalKey: string;
}): ApplicationStatementsRow {
  return requireRow(
    params.applicationBySignalKey.get(params.signalKey),
    `Missing APPLICATION_STATEMENTS language for signal "${params.signalKey}".`,
  );
}

function buildResultSignalFromSectionFirstLanguage(params: {
  domainKey: string;
  pairKey: string;
  signalKey: string;
  signalLabel: string;
  rank: number;
  normalizedScore: number;
  rawScore: number;
  position: SingleDomainSignalPosition;
  driverClaimMaps: {
    exactByKey: ReadonlyMap<string, readonly DriverClaimsRow[]>;
  };
  applicationRow: ApplicationStatementsRow;
  driverClaimSourceDiagnostics: DriverClaimSourceDiagnostic[];
}): SingleDomainResultSignal {
  const driverRole = getDriverRoleForPosition(params.position);
  const driverClaimText = resolvePairScopedDriverClaim({
    domainKey: params.domainKey,
    pairKey: params.pairKey,
    signalKey: params.signalKey,
    driverRole,
    maps: params.driverClaimMaps,
    sourceDiagnostics: params.driverClaimSourceDiagnostics,
  });
  if (!driverClaimText) {
    throw new SingleDomainCompletionError(
      `Missing DRIVER_CLAIMS row for pair "${params.pairKey}", signal "${params.signalKey}", and role "${driverRole}".`,
    );
  }
  const chapterIntro = requireText(driverClaimText.text, `Missing usable signal intro language for signal "${params.signalKey}".`);
  const chapterRiskBehaviour = requireText(
    firstText(
      params.applicationRow.watchout_statement_1,
      params.applicationRow.watchout_statement_2,
      chapterIntro,
    ),
    `Missing usable signal risk behaviour language for signal "${params.signalKey}".`,
  );
  const chapterRiskImpact = requireText(
    firstText(
      params.applicationRow.watchout_statement_2,
      params.applicationRow.watchout_statement_1,
      chapterIntro,
    ),
    `Missing usable signal risk impact language for signal "${params.signalKey}".`,
  );
  const chapterDevelopment = requireText(
    firstText(
      params.applicationRow.development_statement_1,
      params.applicationRow.development_statement_2,
      chapterRiskImpact,
      chapterIntro,
    ),
    `Missing usable signal development language for signal "${params.signalKey}".`,
  );

  return Object.freeze({
    signal_key: params.signalKey,
    signal_label: params.signalLabel,
    rank: params.rank,
    normalized_score: params.normalizedScore,
    raw_score: params.rawScore,
    position: params.position,
    position_label: POSITION_LABELS[params.position],
    chapter_intro: chapterIntro,
    chapter_how_it_shows_up: chapterIntro,
    chapter_value_outcome: chapterIntro,
    chapter_value_team_effect: chapterIntro,
    chapter_risk_behaviour: chapterRiskBehaviour,
    chapter_risk_impact: chapterRiskImpact,
    chapter_development: chapterDevelopment,
  } satisfies SingleDomainResultSignal);
}

function toHero(row: HeroPairsRow, pairKey: string): SingleDomainResultHero {
  return {
    pair_key: pairKey,
    hero_headline: row.hero_headline,
    hero_subheadline: row.hero_subheadline,
    hero_opening: row.hero_opening,
    hero_strength_paragraph: row.hero_strength_paragraph,
    hero_tension_paragraph: row.hero_tension_paragraph,
    hero_close_paragraph: row.hero_close_paragraph,
  };
}


function toBalancing(row: BalancingSectionsRow, pairKey: string): SingleDomainResultBalancing {
  const currentPattern = requireText(
    row.current_pattern_paragraph,
    `Missing limitation current pattern language for pair "${pairKey}".`,
  );
  const practicalMeaning = requireText(
    row.practical_meaning_paragraph,
    `Missing limitation practical meaning language for pair "${pairKey}".`,
  );
  const systemRisk = firstText(
    row.system_risk_paragraph,
    row.rebalance_intro,
    row.rebalance_action_1,
    practicalMeaning,
    currentPattern,
  );
  const action1 = firstText(row.rebalance_action_1, row.rebalance_intro, systemRisk);
  const action2 = firstText(row.rebalance_action_2, row.rebalance_intro, practicalMeaning, systemRisk);
  const action3 = firstText(row.rebalance_action_3, systemRisk, practicalMeaning, action2);

  return {
    pair_key: pairKey,
    balancing_section_title: requireText(
      row.balancing_section_title,
      `Missing limitation title language for pair "${pairKey}".`,
    ),
    current_pattern_paragraph: currentPattern,
    practical_meaning_paragraph: practicalMeaning,
    system_risk_paragraph: requireText(
      systemRisk,
      `Missing usable limitation risk language for pair "${pairKey}".`,
    ),
    rebalance_intro: requireText(
      firstText(row.rebalance_intro, systemRisk, practicalMeaning),
      `Missing usable limitation rebalance intro language for pair "${pairKey}".`,
    ),
    rebalance_actions: Object.freeze([
      requireText(action1, `Missing usable limitation action 1 language for pair "${pairKey}".`),
      requireText(action2, `Missing usable limitation action 2 language for pair "${pairKey}".`),
      requireText(action3, `Missing usable limitation action 3 language for pair "${pairKey}".`),
    ]),
  };
}


function toPairSummary(row: PairSummariesRow, pairKey: string): SingleDomainResultPairSummary {
  return {
    pair_key: pairKey,
    pair_section_title: row.pair_section_title,
    pair_headline: row.pair_headline,
    pair_opening_paragraph: row.pair_opening_paragraph,
    pair_strength_paragraph: row.pair_strength_paragraph,
    pair_tension_paragraph: row.pair_tension_paragraph,
    pair_close_paragraph: row.pair_close_paragraph,
  };
}


function getSpecificHeroRow(params: {
  row: HeroPairsRow | undefined;
}): HeroPairsRow | null {
  if (!params.row) {
    return null;
  }

  return params.row;
}

function getSpecificBalancingRow(params: {
  row: BalancingSectionsRow | undefined;
}): BalancingSectionsRow | null {
  if (!params.row) {
    return null;
  }

  if (
    hasText(params.row.balancing_section_title)
    && hasText(params.row.current_pattern_paragraph)
    && hasText(params.row.practical_meaning_paragraph)
    && (
      hasText(params.row.system_risk_paragraph)
      || hasText(params.row.rebalance_intro)
      || hasText(params.row.rebalance_action_1)
    )
  ) {
    return params.row;
  }

  return null;
}

function requireSpecificPairRow<TRow>(params: {
  row: TRow | null;
  pairKey: string;
  section: 'HERO_PAIRS' | 'BALANCING_SECTIONS' | 'PAIR_SUMMARIES';
  diagnosticReason: string;
}): TRow {
  if (params.row) {
    return params.row;
  }

  throw new SingleDomainCompletionError(
    `Missing canonical ${params.section} row for pair "${params.pairKey}" (${params.diagnosticReason}).`,
  );
}

function getSpecificPairSummaryRow(params: {
  row: PairSummariesRow | undefined;
}): PairSummariesRow | null {
  if (!params.row) {
    return null;
  }

  return params.row;
}

function buildApplicationStatements(params: {
  rankedSignals: readonly SingleDomainResultSignal[];
  applicationBySignalKey: ReadonlyMap<string, ApplicationStatementsRow>;
  applicationRows: readonly ApplicationStatementsRow[];
  domainKey: string;
  assessmentVersionId: string;
  sourceDiagnostics: ApplicationSourceDiagnostic[];
}): SingleDomainResultApplication {
  const ranked = [...params.rankedSignals].sort((left, right) => left.rank - right.rank);
  const fullPatternRows = params.applicationRows.filter(isFullPatternApplicationRow);

  if (fullPatternRows.length > 0) {
    return buildFullPatternApplicationStatements({
      rankedSignals: ranked,
      applicationRows: fullPatternRows,
      domainKey: params.domainKey,
      assessmentVersionId: params.assessmentVersionId,
      sourceDiagnostics: params.sourceDiagnostics,
    });
  }

  params.sourceDiagnostics.push({
    source: 'legacy_signal_bucket_fallback',
  });

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
        statement: requireText(
          index === 0 ? row.strength_statement_1 : row.strength_statement_2,
          `Missing APPLICATION_STATEMENTS strength text for signal "${signal.signal_key}" at slot ${index + 1}.`,
        ),
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
      statement: requireText(
        watchouts.length === 0 ? row.watchout_statement_1 : row.watchout_statement_2,
        `Missing APPLICATION_STATEMENTS watchout text for signal "${candidate.signal_key}" at slot ${watchouts.length + 1}.`,
      ),
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
      statement: requireText(
        developmentFocus.length === 0
          ? row.development_statement_1
          : row.development_statement_2,
        `Missing APPLICATION_STATEMENTS development text for signal "${candidate.signal_key}" at slot ${developmentFocus.length + 1}.`,
      ),
    }));
    seenDevelopmentKeys.add(candidate.signal_key);
  }

  return {
    strengths: Object.freeze(strengths),
    watchouts: Object.freeze(watchouts),
    developmentFocus: Object.freeze(developmentFocus),
  };
}

const APPLICATION_FOCUS_CONFIG = {
  rely_on: {
    payloadKey: 'relyOn',
    guidanceType: 'applied_strength',
    legacyKey: 'strengths',
  },
  notice: {
    payloadKey: 'notice',
    guidanceType: 'watchout',
    legacyKey: 'watchouts',
  },
  develop: {
    payloadKey: 'develop',
    guidanceType: 'development_focus',
    legacyKey: 'developmentFocus',
  },
} as const;

type ApplicationFocusArea = keyof typeof APPLICATION_FOCUS_CONFIG;

function buildFullPatternApplicationStatements(params: {
  rankedSignals: readonly SingleDomainResultSignal[];
  applicationRows: readonly ApplicationStatementsRow[];
  domainKey: string;
  assessmentVersionId: string;
  sourceDiagnostics: ApplicationSourceDiagnostic[];
}): SingleDomainResultApplication {
  const pattern = buildSingleDomainApplicationPattern(
    params.rankedSignals.map((signal) => signal.signal_key),
  );
  const signalByKey = new Map(params.rankedSignals.map((signal) => [signal.signal_key, signal]));
  const selectedRows = params.applicationRows.filter((row) => (
    row.domain_key === params.domainKey
    && row.pattern_key === pattern.patternKey
  ));

  const selectedByFocusAndRole = new Map<string, ApplicationStatementsRow>();
  selectedRows.forEach((row) => {
    selectedByFocusAndRole.set(`${row.focus_area}|${row.driver_role}`, row);
  });

  const missing: string[] = [];
  const sections: Record<string, SingleDomainResultApplicationSection> = {};
  const legacyBuckets: Record<string, SingleDomainApplicationStatement[]> = {
    strengths: [],
    watchouts: [],
    developmentFocus: [],
  };

  (Object.keys(APPLICATION_FOCUS_CONFIG) as ApplicationFocusArea[]).forEach((focusArea) => {
    const config = APPLICATION_FOCUS_CONFIG[focusArea];
    const items: SingleDomainResultApplicationRoleItem[] = [];

    SINGLE_DOMAIN_APPLICATION_DRIVER_ROLES.forEach((driverRole) => {
      const row = selectedByFocusAndRole.get(`${focusArea}|${driverRole}`);
      const expectedSignalKey = pattern.signalByRole[driverRole];

      if (!row) {
        missing.push(`${focusArea}:${driverRole}`);
        return;
      }

      if (
        row.guidance_type !== config.guidanceType
        || row.signal_key !== expectedSignalKey
        || row.priority !== SINGLE_DOMAIN_APPLICATION_DRIVER_ROLES.indexOf(driverRole) + 1
      ) {
        missing.push(`${focusArea}:${driverRole}:invalid_mapping`);
        return;
      }

      const signal = requireRow(
        signalByKey.get(row.signal_key),
        `Missing ranked signal "${row.signal_key}" for application pattern "${pattern.patternKey}".`,
      );
      const text = requireText(
        row.guidance_text ?? '',
        `Missing APPLICATION_STATEMENTS guidance_text for pattern "${pattern.patternKey}", focus_area "${focusArea}", role "${driverRole}".`,
      );
      const linkedClaimType = requireText(
        row.linked_claim_type ?? '',
        `Missing APPLICATION_STATEMENTS linked_claim_type for pattern "${pattern.patternKey}", focus_area "${focusArea}", role "${driverRole}".`,
      );
      const priority = row.priority ?? 0;

      items.push(Object.freeze({
        driverRole,
        signalKey: row.signal_key,
        signalLabel: signal.signal_label,
        rank: signal.rank,
        priority,
        text,
        linkedClaimType,
      } satisfies SingleDomainResultApplicationRoleItem));
      legacyBuckets[config.legacyKey].push(Object.freeze({
        signal_key: row.signal_key,
        signal_label: signal.signal_label,
        rank: signal.rank,
        statement: text,
        driver_role: driverRole,
        priority,
        linked_claim_type: linkedClaimType,
      } satisfies SingleDomainApplicationStatement));
    });

    sections[config.payloadKey] = Object.freeze({
      guidanceType: config.guidanceType,
      items: Object.freeze([...items].sort((left, right) => left.priority - right.priority)),
    });
  });

  if (selectedRows.length !== 12 || missing.length > 0) {
    throw new SingleDomainCompletionError(
      [
        'single_domain_application_full_pattern_missing',
        `assessment_version_id=${params.assessmentVersionId}`,
        `domain_key=${params.domainKey}`,
        `pattern_key=${pattern.patternKey}`,
        'expected_count=12',
        `actual_count=${selectedRows.length}`,
        `missing=${missing.join(',') || 'none'}`,
      ].join('; '),
    );
  }

  params.sourceDiagnostics.push({
    source: 'full_pattern',
    patternKey: pattern.patternKey,
    pairKey: pattern.pairKey,
  });

  return Object.freeze({
    patternKey: pattern.patternKey,
    pairKey: pattern.pairKey,
    sections: Object.freeze({
      relyOn: sections.relyOn as SingleDomainResultApplicationSection,
      notice: sections.notice as SingleDomainResultApplicationSection,
      develop: sections.develop as SingleDomainResultApplicationSection,
    }),
    strengths: Object.freeze(legacyBuckets.strengths),
    watchouts: Object.freeze(legacyBuckets.watchouts),
    developmentFocus: Object.freeze(legacyBuckets.developmentFocus),
  });
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
  const driverClaimSourceDiagnostics: DriverClaimSourceDiagnostic[] = [];
  const applicationSourceDiagnostics: ApplicationSourceDiagnostic[] = [];
  const introRow = requireRow(
    maps.framingByDomainKey.get(runtimeDefinition.domain.key),
    `Missing DOMAIN_FRAMING row for domain "${runtimeDefinition.domain.key}".`,
  );

  const signals: readonly SingleDomainResultSignal[] = Object.freeze(
    rankedSignals.map((signal) => {
      const position = getSignalPosition(signal.rank, rankedSignals.length);

      return buildResultSignalFromSectionFirstLanguage({
        domainKey: runtimeDefinition.domain.key,
        pairKey: topPairKey,
        signalKey: signal.signalKey,
        signalLabel: signal.signalTitle,
        rank: signal.rank,
        normalizedScore: signal.percentage,
        rawScore: signal.rawTotal,
        position,
        driverClaimMaps: maps.driverClaimMaps,
        applicationRow: getApplicationSignalRow({
          applicationBySignalKey: maps.applicationBySignalKey,
          signalKey: signal.signalKey,
        }),
        driverClaimSourceDiagnostics,
      });
    }),
  );
  const heroRow = requireSpecificPairRow({
    row: getSpecificHeroRow({
      row: maps.heroByPairKey.get(topPairKey),
    }),
    pairKey: topPairKey,
    section: 'HERO_PAIRS',
    diagnosticReason: 'row missing for canonical pair_key',
  });
  const balancingRow = requireSpecificPairRow({
    row: getSpecificBalancingRow({
    row: maps.balancingByPairKey.get(topPairKey),
  }),
    pairKey: topPairKey,
    section: 'BALANCING_SECTIONS',
    diagnosticReason: 'row missing or incomplete',
  });
  const pairSummaryRow = requireSpecificPairRow({
    row: getSpecificPairSummaryRow({
      row: maps.pairSummaryByPairKey.get(topPairKey),
    }),
    pairKey: topPairKey,
    section: 'PAIR_SUMMARIES',
    diagnosticReason: 'row missing for canonical pair_key',
  });

  const application = buildApplicationStatements({
    rankedSignals: signals,
    applicationBySignalKey: maps.applicationBySignalKey,
    applicationRows: maps.applicationRows,
    domainKey: runtimeDefinition.domain.key,
    assessmentVersionId: params.assessmentVersionId,
    sourceDiagnostics: applicationSourceDiagnostics,
  });

  const payload = Object.freeze({
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
    hero: Object.freeze(
      toHero(heroRow, topPairKey),
    ),
    signals,
    balancing: Object.freeze(
      toBalancing(balancingRow, topPairKey),
    ),
    pairSummary: Object.freeze(
      toPairSummary(pairSummaryRow, topPairKey),
    ),
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
        ...formatDriverClaimSourceDiagnostics(driverClaimSourceDiagnostics),
        ...applicationSourceDiagnostics.map(formatApplicationSourceDiagnostic),
      ]),
    }),
  });

  if (!isSingleDomainResultPayload(payload)) {
    throw new SingleDomainCompletionError(
      `Generated single-domain result payload is malformed for attempt "${params.responses.attemptId}".`,
    );
  }

  return payload;
}
