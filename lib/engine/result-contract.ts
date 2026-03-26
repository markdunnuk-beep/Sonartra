import type { CanonicalResultPayload } from '@/lib/engine/types';

export type {
  CanonicalResultPayload,
  ResultBulletItem,
  ResultDiagnostics,
  ResultMetadata,
  ResultOverviewSummary,
  ResultRankedSignal,
  ResultTopSignal,
} from '@/lib/engine/types';

export const CANONICAL_RESULT_PAYLOAD_FIELDS = [
  'metadata',
  'topSignal',
  'rankedSignals',
  'normalizedScores',
  'domainSummaries',
  'overviewSummary',
  'strengths',
  'watchouts',
  'developmentFocus',
  'diagnostics',
] as const;

export type CanonicalResultPayloadField = (typeof CANONICAL_RESULT_PAYLOAD_FIELDS)[number];

export const isCanonicalResultPayload = (value: unknown): value is CanonicalResultPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return CANONICAL_RESULT_PAYLOAD_FIELDS.every((field) => field in candidate);
};
