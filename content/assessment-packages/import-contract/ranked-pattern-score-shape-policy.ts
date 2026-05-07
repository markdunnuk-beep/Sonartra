import {
  rankedPatternSupportedScoreShapes,
  type RankedPatternScoreShape,
} from './ranked-pattern-import-manifest';

export const RANKED_PATTERN_SCORE_SHAPE_POLICY_KEY = 'fixed_gap_v1' as const;
export const RANKED_PATTERN_SCORE_SHAPE_POLICY_VERSION = '1.0.0' as const;
export const SUPPORTED_RANKED_PATTERN_SCORE_SHAPES = rankedPatternSupportedScoreShapes;

export type RankedPatternScoreShapePolicyEntry = {
  readonly signalKey: string;
  readonly normalizedPercentage: number;
};

export type RankedPatternScoreShapePolicyDiagnostic = {
  readonly severity: 'error';
  readonly code: string;
  readonly message: string;
  readonly fieldKey?: string;
  readonly signalKey?: string;
};

export type RankedPatternScoreShapeClassificationResult = {
  readonly policyKey: typeof RANKED_PATTERN_SCORE_SHAPE_POLICY_KEY;
  readonly policyVersion: typeof RANKED_PATTERN_SCORE_SHAPE_POLICY_VERSION;
  readonly scoreShape: RankedPatternScoreShape | null;
  readonly rankedEntries: readonly RankedPatternScoreShapePolicyEntry[];
  readonly diagnostics: readonly RankedPatternScoreShapePolicyDiagnostic[];
};

export type RankedPatternScoreShapePolicySummary = {
  readonly policyKey: typeof RANKED_PATTERN_SCORE_SHAPE_POLICY_KEY;
  readonly policyVersion: typeof RANKED_PATTERN_SCORE_SHAPE_POLICY_VERSION;
  readonly supportedScoreShapes: readonly RankedPatternScoreShape[];
  readonly deterministicBasis: 'normalized_ranked_percentages';
  readonly thresholds: {
    readonly balancedMaximumSpread: number;
    readonly concentratedMinimumTopGap: number;
    readonly pairedMaximumTopGapExclusive: number;
    readonly pairedMinimumSecondToThirdGapExclusive: number;
  };
  readonly notes: readonly string[];
};

const BALANCED_MAXIMUM_SPREAD = 10;
const CONCENTRATED_MINIMUM_TOP_GAP = 15;
const PAIRED_MAXIMUM_TOP_GAP_EXCLUSIVE = 15;
const PAIRED_MINIMUM_SECOND_TO_THIRD_GAP_EXCLUSIVE = 10;

function diagnostic(
  params: RankedPatternScoreShapePolicyDiagnostic,
): RankedPatternScoreShapePolicyDiagnostic {
  return Object.freeze(params);
}

function normaliseSignalKey(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateEntries(
  entries: readonly RankedPatternScoreShapePolicyEntry[],
): readonly RankedPatternScoreShapePolicyDiagnostic[] {
  const diagnostics: RankedPatternScoreShapePolicyDiagnostic[] = [];
  if (entries.length !== 4) {
    diagnostics.push(
      diagnostic({
        severity: 'error',
        code: 'INVALID_SCORE_SHAPE_ENTRY_COUNT',
        message: 'Score-shape classification requires exactly four normalized percentage entries.',
      }),
    );
  }

  const signalKeys = entries.map((entry) => normaliseSignalKey(entry.signalKey));
  if (signalKeys.some((signalKey) => signalKey === null)) {
    diagnostics.push(
      diagnostic({
        severity: 'error',
        code: 'MISSING_SCORE_SHAPE_SIGNAL_KEY',
        message: 'Every normalized percentage entry requires a non-empty signalKey.',
        fieldKey: 'signalKey',
      }),
    );
  }

  const concreteSignalKeys = signalKeys.filter((signalKey): signalKey is string => signalKey !== null);
  if (new Set(concreteSignalKeys).size !== concreteSignalKeys.length) {
    diagnostics.push(
      diagnostic({
        severity: 'error',
        code: 'DUPLICATE_SCORE_SHAPE_SIGNAL_KEY',
        message: 'Score-shape classification requires four distinct signal keys.',
        fieldKey: 'signalKey',
      }),
    );
  }

  for (const entry of entries) {
    if (!Number.isFinite(entry.normalizedPercentage)) {
      diagnostics.push(
        diagnostic({
          severity: 'error',
          code: 'INVALID_NORMALIZED_PERCENTAGE',
          message: 'Normalized percentages must be finite numbers.',
          fieldKey: 'normalizedPercentage',
          signalKey: normaliseSignalKey(entry.signalKey) ?? undefined,
        }),
      );
    } else if (entry.normalizedPercentage < 0) {
      diagnostics.push(
        diagnostic({
          severity: 'error',
          code: 'NEGATIVE_NORMALIZED_PERCENTAGE',
          message: 'Normalized percentages must not be negative.',
          fieldKey: 'normalizedPercentage',
          signalKey: normaliseSignalKey(entry.signalKey) ?? undefined,
        }),
      );
    }
  }

  return Object.freeze(diagnostics);
}

function sortEntries(
  entries: readonly RankedPatternScoreShapePolicyEntry[],
): readonly RankedPatternScoreShapePolicyEntry[] {
  return Object.freeze(
    [...entries]
      .map((entry) => ({
        signalKey: normaliseSignalKey(entry.signalKey) ?? entry.signalKey.trim(),
        normalizedPercentage: entry.normalizedPercentage,
      }))
      .sort((left, right) => {
        const percentageDifference = right.normalizedPercentage - left.normalizedPercentage;
        return percentageDifference !== 0
          ? percentageDifference
          : left.signalKey.localeCompare(right.signalKey);
      }),
  );
}

function classifyRankedEntries(
  rankedEntries: readonly RankedPatternScoreShapePolicyEntry[],
): RankedPatternScoreShape {
  const rank1 = rankedEntries[0]!.normalizedPercentage;
  const rank2 = rankedEntries[1]!.normalizedPercentage;
  const rank3 = rankedEntries[2]!.normalizedPercentage;
  const rank4 = rankedEntries[3]!.normalizedPercentage;
  const topGap = rank1 - rank2;
  const secondToThirdGap = rank2 - rank3;
  const fullSpread = rank1 - rank4;

  // Classification order is intentional:
  // 1. balanced first so all-close distributions never become paired.
  // 2. concentrated next for a clearly dominant top signal.
  // 3. paired when top two are close and clearly separated from the lower range.
  // 4. graduated as the stepped-distribution fallback.
  //
  // These thresholds classify shape only. They do not alter raw scores, normalized percentages,
  // or ranked order, and they are named as a product-level fixed policy.
  if (fullSpread <= BALANCED_MAXIMUM_SPREAD) {
    return 'balanced';
  }
  if (topGap >= CONCENTRATED_MINIMUM_TOP_GAP) {
    return 'concentrated';
  }
  if (
    topGap < PAIRED_MAXIMUM_TOP_GAP_EXCLUSIVE &&
    secondToThirdGap > PAIRED_MINIMUM_SECOND_TO_THIRD_GAP_EXCLUSIVE
  ) {
    return 'paired';
  }
  return 'graduated';
}

export function classifyRankedPatternScoreShape(
  entries: readonly RankedPatternScoreShapePolicyEntry[],
): RankedPatternScoreShapeClassificationResult {
  const diagnostics = validateEntries(entries);
  const rankedEntries = sortEntries(entries);
  return Object.freeze({
    policyKey: RANKED_PATTERN_SCORE_SHAPE_POLICY_KEY,
    policyVersion: RANKED_PATTERN_SCORE_SHAPE_POLICY_VERSION,
    scoreShape: diagnostics.length === 0 ? classifyRankedEntries(rankedEntries) : null,
    rankedEntries,
    diagnostics,
  });
}

export function getRankedPatternScoreShapePolicySummary(): RankedPatternScoreShapePolicySummary {
  return Object.freeze({
    policyKey: RANKED_PATTERN_SCORE_SHAPE_POLICY_KEY,
    policyVersion: RANKED_PATTERN_SCORE_SHAPE_POLICY_VERSION,
    supportedScoreShapes: SUPPORTED_RANKED_PATTERN_SCORE_SHAPES,
    deterministicBasis: 'normalized_ranked_percentages',
    thresholds: Object.freeze({
      balancedMaximumSpread: BALANCED_MAXIMUM_SPREAD,
      concentratedMinimumTopGap: CONCENTRATED_MINIMUM_TOP_GAP,
      pairedMaximumTopGapExclusive: PAIRED_MAXIMUM_TOP_GAP_EXCLUSIVE,
      pairedMinimumSecondToThirdGapExclusive: PAIRED_MINIMUM_SECOND_TO_THIRD_GAP_EXCLUSIVE,
    }),
    notes: Object.freeze([
      'The policy sorts by normalized percentage descending, then signal key ascending for ties.',
      'The policy classifies score shape only and does not alter scores or rank order.',
      'balanced is checked before paired so close four-signal distributions remain balanced.',
    ]),
  });
}
