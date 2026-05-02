import { AdminAssessmentVersionPlaceholder } from '@/components/admin/admin-assessment-version-placeholder';

export default async function AdminAssessmentNewVersionPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;

  return (
    <AdminAssessmentVersionPlaceholder
      assessmentKey={assessmentKey}
      backHref={`/admin/assessments/${assessmentKey}`}
    />
  );
}
