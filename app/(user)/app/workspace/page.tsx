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
  WorkspaceSignalIndexItem,
} from '@/lib/server/workspace-service';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createWorkspaceService } from '@/lib/server/workspace-service';
import { formatAssessmentEstimatedDuration } from '@/lib/ui/assessment-duration';

type WorkspaceNextAction = {
  headline: string;
  description: string;
  label: string;
  href: string | null;
  disabled: boolean;
  accessibleLabel: string;
};

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

function getShortAssessmentTitle(title: string): string {
  return title.replace(/^Sonartra\s+/i, '');
}

function getProgressCopy(assessment: WorkspaceAssessmentItem): string | null {
  if (
    assessment.answeredCount === null
    || assessment.totalQuestionCount === null
    || assessment.totalQuestionCount <= 0
  ) {
    return null;
  }

  return `${assessment.answeredCount} of ${assessment.totalQuestionCount} questions are saved.`;
}

function getNextAction(assessments: readonly WorkspaceAssessmentItem[]): WorkspaceNextAction | null {
  const inProgress = assessments.find((assessment) => assessment.status === 'in_progress');
  if (inProgress) {
    const progressCopy = getProgressCopy(inProgress);
    const title = getShortAssessmentTitle(inProgress.assessmentTitle);
    return {
      headline: `Continue ${title}`,
      description: progressCopy
        ? progressCopy
        : 'Pick up from your saved progress.',
      label: 'Resume assessment',
      href: inProgress.actionHref,
      disabled: inProgress.actionDisabled,
      accessibleLabel: `Resume ${inProgress.assessmentTitle}`,
    };
  }

  const ready = assessments.find((assessment) => assessment.status === 'results_ready');
  if (ready) {
    const title = getShortAssessmentTitle(ready.assessmentTitle);
    return {
      headline: `Your ${title} result is ready`,
      description: 'Review your completed signal profile.',
      label: 'View result',
      href: ready.resultHref ?? ready.actionHref,
      disabled: ready.actionDisabled,
      accessibleLabel: `View result for ${ready.assessmentTitle}`,
    };
  }

  const notStarted = assessments.find((assessment) => assessment.status === 'not_started');
  if (notStarted) {
    const title = getShortAssessmentTitle(notStarted.assessmentTitle);
    return {
      headline: `Start ${title}`,
      description: 'Complete your first assessment to generate your signal profile.',
      label: 'Start assessment',
      href: notStarted.actionHref,
      disabled: notStarted.actionDisabled,
      accessibleLabel: `Start ${notStarted.assessmentTitle}`,
    };
  }

  const processing = assessments.find((assessment) => assessment.status === 'completed_processing');
  if (processing) {
    return {
      headline: 'Your result is being prepared',
      description: `${processing.assessmentTitle} has been submitted. The result will appear here when it is ready.`,
      label: 'Processing',
      href: null,
      disabled: true,
      accessibleLabel: `${processing.assessmentTitle} result is being prepared`,
    };
  }

  const error = assessments.find((assessment) => assessment.status === 'error');
  if (error) {
    return {
      headline: 'We could not prepare your result',
      description: `${error.assessmentTitle} needs review before a result can be shown.`,
      label: error.actionLabel,
      href: error.actionHref,
      disabled: error.actionDisabled,
      accessibleLabel: `${error.actionLabel} for ${error.assessmentTitle}`,
    };
  }

  return {
    headline: 'No assessments are available yet',
    description: 'Published assessments will appear here when they are available for your workspace.',
    label: 'No assessment available',
    href: null,
    disabled: true,
    accessibleLabel: 'No assessment available',
  };
}

function getDominantSignalDescription(signals: readonly WorkspaceSignalIndexItem[]): string {
  const primary = signals.find((signal) => signal.rank === 1) ?? signals[0];
  const secondary = signals.find((signal) => signal.rank === 2);

  if (!primary) {
    return '';
  }

  if (!secondary) {
    return `Your latest result is led by ${primary.signalLabel}.`;
  }

  return `Your latest result is led by ${primary.signalLabel}, with ${secondary.signalLabel} as the secondary signal.`;
}

function getLatestSignalAssessment(
  assessments: readonly WorkspaceAssessmentItem[],
): WorkspaceAssessmentItem | null {
  return assessments.find((assessment) =>
    assessment.status === 'results_ready'
    && assessment.signalsForIndex
    && assessment.signalsForIndex.length > 0) ?? null;
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
  compact = false,
}: Readonly<{
  signal: WorkspaceSignalIndexItem;
  compact?: boolean;
}>) {
  const percentage = Math.max(0, Math.min(100, Math.round(signal.normalizedPercentage)));
  const percentageLabel = formatPercentage(signal.normalizedPercentage);

  return (
    <div className="rounded-[1.05rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="sonartra-page-eyebrow">{signal.displayRole}</p>
          <p className="mt-1 truncate text-sm font-semibold text-white/90">{signal.signalLabel}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-white">{percentageLabel}</p>
      </div>
      <div
        className={compact ? 'mt-3 h-1.5 overflow-hidden rounded-full bg-white/8' : 'mt-4 h-2 overflow-hidden rounded-full bg-white/8'}
        role="meter"
        aria-label={`${signal.displayRole} signal, ${signal.signalLabel}, ${percentageLabel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(50,214,176,0.62),rgba(50,214,176,0.88))]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SignalCell({
  signal,
  roleLabel,
}: Readonly<{
  signal: WorkspaceSignalIndexItem | null;
  roleLabel: string;
}>) {
  if (!signal) {
    return (
      <span
        className="text-sm text-white/26"
        aria-label={`${roleLabel} signal not available yet`}
      >
        Not available yet
      </span>
    );
  }

  return (
    <div className="min-w-0">
      <p className="sonartra-page-eyebrow">{signal.displayRole}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white/88">{signal.signalLabel}</p>
      <p className="mt-1 text-sm text-white/58">{formatPercentage(signal.normalizedPercentage)}</p>
    </div>
  );
}

function AssessmentIndexRow({
  assessment,
}: Readonly<{
  assessment: WorkspaceAssessmentItem;
}>) {
  const signals = assessment.signalsForIndex ?? [];
  const roleLabels = ['Primary', 'Secondary', 'Third', 'Fourth'] as const;

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div
        aria-label={`${assessment.assessmentTitle}, ${assessment.statusLabel}`}
        className="hidden items-stretch gap-0 xl:grid xl:grid-cols-[minmax(250px,1.7fr)_minmax(168px,0.9fr)_repeat(4,minmax(120px,1fr))_minmax(128px,0.75fr)]"
      >
        <div className="border-white/8 border-r bg-white/[0.012] p-5">
          <h3 className="text-base font-semibold text-white">{assessment.assessmentTitle}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/58">
            {assessment.assessmentDescription ?? 'Assessment available in your workspace.'}
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-white/38">
            {formatAssessmentEstimatedDuration({
              assessmentKey: assessment.assessmentKey,
              estimatedTimeMinutes: assessment.estimatedTimeMinutes,
              questionCount: assessment.questionCount,
            })}
          </p>
        </div>
        <div className="border-white/8 flex min-w-0 items-start border-r p-4">
          <StatusPill status={assessment.status} label={assessment.statusLabel} />
        </div>
        {roleLabels.map((roleLabel, index) => {
          const rank = index + 1;
          return (
            <div key={roleLabel} className="border-white/8 border-r p-5">
              <SignalCell
                roleLabel={roleLabel}
                signal={signals.find((signal) => signal.rank === rank) ?? null}
              />
            </div>
          );
        })}
        <div className="flex items-start justify-end p-5">
          <ActionControl
            label={assessment.actionLabel}
            href={assessment.actionHref}
            disabled={assessment.actionDisabled}
            accessibleLabel={`${assessment.actionLabel} for ${assessment.assessmentTitle}`}
          />
        </div>
      </div>

      <div className="space-y-5 p-5 xl:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill>{assessment.typeLabel}</LabelPill>
              <StatusPill status={assessment.status} label={assessment.statusLabel} />
            </div>
            <h3 className="text-[1.25rem] font-semibold tracking-[-0.02em] text-white">
              {assessment.assessmentTitle}
            </h3>
            <p className="max-w-2xl text-sm leading-7 text-white/60">
              {assessment.assessmentDescription ?? 'Assessment available in your workspace.'}
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/38">
              {formatAssessmentEstimatedDuration({
                assessmentKey: assessment.assessmentKey,
                estimatedTimeMinutes: assessment.estimatedTimeMinutes,
                questionCount: assessment.questionCount,
              })}
            </p>
          </div>
          <ActionControl
            label={assessment.actionLabel}
            href={assessment.actionHref}
            disabled={assessment.actionDisabled}
            accessibleLabel={`${assessment.actionLabel} for ${assessment.assessmentTitle}`}
          />
        </div>

        {signals.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {signals.map((signal) => (
              <SignalMeter key={signal.signalKey} signal={signal} compact />
            ))}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

export default async function UserWorkspacePage() {
  const userId = await getRequestUserId();
  const viewModel = await createWorkspaceService({
    db: getDbPool(),
  }).getWorkspaceViewModel({ userId });
  const nextAction = getNextAction(viewModel.assessments);
  const latestSignalAssessment = getLatestSignalAssessment(viewModel.assessments);
  const latestSignals = latestSignalAssessment?.signalsForIndex ?? null;

  return (
    <PageFrame>
      <header className="sonartra-page-header sonartra-motion-reveal max-w-[58rem]">
        <h1 className="sonartra-page-title">Workspace</h1>
        <p className="sonartra-page-description">
          Your assessment home for continuing progress, revisiting reports, and keeping your current signal pattern in view.
        </p>
      </header>

      {nextAction ? (
        <SurfaceCard accent className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-4 p-6 lg:p-8">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#32D6B0] shadow-[0_0_18px_rgba(50,214,176,0.26)]" />
                <p className="sonartra-page-eyebrow">Recommended next action</p>
              </div>
              <div className="space-y-3">
                <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.55rem]">
                  {nextAction.headline}
                </h2>
                <p className="text-white/68 max-w-2xl text-sm leading-7">
                  {nextAction.description}
                </p>
              </div>
            </div>

            <div className="border-white/8 flex items-start border-t bg-black/10 p-6 lg:items-end lg:border-l lg:border-t-0 lg:p-8">
              <ActionControl
                label={nextAction.label}
                href={nextAction.href}
                disabled={nextAction.disabled}
                accessibleLabel={nextAction.accessibleLabel}
                variant="primary"
              />
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      {latestSignals ? (
        <section className="sonartra-section">
          <div className="sonartra-section-header sonartra-motion-reveal-soft">
            <h2 className="sonartra-section-title">Your current signal pattern</h2>
            <p className="sonartra-section-description">
              {getDominantSignalDescription(latestSignals)} Use this as a quick reference before opening the full report.
            </p>
          </div>

          <SurfaceCard className="p-4 lg:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {latestSignals.map((signal) => (
                <SignalMeter key={signal.signalKey} signal={signal} />
              ))}
            </div>
          </SurfaceCard>
        </section>
      ) : null}

      <section className="sonartra-section">
        <div className="sonartra-section-header sonartra-motion-reveal-soft">
          <h2 className="sonartra-section-title">Assessment index</h2>
          <p className="sonartra-section-description">
            Track each assessment, its current status, and the signal summary available from completed reports.
          </p>
        </div>

        {viewModel.assessments.length > 0 ? (
          <div aria-label="Assessment Index rows" className="space-y-3">
            <div className="hidden rounded-[1.1rem] border border-white/8 bg-white/[0.025] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/42 xl:grid xl:grid-cols-[minmax(250px,1.7fr)_minmax(168px,0.9fr)_repeat(4,minmax(120px,1fr))_minmax(128px,0.75fr)]">
              <span>Assessment</span>
              <span>Status</span>
              <span>Primary</span>
              <span>Secondary</span>
              <span>Third</span>
              <span>Fourth</span>
              <span className="text-right">Action</span>
            </div>
            {viewModel.assessments.map((assessment) => (
              <AssessmentIndexRow key={assessment.assessmentId} assessment={assessment} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No published assessments"
            description="Assessments will appear here when they are available in your workspace."
          />
        )}
      </section>

    </PageFrame>
  );
}
