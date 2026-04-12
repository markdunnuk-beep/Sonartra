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
        title="Single-domain builder"
        description="Set up a one-domain assessment with a variable number of signals and the full authoring surfaces that follow."
      />

      <SurfaceCard accent className="space-y-4 p-6 lg:p-7">
        <CardTitle>One domain, full assessment authoring.</CardTitle>
        <SecondaryText>
          This path is for assessments that stay inside one domain while still supporting the full build:
          questions, responses, weightings, language datasets, review, and publish.
        </SecondaryText>
        <SecondaryText>
          Signal count is flexible. The constraint is one domain only.
        </SecondaryText>
        <div className="pt-2">
          <ButtonLink href="/admin/assessments/single-domain/new" variant="primary">
            Create Single-Domain Assessment
          </ButtonLink>
        </div>
      </SurfaceCard>

      <section className="grid gap-4 lg:grid-cols-3">
        <CapabilityCard
          title="Assessment structure"
          detail="One domain only, with variable signals, authored questions, and response options."
        />
        <CapabilityCard
          title="Scoring setup"
          detail="Responses and weightings remain part of the same draft/version lifecycle used elsewhere in admin."
        />
        <CapabilityCard
          title="Language coverage"
          detail="Single-domain language datasets are part of this builder path alongside review and publish."
        />
      </section>
    </PageFrame>
  );
}
