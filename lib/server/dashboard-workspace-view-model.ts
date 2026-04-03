import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import type {
  AssessmentAttemptLifecycleViewModel,
  AssessmentLifecycleStatus,
} from '@/lib/server/assessment-attempt-lifecycle-types';
import { listPublishedAssessmentInventory } from '@/lib/server/published-assessment-inventory';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import type { AssessmentResultListItem } from '@/lib/server/result-read-model-types';
import type { Queryable } from '@/lib/engine/repository-sql';

export type AssessmentCardAction =
  | 'start'
  | 'resume'
  | 'processing'
  | 'view_results'
  | 'review';

export type AssessmentCardCta = {
  action: AssessmentCardAction;
  label: string;
  href: string | null;
  disabled: boolean;
};

export type AssessmentWorkspaceItemViewModel = {
  assessmentId: string;
  assessmentKey: string;
  title: string;
  description: string | null;
  versionTag: string;
  status: AssessmentLifecycleStatus;
  statusLabel: string;
  statusDetail: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
  attemptId: string | null;
  latestReadyResultId: string | null;
  latestReadyResultAt: string | null;
  latestTopSignalTitle: string | null;
  latestTopSignalPercentage: number | null;
  cta: AssessmentCardCta;
};

export type DashboardRecommendationViewModel = {
  kind: 'resume' | 'view_results' | 'start' | 'processing' | 'review';
  title: string;
  description: string;
  cta: AssessmentCardCta;
};

export type DashboardLatestReadyResultViewModel = {
  resultId: string;
  assessmentKey: string;
  assessmentTitle: string;
  generatedAt: string | null;
  topSignalTitle: string | null;
  topSignalPercentage: number | null;
  href: string;
};

export type DashboardViewModel = {
  assessments: readonly AssessmentWorkspaceItemViewModel[];
  totalAssessments: number;
  inProgressCount: number;
  processingCount: number;
  readyCount: number;
  errorCount: number;
  notStartedCount: number;
  readyResultCount: number;
  recommendation: DashboardRecommendationViewModel | null;
  latestReadyResult: DashboardLatestReadyResultViewModel | null;
};

export type AssessmentWorkspaceViewModel = {
  assessments: readonly AssessmentWorkspaceItemViewModel[];
};

type ReadyResultLookup = {
  byAssessmentKey: ReadonlyMap<string, AssessmentResultListItem>;
  latest: AssessmentResultListItem | null;
};

function getAssessmentWorkspaceHref(assessmentKey: string): string {
  return `/app/assessments#${assessmentKey}`;
}

function getAssessmentEntryHref(assessmentKey: string): string {
  return `/app/assessments/${assessmentKey}`;
}

function getResultHref(resultId: string): string {
  return `/app/results/${resultId}`;
}

function getFallbackResultHref(): string {
  return '/app/results';
}

function formatErrorCode(lastError: string | null): string | null {
  if (!lastError) {
    return null;
  }

  return lastError.replace(/_/g, ' ');
}

export function mapLifecycleStatusToCta(params: {
  status: AssessmentLifecycleStatus;
  assessmentKey: string;
  latestReadyResultId: string | null;
}): AssessmentCardCta {
  switch (params.status) {
    case 'not_started':
      return {
        action: 'start',
        label: 'Start',
        href: getAssessmentEntryHref(params.assessmentKey),
        disabled: false,
      };
    case 'in_progress':
      return {
        action: 'resume',
        label: 'Resume',
        href: getAssessmentEntryHref(params.assessmentKey),
        disabled: false,
      };
    case 'completed_processing':
      return {
        action: 'processing',
        label: 'Processing',
        href: null,
        disabled: true,
      };
    case 'ready':
      return {
        action: 'view_results',
        label: 'View Results',
        href: params.latestReadyResultId
          ? getResultHref(params.latestReadyResultId)
          : getFallbackResultHref(),
        disabled: false,
      };
    case 'error':
      return {
        action: 'review',
        label: 'Review',
        href: getAssessmentWorkspaceHref(params.assessmentKey),
        disabled: false,
      };
  }
}

export function projectAssessmentWorkspaceItem(params: {
  assessment: {
    assessmentId: string;
    assessmentKey: string;
    title: string;
    description: string | null;
    versionTag: string;
  };
  lifecycle: AssessmentAttemptLifecycleViewModel;
  latestReadyResult: AssessmentResultListItem | null;
}): AssessmentWorkspaceItemViewModel {
  const effectiveStatus =
    params.lifecycle.status === 'ready' && !params.latestReadyResult
      ? ('completed_processing' as const)
      : params.lifecycle.status;
  const latestReadyResultId = params.latestReadyResult?.resultId ?? null;
  const topSignalTitle = params.latestReadyResult?.topSignal?.title ?? null;
  const topSignalPercentage = params.latestReadyResult?.topSignalPercentage ?? null;
  const latestReadyResultAt = params.latestReadyResult?.generatedAt ?? params.latestReadyResult?.createdAt ?? null;
  const errorCode = formatErrorCode(params.lifecycle.lastError);
  const cta = mapLifecycleStatusToCta({
    status: effectiveStatus,
    assessmentKey: params.assessment.assessmentKey,
    latestReadyResultId,
  });

  let statusLabel = 'Not started';
  let statusDetail = `${params.lifecycle.totalQuestions} questions ready to begin.`;

  switch (effectiveStatus) {
    case 'in_progress':
      statusLabel = 'In progress';
      statusDetail = `${params.lifecycle.answeredQuestions} of ${params.lifecycle.totalQuestions} questions answered.`;
      break;
    case 'completed_processing':
      statusLabel = 'Processing';
      statusDetail = 'Assessment submitted. Result is still processing.';
      break;
    case 'ready':
      statusLabel = 'Ready';
      statusDetail = topSignalTitle
        ? `Latest ready result led by ${topSignalTitle}${topSignalPercentage !== null ? ` (${topSignalPercentage}%)` : ''}.`
        : 'Latest ready result is available.';
      break;
    case 'error':
      statusLabel = 'Needs review';
      statusDetail = errorCode
        ? `Latest processing error: ${errorCode}.`
        : 'The latest processing attempt needs review.';
      break;
    case 'not_started':
      break;
  }

  return {
    assessmentId: params.assessment.assessmentId,
    assessmentKey: params.assessment.assessmentKey,
    title: params.assessment.title,
    description: params.assessment.description,
    versionTag: params.assessment.versionTag,
    status: effectiveStatus,
    statusLabel,
    statusDetail,
    totalQuestions: params.lifecycle.totalQuestions,
    answeredQuestions: params.lifecycle.answeredQuestions,
    completionPercentage: params.lifecycle.completionPercentage,
    attemptId: params.lifecycle.attemptId,
    latestReadyResultId,
    latestReadyResultAt,
    latestTopSignalTitle: topSignalTitle,
    latestTopSignalPercentage: topSignalPercentage,
    cta,
  };
}

export function selectDashboardRecommendation(
  assessments: readonly AssessmentWorkspaceItemViewModel[],
  latestReadyResult: AssessmentResultListItem | null,
): DashboardRecommendationViewModel | null {
  const inProgress = assessments.find((assessment) => assessment.status === 'in_progress');
  if (inProgress) {
    return {
      kind: 'resume',
      title: `Resume ${inProgress.title}`,
      description: `${inProgress.answeredQuestions} of ${inProgress.totalQuestions} questions are already saved.`,
      cta: inProgress.cta,
    };
  }

  if (latestReadyResult) {
    return {
      kind: 'view_results',
      title: `Review ${latestReadyResult.assessmentTitle}`,
      description: latestReadyResult.topSignal
        ? `${latestReadyResult.topSignal.title} is the latest leading signal.`
        : 'Your latest ready result is available to review.',
      cta: {
        action: 'view_results',
        label: 'View Results',
        href: getResultHref(latestReadyResult.resultId),
        disabled: false,
      },
    };
  }

  const notStarted = assessments.find((assessment) => assessment.status === 'not_started');
  if (notStarted) {
    return {
      kind: 'start',
      title: `Start ${notStarted.title}`,
      description: `${notStarted.totalQuestions} questions are available in the published assessment.`,
      cta: notStarted.cta,
    };
  }

  const processing = assessments.find((assessment) => assessment.status === 'completed_processing');
  if (processing) {
    return {
      kind: 'processing',
      title: `${processing.title} is processing`,
      description: 'Responses are submitted and the persisted result is not ready yet.',
      cta: processing.cta,
    };
  }

  const error = assessments.find((assessment) => assessment.status === 'error');
  if (error) {
    return {
      kind: 'review',
      title: `Review ${error.title}`,
      description: error.statusDetail,
      cta: error.cta,
    };
  }

  return null;
}

function buildReadyResultLookup(results: readonly AssessmentResultListItem[]): ReadyResultLookup {
  const byAssessmentKey = new Map<string, AssessmentResultListItem>();

  for (const result of results) {
    if (!byAssessmentKey.has(result.assessmentKey)) {
      byAssessmentKey.set(result.assessmentKey, result);
    }
  }

  return {
    byAssessmentKey,
    latest: results[0] ?? null,
  };
}

async function loadAssessmentWorkspaceItems(params: {
  db: Queryable;
  userId: string;
}): Promise<{
  assessments: readonly AssessmentWorkspaceItemViewModel[];
  readyResults: readonly AssessmentResultListItem[];
}> {
  const [inventory, readyResults] = await Promise.all([
    listPublishedAssessmentInventory(params.db),
    createResultReadModelService({ db: params.db }).listAssessmentResults({ userId: params.userId }),
  ]);

  const lifecycleService = createAssessmentAttemptLifecycleService({ db: params.db });
  const readyResultLookup = buildReadyResultLookup(readyResults);
  const lifecycleStates = await Promise.all(
    inventory.map((assessment) =>
      lifecycleService.getAssessmentAttemptLifecycle({
        userId: params.userId,
        assessmentKey: assessment.assessmentKey,
      }),
    ),
  );

  const assessments = inventory.map((assessment, index) =>
    projectAssessmentWorkspaceItem({
      assessment,
      lifecycle: lifecycleStates[index],
      latestReadyResult: readyResultLookup.byAssessmentKey.get(assessment.assessmentKey) ?? null,
    }),
  );

  return {
    assessments: Object.freeze(assessments),
    readyResults,
  };
}

export async function buildAssessmentWorkspaceViewModel(params: {
  db: Queryable;
  userId: string;
}): Promise<AssessmentWorkspaceViewModel> {
  const { assessments } = await loadAssessmentWorkspaceItems(params);

  return {
    assessments,
  };
}

export async function buildDashboardViewModel(params: {
  db: Queryable;
  userId: string;
}): Promise<DashboardViewModel> {
  const { assessments, readyResults } = await loadAssessmentWorkspaceItems(params);
  const latestReadyResult = readyResults[0] ?? null;

  return {
    assessments,
    totalAssessments: assessments.length,
    inProgressCount: assessments.filter((assessment) => assessment.status === 'in_progress').length,
    processingCount: assessments.filter((assessment) => assessment.status === 'completed_processing').length,
    readyCount: assessments.filter((assessment) => assessment.status === 'ready').length,
    errorCount: assessments.filter((assessment) => assessment.status === 'error').length,
    notStartedCount: assessments.filter((assessment) => assessment.status === 'not_started').length,
    readyResultCount: readyResults.length,
    recommendation: selectDashboardRecommendation(assessments, latestReadyResult),
    latestReadyResult: latestReadyResult
      ? {
          resultId: latestReadyResult.resultId,
          assessmentKey: latestReadyResult.assessmentKey,
          assessmentTitle: latestReadyResult.assessmentTitle,
          generatedAt: latestReadyResult.generatedAt,
          topSignalTitle: latestReadyResult.topSignal?.title ?? null,
          topSignalPercentage: latestReadyResult.topSignalPercentage,
          href: getResultHref(latestReadyResult.resultId),
        }
      : null,
  };
}
