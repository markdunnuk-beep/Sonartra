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
import { ASSESSMENT_KEY_PATTERN, syncAssessmentKeyFromTitle } from '@/lib/admin/assessment-key';
import type { AssessmentMode } from '@/lib/types/assessment';
import { getAssessmentModeLabel } from '@/lib/utils/assessment-mode';

function FieldShell({
  htmlFor,
  label,
  hint,
  error,
  required = false,
  children,
}: Readonly<{
  htmlFor: string;
  label: string;
  hint: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}>) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-white" htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-2 text-xs uppercase tracking-[0.14em] text-white/46">Required</span> : null}
        </label>
        <p className="block text-sm leading-6 text-white/54" id={hintId}>
          {hint}
        </p>
      </div>
      {children}
      {error ? (
        <p className="text-sm text-[rgba(255,198,198,0.92)]" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TextInput({
  id,
  name,
  value,
  placeholder,
  error,
  describedBy,
  required = false,
  onChange,
}: Readonly<{
  id: string;
  name: string;
  value: string;
  placeholder: string;
  error?: string;
  describedBy?: string;
  required?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}>) {
  return (
    <input
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={cn(
        'sonartra-focus-ring min-h-12 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      id={id}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      type="text"
      value={value}
    />
  );
}

function TextArea({
  id,
  name,
  value,
  placeholder,
  error,
  describedBy,
  onChange,
}: Readonly<{
  id: string;
  name: string;
  value: string;
  placeholder: string;
  error?: string;
  describedBy?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}>) {
  return (
    <textarea
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={cn(
        'sonartra-focus-ring min-h-[152px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      id={id}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  );
}

function SubmitButton({
  disabled,
  label,
}: Readonly<{
  disabled: boolean;
  label: string;
}>) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring min-w-[164px]',
        isDisabled ? 'cursor-not-allowed border-white/8 bg-white/[0.05] text-white/48' : 'sonartra-button-primary',
      )}
      disabled={isDisabled}
      type="submit"
    >
      {pending ? 'Creating...' : label}
    </button>
  );
}

export function AdminAssessmentCreateForm() {
  return <AdminAssessmentCreateFormContent mode="multi_domain" />;
}

export function AdminAssessmentCreateFormContent({
  mode,
  submitLabel = 'Create assessment',
  heading = 'Create an assessment and start a draft.',
  introDescription = 'Start with the basics. You can add domains, signals, questions, and scoring next.',
  resultDescription = 'This creates the assessment and its first draft, version `1.0.0`.',
  resultSupport = 'Provide the title and assessment key before creating the first draft.',
}: Readonly<{
  mode: AssessmentMode;
  submitLabel?: string;
  heading?: string;
  introDescription?: string;
  resultDescription?: string;
  resultSupport?: string;
}>) {
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
      mode: state?.values?.mode ?? mode,
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
  const titleValue = title.trim();
  const assessmentKeyValue = assessmentKey.trim();
  const hasMinimumValidState = titleValue.length > 0 && assessmentKeyValue.length > 0;
  const assessmentKeyLooksValid =
    assessmentKeyValue.length === 0 || ASSESSMENT_KEY_PATTERN.test(assessmentKeyValue);
  const canCreateAssessment = hasMinimumValidState && assessmentKeyLooksValid;

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
          <LabelPill className="bg-white/[0.08] text-white/82">{getAssessmentModeLabel(mode)} assessment</LabelPill>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.3rem]">
            {heading}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/68">
            {introDescription}
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5 lg:p-6">
        <form action={formAction} className="space-y-6">
          <input name="mode" type="hidden" value={mode} />
          <div className="grid gap-6 lg:grid-cols-2">
            <FieldShell
              htmlFor="assessment-title"
              error={safeState.fieldErrors.title}
              hint="Required. This name is shown across the admin workspace."
              label="Assessment title"
              required
            >
              <TextInput
                describedBy="assessment-title-hint assessment-title-error"
                error={safeState.fieldErrors.title}
                id="assessment-title"
                name="title"
                onChange={handleTitleChange}
                placeholder="Leadership Signals"
                required
                value={title}
              />
            </FieldShell>

            <FieldShell
              htmlFor="assessment-key"
              error={safeState.fieldErrors.assessmentKey}
              hint="Required. Use lowercase letters, numbers, and single hyphens only."
              label="Assessment key"
              required
            >
              <TextInput
                describedBy="assessment-key-hint assessment-key-error"
                error={safeState.fieldErrors.assessmentKey}
                id="assessment-key"
                name="assessmentKey"
                onChange={handleAssessmentKeyChange}
                placeholder="leadership-signals"
                required
                value={assessmentKey}
              />
            </FieldShell>
          </div>

          <FieldShell
            htmlFor="assessment-description"
            error={safeState.fieldErrors.description}
            hint="Optional short summary."
            label="Description"
          >
            <TextArea
              describedBy="assessment-description-hint assessment-description-error"
              error={safeState.fieldErrors.description}
              id="assessment-description"
              name="description"
              onChange={(event) => setDescription(event.currentTarget.value)}
              placeholder="A focused individual assessment for leadership behaviour and decision patterns."
              value={description}
            />
          </FieldShell>

          <div className="rounded-[1.2rem] border border-white/8 bg-black/10 p-4">
            <p className="sonartra-page-eyebrow">Creation result</p>
            <p className="mt-2 text-sm leading-7 text-white/62">
              {resultDescription}
            </p>
            <p className="mt-2 text-sm leading-7 text-white/52">
              {resultSupport}
            </p>
          </div>

          {safeState.formError ? (
            <div className="rounded-[1rem] border border-[rgba(255,157,157,0.24)] bg-[rgba(80,20,20,0.22)] px-4 py-3 text-sm text-[rgba(255,216,216,0.94)]">
              {safeState.formError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SubmitButton disabled={!canCreateAssessment} label={submitLabel} />
            <ButtonLink href="/admin/assessments">Cancel</ButtonLink>
          </div>
        </form>
      </SurfaceCard>
    </div>
  );
}
