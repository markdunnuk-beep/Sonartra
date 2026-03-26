import { buildPayload, type CanonicalResultBuilderInput } from '@/lib/engine/result-builder-helpers';
import type { CanonicalResultPayload } from '@/lib/engine/types';

export type { CanonicalResultBuilderInput } from '@/lib/engine/result-builder-helpers';

export function buildCanonicalResultPayload(params: {
  normalizedResult: CanonicalResultBuilderInput;
}): CanonicalResultPayload {
  return buildPayload(params);
}
