import { notFound } from 'next/navigation';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { AdminCreateVersionHeaderAction } from '@/components/admin/admin-create-version-header-action';
import { AdminPublishedNoDraftBanner } from '@/components/admin/admin-assessment-draft-state';
import { AdminAssessmentStepper } from '@/components/admin/admin-assessment-stepper';
import {
  LabelPill,
  PageFrame,
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
      <PageFrame className="space-y-4 sm:space-y-5 lg:space-y-6">
        <SurfaceCard accent className="overflow-hidden p-4 sm:p-5 lg:p-6">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap items-start gap-2">
                <LabelPill>{assessment.assessmentKey}</LabelPill>
                <LabelPill className="max-w-full whitespace-normal border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
                  {assessment.builderMode === 'draft'
                    ? `Editable draft ${assessment.latestDraftVersion?.versionTag ?? ''}`
                    : assessment.builderMode === 'published_no_draft'
                      ? `Published version ${assessment.publishedVersion?.versionTag ?? ''}`
                      : 'No version yet'}
                </LabelPill>
              </div>
              <AdminCreateVersionHeaderAction
                href={`/admin/assessments/${assessment.assessmentKey}/versions/new`}
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-[1.72rem] font-semibold leading-[1.02] tracking-[-0.032em] text-white sm:text-[2rem] lg:text-[2.2rem]">
                {assessment.title}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/68 sm:leading-7">
                {assessment.builderMode === 'published_no_draft'
                  ? 'Browse the published assessment and create a draft when you are ready to change it.'
                  : assessment.description ?? 'Work through each section, then finish in review.'}
              </p>
            </div>
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
