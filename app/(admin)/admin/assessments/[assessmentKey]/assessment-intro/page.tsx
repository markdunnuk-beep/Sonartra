'use client';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { EmptyState, LabelPill, SectionHeader, SurfaceCard } from '@/components/shared/user-app-ui';

export default function AdminAssessmentIntroPage() {
  const assessment = useAdminAssessmentAuthoring();

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Assessment Intro"
        title="Assessment Intro"
        description="Define the shell for the pre-assessment introduction shown before participants enter the runner."
      />

      <SurfaceCard className="p-5 lg:p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{assessment.assessmentKey}</LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              Placeholder shell
            </LabelPill>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            This step will later control the introduction experience shown before the live assessment begins.
            For now, it reserves the builder slot and layout without adding editable fields or runtime behavior.
          </p>
        </div>
      </SurfaceCard>

      <EmptyState
        title="Assessment intro authoring arrives in Task 2"
        description="Content controls, persistence wiring, and runner integration are intentionally deferred. This page currently exists as a structural placeholder inside the assessment builder."
      />
    </section>
  );
}
