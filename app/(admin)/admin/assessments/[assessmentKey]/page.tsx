import { notFound } from 'next/navigation';

import { AdminDomainSignalAuthoring } from '@/components/admin/admin-domain-signal-authoring';
import { AdminQuestionOptionAuthoring } from '@/components/admin/admin-question-option-authoring';
import { AdminWeightingAuthoring } from '@/components/admin/admin-weighting-authoring';
import {
  EmptyState,
  LabelPill,
  MetaItem,
  PageFrame,
  PageHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { getAdminAssessmentDetailByKey } from '@/lib/server/admin-assessment-detail';
import { getDbPool } from '@/lib/server/db';

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
        description="The base assessment object is now in place. Draft authoring on this page can add domains, signals, questions, options, and explicit option-to-signal weights directly against the latest draft version."
      />

      <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{assessment.assessmentKey}</LabelPill>
            <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
              {assessment.latestDraftVersion
                ? `Draft ${assessment.latestDraftVersion.versionTag}`
                : 'No draft yet'}
            </LabelPill>
          </div>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.3rem]">
            Assessment shell created successfully.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/68">
            {assessment.description ??
              'This assessment is ready for structural authoring. Domains, signals, questions, options, and weighting all attach to the latest draft version surfaced here.'}
          </p>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-4">
        <MetaItem label="Assessment key" value={assessment.assessmentKey} />
        <MetaItem label="Versions" value={String(assessment.versions.length)} />
        <MetaItem label="Latest draft" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
        <MetaItem label="Last updated" value={formatDate(assessment.updatedAt)} />
      </div>

      <SurfaceCard className="p-5 lg:p-6">
        <div className="space-y-3">
          <p className="sonartra-page-eyebrow">Draft authoring status</p>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Structural records are authored directly against the latest draft version
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            This workspace now supports domain, signal, question, option, and weighting authoring on version{' '}
            {assessment.latestDraftVersion?.versionTag ?? '1.0.0'}. Publish controls and final validation remain separate later tasks.
          </p>
        </div>
      </SurfaceCard>

      {assessment.latestDraftVersion ? (
        <>
          <AdminDomainSignalAuthoring
            assessmentKey={assessment.assessmentKey}
            assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
            domains={assessment.authoredDomains}
          />

          <AdminQuestionOptionAuthoring
            assessmentKey={assessment.assessmentKey}
            assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
            domains={assessment.questionDomains}
            questions={assessment.authoredQuestions}
          />

          <AdminWeightingAuthoring
            assessmentKey={assessment.assessmentKey}
            assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
            availableSignals={assessment.availableSignals}
            questions={assessment.authoredQuestions}
            weightingSummary={assessment.weightingSummary}
          />
        </>
      ) : (
        <EmptyState
          title="No draft version available"
          description="Draft authoring is only available when a draft version exists for this assessment. Questions, options, and weighting will not attach to a published version."
        />
      )}
    </PageFrame>
  );
}
