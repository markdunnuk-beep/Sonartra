import { ButtonLink, CardTitle, PageFrame, PageHeader, SecondaryText, SurfaceCard } from '@/components/shared/user-app-ui';

function AssessmentTypeCard(props: {
  title: string;
  description: string;
  points: readonly string[];
  href: string;
  cta: string;
  variant?: 'primary' | 'secondary';
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
        <ButtonLink href={props.href} variant={props.variant ?? 'secondary'}>
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
        title="Create assessment version"
        description="Use the ranked-pattern package workflow for new active builds. Legacy builders remain available only for historical maintenance."
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <AssessmentTypeCard
          title="Ranked-Pattern Package Workflow"
          description="The active Sonartra build path: one domain, four scored signals, twenty-four ranked patterns, import audit, draft apply, publish audit, and explicit publish."
          points={[
            'Create or select a draft single-domain ranked-pattern version.',
            'Import a reader-first package into draft only, then run publish audit.',
            'Publishing affects new attempts; completed results stay tied to their persisted payload.',
          ]}
          href="/admin/assessments/single-domain"
          cta="Open ranked-pattern workflow"
          variant="primary"
        />

        <AssessmentTypeCard
          title="Legacy Builders"
          description="Archived transitional builder paths for old assessment history and maintenance only."
          points={[
            'Multi-domain and flexible signal authoring are superseded for new active builds.',
            'Do not use these paths to create ranked-pattern assessment versions.',
            'Use only when preserving or inspecting legacy records that still require these routes.',
          ]}
          href="/admin/assessments/create"
          cta="Open legacy multi-domain builder"
        />
      </section>
    </PageFrame>
  );
}
