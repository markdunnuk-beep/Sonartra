'use client';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainComposerPreview } from '@/components/admin/assessments/single-domain-composer-preview';
import { SingleDomainSectionNav } from '@/components/admin/assessments/single-domain-section-nav';
import { SingleDomainSectionPanel } from '@/components/admin/assessments/single-domain-section-panel';
import { CardTitle, LabelPill, SectionHeader, SecondaryText, SurfaceCard } from '@/components/shared/user-app-ui';
import { buildSingleDomainNarrativeBuilderModel } from '@/lib/assessment-language/single-domain-builder-mappers';

export function SingleDomainNarrativeBuilder() {
  const assessment = useAdminAssessmentAuthoring();
  const model = buildSingleDomainNarrativeBuilderModel(assessment);

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Language"
        title="Single-domain narrative"
        description="Author against the locked six-section narrative contract only."
      />

      <SurfaceCard accent className="space-y-4 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{assessment.assessmentKey}</LabelPill>
          <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
            {assessment.modeLabel}
          </LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
            {assessment.latestDraftVersion
              ? `Draft ${assessment.latestDraftVersion.versionTag}`
              : assessment.publishedVersion
                ? `Published ${assessment.publishedVersion.versionTag}`
                : 'Draft context pending'}
          </LabelPill>
        </div>

        <div className="space-y-2">
          <CardTitle>Narrative readiness</CardTitle>
          <SecondaryText>
            This shell replaces the old overlapping single-domain narrative authoring model with one
            section-first contract: intro, hero, drivers, pair, limitation, and application.
          </SecondaryText>
          <SecondaryText>{model.adapterNote}</SecondaryText>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Sections complete</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{model.readiness.completeCount}</p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Sections incomplete</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{model.readiness.incompleteCount}</p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Sections waiting</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{model.readiness.waitingCount}</p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Section warnings</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{model.readiness.validationWarningCount}</p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Blocking diagnostics</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{model.readiness.blockingDiagnosticCount}</p>
          </div>
        </div>
      </SurfaceCard>

      <SingleDomainComposerPreview />

      <SingleDomainSectionNav sections={model.sections} />

      <div className="space-y-4">
        {model.sections.map((section) => (
          <SingleDomainSectionPanel key={section.key} section={section} />
        ))}
      </div>
    </section>
  );
}
