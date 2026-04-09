'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  initialAdminAssessmentVersionActionState,
  type AdminAssessmentVersionActionState,
} from '@/lib/admin/admin-assessment-versioning';
import { createDraftVersionAction } from '@/lib/server/admin-assessment-versioning';
import { AdminFeedbackNotice } from '@/components/admin/admin-feedback-primitives';
import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';

function ActionNotice({
  state,
}: Readonly<{
  state: AdminAssessmentVersionActionState;
}>) {
  return (
    <div className="space-y-3">
      {state.formError ? (
        <AdminFeedbackNotice tone="danger">{state.formError}</AdminFeedbackNotice>
      ) : null}

      {state.formSuccess ? (
        <AdminFeedbackNotice tone="success">{state.formSuccess}</AdminFeedbackNotice>
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

export function AdminCreateDraftVersionForm({
  assessmentKey,
  variant = 'primary',
}: Readonly<{
  assessmentKey: string;
  variant?: 'primary' | 'secondary';
}>) {
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
        idleLabel="Create draft version"
        pendingLabel="Creating draft..."
        variant={variant}
      />
    </form>
  );
}

export function AdminPublishedNoDraftBanner({
  assessmentKey,
  publishedVersionTag,
}: Readonly<{
  assessmentKey: string;
  publishedVersionTag: string | null;
}>) {
  return (
    <SurfaceCard accent className="space-y-4 p-5 lg:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
          Published assessment
        </LabelPill>
        {publishedVersionTag ? (
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Version {publishedVersionTag}
          </LabelPill>
        ) : null}
      </div>

      <div className="space-y-2">
        <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
          This assessment is published. Create a draft to make changes.
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-white/66">
          You are browsing the stable published version of {assessmentKey}. Start a draft when you
          are ready to update structure, language, or scoring for the next version.
        </p>
      </div>

      <AdminCreateDraftVersionForm assessmentKey={assessmentKey} />
    </SurfaceCard>
  );
}

export function AdminPublishedNoDraftStageState({
  assessmentKey,
  publishedVersionTag,
  title,
  description,
}: Readonly<{
  assessmentKey: string;
  publishedVersionTag: string | null;
  title: string;
  description: string;
}>) {
  return (
    <SurfaceCard className="space-y-5 p-5 lg:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
          Browse published version
        </LabelPill>
        {publishedVersionTag ? (
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Version {publishedVersionTag}
          </LabelPill>
        ) : null}
      </div>

      <div className="space-y-2">
        <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-white/62">{description}</p>
      </div>

      <AdminCreateDraftVersionForm assessmentKey={assessmentKey} variant="secondary" />
    </SurfaceCard>
  );
}
