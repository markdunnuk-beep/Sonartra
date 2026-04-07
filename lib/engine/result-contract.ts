import type { CanonicalResultPayload } from '@/lib/engine/types';

export type {
  ResultActionBlockItem,
  ResultActionBlocks,
  CanonicalResultPayload,
  ResultDiagnostics,
  ResultDomainChapter,
  ResultDomainSignal,
  ResultHeroSummary,
  ResultIntro,
  ResultMetadata,
} from '@/lib/engine/types';

export const CANONICAL_RESULT_PAYLOAD_FIELDS = [
  'metadata',
  'intro',
  'hero',
  'domains',
  'actions',
  'diagnostics',
] as const;

export type CanonicalResultPayloadField = (typeof CANONICAL_RESULT_PAYLOAD_FIELDS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasRequiredStringField(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'string' && record[key]!.length > 0;
}

function isCanonicalHeroSummary(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isNullableString(value.headline)
    || !isNullableString(value.subheadline)
    || !isNullableString(value.summary)
    || !isNullableString(value.narrative)
    || !isNullableString(value.pressureOverlay)
    || !isNullableString(value.environmentOverlay)
    || !Array.isArray(value.domainPairWinners)
    || !Array.isArray(value.traitTotals)
    || !Array.isArray(value.matchedPatterns)
    || !Array.isArray(value.domainHighlights)
  ) {
    return false;
  }

  if (value.primaryPattern !== null) {
    if (!isRecord(value.primaryPattern)) {
      return false;
    }

    if (
      !isNullableString(value.primaryPattern.label)
      || !isNullableString(value.primaryPattern.signalKey)
      || !isNullableString(value.primaryPattern.signalLabel)
    ) {
      return false;
    }
  }

  return value.domainHighlights.every((item) => (
    isRecord(item)
    && hasRequiredStringField(item, 'domainKey')
    && hasRequiredStringField(item, 'domainLabel')
    && hasRequiredStringField(item, 'primarySignalKey')
    && hasRequiredStringField(item, 'primarySignalLabel')
    && isNullableString(item.summary)
  ));
}

function isCanonicalDomainChapterSignal(value: unknown): boolean {
  return value === null || (
    isRecord(value)
    && hasRequiredStringField(value, 'signalKey')
    && hasRequiredStringField(value, 'signalLabel')
    && isNullableString(value.summary)
    && isNullableString(value.strength)
    && isNullableString(value.watchout)
    && isNullableString(value.development)
  );
}

function isCanonicalDomainSignalPair(value: unknown): boolean {
  return value === null || (
    isRecord(value)
    && hasRequiredStringField(value, 'pairKey')
    && hasRequiredStringField(value, 'primarySignalKey')
    && hasRequiredStringField(value, 'primarySignalLabel')
    && hasRequiredStringField(value, 'secondarySignalKey')
    && hasRequiredStringField(value, 'secondarySignalLabel')
    && isNullableString(value.summary)
  );
}

function isCanonicalDomainSignalBalanceItem(value: unknown): boolean {
  return (
    isRecord(value)
    && hasRequiredStringField(value, 'signalKey')
    && hasRequiredStringField(value, 'signalLabel')
    && isFiniteNumber(value.withinDomainPercent)
    && isFiniteNumber(value.rank)
    && typeof value.isPrimary === 'boolean'
    && typeof value.isSecondary === 'boolean'
    && isNullableString(value.summary)
  );
}

function isCanonicalDomainChapter(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !hasRequiredStringField(value, 'domainKey')
    || !hasRequiredStringField(value, 'domainLabel')
    || !isNullableString(value.chapterOpening)
    || !isNullableString(value.pressureFocus)
    || !isNullableString(value.environmentFocus)
    || !isRecord(value.signalBalance)
    || !Array.isArray(value.signalBalance.items)
    || !isCanonicalDomainChapterSignal(value.primarySignal)
    || !isCanonicalDomainChapterSignal(value.secondarySignal)
    || !isCanonicalDomainSignalPair(value.signalPair)
  ) {
    return false;
  }

  return value.signalBalance.items.every((item) => isCanonicalDomainSignalBalanceItem(item));
}

function isCanonicalActionBlock(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => (
    isRecord(item)
    && hasRequiredStringField(item, 'signalKey')
    && hasRequiredStringField(item, 'signalLabel')
    && hasRequiredStringField(item, 'text')
  ));
}

function isCanonicalDiagnostics(value: unknown): boolean {
  return (
    isRecord(value)
    && hasRequiredStringField(value, 'readinessStatus')
    && isRecord(value.scoring)
    && isRecord(value.normalization)
    && isFiniteNumber(value.answeredQuestionCount)
    && isFiniteNumber(value.totalQuestionCount)
    && Array.isArray(value.missingQuestionIds)
    && hasRequiredStringField(value, 'topSignalSelectionBasis')
    && isFiniteNumber(value.rankedSignalCount)
    && isFiniteNumber(value.domainCount)
    && typeof value.zeroMass === 'boolean'
    && typeof value.zeroMassTopSignalFallbackApplied === 'boolean'
    && Array.isArray(value.warnings)
    && hasRequiredStringField(value, 'generatedAt')
  );
}

export const isCanonicalResultPayload = (value: unknown): value is CanonicalResultPayload => {
  if (!isRecord(value)) {
    return false;
  }

  if (!CANONICAL_RESULT_PAYLOAD_FIELDS.every((field) => field in value)) {
    return false;
  }

  return (
    isRecord(value.metadata)
    && hasRequiredStringField(value.metadata, 'assessmentKey')
    && hasRequiredStringField(value.metadata, 'assessmentTitle')
    && hasRequiredStringField(value.metadata, 'version')
    && hasRequiredStringField(value.metadata, 'attemptId')
    && isNullableString(value.metadata.completedAt)
    && (!('assessmentDescription' in value.metadata) || isNullableString(value.metadata.assessmentDescription))
    && isRecord(value.intro)
    && isNullableString(value.intro.assessmentDescription)
    && isCanonicalHeroSummary(value.hero)
    && Array.isArray(value.domains)
    && value.domains.every((domain) => isCanonicalDomainChapter(domain))
    && isRecord(value.actions)
    && isCanonicalActionBlock(value.actions.strengths)
    && isCanonicalActionBlock(value.actions.watchouts)
    && isCanonicalActionBlock(value.actions.developmentFocus)
    && isCanonicalDiagnostics(value.diagnostics)
  );
};
