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
  type AssessmentResultRankedSignalViewModel,
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

export type WorkspaceChapterProgress = {
  totalAvailableChapters: number;
  completedAvailableChapters: number;
  inProgressChapters: number;
  notStartedChapters: number;
  progressLabel: string;
};

export type WorkspaceChapterAction = {
  label: string;
  href: string | null;
  disabled: boolean;
};

export type WorkspaceChapterTopSignal = {
  signalKey: string;
  signalLabel: string;
  normalizedPercentage: number;
};

export type WorkspaceCompletedChapterResult = {
  assessmentTitle: string;
  assessmentKey: string;
  assessmentVersionId: string;
  resultId: string;
  reportHref: string;
  topSignal: WorkspaceChapterTopSignal | null;
  rankedSignalStack: readonly WorkspaceSignalIndexItem[];
  scoreShape: string | null;
  conciseTakeaway: string | null;
};

export type WorkspaceIncompleteChapterProgress = {
  attemptId: string | null;
  answeredCount: number | null;
  totalQuestionCount: number | null;
  completionPercentage: number | null;
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
  scoreShape: string | null;
  patternKey: string | null;
  resultSummary: string | null;
  recommendedReading: AssessmentReadingViewModel | null;
  chapterId: string;
  chapterTitle: string;
  chapterDescription: string | null;
  chapterState: WorkspaceAssessmentStatus;
  primaryAction: WorkspaceChapterAction;
  completedResult: WorkspaceCompletedChapterResult | null;
  incompleteProgress: WorkspaceIncompleteChapterProgress | null;
};

export type WorkspaceLatestResult = {
  resultId: string;
  assessmentTitle: string;
  completedAt: string;
  href: string;
};

export type WorkspaceRecommendedNextChapter = {
  kind: 'continue_chapter' | 'start_chapter' | 'view_reports' | 'profile_complete' | 'none';
  title: string;
  description: string;
  ctaLabel: string;
  href: string | null;
  chapterId: string | null;
  assessmentKey: string | null;
};

export type WorkspaceViewModel = {
  progress: WorkspaceChapterProgress;
  chapters: readonly WorkspaceAssessmentItem[];
  recommendedNextChapter: WorkspaceRecommendedNextChapter;
  completedReports: readonly WorkspaceCompletedChapterResult[];
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

function isReadableRankedSignal(signal: AssessmentResultRankedSignalViewModel): boolean {
  return (
    signal.signalKey.trim().length > 0
    && signal.title.trim().length > 0
    && Number.isFinite(signal.percentage)
    && Number.isFinite(signal.rank)
  );
}

function isReadableLegacySignal(signal: SingleDomainResultSignal): boolean {
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

  const rankedSignals = detail.rankedSignals
    .filter(isReadableRankedSignal)
    .sort((left, right) => left.rank - right.rank || left.signalKey.localeCompare(right.signalKey))
    .slice(0, 4)
    .map((signal) => {
      const displayRole = mapSignalDisplayRole(signal.rank);
      if (!displayRole) {
        return null;
      }

      return {
        signalKey: signal.signalKey,
        signalLabel: signal.title,
        normalizedPercentage: signal.percentage,
        rank: signal.rank,
        displayRole,
      } satisfies WorkspaceSignalIndexItem;
    })
    .filter((signal): signal is WorkspaceSignalIndexItem => signal !== null);

  if (rankedSignals.length > 0) {
    return Object.freeze(rankedSignals);
  }

  const legacySignals = detail.singleDomainResult.signals
    .filter(isReadableLegacySignal)
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

  return Object.freeze(legacySignals);
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

function buildChapterProgress(
  chapters: readonly WorkspaceAssessmentItem[],
): WorkspaceChapterProgress {
  const totalAvailableChapters = chapters.length;
  const completedAvailableChapters = chapters.filter(
    (chapter) => chapter.status === 'results_ready',
  ).length;
  const inProgressChapters = chapters.filter((chapter) => chapter.status === 'in_progress').length;
  const notStartedChapters = chapters.filter((chapter) => chapter.status === 'not_started').length;

  return {
    totalAvailableChapters,
    completedAvailableChapters,
    inProgressChapters,
    notStartedChapters,
    progressLabel: `${completedAvailableChapters} of ${totalAvailableChapters} available chapters complete`,
  };
}

function buildCompletedChapterResult(params: {
  assessmentTitle: string;
  assessmentKey: string;
  assessmentVersionId: string;
  latestReadyResult: AssessmentResultListItem | null;
  detail: AssessmentResultDetailViewModel | null;
  reportHref: string | null;
  rankedSignalStack: readonly WorkspaceSignalIndexItem[] | null;
}): WorkspaceCompletedChapterResult | null {
  if (!params.latestReadyResult || !params.reportHref) {
    return null;
  }

  const topSignal = params.latestReadyResult.topSignal
    ? {
        signalKey: params.latestReadyResult.topSignal.signalKey,
        signalLabel: params.latestReadyResult.topSignal.title,
        normalizedPercentage: params.latestReadyResult.topSignal.percentage,
      }
    : null;

  return {
    assessmentTitle: params.assessmentTitle,
    assessmentKey: params.assessmentKey,
    assessmentVersionId: params.assessmentVersionId,
    resultId: params.latestReadyResult.resultId,
    reportHref: params.reportHref,
    topSignal,
    rankedSignalStack: Object.freeze([...(params.rankedSignalStack ?? [])]),
    scoreShape: params.latestReadyResult.scoreShape ?? params.detail?.scoreShape ?? null,
    conciseTakeaway:
      params.latestReadyResult.summaryLine ?? params.detail?.summaryLine ?? null,
  };
}

function buildRecommendedNextChapter(params: {
  chapters: readonly WorkspaceAssessmentItem[];
  latestResult: WorkspaceLatestResult | null;
}): WorkspaceRecommendedNextChapter {
  const inProgress = params.chapters.find((chapter) => chapter.status === 'in_progress');
  if (inProgress) {
    return {
      kind: 'continue_chapter',
      title: `Continue ${inProgress.chapterTitle}`,
      description: 'Pick up from your saved progress.',
      ctaLabel: 'Continue chapter',
      href: inProgress.primaryAction.href,
      chapterId: inProgress.chapterId,
      assessmentKey: inProgress.assessmentKey,
    };
  }

  const notStarted = params.chapters.find((chapter) => chapter.status === 'not_started');
  if (notStarted) {
    return {
      kind: 'start_chapter',
      title: `Start ${notStarted.chapterTitle}`,
      description: 'Begin the next available chapter in your Personal Operating Profile.',
      ctaLabel: 'Start chapter',
      href: notStarted.primaryAction.href,
      chapterId: notStarted.chapterId,
      assessmentKey: notStarted.assessmentKey,
    };
  }

  if (params.chapters.length > 0 && params.chapters.every((chapter) => chapter.status === 'results_ready')) {
    return {
      kind: params.latestResult ? 'view_reports' : 'profile_complete',
      title: 'Your available chapters are complete',
      description: params.latestResult
        ? 'Revisit your reports to turn your signal pattern into sharper decisions, better routines, and clearer development choices.'
        : 'Your reports remain available as reference material whenever you want to review how you work, perform, and grow.',
      ctaLabel: params.latestResult ? 'Review report' : 'Profile complete',
      href: params.latestResult?.href ?? null,
      chapterId: null,
      assessmentKey: null,
    };
  }

  return {
    kind: 'none',
    title: 'No chapters are available yet',
    description: 'Published chapters will appear when they are available for your workspace.',
    ctaLabel: 'No chapter available',
    href: null,
    chapterId: null,
    assessmentKey: null,
  };
}

function toLegacyRecommendedAction(
  recommendation: WorkspaceRecommendedNextChapter,
): WorkspaceRecommendedAction | null {
  if (!recommendation.href) {
    return null;
  }

  const type: WorkspaceActionType =
    recommendation.kind === 'continue_chapter'
      ? 'resume'
      : recommendation.kind === 'start_chapter'
        ? 'start'
        : recommendation.kind === 'view_reports'
          ? 'view_result'
          : 'processing';

  return {
    type,
    title: recommendation.title,
    description: recommendation.description,
    href: recommendation.href,
    ctaLabel: recommendation.ctaLabel,
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
        const detail = latestReadyResult
          ? (readyDetailsByResultId.get(latestReadyResult.resultId) ?? null)
          : null;
        const rankedSignalStack =
          status === 'results_ready' && latestReadyResult
            ? buildSignalsForIndex(detail)
            : null;
        const completedResult = buildCompletedChapterResult({
          assessmentTitle: assessment.title,
          assessmentKey: assessment.assessmentKey,
          assessmentVersionId: assessment.assessmentVersionId,
          latestReadyResult,
          detail,
          reportHref: resultHref,
          rankedSignalStack,
        });
        const primaryAction = {
          label: mapActionLabel(status),
          href: actionHref,
          disabled: actionDisabled,
        };

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
          scoreShape: latestReadyResult?.scoreShape ?? null,
          patternKey: latestReadyResult?.patternKey ?? null,
          resultSummary: latestReadyResult?.summaryLine ?? null,
          recommendedReading: resolveAssessmentReadingViewModel(assessment.assessmentKey, status),
          signalsForIndex: rankedSignalStack,
          chapterId: assessment.assessmentVersionId,
          chapterTitle: assessment.title,
          chapterDescription: assessment.description,
          chapterState: status,
          primaryAction,
          completedResult,
          incompleteProgress:
            status === 'not_started' || status === 'in_progress'
              ? {
                  attemptId: lifecycle.attemptId,
                  answeredCount: lifecycle.answeredQuestions,
                  totalQuestionCount: lifecycle.totalQuestions,
                  completionPercentage: lifecycle.completionPercentage,
                }
              : null,
        } satisfies WorkspaceAssessmentItem;
      });

      const latestReadyResult = readyResults[0] ?? null;
      const latestResult = buildLatestResult(latestReadyResult);
      const progress = buildChapterProgress(assessments);
      const recommendedNextChapter = buildRecommendedNextChapter({
        chapters: assessments,
        latestResult,
      });

      return {
        progress,
        chapters: Object.freeze(assessments),
        recommendedNextChapter,
        completedReports: Object.freeze(
          assessments
            .map((assessment) => assessment.completedResult)
            .filter((result): result is WorkspaceCompletedChapterResult => result !== null),
        ),
        recommendedAction: toLegacyRecommendedAction(recommendedNextChapter),
        assessments: Object.freeze(assessments),
        latestResult,
      };
    },
  };
}
