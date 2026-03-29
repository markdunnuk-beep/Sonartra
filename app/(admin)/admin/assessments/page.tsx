import { AdminAssessmentsDashboard } from '@/components/admin/admin-assessments-dashboard';
import { buildAdminAssessmentDashboardViewModel } from '@/lib/server/admin-assessment-dashboard';
import { getDbPool } from '@/lib/server/db';

export default async function AdminAssessmentsPage() {
  const viewModel = await buildAdminAssessmentDashboardViewModel(getDbPool());

  return (
    <AdminAssessmentsDashboard
      assessments={viewModel.assessments}
      summary={viewModel.summary}
    />
  );
}
