import { redirect } from 'next/navigation';

export default async function SingleDomainAssessmentBuilderLayout({
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;
  redirect(`/admin/assessments/ranked-pattern/${assessmentKey}/workflow`);
}
