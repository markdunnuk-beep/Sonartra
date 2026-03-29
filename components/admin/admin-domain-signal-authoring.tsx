'use client';

import { useActionState } from 'react';
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
  updateDomainAction,
  updateSignalAction,
} from '@/lib/server/admin-domain-signal-authoring';

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
  placeholder,
  error,
}: Readonly<{
  name: string;
  defaultValue: string;
  placeholder: string;
  error?: string;
}>) {
  return (
    <input
      className={cn(
        'sonartra-focus-ring min-h-11 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      defaultValue={defaultValue}
      name={name}
      placeholder={placeholder}
      type="text"
    />
  );
}

function TextArea({
  name,
  defaultValue,
  placeholder,
  error,
}: Readonly<{
  name: string;
  defaultValue: string;
  placeholder: string;
  error?: string;
}>) {
  return (
    <textarea
      className={cn(
        'sonartra-focus-ring min-h-[112px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      defaultValue={defaultValue}
      name={name}
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

function CreateDomainForm({
  assessmentKey,
  assessmentVersionId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
}) {
  const [state, formAction] = useActionState(
    createDomainAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
    }),
    initialAdminAuthoringFormState,
  );
  const currentState = normalizeState(state);

  return (
    <SurfaceCard accent className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Create domain</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Add a scoring domain to this draft version
          </h3>
          <p className="max-w-2xl text-sm leading-7 text-white/62">
            Domains created here are stored as `SIGNAL_GROUP` records and become the parent
            containers for the signals authored below.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field error={currentState.fieldErrors.label} hint="Human-readable domain name." label="Domain name">
              <TextInput
                defaultValue={currentState.values.label}
                error={currentState.fieldErrors.label}
                name="label"
                placeholder="Leadership style"
              />
            </Field>
            <Field error={currentState.fieldErrors.key} hint="Stable engine-facing key." label="Domain key">
              <TextInput
                defaultValue={currentState.values.key}
                error={currentState.fieldErrors.key}
                name="key"
                placeholder="leadership-style"
              />
            </Field>
          </div>

          <Field
            error={currentState.fieldErrors.description}
            hint="Optional description for admin context."
            label="Description"
          >
            <TextArea
              defaultValue={currentState.values.description}
              error={currentState.fieldErrors.description}
              name="description"
              placeholder="Groups the signals used to interpret leadership tendencies."
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
  const [state, formAction] = useActionState(
    createSignalAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      domainId,
    }),
    initialAdminAuthoringFormState,
  );
  const currentState = normalizeState(state);

  return (
    <SurfaceCard className="p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="sonartra-page-eyebrow">Create signal</p>
          <p className="text-sm leading-7 text-white/58">
            Signals are persisted inside this domain and appended in explicit order.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field error={currentState.fieldErrors.label} hint="Signal name." label="Name">
              <TextInput
                defaultValue={currentState.values.label}
                error={currentState.fieldErrors.label}
                name="label"
                placeholder="Directive"
              />
            </Field>
            <Field error={currentState.fieldErrors.key} hint="Stable key." label="Key">
              <TextInput
                defaultValue={currentState.values.key}
                error={currentState.fieldErrors.key}
                name="key"
                placeholder="directive"
              />
            </Field>
          </div>

          <Field
            error={currentState.fieldErrors.description}
            hint="Optional signal description."
            label="Description"
          >
            <TextArea
              defaultValue={currentState.values.description}
              error={currentState.fieldErrors.description}
              name="description"
              placeholder="Represents a clear, direct leadership tendency."
            />
          </Field>

          <InlineError message={currentState.formError} />

          <SubmitButton idleLabel="Add signal" pendingLabel="Adding signal..." />
        </form>
      </div>
    </SurfaceCard>
  );
}

function EditDomainForm({
  assessmentKey,
  assessmentVersionId,
  domain,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domain: AdminAssessmentDetailDomain;
}) {
  const [state, formAction] = useActionState(
    updateDomainAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      domainId: domain.domainId,
    }),
    {
      ...initialAdminAuthoringFormState,
      values: {
        label: domain.label,
        key: domain.domainKey,
        description: domain.description ?? '',
      },
    },
  );
  const currentState = normalizeState(state);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field error={currentState.fieldErrors.label} hint="Domain display name." label="Name">
          <TextInput
            defaultValue={currentState.values.label}
            error={currentState.fieldErrors.label}
            name="label"
            placeholder="Leadership style"
          />
        </Field>
        <Field error={currentState.fieldErrors.key} hint="Stable key." label="Key">
          <TextInput
            defaultValue={currentState.values.key}
            error={currentState.fieldErrors.key}
            name="key"
            placeholder="leadership-style"
          />
        </Field>
      </div>

      <Field
        error={currentState.fieldErrors.description}
        hint="Optional domain description."
        label="Description"
      >
        <TextArea
          defaultValue={currentState.values.description}
          error={currentState.fieldErrors.description}
          name="description"
          placeholder="Describe what this domain groups."
        />
      </Field>

      <InlineError message={currentState.formError} />

      <SubmitButton idleLabel="Save domain" pendingLabel="Saving..." />
    </form>
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

function EditSignalForm({
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
  const [state, formAction] = useActionState(
    updateSignalAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      domainId,
      signalId: signal.signalId,
    }),
    {
      ...initialAdminAuthoringFormState,
      values: {
        label: signal.label,
        key: signal.signalKey,
        description: signal.description ?? '',
      },
    },
  );
  const currentState = normalizeState(state);

  return (
    <form action={formAction} className="space-y-4 rounded-[1rem] border border-white/8 bg-black/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill>{signal.signalKey}</LabelPill>
        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
          Order {signal.orderIndex + 1}
        </LabelPill>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field error={currentState.fieldErrors.label} hint="Signal display name." label="Name">
          <TextInput
            defaultValue={currentState.values.label}
            error={currentState.fieldErrors.label}
            name="label"
            placeholder="Directive"
          />
        </Field>
        <Field error={currentState.fieldErrors.key} hint="Stable key." label="Key">
          <TextInput
            defaultValue={currentState.values.key}
            error={currentState.fieldErrors.key}
            name="key"
            placeholder="directive"
          />
        </Field>
      </div>

      <Field
        error={currentState.fieldErrors.description}
        hint="Optional signal description."
        label="Description"
      >
        <TextArea
          defaultValue={currentState.values.description}
          error={currentState.fieldErrors.description}
          name="description"
          placeholder="Describe the signal."
        />
      </Field>

      <InlineError message={currentState.formError} />

      <SubmitButton idleLabel="Save signal" pendingLabel="Saving..." />
    </form>
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
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domain: AdminAssessmentDetailDomain;
}) {
  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{domain.domainKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Domain {domain.orderIndex + 1}
          </LabelPill>
          <LabelPill className="border-[rgba(142,162,255,0.22)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]">
            {domain.signals.length} signal{domain.signals.length === 1 ? '' : 's'}
          </LabelPill>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
          <EditDomainForm
            assessmentKey={assessmentKey}
            assessmentVersionId={assessmentVersionId}
            domain={domain}
          />
          <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <p className="sonartra-page-eyebrow">Delete domain</p>
            <p className="mt-2 text-sm leading-7 text-white/58">
              Removing a domain also removes its nested signals from this draft version.
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

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="sonartra-page-eyebrow">Signals</p>
            <p className="text-sm leading-7 text-white/58">
              Signals are persisted in explicit order inside this domain.
            </p>
          </div>

          {domain.signals.length === 0 ? (
            <EmptyState
              className="p-4"
              description="Add the first signal to make this domain usable by later question and weighting authoring."
              title="No signals yet"
            />
          ) : (
            <div className="space-y-4">
              {domain.signals.map((signal) => (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]" key={signal.signalId}>
                  <EditSignalForm
                    assessmentKey={assessmentKey}
                    assessmentVersionId={assessmentVersionId}
                    domainId={domain.domainId}
                    signal={signal}
                  />
                  <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                    <p className="sonartra-page-eyebrow">Delete signal</p>
                    <p className="mt-2 text-sm leading-7 text-white/58">
                      Remove this signal from the current draft version.
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
      </div>
    </SurfaceCard>
  );
}

export function AdminDomainSignalAuthoring({
  assessmentKey,
  assessmentVersionId,
  domains,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domains: readonly AdminAssessmentDetailDomain[];
}) {
  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Domains And Signals"
        title="Author the scoring structure for this draft"
        description="Create signal-group domains and the signals they contain. Everything written here is version-scoped, ordered explicitly, and stored in the canonical engine tables."
      />

      <CreateDomainForm
        assessmentKey={assessmentKey}
        assessmentVersionId={assessmentVersionId}
      />

      {domains.length === 0 ? (
        <EmptyState
          description="Create the first domain to start building the scoring structure for this draft version."
          title="No domains authored yet"
        />
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <DomainCard
              assessmentKey={assessmentKey}
              assessmentVersionId={assessmentVersionId}
              domain={domain}
              key={domain.domainId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

