import {
  ButtonLink,
  EmptyState,
  LabelPill,
  PageFrame,
  PageHeader,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import type {
  WorkspaceAssessmentItem,
  WorkspaceSignalIndexItem,
} from '@/lib/server/workspace-service';
import { isVoiceAssessmentFeatureEnabled } from '@/lib/server/voice/voice-feature';
import { formatAssessmentEstimatedDuration } from '@/lib/ui/assessment-duration';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createWorkspaceService } from '@/lib/server/workspace-service';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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
    return {
      headline: 'Continue where you left off',
      description: progressCopy
        ? `${inProgress.assessmentTitle}: ${progressCopy}`
        : `Resume ${inProgress.assessmentTitle}.`,
      label: 'Resume assessment',
      href: inProgress.actionHref,
      disabled: inProgress.actionDisabled,
      accessibleLabel: `Resume ${inProgress.assessmentTitle}`,
    };
  }

  const ready = assessments.find((assessment) => assessment.status === 'results_ready');
  if (ready) {
    return {
      headline: 'Your latest result is ready',
      description: `Review your completed result for ${ready.assessmentTitle}.`,
      label: 'View result',
      href: ready.resultHref ?? ready.actionHref,
      disabled: ready.actionDisabled,
      accessibleLabel: `View result for ${ready.assessmentTitle}`,
    };
  }

  const notStarted = assessments.find((assessment) => assessment.status === 'not_started');
  if (notStarted) {
    return {
      headline: 'Begin your first assessment',
      description: `Start ${notStarted.assessmentTitle} when you are ready.`,
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
    <div className="rounded-[1rem] border border-white/10 bg-white/[0.025] p-3">
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
          className="h-full rounded-full bg-[rgba(142,162,255,0.78)]"
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
    <SurfaceCard className="p-0">
      <div
        aria-label={`${assessment.assessmentTitle}, ${assessment.statusLabel}`}
        className="hidden items-stretch gap-0 xl:grid xl:grid-cols-[minmax(260px,2fr)_minmax(130px,0.75fr)_repeat(4,minmax(128px,1fr))_minmax(132px,0.8fr)]"
      >
        <div className="border-white/8 border-r p-5">
          <h3 className="text-base font-semibold text-white">{assessment.assessmentTitle}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/58">
            {assessment.assessmentDescription ?? 'Published assessment available in your workspace.'}
          </p>
          <p className="mt-3 text-xs font-medium uppercase text-white/38">
            {formatAssessmentEstimatedDuration({
              assessmentKey: assessment.assessmentKey,
              estimatedTimeMinutes: assessment.estimatedTimeMinutes,
              questionCount: assessment.questionCount,
            })}
          </p>
        </div>
        <div className="border-white/8 flex items-start border-r p-5">
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
              {assessment.assessmentDescription ?? 'Published assessment available in your workspace.'}
            </p>
            <p className="text-xs font-medium uppercase text-white/38">
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
  const voiceFeatureEnabled = isVoiceAssessmentFeatureEnabled();
  const viewModel = await createWorkspaceService({
    db: getDbPool(),
  }).getWorkspaceViewModel({ userId });
  const nextAction = getNextAction(viewModel.assessments);
  const latestSignalAssessment = getLatestSignalAssessment(viewModel.assessments);

  return (
    <PageFrame>
      <PageHeader
        title="Workspace"
        description="Continue assessments, review results, and keep your signal pattern in view."
      />

      {nextAction ? (
        <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="sonartra-page-eyebrow">Recommended Next Action</p>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.6rem]">
                {nextAction.headline}
              </h2>
              <p className="text-white/68 max-w-2xl text-sm leading-7">
                {nextAction.description}
              </p>
            </div>

            <ActionControl
              label={nextAction.label}
              href={nextAction.href}
              disabled={nextAction.disabled}
              accessibleLabel={nextAction.accessibleLabel}
              variant="primary"
            />
          </div>
        </SurfaceCard>
      ) : null}

      {latestSignalAssessment?.signalsForIndex ? (
        <section className="sonartra-section">
          <SectionHeader
            eyebrow="Signal Snapshot"
            title="Signal Snapshot"
            description="Your latest completed assessment shows this signal pattern."
          />

          <SurfaceCard className="p-5 lg:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {latestSignalAssessment.signalsForIndex.map((signal) => (
                <SignalMeter key={signal.signalKey} signal={signal} />
              ))}
            </div>
          </SurfaceCard>
        </section>
      ) : null}

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Assessment Index"
          title="Assessment Index"
          description="Your available assessments and their current state."
        />

        {viewModel.assessments.length > 0 ? (
          <div aria-label="Assessment Index rows" className="space-y-3">
            <div className="hidden rounded-[1.1rem] border border-white/8 bg-white/[0.025] px-5 py-3 text-xs font-semibold uppercase text-white/42 xl:grid xl:grid-cols-[minmax(260px,2fr)_minmax(130px,0.75fr)_repeat(4,minmax(128px,1fr))_minmax(132px,0.8fr)]">
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
            description="Published assessments will appear here when they are available for this user."
          />
        )}
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Voice Assessment"
          title="Guided voice delivery"
          description="A secondary route for supported assessments when voice delivery is enabled."
        />

        <SurfaceCard muted className="overflow-hidden p-5 lg:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <LabelPill>Preview surface</LabelPill>
                <StatusPill
                  status={voiceFeatureEnabled ? 'in_progress' : 'not_started'}
                  label={voiceFeatureEnabled ? 'Available in limited voice shell' : 'Unavailable in this environment'}
                />
              </div>
              <h3 className="max-w-3xl text-xl font-semibold tracking-[-0.02em] text-white lg:text-2xl">
                Guided voice assessment
              </h3>
              <p className="max-w-3xl text-sm leading-7 text-white/66">
                Open the controlled voice route for supported assessments. Live scoring still uses the canonical assessment path.
              </p>
            </div>

            {voiceFeatureEnabled ? (
              <ButtonLink
                href="/app/voice-assessments"
                variant="primary"
                ariaLabel="Open guided voice assessment"
              >
                Open Voice Assessment
              </ButtonLink>
            ) : (
              <button
                type="button"
                disabled
                aria-label="Voice assessment unavailable in this environment"
                className="sonartra-button sonartra-button-secondary cursor-not-allowed border-white/10 bg-white/[0.04] text-white/42 opacity-80"
              >
                Voice unavailable
              </button>
            )}
          </div>
        </SurfaceCard>
      </section>

      {viewModel.latestResult ? (
        <p className="text-sm text-white/42">
          Latest result: {viewModel.latestResult.assessmentTitle}, completed{' '}
          {formatDate(viewModel.latestResult.completedAt)}.
        </p>
      ) : null}
    </PageFrame>
  );
}
