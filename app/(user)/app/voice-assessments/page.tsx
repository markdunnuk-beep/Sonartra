import {
  ButtonLink,
  EmptyState,
  LabelPill,
  PageFrame,
  PageHeader,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { VoiceAssessmentShell } from '@/components/voice/voice-assessment-shell';
import { getDbPool } from '@/lib/server/db';
import { listPublishedAssessmentInventory } from '@/lib/server/published-assessment-inventory';
import {
  getVoiceAssessmentSupportedKeys,
  isVoiceAssessmentFeatureEnabled,
  isVoiceAssessmentSupportedForKey,
} from '@/lib/server/voice/voice-feature';

export default async function VoiceAssessmentsIndexPage() {
  if (!isVoiceAssessmentFeatureEnabled()) {
    return <VoiceAssessmentShell state="feature_unavailable" />;
  }

  const inventory = await listPublishedAssessmentInventory(getDbPool());
  const supportedAssessments = inventory.filter((assessment) =>
    isVoiceAssessmentSupportedForKey(assessment.assessmentKey),
  );

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Voice Assessment"
        title="Voice delivery preview"
        description="Browse the assessments that have an MVP voice shell in the authenticated app."
      />

      {supportedAssessments.length === 0 ? (
        <EmptyState
          title="No voice-ready assessment shells"
          description={`Voice delivery is enabled, but no published assessments currently match the supported voice set: ${getVoiceAssessmentSupportedKeys().join(', ')}.`}
          action={<ButtonLink href="/app/assessments">Browse standard assessments</ButtonLink>}
        />
      ) : (
        <section className="sonartra-section">
          <SectionHeader
            eyebrow="Limited Availability"
            title="Available voice assessment shells"
            description="These routes expose assessment-aware voice placeholders only. Live voice runtime is not connected yet."
          />

          <div className="grid gap-4 xl:grid-cols-2">
            {supportedAssessments.map((assessment) => (
              <SurfaceCard key={assessment.assessmentId} interactive className="p-5">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <LabelPill>Voice preview</LabelPill>
                        <LabelPill className="bg-white/[0.04] text-white/74">
                          {assessment.versionTag}
                        </LabelPill>
                      </div>
                      <h2 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
                        {assessment.title}
                      </h2>
                      <p className="max-w-xl text-sm leading-7 text-white/62">
                        {assessment.description ?? 'Published assessment available in the standard runner.'}
                      </p>
                    </div>

                    <ButtonLink href={`/app/voice-assessments/${assessment.assessmentKey}`}>
                      Open voice shell
                    </ButtonLink>
                  </div>

                  <div className="border-white/8 grid gap-3 border-t pt-4 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">Assessment key</p>
                      <p className="mt-2 text-sm text-white/82">{assessment.assessmentKey}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">Questions</p>
                      <p className="mt-2 text-sm text-white/82">{assessment.questionCount}</p>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </section>
      )}
    </PageFrame>
  );
}
