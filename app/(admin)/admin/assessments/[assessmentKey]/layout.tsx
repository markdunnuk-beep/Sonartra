import { notFound } from 'next/navigation';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { AdminAssessmentSectionNav } from '@/components/admin/admin-assessment-section-nav';
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
              <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
                {assessment.publishedVersion
                  ? `Published ${assessment.publishedVersion.versionTag}`
                  : 'No published version'}
              </LabelPill>
              <LabelPill
                className={
                  assessment.draftValidation.isPublishReady
                    ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]'
                    : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]'
                }
              >
                {assessment.draftValidation.isPublishReady ? 'Ready to publish' : 'Needs review'}
              </LabelPill>
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.3rem]">
              Build assessment
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-white/68">
              {assessment.description ??
                'Work through each section, then review and publish.'}
            </p>
          </div>
        </SurfaceCard>

        <div className="grid gap-4 xl:grid-cols-4">
          <MetaItem label="Assessment key" value={assessment.assessmentKey} />
          <MetaItem label="Versions" value={String(assessment.versions.length)} />
          <MetaItem label="Draft" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
          <MetaItem label="Published" value={assessment.publishedVersion?.versionTag ?? 'None'} />
        </div>

        <AdminAssessmentSectionNav assessmentKey={assessment.assessmentKey} />

        {children}
      </PageFrame>
    </AdminAssessmentAuthoringProvider>
  );
}
