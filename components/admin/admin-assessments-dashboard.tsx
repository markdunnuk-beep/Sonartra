import Link from 'next/link';

import {
  ButtonLink,
  EmptyState,
  LabelPill,
  MetaItem,
  PageFrame,
  PageHeader,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import type {
  AdminAssessmentDashboardItem,
  AdminAssessmentDashboardSummary,
  AdminAssessmentOverallStatus,
  AdminAssessmentVersionSummary,
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

function getVersionPillClass(status: AdminAssessmentVersionSummary['status']): string {
  switch (status) {
    case 'published':
      return 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]';
    case 'draft':
      return 'border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]';
    case 'archived':
      return 'border-white/10 bg-white/[0.045] text-white/62';
  }
}

function VersionSummaryCard({
  label,
  version,
  emptyCopy,
}: {
  label: string;
  version: AdminAssessmentVersionSummary | null;
  emptyCopy: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-black/10 p-4">
      <p className="sonartra-page-eyebrow">{label}</p>
      {version ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">
              {version.versionTag}
            </h3>
            <LabelPill className={getVersionPillClass(version.status)}>
              {version.status.replace('_', ' ')}
            </LabelPill>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetaItem label="Questions" value={String(version.questionCount)} />
            <MetaItem label="Updated" value={formatDate(version.updatedAt)} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-7 text-white/54">{emptyCopy}</p>
      )}
    </div>
  );
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

function AssessmentVersionsList({
  versions,
}: {
  versions: readonly AdminAssessmentVersionSummary[];
}) {
  if (versions.length === 0) {
    return (
      <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-7 text-white/54">
        No versions have been created for this assessment yet.
      </div>
    );
  }

  return (
    <div className="rounded-[1.25rem] border border-white/8 bg-black/10">
      <div className="grid gap-3 border-b border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/34 md:grid-cols-[minmax(0,1.1fr)_140px_120px_120px]">
        <span>Version</span>
        <span>Status</span>
        <span>Questions</span>
        <span>Updated</span>
      </div>
      <div className="divide-y divide-white/8">
        {versions.map((version) => (
          <div
            className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.1fr)_140px_120px_120px] md:items-center"
            key={version.assessmentVersionId}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{version.versionTag}</p>
              <p className="mt-1 truncate text-xs text-white/46">
                {version.publishedAt ? `Published ${formatDate(version.publishedAt)}` : 'Unpublished'}
              </p>
            </div>
            <div>
              <LabelPill className={getVersionPillClass(version.status)}>{version.status}</LabelPill>
            </div>
            <p className="text-sm text-white/68">{version.questionCount}</p>
            <p className="text-sm text-white/68">{formatDate(version.updatedAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssessmentCard({
  assessment,
}: {
  assessment: AdminAssessmentDashboardItem;
}) {
  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill>{assessment.assessmentKey}</LabelPill>
              <LabelPill className={getStatusPillClass(assessment.overallStatus)}>
                {assessment.overallStatusLabel}
              </LabelPill>
              {!assessment.isActive ? (
                <LabelPill className="border-white/10 bg-white/[0.04] text-white/58">
                  Inactive
                </LabelPill>
              ) : null}
            </div>

            <div className="space-y-2">
              <h2 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-white">
                {assessment.title}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-white/62">
                {assessment.description ?? assessment.overallStatusDetail}
              </p>
            </div>
          </div>

          <ButtonLink href={assessment.actionHref}>Manage</ButtonLink>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <MetaItem label="Versions" value={String(assessment.versionCount)} />
          <MetaItem
            label="Published version"
            value={assessment.publishedVersion?.versionTag ?? 'None'}
          />
          <MetaItem label="Latest draft" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
          <MetaItem label="Last updated" value={formatDate(assessment.latestUpdatedAt)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <VersionSummaryCard
            label="Current published"
            version={assessment.publishedVersion}
            emptyCopy="No published version is available yet."
          />
          <VersionSummaryCard
            label="Latest draft"
            version={assessment.latestDraftVersion}
            emptyCopy="No draft version is currently available."
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="sonartra-page-eyebrow">Version Registry</p>
              <p className="mt-1 text-sm text-white/54">
                Scan every persisted version and its lifecycle state.
              </p>
            </div>
            <Link
              className={cn(
                'sonartra-focus-ring inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/76 transition duration-200 hover:border-white/14 hover:bg-white/[0.06] hover:text-white',
              )}
              href={assessment.actionHref}
            >
              View assessment
            </Link>
          </div>

          <AssessmentVersionsList versions={assessment.versions} />
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
      <PageHeader
        eyebrow="Admin Workspace"
        title="Assessments"
        description="Scan the assessment catalogue, inspect version state, and identify what is live, drafted, or inactive before drilling into authoring and publish governance."
      />

      <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <LabelPill className="bg-white/[0.08] text-white/82">Version-aware catalogue</LabelPill>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.45rem]">
              Catalogue view for version visibility, active publish state, and draft continuation.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-white/68">
              This dashboard surfaces truthful schema-backed version state, including published and
              draft context, so lifecycle actions on the detail route stay grounded in canonical
              assessment version records only.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <ButtonLink href="/admin/assessments/create" variant="primary">
              Create assessment
            </ButtonLink>
            <p className="text-sm text-white/54">Create a new assessment and bootstrap its first draft version.</p>
          </div>
        </div>
      </SurfaceCard>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Catalogue Summary"
          title="Current assessment state"
          description="Counts are derived from persisted assessments and version lifecycle records only."
        />

        <div className="grid gap-4 xl:grid-cols-5">
          <SummaryCard
            label="Assessments"
            value={String(summary.totalAssessments)}
            detail="Top-level assessment records in the current catalogue."
          />
          <SummaryCard
            label="With published"
            value={String(summary.publishedCount)}
            detail="Assessments that currently expose a published version."
          />
          <SummaryCard
            label="Published + draft"
            value={String(summary.publishedAndDraftCount)}
            detail="Published definitions with a newer working draft alongside them."
          />
          <SummaryCard
            label="Draft only"
            value={String(summary.draftOnlyCount)}
            detail="Assessment records that have draft work but no published version."
          />
          <SummaryCard
            label="Needs setup"
            value={String(summary.noVersionsCount + summary.setupIncompleteCount)}
            detail="Assessment records with no versions or only archived/incomplete version state."
          />
        </div>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Assessment Catalogue"
          title="Definitions and version state"
          description="Each entry shows the live published version, latest draft, full version registry, and the next route for later authoring tasks."
        />

        {assessments.length === 0 ? (
          <EmptyState
            title="No assessments in the catalogue"
            description="Create the first assessment record to start building the authoring workflow."
            action={
              <ButtonLink href="/admin/assessments/create" variant="primary">
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



