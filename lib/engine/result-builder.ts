import { buildPayload, type CanonicalResultBuilderInput } from '@/lib/engine/result-builder-helpers';
import type { CanonicalResultPayload } from '@/lib/engine/types';

export type { CanonicalResultBuilderInput } from '@/lib/engine/result-builder-helpers';

export function buildCanonicalResultPayload(params: {
  normalizedResult: CanonicalResultBuilderInput;
}): CanonicalResultPayload {
  // This is the single canonical report payload persisted before retrieval.
  // Result detail views are expected to render these fields directly rather
  // than reconstructing behavioural copy in the UI.
  return buildPayload(params);
}
