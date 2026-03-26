export type {
  ReadinessCheckSummary,
  ReadinessFailureReason,
  ResultReadinessStatus,
} from '@/lib/engine/types';

import type {
  ReadinessCheckSummary,
  ReadinessFailureReason,
  ResultReadinessStatus,
} from '@/lib/engine/types';

export const RESULT_READINESS_STATUSES = ['processing', 'ready', 'failed'] as const;

export const READINESS_FAILURE_REASONS = [
  'incomplete_responses',
  'scoring_incomplete',
  'normalization_incomplete',
  'payload_incomplete',
  'persistence_failed',
  'unknown_error',
] as const;

export const isResultReadinessStatus = (value: string): value is ResultReadinessStatus =>
  RESULT_READINESS_STATUSES.includes(value as ResultReadinessStatus);

export const isReadinessFailureReason = (value: string): value is ReadinessFailureReason =>
  READINESS_FAILURE_REASONS.includes(value as ReadinessFailureReason);

export const isReadySummary = (summary: ReadinessCheckSummary): boolean => summary.status === 'ready';
