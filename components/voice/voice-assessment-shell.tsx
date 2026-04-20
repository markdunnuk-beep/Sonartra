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

type VoiceShellState =
  | 'available'
  | 'feature_unavailable'
  | 'assessment_not_found'
  | 'unsupported_assessment'
  | 'coming_soon';

type VoiceLifecycleState = 'not_started' | 'in_progress' | 'ready' | 'completed_processing' | 'error';

type VoiceAssessmentShellProps = {
  state: VoiceShellState;
  assessmentTitle?: string;
  assessmentDescription?: string | null;
  assessmentKey?: string;
  lifecycleStatus?: VoiceLifecycleState | null;
  versionTag?: string | null;
  questionCount?: number | null;
};

function mapLifecycleLabel(status: VoiceLifecycleState | null | undefined): string {
  switch (status) {
    case 'in_progress':
      return 'Assessment in progress';
    case 'ready':
      return 'Results already available';
    case 'completed_processing':
      return 'Completion processing';
    case 'error':
      return 'Attention required';
    case 'not_started':
    default:
      return 'Ready when voice runtime is connected';
  }
}

function mapLifecycleTone(status: VoiceLifecycleState | null | undefined): 'not_started' | 'in_progress' | 'ready' {
  switch (status) {
    case 'ready':
      return 'ready';
    case 'in_progress':
      return 'in_progress';
    default:
      return 'not_started';
  }
}

function mapStateCopy(state: VoiceShellState): {
  title: string;
  description: string;
  currentStatus: string;
  note: string;
} {
  switch (state) {
    case 'feature_unavailable':
      return {
        title: 'Voice Assessment unavailable',
        description:
          'Voice delivery is not enabled in this environment. The standard assessment flow remains the active path.',
        currentStatus: 'Feature gate disabled',
        note: 'Voice discovery stays intentionally hidden until the feature is enabled for this environment.',
      };
    case 'assessment_not_found':
      return {
        title: 'Assessment not found',
        description:
          'No published assessment matched this voice route. Check the assessment key or return to the assessment inventory.',
        currentStatus: 'No matching published assessment',
        note: 'Voice routes only resolve published assessments that exist in the current user app inventory.',
      };
    case 'unsupported_assessment':
      return {
        title: 'Voice delivery not configured for this assessment',
        description:
          'This assessment is available in the standard runner, but voice delivery is not part of the MVP surface for it yet.',
        currentStatus: 'Unsupported for voice MVP',
        note: 'Comparability matters here, so only explicitly supported assessments are surfaced for voice delivery.',
      };
    case 'coming_soon':
      return {
        title: 'Voice runtime not connected yet',
        description:
          'The route shell is in place, but live session initiation, microphone access, and realtime delivery are not connected in this task.',
        currentStatus: 'Shell ready, runtime pending',
        note: 'This page is intentionally read-only until the voice runtime is wired into the user flow.',
      };
    case 'available':
    default:
      return {
        title: 'Voice Assessment',
        description:
          'A guided voice-based assessment experience for the existing Sonartra engine. This MVP surface is deliberately limited while the live runtime is being connected.',
        currentStatus: 'Available as preview shell',
        note: 'Voice remains an alternative delivery mode only. Scoring, completion, and results still belong to the standard engine pipeline.',
      };
  }
}

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

export function VoiceAssessmentShell({
  state,
  assessmentTitle,
  assessmentDescription,
  assessmentKey,
  lifecycleStatus,
  versionTag,
  questionCount,
}: Readonly<VoiceAssessmentShellProps>) {
  const copy = mapStateCopy(state);
  const title = assessmentTitle ? `${assessmentTitle} Voice Assessment` : copy.title;
  const showOperationalShell = state === 'available' || state === 'coming_soon';

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Voice Assessment"
        title={title}
        description={assessmentDescription ?? copy.description}
      />

      {!showOperationalShell ? (
        <EmptyState
          title={copy.title}
          description={copy.description}
          action={<ButtonLink href="/app/assessments">Back to assessments</ButtonLink>}
        />
      ) : (
        <>
          <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <LabelPill>MVP preview</LabelPill>
                  <StatusPill
                    status={mapLifecycleTone(lifecycleStatus)}
                    label={mapLifecycleLabel(lifecycleStatus)}
                  />
                </div>
                <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.4rem]">
                  Guided voice delivery, existing Sonartra engine.
                </h2>
                <BodyText className="max-w-3xl text-white/68">{copy.description}</BodyText>
              </div>

              <DisabledCta label="Start voice assessment" />
            </div>
          </SurfaceCard>

          <section className="sonartra-section">
            <SectionHeader
              eyebrow="Current Status"
              title="Voice surface status"
              description="Assessment context is resolved here, but no live session runtime is started from this shell yet."
            />

            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
              <SurfaceCard className="p-5">
                <div className="space-y-3">
                  <h3 className="text-[1.25rem] font-semibold tracking-[-0.025em] text-white">
                    Controlled placeholder state
                  </h3>
                  <p className="text-sm leading-7 text-white/64">{copy.note}</p>
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-5">
                <div className="grid gap-3">
                  <MetaItem label="Current status" value={copy.currentStatus} />
                  <MetaItem label="Assessment key" value={assessmentKey ?? 'Unavailable'} />
                  <MetaItem label="Version" value={versionTag ?? 'Published'} />
                  <MetaItem
                    label="Questions"
                    value={questionCount === null || questionCount === undefined ? 'Unavailable' : String(questionCount)}
                  />
                </div>
              </SurfaceCard>
            </div>
          </section>

          <section className="sonartra-section">
            <SectionHeader
              eyebrow="MVP Boundary"
              title="What this page does not do yet"
              description="The shell exists so the voice pathway can be discovered without implying runtime capabilities that are not connected."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                'No microphone access',
                'No realtime provider session',
                'No transcript persistence from UI',
                'No scoring or completion trigger',
              ].map((item) => (
                <SurfaceCard key={item} muted className="p-5">
                  <p className="text-sm font-medium tracking-[-0.01em] text-white/82">{item}</p>
                </SurfaceCard>
              ))}
            </div>
          </section>
        </>
      )}
    </PageFrame>
  );
}
