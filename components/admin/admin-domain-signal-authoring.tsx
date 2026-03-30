'use client';

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import {
  EmptyState,
  LabelPill,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import {
  emptyAdminAuthoringFormValues,
  initialAdminAuthoringFormState,
  type AdminAuthoringFormState,
} from '@/lib/admin/admin-domain-signal-authoring';
import type { AdminAssessmentDetailDomain } from '@/lib/server/admin-assessment-detail';
import {
  createDomainAction,
  createSignalAction,
  deleteDomainAction,
  deleteSignalAction,
  regenerateDomainKeyAction,
  regenerateSignalKeyAction,
  updateDomainLabelAction,
  updateSignalLabelAction,
  type InlineDomainKeyRegenerateResult,
  type InlineDomainLabelUpdateResult,
  type InlineSignalKeyRegenerateResult,
  type InlineSignalLabelUpdateResult,
} from '@/lib/server/admin-domain-signal-authoring';
import {
  DOMAIN_KEY_PATTERN,
  createDomainKeyDraftState,
  syncDomainKeyFromLabel,
  syncDomainKeyFromManualInput,
} from '@/lib/utils/domain-key';
import {
  SIGNAL_KEY_PATTERN,
  createSignalKeyDraftState,
  syncSignalKeyFromManualInput,
  syncSignalKeyFromName,
} from '@/lib/utils/signal-key';

function normalizeState(state: AdminAuthoringFormState | null | undefined): AdminAuthoringFormState {
  return {
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      label: state?.values?.label ?? emptyAdminAuthoringFormValues.label,
      key: state?.values?.key ?? emptyAdminAuthoringFormValues.key,
      description: state?.values?.description ?? emptyAdminAuthoringFormValues.description,
    },
  };
}

function Field({
  label,
  hint,
  error,
  children,
}: Readonly<{
  label: string;
  hint: string;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="block space-y-2">
      <div className="space-y-1">
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-sm leading-6 text-white/54">{hint}</span>
      </div>
      {children}
      {error ? <p className="text-sm text-[rgba(255,198,198,0.92)]">{error}</p> : null}
    </label>
  );
}

function TextInput({
  name,
  defaultValue,
  value,
  placeholder,
  error,
  onChange,
  required,
  pattern,
  title,
}: Readonly<{
  name: string;
  defaultValue?: string;
  value?: string;
  placeholder: string;
  error?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  pattern?: string;
  title?: string;
}>) {
  return (
    <input
      className={cn(
        'sonartra-focus-ring min-h-11 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      name={name}
      {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? '' })}
      onChange={onChange}
      placeholder={placeholder}
      pattern={pattern}
      required={required}
      title={title}
      type="text"
    />
  );
}

function TextArea({
  name,
  defaultValue,
  value,
  placeholder,
  error,
  onChange,
}: Readonly<{
  name: string;
  defaultValue?: string;
  value?: string;
  placeholder: string;
  error?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}>) {
  return (
    <textarea
      className={cn(
        'sonartra-focus-ring min-h-[112px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      name={name}
      {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? '' })}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

function SubmitButton({
  idleLabel,
  pendingLabel,
  variant = 'primary',
}: Readonly<{
  idleLabel: string;
  pendingLabel: string;
  variant?: 'primary' | 'secondary' | 'danger';
}>) {
  const { pending } = useFormStatus();

  const variantClass =
    variant === 'primary'
      ? 'sonartra-button-primary'
      : variant === 'danger'
        ? 'border-[rgba(255,157,157,0.24)] bg-[rgba(80,20,20,0.22)] text-[rgba(255,216,216,0.94)] hover:bg-[rgba(96,25,25,0.3)]'
        : 'sonartra-button-secondary';

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring',
        pending ? 'cursor-wait border-white/8 bg-white/[0.05] text-white/48' : variantClass,
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function InlineError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-[1rem] border border-[rgba(255,157,157,0.24)] bg-[rgba(80,20,20,0.22)] px-4 py-3 text-sm text-[rgba(255,216,216,0.94)]">
      {message}
    </div>
  );
}

function InlineActionButton({
  idleLabel,
  pendingLabel,
}: Readonly<{
  idleLabel: string;
  pendingLabel: string;
}>) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-focus-ring inline-flex min-h-9 items-center rounded-[0.8rem] border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] transition',
        pending
          ? 'cursor-wait border-white/8 bg-white/[0.05] text-white/44'
          : 'border-white/10 bg-white/[0.03] text-white/66 hover:border-white/16 hover:bg-white/[0.06] hover:text-white/84',
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function DomainKeyRegenerateForm({
  assessmentKey,
  assessmentVersionId,
  domainId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId: string;
}) {
  const [state, formAction] = useActionState(
    regenerateDomainKeyAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      domainId,
    }),
    null as InlineDomainKeyRegenerateResult | null,
  );

  return (
    <form action={formAction} className="space-y-2">
      {state && !state.ok ? <InlineError message={state.error} /> : null}
      <InlineActionButton idleLabel="Regenerate key" pendingLabel="Updating..." />
    </form>
  );
}

function SignalKeyRegenerateForm({
  assessmentKey,
  assessmentVersionId,
  signalId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  signalId: string;
}) {
  const [state, formAction] = useActionState(
    regenerateSignalKeyAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      signalId,
    }),
    null as InlineSignalKeyRegenerateResult | null,
  );

  return (
    <form action={formAction} className="space-y-2">
      {state && !state.ok ? <InlineError message={state.error} /> : null}
      <InlineActionButton idleLabel="Regenerate key" pendingLabel="Updating..." />
    </form>
  );
}

function InlineTextEditor({
  label,
  value,
  placeholder,
  emptyLabel,
  multiline = false,
  requiredMessage,
  onSave,
}: Readonly<{
  label: string;
  value: string;
  placeholder: string;
  emptyLabel: string;
  multiline?: boolean;
  requiredMessage: string;
  onSave: (nextValue: string) => Promise<{ ok: boolean; value?: string; error?: string }>;
}>) {
  const [draftValue, setDraftValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const ignoreBlurRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const field = multiline ? textAreaRef.current : inputRef.current;
    field?.focus();
    field?.select();
  }, [isEditing, multiline]);

  function startEditing() {
    if (isPending) {
      return;
    }

    setDraftValue(value);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftValue(value);
    setError(null);
    setIsEditing(false);
  }

  function submit(nextRawValue: string) {
    const trimmedValue = nextRawValue.trim();
    const previousValue = value.trim();

    if (!trimmedValue) {
      setError(requiredMessage);
      return;
    }

    if (trimmedValue === previousValue) {
      setDraftValue(trimmedValue);
      setError(null);
      setIsEditing(false);
      return;
    }

    setDraftValue(trimmedValue);
    setError(null);
    setIsEditing(false);

    startTransition(async () => {
      const result = await onSave(trimmedValue);

      if (!result.ok) {
        setDraftValue(previousValue);
        setError(result.error ?? 'Changes could not be saved.');
        return;
      }

      setDraftValue(result.value ?? trimmedValue);
    });
  }

  const displayValue = value.trim();

  if (isEditing) {
    const sharedClassName = cn(
      'sonartra-focus-ring w-full rounded-[0.9rem] border bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/28',
      multiline ? 'min-h-[96px] resize-y' : 'min-h-11',
      error
        ? 'border-[rgba(255,157,157,0.32)]'
        : 'border-[rgba(142,162,255,0.32)] hover:border-[rgba(142,162,255,0.4)] focus:border-[rgba(142,162,255,0.48)]',
    );
    const sharedHandlers = {
      disabled: isPending,
      onBlur: () => {
        if (ignoreBlurRef.current) {
          ignoreBlurRef.current = false;
          return;
        }

        submit(draftValue);
      },
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        setDraftValue(event.currentTarget.value);
        if (error) {
          setError(null);
        }
      },
      onKeyDown: (
        event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        if (event.key === 'Escape') {
          ignoreBlurRef.current = true;
          event.preventDefault();
          cancelEditing();
          return;
        }

        if (event.key === 'Enter' && (!multiline || !event.shiftKey)) {
          ignoreBlurRef.current = true;
          event.preventDefault();
          submit(draftValue);
        }
      },
      placeholder,
      value: draftValue,
      'aria-label': label,
    };

    return (
      <div className="space-y-2">
        {multiline ? (
          <textarea
            {...sharedHandlers}
            className={sharedClassName}
            ref={textAreaRef}
          />
        ) : (
          <input
            {...sharedHandlers}
            className={sharedClassName}
            ref={inputRef}
            type="text"
          />
        )}
        {error ? <p className="text-xs text-[rgba(255,198,198,0.92)]">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        className={cn(
          'sonartra-focus-ring w-full rounded-[0.9rem] border border-dashed px-3 py-2 text-left transition',
          'border-white/10 bg-black/10 hover:border-white/18 hover:bg-black/18',
          isPending ? 'cursor-wait text-white/42' : 'text-white',
          !displayValue ? 'text-white/38' : 'text-white',
        )}
        disabled={isPending}
        onClick={startEditing}
        type="button"
      >
        <span className="block text-[11px] uppercase tracking-[0.16em] text-white/42">{emptyLabel}</span>
        <span className={cn('mt-1 block text-sm leading-6', !displayValue ? 'italic text-white/34' : 'text-white/88')}>
          {displayValue || placeholder}
        </span>
      </button>
      {error ? <p className="text-xs text-[rgba(255,198,198,0.92)]">{error}</p> : null}
    </div>
  );
}

function CreateDomainForm({
  assessmentKey,
  assessmentVersionId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
}) {
  const createDomainFormAction = useMemo(
    () =>
      createDomainAction.bind(null, {
        assessmentKey,
        assessmentVersionId,
      }),
    [assessmentKey, assessmentVersionId],
  );
  const [state, formAction] = useActionState(
    createDomainFormAction,
    initialAdminAuthoringFormState,
  );
  const currentState = normalizeState(state);
  const [draftState, setDraftState] = useState(() =>
    createDomainKeyDraftState({
      label: currentState.values.label,
      key: currentState.values.key,
    }),
  );
  const [description, setDescription] = useState(currentState.values.description);

  useEffect(() => {
    if (
      currentState.formError ||
      currentState.fieldErrors.label ||
      currentState.fieldErrors.key ||
      currentState.fieldErrors.description
    ) {
      return;
    }

    if (
      currentState.values.label ||
      currentState.values.key ||
      currentState.values.description
    ) {
      return;
    }

    setDraftState(createDomainKeyDraftState({ label: '', key: '' }));
    setDescription('');
  }, [
    currentState.fieldErrors.description,
    currentState.fieldErrors.key,
    currentState.fieldErrors.label,
    currentState.formError,
    currentState.values.description,
    currentState.values.key,
    currentState.values.label,
  ]);

  return (
    <SurfaceCard accent className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Add domain</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Add a domain
          </h3>
          <p className="max-w-2xl text-sm leading-7 text-white/62">
            Add the main areas for this assessment.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field error={currentState.fieldErrors.label} hint="Name this domain." label="Domain name">
              <TextInput
                error={currentState.fieldErrors.label}
                name="label"
                onChange={(event) => {
                  const nextLabel = event.currentTarget.value;
                  setDraftState((previousState) =>
                    syncDomainKeyFromLabel(previousState, nextLabel),
                  );
                }}
                placeholder="Leadership style"
                required
                value={draftState.label}
              />
            </Field>
            <Field error={currentState.fieldErrors.key} hint="Use a short key." label="Domain key">
              <TextInput
                error={currentState.fieldErrors.key}
                name="key"
                onChange={(event) => {
                  const nextKey = event.currentTarget.value;
                  setDraftState((previousState) =>
                    syncDomainKeyFromManualInput(previousState, nextKey),
                  );
                }}
                pattern={DOMAIN_KEY_PATTERN.source}
                placeholder="leadership-style"
                required
                title="Use lowercase letters, numbers, and single hyphens only."
                value={draftState.key}
              />
            </Field>
          </div>

          <Field
            error={currentState.fieldErrors.description}
            hint="Optional short note."
            label="Description"
          >
            <TextArea
              error={currentState.fieldErrors.description}
              name="description"
              onChange={(event) => {
                setDescription(event.currentTarget.value);
              }}
              placeholder="Groups the signals used to interpret leadership tendencies."
              value={description}
            />
          </Field>

          <InlineError message={currentState.formError} />

          <SubmitButton idleLabel="Add domain" pendingLabel="Adding domain..." />
        </form>
      </div>
    </SurfaceCard>
  );
}

function CreateSignalForm({
  assessmentKey,
  assessmentVersionId,
  domainId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId: string;
}) {
  const createSignalFormAction = useMemo(
    () =>
      createSignalAction.bind(null, {
        assessmentKey,
        assessmentVersionId,
        domainId,
      }),
    [assessmentKey, assessmentVersionId, domainId],
  );
  const [state, formAction] = useActionState(
    createSignalFormAction,
    initialAdminAuthoringFormState,
  );
  const currentState = normalizeState(state);
  const [draftState, setDraftState] = useState(() =>
    createSignalKeyDraftState({
      label: currentState.values.label,
      key: currentState.values.key,
    }),
  );
  const [description, setDescription] = useState(currentState.values.description);

  useEffect(() => {
    if (
      currentState.formError ||
      currentState.fieldErrors.label ||
      currentState.fieldErrors.key ||
      currentState.fieldErrors.description
    ) {
      return;
    }

    if (
      currentState.values.label ||
      currentState.values.key ||
      currentState.values.description
    ) {
      return;
    }

    setDraftState(createSignalKeyDraftState({ label: '', key: '' }));
    setDescription('');
  }, [
    currentState.fieldErrors.description,
    currentState.fieldErrors.key,
    currentState.fieldErrors.label,
    currentState.formError,
    currentState.values.description,
    currentState.values.key,
    currentState.values.label,
  ]);

  return (
    <SurfaceCard className="p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="sonartra-page-eyebrow">Add signal</p>
          <p className="text-sm leading-7 text-white/58">
            Add signals to this domain.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field error={currentState.fieldErrors.label} hint="Name this signal." label="Name">
              <TextInput
                error={currentState.fieldErrors.label}
                name="label"
                onChange={(event) => {
                  const nextName = event.currentTarget.value;
                  setDraftState((previousState) =>
                    syncSignalKeyFromName(previousState, nextName),
                  );
                }}
                placeholder="Directive"
                required
                value={draftState.label}
              />
            </Field>
            <Field error={currentState.fieldErrors.key} hint="Use a short key." label="Key">
              <TextInput
                error={currentState.fieldErrors.key}
                name="key"
                onChange={(event) => {
                  const nextKey = event.currentTarget.value;
                  setDraftState((previousState) =>
                    syncSignalKeyFromManualInput(previousState, nextKey),
                  );
                }}
                pattern={SIGNAL_KEY_PATTERN.source}
                placeholder="directive"
                required
                title="Use lowercase letters, numbers, and single hyphens only."
                value={draftState.key}
              />
            </Field>
          </div>

          <Field
            error={currentState.fieldErrors.description}
            hint="Optional short note."
            label="Description"
          >
            <TextArea
              error={currentState.fieldErrors.description}
              name="description"
              onChange={(event) => {
                setDescription(event.currentTarget.value);
              }}
              placeholder="Represents a clear, direct leadership tendency."
              value={description}
            />
          </Field>

          <InlineError message={currentState.formError} />

          <SubmitButton idleLabel="Add signal" pendingLabel="Adding signal..." />
        </form>
      </div>
    </SurfaceCard>
  );
}

function DomainLabelEditor({
  assessmentKey,
  assessmentVersionId,
  domain,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domain: AdminAssessmentDetailDomain;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill>{domain.domainKey}</LabelPill>
        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
          Semantic key
        </LabelPill>
      </div>

      <InlineTextEditor
        emptyLabel="Domain name"
        label="Domain name"
        onSave={async (nextValue) => {
          const result: InlineDomainLabelUpdateResult = await updateDomainLabelAction({
            assessmentKey,
            assessmentVersionId,
            domainId: domain.domainId,
            label: nextValue,
          });

          return result.ok
            ? { ok: true, value: result.record.label }
            : { ok: false, error: result.error };
        }}
        placeholder="Enter domain name"
        requiredMessage="Domain name is required."
        value={domain.label}
      />

      <DomainKeyRegenerateForm
        assessmentKey={assessmentKey}
        assessmentVersionId={assessmentVersionId}
        domainId={domain.domainId}
      />
    </div>
  );
}

function DeleteDomainForm({
  assessmentKey,
  assessmentVersionId,
  domainId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId: string;
}) {
  const [state, formAction] = useActionState(
    deleteDomainAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      domainId,
    }),
    initialAdminAuthoringFormState,
  );
  const currentState = normalizeState(state);

  return (
    <form action={formAction} className="space-y-3">
      <InlineError message={currentState.formError} />
      <SubmitButton idleLabel="Delete domain" pendingLabel="Deleting..." variant="danger" />
    </form>
  );
}

function SignalLabelEditor({
  assessmentKey,
  assessmentVersionId,
  domainId,
  signal,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId: string;
  signal: AdminAssessmentDetailDomain['signals'][number];
}) {
  return (
    <div className="space-y-4 rounded-[1rem] border border-white/8 bg-black/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill>{signal.signalKey}</LabelPill>
        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
          Order {signal.orderIndex + 1}
        </LabelPill>
      </div>

      <InlineTextEditor
        emptyLabel="Signal name"
        label="Signal name"
        onSave={async (nextValue) => {
          const result: InlineSignalLabelUpdateResult = await updateSignalLabelAction({
            assessmentKey,
            assessmentVersionId,
            domainId,
            signalId: signal.signalId,
            label: nextValue,
          });

          return result.ok
            ? { ok: true, value: result.record.label }
            : { ok: false, error: result.error };
        }}
        placeholder="Enter signal name"
        requiredMessage="Signal name is required."
        value={signal.label}
      />

      <SignalKeyRegenerateForm
        assessmentKey={assessmentKey}
        assessmentVersionId={assessmentVersionId}
        signalId={signal.signalId}
      />
    </div>
  );
}

function DeleteSignalForm({
  assessmentKey,
  assessmentVersionId,
  domainId,
  signalId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domainId: string;
  signalId: string;
}) {
  const [state, formAction] = useActionState(
    deleteSignalAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      domainId,
      signalId,
    }),
    initialAdminAuthoringFormState,
  );
  const currentState = normalizeState(state);

  return (
    <form action={formAction} className="space-y-3">
      <InlineError message={currentState.formError} />
      <SubmitButton idleLabel="Delete signal" pendingLabel="Deleting..." variant="danger" />
    </form>
  );
}

function DomainCard({
  assessmentKey,
  assessmentVersionId,
  domain,
  showDomainControls,
  showSignals,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domain: AdminAssessmentDetailDomain;
  showDomainControls: boolean;
  showSignals: boolean;
}) {
  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Domain {domain.orderIndex + 1}
          </LabelPill>
          <LabelPill className="border-[rgba(142,162,255,0.22)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]">
            {domain.signals.length} signal{domain.signals.length === 1 ? '' : 's'}
          </LabelPill>
        </div>

        {showDomainControls ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
            <DomainLabelEditor
              assessmentKey={assessmentKey}
              assessmentVersionId={assessmentVersionId}
              domain={domain}
            />
            <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
              <p className="sonartra-page-eyebrow">Delete domain</p>
              <p className="mt-2 text-sm leading-7 text-white/58">
                This also removes the signals inside it.
              </p>
              <div className="mt-4">
                <DeleteDomainForm
                  assessmentKey={assessmentKey}
                  assessmentVersionId={assessmentVersionId}
                  domainId={domain.domainId}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <p className="text-sm font-medium text-white">{domain.label}</p>
            <p className="mt-2 text-sm leading-7 text-white/58">
              Add and edit signals for this domain here.
            </p>
          </div>
        )}

        {showSignals ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="sonartra-page-eyebrow">Signals</p>
              <p className="text-sm leading-7 text-white/58">
                Add signals to this domain.
              </p>
            </div>

            {domain.signals.length === 0 ? (
              <EmptyState
                className="p-4"
                description="Add a signal to this domain."
                title="No signals yet"
              />
            ) : (
              <div className="space-y-4">
                {domain.signals.map((signal) => (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]" key={signal.signalId}>
                    <SignalLabelEditor
                      assessmentKey={assessmentKey}
                      assessmentVersionId={assessmentVersionId}
                      domainId={domain.domainId}
                      signal={signal}
                    />
                    <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                      <p className="sonartra-page-eyebrow">Delete signal</p>
                      <p className="mt-2 text-sm leading-7 text-white/58">
                        Remove this signal.
                      </p>
                      <div className="mt-4">
                        <DeleteSignalForm
                          assessmentKey={assessmentKey}
                          assessmentVersionId={assessmentVersionId}
                          domainId={domain.domainId}
                          signalId={signal.signalId}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <CreateSignalForm
              assessmentKey={assessmentKey}
              assessmentVersionId={assessmentVersionId}
              domainId={domain.domainId}
            />
          </div>
        ) : (
          <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <p className="sonartra-page-eyebrow">Signals</p>
            <p className="mt-2 text-sm leading-7 text-white/58">
              {domain.signals.length} signal{domain.signals.length === 1 ? '' : 's'} in this domain.
              Open Signals to edit them.
            </p>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

export function AdminDomainSignalAuthoring({
  assessmentKey,
  assessmentVersionId,
  domains,
  mode = 'all',
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domains: readonly AdminAssessmentDetailDomain[];
  mode?: 'all' | 'domains' | 'signals';
}) {
  const showDomainControls = mode !== 'signals';
  const showSignals = mode !== 'domains';

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow={
          mode === 'domains'
            ? 'Domains'
            : mode === 'signals'
              ? 'Signals'
              : 'Domains And Signals'
        }
        title={
          mode === 'domains'
            ? 'Set up domains'
            : mode === 'signals'
              ? 'Add signals to each domain'
              : 'Set up domains and signals'
        }
        description={
          mode === 'domains'
            ? 'Add the main sections of the assessment.'
            : mode === 'signals'
              ? 'Add the signals that sit inside each domain.'
              : 'Set up the sections and signals for this assessment.'
        }
      />

      {showDomainControls ? (
        <CreateDomainForm
          assessmentKey={assessmentKey}
          assessmentVersionId={assessmentVersionId}
        />
      ) : null}

      {domains.length === 0 ? (
        <EmptyState
          description={
            mode === 'signals'
              ? 'Add a domain first, then come back to add signals.'
              : 'Add your first domain.'
          }
          title="No domains yet"
        />
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <DomainCard
              assessmentKey={assessmentKey}
              assessmentVersionId={assessmentVersionId}
              domain={domain}
              key={domain.domainId}
              showDomainControls={showDomainControls}
              showSignals={showSignals}
            />
          ))}
        </div>
      )}
    </section>
  );
}

