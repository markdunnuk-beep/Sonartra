'use client';

import { AdminDomainSignalAuthoring } from '@/components/admin/admin-domain-signal-authoring';
import { AdminPublishedNoDraftStageState } from '@/components/admin/admin-assessment-draft-state';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { EmptyState } from '@/components/shared/user-app-ui';

export default function AdminAssessmentSignalsPage() {
  const assessment = useAdminAssessmentAuthoring();

  if (!assessment.latestDraftVersion) {
    if (assessment.builderMode === 'published_no_draft') {
      return (
        <AdminPublishedNoDraftStageState
          assessmentKey={assessment.assessmentKey}
          description="You are browsing the published signal model. Create a draft version to edit signals for the next release."
          publishedVersionTag={assessment.publishedVersion?.versionTag ?? null}
          title="Signals are currently read-only"
        />
      );
    }

    return (
      <EmptyState
        title="No draft version available"
        description="Create a draft to add signals."
      />
    );
  }

  return (
    <AdminDomainSignalAuthoring
      assessmentKey={assessment.assessmentKey}
      assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
      domains={assessment.authoredDomains}
      mode="signals"
    />
  );
}
