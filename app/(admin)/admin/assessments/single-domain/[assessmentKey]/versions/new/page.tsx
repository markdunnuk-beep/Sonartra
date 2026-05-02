import { AdminAssessmentVersionPlaceholder } from '@/components/admin/admin-assessment-version-placeholder';

export default async function SingleDomainAssessmentNewVersionPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;

  return (
    <AdminAssessmentVersionPlaceholder
      assessmentKey={assessmentKey}
      backHref={`/admin/assessments/single-domain/${assessmentKey}`}
    />
  );
}
