import { notFound } from 'next/navigation';

import { LabelPill, MetaItem, PageFrame, PageHeader, SurfaceCard } from '@/components/shared/user-app-ui';
import { getDbPool } from '@/lib/server/db';
import { getAdminAssessmentDetailByKey } from '@/lib/server/admin-assessment-detail';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminAssessmentDetailPlaceholderPage({
  params,
}: Readonly<{
  params: Promise<{ assessmentKey: string }>;
}>) {
  const { assessmentKey } = await params;
  const assessment = await getAdminAssessmentDetailByKey(getDbPool(), assessmentKey);

  if (!assessment) {
    notFound();
  }

  return (
    <PageFrame className="space-y-8">
      <PageHeader
        eyebrow="Admin Workspace"
        title={assessment.title}
        description="The base assessment object is now in place. Later tasks can attach domains, signals, questions, and weights to the draft version surfaced here."
      />

      <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{assessment.assessmentKey}</LabelPill>
            <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
              {assessment.latestDraftVersion ? `Draft ${assessment.latestDraftVersion.versionTag}` : 'No draft yet'}
            </LabelPill>
          </div>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.3rem]">
            Assessment shell created successfully.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/68">
            {assessment.description ??
              'This assessment is ready for the next authoring steps. No domain, signal, question, or option content has been added yet.'}
          </p>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-4">
        <MetaItem label="Assessment key" value={assessment.assessmentKey} />
        <MetaItem label="Versions" value={String(assessment.versions.length)} />
        <MetaItem
          label="Latest draft"
          value={assessment.latestDraftVersion?.versionTag ?? 'None'}
        />
        <MetaItem label="Last updated" value={formatDate(assessment.updatedAt)} />
      </div>

      <SurfaceCard className="p-5 lg:p-6">
        <div className="space-y-3">
          <p className="sonartra-page-eyebrow">Next authoring stage</p>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Base records are ready for structural authoring
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Task 28 can attach the first draft domain and signal structure to version{' '}
            {assessment.latestDraftVersion?.versionTag ?? '1.0.0'} without changing the creation
            flow or catalogue routing.
          </p>
        </div>
      </SurfaceCard>
    </PageFrame>
  );
}
