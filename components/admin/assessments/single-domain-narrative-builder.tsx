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
  const publishedVersionTag = assessment.publishedVersion?.versionTag ?? null;
  const draftVersionTag = assessment.latestDraftVersion?.versionTag ?? null;
  const authoringStateTitle = draftVersionTag
    ? 'Draft language imports are available'
    : publishedVersionTag
      ? 'Current live version remains available'
      : 'Draft required before language import';
  const authoringStateDescription = draftVersionTag
    ? `Draft ${draftVersionTag} is editable. Section imports update draft language content before the next publish.`
    : publishedVersionTag
      ? `Current live version ${publishedVersionTag} remains available. No draft is currently in progress, so language imports are disabled until a draft version is created. The checks below describe what editable content will need before the next publish.`
      : 'No live version or editable draft is available yet. Create a draft version before importing section language rows.';

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
            {draftVersionTag
              ? `Draft ${draftVersionTag}`
              : publishedVersionTag
                ? `Published ${publishedVersionTag}`
                : 'Draft context pending'}
          </LabelPill>
        </div>

        <div className="rounded-[1rem] border border-[rgba(50,214,176,0.18)] bg-[rgba(50,214,176,0.06)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="sonartra-page-eyebrow">Authoring state</p>
            {publishedVersionTag ? (
              <LabelPill className="border-[rgba(50,214,176,0.22)] bg-[rgba(50,214,176,0.08)] text-[rgba(213,255,245,0.86)]">
                Live {publishedVersionTag}
              </LabelPill>
            ) : null}
            {draftVersionTag ? (
              <LabelPill className="border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]">
                Draft {draftVersionTag}
              </LabelPill>
            ) : (
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
                No draft in progress
              </LabelPill>
            )}
          </div>
          <div className="mt-3 space-y-2">
            <CardTitle>{authoringStateTitle}</CardTitle>
            <SecondaryText>{authoringStateDescription}</SecondaryText>
          </div>
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
