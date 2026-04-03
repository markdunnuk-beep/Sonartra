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

export const isCanonicalResultPayload = (value: unknown): value is CanonicalResultPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return CANONICAL_RESULT_PAYLOAD_FIELDS.every((field) => field in candidate);
};
