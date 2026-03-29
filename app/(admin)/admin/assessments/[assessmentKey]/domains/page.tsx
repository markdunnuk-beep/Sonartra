'use client';

import { AdminDomainSignalAuthoring } from '@/components/admin/admin-domain-signal-authoring';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { EmptyState } from '@/components/shared/user-app-ui';

export default function AdminAssessmentDomainsPage() {
  const assessment = useAdminAssessmentAuthoring();

  if (!assessment.latestDraftVersion) {
    return (
      <EmptyState
        title="No draft version available"
        description="Domain authoring is only available when an editable draft version exists for this assessment."
      />
    );
  }

  return (
    <AdminDomainSignalAuthoring
      assessmentKey={assessment.assessmentKey}
      assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
      domains={assessment.authoredDomains}
      mode="domains"
    />
  );
}
