import { notFound } from 'next/navigation';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { AdminAssessmentStepper } from '@/components/admin/admin-assessment-stepper';
import {
  LabelPill,
  MetaItem,
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
          description="Build this assessment in clear sections."
        />

        <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill>{assessment.assessmentKey}</LabelPill>
              <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
                {assessment.latestDraftVersion
                  ? `Editable draft ${assessment.latestDraftVersion.versionTag}`
                  : 'No editable draft'}
              </LabelPill>
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.3rem]">
              Build assessment
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-white/68">
              {assessment.description ?? 'Work through each section, then finish in review.'}
            </p>
          </div>
        </SurfaceCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem label="Assessment key" value={assessment.assessmentKey} />
          <MetaItem label="Current draft" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
          <MetaItem label="Last updated" value={new Date(assessment.updatedAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })} />
        </div>

        <AdminAssessmentStepper />

        {children}
      </PageFrame>
    </AdminAssessmentAuthoringProvider>
  );
}
