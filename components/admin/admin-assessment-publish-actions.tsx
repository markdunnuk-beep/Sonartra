'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  initialAdminAssessmentVersionActionState,
  type AdminAssessmentVersionActionState,
} from '@/lib/admin/admin-assessment-versioning';
import type { AdminAssessmentDetailVersion } from '@/lib/server/admin-assessment-detail';
import type { AdminAssessmentValidationResult } from '@/lib/server/admin-assessment-validation';
import {
  publishDraftVersionAction,
} from '@/lib/server/admin-assessment-versioning';
import { AdminCreateDraftVersionForm } from '@/components/admin/admin-assessment-draft-state';
import {
  AdminFeedbackNotice,
} from '@/components/admin/admin-feedback-primitives';
import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';

function ActionNotice({
  state,
}: Readonly<{
  state: AdminAssessmentVersionActionState;
}>) {
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
          ? 'border-white/8 text-white/48 cursor-wait bg-white/[0.05]'
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
}: Readonly<{
  assessmentKey: string;
  draftVersionId: string;
  disabled: boolean;
}>) {
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
      <SubmitButton disabled={disabled} idleLabel="Publish" pendingLabel="Publishing..." />
    </form>
  );
}

export function AdminAssessmentPublishActions({
  assessmentKey,
  latestDraftVersion,
  draftValidation,
}: Readonly<{
  assessmentKey: string;
  latestDraftVersion: AdminAssessmentDetailVersion | null;
  draftValidation: AdminAssessmentValidationResult;
}>) {
  return (
    <SurfaceCard className="sonartra-motion-reveal-soft p-5 lg:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="sonartra-page-eyebrow">Publish</p>
          <LabelPill
            className={
              draftValidation.isPublishReady
                ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]'
                : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]'
            }
          >
            {draftValidation.isPublishReady ? 'Ready to publish' : 'Review required'}
          </LabelPill>
        </div>

        <p className="text-white/62 text-sm leading-7">
          {latestDraftVersion
            ? `You are editing draft ${latestDraftVersion.versionTag}. Publish when you are ready.`
            : 'No draft yet. Create one to keep building.'}
        </p>

        {latestDraftVersion ? (
          <PublishDraftForm
            assessmentKey={assessmentKey}
            disabled={!draftValidation.isPublishReady}
            draftVersionId={latestDraftVersion.assessmentVersionId}
          />
        ) : (
          <AdminCreateDraftVersionForm assessmentKey={assessmentKey} variant="secondary" />
        )}
      </div>
    </SurfaceCard>
  );
}
