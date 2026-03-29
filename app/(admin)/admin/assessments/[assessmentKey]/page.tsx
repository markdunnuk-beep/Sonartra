import { redirect } from 'next/navigation';

export default async function AdminAssessmentDetailRedirectPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;

  redirect(`/admin/assessments/${assessmentKey}/overview`);
}
