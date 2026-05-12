'use client';

import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';

import { SurfaceCard, cn } from '@/components/shared/user-app-ui';
import {
  addAdminInternalNoteAction,
  addAdminSupportReplyAction,
  updateAdminSupportPriorityAction,
  updateAdminSupportStatusAction,
} from '@/lib/server/support-admin-actions';
import type { SupportPriority, SupportStatus } from '@/lib/server/support-service';
import {
  initialAdminSupportBodyActionState,
  initialAdminSupportPriorityActionState,
  initialAdminSupportStatusActionState,
  type AdminSupportBodyActionState,
  type AdminSupportPriorityActionState,
  type AdminSupportStatusActionState,
} from '@/lib/support/support-admin-action-state';

const ADMIN_SUPPORT_STATUS_OPTIONS: readonly {
  value: SupportStatus;
  label: string;
}[] = [
  { value: 'open', label: 'Open' },
  { value: 'waiting_on_sonartra', label: 'Waiting on Sonartra' },
  { value: 'waiting_on_user', label: 'Waiting on user' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const SUPPORT_PRIORITY_OPTIONS: readonly {
  value: SupportPriority;
  label: string;
}[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
}: Readonly<{
  children: string;
  pendingLabel: string;
  variant?: 'primary' | 'secondary';
}>) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring min-w-[140px]',
        pending
          ? 'cursor-not-allowed border-white/8 bg-white/[0.05] text-white/48'
          : variant === 'primary'
            ? 'sonartra-button-primary'
            : 'sonartra-button-secondary',
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

function safeBodyState(state: AdminSupportBodyActionState): AdminSupportBodyActionState {
  return {
    ok: state?.ok ?? false,
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      body: state?.values?.body ?? '',
    },
  };
}

function safeStatusState(
  state: AdminSupportStatusActionState,
  currentStatus: SupportStatus,
): AdminSupportStatusActionState {
  return {
    ok: state?.ok ?? false,
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      status: state?.values?.status ?? currentStatus,
    },
  };
}

function safePriorityState(
  state: AdminSupportPriorityActionState,
  currentPriority: SupportPriority,
): AdminSupportPriorityActionState {
  return {
    ok: state?.ok ?? false,
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      priority: state?.values?.priority ?? currentPriority,
    },
  };
}

function AdminSupportMessageForm({
  action,
  caseReference,
  description,
  label,
  pendingLabel,
  submitLabel,
  tone = 'public',
}: Readonly<{
  action: typeof addAdminSupportReplyAction;
  caseReference: string;
  description: string;
  label: string;
  pendingLabel: string;
  submitLabel: string;
  tone?: 'public' | 'internal';
}>) {
  const generatedId = useId();
  const bodyId = `admin-support-body-${generatedId.replace(/:/g, '')}`;
  const errorId = `${bodyId}-error`;
  const [state, formAction] = useActionState(action, initialAdminSupportBodyActionState);
  const safeState = safeBodyState(state);

  return (
    <SurfaceCard
      className={cn(
        'p-5 sm:p-6',
        tone === 'internal' ? 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.06)]' : '',
      )}
    >
      <form action={formAction} className="space-y-4" noValidate>
        <input name="caseReference" type="hidden" value={caseReference} />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#F5F1EA]" htmlFor={bodyId}>
            {label}
          </label>
          <p className="text-xs leading-6 text-[#9A9185]/78">{description}</p>
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
            placeholder={tone === 'internal' ? 'Add an admin-only note.' : 'Write the public support reply.'}
            required
          />
          {safeState.fieldErrors.body ? (
            <p className="text-sm text-[rgba(255,198,198,0.92)]" id={errorId}>
              {safeState.fieldErrors.body}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end">
          <SubmitButton pendingLabel={pendingLabel} variant={tone === 'internal' ? 'secondary' : 'primary'}>
            {submitLabel}
          </SubmitButton>
        </div>
      </form>
    </SurfaceCard>
  );
}

export function AdminSupportReplyForm({
  caseReference,
}: Readonly<{
  caseReference: string;
}>) {
  return (
    <AdminSupportMessageForm
      action={addAdminSupportReplyAction}
      caseReference={caseReference}
      description="Adds a public message visible to the user in their support case."
      label="Admin public reply"
      pendingLabel="Sending..."
      submitLabel="Send public reply"
    />
  );
}

export function AdminSupportInternalNoteForm({
  caseReference,
}: Readonly<{
  caseReference: string;
}>) {
  return (
    <AdminSupportMessageForm
      action={addAdminInternalNoteAction}
      caseReference={caseReference}
      description="Adds an admin-only note. Users cannot see internal notes."
      label="Internal note"
      pendingLabel="Saving..."
      submitLabel="Save internal note"
      tone="internal"
    />
  );
}

export function AdminSupportStatusForm({
  caseReference,
  currentStatus,
}: Readonly<{
  caseReference: string;
  currentStatus: SupportStatus;
}>) {
  const id = useId().replace(/:/g, '');
  const fieldId = `admin-support-status-${id}`;
  const errorId = `${fieldId}-error`;
  const [state, formAction] = useActionState(
    updateAdminSupportStatusAction,
    initialAdminSupportStatusActionState(currentStatus),
  );
  const safeState = safeStatusState(state, currentStatus);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input name="caseReference" type="hidden" value={caseReference} />
      <label className="block text-sm font-medium text-[#F5F1EA]" htmlFor={fieldId}>
        Status
      </label>
      {safeState.formError ? (
        <div className="rounded-[1rem] border border-[rgba(255,157,157,0.28)] bg-[rgba(255,157,157,0.08)] px-4 py-3 text-sm font-medium text-[rgba(255,225,225,0.92)]" role="alert">
          {safeState.formError}
        </div>
      ) : null}
      <select
        aria-describedby={safeState.fieldErrors.status ? errorId : undefined}
        aria-invalid={safeState.fieldErrors.status ? true : undefined}
        className="sonartra-focus-ring min-h-11 w-full rounded-xl border border-white/10 bg-[rgb(11,18,33)] px-3 text-sm text-white outline-none transition focus:border-white/16"
        defaultValue={safeState.values.status}
        id={fieldId}
        name="status"
      >
        {ADMIN_SUPPORT_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {safeState.fieldErrors.status ? (
        <p className="text-sm text-[rgba(255,198,198,0.92)]" id={errorId}>
          {safeState.fieldErrors.status}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Updating..." variant="secondary">
        Update status
      </SubmitButton>
    </form>
  );
}

export function AdminSupportPriorityForm({
  caseReference,
  currentPriority,
}: Readonly<{
  caseReference: string;
  currentPriority: SupportPriority;
}>) {
  const id = useId().replace(/:/g, '');
  const fieldId = `admin-support-priority-${id}`;
  const errorId = `${fieldId}-error`;
  const [state, formAction] = useActionState(
    updateAdminSupportPriorityAction,
    initialAdminSupportPriorityActionState(currentPriority),
  );
  const safeState = safePriorityState(state, currentPriority);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input name="caseReference" type="hidden" value={caseReference} />
      <label className="block text-sm font-medium text-[#F5F1EA]" htmlFor={fieldId}>
        Priority
      </label>
      {safeState.formError ? (
        <div className="rounded-[1rem] border border-[rgba(255,157,157,0.28)] bg-[rgba(255,157,157,0.08)] px-4 py-3 text-sm font-medium text-[rgba(255,225,225,0.92)]" role="alert">
          {safeState.formError}
        </div>
      ) : null}
      <select
        aria-describedby={safeState.fieldErrors.priority ? errorId : undefined}
        aria-invalid={safeState.fieldErrors.priority ? true : undefined}
        className="sonartra-focus-ring min-h-11 w-full rounded-xl border border-white/10 bg-[rgb(11,18,33)] px-3 text-sm text-white outline-none transition focus:border-white/16"
        defaultValue={safeState.values.priority}
        id={fieldId}
        name="priority"
      >
        {SUPPORT_PRIORITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {safeState.fieldErrors.priority ? (
        <p className="text-sm text-[rgba(255,198,198,0.92)]" id={errorId}>
          {safeState.fieldErrors.priority}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Updating..." variant="secondary">
        Update priority
      </SubmitButton>
    </form>
  );
}
