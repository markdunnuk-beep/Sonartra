'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  initialAdminAssessmentVersionActionState,
  type AdminAssessmentVersionActionState,
} from '@/lib/admin/admin-assessment-versioning';
import type { AdminAssessmentValidationResult } from '@/lib/server/admin-assessment-validation';
import type { AdminAssessmentDetailVersion } from '@/lib/server/admin-assessment-detail';
import {
  publishDraftVersionAction,
} from '@/lib/server/admin-assessment-versioning';
import { AdminCreateDraftVersionForm } from '@/components/admin/admin-assessment-draft-state';
import {
  AdminFeedbackNotice,
  AdminFeedbackStat,
} from '@/components/admin/admin-feedback-primitives';
import {
  LabelPill,
  MetaItem,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';

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

function getVersionPillClass(status: AdminAssessmentDetailVersion['status']): string {
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
  version: AdminAssessmentDetailVersion | null;
  emptyCopy: string;
}) {
  return (
    <div className="sonartra-admin-feedback-card rounded-[1.2rem] border p-4">
      <p className="sonartra-page-eyebrow">{label}</p>
      {version ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">
              {version.versionTag}
            </h3>
            <LabelPill className={getVersionPillClass(version.status)}>
              {version.status}
            </LabelPill>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetaItem label="Questions" value={String(version.questionCount)} />
            <MetaItem
              label={version.status === 'published' ? 'Published' : 'Updated'}
              value={formatDate(version.status === 'published' ? version.publishedAt : version.updatedAt)}
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-7 text-white/54">{emptyCopy}</p>
      )}
    </div>
  );
}

function ActionNotice({
  state,
}: {
  state: AdminAssessmentVersionActionState;
}) {
  return (
    <div className="space-y-3">
      {state.formError ? (
        <AdminFeedbackNotice tone="danger">
          {state.formError}
        </AdminFeedbackNotice>
      ) : null}

      {state.formSuccess ? (
        <AdminFeedbackNotice tone="success">
          {state.formSuccess}
        </AdminFeedbackNotice>
      ) : null}

      {state.formWarnings.length > 0 ? (
        <AdminFeedbackNotice tone="warning" title="Warnings">
          <div className="mt-2 space-y-2">
            {state.formWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </AdminFeedbackNotice>
      ) : null}
    </div>
  );
}

function SubmitButton({
  idleLabel,
  pendingLabel,
  variant = 'primary',
  disabled = false,
}: Readonly<{
  idleLabel: string;
  pendingLabel: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}>) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring',
        isDisabled
          ? 'cursor-wait border-white/8 bg-white/[0.05] text-white/48'
          : variant === 'primary'
            ? 'sonartra-button-primary'
            : 'sonartra-button-secondary',
      )}
      disabled={isDisabled}
      type="submit"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function PublishDraftForm({
  assessmentKey,
  draftVersionId,
  disabled,
}: {
  assessmentKey: string;
  draftVersionId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(
    publishDraftVersionAction.bind(null, {
      assessmentKey,
      assessmentVersionId: draftVersionId,
    }),
    initialAdminAssessmentVersionActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <ActionNotice state={state} />
      <SubmitButton idleLabel="Publish" pendingLabel="Publishing..." disabled={disabled} />
    </form>
  );
}

function VersionRegistry({
  versions,
}: {
  versions: readonly AdminAssessmentDetailVersion[];
}) {
  if (versions.length === 0) {
    return (
      <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-7 text-white/54">
        No versions yet.
      </div>
    );
  }

  return (
    <div className="rounded-[1.25rem] border border-white/8 bg-black/10">
      <div className="grid gap-3 border-b border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/34 md:grid-cols-[minmax(0,1fr)_140px_120px_120px]">
        <span>Version</span>
        <span>Status</span>
        <span>Questions</span>
        <span>Updated</span>
      </div>
      <div className="divide-y divide-white/8">
        {versions.map((version) => (
          <div
            className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_140px_120px_120px] md:items-center"
            key={version.assessmentVersionId}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{version.versionTag}</p>
              <p className="mt-1 truncate text-xs text-white/46">
                {version.publishedAt ? `Published ${formatDate(version.publishedAt)}` : 'Not published'}
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

function getReadinessPillClass(validation: AdminAssessmentValidationResult): string {
  switch (validation.status) {
    case 'ready':
      return 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]';
    case 'not_ready':
      return 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]';
    case 'no_draft':
    case 'missing_assessment':
      return 'border-white/10 bg-white/[0.045] text-white/68';
  }
}

function formatReadinessLabel(validation: AdminAssessmentValidationResult): string {
  switch (validation.status) {
    case 'ready':
      return 'Ready';
    case 'not_ready':
      return 'Not ready';
    case 'no_draft':
      return 'No draft';
    case 'missing_assessment':
      return 'Unavailable';
  }
}

function ValidationSummary({
  validation,
}: {
  validation: AdminAssessmentValidationResult;
}) {
  const failingSections = validation.sections.filter((section) => section.status === 'fail');

  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="sonartra-page-eyebrow">Publish check</p>
            <LabelPill className={getReadinessPillClass(validation)}>
              {formatReadinessLabel(validation)}
            </LabelPill>
          </div>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Check before publishing
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            {validation.isPublishReady
              ? `Draft ${validation.draftVersionTag ?? 'version'} is ready to publish.`
              : validation.status === 'no_draft'
                ? 'No draft yet, so you cannot publish.'
                : 'Fix the issues below before publishing.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminFeedbackStat label="Blocking issues" value={String(validation.blockingErrors.length)} />
          <AdminFeedbackStat label="Sections to fix" value={String(failingSections.length)} />
          <AdminFeedbackStat label="Questions" value={String(validation.counts.questionCount)} />
          <AdminFeedbackStat label="Unscored responses" value={String(validation.counts.unmappedOptionCount)} />
          <AdminFeedbackStat label="Application thesis" value={String(validation.counts.applicationThesisCount)} />
          <AdminFeedbackStat label="Action prompts" value={String(validation.counts.applicationActionPromptsCount)} />
        </div>
      </div>

      {validation.status === 'not_ready' ? (
        <div className="mt-5">
          <AdminFeedbackNotice tone="warning" title="Readiness summary">
            Fix the blocking issues below before publishing. Warnings can remain visible without
            stopping the publish path.
          </AdminFeedbackNotice>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {validation.sections.map((section) => (
          <div className="sonartra-admin-feedback-card rounded-[1.2rem] border p-4" key={section.key}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{section.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/34">
                  {section.status === 'pass' ? 'Pass' : 'Fix these before publishing'}
                </p>
              </div>
              <LabelPill
                className={
                  section.status === 'pass'
                    ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]'
                    : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]'
                }
              >
                {section.status}
              </LabelPill>
            </div>

            {section.key === 'applicationPlan' ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <AdminFeedbackStat label="Thesis" value={String(validation.counts.applicationThesisCount)} />
                <AdminFeedbackStat label="Contribution" value={String(validation.counts.applicationContributionCount)} />
                <AdminFeedbackStat label="Risk" value={String(validation.counts.applicationRiskCount)} />
                <AdminFeedbackStat label="Development" value={String(validation.counts.applicationDevelopmentCount)} />
                <AdminFeedbackStat label="Action Prompts" value={String(validation.counts.applicationActionPromptsCount)} />
              </div>
            ) : null}

            {section.issues.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-white/54">No issues in this section.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {section.issues.map((issue) => (
                  <AdminFeedbackNotice
                    key={`${section.key}-${issue.code}`}
                    title={issue.severity === 'blocking' ? 'Blocking issue' : 'Warning'}
                    tone={issue.severity === 'blocking' ? 'warning' : 'neutral'}
                  >
                    {issue.message}
                  </AdminFeedbackNotice>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

export function AdminAssessmentVersionGovernance({
  assessmentKey,
  versions,
  latestDraftVersion,
  publishedVersion,
  draftValidation,
}: {
  assessmentKey: string;
  versions: readonly AdminAssessmentDetailVersion[];
  latestDraftVersion: AdminAssessmentDetailVersion | null;
  publishedVersion: AdminAssessmentDetailVersion | null;
  draftValidation: AdminAssessmentValidationResult;
}) {
  const hasDraft = latestDraftVersion !== null;
  const hasPublished = publishedVersion !== null;

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Publish"
        title="Review and publish"
        description="Check your draft, publish it, or create a new draft."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <VersionSummaryCard
          label="Draft"
          version={latestDraftVersion}
          emptyCopy="No draft yet. Create one to start building."
        />
        <VersionSummaryCard
          label="Published"
          version={publishedVersion}
          emptyCopy="Nothing has been published yet."
        />
      </div>

      <SurfaceCard className="p-5 lg:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="space-y-3">
            <p className="sonartra-page-eyebrow">Current version</p>
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
              Changes are made in the draft only
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-white/62">
              {hasDraft
                ? `You are editing draft ${latestDraftVersion.versionTag}. Publishing will make it live.`
                : hasPublished
                  ? `Version ${publishedVersion?.versionTag} is live. Create a new draft to make changes.`
                  : 'No draft or published version yet.'}
            </p>
          </div>

          <div className="sonartra-admin-feedback-card space-y-4 rounded-[1.2rem] border p-4">
            <div className="space-y-2">
              <p className="sonartra-page-eyebrow">Actions</p>
              <p className="text-sm leading-7 text-white/58">
                Publish the current draft, or create a new draft to keep working.
              </p>
            </div>

            {hasDraft ? (
              <PublishDraftForm
                assessmentKey={assessmentKey}
                draftVersionId={latestDraftVersion.assessmentVersionId}
                disabled={!draftValidation.isPublishReady}
              />
            ) : null}

            {!hasDraft && versions.length > 0 ? (
              <AdminCreateDraftVersionForm assessmentKey={assessmentKey} variant="secondary" />
            ) : null}
          </div>
        </div>
      </SurfaceCard>

      <ValidationSummary validation={draftValidation} />

      <SurfaceCard className="p-5 lg:p-6">
        <div className="space-y-3">
          <p className="sonartra-page-eyebrow">Versions</p>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Versions
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            See all versions for this assessment.
          </p>
        </div>

        <div className="mt-5">
          <VersionRegistry versions={versions} />
        </div>
      </SurfaceCard>
    </section>
  );
}

