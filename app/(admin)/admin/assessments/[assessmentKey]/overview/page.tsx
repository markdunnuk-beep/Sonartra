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
        title="Assessment version status at a glance"
        description="Use this page for the assessment name, active version state, lightweight readiness context, and the temporary publish control."
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
                'This assessment follows the canonical draft-to-published lifecycle, with authoring still bound to the active editable draft only.'}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetaItem label="Draft version" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
        <MetaItem label="Published version" value={assessment.publishedVersion?.versionTag ?? 'None'} />
        <MetaItem label="Readiness" value={assessment.draftValidation.isPublishReady ? 'Ready' : 'Needs review'} />
        <MetaItem label="Blocking issues" value={String(assessment.draftValidation.blockingErrors.length)} />
      </div>

      <SurfaceCard className="p-5 lg:p-6">
        <div className="space-y-3">
          <p className="sonartra-page-eyebrow">Readiness summary</p>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Lightweight draft validation status
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            {assessment.draftValidation.isPublishReady
              ? `Draft ${assessment.draftValidation.draftVersionTag ?? assessment.latestDraftVersion?.versionTag ?? 'version'} currently satisfies the existing publish checks.`
              : assessment.draftValidation.status === 'no_draft'
                ? 'No editable draft exists yet, so readiness cannot be evaluated.'
                : 'The draft still has blocking structural issues. Use Review & Publish to inspect the full validation output.'}
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
