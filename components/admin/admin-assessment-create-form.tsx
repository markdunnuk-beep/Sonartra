'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  ButtonLink,
  LabelPill,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import {
  createAssessmentAction,
  emptyAdminAssessmentCreateFormValues,
  initialAdminAssessmentCreateFormState,
  type AdminAssessmentCreateFormState,
} from '@/lib/server/admin-assessment-create';

function FieldShell({
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
        'sonartra-focus-ring min-h-12 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
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
        'sonartra-focus-ring min-h-[152px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring min-w-[164px]',
        pending ? 'cursor-wait border-white/8 bg-white/[0.05] text-white/48' : 'sonartra-button-primary',
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? 'Creating...' : 'Create assessment'}
    </button>
  );
}

export function AdminAssessmentCreateForm() {
  const [state, formAction] = useActionState(
    createAssessmentAction,
    initialAdminAssessmentCreateFormState,
  );
  const safeState: AdminAssessmentCreateFormState = {
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      title: state?.values?.title ?? emptyAdminAssessmentCreateFormValues.title,
      assessmentKey:
        state?.values?.assessmentKey ?? emptyAdminAssessmentCreateFormValues.assessmentKey,
      description:
        state?.values?.description ?? emptyAdminAssessmentCreateFormValues.description,
    },
  };

  return (
    <div className="space-y-6">
      <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
        <div className="space-y-3">
          <LabelPill className="bg-white/[0.08] text-white/82">Base definition bootstrap</LabelPill>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.3rem]">
            Create the parent assessment record and first draft version.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/68">
            This step establishes the canonical base object only. Domain, signal, question, and
            weighting authoring follow in later tasks.
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5 lg:p-6">
        <form action={formAction} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <FieldShell
              error={safeState.fieldErrors.title}
              hint="Use the human-readable assessment name that appears in admin catalogue views."
              label="Assessment title"
            >
              <TextInput
                defaultValue={safeState.values.title}
                error={safeState.fieldErrors.title}
                name="title"
                placeholder="Leadership Signals"
              />
            </FieldShell>

            <FieldShell
              error={safeState.fieldErrors.assessmentKey}
              hint="This becomes the stable key in routes and persisted records. Use lowercase letters, numbers, and hyphens only."
              label="Assessment key"
            >
              <TextInput
                defaultValue={safeState.values.assessmentKey}
                error={safeState.fieldErrors.assessmentKey}
                name="assessmentKey"
                placeholder="leadership-signals"
              />
            </FieldShell>
          </div>

          <FieldShell
            error={safeState.fieldErrors.description}
            hint="Optional. Add a concise summary so the new assessment is legible in the admin catalogue."
            label="Description"
          >
            <TextArea
              defaultValue={safeState.values.description}
              error={safeState.fieldErrors.description}
              name="description"
              placeholder="A focused individual assessment for leadership behaviour and decision patterns."
            />
          </FieldShell>

          <div className="rounded-[1.2rem] border border-white/8 bg-black/10 p-4">
            <p className="sonartra-page-eyebrow">Creation result</p>
            <p className="mt-2 text-sm leading-7 text-white/62">
              Submitting this form creates one `assessments` row and one linked `assessment_versions`
              row with draft lifecycle status and version `1.0.0`.
            </p>
          </div>

          {safeState.formError ? (
            <div className="rounded-[1rem] border border-[rgba(255,157,157,0.24)] bg-[rgba(80,20,20,0.22)] px-4 py-3 text-sm text-[rgba(255,216,216,0.94)]">
              {safeState.formError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SubmitButton />
            <ButtonLink href="/admin/assessments">Cancel</ButtonLink>
          </div>
        </form>
      </SurfaceCard>
    </div>
  );
}
