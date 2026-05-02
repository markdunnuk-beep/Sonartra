import { AdminAssessmentVersionPlaceholder } from '@/components/admin/admin-assessment-version-placeholder';

export default async function AdminAssessmentNewVersionPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
  searchParams: Promise<{
    status?: string;
    draftVersion?: string;
  }>;
}>) {
  const { assessmentKey } = await params;
  const { status, draftVersion } = await searchParams;

  return (
    <AdminAssessmentVersionPlaceholder
      assessmentKey={assessmentKey}
      backHref={`/admin/assessments/${assessmentKey}`}
      mode="multi_domain"
      status={normalizeCreateVersionStatus(status)}
      draftVersionTag={draftVersion ?? null}
    />
  );
}

function normalizeCreateVersionStatus(value: string | undefined) {
  switch (value) {
    case 'draft_exists':
    case 'assessment_not_found':
    case 'published_source_not_found':
    case 'persistence_error':
      return value;
    default:
      return null;
  }
}
