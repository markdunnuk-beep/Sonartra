import { ButtonLink, CardTitle, PageFrame, PageHeader, SecondaryText, SurfaceCard } from '@/components/shared/user-app-ui';

function AssessmentTypeCard(props: {
  title: string;
  description: string;
  points: readonly string[];
  href: string;
  cta: string;
}) {
  return (
    <SurfaceCard interactive className="flex h-full flex-col justify-between gap-6 p-6 lg:p-7">
      <div className="space-y-4">
        <div className="space-y-2">
          <CardTitle>{props.title}</CardTitle>
          <SecondaryText>{props.description}</SecondaryText>
        </div>

        <div className="space-y-2">
          {props.points.map((point) => (
            <p className="text-sm leading-7 text-white/68" key={point}>
              {point}
            </p>
          ))}
        </div>
      </div>

      <div>
        <ButtonLink href={props.href} variant="primary">
          {props.cta}
        </ButtonLink>
      </div>
    </SurfaceCard>
  );
}

export default function AdminAssessmentTypeSelectionPage() {
  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Choose assessment type"
        description="Select the builder path before creating the first draft."
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <AssessmentTypeCard
          title="Multi-Domain Assessment"
          description="Broad profile across multiple domains using the current builder path."
          points={[
            'Uses multiple domains and the existing builder flow.',
            'Best when the assessment needs a wider behavioural profile.',
            'Routes directly into the current multi-domain creation path.',
          ]}
          href="/admin/assessments/create"
          cta="Continue to multi-domain builder"
        />

        <AssessmentTypeCard
          title="Single-Domain Assessment"
          description="One domain, deeper reporting, and richer language datasets."
          points={[
            'Restricted to one domain, with a variable number of signals.',
            'Designed for full authoring later: questions, responses, weightings, and language datasets.',
            'Starts from the dedicated single-domain builder entry path.',
          ]}
          href="/admin/assessments/single-domain"
          cta="Continue to single-domain builder"
        />
      </section>
    </PageFrame>
  );
}
