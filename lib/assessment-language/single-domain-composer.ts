import {
  SINGLE_DOMAIN_ALLOWED_CLAIMS_BY_SECTION,
  SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS,
  SINGLE_DOMAIN_DRIVER_ROLE_TO_CLAIM_TYPE,
  validateSingleDomainNarrativePreview,
} from '@/lib/assessment-language/single-domain-narrative-schema';
import type {
  SingleDomainApplicationImportRow,
  SingleDomainClaimOwnership,
  SingleDomainDriversImportRow,
  SingleDomainHeroImportRow,
  SingleDomainIntroImportRow,
  SingleDomainLimitationImportRow,
  SingleDomainNarrativeDatasetKey,
  SingleDomainNarrativePreviewInput,
  SingleDomainNarrativeSectionKey,
  SingleDomainPairImportRow,
  SingleDomainPreviewSignal,
} from '@/lib/assessment-language/single-domain-narrative-types';
import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';
import { buildSingleDomainPairKey } from '@/lib/types/single-domain-runtime';

export type ResultComposerPreviewInput = SingleDomainNarrativePreviewInput;

export type ComposedSectionProvenance = {
  sectionKey: SingleDomainNarrativeSectionKey;
  sourceDatasetKey: SingleDomainNarrativeDatasetKey;
  sourceRowCount: number;
  sourceRowIdentifiers: readonly string[];
  validationStatus: 'ready' | 'warning';
  validationMessages: readonly string[];
};

export type ComposedNarrativeSection = {
  key: SingleDomainNarrativeSectionKey;
  title: string;
  question: string;
  paragraphs: readonly string[];
  focusItems: readonly {
    label: string;
    content: readonly string[];
  }[];
  provenance: ComposedSectionProvenance;
};

export type ComposedSingleDomainReport = {
  domainKey: string;
  domainTitle: string;
  pairKey: string;
  sections: readonly ComposedNarrativeSection[];
  previewValidation: ReturnType<typeof validateSingleDomainNarrativePreview>;
};

export type DraftPreviewAdapterResult =
  | {
      success: true;
      input: ResultComposerPreviewInput;
      pairOptions: readonly string[];
      activePairKey: string;
    }
  | {
      success: false;
      reason: string;
    };

const SECTION_DATASET_KEYS: Record<SingleDomainNarrativeSectionKey, SingleDomainNarrativeDatasetKey> = {
  intro: 'SINGLE_DOMAIN_INTRO',
  hero: 'SINGLE_DOMAIN_HERO',
  drivers: 'SINGLE_DOMAIN_DRIVERS',
  pair: 'SINGLE_DOMAIN_PAIR',
  limitation: 'SINGLE_DOMAIN_LIMITATION',
  application: 'SINGLE_DOMAIN_APPLICATION',
};

const SECTION_TITLES: Record<SingleDomainNarrativeSectionKey, string> = {
  intro: 'Intro',
  hero: 'Hero',
  drivers: 'Drivers',
  pair: 'Pair',
  limitation: 'Limitation',
  application: 'Application',
    };

function getSignalDriverRole(
  signal: SingleDomainResultPayload['signals'][number],
): SingleDomainDriversImportRow['driver_role'] {
  if (signal.position === 'underplayed' || signal.normalized_score <= 0 || signal.raw_score <= 0) {
    return 'range_limitation';
  }

  if (signal.position === 'primary' || signal.rank === 1) {
    return 'primary_driver';
  }

  if (signal.position === 'secondary' || signal.rank === 2) {
    return 'secondary_driver';
  }

  return 'supporting_context';
}

function getSignalDriverMateriality(
  role: SingleDomainDriversImportRow['driver_role'],
): SingleDomainDriversImportRow['materiality'] {
  switch (role) {
    case 'range_limitation':
      return 'material_underplay';
    case 'supporting_context':
      return 'supporting';
    case 'primary_driver':
    case 'secondary_driver':
    default:
      return 'core';
  }
}

function getSignalDriverClaimText(
  signal: SingleDomainResultPayload['signals'][number],
  role: SingleDomainDriversImportRow['driver_role'],
): string {
  if (role === 'range_limitation') {
    return (
      signal.chapter_risk_impact
      || signal.chapter_development
      || signal.chapter_intro
    );
  }

  return (
    signal.chapter_intro
    || signal.chapter_how_it_shows_up
    || signal.chapter_value_outcome
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLeadingSignalPrefix(
  value: string | null | undefined,
  signalKeys: ReadonlySet<string>,
): {
  signalKey: string;
  text: string;
} | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^\s*([a-z][a-z0-9_-]*)\s*:\s*(.+)$/i);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const signalKey = match[1].toLowerCase();
  if (!signalKeys.has(signalKey)) {
    return null;
  }

  return {
    signalKey,
    text: match[2].trim(),
  };
}

function findFirstNamedSignalKey(
  value: string | null | undefined,
  signals: readonly SingleDomainResultPayload['signals'][number][],
): string {
  if (!value) {
    return '';
  }

  const candidates = signals.flatMap((signal) => {
    const tokens = [signal.signal_key, signal.signal_label]
      .map((token) => token.trim())
      .filter(Boolean);

    return tokens.map((token) => {
      const match = new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`, 'i').exec(value);
      return match?.index === undefined
        ? null
        : {
            signalKey: signal.signal_key,
            index: match.index,
          };
    }).filter((candidate): candidate is { signalKey: string; index: number } => Boolean(candidate));
  });

  const firstCandidate = candidates.sort((left, right) => (
    left.index - right.index || left.signalKey.localeCompare(right.signalKey)
  ))[0];

  return firstCandidate?.signalKey ?? '';
}

function resolveLimitationWeakerSignalKey(options: {
  rankedWeakerSignalKey: string;
  selectedLink: string;
  rebalanceIntro: string;
  signals: readonly SingleDomainResultPayload['signals'][number][];
}): string {
  const signalKeys = new Set(options.signals.map((signal) => signal.signal_key));
  const selectedLinkPrefix = extractLeadingSignalPrefix(options.selectedLink, signalKeys);
  const rebalanceIntroPrefix = extractLeadingSignalPrefix(options.rebalanceIntro, signalKeys);
  const firstNamedSignalKey = findFirstNamedSignalKey(options.selectedLink, options.signals);
  const explicitSignalKey = selectedLinkPrefix?.signalKey ?? rebalanceIntroPrefix?.signalKey ?? '';

  if (explicitSignalKey && firstNamedSignalKey && explicitSignalKey !== firstNamedSignalKey) {
    return '';
  }

  if (explicitSignalKey) {
    return explicitSignalKey;
  }

  if (firstNamedSignalKey) {
    return firstNamedSignalKey;
  }

  return options.rankedWeakerSignalKey;
}

function stripKnownSignalPrefix(
  value: string,
  signals: readonly SingleDomainResultPayload['signals'][number][],
): string {
  const prefix = extractLeadingSignalPrefix(value, new Set(signals.map((signal) => signal.signal_key)));

  return prefix?.text ?? value;
}

export function buildSingleDomainResultComposerInput(
  payload: SingleDomainResultPayload,
): ResultComposerPreviewInput {
  const orderedSignals = [...payload.signals].sort((left, right) => (
    left.rank - right.rank || left.signal_key.localeCompare(right.signal_key)
  ));
  const activePairKey = payload.hero.pair_key || payload.pairSummary.pair_key || payload.balancing.pair_key;
  const weakerSignal = orderedSignals.find(
    (signal) => getSignalDriverRole(signal) === 'range_limitation',
  ) ?? orderedSignals[orderedSignals.length - 1] ?? null;
  const limitationWeakerSignalLink = payload.balancing.system_risk_paragraph || payload.balancing.rebalance_intro;
  const limitationWeakerSignalKey = resolveLimitationWeakerSignalKey({
    rankedWeakerSignalKey: weakerSignal?.signal_key ?? '',
    selectedLink: limitationWeakerSignalLink,
    rebalanceIntro: payload.balancing.rebalance_intro,
    signals: orderedSignals,
  });

  const drivers = orderedSignals.map<SingleDomainDriversImportRow>((signal) => {
    const driverRole = getSignalDriverRole(signal);

    return {
      domain_key: payload.metadata.domainKey,
      section_key: 'drivers',
      pair_key: activePairKey,
      signal_key: signal.signal_key,
      driver_role: driverRole,
      claim_type: SINGLE_DOMAIN_DRIVER_ROLE_TO_CLAIM_TYPE[driverRole],
      claim_text: getSignalDriverClaimText(signal, driverRole),
      materiality: getSignalDriverMateriality(driverRole),
      priority: String(signal.rank),
    };
  });

  const underplayedSignals = new Set(
    drivers
      .filter((row) => row.driver_role === 'range_limitation')
      .map((row) => row.signal_key),
  );

  const applicationRows: SingleDomainApplicationImportRow[] = [
    ...payload.application.strengths.map((item, index) => ({
      domain_key: payload.metadata.domainKey,
      section_key: 'application' as const,
      pair_key: activePairKey,
      focus_area: 'rely_on' as const,
      guidance_type: 'applied_strength' as const,
      signal_key: item.signal_key,
      guidance_text: item.statement,
      linked_claim_type: 'applied_strength' as const,
      priority: String(index + 1),
    })),
    ...payload.application.watchouts.map((item, index) => {
      const isUnderplayed = underplayedSignals.has(item.signal_key);
      return {
        domain_key: payload.metadata.domainKey,
        section_key: 'application' as const,
        pair_key: activePairKey,
        focus_area: 'notice' as const,
        guidance_type: isUnderplayed ? 'range_recovery_action' as const : 'watchout' as const,
        signal_key: item.signal_key,
        guidance_text: item.statement,
        linked_claim_type: isUnderplayed ? 'driver_range_limitation' as const : 'watchout' as const,
        priority: String(index + 1),
      };
    }),
    ...payload.application.developmentFocus.map((item, index) => {
      const isUnderplayed = underplayedSignals.has(item.signal_key);
      return {
        domain_key: payload.metadata.domainKey,
        section_key: 'application' as const,
        pair_key: activePairKey,
        focus_area: 'develop' as const,
        guidance_type: isUnderplayed ? 'range_recovery_action' as const : 'development_focus' as const,
        signal_key: item.signal_key,
        guidance_text: item.statement,
        linked_claim_type: isUnderplayed ? 'driver_range_limitation' as const : 'development_focus' as const,
        priority: String(index + 1),
      };
    }),
  ];

  return {
    domain_key: payload.metadata.domainKey,
    domain_title: payload.intro.section_title,
    pair_key: activePairKey,
    ranked_signals: orderedSignals.map((signal) => ({
      signal_key: signal.signal_key,
      signal_label: signal.signal_label,
      rank: signal.rank,
      normalized_score: signal.normalized_score,
      materially_underplayed: getSignalDriverRole(signal) === 'range_limitation',
    })),
    driver_rows: orderedSignals.map((signal) => ({
      signal_key: signal.signal_key,
      signal_label: signal.signal_label,
      rank: signal.rank,
      driver_role: getSignalDriverRole(signal),
      materiality: getSignalDriverMateriality(getSignalDriverRole(signal)),
      claim_text: getSignalDriverClaimText(signal, getSignalDriverRole(signal)),
    })),
    sections: {
      intro: {
        domain_key: payload.metadata.domainKey,
        section_key: 'intro',
        domain_title: payload.intro.section_title,
        domain_definition: payload.intro.intro_paragraph,
        domain_scope: payload.intro.meaning_paragraph,
        interpretation_guidance: payload.intro.bridge_to_signals,
        intro_note: payload.intro.blueprint_context_line,
      },
      hero: {
        domain_key: payload.metadata.domainKey,
        section_key: 'hero',
        pair_key: activePairKey,
        pattern_label: payload.hero.hero_headline,
        hero_statement: payload.hero.hero_opening,
        hero_expansion: payload.hero.hero_strength_paragraph,
        hero_strength: payload.hero.hero_tension_paragraph || payload.hero.hero_close_paragraph,
      },
      drivers,
      pair: {
        domain_key: payload.metadata.domainKey,
        section_key: 'pair',
        pair_key: activePairKey,
        pair_label: payload.pairSummary.pair_headline,
        interaction_claim: payload.pairSummary.pair_opening_paragraph,
        synergy_claim: payload.pairSummary.pair_strength_paragraph,
        tension_claim: payload.pairSummary.pair_tension_paragraph,
        pair_outcome: payload.pairSummary.pair_close_paragraph,
      },
      limitation: {
        domain_key: payload.metadata.domainKey,
        section_key: 'limitation',
        pair_key: activePairKey,
        limitation_label: payload.balancing.balancing_section_title,
        pattern_cost: payload.balancing.current_pattern_paragraph,
        range_narrowing: payload.balancing.practical_meaning_paragraph,
        weaker_signal_key: limitationWeakerSignalKey,
        weaker_signal_link: stripKnownSignalPrefix(limitationWeakerSignalLink, orderedSignals),
      },
      application: applicationRows,
    },
  };
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function toParagraphs(...values: Array<string | null | undefined>): readonly string[] {
  return values.filter(hasText).map((value) => value!.trim());
}

function getSignalLabel(
  input: ResultComposerPreviewInput,
  signalKey: string | null | undefined,
): string {
  if (!signalKey) {
    return 'the signal';
  }

  return input.ranked_signals.find((signal) => signal.signal_key === signalKey)?.signal_label
    ?? signalKey;
}

function getPairSignalKeys(pairKey: string): readonly [string, string] | null {
  const [primaryKey, secondaryKey] = pairKey.split('_');

  if (!primaryKey || !secondaryKey) {
    return null;
  }

  return [primaryKey, secondaryKey];
}

function getPairSignalLabels(input: ResultComposerPreviewInput): {
  primaryKey: string;
  secondaryKey: string;
  primaryLabel: string;
  secondaryLabel: string;
} {
  const pairSignalKeys = getPairSignalKeys(input.pair_key);
  const ranked = [...input.ranked_signals].sort((left, right) => left.rank - right.rank);
  const rankedPairSignals = pairSignalKeys
    ? ranked.filter((signal) => pairSignalKeys.includes(signal.signal_key))
    : [];
  const primaryKey = rankedPairSignals[0]?.signal_key ?? ranked[0]?.signal_key ?? pairSignalKeys?.[0] ?? '';
  const secondaryKey = rankedPairSignals.find((signal) => signal.signal_key !== primaryKey)?.signal_key
    ?? ranked.find((signal) => signal.signal_key !== primaryKey)?.signal_key
    ?? pairSignalKeys?.find((signalKey) => signalKey !== primaryKey)
    ?? primaryKey;

  return {
    primaryKey,
    secondaryKey,
    primaryLabel: getSignalLabel(input, primaryKey),
    secondaryLabel: getSignalLabel(input, secondaryKey),
  };
}

function findDriverClaim(
  input: ResultComposerPreviewInput,
  signalKey: string,
  preferredRoles: readonly SingleDomainDriversImportRow['driver_role'][],
): string {
  const rows = sortRowsByPriority(input.sections.drivers)
    .filter((row) => row.signal_key === signalKey);
  const preferred = rows.find((row) => preferredRoles.includes(row.driver_role));

  return preferred?.claim_text ?? rows[0]?.claim_text ?? '';
}

function getWeakerSignalKey(input: ResultComposerPreviewInput): string {
  return input.sections.limitation.weaker_signal_key
    || input.sections.drivers.find((row) => row.driver_role === 'range_limitation')?.signal_key
    || [...input.ranked_signals].sort((left, right) => right.rank - left.rank)[0]?.signal_key
    || '';
}

function buildFallbackHeroParagraphs(input: ResultComposerPreviewInput): readonly string[] {
  const pair = getPairSignalLabels(input);
  const primaryClaim = findDriverClaim(input, pair.primaryKey, ['primary_driver']);
  const secondaryClaim = findDriverClaim(input, pair.secondaryKey, ['secondary_driver']);

  return toParagraphs(
    `${pair.primaryLabel} and ${pair.secondaryLabel}`,
    `This result is led by ${pair.primaryLabel}, with ${pair.secondaryLabel} providing the strongest secondary signal.`,
    primaryClaim,
    secondaryClaim,
  );
}

function buildFallbackPairParagraphs(input: ResultComposerPreviewInput): readonly string[] {
  const pair = getPairSignalLabels(input);
  const primaryClaim = findDriverClaim(input, pair.primaryKey, ['primary_driver']);
  const secondaryClaim = findDriverClaim(input, pair.secondaryKey, ['secondary_driver']);

  return toParagraphs(
    `${pair.primaryLabel} and ${pair.secondaryLabel}`,
    `The combination of ${pair.primaryLabel} and ${pair.secondaryLabel} creates a pattern where the strongest signal sets the main emphasis and the second signal shapes how that emphasis is expressed.`,
    primaryClaim,
    secondaryClaim,
    `This is a signal-level synthesis because no pair-specific authored language exists for ${input.pair_key}.`,
  );
}

function buildFallbackLimitationParagraphs(input: ResultComposerPreviewInput): readonly string[] {
  const pair = getPairSignalLabels(input);
  const weakerKey = getWeakerSignalKey(input);
  const weakerLabel = getSignalLabel(input, weakerKey);
  const primaryLimitation = findDriverClaim(input, pair.primaryKey, [
    'range_limitation',
    'primary_driver',
  ]);
  const weakerTension = findDriverClaim(input, weakerKey, ['range_limitation']);

  return toParagraphs(
    `When ${pair.primaryLabel} needs more ${weakerLabel}`,
    `When ${pair.primaryLabel} dominates without enough ${weakerLabel}, the pattern may become narrower than the situation requires.`,
    primaryLimitation,
    weakerKey && weakerTension ? `${weakerKey}: ${weakerTension}` : weakerTension,
  );
}

function splitStoredParagraphs(value: string): readonly string[] {
  return value
    .split(/\r?\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function compactText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function legacyPairLanguageReferencesSignals(params: {
  pairKey: string;
  rowText: string;
  primarySignalKey: string;
  secondarySignalKey: string;
  primarySignalLabel: string;
  secondarySignalLabel: string;
}): boolean {
  const normalized = compactText(params.rowText);
  const pairKeyToken = compactText(params.pairKey);
  const reversedPairKeyToken = compactText(params.pairKey.split('_').reverse().join('_'));
  const primaryTokens = [
    params.primarySignalKey,
    params.primarySignalLabel,
  ].map(compactText).filter(Boolean);
  const secondaryTokens = [
    params.secondarySignalKey,
    params.secondarySignalLabel,
  ].map(compactText).filter(Boolean);

  if (normalized.includes(pairKeyToken) || normalized.includes(reversedPairKeyToken)) {
    return true;
  }

  return primaryTokens.some((token) => normalized.includes(token))
    && secondaryTokens.some((token) => normalized.includes(token));
}

function getSpecificLegacyPairRow<TRow>(params: {
  row: TRow | undefined;
  pairKey: string;
  primarySignalKey: string;
  secondarySignalKey: string;
  primarySignalLabel: string;
  secondarySignalLabel: string;
  fields: (row: TRow) => readonly string[];
}): TRow | undefined {
  if (!params.row) {
    return undefined;
  }

  return legacyPairLanguageReferencesSignals({
    ...params,
    rowText: params.fields(params.row).join(' '),
  })
    ? params.row
    : undefined;
}

function buildSignalPairOptions(signalKeys: readonly string[]): readonly string[] {
  const pairKeys: string[] = [];

  for (let leftIndex = 0; leftIndex < signalKeys.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < signalKeys.length; rightIndex += 1) {
      const left = signalKeys[leftIndex];
      const right = signalKeys[rightIndex];
      if (!left || !right) {
        continue;
      }

      pairKeys.push(buildSingleDomainPairKey(left, right));
    }
  }

  return pairKeys;
}

function chooseActivePairKey(
  bundle: SingleDomainLanguageBundle,
  fallbackPairKeys: readonly string[],
  requestedPairKey?: string,
): string | null {
  const storedPairKeys = [
    ...(bundle.DRIVER_CLAIMS ?? []).map((row) => row.pair_key),
    ...bundle.HERO_PAIRS.map((row) => row.pair_key),
    ...bundle.PAIR_SUMMARIES.map((row) => row.pair_key),
    ...bundle.BALANCING_SECTIONS.map((row) => row.pair_key),
  ].filter(Boolean);
  const uniquePairKeys = [...new Set([...storedPairKeys, ...fallbackPairKeys])];

  if (requestedPairKey && uniquePairKeys.includes(requestedPairKey)) {
    return requestedPairKey;
  }

  return uniquePairKeys[0] ?? null;
}

function buildDriverRowsFromLegacy(
  bundle: SingleDomainLanguageBundle,
  activePairKey: string,
): readonly SingleDomainDriversImportRow[] {
  const rows: SingleDomainDriversImportRow[] = [];

  bundle.SIGNAL_CHAPTERS.forEach((signalRow) => {
    splitStoredParagraphs(signalRow.chapter_intro_primary).forEach((claimText, index) => {
      rows.push({
        domain_key: '',
        section_key: 'drivers',
        pair_key: activePairKey,
        signal_key: signalRow.signal_key,
        driver_role: 'primary_driver',
        claim_type: 'driver_primary',
        claim_text: claimText,
        materiality: 'core',
        priority: String(index + 1),
      });
    });
    splitStoredParagraphs(signalRow.chapter_intro_secondary).forEach((claimText, index) => {
      rows.push({
        domain_key: '',
        section_key: 'drivers',
        pair_key: activePairKey,
        signal_key: signalRow.signal_key,
        driver_role: 'secondary_driver',
        claim_type: 'driver_secondary',
        claim_text: claimText,
        materiality: 'core',
        priority: String(index + 1),
      });
    });
    splitStoredParagraphs(signalRow.chapter_intro_supporting).forEach((claimText, index) => {
      rows.push({
        domain_key: '',
        section_key: 'drivers',
        pair_key: activePairKey,
        signal_key: signalRow.signal_key,
        driver_role: 'supporting_context',
        claim_type: 'driver_supporting_context',
        claim_text: claimText,
        materiality: 'supporting',
        priority: String(index + 1),
      });
    });
    splitStoredParagraphs(signalRow.chapter_intro_underplayed).forEach((claimText, index) => {
      rows.push({
        domain_key: '',
        section_key: 'drivers',
        pair_key: activePairKey,
        signal_key: signalRow.signal_key,
        driver_role: 'range_limitation',
        claim_type: 'driver_range_limitation',
        claim_text: claimText,
        materiality: 'material_underplay',
        priority: String(index + 1),
      });
    });
  });

  return rows;
}

function buildDriverRowsFromClaims(
  bundle: SingleDomainLanguageBundle,
  activePairKey: string,
): readonly SingleDomainDriversImportRow[] {
  const roleOrder: Record<SingleDomainDriversImportRow['driver_role'], number> = {
    primary_driver: 0,
    secondary_driver: 1,
    supporting_context: 2,
    range_limitation: 3,
  };

  return [...(bundle.DRIVER_CLAIMS ?? [])]
    .filter((row) => row.pair_key === activePairKey)
    .sort((left, right) => (
      roleOrder[left.driver_role] - roleOrder[right.driver_role]
      || left.priority - right.priority
      || left.signal_key.localeCompare(right.signal_key)
    ))
    .map((row) => ({
      domain_key: row.domain_key,
      section_key: 'drivers',
      pair_key: row.pair_key,
      signal_key: row.signal_key,
      driver_role: row.driver_role,
      claim_type: row.claim_type,
      claim_text: row.claim_text,
      materiality: row.materiality,
      priority: String(row.priority),
    }));
}

function buildRankedSignals(
  assessment: AdminAssessmentDetailViewModel,
  driverRows: readonly SingleDomainDriversImportRow[],
): readonly SingleDomainPreviewSignal[] {
  const roleScore = (signalKey: string): number => {
    if (driverRows.some((row) => row.signal_key === signalKey && row.driver_role === 'primary_driver')) {
      return 400;
    }
    if (driverRows.some((row) => row.signal_key === signalKey && row.driver_role === 'secondary_driver')) {
      return 300;
    }
    if (driverRows.some((row) => row.signal_key === signalKey && row.driver_role === 'supporting_context')) {
      return 200;
    }
    if (driverRows.some((row) => row.signal_key === signalKey && row.driver_role === 'range_limitation')) {
      return 100;
    }
    return 0;
  };

  return [...assessment.availableSignals]
    .sort((left, right) => {
      const scoreDelta = roleScore(right.signalKey) - roleScore(left.signalKey);
      return scoreDelta === 0
        ? left.signalOrderIndex - right.signalOrderIndex
        : scoreDelta;
    })
    .map((signal, index, ordered) => ({
      signal_key: signal.signalKey,
      signal_label: signal.signalLabel,
      rank: index + 1,
      normalized_score: Math.max(100 - index * Math.max(10, Math.floor(60 / Math.max(ordered.length, 1))), 12),
      materially_underplayed: driverRows.some(
        (row) => row.signal_key === signal.signalKey && row.driver_role === 'range_limitation',
      ),
    }));
}

function buildApplicationRowsFromLegacy(
  bundle: SingleDomainLanguageBundle,
  domainKey: string,
  activePairKey: string,
  underplayedSignals: ReadonlySet<string>,
): readonly SingleDomainApplicationImportRow[] {
  const rows: SingleDomainApplicationImportRow[] = [];

  bundle.APPLICATION_STATEMENTS.forEach((statementRow) => {
    [statementRow.strength_statement_1, statementRow.strength_statement_2]
      .filter(hasText)
      .forEach((guidanceText, index) => {
        rows.push({
          domain_key: domainKey,
          section_key: 'application',
          pair_key: activePairKey,
          focus_area: 'rely_on',
          guidance_type: 'applied_strength',
          signal_key: statementRow.signal_key,
          guidance_text: guidanceText.trim(),
          linked_claim_type: 'driver_primary',
          priority: String(index + 1),
        });
      });

    [statementRow.watchout_statement_1, statementRow.watchout_statement_2]
      .filter(hasText)
      .forEach((guidanceText, index) => {
        rows.push({
          domain_key: domainKey,
          section_key: 'application',
          pair_key: activePairKey,
          focus_area: 'notice',
          guidance_type: underplayedSignals.has(statementRow.signal_key)
            ? 'range_recovery_action'
            : 'watchout',
          signal_key: statementRow.signal_key,
          guidance_text: guidanceText.trim(),
          linked_claim_type: underplayedSignals.has(statementRow.signal_key)
            ? 'driver_range_limitation'
            : 'pattern_cost',
          priority: String(index + 1),
        });
      });

    [statementRow.development_statement_1, statementRow.development_statement_2]
      .filter(hasText)
      .forEach((guidanceText, index) => {
        rows.push({
          domain_key: domainKey,
          section_key: 'application',
          pair_key: activePairKey,
          focus_area: 'develop',
          guidance_type: underplayedSignals.has(statementRow.signal_key)
            ? 'range_recovery_action'
            : 'development_focus',
          signal_key: statementRow.signal_key,
          guidance_text: guidanceText.trim(),
          linked_claim_type: underplayedSignals.has(statementRow.signal_key)
            ? 'driver_range_limitation'
            : 'development_focus',
          priority: String(index + 1),
        });
      });
  });

  return rows;
}

export function buildSingleDomainDraftPreviewInput(
  assessment: AdminAssessmentDetailViewModel,
  selectedPairKey?: string,
): DraftPreviewAdapterResult {
  const domain = assessment.authoredDomains[0];
  if (!domain) {
    return {
      success: false,
      reason: 'Author the single domain before opening composer preview.',
    };
  }

  const pairOptions = buildSignalPairOptions(
    assessment.availableSignals.map((signal) => signal.signalKey),
  );
  const activePairKey = chooseActivePairKey(
    assessment.singleDomainLanguageBundle,
    pairOptions,
    selectedPairKey,
  );

  if (!activePairKey) {
    return {
      success: false,
      reason: 'Compose at least one pair-backed section before opening draft preview.',
    };
  }

  const introRow = assessment.singleDomainLanguageBundle.DOMAIN_FRAMING.find(
    (row) => row.domain_key === domain.domainKey,
  ) ?? assessment.singleDomainLanguageBundle.DOMAIN_FRAMING[0];
  const heroRow = assessment.singleDomainLanguageBundle.HERO_PAIRS.find(
    (row) => row.pair_key === activePairKey,
  );
  const pairRow = assessment.singleDomainLanguageBundle.PAIR_SUMMARIES.find(
    (row) => row.pair_key === activePairKey,
  );
  const limitationRow = assessment.singleDomainLanguageBundle.BALANCING_SECTIONS.find(
    (row) => row.pair_key === activePairKey,
  );
  const [primarySignalKey, secondarySignalKey] = getPairSignalKeys(activePairKey) ?? ['', ''];
  const primarySignal = assessment.availableSignals.find((signal) => signal.signalKey === primarySignalKey);
  const secondarySignal = assessment.availableSignals.find((signal) => signal.signalKey === secondarySignalKey);
  const specificHeroRow = getSpecificLegacyPairRow({
    row: heroRow,
    pairKey: activePairKey,
    primarySignalKey,
    secondarySignalKey,
    primarySignalLabel: primarySignal?.signalLabel ?? primarySignalKey,
    secondarySignalLabel: secondarySignal?.signalLabel ?? secondarySignalKey,
    fields: (row) => [
      row.hero_headline,
      row.hero_subheadline,
      row.hero_opening,
      row.hero_strength_paragraph,
      row.hero_tension_paragraph,
      row.hero_close_paragraph,
    ],
  });
  const specificPairRow = getSpecificLegacyPairRow({
    row: pairRow,
    pairKey: activePairKey,
    primarySignalKey,
    secondarySignalKey,
    primarySignalLabel: primarySignal?.signalLabel ?? primarySignalKey,
    secondarySignalLabel: secondarySignal?.signalLabel ?? secondarySignalKey,
    fields: (row) => [
      row.pair_section_title,
      row.pair_headline,
      row.pair_opening_paragraph,
      row.pair_strength_paragraph,
      row.pair_tension_paragraph,
      row.pair_close_paragraph,
    ],
  });
  const specificLimitationRow = getSpecificLegacyPairRow({
    row: limitationRow,
    pairKey: activePairKey,
    primarySignalKey,
    secondarySignalKey,
    primarySignalLabel: primarySignal?.signalLabel ?? primarySignalKey,
    secondarySignalLabel: secondarySignal?.signalLabel ?? secondarySignalKey,
    fields: (row) => [
      row.balancing_section_title,
      row.current_pattern_paragraph,
      row.practical_meaning_paragraph,
      row.system_risk_paragraph,
      row.rebalance_intro,
      row.rebalance_action_1,
      row.rebalance_action_2,
      row.rebalance_action_3,
    ],
  });

  const pairScopedDriverRows = buildDriverRowsFromClaims(
    assessment.singleDomainLanguageBundle,
    activePairKey,
  );
  const driverRows = (
    pairScopedDriverRows.length > 0
      ? pairScopedDriverRows
      : buildDriverRowsFromLegacy(
        assessment.singleDomainLanguageBundle,
        activePairKey,
      )
  ).map((row) => ({
    ...row,
    domain_key: row.domain_key || domain.domainKey,
  }));

  const underplayedSignals = new Set(
    driverRows
      .filter((row) => row.driver_role === 'range_limitation')
      .map((row) => row.signal_key),
  );

  const applicationRows = buildApplicationRowsFromLegacy(
    assessment.singleDomainLanguageBundle,
    domain.domainKey,
    activePairKey,
    underplayedSignals,
  );

  const input: ResultComposerPreviewInput = {
    domain_key: domain.domainKey,
    domain_title: domain.label,
    pair_key: activePairKey,
    ranked_signals: buildRankedSignals(assessment, driverRows),
    driver_rows: driverRows.map((row, index) => {
      const signal = assessment.availableSignals.find((entry) => entry.signalKey === row.signal_key);
      return {
        signal_key: row.signal_key,
        signal_label: signal?.signalLabel ?? row.signal_key,
        rank: index + 1,
        driver_role: row.driver_role,
        materiality: row.materiality,
        claim_text: row.claim_text,
      };
    }),
    sections: {
      intro: {
        domain_key: domain.domainKey,
        section_key: 'intro',
        domain_title: introRow?.section_title ?? domain.label,
        domain_definition: introRow?.intro_paragraph ?? '',
        domain_scope: introRow?.meaning_paragraph ?? '',
        interpretation_guidance: introRow?.bridge_to_signals ?? '',
        intro_note: introRow?.blueprint_context_line ?? '',
      },
      hero: {
        domain_key: domain.domainKey,
        section_key: 'hero',
        pair_key: activePairKey,
        pattern_label: specificHeroRow?.hero_headline ?? '',
        hero_statement: specificHeroRow?.hero_opening ?? '',
        hero_expansion: specificHeroRow?.hero_strength_paragraph ?? '',
        hero_strength: specificHeroRow?.hero_subheadline ?? specificHeroRow?.hero_tension_paragraph ?? '',
      },
      drivers: driverRows,
      pair: {
        domain_key: domain.domainKey,
        section_key: 'pair',
        pair_key: activePairKey,
        pair_label: specificPairRow?.pair_section_title ?? specificPairRow?.pair_headline ?? '',
        interaction_claim: specificPairRow?.pair_opening_paragraph ?? '',
        synergy_claim: specificPairRow?.pair_strength_paragraph ?? '',
        tension_claim: specificPairRow?.pair_tension_paragraph ?? '',
        pair_outcome: specificPairRow?.pair_close_paragraph ?? '',
      },
      limitation: {
        domain_key: domain.domainKey,
        section_key: 'limitation',
        pair_key: activePairKey,
        limitation_label: specificLimitationRow?.balancing_section_title ?? '',
        pattern_cost: specificLimitationRow?.current_pattern_paragraph ?? '',
        range_narrowing: specificLimitationRow?.practical_meaning_paragraph ?? '',
        weaker_signal_key:
          specificLimitationRow?.rebalance_intro?.split(':')[0]?.trim()
            && underplayedSignals.has(specificLimitationRow.rebalance_intro.split(':')[0].trim())
            ? specificLimitationRow.rebalance_intro.split(':')[0].trim()
            : [...underplayedSignals][0] ?? '',
        weaker_signal_link: specificLimitationRow?.system_risk_paragraph ?? specificLimitationRow?.rebalance_action_1 ?? '',
      },
      application: applicationRows,
    },
  };

  return {
    success: true,
    input,
    pairOptions,
    activePairKey,
  };
}

function buildSectionValidationMessages(
  input: ResultComposerPreviewInput,
  sectionKey: SingleDomainNarrativeSectionKey,
): readonly string[] {
  const validation = validateSingleDomainNarrativePreview(input);
  const allowedClaims = new Set(SINGLE_DOMAIN_ALLOWED_CLAIMS_BY_SECTION[sectionKey]);

  return validation.issues
    .filter((issue) => {
      if (issue.code === 'missing_required_sections') {
        return issue.message.includes(sectionKey);
      }
      if (issue.code === 'hero_pair_duplication') {
        return sectionKey === 'hero' || sectionKey === 'pair';
      }
      if (issue.code === 'weaker_signal_coverage') {
        return sectionKey === 'drivers';
      }
      if (issue.code === 'limitation_weaker_signal_linkage') {
        return sectionKey === 'limitation';
      }
      if (issue.code === 'application_weaker_signal_linkage') {
        return sectionKey === 'application';
      }
      if (issue.code === 'section_role_collisions') {
        return [...allowedClaims].some((claim) => issue.message.includes(claim));
      }
      return false;
    })
    .map((issue) => issue.message);
}

function buildProvenance(
  input: ResultComposerPreviewInput,
  sectionKey: SingleDomainNarrativeSectionKey,
): ComposedSectionProvenance {
  switch (sectionKey) {
    case 'intro':
      return {
        sectionKey,
        sourceDatasetKey: SECTION_DATASET_KEYS[sectionKey],
        sourceRowCount: 1,
        sourceRowIdentifiers: [input.sections.intro.domain_key],
        validationStatus: hasText(input.sections.intro.domain_definition) ? 'ready' : 'warning',
        validationMessages: buildSectionValidationMessages(input, sectionKey),
      };
    case 'hero':
      return {
        sectionKey,
        sourceDatasetKey: SECTION_DATASET_KEYS[sectionKey],
        sourceRowCount: 1,
        sourceRowIdentifiers: [input.sections.hero.pair_key],
        validationStatus: hasText(input.sections.hero.hero_statement) ? 'ready' : 'warning',
        validationMessages: buildSectionValidationMessages(input, sectionKey),
      };
    case 'drivers':
      return {
        sectionKey,
        sourceDatasetKey: SECTION_DATASET_KEYS[sectionKey],
        sourceRowCount: input.sections.drivers.length,
        sourceRowIdentifiers: input.sections.drivers.map(
          (row) => `${row.signal_key}:${row.driver_role}:${row.priority}`,
        ),
        validationStatus: input.sections.drivers.length > 0 ? 'ready' : 'warning',
        validationMessages: buildSectionValidationMessages(input, sectionKey),
      };
    case 'pair':
      return {
        sectionKey,
        sourceDatasetKey: SECTION_DATASET_KEYS[sectionKey],
        sourceRowCount: 1,
        sourceRowIdentifiers: [input.sections.pair.pair_key],
        validationStatus: hasText(input.sections.pair.interaction_claim) ? 'ready' : 'warning',
        validationMessages: buildSectionValidationMessages(input, sectionKey),
      };
    case 'limitation':
      return {
        sectionKey,
        sourceDatasetKey: SECTION_DATASET_KEYS[sectionKey],
        sourceRowCount: 1,
        sourceRowIdentifiers: [input.sections.limitation.pair_key],
        validationStatus: hasText(input.sections.limitation.pattern_cost) ? 'ready' : 'warning',
        validationMessages: buildSectionValidationMessages(input, sectionKey),
      };
    case 'application':
      return {
        sectionKey,
        sourceDatasetKey: SECTION_DATASET_KEYS[sectionKey],
        sourceRowCount: input.sections.application.length,
        sourceRowIdentifiers: input.sections.application.map(
          (row) => `${row.signal_key}:${row.focus_area}:${row.guidance_type}:${row.priority}`,
        ),
        validationStatus: input.sections.application.length > 0 ? 'ready' : 'warning',
        validationMessages: buildSectionValidationMessages(input, sectionKey),
      };
  }
}

function sortRowsByPriority<T extends { priority: string }>(rows: readonly T[]): readonly T[] {
  return [...rows].sort((left, right) => Number(left.priority) - Number(right.priority));
}

function buildApplicationFocusItems(
  rows: readonly SingleDomainApplicationImportRow[],
): ComposedNarrativeSection['focusItems'] {
  const focusDefinitions: ReadonlyArray<{
    focusArea: SingleDomainApplicationImportRow['focus_area'];
    label: string;
  }> = [
    { focusArea: 'rely_on', label: 'Rely on' },
    { focusArea: 'notice', label: 'Notice' },
    { focusArea: 'develop', label: 'Develop' },
  ];

  return focusDefinitions.map((definition) => ({
    label: definition.label,
    content: sortRowsByPriority(rows)
      .filter((row) => row.focus_area === definition.focusArea)
      .map((row) => row.guidance_text),
  }));
}

function buildDriversFocusItems(
  rows: readonly SingleDomainDriversImportRow[],
): ComposedNarrativeSection['focusItems'] {
  const roleDefinitions: ReadonlyArray<{
    role: SingleDomainDriversImportRow['driver_role'];
    label: string;
  }> = [
    { role: 'primary_driver', label: 'Primary driver' },
    { role: 'secondary_driver', label: 'Secondary driver' },
    { role: 'supporting_context', label: 'Supporting context' },
    { role: 'range_limitation', label: 'Range limitation' },
  ];

  return roleDefinitions.map((definition) => ({
    label: definition.label,
    content: sortRowsByPriority(rows)
      .filter((row) => row.driver_role === definition.role)
      .map((row) => row.claim_text),
  }));
}

export function composeSingleDomainReport(
  input: ResultComposerPreviewInput,
): ComposedSingleDomainReport {
  const previewValidation = validateSingleDomainNarrativePreview(input);
  const heroParagraphs = toParagraphs(
    input.sections.hero.pattern_label,
    input.sections.hero.hero_statement,
    input.sections.hero.hero_expansion,
    input.sections.hero.hero_strength,
  );
  const pairParagraphs = toParagraphs(
    input.sections.pair.pair_label,
    input.sections.pair.interaction_claim,
    input.sections.pair.synergy_claim,
    input.sections.pair.tension_claim,
    input.sections.pair.pair_outcome,
  );
  const limitationParagraphs = toParagraphs(
    input.sections.limitation.limitation_label,
    input.sections.limitation.pattern_cost,
    input.sections.limitation.range_narrowing,
    input.sections.limitation.weaker_signal_key && input.sections.limitation.weaker_signal_link
      ? `${input.sections.limitation.weaker_signal_key}: ${input.sections.limitation.weaker_signal_link}`
      : input.sections.limitation.weaker_signal_link,
  );

  const sections: ComposedNarrativeSection[] = SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS.map(
    (contract) => {
      switch (contract.section) {
        case 'intro':
          return {
            key: contract.section,
            title: SECTION_TITLES[contract.section],
            question: contract.question,
            paragraphs: toParagraphs(
              input.sections.intro.domain_definition,
              input.sections.intro.domain_scope,
              input.sections.intro.interpretation_guidance,
              input.sections.intro.intro_note,
            ),
            focusItems: [],
            provenance: buildProvenance(input, contract.section),
          };
        case 'hero':
          return {
            key: contract.section,
            title: SECTION_TITLES[contract.section],
            question: contract.question,
            paragraphs: heroParagraphs.length > 0 ? heroParagraphs : buildFallbackHeroParagraphs(input),
            focusItems: [],
            provenance: buildProvenance(input, contract.section),
          };
        case 'drivers':
          return {
            key: contract.section,
            title: SECTION_TITLES[contract.section],
            question: contract.question,
            paragraphs: [],
            focusItems: buildDriversFocusItems(input.sections.drivers),
            provenance: buildProvenance(input, contract.section),
          };
        case 'pair':
          return {
            key: contract.section,
            title: SECTION_TITLES[contract.section],
            question: contract.question,
            paragraphs: pairParagraphs.length > 0 ? pairParagraphs : buildFallbackPairParagraphs(input),
            focusItems: [],
            provenance: buildProvenance(input, contract.section),
          };
        case 'limitation':
          return {
            key: contract.section,
            title: SECTION_TITLES[contract.section],
            question: contract.question,
            paragraphs: limitationParagraphs.length > 0
              ? limitationParagraphs
              : buildFallbackLimitationParagraphs(input),
            focusItems: [],
            provenance: buildProvenance(input, contract.section),
          };
        case 'application':
          return {
            key: contract.section,
            title: SECTION_TITLES[contract.section],
            question: contract.question,
            paragraphs: [],
            focusItems: buildApplicationFocusItems(input.sections.application),
            provenance: buildProvenance(input, contract.section),
          };
      }
    },
  );

  return {
    domainKey: input.domain_key,
    domainTitle: input.domain_title,
    pairKey: input.pair_key,
    sections,
    previewValidation,
  };
}

export function getClaimOwnerSection(
  claimOwnership: SingleDomainClaimOwnership,
): SingleDomainNarrativeSectionKey | null {
  for (const contract of SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS) {
    const claims = SINGLE_DOMAIN_ALLOWED_CLAIMS_BY_SECTION[contract.section] as readonly SingleDomainClaimOwnership[];
    if (claims.includes(claimOwnership)) {
      return contract.section;
    }
  }

  return null;
}
