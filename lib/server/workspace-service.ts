import type { Queryable } from '@/lib/engine/repository-sql';
import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import { listPublishedAssessmentInventory } from '@/lib/server/published-assessment-inventory';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import type { AssessmentResultListItem } from '@/lib/server/result-read-model-types';
import { getAssessmentResultHref } from '@/lib/utils/assessment-mode';

export type WorkspaceActionType = 'start' | 'resume' | 'view_result';
export type WorkspaceAssessmentStatus = 'not_started' | 'in_progress' | 'results_ready';

export type WorkspaceRecommendedAction = {
  type: WorkspaceActionType;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

export type WorkspaceAssessmentItem = {
  assessmentId: string;
  assessmentKey: string;
  title: string;
  description: string | null;
  estimatedTimeMinutes: number | null;
  questionCount: number | null;
  typeLabel: string;
  status: WorkspaceAssessmentStatus;
  statusLabel: string;
  ctaLabel: string;
  href: string;
};

export type WorkspaceLatestResult = {
  resultId: string;
  assessmentTitle: string;
  completedAt: string;
  href: string;
};

export type WorkspaceViewModel = {
  recommendedAction: WorkspaceRecommendedAction | null;
  assessments: readonly WorkspaceAssessmentItem[];
  latestResult: WorkspaceLatestResult | null;
};

export type WorkspaceServiceDeps = {
  db: Queryable;
};

function getAssessmentEntryHref(assessmentKey: string): string {
  return `/app/assessments/${assessmentKey}`;
}

function resolveAssessmentStatus(params: {
  latestReadyResult: AssessmentResultListItem | null;
  hasAttempt: boolean;
}): WorkspaceAssessmentStatus {
  if (params.latestReadyResult) {
    return 'results_ready';
  }

  if (params.hasAttempt) {
    return 'in_progress';
  }

  return 'not_started';
}

function getRecommendedActionCopy(params: {
  type: WorkspaceActionType;
  assessmentTitle: string;
}): Omit<WorkspaceRecommendedAction, 'href'> {
  switch (params.type) {
    case 'resume':
      return {
        type: 'resume',
        title: 'Continue your assessment',
        description: `You are part way through ${params.assessmentTitle}. Pick up where you left off.`,
        ctaLabel: 'Resume Assessment',
      };
    case 'view_result':
      return {
        type: 'view_result',
        title: 'Your results are ready',
        description: `Review your latest completed result for ${params.assessmentTitle}.`,
        ctaLabel: 'View Your Results',
      };
    case 'start':
      return {
        type: 'start',
        title: 'Start your first assessment',
        description: `Begin ${params.assessmentTitle} to understand how you operate across key domains.`,
        ctaLabel: 'Start Assessment',
      };
  }
}

function mapStatusLabel(status: WorkspaceAssessmentStatus): string {
  switch (status) {
    case 'results_ready':
      return 'Results ready';
    case 'in_progress':
      return 'In progress';
    case 'not_started':
      return 'Not started';
  }
}

function mapAssessmentCtaLabel(status: WorkspaceAssessmentStatus): string {
  switch (status) {
    case 'results_ready':
      return 'View Results';
    case 'in_progress':
      return 'Resume';
    case 'not_started':
      return 'Start';
  }
}

function buildLatestResult(result: AssessmentResultListItem | null): WorkspaceLatestResult | null {
  if (!result) {
    return null;
  }

  return {
    resultId: result.resultId,
    assessmentTitle: result.assessmentTitle,
    completedAt: result.generatedAt ?? result.createdAt,
    href: getAssessmentResultHref(result.resultId, result.mode),
  };
}

export function createWorkspaceService(deps: WorkspaceServiceDeps) {
  return {
    async getWorkspaceViewModel(params: {
      userId: string;
    }): Promise<WorkspaceViewModel> {
      const [inventory, readyResults] = await Promise.all([
        listPublishedAssessmentInventory(deps.db),
        createResultReadModelService({ db: deps.db }).listAssessmentResults({ userId: params.userId }),
      ]);

      const lifecycleService = createAssessmentAttemptLifecycleService({ db: deps.db });
      const readyResultByAssessmentKey = new Map(
        readyResults.map((result) => [result.assessmentKey, result] as const),
      );

      const lifecycleStates = await Promise.all(
        inventory.map((assessment) =>
          lifecycleService.getAssessmentAttemptLifecycle({
            userId: params.userId,
            assessmentKey: assessment.assessmentKey,
          }),
        ),
      );

      const assessments = inventory.map((assessment, index) => {
        const lifecycle = lifecycleStates[index];
        const latestReadyResult = readyResultByAssessmentKey.get(assessment.assessmentKey) ?? null;
        const status = resolveAssessmentStatus({
          latestReadyResult,
          hasAttempt: lifecycle.attemptId !== null,
        });

        return {
          assessmentId: assessment.assessmentId,
          assessmentKey: assessment.assessmentKey,
          title: assessment.title,
          description: assessment.description,
          estimatedTimeMinutes: null,
          questionCount: assessment.questionCount,
          typeLabel: 'Individual',
          status,
          statusLabel: mapStatusLabel(status),
          ctaLabel: mapAssessmentCtaLabel(status),
          href:
            status === 'results_ready' && latestReadyResult
              ? getAssessmentResultHref(latestReadyResult.resultId, latestReadyResult.mode)
              : getAssessmentEntryHref(assessment.assessmentKey),
        } satisfies WorkspaceAssessmentItem;
      });

      const inProgressAssessment = assessments.find((assessment) => assessment.status === 'in_progress');
      const latestReadyResult = readyResults[0] ?? null;
      const notStartedAssessment = assessments.find((assessment) => assessment.status === 'not_started');

      let recommendedAction: WorkspaceRecommendedAction | null = null;

      if (inProgressAssessment) {
        const copy = getRecommendedActionCopy({
          type: 'resume',
          assessmentTitle: inProgressAssessment.title,
        });
        recommendedAction = {
          ...copy,
          href: inProgressAssessment.href,
        };
      } else if (latestReadyResult) {
        const copy = getRecommendedActionCopy({
          type: 'view_result',
          assessmentTitle: latestReadyResult.assessmentTitle,
        });
        recommendedAction = {
          ...copy,
          href: getAssessmentResultHref(latestReadyResult.resultId, latestReadyResult.mode),
        };
      } else if (notStartedAssessment) {
        const copy = getRecommendedActionCopy({
          type: 'start',
          assessmentTitle: notStartedAssessment.title,
        });
        recommendedAction = {
          ...copy,
          href: notStartedAssessment.href,
        };
      }

      return {
        recommendedAction,
        assessments: Object.freeze(assessments),
        latestResult: buildLatestResult(latestReadyResult),
      };
    },
  };
}
