import { EmptyState, PageFrame, PageHeader } from '@/components/shared/user-app-ui';

export default async function AdminAssessmentDetailPlaceholderPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;

  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title={`Manage ${assessmentKey}`}
        description="This placeholder route is the handoff point for later assessment authoring and version-management tasks."
      />

      <EmptyState
        title="Assessment details surface ready"
        description="Task 27 and later admin authoring work can build on this route without reworking the catalogue dashboard links."
      />
    </PageFrame>
  );
}
