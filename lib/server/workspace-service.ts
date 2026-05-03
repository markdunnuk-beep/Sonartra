import type { Queryable } from '@/lib/engine/repository-sql';
import {
  resolveAssessmentReadingViewModel,
  type AssessmentReadingViewModel,
} from '@/lib/library/assessment-reading-links';
import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import type { AssessmentAttemptLifecycleViewModel } from '@/lib/server/assessment-attempt-lifecycle-types';
import { listPublishedAssessmentInventory } from '@/lib/server/published-assessment-inventory';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import {
  AssessmentResultNotFoundError,
  AssessmentResultPayloadError,
  type AssessmentResultDetailViewModel,
  type AssessmentResultListItem,
} from '@/lib/server/result-read-model-types';
import type { AssessmentMode } from '@/lib/types/assessment';
import type { SingleDomainResultSignal } from '@/lib/types/single-domain-result';
import { getAssessmentResultHref } from '@/lib/utils/assessment-mode';

export type WorkspaceActionType = 'start' | 'resume' | 'view_result' | 'processing' | 'review_issue';
export type WorkspaceAssessmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed_processing'
  | 'results_ready'
  | 'error';

export type WorkspaceSignalIndexDisplayRole = 'Primary' | 'Secondary' | 'Third' | 'Fourth';

export type WorkspaceSignalIndexItem = {
  signalKey: string;
  signalLabel: string;
  normalizedPercentage: number;
  rank: number;
  displayRole: WorkspaceSignalIndexDisplayRole;
};

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
  assessmentTitle: string;
  assessmentDescription: string | null;
  assessmentMode: AssessmentMode | null;
  publishedVersionId: string | null;
  publishedVersionKey: string | null;
  publishedVersionNumber: string | null;
  title: string;
  description: string | null;
  estimatedTimeMinutes: number | null;
  questionCount: number | null;
  typeLabel: string;
  status: WorkspaceAssessmentStatus;
  statusLabel: string;
  attemptId: string | null;
  resultId: string | null;
  resultHref: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  answeredCount: number | null;
  totalQuestionCount: number | null;
  progressPercentage: number | null;
  actionLabel: string;
  actionHref: string | null;
  actionDisabled: boolean;
  ctaLabel: string;
  href: string;
  signalsForIndex: readonly WorkspaceSignalIndexItem[] | null;
  recommendedReading: AssessmentReadingViewModel | null;
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
  lifecycle: AssessmentAttemptLifecycleViewModel;
}): WorkspaceAssessmentStatus {
  if (params.latestReadyResult) {
    return 'results_ready';
  }

  switch (params.lifecycle.status) {
    case 'ready':
    case 'completed_processing':
      return 'completed_processing';
    case 'error':
      return 'error';
    case 'in_progress':
      return 'in_progress';
    case 'not_started':
      return 'not_started';
  }
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
    case 'processing':
      return {
        type: 'processing',
        title: 'Your result is processing',
        description: `${params.assessmentTitle} has been submitted and the result is not ready yet.`,
        ctaLabel: 'Processing',
      };
    case 'review_issue':
      return {
        type: 'review_issue',
        title: 'Review assessment issue',
        description: `${params.assessmentTitle} needs review before a ready result can be shown.`,
        ctaLabel: 'Review Issue',
      };
  }
}

function mapStatusLabel(status: WorkspaceAssessmentStatus): string {
  switch (status) {
    case 'results_ready':
      return 'Results ready';
    case 'completed_processing':
      return 'Processing';
    case 'error':
      return 'Needs review';
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
    case 'completed_processing':
      return 'Processing';
    case 'error':
      return 'Review Issue';
    case 'in_progress':
      return 'Resume';
    case 'not_started':
      return 'Start';
  }
}

function mapActionLabel(status: WorkspaceAssessmentStatus): string {
  switch (status) {
    case 'results_ready':
      return 'View result';
    case 'completed_processing':
      return 'Processing';
    case 'error':
      return 'Review issue';
    case 'in_progress':
      return 'Resume assessment';
    case 'not_started':
      return 'Start assessment';
  }
}

function getActionHref(params: {
  status: WorkspaceAssessmentStatus;
  assessmentKey: string;
  latestReadyResult: AssessmentResultListItem | null;
}): string | null {
  if (params.status === 'results_ready' && params.latestReadyResult) {
    return getAssessmentResultHref(params.latestReadyResult.resultId, params.latestReadyResult.mode);
  }

  if (params.status === 'completed_processing') {
    return null;
  }

  return getAssessmentEntryHref(params.assessmentKey);
}

function isActionDisabled(status: WorkspaceAssessmentStatus): boolean {
  return status === 'completed_processing';
}

function mapSignalDisplayRole(rank: number): WorkspaceSignalIndexDisplayRole | null {
  switch (rank) {
    case 1:
      return 'Primary';
    case 2:
      return 'Secondary';
    case 3:
      return 'Third';
    case 4:
      return 'Fourth';
    default:
      return null;
  }
}

function isReadableSignal(signal: SingleDomainResultSignal): boolean {
  return (
    signal.signal_key.trim().length > 0
    && signal.signal_label.trim().length > 0
    && Number.isFinite(signal.normalized_score)
    && Number.isFinite(signal.rank)
  );
}

function buildSignalsForIndex(
  detail: AssessmentResultDetailViewModel | null,
): readonly WorkspaceSignalIndexItem[] | null {
  if (!detail || detail.mode !== 'single_domain' || !detail.singleDomainResult) {
    // Multi-domain results do not currently have a single universal four-signal contract.
    return null;
  }

  const signals = detail.singleDomainResult.signals
    .filter(isReadableSignal)
    .sort((left, right) => left.rank - right.rank || left.signal_key.localeCompare(right.signal_key))
    .slice(0, 4)
    .map((signal) => {
      const displayRole = mapSignalDisplayRole(signal.rank);
      if (!displayRole) {
        return null;
      }

      return {
        signalKey: signal.signal_key,
        signalLabel: signal.signal_label,
        normalizedPercentage: signal.normalized_score,
        rank: signal.rank,
        displayRole,
      } satisfies WorkspaceSignalIndexItem;
    })
    .filter((signal): signal is WorkspaceSignalIndexItem => signal !== null);

  return Object.freeze(signals);
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
      const resultReadModel = createResultReadModelService({ db: deps.db });
      const [inventory, readyResults] = await Promise.all([
        listPublishedAssessmentInventory(deps.db),
        resultReadModel.listAssessmentResults({ userId: params.userId }),
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
      const readyDetailsByResultId = new Map<string, AssessmentResultDetailViewModel | null>();

      await Promise.all(
        [...readyResultByAssessmentKey.values()].map(async (result) => {
          if (result.mode !== 'single_domain') {
            readyDetailsByResultId.set(result.resultId, null);
            return;
          }

          try {
            readyDetailsByResultId.set(
              result.resultId,
              await resultReadModel.getAssessmentResultDetail({
                userId: params.userId,
                resultId: result.resultId,
              }),
            );
          } catch (error) {
            if (error instanceof AssessmentResultPayloadError || error instanceof AssessmentResultNotFoundError) {
              readyDetailsByResultId.set(result.resultId, null);
              return;
            }

            throw error;
          }
        }),
      );

      const assessments = inventory.map((assessment, index) => {
        const lifecycle = lifecycleStates[index];
        const latestReadyResult = readyResultByAssessmentKey.get(assessment.assessmentKey) ?? null;
        const status = resolveAssessmentStatus({
          latestReadyResult,
          lifecycle,
        });
        const resultHref = latestReadyResult
          ? getAssessmentResultHref(latestReadyResult.resultId, latestReadyResult.mode)
          : null;
        const actionHref = getActionHref({
          status,
          assessmentKey: assessment.assessmentKey,
          latestReadyResult,
        });
        const actionDisabled = isActionDisabled(status);
        const fallbackHref = actionHref ?? getAssessmentEntryHref(assessment.assessmentKey);

        return {
          assessmentId: assessment.assessmentId,
          assessmentKey: assessment.assessmentKey,
          assessmentTitle: assessment.title,
          assessmentDescription: assessment.description,
          assessmentMode: latestReadyResult?.mode ?? null,
          publishedVersionId: assessment.assessmentVersionId,
          publishedVersionKey: assessment.versionTag,
          publishedVersionNumber: assessment.versionTag,
          title: assessment.title,
          description: assessment.description,
          estimatedTimeMinutes: null,
          questionCount: assessment.questionCount,
          typeLabel: 'Individual',
          status,
          statusLabel: mapStatusLabel(status),
          attemptId: lifecycle.attemptId,
          resultId: latestReadyResult?.resultId ?? null,
          resultHref,
          startedAt: lifecycle.startedAt,
          submittedAt: lifecycle.submittedAt,
          completedAt: latestReadyResult?.generatedAt ?? lifecycle.completedAt,
          answeredCount: lifecycle.answeredQuestions,
          totalQuestionCount: lifecycle.totalQuestions,
          progressPercentage: lifecycle.completionPercentage,
          actionLabel: mapActionLabel(status),
          actionHref,
          actionDisabled,
          ctaLabel: mapAssessmentCtaLabel(status),
          href: fallbackHref,
          recommendedReading: resolveAssessmentReadingViewModel(assessment.assessmentKey, status),
          signalsForIndex:
            status === 'results_ready' && latestReadyResult
              ? buildSignalsForIndex(readyDetailsByResultId.get(latestReadyResult.resultId) ?? null)
              : null,
        } satisfies WorkspaceAssessmentItem;
      });

      const inProgressAssessment = assessments.find((assessment) => assessment.status === 'in_progress');
      const latestReadyResult = readyResults[0] ?? null;
      const notStartedAssessment = assessments.find((assessment) => assessment.status === 'not_started');
      const processingAssessment = assessments.find((assessment) => assessment.status === 'completed_processing');
      const errorAssessment = assessments.find((assessment) => assessment.status === 'error');

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
      } else if (processingAssessment) {
        const copy = getRecommendedActionCopy({
          type: 'processing',
          assessmentTitle: processingAssessment.title,
        });
        recommendedAction = {
          ...copy,
          href: processingAssessment.href,
        };
      } else if (errorAssessment) {
        const copy = getRecommendedActionCopy({
          type: 'review_issue',
          assessmentTitle: errorAssessment.title,
        });
        recommendedAction = {
          ...copy,
          href: errorAssessment.href,
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
