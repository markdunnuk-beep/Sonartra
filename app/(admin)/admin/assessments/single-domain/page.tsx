import { ButtonLink, CardTitle, PageFrame, PageHeader, SecondaryText, SurfaceCard } from '@/components/shared/user-app-ui';

function CapabilityCard({
  title,
  detail,
}: Readonly<{
  title: string;
  detail: string;
}>) {
  return (
    <SurfaceCard className="p-5">
      <CardTitle className="text-lg">{title}</CardTitle>
      <SecondaryText className="mt-2">{detail}</SecondaryText>
    </SurfaceCard>
  );
}

export default function SingleDomainBuilderEntryPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Ranked-pattern package workflow"
        description="Use the ranked-pattern import panel inside a single-domain assessment review page to create draft versions, audit packages, apply imports to draft, run publish audit, and explicitly publish."
      />

      <SurfaceCard accent className="space-y-4 p-6 lg:p-7">
        <CardTitle>Active model: one domain, four signals, twenty-four ranked patterns.</CardTitle>
        <SecondaryText>
          New active builds use a reader-first ranked-pattern package. The package workflow creates
          draft versions, audits workbook content, applies imports to draft only, and runs publish
          audit before explicit publish.
        </SecondaryText>
        <SecondaryText>
          Completed results remain tied to their original assessment_version_id and persisted
          canonical_result_payload when a later version is published.
        </SecondaryText>
        <div className="pt-2">
          <ButtonLink href="/admin/assessments" variant="primary">
            Open assessment dashboard
          </ButtonLink>
        </div>
      </SurfaceCard>

      <section className="grid gap-4 lg:grid-cols-3">
        <CapabilityCard
          title="Draft import"
          detail="Apply package rows only to draft single-domain ranked-pattern versions."
        />
        <CapabilityCard
          title="Publish gate"
          detail="Run publish audit and resolve blocking findings before explicit publish."
        />
        <CapabilityCard
          title="Legacy shell"
          detail="The old flexible single-domain builder remains for transitional maintenance, not new active ranked-pattern builds."
        />
      </section>

      <SurfaceCard muted className="space-y-3 p-5">
        <CardTitle className="text-lg">Legacy single-domain shell</CardTitle>
        <SecondaryText>
          Use this only when maintaining older one-domain records that still depend on the historical
          CRUD authoring surface.
        </SecondaryText>
        <ButtonLink href="/admin/assessments/single-domain/new" variant="secondary">
          Open legacy single-domain shell
        </ButtonLink>
      </SurfaceCard>
    </PageFrame>
  );
}
