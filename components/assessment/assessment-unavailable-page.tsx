import { ButtonLink, EmptyState, PageFrame, PageHeader } from '@/components/shared/user-app-ui';

type AssessmentUnavailablePageProps = {
  assessmentKey: string;
};

export function AssessmentUnavailablePage({
  assessmentKey,
}: AssessmentUnavailablePageProps) {
  return (
    <PageFrame>
      <PageHeader
        eyebrow="Assessment unavailable"
        title="This chapter is not currently available."
        description="Published chapters appear in your workspace when they are ready to start."
      />
      <EmptyState
        title="Return to workspace"
        description="This chapter may be unpublished, archived, or not yet assigned to your workspace."
        action={
          <ButtonLink href={`/app/assessments#${assessmentKey}`} variant="secondary">
            Return to workspace
          </ButtonLink>
        }
      />
    </PageFrame>
  );
}
