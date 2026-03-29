'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  initialAdminAssessmentVersionActionState,
  type AdminAssessmentVersionActionState,
} from '@/lib/admin/admin-assessment-versioning';
import type { AdminAssessmentDetailVersion } from '@/lib/server/admin-assessment-detail';
import {
  createDraftVersionAction,
  publishDraftVersionAction,
} from '@/lib/server/admin-assessment-versioning';
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
    <div className="rounded-[1.2rem] border border-white/8 bg-black/10 p-4">
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
  if (state.formError) {
    return (
      <div className="rounded-[1rem] border border-[rgba(255,157,157,0.24)] bg-[rgba(80,20,20,0.22)] px-4 py-3 text-sm text-[rgba(255,216,216,0.94)]">
        {state.formError}
      </div>
    );
  }

  if (state.formSuccess) {
    return (
      <div className="rounded-[1rem] border border-[rgba(116,209,177,0.22)] bg-[rgba(20,80,57,0.22)] px-4 py-3 text-sm text-[rgba(214,246,233,0.9)]">
        {state.formSuccess}
      </div>
    );
  }

  return null;
}

function SubmitButton({
  idleLabel,
  pendingLabel,
  variant = 'primary',
}: Readonly<{
  idleLabel: string;
  pendingLabel: string;
  variant?: 'primary' | 'secondary';
}>) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring',
        pending
          ? 'cursor-wait border-white/8 bg-white/[0.05] text-white/48'
          : variant === 'primary'
            ? 'sonartra-button-primary'
            : 'sonartra-button-secondary',
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function PublishDraftForm({
  assessmentKey,
  draftVersionId,
}: {
  assessmentKey: string;
  draftVersionId: string;
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
      <SubmitButton idleLabel="Publish draft" pendingLabel="Publishing..." />
    </form>
  );
}

function CreateDraftForm({
  assessmentKey,
}: {
  assessmentKey: string;
}) {
  const [state, formAction] = useActionState(
    createDraftVersionAction.bind(null, {
      assessmentKey,
    }),
    initialAdminAssessmentVersionActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <ActionNotice state={state} />
      <SubmitButton
        idleLabel="Create new draft version"
        pendingLabel="Creating draft..."
        variant="secondary"
      />
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
        No persisted versions are available for this assessment yet.
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

export function AdminAssessmentVersionGovernance({
  assessmentKey,
  versions,
  latestDraftVersion,
  publishedVersion,
}: {
  assessmentKey: string;
  versions: readonly AdminAssessmentDetailVersion[];
  latestDraftVersion: AdminAssessmentDetailVersion | null;
  publishedVersion: AdminAssessmentDetailVersion | null;
}) {
  const hasDraft = latestDraftVersion !== null;
  const hasPublished = publishedVersion !== null;

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Version Governance"
        title="Manage draft and published lifecycle"
        description="Authoring below always targets the current editable draft version only. Published versions stay stable and visible here until a draft is explicitly promoted or a new draft is explicitly created."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <VersionSummaryCard
          label="Editable draft"
          version={latestDraftVersion}
          emptyCopy="No editable draft exists right now. The authoring sections below will remain inactive until a new draft version is created."
        />
        <VersionSummaryCard
          label="Active published"
          version={publishedVersion}
          emptyCopy="No published version is active for this assessment yet."
        />
      </div>

      <SurfaceCard className="p-5 lg:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="space-y-3">
            <p className="sonartra-page-eyebrow">Current lifecycle rule</p>
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
              Existing authoring surfaces mutate the draft version only
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-white/62">
              {hasDraft
                ? `Domains, signals, questions, options, and weights are currently being written to draft ${latestDraftVersion.versionTag}. Publishing is explicit and will promote only that draft.`
                : hasPublished
                  ? `Version ${publishedVersion?.versionTag} is published and remains read-only through the current authoring surfaces. Create a new draft version to continue iterating.`
                  : 'No draft or published version is available yet. This assessment cannot enter the current authoring flow until a draft exists.'}
            </p>
          </div>

          <div className="space-y-4 rounded-[1.2rem] border border-white/8 bg-black/10 p-4">
            <div className="space-y-2">
              <p className="sonartra-page-eyebrow">Lifecycle actions</p>
              <p className="text-sm leading-7 text-white/58">
                Publish promotes the current draft to the single active published version. Create new draft duplicates the latest canonical definition into the next deterministic draft version.
              </p>
            </div>

            {hasDraft ? (
              <PublishDraftForm
                assessmentKey={assessmentKey}
                draftVersionId={latestDraftVersion.assessmentVersionId}
              />
            ) : null}

            {!hasDraft && versions.length > 0 ? <CreateDraftForm assessmentKey={assessmentKey} /> : null}
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5 lg:p-6">
        <div className="space-y-3">
          <p className="sonartra-page-eyebrow">Version registry</p>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Persisted canonical versions for this assessment
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Each row represents an `assessment_versions` record only. No alternate content store or runtime snapshot is introduced here.
          </p>
        </div>

        <div className="mt-5">
          <VersionRegistry versions={versions} />
        </div>
      </SurfaceCard>
    </section>
  );
}

