import type { Queryable } from '@/lib/engine/repository-sql';
import type { SingleDomainDraftReadiness } from '@/lib/types/single-domain-runtime';
import { evaluateSingleDomainRuntimeDefinition } from '@/lib/server/single-domain-runtime-definition';

export async function getSingleDomainDraftReadiness(
  db: Queryable,
  assessmentVersionId: string,
): Promise<SingleDomainDraftReadiness> {
  const evaluation = await evaluateSingleDomainRuntimeDefinition(db, assessmentVersionId);

  return {
    isReady: evaluation.runtimeDefinition !== null
      && !evaluation.issues.some((issue) => issue.severity === 'blocking'),
    issues: evaluation.issues,
    counts: evaluation.counts,
    expectations: evaluation.expectations,
    runtimeDefinition: evaluation.runtimeDefinition,
  };
}
