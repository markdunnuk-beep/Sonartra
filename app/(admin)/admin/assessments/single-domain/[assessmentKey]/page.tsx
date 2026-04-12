import { redirect } from 'next/navigation';

export default async function SingleDomainAssessmentBuilderRedirectPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;

  redirect(`/admin/assessments/single-domain/${assessmentKey}/overview`);
}
