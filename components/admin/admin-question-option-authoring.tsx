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
  emptyAdminBulkQuestionAuthoringFormValues,
  emptyAdminBulkQuestionByDomainAuthoringFormValues,
  emptyAdminOptionAuthoringFormValues,
  emptyAdminQuestionAuthoringFormValues,
  initialAdminBulkQuestionAuthoringFormState,
  initialAdminBulkQuestionByDomainAuthoringFormState,
  initialAdminOptionAuthoringFormState,
  initialAdminQuestionAuthoringFormState,
  type AdminBulkQuestionAuthoringFormState,
  type AdminBulkQuestionByDomainAuthoringFormState,
  type AdminOptionAuthoringFormState,
  type AdminQuestionAuthoringFormState,
} from '@/lib/admin/admin-question-option-authoring';
import type {
  AdminAssessmentDetailQuestion,
  AdminAssessmentDetailQuestionDomain,
} from '@/lib/server/admin-assessment-detail';
import {
  createBulkQuestions,
  createBulkQuestionsByDomain,
  createOptionAction,
  createQuestionAction,
  duplicateQuestionAction,
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
      questionLines:
        state?.values?.questionLines ?? emptyAdminBulkQuestionAuthoringFormValues.questionLines,
      domainId: state?.values?.domainId ?? emptyAdminBulkQuestionAuthoringFormValues.domainId,
    },
    createdQuestions: state?.createdQuestions ?? [],
  };
}

function normalizeBulkQuestionByDomainState(
  state:
    | (AdminBulkQuestionByDomainAuthoringFormState & {
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
      questionLines:
        state?.values?.questionLines ??
        emptyAdminBulkQuestionByDomainAuthoringFormValues.questionLines,
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
  value,
  placeholder,
  error,
  minHeightClass = 'min-h-[112px]',
  onChange,
}: Readonly<{
  name: string;
  defaultValue?: string;
  value?: string;
  placeholder: string;
  error?: string;
  minHeightClass?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
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
      name={name}
      {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? '' })}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

function SelectInput({
  name,
  defaultValue,
  value,
  error,
  children,
  onChange,
}: Readonly<{
  name: string;
  defaultValue?: string;
  value?: string;
  error?: string;
  children: React.ReactNode;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}>) {
  return (
    <select
      className={cn(
        'sonartra-focus-ring min-h-11 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      name={name}
      {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? '' })}
      onChange={onChange}
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
  domains,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  domains: readonly AdminAssessmentDetailQuestionDomain[];
}) {
  const defaultDomainId = domains[0]?.domainId ?? '';
  const createBulkQuestionsFormAction = useMemo(
    () =>
      createBulkQuestions.bind(null, {
        assessmentKey,
        assessmentVersionId,
      }),
    [assessmentKey, assessmentVersionId],
  );
  const [state, formAction] = useActionState(createBulkQuestionsFormAction, {
    ...initialAdminBulkQuestionAuthoringFormState,
    values: {
      ...initialAdminBulkQuestionAuthoringFormState.values,
      domainId: defaultDomainId,
    },
  });
  const currentState = normalizeBulkQuestionState(state);
  const [selectedDomainId, setSelectedDomainId] = useState(
    currentState.values.domainId || defaultDomainId,
  );
  const [questionLines, setQuestionLines] = useState(
    currentState.values.questionLines,
  );

  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Bulk authoring</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Bulk paste questions
          </h3>
          <p className="max-w-2xl text-sm leading-7 text-white/62">
            Paste one question per line. All questions will be assigned to the selected domain.
          </p>
        </div>
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <Field
              error={currentState.fieldErrors.domainId}
              hint="Choose the domain for every imported question."
              label="Domain"
            >
              <SelectInput
                error={currentState.fieldErrors.domainId}
                name="domainId"
                onChange={(event) => {
                  const nextDomainId = event.currentTarget.value;
                  setSelectedDomainId(nextDomainId);
                }}
                value={selectedDomainId}
              >
                <option value="">Select a domain</option>
                {domains.map((domain) => (
                  <option key={domain.domainId} value={domain.domainId}>
                    {domain.label} ({formatDomainType(domain.domainType)})
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field
              error={currentState.fieldErrors.questionLines}
              hint="One question per line. Blank lines are ignored."
              label="Questions"
            >
              <TextArea
                error={currentState.fieldErrors.questionLines}
                minHeightClass="min-h-[220px]"
                name="questionLines"
                onChange={(event) => {
                  const nextQuestionLines = event.currentTarget.value;
                  setQuestionLines(nextQuestionLines);
                }}
                placeholder={[
                  'When starting a new initiative, what do you focus on first?',
                  'How do you usually approach a new process?',
                  'What matters most when work becomes ambiguous?',
                ].join('\n')}
                value={questionLines}
              />
            </Field>
          </div>

          <InlineError message={currentState.formError} />

          <div className="flex items-end justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-white/40">
              Each imported question gets the canonical A-D option scaffold.
            </p>
            <SubmitButton idleLabel="Import questions" pendingLabel="Importing..." />
          </div>
        </form>
        {currentState.createdQuestions.length > 0 ? (
          <div className="space-y-3 rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <p className="text-sm font-medium text-white">
              Imported {currentState.createdQuestions.length} question{currentState.createdQuestions.length === 1 ? '' : 's'} in this action.
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
function BulkQuestionByDomainForm({
  assessmentKey,
  assessmentVersionId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
}) {
  const createBulkQuestionsByDomainFormAction = useMemo(
    () =>
      createBulkQuestionsByDomain.bind(null, {
        assessmentKey,
        assessmentVersionId,
      }),
    [assessmentKey, assessmentVersionId],
  );
  const [state, formAction] = useActionState(createBulkQuestionsByDomainFormAction, {
    ...initialAdminBulkQuestionByDomainAuthoringFormState,
  });
  const currentState = normalizeBulkQuestionByDomainState(state);
  const [questionLines, setQuestionLines] = useState(currentState.values.questionLines);

  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Bulk authoring</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Bulk paste questions by domain
          </h3>
          <p className="max-w-2xl text-sm leading-7 text-white/62">
            Paste one question per line using: domain|question text. Domain can be either the
            domain key or the exact domain name.
          </p>
        </div>
        <form action={formAction} className="space-y-5">
          <Field
            error={currentState.fieldErrors.questionLines}
            hint="Blank lines are ignored. Each non-empty row must include one exact domain token and one question."
            label="Questions by domain"
          >
            <TextArea
              error={currentState.fieldErrors.questionLines}
              minHeightClass="min-h-[220px]"
              name="questionLines"
              onChange={(event) => {
                const nextQuestionLines = event.currentTarget.value;
                setQuestionLines(nextQuestionLines);
              }}
              placeholder={[
                'operating-style|When starting a new initiative, what do you focus on first?',
                'core-drivers|What tends to motivate your effort most?',
                'Leadership Approach|How do you naturally guide others in uncertain situations?',
              ].join('\n')}
              value={questionLines}
            />
          </Field>

          <InlineError message={currentState.formError} />

          <div className="flex items-end justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-white/40">
              Each imported question gets the canonical A-D option scaffold.
            </p>
            <SubmitButton idleLabel="Import questions" pendingLabel="Importing..." />
          </div>
        </form>
        {currentState.createdQuestions.length > 0 ? (
          <div className="space-y-3 rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <p className="text-sm font-medium text-white">
              Imported {currentState.createdQuestions.length} question{currentState.createdQuestions.length === 1 ? '' : 's'} in this action.
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
          <p className="sonartra-page-eyebrow">Add question</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Add a question
          </h3>
          <p className="max-w-2xl text-sm leading-7 text-white/62">
            Add a question and choose where it belongs.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
            <Field error={currentState.fieldErrors.prompt} hint="What people will see." label="Question">
              <TextArea
                defaultValue={currentState.values.prompt}
                error={currentState.fieldErrors.prompt}
                minHeightClass="min-h-[132px]"
                name="prompt"
                placeholder="I tend to make decisions quickly when the direction is clear."
              />
            </Field>
            <div className="space-y-5">
              <Field error={currentState.fieldErrors.key} hint="Use a short key." label="Question key">
                <TextInput
                  defaultValue={currentState.values.key}
                  error={currentState.fieldErrors.key}
                  name="key"
                  placeholder="decision-speed"
                />
              </Field>
              <Field error={currentState.fieldErrors.domainId} hint="Choose a domain." label="Domain">
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

function DuplicateQuestionForm({
  assessmentKey,
  assessmentVersionId,
  questionId,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  questionId: string;
}) {
  const [state, formAction] = useActionState(
    duplicateQuestionAction.bind(null, {
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
      <SubmitButton idleLabel="Duplicate question" pendingLabel="Duplicating..." variant="secondary" />
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
          <p className="sonartra-page-eyebrow">Add option</p>
          <p className="text-sm leading-7 text-white/58">
            Add response options for this question.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[160px_160px_minmax(0,1fr)]">
            <Field error={currentState.fieldErrors.key} hint="Use a short key." label="Option key">
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
            <Field error={currentState.fieldErrors.text} hint="What people will see." label="Option text">
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
            <div className="space-y-4">
              <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                <p className="sonartra-page-eyebrow">Duplicate question</p>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Copy this question, its response options, and scoring below this row.
                </p>
                <div className="mt-4">
                  <DuplicateQuestionForm
                    assessmentKey={assessmentKey}
                    assessmentVersionId={assessmentVersionId}
                    questionId={question.questionId}
                  />
                </div>
              </div>

              <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                <p className="sonartra-page-eyebrow">Delete question</p>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  This also removes its response options.
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
          </div>
        ) : (
          <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <p className="text-sm font-medium text-white">{question.prompt}</p>
            <p className="mt-2 text-sm leading-7 text-white/58">
              Edit this question&apos;s response options here.
            </p>
          </div>
        )}

        {showResponseControls ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="sonartra-page-eyebrow">Options</p>
              <p className="text-sm leading-7 text-white/58">
                Set the response options for this question.
              </p>
            </div>

            {question.options.length === 0 ? (
              <EmptyState
                className="p-4"
                description="Add options for this question."
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
                        Remove this option.
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
              {question.options.length} option{question.options.length === 1 ? '' : 's'} for this
              question. Open Responses to edit them.
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
            ? 'Add questions'
            : mode === 'responses'
              ? 'Set response options'
              : 'Add questions and response options'
        }
        description={
          mode === 'questions'
            ? 'Create the questions used in the assessment.'
            : mode === 'responses'
              ? 'Set the response options for each question.'
              : 'Add questions and set response options.'
        }
      />

      {domains.length === 0 ? (
        <EmptyState
          description="Add a domain before adding questions."
          title="No domains yet"
        />
      ) : (
        <>
          {showQuestionControls ? (
            <>
              <BulkQuestionForm
                assessmentKey={assessmentKey}
                assessmentVersionId={assessmentVersionId}
                domains={domains}
              />

              <BulkQuestionByDomainForm
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
                  ? 'Add questions before setting response options.'
                  : 'Add your first question.'
              }
              title="No questions yet"
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

