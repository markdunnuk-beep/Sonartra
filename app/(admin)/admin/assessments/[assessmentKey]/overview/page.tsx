'use client';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { LabelPill, MetaItem, SectionHeader, SurfaceCard } from '@/components/shared/user-app-ui';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminAssessmentOverviewPage() {
  const assessment = useAdminAssessmentAuthoring();
  const currentStatus = assessment.latestDraftVersion
    ? 'Draft'
    : assessment.publishedVersion
      ? 'Published'
      : 'Not started';

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title="Overview"
        description="Assessment identity and current version status."
      />

      <SurfaceCard className="p-5 lg:p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{assessment.assessmentKey}</LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              Updated {formatDate(assessment.updatedAt)}
            </LabelPill>
          </div>
          <div className="space-y-2">
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
              {assessment.title}
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-white/62">
              {assessment.description ?? 'Assessment identity, versioning context, and current status.'}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetaItem label="Version label" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
        <MetaItem label="Status" value={currentStatus} />
        <MetaItem label="Assessment key" value={assessment.assessmentKey} />
        <MetaItem label="Current published" value={assessment.publishedVersion?.versionTag ?? 'None'} />
      </div>
    </section>
  );
}
