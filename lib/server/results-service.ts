import type { Queryable } from '@/lib/engine/repository-sql';
import { createResultReadModelService } from '@/lib/server/result-read-model';

export type ResultsListItem = {
  resultId: string;
  assessmentTitle: string;
  completedAt: string;
  href: string;
};

export type ResultsServiceDeps = {
  db: Queryable;
};

function getResultHref(resultId: string): string {
  return `/app/results/${resultId}`;
}

export function createResultsService(deps: ResultsServiceDeps) {
  return {
    async listResults(params: {
      userId: string;
    }): Promise<readonly ResultsListItem[]> {
      const results = await createResultReadModelService({ db: deps.db }).listAssessmentResults({
        userId: params.userId,
      });

      return Object.freeze(
        results.map((result) => ({
          resultId: result.resultId,
          assessmentTitle: result.assessmentTitle,
          completedAt: result.generatedAt ?? result.createdAt,
          href: getResultHref(result.resultId),
        })),
      );
    },
  };
}
