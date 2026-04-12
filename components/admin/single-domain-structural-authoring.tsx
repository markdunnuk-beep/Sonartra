'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { AdminPublishedNoDraftStageState } from '@/components/admin/admin-assessment-draft-state';
import { SingleDomainWeightGrid } from '@/components/admin/single-domain-weight-grid';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import {
  EmptyState,
  LabelPill,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import {
  buildSingleDomainStructuralValidation,
  buildSingleDomainLanguageValidation,
  getExpectedSignalPairCount,
} from '@/lib/admin/single-domain-structural-validation';
import {
  buildSingleDomainCreateDomainValues,
  buildSingleDomainCreateSignalValues,
} from '@/lib/admin/single-domain-safe-authoring';
import {
  initialAdminAuthoringFormState,
} from '@/lib/admin/admin-domain-signal-authoring';
import {
  initialAdminOptionAuthoringFormState,
  initialAdminQuestionAuthoringFormState,
} from '@/lib/admin/admin-question-option-authoring';
import {
  initialSingleDomainQuestionImportState,
} from '@/lib/admin/single-domain-question-import';
import {
  createSingleDomainDomainAction,
  importSingleDomainQuestionsAction,
  createSingleDomainOptionAction,
  createSingleDomainQuestionAction,
  createSingleDomainSignalAction,
  deleteSingleDomainOptionAction,
  deleteSingleDomainQuestionAction,
  deleteSingleDomainSignalAction,
  updateSingleDomainDomainAction,
  updateSingleDomainOptionAction,
  updateSingleDomainQuestionAction,
  updateSingleDomainSignalAction,
} from '@/lib/server/admin-single-domain-structural-authoring';
import { slugifyDomainKey } from '@/lib/utils/domain-key';
import { slugifySignalKey } from '@/lib/utils/signal-key';
import { useSingleDomainDirtyField, useSingleDomainDirtyForm } from '@/components/admin/single-domain-unsaved-changes';

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

function Field({
  htmlFor,
  label,
  hint,
  error,
  children,
}: Readonly<{
  htmlFor: string;
  label: string;
  hint: string;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-white" htmlFor={htmlFor}>
          {label}
        </label>
        <span className="block text-sm leading-6 text-white/54" id={`${htmlFor}-hint`}>
          {hint}
        </span>
      </div>
      {children}
      {error ? (
        <p className="text-sm text-[rgba(255,198,198,0.92)]" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Input({
  id,
  name,
  defaultValue,
  value,
  placeholder,
  error,
  readOnly = false,
  onChange,
}: Readonly<{
  id: string;
  name: string;
  defaultValue?: string;
  value?: string;
  placeholder: string;
  error?: string;
  readOnly?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}>) {
  const controlledProps = value !== undefined ? { value } : { defaultValue: defaultValue ?? '' };

  return (
    <input
      className={cn(
        'sonartra-focus-ring min-h-11 w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : readOnly
            ? 'border-white/10 text-white/68'
            : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      id={id}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      type="text"
      {...controlledProps}
    />
  );
}

function TextArea({
  id,
  name,
  defaultValue,
  value,
  placeholder,
  error,
  minHeightClass = 'min-h-[112px]',
  onChange,
}: Readonly<{
  id: string;
  name: string;
  defaultValue?: string;
  value?: string;
  placeholder: string;
  error?: string;
  minHeightClass?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}>) {
  const controlledProps = value !== undefined ? { value } : { defaultValue: defaultValue ?? '' };

  return (
    <textarea
      className={cn(
        'sonartra-focus-ring w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
        minHeightClass,
        error
          ? 'border-[rgba(255,157,157,0.32)]'
          : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
      )}
      id={id}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      {...controlledProps}
    />
  );
}

function CanonicalKeyField({
  htmlFor,
  label,
  hint,
  value,
  hiddenFieldName = 'key',
}: Readonly<{
  htmlFor: string;
  label: string;
  hint: string;
  value: string;
  hiddenFieldName?: string;
}>) {
  return (
    <>
      <input name={hiddenFieldName} type="hidden" value={value} />
      <Field hint={hint} htmlFor={htmlFor} label={label}>
        <Input
          id={htmlFor}
          name={`${hiddenFieldName}-preview`}
          placeholder="Generated from the label"
          readOnly
          value={value}
        />
      </Field>
    </>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: Readonly<{
  label: string;
  value: string;
  detail: string;
}>) {
  return (
    <SurfaceCard className="p-4">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/56">{detail}</p>
    </SurfaceCard>
  );
}

function getStatusPillClass(status: 'ready' | 'attention' | 'waiting' | 'not_started') {
  if (status === 'ready') {
    return 'border-[rgba(151,233,182,0.22)] bg-[rgba(16,61,34,0.26)] text-[rgba(217,255,229,0.94)]';
  }

  if (status === 'waiting') {
    return 'border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] text-[rgba(255,234,196,0.94)]';
  }

  if (status === 'not_started') {
    return 'border-white/10 bg-white/[0.04] text-white/68';
  }

  return 'border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] text-[rgba(255,234,196,0.94)]';
}

function getStatusLabel(status: 'ready' | 'attention' | 'waiting' | 'not_started') {
  if (status === 'ready') {
    return 'Ready';
  }
  if (status === 'waiting') {
    return 'Waiting';
  }
  if (status === 'not_started') {
    return 'Not started';
  }
  return 'Attention';
}

function renderMissingDraftState(
  assessmentKey: string,
  builderMode: 'draft' | 'published_no_draft' | 'setup',
  publishedVersionTag: string | null,
  title: string,
  description: string,
) {
  if (builderMode === 'published_no_draft') {
    return (
      <AdminPublishedNoDraftStageState
        assessmentKey={assessmentKey}
        description={description}
        publishedVersionTag={publishedVersionTag}
        title={title}
      />
    );
  }

  return (
    <EmptyState
      description="Create a draft version to continue authoring."
      title="No draft version available"
    />
  );
}

function DomainForm() {
  const assessment = useAdminAssessmentAuthoring();
  const draftVersionId = assessment.latestDraftVersion?.assessmentVersionId;
  const domain = assessment.authoredDomains[0] ?? null;
  const action = useMemo(
    () =>
      (domain
        ? updateSingleDomainDomainAction
        : createSingleDomainDomainAction
      ).bind(null, {
        assessmentKey: assessment.assessmentKey,
        assessmentVersionId: draftVersionId ?? '',
        domainId: domain?.domainId,
      }),
    [assessment.assessmentKey, draftVersionId, domain],
  );
  const [state, formAction] = useActionState(action, initialAdminAuthoringFormState);
  const {
    formRef,
    onChange: handleDirtyChange,
    onInput: handleDirtyInput,
    onSubmit: handleDirtySubmit,
  } = useSingleDomainDirtyForm({ state });
  const [labelDraft, setLabelDraft] = useState(domain?.label ?? state.values.label);
  const [descriptionDraft, setDescriptionDraft] = useState(domain?.description ?? state.values.description);
  const generatedKey = domain
    ? domain.domainKey
    : buildSingleDomainCreateDomainValues({
        label: labelDraft,
        key: '',
        description: descriptionDraft,
      }).key;

  return (
    <SurfaceCard className="p-5 lg:p-6">
      <form
        action={formAction}
        className="space-y-5"
        onChange={handleDirtyChange}
        onInput={handleDirtyInput}
        onSubmit={handleDirtySubmit}
        ref={formRef}
      >
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>One domain only</LabelPill>
          {domain ? (
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              {domain.domainKey}
            </LabelPill>
          ) : null}
        </div>
        <Field
          error={state.fieldErrors.label}
          hint="This label anchors the full single-domain report."
          htmlFor="single-domain-label"
          label="Domain label"
        >
          <Input
            error={state.fieldErrors.label}
            id="single-domain-label"
            name="label"
            onChange={(event) => setLabelDraft(event.currentTarget.value)}
            placeholder="Leadership style"
            value={labelDraft}
          />
        </Field>
        <CanonicalKeyField
          hint={domain
            ? 'This canonical key is locked after creation so downstream references stay stable.'
            : 'The canonical key will be generated from the label when the domain is created.'}
          htmlFor="single-domain-key"
          label="Domain key"
          value={generatedKey}
        />
        <Field
          error={state.fieldErrors.description}
          hint="Optional structural context for admins. This does not create output language."
          htmlFor="single-domain-description"
          label="Description"
        >
          <TextArea
            error={state.fieldErrors.description}
            id="single-domain-description"
            minHeightClass="min-h-[120px]"
            name="description"
            onChange={(event) => setDescriptionDraft(event.currentTarget.value)}
            placeholder="What this domain covers."
            value={descriptionDraft}
          />
        </Field>
        <InlineError message={state.formError} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-white/54">
            {domain
              ? 'Edit the one allowed domain. Additional domain creation is blocked server-side.'
              : 'Create the one allowed domain for this builder.'}
          </p>
          <SubmitButton
            idleLabel={domain ? 'Update domain' : 'Create domain'}
            pendingLabel={domain ? 'Saving...' : 'Creating...'}
          />
        </div>
      </form>
    </SurfaceCard>
  );
}

function SignalCard({
  domainId,
  signal,
}: Readonly<{
  domainId: string;
  signal: ReturnType<typeof useAdminAssessmentAuthoring>['authoredDomains'][number]['signals'][number];
}>) {
  const assessment = useAdminAssessmentAuthoring();
  const draftVersionId = assessment.latestDraftVersion?.assessmentVersionId ?? '';
  const updateAction = useMemo(
    () =>
      updateSingleDomainSignalAction.bind(null, {
        assessmentKey: assessment.assessmentKey,
        assessmentVersionId: draftVersionId,
        domainId,
        signalId: signal.signalId,
      }),
    [assessment.assessmentKey, domainId, draftVersionId, signal.signalId],
  );
  const deleteAction = useMemo(
    () =>
      deleteSingleDomainSignalAction.bind(null, {
        assessmentKey: assessment.assessmentKey,
        assessmentVersionId: draftVersionId,
        domainId,
        signalId: signal.signalId,
      }),
    [assessment.assessmentKey, domainId, draftVersionId, signal.signalId],
  );
  const [updateState, updateFormAction] = useActionState(updateAction, initialAdminAuthoringFormState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialAdminAuthoringFormState);
  const {
    formRef,
    onChange: handleDirtyChange,
    onInput: handleDirtyInput,
    onSubmit: handleDirtySubmit,
  } = useSingleDomainDirtyForm({ state: updateState });

  return (
    <SurfaceCard className="p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{signal.signalKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Order {signal.orderIndex + 1}
          </LabelPill>
        </div>
        <form
          action={updateFormAction}
          className="space-y-4"
          onChange={handleDirtyChange}
          onInput={handleDirtyInput}
          onSubmit={handleDirtySubmit}
          ref={formRef}
        >
          <Field
            error={updateState.fieldErrors.label}
            hint="Signal count stays flexible here."
            htmlFor={`signal-label-${signal.signalId}`}
            label="Signal label"
          >
            <Input
              defaultValue={signal.label}
              error={updateState.fieldErrors.label}
              id={`signal-label-${signal.signalId}`}
              name="label"
              placeholder="Directive"
            />
          </Field>
          <CanonicalKeyField
            hint="This canonical key is locked after creation so language and runtime references stay stable."
            htmlFor={`signal-key-${signal.signalId}`}
            label="Signal key"
            value={signal.signalKey}
          />
          <Field
            error={updateState.fieldErrors.description}
            hint="Optional internal description."
            htmlFor={`signal-description-${signal.signalId}`}
            label="Description"
          >
            <TextArea
              defaultValue={signal.description ?? ''}
              error={updateState.fieldErrors.description}
              id={`signal-description-${signal.signalId}`}
              name="description"
              placeholder="How this signal should be interpreted."
            />
          </Field>
          <InlineError message={updateState.formError} />
          <div className="flex justify-end">
            <SubmitButton idleLabel="Update signal" pendingLabel="Saving..." />
          </div>
        </form>
        <form action={deleteFormAction} className="space-y-3 border-t border-white/8 pt-4">
          <InlineError message={deleteState.formError} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-white/54">
              Deleting a signal can leave structural gaps in existing weights. The review step will
              surface them explicitly.
            </p>
            <SubmitButton idleLabel="Delete signal" pendingLabel="Deleting..." variant="danger" />
          </div>
        </form>
      </div>
    </SurfaceCard>
  );
}

function QuestionCard({
  question,
  domainId,
}: Readonly<{
  question: ReturnType<typeof useAdminAssessmentAuthoring>['authoredQuestions'][number];
  domainId: string;
}>) {
  const assessment = useAdminAssessmentAuthoring();
  const draftVersionId = assessment.latestDraftVersion?.assessmentVersionId ?? '';
  const updateAction = useMemo(
    () =>
      updateSingleDomainQuestionAction.bind(null, {
        assessmentKey: assessment.assessmentKey,
        assessmentVersionId: draftVersionId,
        questionId: question.questionId,
      }),
    [assessment.assessmentKey, draftVersionId, question.questionId],
  );
  const deleteAction = useMemo(
    () =>
      deleteSingleDomainQuestionAction.bind(null, {
        assessmentKey: assessment.assessmentKey,
        assessmentVersionId: draftVersionId,
        questionId: question.questionId,
      }),
    [assessment.assessmentKey, draftVersionId, question.questionId],
  );
  const [updateState, updateFormAction] = useActionState(updateAction, initialAdminQuestionAuthoringFormState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialAdminQuestionAuthoringFormState);
  const {
    formRef,
    onChange: handleDirtyChange,
    onInput: handleDirtyInput,
    onSubmit: handleDirtySubmit,
  } = useSingleDomainDirtyForm({ state: updateState });

  return (
    <SurfaceCard className="p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{question.questionKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Question {question.orderIndex + 1}
          </LabelPill>
          <LabelPill className="border-[rgba(142,162,255,0.22)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]">
            {question.options.length} option{question.options.length === 1 ? '' : 's'}
          </LabelPill>
        </div>
        <form
          action={updateFormAction}
          className="space-y-4"
          onChange={handleDirtyChange}
          onInput={handleDirtyInput}
          onSubmit={handleDirtySubmit}
          ref={formRef}
        >
          <input name="domainId" type="hidden" value={domainId} />
          <Field
            error={updateState.fieldErrors.prompt}
            hint="Ordering is deterministic and append-only by authored sequence."
            htmlFor={`question-prompt-${question.questionId}`}
            label="Question text"
          >
            <TextArea
              defaultValue={question.prompt}
              error={updateState.fieldErrors.prompt}
              id={`question-prompt-${question.questionId}`}
              minHeightClass="min-h-[120px]"
              name="prompt"
              placeholder="What does this question ask?"
            />
          </Field>
          <InlineError message={updateState.formError} />
          <div className="flex justify-end">
            <SubmitButton idleLabel="Update question" pendingLabel="Saving..." />
          </div>
        </form>
        <form action={deleteFormAction} className="space-y-3 border-t border-white/8 pt-4">
          <InlineError message={deleteState.formError} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-white/54">
              Deleting a question also removes its options and weight rows.
            </p>
            <SubmitButton idleLabel="Delete question" pendingLabel="Deleting..." variant="danger" />
          </div>
        </form>
      </div>
    </SurfaceCard>
  );
}

function OptionCard({
  question,
  option,
}: Readonly<{
  question: ReturnType<typeof useAdminAssessmentAuthoring>['authoredQuestions'][number];
  option: ReturnType<typeof useAdminAssessmentAuthoring>['authoredQuestions'][number]['options'][number];
}>) {
  const assessment = useAdminAssessmentAuthoring();
  const draftVersionId = assessment.latestDraftVersion?.assessmentVersionId ?? '';
  const updateAction = useMemo(
    () =>
      updateSingleDomainOptionAction.bind(null, {
        assessmentKey: assessment.assessmentKey,
        assessmentVersionId: draftVersionId,
        questionId: question.questionId,
        optionId: option.optionId,
      }),
    [assessment.assessmentKey, draftVersionId, option.optionId, question.questionId],
  );
  const deleteAction = useMemo(
    () =>
      deleteSingleDomainOptionAction.bind(null, {
        assessmentKey: assessment.assessmentKey,
        assessmentVersionId: draftVersionId,
        questionId: question.questionId,
        optionId: option.optionId,
      }),
    [assessment.assessmentKey, draftVersionId, option.optionId, question.questionId],
  );
  const [updateState, updateFormAction] = useActionState(updateAction, initialAdminOptionAuthoringFormState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialAdminOptionAuthoringFormState);
  const {
    formRef,
    onChange: handleDirtyChange,
    onInput: handleDirtyInput,
    onSubmit: handleDirtySubmit,
  } = useSingleDomainDirtyForm({ state: updateState });

  return (
    <SurfaceCard className="p-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{option.optionKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            {option.optionLabel?.trim() || String.fromCharCode(65 + option.orderIndex)}
          </LabelPill>
        </div>
        <form
          action={updateFormAction}
          className="space-y-4"
          onChange={handleDirtyChange}
          onInput={handleDirtyInput}
          onSubmit={handleDirtySubmit}
          ref={formRef}
        >
          <input name="label" type="hidden" value={option.optionLabel ?? ''} />
          <Field
            error={updateState.fieldErrors.text}
            hint="Option labels stay in their current ordering convention."
            htmlFor={`option-text-${option.optionId}`}
            label="Option text"
          >
            <Input
              defaultValue={option.optionText}
              error={updateState.fieldErrors.text}
              id={`option-text-${option.optionId}`}
              name="text"
              placeholder="Strongly agree"
            />
          </Field>
          <InlineError message={updateState.formError} />
          <div className="flex justify-end">
            <SubmitButton idleLabel="Update option" pendingLabel="Saving..." />
          </div>
        </form>
        <form action={deleteFormAction} className="space-y-3 border-t border-white/8 pt-4">
          <InlineError message={deleteState.formError} />
          <div className="flex justify-end">
            <SubmitButton idleLabel="Delete option" pendingLabel="Deleting..." variant="danger" />
          </div>
        </form>
      </div>
    </SurfaceCard>
  );
}

function ResponsesQuestionCard({
  question,
  assessmentKey,
  assessmentVersionId,
}: Readonly<{
  question: ReturnType<typeof useAdminAssessmentAuthoring>['authoredQuestions'][number];
  assessmentKey: string;
  assessmentVersionId: string;
}>) {
  const createAction = useMemo(
    () =>
      createSingleDomainOptionAction.bind(null, {
        assessmentKey,
        assessmentVersionId,
        questionId: question.questionId,
      }),
    [assessmentKey, assessmentVersionId, question.questionId],
  );
  const [createState, createFormAction] = useActionState(
    createAction,
    initialAdminOptionAuthoringFormState,
  );
  const {
    formRef,
    onChange: handleDirtyChange,
    onInput: handleDirtyInput,
    onSubmit: handleDirtySubmit,
  } = useSingleDomainDirtyForm({ state: createState });

  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{question.questionKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Question {question.orderIndex + 1}
          </LabelPill>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{question.prompt}</h3>
          <p className="text-sm leading-7 text-white/56">
            Each question must keep at least one option. Options belong to real questions only.
          </p>
        </div>
        <form
          action={createFormAction}
          className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_auto]"
          onChange={handleDirtyChange}
          onInput={handleDirtyInput}
          onSubmit={handleDirtySubmit}
          ref={formRef}
        >
          <Field
            error={createState.fieldErrors.label}
            hint="Optional letter label."
            htmlFor={`create-option-label-${question.questionId}`}
            label="Label"
          >
            <Input
              defaultValue={createState.values.label}
              error={createState.fieldErrors.label}
              id={`create-option-label-${question.questionId}`}
              name="label"
              placeholder="A"
            />
          </Field>
          <Field
            error={createState.fieldErrors.text}
            hint="Author a response option for this question."
            htmlFor={`create-option-text-${question.questionId}`}
            label="Option text"
          >
            <Input
              defaultValue={createState.values.text}
              error={createState.fieldErrors.text}
              id={`create-option-text-${question.questionId}`}
              name="text"
              placeholder="Strongly agree"
            />
          </Field>
          <div className="flex items-end">
            <SubmitButton idleLabel="Add option" pendingLabel="Creating..." />
          </div>
          <div className="lg:col-span-3">
            <InlineError message={createState.formError} />
          </div>
        </form>
        {question.options.length === 0 ? (
          <EmptyState description="Add the first option for this question." title="No options yet" />
        ) : (
          <div className="space-y-4">
            {question.options.map((option) => (
              <OptionCard key={option.optionId} option={option} question={question} />
            ))}
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

export function SingleDomainDomainAuthoring() {
  const assessment = useAdminAssessmentAuthoring();

  if (!assessment.latestDraftVersion) {
    return renderMissingDraftState(
      assessment.assessmentKey,
      assessment.builderMode,
      assessment.publishedVersion?.versionTag ?? null,
      'Domain is currently read-only',
      'You are browsing the stable published assessment. Create a draft version to edit the single-domain structure for the next release.',
    );
  }

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Domain"
        title="Author the single domain"
        description="Create the one allowed domain or update the existing one. This builder never permits a second domain."
      />
      <DomainForm />
    </section>
  );
}

export function SingleDomainSignalsAuthoring() {
  const assessment = useAdminAssessmentAuthoring();
  const domain = assessment.authoredDomains[0] ?? null;
  const draftVersionId = assessment.latestDraftVersion?.assessmentVersionId ?? '';
  const pairCount = getExpectedSignalPairCount(domain?.signals.length ?? 0);
  const createAction = useMemo(
    () =>
      createSingleDomainSignalAction.bind(null, {
        assessmentKey: assessment.assessmentKey,
        assessmentVersionId: draftVersionId,
        domainId: domain?.domainId,
      }),
    [assessment.assessmentKey, draftVersionId, domain?.domainId],
  );
  const [createState, createFormAction] = useActionState(createAction, initialAdminAuthoringFormState);
  const {
    formRef,
    onChange: handleDirtyChange,
    onInput: handleDirtyInput,
    onSubmit: handleDirtySubmit,
  } = useSingleDomainDirtyForm({ state: createState });
  const [labelDraft, setLabelDraft] = useState(createState.values.label);
  const [descriptionDraft, setDescriptionDraft] = useState(createState.values.description);
  const generatedSignalKey = buildSingleDomainCreateSignalValues({
    label: labelDraft,
    key: '',
    description: descriptionDraft,
  }).key;

  if (!assessment.latestDraftVersion) {
    return renderMissingDraftState(
      assessment.assessmentKey,
      assessment.builderMode,
      assessment.publishedVersion?.versionTag ?? null,
      'Signals are currently read-only',
      'You are browsing the stable published assessment. Create a draft version to edit signals for the next release.',
    );
  }

  if (!domain) {
    return (
      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Signals"
          title="Author flexible signals"
          description="Signal count stays open-ended here. Pair expectations derive from the authored signals instead of any fixed four-signal model."
        />
        <EmptyState
          description="Create the single domain first, then add the signals you need."
          title="No domain yet"
        />
      </section>
    );
  }

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Signals"
        title="Author flexible signals"
        description="Signal count stays open-ended here. Pair expectations derive from the authored signals instead of any fixed four-signal model."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard detail="No fixed four-signal assumption." label="Signals" value={String(domain.signals.length)} />
        <SummaryCard detail="Derived from the current authored signal set." label="Expected pairs" value={String(pairCount)} />
        <SummaryCard detail="All signals stay tied to the one domain." label="Domain" value={domain.label} />
      </div>
      <SurfaceCard className="p-5 lg:p-6">
        <form
          action={createFormAction}
          className="space-y-4"
          onChange={handleDirtyChange}
          onInput={handleDirtyInput}
          onSubmit={handleDirtySubmit}
          ref={formRef}
        >
          <Field
            error={createState.fieldErrors.label}
            hint="Create one signal at a time. Ordering is deterministic by insertion order."
            htmlFor="create-signal-label"
            label="Signal label"
          >
            <Input
              error={createState.fieldErrors.label}
              id="create-signal-label"
              name="label"
              onChange={(event) => setLabelDraft(event.currentTarget.value)}
              placeholder="Directive"
              value={labelDraft}
            />
          </Field>
          <CanonicalKeyField
            hint="The canonical key will be generated from the label when the signal is created."
            htmlFor="create-signal-key"
            label="Signal key"
            value={generatedSignalKey}
          />
          <Field
            error={createState.fieldErrors.description}
            hint="Optional structural description."
            htmlFor="create-signal-description"
            label="Description"
          >
            <TextArea
              error={createState.fieldErrors.description}
              id="create-signal-description"
              name="description"
              onChange={(event) => setDescriptionDraft(event.currentTarget.value)}
              placeholder="What this signal measures."
              value={descriptionDraft}
            />
          </Field>
          <InlineError message={createState.formError} />
          <div className="flex justify-end">
            <SubmitButton idleLabel="Add signal" pendingLabel="Creating..." />
          </div>
        </form>
      </SurfaceCard>
      {domain.signals.length === 0 ? (
        <EmptyState description="Add the first signal for this domain." title="No signals yet" />
      ) : (
        <div className="space-y-4">
          {domain.signals.map((signal) => (
            <SignalCard domainId={domain.domainId} key={signal.signalId} signal={signal} />
          ))}
        </div>
      )}
    </section>
  );
}

function SingleDomainQuestionImportForm({
  assessmentKey,
  assessmentVersionId,
}: Readonly<{
  assessmentKey: string;
  assessmentVersionId: string;
}>) {
  const importAction = useMemo(
    () =>
      importSingleDomainQuestionsAction.bind(null, {
        assessmentKey,
        assessmentVersionId,
      }),
    [assessmentKey, assessmentVersionId],
  );
  const [importState, importFormAction] = useActionState(
    importAction,
    {
      ...initialSingleDomainQuestionImportState,
      createdQuestions: [] as readonly {
        questionId: string;
        assessmentVersionId: string;
        domainId: string;
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
      }[],
    },
  );
  const {
    formRef,
    onChange: handleDirtyChange,
    onInput: handleDirtyInput,
    onSubmit: handleDirtySubmit,
  } = useSingleDomainDirtyForm({ state: importState });
  const createdQuestions = importState.createdQuestions ?? [];

  return (
    <SingleDomainQuestionImportFormFields
      key={
        createdQuestions.length > 0
          ? createdQuestions.map((question) => question.questionId).join('|')
          : 'draft'
      }
      createdQuestions={createdQuestions}
      fieldError={importState.fieldErrors.questionLines}
      formAction={importFormAction}
      formError={importState.formError}
      formRef={formRef}
      handleDirtyChange={handleDirtyChange}
      handleDirtyInput={handleDirtyInput}
      handleDirtySubmit={handleDirtySubmit}
      initialQuestionLines={importState.values.questionLines}
    />
  );
}

function SingleDomainQuestionImportFormFields({
  createdQuestions,
  fieldError,
  formAction,
  formError,
  formRef,
  handleDirtyChange,
  handleDirtyInput,
  handleDirtySubmit,
  initialQuestionLines,
}: Readonly<{
  createdQuestions: readonly {
    questionId: string;
    assessmentVersionId: string;
    domainId: string;
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
  fieldError?: string;
  formAction: (payload: FormData) => void;
  formError: string | null;
  formRef: React.RefObject<HTMLFormElement | null>;
  handleDirtyChange: React.FormEventHandler<HTMLFormElement>;
  handleDirtyInput: React.FormEventHandler<HTMLFormElement>;
  handleDirtySubmit: React.FormEventHandler<HTMLFormElement>;
  initialQuestionLines: string;
}>) {
  const [questionLines, setQuestionLines] = useState(
    createdQuestions.length > 0 ? '' : initialQuestionLines,
  );

  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>Bulk import</LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              order | question_text
            </LabelPill>
          </div>
          <p className="text-sm leading-7 text-white/62">
            Paste one row per question using the canonical import format. Blank lines are ignored.
            The import is atomic: either every row is written and rekeyed into the single-domain
            draft, or nothing changes.
          </p>
        </div>
        <form
          action={formAction}
          className="space-y-4"
          onChange={handleDirtyChange}
          onInput={handleDirtyInput}
          onSubmit={handleDirtySubmit}
          ref={formRef}
        >
          <Field
            error={fieldError}
            hint="Example: 1 | I step in quickly when a team loses direction"
            htmlFor="single-domain-question-import"
            label="Import rows"
          >
            <TextArea
              error={fieldError}
              id="single-domain-question-import"
              minHeightClass="min-h-[220px]"
              name="questionLines"
              onChange={(event) => setQuestionLines(event.currentTarget.value)}
              placeholder={[
                '1 | I step in quickly when a team loses direction',
                '2 | I prefer to test assumptions before committing',
                '3 | I keep discussions moving when others hesitate',
              ].join('\n')}
              value={questionLines}
            />
          </Field>
          <InlineError message={formError} />
          {createdQuestions.length > 0 ? (
            <div className="rounded-[1rem] border border-[rgba(151,233,182,0.22)] bg-[rgba(16,61,34,0.26)] p-4 text-sm text-[rgba(217,255,229,0.94)]">
              Imported {createdQuestions.length} question{createdQuestions.length === 1 ? '' : 's'}.
              Ordered questions and default A-D responses are now persisted in the draft.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-white/54">
              Question keys are generated by the system after the final canonical order is persisted.
            </p>
            <SubmitButton idleLabel="Import questions" pendingLabel="Importing..." />
          </div>
        </form>
      </div>
    </SurfaceCard>
  );
}

export function SingleDomainQuestionsAuthoring() {
  const assessment = useAdminAssessmentAuthoring();
  const domain = assessment.authoredDomains[0] ?? null;
  const draftVersionId = assessment.latestDraftVersion?.assessmentVersionId ?? '';
  const createAction = useMemo(
    () =>
      createSingleDomainQuestionAction.bind(null, {
        assessmentKey: assessment.assessmentKey,
        assessmentVersionId: draftVersionId,
      }),
    [assessment.assessmentKey, draftVersionId],
  );
  const [createState, createFormAction] = useActionState(createAction, initialAdminQuestionAuthoringFormState);
  const {
    formRef,
    onChange: handleDirtyChange,
    onInput: handleDirtyInput,
    onSubmit: handleDirtySubmit,
  } = useSingleDomainDirtyForm({ state: createState });

  if (!assessment.latestDraftVersion) {
    return renderMissingDraftState(
      assessment.assessmentKey,
      assessment.builderMode,
      assessment.publishedVersion?.versionTag ?? null,
      'Questions are currently read-only',
      'You are browsing the stable published assessment. Create a draft version to edit questions for the next release.',
    );
  }

  if (!domain) {
    return (
      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Questions"
          title="Author questions"
          description="Questions must belong to the one authored domain and stay in deterministic order."
        />
        <EmptyState description="Create the single domain first, then add questions." title="No domain yet" />
      </section>
    );
  }

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Questions"
        title="Author questions"
        description="Questions must belong to the one authored domain and stay in deterministic order."
      />
      <SingleDomainQuestionImportForm
        assessmentKey={assessment.assessmentKey}
        assessmentVersionId={draftVersionId}
      />
      <SurfaceCard className="p-5 lg:p-6">
        <form
          action={createFormAction}
          className="space-y-4"
          onChange={handleDirtyChange}
          onInput={handleDirtyInput}
          onSubmit={handleDirtySubmit}
          ref={formRef}
        >
          <input name="domainId" type="hidden" value={domain.domainId} />
          <Field
            error={createState.fieldErrors.prompt}
            hint="New questions receive the existing deterministic option scaffold and stay attached to the single domain."
            htmlFor="create-question-prompt"
            label="Question text"
          >
            <TextArea
              defaultValue={createState.values.prompt}
              error={createState.fieldErrors.prompt}
              id="create-question-prompt"
              minHeightClass="min-h-[120px]"
              name="prompt"
              placeholder="What should this question ask?"
            />
          </Field>
          <InlineError message={createState.formError} />
          <div className="flex justify-end">
            <SubmitButton idleLabel="Add question" pendingLabel="Creating..." />
          </div>
        </form>
      </SurfaceCard>
      {assessment.authoredQuestions.length === 0 ? (
        <EmptyState description="Add the first question for this domain." title="No questions yet" />
      ) : (
        <div className="space-y-4">
          {assessment.authoredQuestions.map((question) => (
            <QuestionCard domainId={domain.domainId} key={question.questionId} question={question} />
          ))}
        </div>
      )}
    </section>
  );
}

export function SingleDomainResponsesAuthoring() {
  const assessment = useAdminAssessmentAuthoring();
  const draftVersionId = assessment.latestDraftVersion?.assessmentVersionId ?? '';

  if (!assessment.latestDraftVersion) {
    return renderMissingDraftState(
      assessment.assessmentKey,
      assessment.builderMode,
      assessment.publishedVersion?.versionTag ?? null,
      'Responses are currently read-only',
      'You are browsing the stable published assessment. Create a draft version to edit response options for the next release.',
    );
  }

  if (assessment.authoredQuestions.length === 0) {
    return (
      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Responses"
          title="Author response options"
          description="Options stay grouped by question and preserve label order using the existing convention."
        />
        <EmptyState description="Add questions first, then author response options." title="No questions yet" />
      </section>
    );
  }

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Responses"
        title="Author response options"
        description="Options stay grouped by question and preserve label order using the existing convention."
      />
      <div className="space-y-5">
        {assessment.authoredQuestions.map((question) => (
          <ResponsesQuestionCard
            assessmentKey={assessment.assessmentKey}
            assessmentVersionId={draftVersionId}
            key={question.questionId}
            question={question}
          />
        ))}
      </div>
    </section>
  );
}

export function SingleDomainWeightingsAuthoring() {
  const assessment = useAdminAssessmentAuthoring();
  const availableSignals = assessment.availableSignals;
  const questionsWithOptions = assessment.authoredQuestions.filter(
    (question) => question.options.length > 0,
  );
  const questionScopeFieldId = 'single-domain-weightings-question-scope';
  const [selectedQuestionId, setSelectedQuestionId] = useState(
    questionsWithOptions[0]?.questionId ?? '',
  );
  const selectedQuestion =
    questionsWithOptions.find((question) => question.questionId === selectedQuestionId) ??
    questionsWithOptions[0] ??
    null;

  if (!assessment.latestDraftVersion) {
    return renderMissingDraftState(
      assessment.assessmentKey,
      assessment.builderMode,
      assessment.publishedVersion?.versionTag ?? null,
      'Weightings are currently read-only',
      'You are browsing the stable published assessment. Create a draft version to edit weightings for the next release.',
    );
  }

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Weightings"
        title="Author option-to-signal weights"
        description="Weight rows must resolve against existing options and existing signals only. This is authoring only; scoring stays engine-owned."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard detail="Flexible authored count." label="Signals" value={String(availableSignals.length)} />
        <SummaryCard detail="Options currently available to map." label="Options" value={String(assessment.weightingSummary.totalOptions)} />
        <SummaryCard detail="Options with at least one authored weight." label="Weighted options" value={String(assessment.weightingSummary.weightedOptions)} />
        <SummaryCard detail="Explicit option-to-signal rows." label="Mappings" value={String(assessment.weightingSummary.totalMappings)} />
      </div>
      {assessment.authoredQuestions.length === 0 ? (
        <EmptyState description="Add questions first, then author weightings." title="No questions yet" />
      ) : assessment.weightingSummary.totalOptions === 0 ? (
        <EmptyState description="Add response options first, then author weightings." title="No options yet" />
      ) : availableSignals.length === 0 ? (
        <EmptyState description="Add signals first, then author weightings." title="No signals yet" />
      ) : selectedQuestion ? (
        <div className="space-y-4">
          <SurfaceCard className="p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="sonartra-page-eyebrow">Question scope</p>
                <select
                  id={questionScopeFieldId}
                  className="sonartra-focus-ring min-h-11 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]"
                  name="questionScope"
                  onChange={(event) => setSelectedQuestionId(event.currentTarget.value)}
                  value={selectedQuestion.questionId}
                >
                  {questionsWithOptions.map((question) => (
                    <option key={question.questionId} value={question.questionId}>
                      Question {question.orderIndex + 1}: {question.prompt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-white/62">
                <span>{selectedQuestion.options.length} options</span>
                <span>{availableSignals.length} signals</span>
                <span>Deterministic explicit editing only</span>
              </div>
            </div>
          </SurfaceCard>
          <SingleDomainWeightGrid
            assessmentKey={assessment.assessmentKey}
            assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
            availableSignals={availableSignals}
            question={selectedQuestion}
          />
        </div>
      ) : null}
    </section>
  );
}

export function SingleDomainReviewAuthoring() {
  const assessment = useAdminAssessmentAuthoring();
  const runtimeReadiness = assessment.singleDomainDraftReadiness;
  const languageValidation = useMemo(
    () =>
      buildSingleDomainLanguageValidation({
        authoredDomains: assessment.authoredDomains,
        languageBundle: assessment.singleDomainLanguageBundle,
      }),
    [assessment.authoredDomains, assessment.singleDomainLanguageBundle],
  );
  const structuralValidation = useMemo(
    () =>
      buildSingleDomainStructuralValidation({
        authoredDomains: assessment.authoredDomains,
        authoredQuestions: assessment.authoredQuestions,
        languageValidation,
      }),
    [assessment.authoredDomains, assessment.authoredQuestions, languageValidation],
  );
  const languageSection = structuralValidation.sections.find((section) => section.key === 'language');

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Review"
        title="Review runtime readiness"
        description="Review structural completeness, language completeness, and strict runtime loadability before future publish checks."
      />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <SummaryCard detail="One required." label="Domains" value={String(structuralValidation.domainCount)} />
        <SummaryCard detail="Flexible count." label="Signals" value={String(structuralValidation.signalCount)} />
        <SummaryCard detail="Derived from current signals." label="Expected pairs" value={String(structuralValidation.expectedPairCount)} />
        <SummaryCard detail="Deterministic order." label="Questions" value={String(structuralValidation.questionCount)} />
        <SummaryCard detail="Grouped under questions." label="Responses" value={String(structuralValidation.optionCount)} />
        <SummaryCard detail="Explicit weight rows." label="Weightings" value={String(structuralValidation.mappingCount)} />
        <SummaryCard
          detail={languageSection?.detail ?? 'Locked dataset completeness.'}
          label="Language"
          value={languageSection ? getStatusLabel(languageSection.status) : 'Waiting'}
        />
      </div>
      {runtimeReadiness ? (
        <SurfaceCard className="p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="sonartra-page-eyebrow">Runtime readiness</p>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">
                  {runtimeReadiness.isReady ? 'Runtime definition can load cleanly' : 'Runtime definition is still blocked'}
                </h3>
                <p className="text-sm leading-7 text-white/62">
                  Single-domain drafts become publishable only when the authored data can resolve into one deterministic runtime definition.
                </p>
              </div>
              <LabelPill
                className={runtimeReadiness.isReady
                  ? 'border-[rgba(151,233,182,0.22)] bg-[rgba(16,61,34,0.26)] text-[rgba(217,255,229,0.94)]'
                  : 'border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] text-[rgba(255,234,196,0.94)]'}
              >
                {runtimeReadiness.isReady ? 'Ready' : 'Attention'}
              </LabelPill>
            </div>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <SummaryCard detail="Exactly one authored domain." label="Domains" value={String(runtimeReadiness.counts.domainCount)} />
              <SummaryCard detail="Current authored signal set." label="Signals" value={String(runtimeReadiness.counts.signalCount)} />
              <SummaryCard detail="nC2 derived from current signals." label="Derived pairs" value={String(runtimeReadiness.counts.derivedPairCount)} />
              <SummaryCard detail="Questions that runtime will serve." label="Questions" value={String(runtimeReadiness.counts.questionCount)} />
              <SummaryCard detail="Options attached to authored questions." label="Options" value={String(runtimeReadiness.counts.optionCount)} />
              <SummaryCard detail="Resolved option-to-signal rows." label="Weights" value={String(runtimeReadiness.counts.weightCount)} />
            </div>
            {runtimeReadiness.issues.length > 0 ? (
              <div className="space-y-2">
                {runtimeReadiness.issues.map((issue) => (
                  <div
                    className="rounded-[0.9rem] border border-[rgba(255,157,157,0.24)] bg-[rgba(80,20,20,0.22)] px-4 py-3 text-sm text-[rgba(255,216,216,0.94)]"
                    key={`runtime-${issue.code}-${issue.message}`}
                  >
                    {issue.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[0.9rem] border border-[rgba(151,233,182,0.22)] bg-[rgba(16,61,34,0.26)] px-4 py-3 text-sm text-[rgba(217,255,229,0.94)]">
                The current draft resolves into a strict runtime-ready single-domain definition.
              </div>
            )}
          </div>
        </SurfaceCard>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {structuralValidation.sections.map((section) => (
          <SurfaceCard className="p-5" key={section.key}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <LabelPill>{section.label}</LabelPill>
                <LabelPill
                  className={getStatusPillClass(section.status)}
                >
                  {getStatusLabel(section.status)}
                </LabelPill>
              </div>
              <p className="text-sm leading-7 text-white/62">{section.detail}</p>
              {section.key === 'language' ? (
                <div className="space-y-2 rounded-[0.9rem] border border-white/8 bg-black/10 p-4">
                  {languageValidation.datasets.map((dataset) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
                      key={dataset.datasetKey}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">{dataset.label}</p>
                        <p className="text-sm leading-6 text-white/54">{dataset.detail}</p>
                      </div>
                      <LabelPill
                        className={getStatusPillClass(dataset.status)}
                      >
                        {dataset.status === 'waiting'
                          ? 'Waiting'
                          : dataset.countRule === 'exact'
                            ? `${dataset.actualRowCount}/${dataset.expectedRowCount}`
                            : `${dataset.actualRowCount}/1+`}
                      </LabelPill>
                    </div>
                  ))}
                </div>
              ) : null}
              {section.issues.length > 0 ? (
                <div className="space-y-2">
                  {section.issues.map((issue) => (
                    <div
                      className="rounded-[0.9rem] border border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] px-4 py-3 text-sm text-[rgba(255,234,196,0.94)]"
                      key={issue.code}
                    >
                      {issue.message}
                    </div>
                  ))}
                </div>
              ) : section.status === 'waiting' ? (
                <div className="rounded-[0.9rem] border border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] px-4 py-3 text-sm text-[rgba(255,234,196,0.94)]">
                  This section is waiting on earlier authored structure before readiness can be assessed.
                </div>
              ) : section.status === 'not_started' ? (
                <div className="rounded-[0.9rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/68">
                  This section has not been meaningfully authored yet.
                </div>
              ) : (
                <div className="rounded-[0.9rem] border border-[rgba(151,233,182,0.22)] bg-[rgba(16,61,34,0.26)] px-4 py-3 text-sm text-[rgba(217,255,229,0.94)]">
                  No blocking structural issues in this section.
                </div>
              )}
            </div>
          </SurfaceCard>
        ))}
      </div>
      {structuralValidation.issues.length === 0 ? null : (
        <SurfaceCard className="p-5">
          <div className="space-y-3">
            <p className="sonartra-page-eyebrow">Blocking issues</p>
            <p className="text-sm leading-7 text-white/62">
              Resolve these issues before treating the single-domain draft as runtime-loadable.
            </p>
            <div className="space-y-2">
              {structuralValidation.issues.map((issue) => (
                <div
                  className="rounded-[0.9rem] border border-[rgba(255,157,157,0.24)] bg-[rgba(80,20,20,0.22)] px-4 py-3 text-sm text-[rgba(255,216,216,0.94)]"
                  key={`issue-${issue.code}`}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>
      )}
    </section>
  );
}
