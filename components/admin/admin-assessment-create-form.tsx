'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  ButtonLink,
  LabelPill,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import {
  emptyAdminAssessmentCreateFormValues,
  initialAdminAssessmentCreateFormState,
  type AdminAssessmentCreateFormState,
} from '@/lib/admin/admin-assessment-create';
import { createAssessmentAction } from '@/lib/server/admin-assessment-create';
import { syncAssessmentKeyFromTitle } from '@/lib/admin/assessment-key';

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
  value,
  placeholder,
  error,
  onChange,
}: Readonly<{
  name: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}>) {
  return (
    <input
      aria-invalid={error ? true : undefined}
      className={cn(
        'sonartra-focus-ring min-h-12 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      type="text"
      value={value}
    />
  );
}

function TextArea({
  name,
  value,
  placeholder,
  error,
  onChange,
}: Readonly<{
  name: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}>) {
  return (
    <textarea
      aria-invalid={error ? true : undefined}
      className={cn(
        'sonartra-focus-ring min-h-[152px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
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
  const [title, setTitle] = useState(safeState.values.title);
  const [assessmentKey, setAssessmentKey] = useState(safeState.values.assessmentKey);
  const [description, setDescription] = useState(safeState.values.description);
  const [hasManualKeyOverride, setHasManualKeyOverride] = useState(
    safeState.values.assessmentKey.length > 0 &&
      safeState.values.assessmentKey !== syncAssessmentKeyFromTitle({
        title: safeState.values.title,
        currentKey: '',
        hasManualOverride: false,
      }),
  );

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextTitle = event.currentTarget.value;
    setTitle(nextTitle);
    setAssessmentKey((currentKey) =>
      syncAssessmentKeyFromTitle({
        title: nextTitle,
        currentKey,
        hasManualOverride: hasManualKeyOverride,
      }),
    );
  }

  function handleAssessmentKeyChange(event: React.ChangeEvent<HTMLInputElement>) {
    setHasManualKeyOverride(true);
    setAssessmentKey(event.currentTarget.value);
  }

  return (
    <div className="space-y-6">
      <SurfaceCard accent className="overflow-hidden p-6 lg:p-8">
        <div className="space-y-3">
          <LabelPill className="bg-white/[0.08] text-white/82">New assessment</LabelPill>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.3rem]">
            Create an assessment and start a draft.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/68">
            Start with the basics. You can add domains, signals, questions, and scoring next.
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5 lg:p-6">
        <form action={formAction} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <FieldShell
              error={safeState.fieldErrors.title}
              hint="This name is shown in admin."
              label="Assessment title"
            >
              <TextInput
                error={safeState.fieldErrors.title}
                name="title"
                onChange={handleTitleChange}
                placeholder="Leadership Signals"
                value={title}
              />
            </FieldShell>

            <FieldShell
              error={safeState.fieldErrors.assessmentKey}
              hint="Use lowercase letters, numbers, and hyphens."
              label="Assessment key"
            >
              <TextInput
                error={safeState.fieldErrors.assessmentKey}
                name="assessmentKey"
                onChange={handleAssessmentKeyChange}
                placeholder="leadership-signals"
                value={assessmentKey}
              />
            </FieldShell>
          </div>

          <FieldShell
            error={safeState.fieldErrors.description}
            hint="Optional short summary."
            label="Description"
          >
            <TextArea
              value={description}
              error={safeState.fieldErrors.description}
              name="description"
              onChange={(event) => setDescription(event.currentTarget.value)}
              placeholder="A focused individual assessment for leadership behaviour and decision patterns."
            />
          </FieldShell>

          <div className="rounded-[1.2rem] border border-white/8 bg-black/10 p-4">
            <p className="sonartra-page-eyebrow">Creation result</p>
            <p className="mt-2 text-sm leading-7 text-white/62">
              This creates the assessment and its first draft, version `1.0.0`.
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
