import { notFound } from 'next/navigation';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { AdminPublishedNoDraftBanner } from '@/components/admin/admin-assessment-draft-state';
import { AdminAssessmentStepper } from '@/components/admin/admin-assessment-stepper';
import {
  LabelPill,
  PageFrame,
  PageHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { getAdminAssessmentDetailByKey } from '@/lib/server/admin-assessment-detail';
import { getDbPool } from '@/lib/server/db';

export default async function AdminAssessmentAuthoringLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;
  const assessment = await getAdminAssessmentDetailByKey(getDbPool(), assessmentKey);

  if (!assessment) {
    notFound();
  }

  return (
    <AdminAssessmentAuthoringProvider assessment={assessment}>
      <PageFrame className="space-y-8">
        <PageHeader
          eyebrow="Admin Workspace"
          title={assessment.title}
          description={
            assessment.builderMode === 'published_no_draft'
              ? 'Browse the published assessment and create a draft when you are ready to change it.'
              : 'Build this assessment in clear sections.'
          }
        />

        <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill>{assessment.assessmentKey}</LabelPill>
              <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
                {assessment.builderMode === 'draft'
                  ? `Editable draft ${assessment.latestDraftVersion?.versionTag ?? ''}`
                  : assessment.builderMode === 'published_no_draft'
                    ? `Published version ${assessment.publishedVersion?.versionTag ?? ''}`
                    : 'No version yet'}
              </LabelPill>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-white/68">
              {assessment.description ??
                (assessment.builderMode === 'published_no_draft'
                  ? 'Browse the current published version and create a draft when you are ready to make changes.'
                  : 'Work through each section, then finish in review.')}
            </p>
          </div>
        </SurfaceCard>

        {assessment.builderMode === 'published_no_draft' ? (
          <AdminPublishedNoDraftBanner
            assessmentKey={assessment.assessmentKey}
            publishedVersionTag={assessment.publishedVersion?.versionTag ?? null}
          />
        ) : null}

        <AdminAssessmentStepper />

        {children}
      </PageFrame>
    </AdminAssessmentAuthoringProvider>
  );
}
