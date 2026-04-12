import Link from 'next/link';

import {
  ButtonLink,
  EmptyState,
  LabelPill,
  MetaItem,
  PageFrame,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import type {
  AdminAssessmentDashboardItem,
  AdminAssessmentDashboardSummary,
  AdminAssessmentDraftReadiness,
  AdminAssessmentOverallStatus,
} from '@/lib/server/admin-assessment-dashboard';

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusPillClass(status: AdminAssessmentOverallStatus): string {
  switch (status) {
    case 'published':
      return 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]';
    case 'published_and_draft':
      return 'border-[rgba(142,162,255,0.25)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]';
    case 'draft_only':
      return 'border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]';
    case 'setup_incomplete':
      return 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]';
    case 'no_versions':
      return 'border-white/10 bg-white/[0.045] text-white/68';
  }
}

function getDraftReadinessPillClass(status: AdminAssessmentDraftReadiness): string {
  switch (status) {
    case 'ready':
      return 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]';
    case 'not_ready':
      return 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]';
    case 'no_draft':
      return 'border-white/10 bg-white/[0.045] text-white/68';
  }
}

function formatDraftReadiness(status: AdminAssessmentDraftReadiness): string {
  switch (status) {
    case 'ready':
      return 'Draft ready';
    case 'not_ready':
      return 'Draft not ready';
    case 'no_draft':
      return 'No draft';
  }
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <SurfaceCard className="p-5">
      <p className="sonartra-page-eyebrow">{label}</p>
      <p className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-white">{value}</p>
      <p className="mt-2 text-sm leading-7 text-white/58">{detail}</p>
    </SurfaceCard>
  );
}

function AssessmentCard({
  assessment,
}: {
  assessment: AdminAssessmentDashboardItem;
}) {
  const reviewHref = assessment.latestDraftVersion
    ? `${assessment.actionHref}/review`
    : null;

  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill>{assessment.assessmentKey}</LabelPill>
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
                {assessment.modeLabel}
              </LabelPill>
              <LabelPill className={getStatusPillClass(assessment.overallStatus)}>
                {assessment.overallStatusLabel}
              </LabelPill>
              <LabelPill className={getDraftReadinessPillClass(assessment.latestDraftReadiness)}>
                {formatDraftReadiness(assessment.latestDraftReadiness)}
              </LabelPill>
              {!assessment.isActive ? (
                <LabelPill className="border-white/10 bg-white/[0.04] text-white/58">
                  Inactive
                </LabelPill>
              ) : null}
            </div>

            <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
              {assessment.title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-white/62">
              {assessment.description ?? assessment.overallStatusDetail}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href={assessment.actionHref} variant="primary">
              Open builder
            </ButtonLink>
            {reviewHref ? (
              <Link
                className={cn(
                  'sonartra-focus-ring inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/72 transition duration-200 hover:border-white/14 hover:bg-white/[0.06] hover:text-white',
                )}
                href={reviewHref}
              >
                Review draft
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetaItem
            label="Published version"
            value={assessment.publishedVersion?.versionTag ?? 'None'}
          />
          <MetaItem label="Latest draft" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
          <MetaItem label="Draft readiness" value={formatDraftReadiness(assessment.latestDraftReadiness)} />
          <MetaItem label="Last updated" value={formatDate(assessment.latestUpdatedAt)} />
          <MetaItem label="Versions" value={String(assessment.versionCount)} />
        </div>
      </div>
    </SurfaceCard>
  );
}

export function AdminAssessmentsDashboard({
  summary,
  assessments,
}: {
  summary: AdminAssessmentDashboardSummary;
  assessments: readonly AdminAssessmentDashboardItem[];
}) {
  return (
    <PageFrame>
      <SurfaceCard accent className="overflow-hidden p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="max-w-3xl text-[2rem] font-semibold tracking-[-0.03em] text-white lg:text-[2.35rem]">
              Assessments
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/66">
              Manage drafts, published versions, and what needs attention next.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/admin/assessments/new" variant="primary">
              Create assessment
            </ButtonLink>
            <p className="text-sm text-white/52">Starts a new assessment with draft version `1.0.0`.</p>
          </div>
        </div>
      </SurfaceCard>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Summary"
          title="Current assessment state"
          description="Quick view of your assessments."
        />

        <div className="grid gap-4 xl:grid-cols-5">
          <SummaryCard
            label="Assessments"
            value={String(summary.totalAssessments)}
            detail="All assessments."
          />
          <SummaryCard
            label="With published"
            value={String(summary.publishedCount)}
            detail="Assessments with a published version."
          />
          <SummaryCard
            label="Published + draft"
            value={String(summary.publishedAndDraftCount)}
            detail="Published assessments with a newer draft."
          />
          <SummaryCard
            label="Draft only"
            value={String(summary.draftOnlyCount)}
            detail="Drafts that are not published yet."
          />
          <SummaryCard
            label="Needs setup"
            value={String(summary.noVersionsCount + summary.setupIncompleteCount)}
            detail="Assessments that still need setup."
          />
        </div>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Assessments"
          title="Build"
          description="Open an assessment to keep building."
        />

        {assessments.length === 0 ? (
          <EmptyState
            title="No assessments yet"
            description="Create your first assessment."
            action={
              <ButtonLink href="/admin/assessments/new" variant="primary">
                Create assessment
              </ButtonLink>
            }
          />
        ) : (
          <div className="space-y-4">
            {assessments.map((assessment) => (
              <AssessmentCard assessment={assessment} key={assessment.assessmentId} />
            ))}
          </div>
        )}
      </section>
    </PageFrame>
  );
}



