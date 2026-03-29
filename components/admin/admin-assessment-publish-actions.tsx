'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  initialAdminAssessmentVersionActionState,
  type AdminAssessmentVersionActionState,
} from '@/lib/admin/admin-assessment-versioning';
import type {
  AdminAssessmentDetailVersion,
} from '@/lib/server/admin-assessment-detail';
import type { AdminAssessmentValidationResult } from '@/lib/server/admin-assessment-validation';
import {
  createDraftVersionAction,
  publishDraftVersionAction,
} from '@/lib/server/admin-assessment-versioning';
import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';

function ActionNotice({
  state,
}: Readonly<{
  state: AdminAssessmentVersionActionState;
}>) {
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
      <SubmitButton
        disabled={disabled}
        idleLabel="Publish draft"
        pendingLabel="Publishing..."
      />
    </form>
  );
}

function CreateDraftForm({
  assessmentKey,
}: Readonly<{
  assessmentKey: string;
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
        idleLabel="Create new draft version"
        pendingLabel="Creating draft..."
        variant="secondary"
      />
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
    <SurfaceCard className="p-5 lg:p-6">
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

        <p className="text-sm leading-7 text-white/62">
          {latestDraftVersion
            ? `Draft ${latestDraftVersion.versionTag} remains the only editable version. Publishing is explicit and still runs through the existing lifecycle action.`
            : 'No editable draft exists right now. Create a new draft version before returning to the authoring sections.'}
        </p>

        {latestDraftVersion ? (
          <PublishDraftForm
            assessmentKey={assessmentKey}
            disabled={!draftValidation.isPublishReady}
            draftVersionId={latestDraftVersion.assessmentVersionId}
          />
        ) : (
          <CreateDraftForm assessmentKey={assessmentKey} />
        )}
      </div>
    </SurfaceCard>
  );
}
