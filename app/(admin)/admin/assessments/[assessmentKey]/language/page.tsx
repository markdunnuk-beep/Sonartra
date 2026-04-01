import { notFound } from 'next/navigation';

import { AdminAssessmentLanguageStep } from '@/components/admin/admin-assessment-language-step';
import { getAdminAssessmentLanguageStepViewModel } from '@/lib/server/admin-assessment-language-step';
import { getDbPool } from '@/lib/server/db';

export default async function AdminAssessmentLanguagePage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;
  const viewModel = await getAdminAssessmentLanguageStepViewModel(getDbPool(), assessmentKey);

  if (!viewModel) {
    notFound();
  }

  return <AdminAssessmentLanguageStep viewModel={viewModel} />;
}
