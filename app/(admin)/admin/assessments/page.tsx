import { AdminAssessmentsDashboard } from '@/components/admin/admin-assessments-dashboard';
import { buildAdminAssessmentDashboardViewModel } from '@/lib/server/admin-assessment-dashboard';
import { getDbPool } from '@/lib/server/db';

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    showArchived?: string;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const viewModel = await buildAdminAssessmentDashboardViewModel(getDbPool(), {
    showArchived: resolvedSearchParams?.showArchived === '1',
  });

  return (
    <AdminAssessmentsDashboard
      assessments={viewModel.assessments}
      showArchived={viewModel.showArchived}
      summary={viewModel.summary}
    />
  );
}
