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
  emptyAdminWeightingAuthoringFormValues,
  initialAdminWeightingAuthoringFormState,
  type AdminWeightingAuthoringFormState,
} from '@/lib/admin/admin-weighting-authoring';
import type {
  AdminAssessmentDetailAvailableSignal,
  AdminAssessmentDetailQuestion,
  AdminAssessmentDetailWeightingSummary,
} from '@/lib/server/admin-assessment-detail';
import {
  createOptionSignalWeightAction,
  deleteOptionSignalWeightAction,
  updateOptionSignalWeightAction,
} from '@/lib/server/admin-weighting-authoring';

function normalizeState(
  state: AdminWeightingAuthoringFormState | null | undefined,
): AdminWeightingAuthoringFormState {
  return {
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      signalId: state?.values?.signalId ?? emptyAdminWeightingAuthoringFormValues.signalId,
      weight: state?.values?.weight ?? emptyAdminWeightingAuthoringFormValues.weight,
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

function SelectInput({
  name,
  defaultValue,
  error,
  signals,
}: Readonly<{
  name: string;
  defaultValue: string;
  error?: string;
  signals: readonly AdminAssessmentDetailAvailableSignal[];
}>) {
  return (
    <select
      className={cn(
        'sonartra-focus-ring min-h-11 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      defaultValue={defaultValue}
      name={name}
    >
      <option value="">Select a signal</option>
      {signals.map((signal) => (
        <option key={signal.signalId} value={signal.signalId}>
          {signal.domainLabel} - {signal.signalLabel}
        </option>
      ))}
    </select>
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

function SummaryCard({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <SurfaceCard className="p-4">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</p>
    </SurfaceCard>
  );
}

function EditWeightForm({
  assessmentKey,
  assessmentVersionId,
  optionId,
  optionSignalWeightId,
  defaultSignalId,
  defaultWeight,
  signals,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  optionId: string;
  optionSignalWeightId: string;
  defaultSignalId: string;
  defaultWeight: string;
  signals: readonly AdminAssessmentDetailAvailableSignal[];
}) {
  const [state, formAction] = useActionState(
    updateOptionSignalWeightAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      optionId,
      optionSignalWeightId,
    }),
    {
      ...initialAdminWeightingAuthoringFormState,
      values: {
        signalId: defaultSignalId,
        weight: defaultWeight,
      },
    },
  );
  const currentState = normalizeState(state);

  return (
    <form action={formAction} className="space-y-4 rounded-[1rem] border border-white/8 bg-black/10 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
        <Field error={currentState.fieldErrors.signalId} hint="Choose a signal." label="Signal">
          <SelectInput
            defaultValue={currentState.values.signalId}
            error={currentState.fieldErrors.signalId}
            name="signalId"
            signals={signals}
          />
        </Field>
        <Field error={currentState.fieldErrors.weight} hint="Enter a number." label="Score">
          <TextInput
            defaultValue={currentState.values.weight}
            error={currentState.fieldErrors.weight}
            name="weight"
            placeholder="1.2500"
          />
        </Field>
      </div>

      <InlineError message={currentState.formError} />

      <div className="flex flex-wrap gap-3">
        <SubmitButton idleLabel="Save" pendingLabel="Saving..." />
      </div>
    </form>
  );
}

function DeleteWeightForm({
  assessmentKey,
  assessmentVersionId,
  optionId,
  optionSignalWeightId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  optionId: string;
  optionSignalWeightId: string;
}) {
  const [state, formAction] = useActionState(
    deleteOptionSignalWeightAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      optionId,
      optionSignalWeightId,
    }),
    initialAdminWeightingAuthoringFormState,
  );
  const currentState = normalizeState(state);

  return (
    <form action={formAction} className="space-y-3">
      <InlineError message={currentState.formError} />
      <SubmitButton idleLabel="Delete mapping" pendingLabel="Deleting..." variant="danger" />
    </form>
  );
}

function CreateWeightForm({
  assessmentKey,
  assessmentVersionId,
  optionId,
  signals,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  optionId: string;
  signals: readonly AdminAssessmentDetailAvailableSignal[];
}) {
  const [state, formAction] = useActionState(
    createOptionSignalWeightAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      optionId,
    }),
    {
      ...initialAdminWeightingAuthoringFormState,
      values: {
        ...initialAdminWeightingAuthoringFormState.values,
        signalId: signals[0]?.signalId ?? '',
      },
    },
  );
  const currentState = normalizeState(state);

  return (
    <SurfaceCard className="p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="sonartra-page-eyebrow">Add score</p>
          <p className="text-sm leading-7 text-white/58">
            Set how this response affects a signal.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
            <Field error={currentState.fieldErrors.signalId} hint="Choose a signal." label="Signal">
              <SelectInput
                defaultValue={currentState.values.signalId}
                error={currentState.fieldErrors.signalId}
                name="signalId"
                signals={signals}
              />
            </Field>
            <Field error={currentState.fieldErrors.weight} hint="Enter a number." label="Score">
              <TextInput
                defaultValue={currentState.values.weight}
                error={currentState.fieldErrors.weight}
                name="weight"
                placeholder="1.2500"
              />
            </Field>
          </div>

          <InlineError message={currentState.formError} />

          <SubmitButton idleLabel="Add score" pendingLabel="Adding..." />
        </form>
      </div>
    </SurfaceCard>
  );
}

function OptionWeightingCard({
  assessmentKey,
  assessmentVersionId,
  option,
  signals,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  option: AdminAssessmentDetailQuestion['options'][number];
  signals: readonly AdminAssessmentDetailAvailableSignal[];
}) {
  return (
    <SurfaceCard className="p-4">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{option.optionKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Option {option.orderIndex + 1}
          </LabelPill>
          {option.optionLabel ? (
            <LabelPill className="border-[rgba(142,162,255,0.22)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]">
              {option.optionLabel}
            </LabelPill>
          ) : null}
          <LabelPill
            className={
              option.weightingStatus === 'weighted'
                ? 'border-[rgba(118,206,153,0.24)] bg-[rgba(39,88,58,0.3)] text-[rgba(217,255,229,0.94)]'
                : 'border-[rgba(255,210,133,0.24)] bg-[rgba(90,58,20,0.28)] text-[rgba(255,232,185,0.95)]'
            }
          >
            {option.weightingStatus === 'weighted' ? 'Scored' : 'No scoring yet'}
          </LabelPill>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-white">{option.optionText}</p>
          <p className="text-sm leading-7 text-white/54">
            {option.signalWeights.length} score{option.signalWeights.length === 1 ? '' : 's'} set for this response.
          </p>
        </div>

        {option.signalWeights.length === 0 ? (
          <EmptyState
            className="p-4"
              description="Set how this response affects signals."
              title="No scoring yet"
          />
        ) : (
          <div className="space-y-4">
            {option.signalWeights.map((mapping) => (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]" key={mapping.optionSignalWeightId}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <LabelPill>{mapping.signalDomainLabel}</LabelPill>
                    <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                      {mapping.signalLabel}
                    </LabelPill>
                    <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                      Score {mapping.weight}
                    </LabelPill>
                  </div>
                  <EditWeightForm
                    assessmentKey={assessmentKey}
                    assessmentVersionId={assessmentVersionId}
                    defaultSignalId={mapping.signalId}
                    defaultWeight={mapping.weight}
                    optionId={option.optionId}
                    optionSignalWeightId={mapping.optionSignalWeightId}
                    signals={signals}
                  />
                </div>
                <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                  <p className="sonartra-page-eyebrow">Delete score</p>
                  <p className="mt-2 text-sm leading-7 text-white/58">
                    Remove this score from the current draft.
                  </p>
                  <div className="mt-4">
                    <DeleteWeightForm
                      assessmentKey={assessmentKey}
                      assessmentVersionId={assessmentVersionId}
                      optionId={option.optionId}
                      optionSignalWeightId={mapping.optionSignalWeightId}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateWeightForm
          assessmentKey={assessmentKey}
          assessmentVersionId={assessmentVersionId}
          optionId={option.optionId}
          signals={signals}
        />
      </div>
    </SurfaceCard>
  );
}

function QuestionWeightingCard({
  assessmentKey,
  assessmentVersionId,
  question,
  signals,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  question: AdminAssessmentDetailQuestion;
  signals: readonly AdminAssessmentDetailAvailableSignal[];
}) {
  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{question.questionKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Question {question.orderIndex + 1}
          </LabelPill>
          <LabelPill className="border-[rgba(142,162,255,0.22)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]">
            {question.domainLabel}
          </LabelPill>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{question.prompt}</h3>
          <p className="text-sm leading-7 text-white/58">
            Set how each response affects one or more signals.
          </p>
        </div>

        {question.options.length === 0 ? (
          <EmptyState
            className="p-4"
            description="Add response options before setting scoring."
            title="Add options"
          />
        ) : (
          <div className="space-y-4">
            {question.options.map((option) => (
              <OptionWeightingCard
                assessmentKey={assessmentKey}
                assessmentVersionId={assessmentVersionId}
                key={option.optionId}
                option={option}
                signals={signals}
              />
            ))}
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

export function AdminWeightingAuthoring({
  assessmentKey,
  assessmentVersionId,
  questions,
  availableSignals,
  weightingSummary,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  questions: readonly AdminAssessmentDetailQuestion[];
  availableSignals: readonly AdminAssessmentDetailAvailableSignal[];
  weightingSummary: AdminAssessmentDetailWeightingSummary;
}) {
  const optionsCount = questions.reduce((sum, question) => sum + question.options.length, 0);

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Response scoring"
        title="Set response scoring"
        description="Set how each response affects scoring."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Signals" value={String(availableSignals.length)} />
        <SummaryCard label="Options" value={String(weightingSummary.totalOptions)} />
        <SummaryCard label="Scored responses" value={String(weightingSummary.weightedOptions)} />
        <SummaryCard label="Unscored responses" value={String(weightingSummary.unmappedOptions)} />
      </div>

      {questions.length === 0 ? (
        <EmptyState
          description="Add questions and response options before setting scoring."
          title="No questions yet"
        />
      ) : optionsCount === 0 ? (
        <EmptyState
          description="Add options before setting scoring."
          title="Add options"
        />
      ) : availableSignals.length === 0 ? (
        <EmptyState
          description="Add signals before setting scoring."
          title="No signals yet"
        />
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <QuestionWeightingCard
              assessmentKey={assessmentKey}
              assessmentVersionId={assessmentVersionId}
              key={question.questionId}
              question={question}
              signals={availableSignals}
            />
          ))}
        </div>
      )}
    </section>
  );
}
