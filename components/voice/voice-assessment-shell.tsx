import type { VoiceAssessmentPreparationResult } from '@/lib/server/voice/voice-attempt-orchestrator';
import {
  BodyText,
  ButtonLink,
  EmptyState,
  LabelPill,
  MetaItem,
  PageFrame,
  PageHeader,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import type { ReactNode } from 'react';

type VoiceShellRequestState = 'loading' | 'request_error' | 'prepared';

type VoiceAssessmentShellProps = {
  assessmentKey: string;
  requestState: VoiceShellRequestState;
  preparation: VoiceAssessmentPreparationResult | null;
  requestError?: string | null;
  runtimePanel?: ReactNode;
};

function DisabledCta({ label }: { label: string }) {
  return (
    <button
      className={cn(
        'sonartra-button sonartra-button-secondary cursor-not-allowed border-white/10 bg-white/[0.04] text-white/42 opacity-80',
      )}
      disabled
      type="button"
    >
      {label}
    </button>
  );
}

function mapPreparedStateCopy(
  preparation: VoiceAssessmentPreparationResult | null,
): {
  title: string;
  description: string;
  statusLabel: string;
  statusTone: 'not_started' | 'in_progress' | 'ready';
  note: string;
} {
  switch (preparation?.state) {
    case 'feature_disabled':
      return {
        title: 'Voice Assessment unavailable',
        description:
          'Voice delivery is disabled in this environment. The standard assessment path remains the active route.',
        statusLabel: 'Feature disabled',
        statusTone: 'not_started',
        note: 'This route is present, but voice preparation is intentionally blocked until the feature is enabled.',
      };
    case 'unsupported_assessment':
      return {
        title: 'Voice delivery not configured for this assessment',
        description:
          'This assessment is available in the standard runner, but it is not part of the voice MVP surface.',
        statusLabel: 'Unsupported for voice MVP',
        statusTone: 'not_started',
        note: 'Only explicitly supported assessments are surfaced for voice delivery so comparability stays controlled.',
      };
    case 'assessment_not_found':
      return {
        title: 'Assessment not found',
        description:
          'No published assessment matched this route. Return to the assessment inventory and choose a valid assessment.',
        statusLabel: 'Assessment unavailable',
        statusTone: 'not_started',
        note: 'Voice preparation only resolves published assessments in the authenticated app.',
      };
    case 'no_published_version':
      return {
        title: 'No published voice target available',
        description:
          'The assessment key exists, but there is no active published version available to prepare for voice delivery.',
        statusLabel: 'No published version',
        statusTone: 'not_started',
        note: 'Voice preparation depends on the canonical published assessment definition and ordering.',
      };
    case 'attempt_unavailable':
      return {
        title: 'Voice preparation unavailable',
        description:
          'The assessment exists, but the attempt could not be prepared cleanly for voice delivery at this time.',
        statusLabel: 'Attempt unavailable',
        statusTone: 'not_started',
        note: 'No scoring or completion was attempted. This failure occurred before runtime handoff.',
      };
    case 'all_questions_answered':
      return {
        title: `${preparation.data.assessment.title} Voice Assessment`,
        description:
          'All canonical questions for this attempt already have persisted answers. Voice session start is not needed for this attempt.',
        statusLabel: 'All questions already answered',
        statusTone: 'ready',
        note: 'Use the standard assessment or results surfaces for the next step. Voice preparation stops here.',
      };
    case 'resumed_in_progress':
      return {
        title: `${preparation.data.assessment.title} Voice Assessment`,
        description:
          'This assessment already has an in-progress canonical attempt. Voice delivery is positioned to resume from the first unanswered question.',
        statusLabel: 'Resume prepared',
        statusTone: 'in_progress',
        note: 'Live session connection is still pending, but the canonical attempt context is ready to resume.',
      };
    case 'ready_to_start':
      return {
        title: `${preparation.data.assessment.title} Voice Assessment`,
        description:
          'The canonical attempt has been prepared and the first authored question is ready for a guided voice session.',
        statusLabel: 'Ready to start',
        statusTone: 'in_progress',
        note: 'Voice remains an alternative delivery mode only. Completion, scoring, and results stay in the existing engine path.',
      };
    default:
      return {
        title: 'Preparing voice assessment',
        description:
          'The route is resolving the canonical assessment definition and attempt context for voice delivery.',
        statusLabel: 'Preparing',
        statusTone: 'in_progress',
        note: 'No microphone or runtime provider is contacted during this preparation step.',
      };
  }
}

function renderTerminalState(
  assessmentKey: string,
  preparation: VoiceAssessmentPreparationResult | null,
) {
  const copy = mapPreparedStateCopy(preparation);

  return (
    <EmptyState
      title={copy.title}
      description={copy.description}
      action={
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/app/assessments">Back to assessments</ButtonLink>
          <ButtonLink href={`/app/assessments/${assessmentKey}`} variant="secondary">
            Open standard assessment
          </ButtonLink>
        </div>
      }
    />
  );
}

export function VoiceAssessmentShell({
  assessmentKey,
  requestState,
  preparation,
  requestError,
  runtimePanel,
}: Readonly<VoiceAssessmentShellProps>) {
  const copy = mapPreparedStateCopy(preparation);
  const preparedData = requestState === 'prepared' ? preparation?.data ?? null : null;
  const isSupportedPreparedState =
    preparation?.state === 'ready_to_start' || preparation?.state === 'resumed_in_progress';
  const allQuestionsAnswered = preparation?.state === 'all_questions_answered';

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Voice Assessment"
        title={copy.title}
        description={copy.description}
      />

      {requestState === 'loading' ? (
        <>
          <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <LabelPill>Preparation</LabelPill>
                  <StatusPill status="in_progress" label="Loading assessment context" />
                </div>
                <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.4rem]">
                  Preparing your guided voice assessment.
                </h2>
                <BodyText className="max-w-3xl text-white/68">
                  The app is resolving the canonical attempt, published assessment definition, and ordered
                  question flow before any voice runtime is connected.
                </BodyText>
              </div>

              <DisabledCta label="Start voice session" />
            </div>
          </SurfaceCard>

          <section className="sonartra-section">
            <SectionHeader
              eyebrow="Preparation"
              title="Preparing assessment state"
              description="This step is read-only and does not touch microphone, transcript, or scoring flows."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <SurfaceCard key={item} muted className="p-5">
                  <div className="space-y-3">
                    <div className="h-3 w-24 rounded-full bg-white/10" />
                    <div className="h-6 w-full rounded-full bg-white/[0.06]" />
                    <div className="h-6 w-4/5 rounded-full bg-white/[0.04]" />
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {requestState === 'request_error' ? (
        <EmptyState
          title="Voice preparation failed"
          description={
            requestError ?? 'The voice assessment could not be prepared. Try again from the assessment area.'
          }
          action={
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/app/voice-assessments">Back to voice assessments</ButtonLink>
              <ButtonLink href="/app/assessments" variant="secondary">
                Open assessments
              </ButtonLink>
            </div>
          }
        />
      ) : null}

      {requestState === 'prepared' && !isSupportedPreparedState && !allQuestionsAnswered
        ? renderTerminalState(assessmentKey, preparation)
        : null}

      {requestState === 'prepared' && allQuestionsAnswered && preparedData ? (
        <>
          <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <LabelPill>Prepared</LabelPill>
                  <StatusPill status="ready" label={copy.statusLabel} />
                </div>
                <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.4rem]">
                  This attempt no longer needs voice entry.
                </h2>
                <BodyText className="max-w-3xl text-white/68">{copy.note}</BodyText>
              </div>

              <ButtonLink href={`/app/assessments/${preparedData.assessment.assessmentKey}`}>
                Open assessment
              </ButtonLink>
            </div>
          </SurfaceCard>

          <section className="sonartra-section">
            <SectionHeader
              eyebrow="Current Status"
              title="Attempt already answered"
              description="All canonical questions have persisted answers, so this voice shell stops before runtime handoff."
            />

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
              <SurfaceCard className="p-5">
                <div className="space-y-3">
                  <h3 className="text-[1.25rem] font-semibold tracking-[-0.025em] text-white">
                    Voice session not required
                  </h3>
                  <p className="text-sm leading-7 text-white/64">
                    The current attempt already contains a complete answer set. Completion and result handoff remain
                    outside this shell.
                  </p>
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-5">
                <div className="grid gap-3">
                  <MetaItem label="Assessment key" value={preparedData.assessment.assessmentKey} />
                  <MetaItem label="Version" value={preparedData.assessment.versionTag} />
                  <MetaItem
                    label="Answered questions"
                    value={`${preparedData.delivery.answeredQuestionCount} / ${preparedData.delivery.totalQuestionCount}`}
                  />
                  <MetaItem label="Attempt" value={preparedData.attempt.attemptId} />
                </div>
              </SurfaceCard>
            </div>
          </section>
        </>
      ) : null}

      {requestState === 'prepared' && isSupportedPreparedState && preparedData ? (
        <>
          <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <LabelPill>Guided voice</LabelPill>
                  <StatusPill status={copy.statusTone} label={copy.statusLabel} />
                </div>
                <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.4rem]">
                  Voice delivery is prepared and aligned to the existing assessment engine.
                </h2>
                <BodyText className="max-w-3xl text-white/68">{copy.note}</BodyText>
              </div>

              {runtimePanel ? null : <DisabledCta label="Start voice session" />}
            </div>
          </SurfaceCard>

          <section className="sonartra-section">
            <SectionHeader
              eyebrow="Session Context"
              title="Prepared assessment state"
              description="The canonical attempt and ordered question sequence are ready. Live voice connection is the next step, but remains disabled in this task."
            />

            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
              <SurfaceCard className="p-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <LabelPill>Question {preparedData.delivery.currentQuestionNumber ?? 'Pending'}</LabelPill>
                    <LabelPill className="bg-white/[0.04] text-white/74">
                      {preparedData.delivery.totalQuestionCount} total
                    </LabelPill>
                  </div>
                  <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
                    {preparedData.delivery.currentQuestion?.prompt ?? 'No current question available'}
                  </h3>
                  <p className="text-sm leading-7 text-white/64">
                    The next authored question is ready below as a preview of the canonical voice handoff.
                  </p>
                  <div className="grid gap-3">
                    {preparedData.delivery.currentQuestion?.options.map((option) => (
                      <div
                        key={option.optionId}
                        className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3"
                      >
                        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                          {option.label ?? 'Option'}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-white/84">{option.text}</p>
                      </div>
                    )) ?? null}
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-5">
                <div className="grid gap-3">
                  <MetaItem label="Assessment key" value={preparedData.assessment.assessmentKey} />
                  <MetaItem label="Version" value={preparedData.assessment.versionTag} />
                  <MetaItem label="Attempt" value={preparedData.attempt.attemptId} />
                  <MetaItem
                    label="Progress"
                    value={`${preparedData.delivery.answeredQuestionCount} / ${preparedData.delivery.totalQuestionCount}`}
                  />
                </div>
              </SurfaceCard>
            </div>
          </section>

          <section className="sonartra-section">
            <SectionHeader
              eyebrow="Next Step"
              title="Session handoff"
              description="This shell prepares the user for voice entry without yet opening microphone, provider, or transcript flows."
            />

            {runtimePanel ?? (
              <SurfaceCard className="p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-[1.2rem] font-semibold tracking-[-0.02em] text-white">
                      Start voice session is intentionally disabled
                    </h3>
                    <p className="max-w-3xl text-sm leading-7 text-white/64">
                      The next task will wire the live voice runtime into this prepared assessment state. This task stops
                      at the client-side preparation handoff.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <DisabledCta label="Start voice session" />
                    <ButtonLink href="/app/assessments" variant="secondary">
                      Back to assessments
                    </ButtonLink>
                  </div>
                </div>
              </SurfaceCard>
            )}
          </section>
        </>
      ) : null}
    </PageFrame>
  );
}
