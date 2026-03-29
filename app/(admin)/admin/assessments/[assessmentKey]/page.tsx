import { notFound } from 'next/navigation';

import { AdminAssessmentVersionGovernance } from '@/components/admin/admin-assessment-version-governance';
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
        description="Govern canonical version records for this assessment, publish the active draft explicitly, and keep authoring scoped to the current editable draft version only."
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
          </div>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.3rem]">
            Version-aware draft authoring and publish governance.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/68">
            {assessment.description ??
              'This assessment now supports explicit lifecycle control for draft and published versions while keeping the authoring surface bound to the current editable draft only.'}
          </p>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-4">
        <MetaItem label="Assessment key" value={assessment.assessmentKey} />
        <MetaItem label="Versions" value={String(assessment.versions.length)} />
        <MetaItem label="Editable draft" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
        <MetaItem label="Current published" value={assessment.publishedVersion?.versionTag ?? 'None'} />
      </div>

      <SurfaceCard className="p-5 lg:p-6">
        <div className="space-y-3">
          <p className="sonartra-page-eyebrow">Authoring scope</p>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Tasks 28–30 continue to edit the draft version only
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            {assessment.latestDraftVersion
              ? `All current domain, signal, question, option, and weighting CRUD below is attached to draft ${assessment.latestDraftVersion.versionTag}. Published versions remain stable and are not mutated through these forms.`
              : 'No draft version exists right now, so the authoring sections below remain inactive. Published versions will not be used as an implicit authoring target.'}
          </p>
          <p className="text-sm text-white/48">Last assessment update: {formatDate(assessment.updatedAt)}</p>
        </div>
      </SurfaceCard>

      <AdminAssessmentVersionGovernance
        assessmentKey={assessment.assessmentKey}
        versions={assessment.versions}
        latestDraftVersion={assessment.latestDraftVersion}
        publishedVersion={assessment.publishedVersion}
      />

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
          description="Draft authoring is only available when an editable draft version exists for this assessment. Questions, options, and weighting will not attach to a published version."
        />
      )}
    </PageFrame>
  );
}

