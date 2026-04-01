import type {
  AssessmentResultDetailViewModel,
  AssessmentResultDomainViewModel,
} from '@/lib/server/result-read-model-types';

export function getResultDetailDomains(
  result: AssessmentResultDetailViewModel,
): readonly AssessmentResultDomainViewModel[] {
  return result.domainSummaries;
}

