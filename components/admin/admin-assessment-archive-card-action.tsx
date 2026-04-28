'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import { AdminFeedbackNotice } from '@/components/admin/admin-feedback-primitives';
import { LabelPill, cn } from '@/components/shared/user-app-ui';
import {
  initialAdminAssessmentArchiveActionState,
} from '@/lib/admin/admin-assessment-archive';
import { archiveAssessmentAction } from '@/lib/server/admin-assessment-archive';

function ArchiveSubmitButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring w-full',
        pending || disabled
          ? 'cursor-not-allowed border-white/8 bg-white/[0.05] text-white/48'
          : 'border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] text-[rgba(255,234,196,0.94)] hover:border-[rgba(255,225,176,0.28)] hover:bg-[rgba(92,56,10,0.3)]',
      )}
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? 'Archiving...' : 'Archive assessment'}
    </button>
  );
}

export function AdminAssessmentArchiveCardAction({
  assessmentKey,
}: {
  assessmentKey: string;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [state, formAction] = useActionState(
    archiveAssessmentAction.bind(null, assessmentKey),
    initialAdminAssessmentArchiveActionState,
  );

  useEffect(() => {
    if (state.formSuccess) {
      router.refresh();
    }
  }, [router, state.formSuccess]);

  return (
    <details className="min-w-[18rem] rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3">
      <summary className="cursor-pointer list-none text-sm font-medium text-white/72">
        Actions
      </summary>

      <form action={formAction} className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill className="border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] text-[rgba(255,234,196,0.94)]">
            Archive assessment
          </LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            {assessmentKey}
          </LabelPill>
        </div>

        <p className="text-sm leading-7 text-white/62">
          This hides the assessment from admin lists and user assignment flows. Existing results are preserved.
        </p>

        <label className="flex items-start gap-3 text-sm leading-6 text-white/78">
          <input
            checked={confirmed}
            className="sonartra-focus-ring mt-1 h-4 w-4 rounded border border-white/18 bg-black/20 text-white accent-[rgba(255,210,143,0.92)]"
            name="confirmArchive"
            onChange={(event) => setConfirmed(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>I understand this hides the assessment without deleting attempts or results.</span>
        </label>

        {state.formError ? <AdminFeedbackNotice tone="danger">{state.formError}</AdminFeedbackNotice> : null}
        {state.formSuccess ? <AdminFeedbackNotice tone="success">{state.formSuccess}</AdminFeedbackNotice> : null}

        <ArchiveSubmitButton disabled={!confirmed} />
      </form>
    </details>
  );
}
