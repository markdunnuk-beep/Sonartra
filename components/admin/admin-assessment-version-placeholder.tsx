import { ButtonLink, LabelPill, SectionHeader, SurfaceCard } from '@/components/shared/user-app-ui';

export function AdminAssessmentVersionPlaceholder({
  assessmentKey,
  backHref,
}: Readonly<{
  assessmentKey: string;
  backHref: string;
}>) {
  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Versioning"
        title="Create new version"
        description="Start a new version of an existing assessment family."
      />

      <SurfaceCard className="space-y-5 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{assessmentKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
            Placeholder
          </LabelPill>
        </div>

        <div className="space-y-2">
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Version creation is not implemented yet.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            This entry point is reserved for creating a new version of an existing
            assessment. Use the current builder for existing drafts until version
            creation is implemented.
          </p>
        </div>

        <div>
          <ButtonLink href={backHref}>Back to assessment</ButtonLink>
        </div>
      </SurfaceCard>
    </section>
  );
}
