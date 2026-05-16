import { ButtonLink, CardTitle, LabelPill, PageFrame, PageHeader, SecondaryText, SurfaceCard } from '@/components/shared/user-app-ui';

export default function SingleDomainBuilderEntryPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Legacy single-domain builder retired"
        description="The old single-domain builder is no longer an active authoring path. Use the ranked-pattern package workflow for all current Leadership Approach work."
      />

      <SurfaceCard accent className="space-y-5 p-6 lg:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>Deprecated route</LabelPill>
          <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
            Ranked-pattern only
          </LabelPill>
        </div>
        <div className="space-y-2">
          <CardTitle>Use the ranked-pattern workflow.</CardTitle>
          <SecondaryText>
            Single-domain CRUD authoring, pair-oriented language editing, and old builder review
            routes are retired from active admin navigation. Historical records should be
            archived or handled through a controlled data plan rather than opened through this
            route.
          </SecondaryText>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/admin/assessments/ranked-pattern/workflow" variant="primary">
            Open ranked-pattern workflow
          </ButtonLink>
          <ButtonLink href="/admin/assessments">
            Back to assessment packages
          </ButtonLink>
        </div>
      </SurfaceCard>
    </PageFrame>
  );
}
