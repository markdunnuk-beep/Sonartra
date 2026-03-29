'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import {
  EmptyState,
  LabelPill,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import {
  emptyAdminBulkQuestionAuthoringFormValues,
  emptyAdminOptionAuthoringFormValues,
  emptyAdminQuestionAuthoringFormValues,
  initialAdminBulkQuestionAuthoringFormState,
  initialAdminOptionAuthoringFormState,
  initialAdminQuestionAuthoringFormState,
  type AdminBulkQuestionAuthoringFormState,
  type AdminOptionAuthoringFormState,
  type AdminQuestionAuthoringFormState,
} from '@/lib/admin/admin-question-option-authoring';
import type {
  AdminAssessmentDetailQuestion,
  AdminAssessmentDetailQuestionDomain,
} from '@/lib/server/admin-assessment-detail';
import {
  createBulkQuestions,
  createOptionAction,
  createQuestionAction,
  deleteOptionAction,
  deleteQuestionAction,
  updateOptionTextAction,
  updateQuestionTextAction,
  type InlineOptionTextUpdateResult,
  type InlineQuestionTextUpdateResult,
} from '@/lib/server/admin-question-option-authoring';

function normalizeQuestionState(
  state: AdminQuestionAuthoringFormState | null | undefined,
): AdminQuestionAuthoringFormState {
  return {
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      prompt: state?.values?.prompt ?? emptyAdminQuestionAuthoringFormValues.prompt,
      key: state?.values?.key ?? emptyAdminQuestionAuthoringFormValues.key,
      domainId: state?.values?.domainId ?? emptyAdminQuestionAuthoringFormValues.domainId,
    },
  };
}
function normalizeBulkQuestionState(
  state:
    | (AdminBulkQuestionAuthoringFormState & {
        createdQuestions?: readonly {
          questionId: string;
          domainId: string;
          assessmentVersionId: string;
          key: string;
          prompt: string;
          orderIndex: number;
          options: readonly {
            optionId: string;
            key: string;
            label: string;
            text: string;
            orderIndex: number;
          }[];
        }[];
      })
    | null
    | undefined,
) {
  return {
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      count: state?.values?.count ?? emptyAdminBulkQuestionAuthoringFormValues.count,
    },
    createdQuestions: state?.createdQuestions ?? [],
  };
}

function normalizeOptionState(
  state: AdminOptionAuthoringFormState | null | undefined,
): AdminOptionAuthoringFormState {
  return {
    formError: state?.formError ?? null,
    fieldErrors: state?.fieldErrors ?? {},
    values: {
      key: state?.values?.key ?? emptyAdminOptionAuthoringFormValues.key,
      label: state?.values?.label ?? emptyAdminOptionAuthoringFormValues.label,
      text: state?.values?.text ?? emptyAdminOptionAuthoringFormValues.text,
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
function NumberInput({
  name,
  defaultValue,
  min,
  max,
  error,
}: Readonly<{
  name: string;
  defaultValue: string;
  min: number;
  max: number;
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
      max={max}
      min={min}
      name={name}
      step={1}
      type="number"
    />
  );
}

function TextArea({
  name,
  defaultValue,
  placeholder,
  error,
  minHeightClass = 'min-h-[112px]',
}: Readonly<{
  name: string;
  defaultValue: string;
  placeholder: string;
  error?: string;
  minHeightClass?: string;
}>) {
  return (
    <textarea
      className={cn(
        'sonartra-focus-ring w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        minHeightClass,
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

function SelectInput({
  name,
  defaultValue,
  error,
  children,
}: Readonly<{
  name: string;
  defaultValue: string;
  error?: string;
  children: React.ReactNode;
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
      {children}
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
      multiline ? 'min-h-[104px] resize-y' : 'min-h-11',
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

function formatDomainType(domainType: 'QUESTION_SECTION' | 'SIGNAL_GROUP'): string {
  return domainType === 'QUESTION_SECTION' ? 'Question section' : 'Domain';
}

function BulkQuestionForm({
  assessmentKey,
  assessmentVersionId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
}) {
  const [state, formAction] = useActionState(
    createBulkQuestions.bind(null, {
      assessmentKey,
      assessmentVersionId,
    }),
    initialAdminBulkQuestionAuthoringFormState,
  );
  const currentState = normalizeBulkQuestionState(state);
  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Bulk generation</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Generate scaffolded questions in one pass
          </h3>
          <p className="max-w-2xl text-sm leading-7 text-white/62">
            This creates sequential question records plus default A-D options using the same deterministic keying rules as single-question creation.
          </p>
        </div>
        <form action={formAction} className="grid gap-4 lg:grid-cols-[220px_auto] lg:items-end">
          <Field error={currentState.fieldErrors.count} hint="Create 1 to 200 questions in one transaction." label="Question count">
            <NumberInput
              defaultValue={currentState.values.count}
              error={currentState.fieldErrors.count}
              max={200}
              min={1}
              name="count"
            />
          </Field>
          <div className="flex items-end">
            <SubmitButton idleLabel="Generate Questions" pendingLabel="Generating..." />
          </div>
        </form>
        <InlineError message={currentState.formError} />
        {currentState.createdQuestions.length > 0 ? (
          <div className="space-y-3 rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <p className="text-sm font-medium text-white">
              Added {currentState.createdQuestions.length} question{currentState.createdQuestions.length === 1 ? '' : 's'} in this action.
            </p>
            <div className="space-y-2 text-sm text-white/62">
              {currentState.createdQuestions.map((question) => (
                <div className="flex flex-wrap items-center gap-2" key={question.questionId}>
                  <LabelPill>{question.key}</LabelPill>
                  <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                    Question {question.orderIndex + 1}
                  </LabelPill>
                  <span>{question.options.map((option) => option.key).join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
function CreateQuestionForm({
  assessmentKey,
  assessmentVersionId,
  domains,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domains: readonly AdminAssessmentDetailQuestionDomain[];
}) {
  const [state, formAction] = useActionState(
    createQuestionAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
    }),
    {
      ...initialAdminQuestionAuthoringFormState,
      values: {
        ...initialAdminQuestionAuthoringFormState.values,
        domainId: domains[0]?.domainId ?? '',
      },
    },
  );
  const currentState = normalizeQuestionState(state);

  return (
    <SurfaceCard accent className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Create question</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Add a question to this draft version
          </h3>
          <p className="max-w-2xl text-sm leading-7 text-white/62">
            Questions are stored in explicit version order and linked directly to a persisted domain
            record so later weighting can attach to canonical option rows only.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
            <Field error={currentState.fieldErrors.prompt} hint="The assessment question shown to users." label="Prompt">
              <TextArea
                defaultValue={currentState.values.prompt}
                error={currentState.fieldErrors.prompt}
                minHeightClass="min-h-[132px]"
                name="prompt"
                placeholder="I tend to make decisions quickly when the direction is clear."
              />
            </Field>
            <div className="space-y-5">
              <Field error={currentState.fieldErrors.key} hint="Stable engine-facing key." label="Question key">
                <TextInput
                  defaultValue={currentState.values.key}
                  error={currentState.fieldErrors.key}
                  name="key"
                  placeholder="decision-speed"
                />
              </Field>
              <Field error={currentState.fieldErrors.domainId} hint="Version-scoped domain linkage." label="Question domain">
                <SelectInput defaultValue={currentState.values.domainId || domains[0]?.domainId || ''} error={currentState.fieldErrors.domainId} name="domainId">
                  <option value="">Select a domain</option>
                  {domains.map((domain) => (
                    <option key={domain.domainId} value={domain.domainId}>
                      {domain.label} ({formatDomainType(domain.domainType)})
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          </div>

          <InlineError message={currentState.formError} />

          <SubmitButton idleLabel="Add question" pendingLabel="Adding question..." />
        </form>
      </div>
    </SurfaceCard>
  );
}

function QuestionTextEditor({
  assessmentKey,
  assessmentVersionId,
  question,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  question: AdminAssessmentDetailQuestion;
}) {
  return (
    <InlineTextEditor
      emptyLabel="Question text"
      label="Question text"
      multiline
      onSave={async (nextValue) => {
        const result: InlineQuestionTextUpdateResult = await updateQuestionTextAction({
          assessmentKey,
          assessmentVersionId,
          questionId: question.questionId,
          prompt: nextValue,
        });

        return result.ok
          ? { ok: true, value: result.record.prompt }
          : { ok: false, error: result.error };
      }}
      placeholder="Enter question text"
      requiredMessage="Question text is required."
      value={question.prompt}
    />
  );
}

function DeleteQuestionForm({
  assessmentKey,
  assessmentVersionId,
  questionId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  questionId: string;
}) {
  const [state, formAction] = useActionState(
    deleteQuestionAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      questionId,
    }),
    initialAdminQuestionAuthoringFormState,
  );
  const currentState = normalizeQuestionState(state);

  return (
    <form action={formAction} className="space-y-3">
      <InlineError message={currentState.formError} />
      <SubmitButton idleLabel="Delete question" pendingLabel="Deleting..." variant="danger" />
    </form>
  );
}

function CreateOptionForm({
  assessmentKey,
  assessmentVersionId,
  questionId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  questionId: string;
}) {
  const [state, formAction] = useActionState(
    createOptionAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      questionId,
    }),
    initialAdminOptionAuthoringFormState,
  );
  const currentState = normalizeOptionState(state);

  return (
    <SurfaceCard className="p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="sonartra-page-eyebrow">Create option</p>
          <p className="text-sm leading-7 text-white/58">
            Options are persisted in explicit order inside this question and become the canonical
            targets for later signal weighting.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[160px_160px_minmax(0,1fr)]">
            <Field error={currentState.fieldErrors.key} hint="Stable option key." label="Option key">
              <TextInput
                defaultValue={currentState.values.key}
                error={currentState.fieldErrors.key}
                name="key"
                placeholder="strongly-agree"
              />
            </Field>
            <Field error={currentState.fieldErrors.label} hint="Optional short label." label="Label">
              <TextInput
                defaultValue={currentState.values.label}
                error={currentState.fieldErrors.label}
                name="label"
                placeholder="A"
              />
            </Field>
            <Field error={currentState.fieldErrors.text} hint="User-facing answer text." label="Option text">
              <TextInput
                defaultValue={currentState.values.text}
                error={currentState.fieldErrors.text}
                name="text"
                placeholder="Strongly agree"
              />
            </Field>
          </div>

          <InlineError message={currentState.formError} />

          <SubmitButton idleLabel="Add option" pendingLabel="Adding option..." />
        </form>
      </div>
    </SurfaceCard>
  );
}

function OptionTextEditor({
  assessmentKey,
  assessmentVersionId,
  questionId,
  option,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  questionId: string;
  option: AdminAssessmentDetailQuestion['options'][number];
}) {
  return (
    <div className="space-y-4 rounded-[1rem] border border-white/8 bg-black/10 p-4">
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
      </div>

      <InlineTextEditor
        emptyLabel="Option text"
        label="Option text"
        onSave={async (nextValue) => {
          const result: InlineOptionTextUpdateResult = await updateOptionTextAction({
            assessmentKey,
            assessmentVersionId,
            questionId,
            optionId: option.optionId,
            text: nextValue,
          });

          return result.ok
            ? { ok: true, value: result.record.optionText }
            : { ok: false, error: result.error };
        }}
        placeholder="Enter option text"
        requiredMessage="Option text is required."
        value={option.optionText}
      />
    </div>
  );
}

function DeleteOptionForm({
  assessmentKey,
  assessmentVersionId,
  questionId,
  optionId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  questionId: string;
  optionId: string;
}) {
  const [state, formAction] = useActionState(
    deleteOptionAction.bind(null, {
      assessmentKey,
      assessmentVersionId,
      questionId,
      optionId,
    }),
    initialAdminOptionAuthoringFormState,
  );
  const currentState = normalizeOptionState(state);

  return (
    <form action={formAction} className="space-y-3">
      <InlineError message={currentState.formError} />
      <SubmitButton idleLabel="Delete option" pendingLabel="Deleting..." variant="danger" />
    </form>
  );
}

function QuestionCard({
  assessmentKey,
  assessmentVersionId,
  question,
  showQuestionControls,
  showResponseControls,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  question: AdminAssessmentDetailQuestion;
  showQuestionControls: boolean;
  showResponseControls: boolean;
}) {
  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{question.questionKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Question {question.orderIndex + 1}
          </LabelPill>
          <LabelPill className="border-[rgba(142,162,255,0.22)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]">
            {question.domainLabel}
          </LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            {question.options.length} option{question.options.length === 1 ? '' : 's'}
          </LabelPill>
        </div>

        {showQuestionControls ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
            <QuestionTextEditor
              assessmentKey={assessmentKey}
              assessmentVersionId={assessmentVersionId}
              question={question}
            />
            <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
              <p className="sonartra-page-eyebrow">Delete question</p>
              <p className="mt-2 text-sm leading-7 text-white/58">
                Removing a question also removes its nested options from this draft version.
              </p>
              <div className="mt-4">
                <DeleteQuestionForm
                  assessmentKey={assessmentKey}
                  assessmentVersionId={assessmentVersionId}
                  questionId={question.questionId}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <p className="text-sm font-medium text-white">{question.prompt}</p>
            <p className="mt-2 text-sm leading-7 text-white/58">
              Response editing stays attached to this draft question only. Question-level duplication
              actions can be introduced here later without changing the current authoring model.
            </p>
          </div>
        )}

        {showResponseControls ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="sonartra-page-eyebrow">Options</p>
              <p className="text-sm leading-7 text-white/58">
                Options are persisted in explicit order under this question. Weighting is added in the
                next task only.
              </p>
            </div>

            {question.options.length === 0 ? (
              <EmptyState
                className="p-4"
                description="Add the first option so this question can be completed and later weighted."
                title="No options yet"
              />
            ) : (
              <div className="space-y-4">
                {question.options.map((option) => (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]" key={option.optionId}>
                    <OptionTextEditor
                      assessmentKey={assessmentKey}
                      assessmentVersionId={assessmentVersionId}
                      questionId={question.questionId}
                      option={option}
                    />
                    <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                      <p className="sonartra-page-eyebrow">Delete option</p>
                      <p className="mt-2 text-sm leading-7 text-white/58">
                        Remove this answer option from the current draft version.
                      </p>
                      <div className="mt-4">
                        <DeleteOptionForm
                          assessmentKey={assessmentKey}
                          assessmentVersionId={assessmentVersionId}
                          questionId={question.questionId}
                          optionId={option.optionId}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <CreateOptionForm
              assessmentKey={assessmentKey}
              assessmentVersionId={assessmentVersionId}
              questionId={question.questionId}
            />
          </div>
        ) : (
          <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <p className="sonartra-page-eyebrow">Responses</p>
            <p className="mt-2 text-sm leading-7 text-white/58">
              {question.options.length} option{question.options.length === 1 ? '' : 's'} authored for this
              question. Use the Responses section to edit answer text and option sets.
            </p>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

export function AdminQuestionOptionAuthoring({
  assessmentKey,
  assessmentVersionId,
  domains,
  questions,
  mode = 'all',
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domains: readonly AdminAssessmentDetailQuestionDomain[];
  questions: readonly AdminAssessmentDetailQuestion[];
  mode?: 'all' | 'questions' | 'responses';
}) {
  const showQuestionControls = mode !== 'responses';
  const showResponseControls = mode !== 'questions';

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow={
          mode === 'questions'
            ? 'Questions'
            : mode === 'responses'
              ? 'Responses'
              : 'Questions And Options'
        }
        title={
          mode === 'questions'
            ? 'Author the assessment question flow for this draft'
            : mode === 'responses'
              ? 'Author the response options for each question'
              : 'Author the assessment flow for this draft'
        }
        description={
          mode === 'questions'
            ? 'Create ordered questions, generate scaffolds in bulk, and edit prompts inline. Everything written here remains version-scoped and explicitly ordered in the canonical engine tables.'
            : mode === 'responses'
              ? 'Edit option text and manage per-question response sets only. Response rows remain version-scoped, explicitly ordered, and stored in the canonical engine tables used by the runtime.'
              : 'Create ordered questions and the answer options they contain. Everything written here is version-scoped, explicitly ordered, and stored in the canonical engine tables used by the runtime.'
        }
      />

      {domains.length === 0 ? (
        <EmptyState
          description="Question authoring requires at least one version-scoped domain. Create the structural domains for this draft before adding questions."
          title="No domains available for question linkage"
        />
      ) : (
        <>
          {showQuestionControls ? (
            <>
              <BulkQuestionForm
                assessmentKey={assessmentKey}
                assessmentVersionId={assessmentVersionId}
              />

              <CreateQuestionForm
                assessmentKey={assessmentKey}
                assessmentVersionId={assessmentVersionId}
                domains={domains}
              />
            </>
          ) : null}

          {questions.length === 0 ? (
            <EmptyState
              description={
                mode === 'responses'
                  ? 'Questions must exist before response options can be edited. Add the draft question flow first, then return here for option authoring.'
                  : 'Create the first question to start building the ordered assessment flow for this draft version.'
              }
              title={mode === 'responses' ? 'No questions available for responses' : 'No questions authored yet'}
            />
          ) : (
            <div className="space-y-4">
              {questions.map((question) => (
                <QuestionCard
                  assessmentKey={assessmentKey}
                  assessmentVersionId={assessmentVersionId}
                  key={question.questionId}
                  question={question}
                  showQuestionControls={showQuestionControls}
                  showResponseControls={showResponseControls}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

