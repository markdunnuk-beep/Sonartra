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
        description="Use the ranked-pattern package workflow for all active assessment authoring. Legacy builder access has been retired from the admin surface."
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <AssessmentTypeCard
          title="Ranked-Pattern Package Workflow"
          description="The active Sonartra build path: one domain, four scored signals, twenty-four ranked patterns, import audit, draft apply, publish audit, and explicit publish."
          points={[
            'Start from workbook metadata, then create or resolve the compatible draft.',
            'Import a reader-first package into draft only, then run publish audit.',
            'Publishing affects new attempts; completed results stay tied to their persisted payload.',
          ]}
          href="/admin/assessments/ranked-pattern/workflow"
          cta="Open ranked-pattern workflow"
          variant="primary"
        />

        <SurfaceCard muted className="flex h-full flex-col justify-between gap-6 p-6 lg:p-7">
          <div className="space-y-4">
            <div className="space-y-2">
              <CardTitle>Legacy builder access removed</CardTitle>
              <SecondaryText>
                Multi-domain and old single-domain authoring are no longer active product paths.
                Historical records should be archived or handled through a controlled data plan,
                not opened through legacy builders.
              </SecondaryText>
            </div>
            <div className="space-y-2">
              <p className="text-sm leading-7 text-white/68">
                Do not create new assessment versions through the legacy multi-domain builder.
              </p>
              <p className="text-sm leading-7 text-white/68">
                Do not use old single-domain pair-oriented authoring to bypass ranked-pattern
                import, report-first storage, or publish audit.
              </p>
              <p className="text-sm leading-7 text-white/68">
                Use the ranked-pattern workflow for active assessment authoring.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </section>
    </PageFrame>
  );
}
