import { notFound } from 'next/navigation';

import { AdminAssessmentIntroEditor } from '@/components/admin/admin-assessment-intro-editor';
import { getAdminAssessmentIntroStepViewModel } from '@/lib/server/admin-assessment-intro-step';
import { getDbPool } from '@/lib/server/db';

export default async function AdminAssessmentIntroPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;
  const viewModel = await getAdminAssessmentIntroStepViewModel(getDbPool(), assessmentKey);

  if (!viewModel) {
    notFound();
  }

  return <AdminAssessmentIntroEditor viewModel={viewModel} />;
}
