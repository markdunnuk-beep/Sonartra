'use client';

import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';

import { SurfaceCard, cn } from '@/components/shared/user-app-ui';
import { addSupportReplyAction } from '@/lib/server/support-reply-actions';
import {
  initialSupportReplyActionState,
  type SupportReplyActionState,
} from '@/lib/support/support-reply-action-state';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring min-w-[140px]',
        pending ? 'cursor-not-allowed border-white/8 bg-white/[0.05] text-white/48' : 'sonartra-button-primary',
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? 'Sending...' : 'Send reply'}
    </button>
  );
}

function getSafeState(state: SupportReplyActionState): SupportReplyActionState {
  return {
    ok: state?.ok ?? false,
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      body: state?.values?.body ?? '',
    },
  };
}

export function SupportReplyForm({
  caseReference,
}: Readonly<{
  caseReference: string;
}>) {
  const generatedId = useId();
  const bodyId = `support-reply-body-${generatedId.replace(/:/g, '')}`;
  const errorId = `${bodyId}-error`;
  const [state, formAction] = useActionState(
    addSupportReplyAction,
    initialSupportReplyActionState,
  );
  const safeState = getSafeState(state);

  return (
    <SurfaceCard className="p-5 sm:p-6">
      <form action={formAction} className="space-y-4" noValidate>
        <input name="caseReference" type="hidden" value={caseReference} />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#F5F1EA]" htmlFor={bodyId}>
            Add a reply
          </label>
          <p className="text-xs leading-6 text-[#9A9185]/78">
            This adds a public message to the support case. It is not live chat.
          </p>
        </div>

        {safeState.formError ? (
          <div
            className="rounded-[1rem] border border-[rgba(255,157,157,0.28)] bg-[rgba(255,157,157,0.08)] px-4 py-3 text-sm font-medium text-[rgba(255,225,225,0.92)]"
            role="alert"
          >
            {safeState.formError}
          </div>
        ) : null}

        <div className="space-y-2">
          <textarea
            aria-describedby={safeState.fieldErrors.body ? errorId : undefined}
            aria-invalid={safeState.fieldErrors.body ? true : undefined}
            className={cn(
              'sonartra-focus-ring min-h-[150px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
              safeState.fieldErrors.body
                ? 'border-[rgba(255,157,157,0.32)]'
                : 'border-white/10 hover:border-white/14',
            )}
            defaultValue={safeState.values.body}
            id={bodyId}
            maxLength={4000}
            name="body"
            placeholder="Write your update or answer here."
            required
          />
          {safeState.fieldErrors.body ? (
            <p className="text-sm text-[rgba(255,198,198,0.92)]" id={errorId}>
              {safeState.fieldErrors.body}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-xs leading-6 text-[#9A9185]/78">
            Sonartra support will see this reply in the case thread and receive a notification.
          </p>
          <SubmitButton />
        </div>
      </form>
    </SurfaceCard>
  );
}
