import type { Queryable } from '@/lib/engine/repository-sql';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { getAssessmentResultHref } from '@/lib/utils/assessment-mode';

export type ResultsListItem = {
  resultId: string;
  assessmentTitle: string;
  completedAt: string;
  href: string;
  signalSnapshot: readonly {
    signalKey: string;
    signalLabel: string;
    percentage: number;
    rank: number;
  }[];
};

export type ResultsServiceDeps = {
  db: Queryable;
};

export function createResultsService(deps: ResultsServiceDeps) {
  return {
    async listResults(params: { userId: string }): Promise<readonly ResultsListItem[]> {
      const results = await createResultReadModelService({ db: deps.db }).listAssessmentResults({
        userId: params.userId,
      });

      return Object.freeze(
        results.map((result) => ({
          resultId: result.resultId,
          assessmentTitle: result.assessmentTitle,
          completedAt: result.generatedAt ?? result.createdAt,
          href: getAssessmentResultHref(result.resultId, result.mode),
          signalSnapshot: result.signalSnapshot.map((signal) => ({
            signalKey: signal.signalKey,
            signalLabel: signal.title,
            percentage: signal.percentage,
            rank: signal.rank,
          })),
        })),
      );
    },
  };
}
