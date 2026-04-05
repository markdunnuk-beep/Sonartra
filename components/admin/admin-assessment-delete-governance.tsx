'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  LabelPill,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import { AdminFeedbackNotice } from '@/components/admin/admin-feedback-primitives';
import {
  initialAdminAssessmentDeleteActionState,
  type AdminAssessmentDeleteActionState,
} from '@/lib/admin/admin-assessment-delete';
import { deleteAssessmentAction } from '@/lib/server/admin-assessment-delete';

function ActionNotice({
  state,
}: {
  state: AdminAssessmentDeleteActionState;
}) {
  if (!state.formError) {
    return null;
  }

  return (
    <AdminFeedbackNotice tone="danger">
      {state.formError}
    </AdminFeedbackNotice>
  );
}

function DeleteButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring min-w-[164px]',
        isDisabled
          ? 'cursor-not-allowed border-white/8 bg-white/[0.05] text-white/48'
          : 'border-[rgba(255,120,120,0.28)] bg-[rgba(120,24,24,0.45)] text-[rgba(255,232,232,0.96)] hover:border-[rgba(255,150,150,0.34)] hover:bg-[rgba(140,28,28,0.56)]',
      )}
      disabled={isDisabled}
      type="submit"
    >
      {pending ? 'Deleting...' : 'Delete assessment'}
    </button>
  );
}

export function AdminAssessmentDeleteGovernance({
  assessmentKey,
}: {
  assessmentKey: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [state, formAction] = useActionState(
    deleteAssessmentAction.bind(null, assessmentKey),
    initialAdminAssessmentDeleteActionState,
  );

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Delete assessment"
        title="Delete assessment"
        description="Permanently remove this assessment and its setup data. If people have used it, deletion is blocked."
      />

      <SurfaceCard className="p-5 lg:p-6">
        <form action={formAction} className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill className="border-[rgba(255,120,120,0.24)] bg-[rgba(120,24,24,0.22)] text-[rgba(255,221,221,0.94)]">
                Permanent delete
              </LabelPill>
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                {assessmentKey}
              </LabelPill>
            </div>
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
              Remove this assessment
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-white/62">
              This cannot be undone. Versions, domains, signals, questions, response options, and
              response scoring will be removed if no linked user data exists.
            </p>
          </div>

          <div className="sonartra-admin-feedback-card rounded-[1.2rem] border p-4">
            <label className="flex items-start gap-3 text-sm leading-6 text-white/78">
              <input
                checked={confirmed}
                className="sonartra-focus-ring mt-1 h-4 w-4 rounded border border-white/18 bg-black/20 text-white accent-[rgba(255,155,155,0.92)]"
                name="confirmDelete"
                onChange={(event) => setConfirmed(event.currentTarget.checked)}
                type="checkbox"
              />
              <span>
                I understand this will permanently delete this assessment and its setup data.
              </span>
            </label>
          </div>

          <ActionNotice state={state} />

          <DeleteButton disabled={!confirmed} />
        </form>
      </SurfaceCard>
    </section>
  );
}
