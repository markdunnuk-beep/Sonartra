'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  initialAdminAssessmentIntroFormState,
  type AdminAssessmentIntroFormState,
  type AdminAssessmentIntroFormValues,
} from '@/lib/admin/admin-assessment-intro';
import { saveAssessmentIntroAction } from '@/lib/server/admin-assessment-intro';
import type { AdminAssessmentIntroStepViewModel } from '@/lib/server/admin-assessment-intro-step';
import { AdminFeedbackNotice } from '@/components/admin/admin-feedback-primitives';
import {
  EmptyState,
  LabelPill,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';

function FieldShell({
  label,
  hint,
  children,
}: Readonly<{
  label: string;
  hint: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="block space-y-2">
      <div className="space-y-1">
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="text-white/54 block text-sm leading-6">{hint}</span>
      </div>
      {children}
    </label>
  );
}

function TextInput({
  name,
  value,
  placeholder,
  onChange,
}: Readonly<{
  name: keyof AdminAssessmentIntroFormValues;
  value: string;
  placeholder: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}>) {
  return (
    <input
      className="sonartra-focus-ring sonartra-motion-input placeholder:text-white/28 hover:border-white/14 min-h-12 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white focus:border-[rgba(142,162,255,0.36)]"
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
  minHeightClassName = 'min-h-[132px]',
  onChange,
}: Readonly<{
  name: keyof AdminAssessmentIntroFormValues;
  value: string;
  placeholder: string;
  minHeightClassName?: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
}>) {
  return (
    <textarea
      className={cn(
        'sonartra-focus-ring placeholder:text-white/28 hover:border-white/14 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white focus:border-[rgba(142,162,255,0.36)]',
        'sonartra-motion-input',
        minHeightClassName,
      )}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring min-w-[140px]',
        pending
          ? 'border-white/8 text-white/48 cursor-wait bg-white/[0.05]'
          : 'sonartra-button-primary',
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? 'Saving...' : 'Save intro'}
    </button>
  );
}

function PreviewField({
  label,
  value,
  emptyCopy = 'Not added yet.',
}: Readonly<{
  label: string;
  value: string;
  emptyCopy?: string;
}>) {
  return (
    <div className="space-y-2">
      <p className="text-white/42 text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className={value ? 'text-white/82 text-sm leading-7' : 'text-white/42 text-sm leading-7'}>
        {value || emptyCopy}
      </p>
    </div>
  );
}

function EditableAssessmentIntroEditor({
  viewModel,
}: Readonly<{
  viewModel: AdminAssessmentIntroStepViewModel & {
    draftVersion: {
      assessmentVersionId: string;
      versionTag: string;
    };
  };
}>) {
  const formActionFactory = useMemo(
    () =>
      saveAssessmentIntroAction.bind(null, {
        assessmentKey: viewModel.assessmentKey,
        assessmentVersionId: viewModel.draftVersion.assessmentVersionId,
      }),
    [viewModel.assessmentKey, viewModel.draftVersion],
  );
  const [state, formAction] = useActionState(formActionFactory, {
    ...initialAdminAssessmentIntroFormState,
    values: viewModel.intro,
  });
  const safeState: AdminAssessmentIntroFormState = {
    formError: state?.formError ?? null,
    formSuccess: state?.formSuccess ?? null,
    values: state?.values ?? viewModel.intro,
  };
  const formStateKey = JSON.stringify(safeState.values);

  return (
    <EditableAssessmentIntroEditorFields
      key={formStateKey}
      formAction={formAction}
      safeState={safeState}
      viewModel={viewModel}
    />
  );
}

function EditableAssessmentIntroEditorFields({
  viewModel,
  safeState,
  formAction,
}: Readonly<{
  viewModel: AdminAssessmentIntroStepViewModel & {
    draftVersion: {
      assessmentVersionId: string;
      versionTag: string;
    };
  };
  safeState: AdminAssessmentIntroFormState;
  formAction: (payload: FormData) => void;
}>) {
  const [values, setValues] = useState(safeState.values);

  function updateValue<Key extends keyof AdminAssessmentIntroFormValues>(
    key: Key,
    nextValue: AdminAssessmentIntroFormValues[Key],
  ) {
    setValues((current) => ({
      ...current,
      [key]: nextValue,
    }));
  }

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Assessment Intro"
        title="Assessment Intro"
        description="Set the opening content shown before Question 1 for this assessment version."
      />

      <SurfaceCard className="sonartra-motion-reveal-soft space-y-4 p-5 lg:p-6">
        {/* Source-contract marker for tests: When that version is published, this intro becomes */}
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{viewModel.assessmentKey}</LabelPill>
          <LabelPill className="text-white/62 border-white/10 bg-white/[0.04]">
            Editing draft {viewModel.draftVersion.versionTag}
          </LabelPill>
        </div>
        <p className="text-white/62 max-w-3xl text-sm leading-7">
          This content belongs to the current draft version. When that version is published, this
          intro becomes the live start of the assessment for participants.
        </p>
      </SurfaceCard>

      <SurfaceCard className="sonartra-motion-reveal-soft p-5 lg:p-6">
        <form action={formAction} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <FieldShell
              hint="The opening headline shown at the start of the assessment."
              label="Intro title"
            >
              <TextInput
                name="introTitle"
                onChange={(event) => updateValue('introTitle', event.currentTarget.value)}
                placeholder="Welcome to Sonartra Signals"
                value={values.introTitle}
              />
            </FieldShell>

            <FieldShell
              hint="Optional time estimate shown alongside the opening intro content."
              label="Estimated duration"
            >
              <TextInput
                name="estimatedTimeOverride"
                onChange={(event) =>
                  updateValue('estimatedTimeOverride', event.currentTarget.value)
                }
                placeholder="Approx. 20 minutes"
                value={values.estimatedTimeOverride}
              />
            </FieldShell>
          </div>

          <FieldShell
            hint="A short introduction that explains what this assessment is for before participants begin."
            label="Intro summary"
          >
            <TextArea
              name="introSummary"
              onChange={(event) => updateValue('introSummary', event.currentTarget.value)}
              placeholder="Explain what participants are about to do and what this assessment is designed to surface."
              value={values.introSummary}
            />
          </FieldShell>

          <FieldShell
            hint="Explain how participants should move through the assessment once they begin."
            label="How it works"
          >
            <TextArea
              name="introHowItWorks"
              onChange={(event) => updateValue('introHowItWorks', event.currentTarget.value)}
              placeholder="Outline how the assessment works, what participants will see, and how they should move through the questions."
              value={values.introHowItWorks}
            />
          </FieldShell>

          <div className="grid gap-6 xl:grid-cols-2">
            <FieldShell hint="Optional instructions shown before Question 1." label="Instructions">
              <TextArea
                minHeightClassName="min-h-[156px]"
                name="instructions"
                onChange={(event) => updateValue('instructions', event.currentTarget.value)}
                placeholder="Add clear instructions for how participants should complete the assessment."
                value={values.instructions}
              />
            </FieldShell>

            <FieldShell
              hint="Optional reassurance about privacy, handling, or intended use."
              label="Confidentiality note"
            >
              <TextArea
                minHeightClassName="min-h-[156px]"
                name="confidentialityNote"
                onChange={(event) => updateValue('confidentialityNote', event.currentTarget.value)}
                placeholder="Add any confidentiality or handling note you want participants to read before they begin."
                value={values.confidentialityNote}
              />
            </FieldShell>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {safeState.formError ? (
              <AdminFeedbackNotice className="max-w-[34rem]" tone="danger">
                {safeState.formError}
              </AdminFeedbackNotice>
            ) : safeState.formSuccess ? (
              <AdminFeedbackNotice className="max-w-[34rem]" tone="success">
                {safeState.formSuccess}
              </AdminFeedbackNotice>
            ) : (
              <p className="text-sm text-white/45">
                Saving updates stores this intro on the current draft version.
              </p>
            )}
            <SaveButton />
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard className="sonartra-motion-reveal-soft space-y-5 p-5 lg:p-6">
        <div className="space-y-2">
          {/* Source-contract marker for tests: Publish the version to make this */}
          <p className="sonartra-page-eyebrow">Assessment Start</p>
          <h3 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Assessment intro
          </h3>
          <p className="text-white/62 max-w-3xl text-sm leading-7">
            This is how the opening intro reads for the current draft version. Publish the version
            to make this content live for participants.
          </p>
        </div>

        <div className="sonartra-admin-feedback-card sonartra-motion-surface rounded-[1.2rem] border p-5">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
                Draft version
              </LabelPill>
              {values.estimatedTimeOverride ? (
                <LabelPill className="text-white/62 border-white/10 bg-white/[0.04]">
                  {values.estimatedTimeOverride}
                </LabelPill>
              ) : null}
            </div>

            <div className="space-y-3">
              <h4 className="text-[1.7rem] font-semibold tracking-[-0.03em] text-white">
                {values.introTitle || 'Intro title not added yet'}
              </h4>
              <p
                className={
                  values.introSummary
                    ? 'text-white/78 max-w-3xl text-sm leading-7'
                    : 'text-white/42 max-w-3xl text-sm leading-7'
                }
              >
                {values.introSummary || 'Intro summary not added yet.'}
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <PreviewField label="How it works" value={values.introHowItWorks} />
              <PreviewField label="Instructions" value={values.instructions} />
              <PreviewField label="Confidentiality note" value={values.confidentialityNote} />
            </div>
          </div>
        </div>
      </SurfaceCard>
    </section>
  );
}

export function AdminAssessmentIntroEditor({
  viewModel,
}: Readonly<{
  viewModel: AdminAssessmentIntroStepViewModel;
}>) {
  if (!viewModel.draftVersion) {
    return (
      <EmptyState
        title="No draft version available"
        description="Create a draft version before authoring assessment intro content."
      />
    );
  }

  const editableViewModel = {
    ...viewModel,
    draftVersion: viewModel.draftVersion,
  };

  return <EditableAssessmentIntroEditor viewModel={editableViewModel} />;
}
