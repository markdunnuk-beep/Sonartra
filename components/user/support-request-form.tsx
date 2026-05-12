'use client';

import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { SurfaceCard, cn } from '@/components/shared/user-app-ui';
import { createSupportRequestAction } from '@/lib/server/support-request-actions';
import {
  initialSupportRequestActionState,
  SUPPORT_REQUEST_CATEGORY_OPTIONS,
  type SupportRequestActionState,
} from '@/lib/support/support-request-action-state';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring min-w-[170px]',
        pending ? 'cursor-not-allowed border-white/8 bg-white/[0.05] text-white/48' : 'sonartra-button-primary',
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? 'Creating...' : 'Create request'}
    </button>
  );
}

function fieldErrorId(field: string, panelId: string): string {
  return `${panelId}-${field}-error`;
}

function getSafeState(state: SupportRequestActionState): SupportRequestActionState {
  return {
    ok: state?.ok ?? false,
    message: state?.message ?? null,
    publicReference: state?.publicReference ?? null,
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      category: state?.values?.category ?? '',
      subject: state?.values?.subject ?? '',
      description: state?.values?.description ?? '',
    },
  };
}

export function SupportRequestForm({
  triggerLabel = 'Create support request',
  triggerVariant = 'primary',
  initialCategory = '',
}: Readonly<{
  triggerLabel?: string;
  triggerVariant?: 'primary' | 'secondary';
  initialCategory?: string;
}>) {
  const generatedId = useId();
  const panelId = `support-request-panel-${generatedId.replace(/:/g, '')}`;
  const [open, setOpen] = useState(false);
  const [dismissedActionKey, setDismissedActionKey] = useState<string | null>(null);
  const [state, formAction] = useActionState(
    createSupportRequestAction,
    initialSupportRequestActionState,
  );
  const safeState = getSafeState(state);

  const categoryDefaultValue =
    safeState.values.category || initialCategory;
  const actionKey =
    safeState.message || safeState.formError
      ? `${safeState.ok ? 'ok' : 'error'}:${safeState.message ?? safeState.formError}`
      : null;
  const panelOpen = open || Boolean(actionKey && dismissedActionKey !== actionKey);

  return (
    <div className="space-y-4">
      <button
        className={cn(
          'sonartra-button sonartra-focus-ring',
          triggerVariant === 'primary' ? 'sonartra-button-primary' : 'sonartra-button-secondary',
        )}
        type="button"
        onClick={() => {
          setDismissedActionKey(null);
          setOpen((current) => !current);
        }}
        aria-expanded={panelOpen}
        aria-controls={panelId}
      >
        {triggerLabel}
      </button>

      {safeState.ok && safeState.message ? (
        <div
          className="rounded-[1rem] border border-[#32D6B0]/20 bg-[#32D6B0]/[0.08] px-4 py-3 text-sm font-medium text-[#DFFCF4]"
          role="status"
        >
          {safeState.message}
        </div>
      ) : null}

      {panelOpen ? (
        <SurfaceCard
          className="p-5 lg:p-6"
          id={panelId}
          aria-label="Create support request form"
        >
          <form action={formAction} className="space-y-5" noValidate>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#F5F1EA]">
                  Create a support request
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-[#D8D0C3]/72">
                  Share the issue or question. Sonartra support will use this case record to
                  keep the conversation organised.
                </p>
              </div>
              <button
                className="sonartra-focus-ring rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[#D8D0C3]/78 hover:border-white/18 hover:text-white"
                type="button"
                onClick={() => {
                  setDismissedActionKey(actionKey);
                  setOpen(false);
                }}
              >
                Close
              </button>
            </div>

            {safeState.formError ? (
              <div
                className="rounded-[1rem] border border-[rgba(255,157,157,0.28)] bg-[rgba(255,157,157,0.08)] px-4 py-3 text-sm font-medium text-[rgba(255,225,225,0.92)]"
                role="alert"
              >
                {safeState.formError}
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr]">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#F5F1EA]" htmlFor="support-category">
                  Category
                  <span className="ml-2 text-xs uppercase tracking-[0.14em] text-[#9A9185]/80">
                    Required
                  </span>
                </label>
                <select
                  aria-invalid={safeState.fieldErrors.category ? true : undefined}
                  aria-describedby={safeState.fieldErrors.category ? fieldErrorId('category', panelId) : undefined}
                  className={cn(
                    'sonartra-focus-ring min-h-12 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white',
                    safeState.fieldErrors.category
                      ? 'border-[rgba(255,157,157,0.32)]'
                      : 'border-white/10 hover:border-white/14',
                  )}
                  defaultValue={categoryDefaultValue}
                  id="support-category"
                  name="category"
                  required
                >
                  <option value="">Choose a category</option>
                  {SUPPORT_REQUEST_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-6 text-[#9A9185]/78">
                  Choose the closest match. This is not live chat.
                </p>
                {safeState.fieldErrors.category ? (
                  <p className="text-sm text-[rgba(255,198,198,0.92)]" id={fieldErrorId('category', panelId)}>
                    {safeState.fieldErrors.category}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                {SUPPORT_REQUEST_CATEGORY_OPTIONS.map((option) => (
                  <div
                    className="rounded-[0.9rem] border border-white/10 bg-white/[0.035] px-4 py-3"
                    key={option.value}
                  >
                    <p className="text-sm font-semibold text-[#F5F1EA]">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#D8D0C3]/68">{option.helper}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#F5F1EA]" htmlFor="support-subject">
                Subject
                <span className="ml-2 text-xs uppercase tracking-[0.14em] text-[#9A9185]/80">
                  Required
                </span>
              </label>
              <input
                aria-invalid={safeState.fieldErrors.subject ? true : undefined}
                aria-describedby={safeState.fieldErrors.subject ? fieldErrorId('subject', panelId) : undefined}
                className={cn(
                  'sonartra-focus-ring min-h-12 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
                  safeState.fieldErrors.subject
                    ? 'border-[rgba(255,157,157,0.32)]'
                    : 'border-white/10 hover:border-white/14',
                )}
                defaultValue={safeState.values.subject}
                id="support-subject"
                maxLength={140}
                name="subject"
                placeholder="Briefly describe what you need help with"
                required
                type="text"
              />
              {safeState.fieldErrors.subject ? (
                <p className="text-sm text-[rgba(255,198,198,0.92)]" id={fieldErrorId('subject', panelId)}>
                  {safeState.fieldErrors.subject}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#F5F1EA]" htmlFor="support-description">
                Description
                <span className="ml-2 text-xs uppercase tracking-[0.14em] text-[#9A9185]/80">
                  Required
                </span>
              </label>
              <textarea
                aria-invalid={safeState.fieldErrors.description ? true : undefined}
                aria-describedby={safeState.fieldErrors.description ? fieldErrorId('description', panelId) : undefined}
                className={cn(
                  'sonartra-focus-ring min-h-[160px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
                  safeState.fieldErrors.description
                    ? 'border-[rgba(255,157,157,0.32)]'
                    : 'border-white/10 hover:border-white/14',
                )}
                defaultValue={safeState.values.description}
                id="support-description"
                maxLength={4000}
                name="description"
                placeholder="Include what happened, what you expected, and anything that may help support understand the request."
                required
              />
              {safeState.fieldErrors.description ? (
                <p className="text-sm text-[rgba(255,198,198,0.92)]" id={fieldErrorId('description', panelId)}>
                  {safeState.fieldErrors.description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-xs leading-6 text-[#9A9185]/78">
                This creates a support case in Sonartra. Email notifications and case detail
                replies are separate follow-up tasks.
              </p>
              <div className="flex gap-3">
                <button
                  className="sonartra-button sonartra-button-secondary sonartra-focus-ring"
                  type="button"
                  onClick={() => {
                    setDismissedActionKey(actionKey);
                    setOpen(false);
                  }}
                >
                  Cancel
                </button>
                <SubmitButton />
              </div>
            </div>
          </form>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
