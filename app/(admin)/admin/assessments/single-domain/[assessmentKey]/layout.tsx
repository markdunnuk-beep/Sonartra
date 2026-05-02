import { notFound, redirect } from 'next/navigation';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { AdminCreateVersionHeaderAction } from '@/components/admin/admin-create-version-header-action';
import { SingleDomainBuilderStepper } from '@/components/admin/single-domain-builder-stepper';
import { SingleDomainUnsavedChangesProvider } from '@/components/admin/single-domain-unsaved-changes';
import { LabelPill, PageFrame, SurfaceCard } from '@/components/shared/user-app-ui';
import { getSingleDomainBuilderAssessment } from '@/lib/server/admin-single-domain-builder';
import { getDbPool } from '@/lib/server/db';

export default async function SingleDomainAssessmentBuilderLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;
  const { assessment, redirectTo } = await getSingleDomainBuilderAssessment(getDbPool(), assessmentKey);

  if (redirectTo) {
    redirect(redirectTo);
  }

  if (!assessment) {
    notFound();
  }

  return (
    <AdminAssessmentAuthoringProvider assessment={assessment}>
      <SingleDomainUnsavedChangesProvider>
        <PageFrame className="space-y-4 sm:space-y-5 lg:space-y-6">
          <SurfaceCard accent className="overflow-hidden p-4 sm:p-5 lg:p-6">
            <div className="space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-wrap items-start gap-2">
                  <LabelPill>{assessment.assessmentKey}</LabelPill>
                  <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
                    {assessment.modeLabel}
                  </LabelPill>
                  <LabelPill className="max-w-full whitespace-normal border-white/10 bg-white/[0.04] text-white/68">
                    {assessment.latestDraftVersion
                      ? `Editable draft ${assessment.latestDraftVersion.versionTag}`
                      : assessment.publishedVersion
                        ? `Published version ${assessment.publishedVersion.versionTag}`
                        : 'No draft version yet'}
                  </LabelPill>
                </div>
                <AdminCreateVersionHeaderAction
                  href={`/admin/assessments/single-domain/${assessment.assessmentKey}/versions/new`}
                />
              </div>
              <div className="space-y-2">
                <h1 className="text-[1.72rem] font-semibold leading-[1.02] tracking-[-0.032em] text-white sm:text-[2rem] lg:text-[2.2rem]">
                  {assessment.title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-white/68 sm:leading-7">
                  Single-domain builder scaffold for one domain only, variable signals, and the full
                  assessment authoring workflow that follows.
                </p>
                <p className="max-w-3xl text-sm leading-6 text-white/52 sm:leading-7">
                  This builder supports one domain only. Signal count is flexible; pair coverage will
                  be validated from the signals you define.
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SingleDomainBuilderStepper />

          {children}
        </PageFrame>
      </SingleDomainUnsavedChangesProvider>
    </AdminAssessmentAuthoringProvider>
  );
}
