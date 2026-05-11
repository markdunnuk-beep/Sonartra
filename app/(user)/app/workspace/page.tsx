import {
  ButtonLink,
  EmptyState,
  LabelPill,
  PageFrame,
  StatusPill,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import type {
  WorkspaceAssessmentItem,
  WorkspaceAssessmentStatus,
  WorkspaceChapterProgress,
  WorkspaceCompletedChapterResult,
  WorkspaceRecommendedNextChapter,
  WorkspaceSignalIndexItem,
} from '@/lib/server/workspace-service';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createWorkspaceService } from '@/lib/server/workspace-service';
import { formatAssessmentEstimatedDuration } from '@/lib/ui/assessment-duration';

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

function formatScoreShapeLabel(value: string): string {
  return `${value.replace(/_/g, ' ')} pattern`;
}

function getProgressWidth(progress: WorkspaceChapterProgress): string {
  if (progress.totalAvailableChapters <= 0) {
    return '0%';
  }

  return `${Math.round(
    (progress.completedAvailableChapters / progress.totalAvailableChapters) * 100,
  )}%`;
}

function getChapterActionLabel(status: WorkspaceAssessmentStatus): string {
  switch (status) {
    case 'results_ready':
      return 'View report';
    case 'in_progress':
      return 'Continue chapter';
    case 'not_started':
      return 'Start chapter';
    case 'completed_processing':
      return 'Processing';
    case 'error':
      return 'Review issue';
  }
}

function getChapterStateCopy(chapter: WorkspaceAssessmentItem): string {
  switch (chapter.chapterState) {
    case 'results_ready':
      return 'Report ready';
    case 'in_progress':
      if (
        chapter.incompleteProgress?.answeredCount !== null
        && chapter.incompleteProgress?.totalQuestionCount !== null
        && chapter.incompleteProgress?.totalQuestionCount
        && chapter.incompleteProgress.totalQuestionCount > 0
      ) {
        return `${chapter.incompleteProgress.answeredCount} of ${chapter.incompleteProgress.totalQuestionCount} questions saved`;
      }

      return 'Progress saved';
    case 'not_started':
      return 'Ready when you are';
    case 'completed_processing':
      return 'Report is being prepared';
    case 'error':
      return 'Needs a calm review';
  }
}

function getChapterDescription(chapter: WorkspaceAssessmentItem): string {
  return chapter.chapterDescription ?? 'A published Sonartra chapter available in your workspace.';
}

function getRecommendationAccessibleLabel(
  recommendation: WorkspaceRecommendedNextChapter,
): string {
  if (recommendation.assessmentKey) {
    return `${recommendation.ctaLabel} for ${recommendation.title}`;
  }

  return recommendation.ctaLabel;
}

function DisabledAction({
  label,
  accessibleLabel,
}: Readonly<{
  label: string;
  accessibleLabel?: string;
}>) {
  return (
    <button
      type="button"
      disabled
      aria-label={accessibleLabel}
      className="sonartra-button sonartra-button-secondary cursor-not-allowed border-white/10 bg-white/[0.04] text-white/42 opacity-80"
    >
      {label}
    </button>
  );
}

function ActionControl({
  label,
  href,
  disabled,
  variant = 'secondary',
  accessibleLabel,
}: Readonly<{
  label: string;
  href: string | null;
  disabled: boolean;
  variant?: 'primary' | 'secondary';
  accessibleLabel?: string;
}>) {
  if (!href || disabled) {
    return <DisabledAction label={label} accessibleLabel={accessibleLabel} />;
  }

  return (
    <ButtonLink href={href} variant={variant} ariaLabel={accessibleLabel}>
      {label}
    </ButtonLink>
  );
}

function SignalMeter({
  signal,
}: Readonly<{
  signal: WorkspaceSignalIndexItem;
}>) {
  const percentage = Math.max(0, Math.min(100, Math.round(signal.normalizedPercentage)));
  const percentageLabel = formatPercentage(signal.normalizedPercentage);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="sonartra-page-eyebrow">{signal.displayRole}</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#F5F1EA]/90">
            {signal.signalLabel}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[#F5F1EA]">{percentageLabel}</p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"
        role="meter"
        aria-label={`${signal.displayRole} signal, ${signal.signalLabel}, ${percentageLabel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div className="h-full rounded-full bg-[#32D6B0]" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ChapterProgressMap({
  chapters,
}: Readonly<{
  chapters: readonly WorkspaceAssessmentItem[];
}>) {
  if (chapters.length === 0) {
    return (
      <EmptyState
        title="No published chapters"
        description="Published chapters will appear here when they are available in your workspace."
      />
    );
  }

  return (
    <div aria-label="Published chapter progress" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {chapters.map((chapter, index) => {
        const isComplete = chapter.chapterState === 'results_ready';
        const isActive = chapter.chapterState === 'in_progress';
        return (
          <div
            key={chapter.chapterId}
            className={
              isComplete
                ? 'rounded-2xl border border-[#32D6B0]/24 bg-[#32D6B0]/8 p-4 shadow-[inset_0_1px_0_rgba(205,249,237,0.08)]'
                : isActive
                  ? 'rounded-2xl border border-[#D9A441]/24 bg-[#D9A441]/8 p-4 shadow-[inset_0_1px_0_rgba(245,226,188,0.08)]'
                  : 'rounded-2xl border border-white/10 bg-white/[0.026] p-4 shadow-[inset_0_1px_0_rgba(245,241,234,0.035)]'
            }
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-[#9A9185]/76 text-xs font-semibold uppercase tracking-[0.12em]">
                Chapter {index + 1}
              </span>
              <span
                aria-hidden="true"
                className={
                  isComplete
                    ? 'mt-0.5 h-2.5 w-2.5 rounded-full bg-[#32D6B0] shadow-[0_0_18px_rgba(50,214,176,0.32)]'
                    : isActive
                      ? 'mt-0.5 h-2.5 w-2.5 rounded-full bg-[#D9A441]'
                      : 'mt-0.5 h-2.5 w-2.5 rounded-full bg-white/18'
                }
              />
            </div>
            <h3 className="mt-3 text-base font-semibold leading-snug text-[#F5F1EA]">
              {chapter.chapterTitle}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/64">
              {getChapterStateCopy(chapter)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function RecommendedNextChapterPanel({
  recommendation,
}: Readonly<{
  recommendation: WorkspaceRecommendedNextChapter;
}>) {
  return (
    <SurfaceCard accent className="overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-4 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[#32D6B0] shadow-[0_0_18px_rgba(50,214,176,0.26)]"
            />
            <p className="sonartra-page-eyebrow">Recommended next chapter</p>
          </div>
          <div className="space-y-3">
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-[#F5F1EA] lg:text-[2.35rem]">
              {recommendation.title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[#D8D0C3]/76">
              {recommendation.description}
            </p>
          </div>
        </div>

        <div className="flex items-start border-t border-white/10 bg-black/16 p-6 lg:items-end lg:border-l lg:border-t-0 lg:p-8">
          <ActionControl
            label={recommendation.ctaLabel}
            href={recommendation.href}
            disabled={!recommendation.href}
            accessibleLabel={getRecommendationAccessibleLabel(recommendation)}
            variant="primary"
          />
        </div>
      </div>
    </SurfaceCard>
  );
}

function ResultReadyChapterCard({
  chapter,
  result,
}: Readonly<{
  chapter: WorkspaceAssessmentItem;
  result: WorkspaceCompletedChapterResult;
}>) {
  return (
    <SurfaceCard
      className="flex min-h-full flex-col gap-5 p-5"
      data-assessment-key={chapter.assessmentKey}
      data-result-id={result.resultId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={chapter.chapterState} label="Report ready" />
        {result.scoreShape ? <LabelPill>{formatScoreShapeLabel(result.scoreShape)}</LabelPill> : null}
      </div>

      <div className="space-y-3">
        <h3 className="text-[1.35rem] font-semibold leading-tight text-[#F5F1EA]">
          {chapter.chapterTitle}
        </h3>
        {result.topSignal ? (
          <p className="text-sm leading-6 text-[#D8D0C3]/76">
            Top signal: <span className="font-semibold text-[#F5F1EA]">{result.topSignal.signalLabel}</span>
            <span className="text-[#9A9185]/76">, {formatPercentage(result.topSignal.normalizedPercentage)}</span>
          </p>
        ) : null}
        {result.conciseTakeaway ? (
          <p className="text-sm leading-7 text-[#D8D0C3]/70">{result.conciseTakeaway}</p>
        ) : null}
      </div>

      {result.rankedSignalStack.length > 0 ? (
        <div className="grid gap-3">
          {result.rankedSignalStack.map((signal) => (
            <SignalMeter key={signal.signalKey} signal={signal} />
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-5">
        <p className="text-[#9A9185]/76 text-xs font-medium uppercase tracking-[0.12em]">
          {formatAssessmentEstimatedDuration({
            assessmentKey: chapter.assessmentKey,
            estimatedTimeMinutes: chapter.estimatedTimeMinutes,
            questionCount: chapter.questionCount,
          })}
        </p>
        <ActionControl
          label="View report"
          href={result.reportHref}
          disabled={false}
          accessibleLabel={`View report for ${chapter.chapterTitle}`}
        />
      </div>
    </SurfaceCard>
  );
}

function IncompleteChapterCard({
  chapter,
}: Readonly<{
  chapter: WorkspaceAssessmentItem;
}>) {
  const description = getChapterDescription(chapter);
  const actionLabel = getChapterActionLabel(chapter.chapterState);
  const isDisabled = chapter.primaryAction.disabled || !chapter.primaryAction.href;

  return (
    <SurfaceCard className="flex min-h-full flex-col gap-5 p-5" data-assessment-key={chapter.assessmentKey}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={chapter.chapterState} label={chapter.statusLabel} />
      </div>

      <div className="space-y-3">
        <h3 className="text-[1.35rem] font-semibold leading-tight text-[#F5F1EA]">
          {chapter.chapterTitle}
        </h3>
        <p className="text-sm leading-7 text-[#D8D0C3]/70">{description}</p>
        <p className="text-sm leading-6 text-[#D8D0C3]/58">{getChapterStateCopy(chapter)}</p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-5">
        <p className="text-[#9A9185]/76 text-xs font-medium uppercase tracking-[0.12em]">
          {formatAssessmentEstimatedDuration({
            assessmentKey: chapter.assessmentKey,
            estimatedTimeMinutes: chapter.estimatedTimeMinutes,
            questionCount: chapter.questionCount,
          })}
        </p>
        <ActionControl
          label={actionLabel}
          href={chapter.primaryAction.href}
          disabled={isDisabled}
          accessibleLabel={`${actionLabel} for ${chapter.chapterTitle}`}
        />
      </div>
    </SurfaceCard>
  );
}

function ChapterCard({
  chapter,
}: Readonly<{
  chapter: WorkspaceAssessmentItem;
}>) {
  if (chapter.chapterState === 'results_ready' && chapter.completedResult) {
    return <ResultReadyChapterCard chapter={chapter} result={chapter.completedResult} />;
  }

  return <IncompleteChapterCard chapter={chapter} />;
}

function CompletedReports({
  reports,
}: Readonly<{
  reports: readonly WorkspaceCompletedChapterResult[];
}>) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <section className="sonartra-section">
      <div className="sonartra-section-header sonartra-motion-reveal-soft">
        <p className="sonartra-page-eyebrow">Reports</p>
        <h2 className="sonartra-section-title">Completed reports</h2>
        <p className="sonartra-section-description">
          Direct access to ready reports from your completed published chapters.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {reports.map((report) => (
          <SurfaceCard key={report.resultId} className="flex items-start justify-between gap-5 p-5">
            <div className="min-w-0 space-y-2">
              <p className="sonartra-page-eyebrow">Completed report</p>
              <h3 className="truncate text-base font-semibold text-[#F5F1EA]">
                {report.assessmentTitle}
              </h3>
              {report.topSignal ? (
                <p className="text-sm leading-6 text-[#D8D0C3]/64">
                  {report.topSignal.signalLabel}, {formatPercentage(report.topSignal.normalizedPercentage)}
                </p>
              ) : null}
            </div>
            <ActionControl
              label="View report"
              href={report.reportHref}
              disabled={false}
              accessibleLabel={`View report for ${report.assessmentTitle}`}
            />
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}

export default async function UserWorkspacePage() {
  const userId = await getRequestUserId();
  const viewModel = await createWorkspaceService({
    db: getDbPool(),
  }).getWorkspaceViewModel({ userId });

  return (
    <PageFrame>
      <SurfaceCard accent className="overflow-hidden p-0">
        <header className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.36fr)]">
          <div className="space-y-5 p-6 sm:p-8 lg:p-10">
            <p className="sonartra-page-eyebrow">Workspace</p>
            <div className="space-y-4">
              <h1 className="sonartra-page-title">Your Personal Operating Profile</h1>
              <p className="max-w-3xl text-base leading-8 text-[#D8D0C3]/76">
                Complete the available Sonartra chapters to build a clearer operating manual for how
                you work, perform, decide, communicate, and grow.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/16 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <p className="sonartra-page-eyebrow">Profile progress</p>
            <p className="mt-4 text-3xl font-semibold leading-tight text-[#F5F1EA]">
              {viewModel.progress.progressLabel}
            </p>
            <div
              className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"
              role="meter"
              aria-label={viewModel.progress.progressLabel}
              aria-valuemin={0}
              aria-valuemax={viewModel.progress.totalAvailableChapters}
              aria-valuenow={viewModel.progress.completedAvailableChapters}
            >
              <div
                className="h-full rounded-full bg-[#32D6B0]"
                style={{ width: getProgressWidth(viewModel.progress) }}
              />
            </div>
          </div>
        </header>
      </SurfaceCard>

      <section className="sonartra-section">
        <div className="sonartra-section-header sonartra-motion-reveal-soft">
          <p className="sonartra-page-eyebrow">Chapter map</p>
          <h2 className="sonartra-section-title">Profile progress</h2>
          <p className="sonartra-section-description">
            Your progress reflects currently published chapters available in this workspace.
          </p>
        </div>
        <ChapterProgressMap chapters={viewModel.chapters} />
      </section>

      <RecommendedNextChapterPanel recommendation={viewModel.recommendedNextChapter} />

      <section className="sonartra-section">
        <div className="sonartra-section-header sonartra-motion-reveal-soft">
          <p className="sonartra-page-eyebrow">Available chapters</p>
          <h2 className="sonartra-section-title">Published chapters</h2>
          <p className="sonartra-section-description">
            One card appears for each published chapter currently available to you.
          </p>
        </div>

        {viewModel.chapters.length > 0 ? (
          <div aria-label="Available chapter cards" className="grid gap-4 xl:grid-cols-2">
            {viewModel.chapters.map((chapter) => (
              <ChapterCard key={chapter.chapterId} chapter={chapter} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No published chapters"
            description="Chapters will appear here when they are published and available in your workspace."
          />
        )}
      </section>

      <CompletedReports reports={viewModel.completedReports} />
    </PageFrame>
  );
}
