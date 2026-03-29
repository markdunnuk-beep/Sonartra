'use client';

import { AdminAssessmentPublishActions } from '@/components/admin/admin-assessment-publish-actions';
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

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title="Overview"
        description="See the assessment name, version status, and publish state."
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
              {assessment.description ??
                'Build your draft here, then publish when it is ready.'}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetaItem label="Draft version" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
        <MetaItem label="Published version" value={assessment.publishedVersion?.versionTag ?? 'None'} />
        <MetaItem label="Publish check" value={assessment.draftValidation.isPublishReady ? 'Ready' : 'Needs review'} />
        <MetaItem label="Fix before publishing" value={String(assessment.draftValidation.blockingErrors.length)} />
      </div>

      <SurfaceCard className="p-5 lg:p-6">
        <div className="space-y-3">
          <p className="sonartra-page-eyebrow">Publish check</p>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Check before publishing
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            {assessment.draftValidation.isPublishReady
              ? `Draft ${assessment.draftValidation.draftVersionTag ?? assessment.latestDraftVersion?.versionTag ?? 'version'} is ready to publish.`
              : assessment.draftValidation.status === 'no_draft'
                ? 'No draft yet.'
                : 'Fix the remaining issues before publishing.'}
          </p>
        </div>
      </SurfaceCard>

      <AdminAssessmentPublishActions
        assessmentKey={assessment.assessmentKey}
        draftValidation={assessment.draftValidation}
        latestDraftVersion={assessment.latestDraftVersion}
      />
    </section>
  );
}
