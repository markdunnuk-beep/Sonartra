import { redirect } from 'next/navigation';

export default async function SingleDomainAssessmentNewVersionPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;

  redirect(`/admin/assessments/ranked-pattern/${assessmentKey}/workflow`);
}
