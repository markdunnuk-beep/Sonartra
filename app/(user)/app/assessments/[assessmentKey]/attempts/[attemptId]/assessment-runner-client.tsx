'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { getResumeQuestionIndex, shouldShowAssessmentIntro } from '@/lib/assessment-runner/runner-ux';
import type { AssessmentRunnerViewModel } from '@/lib/server/assessment-runner-types';

type AssessmentRunnerClientProps = {
  userId: string;
  runner: AssessmentRunnerViewModel;
};

type SavePayload = {
  answeredQuestions: number;
  totalQuestions: number;
  completionPercentage: number;
};

type CompletionResponseBody = {
  error?: string;
  resultId?: string | null;
  resultStatus?: 'ready' | 'processing' | 'failed';
  alreadyCompleted?: boolean;
};

type CompletionUiState = 'idle' | 'submitting' | 'processing' | 'redirecting';

export function AssessmentRunnerClient({
  userId,
  runner,
}: AssessmentRunnerClientProps) {
  const router = useRouter();
  const initialQuestionIndex = getResumeQuestionIndex(runner.questions);
  const initialIntroVisible = shouldShowAssessmentIntro({
    answeredQuestions: runner.answeredQuestions,
    assessmentIntro: runner.assessmentIntro,
  });
  const [showIntro, setShowIntro] = useState(initialIntroVisible);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [selectedByQuestionId, setSelectedByQuestionId] = useState<Record<string, string | null>>(
    () =>
      Object.fromEntries(
        runner.questions.map((question) => [question.questionId, question.selectedOptionId]),
      ),
  );
  const [answeredQuestions, setAnsweredQuestions] = useState(runner.answeredQuestions);
  const [completionPercentage, setCompletionPercentage] = useState(runner.completionPercentage);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [completionState, setCompletionState] = useState<CompletionUiState>('idle');
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const submitLockedRef = useRef(false);

  const currentQuestion = runner.questions[currentQuestionIndex] ?? null;
  const totalQuestions = runner.totalQuestions;
  const unansweredQuestions = Math.max(0, totalQuestions - answeredQuestions);
  const isFinalQuestion = currentQuestionIndex === runner.questions.length - 1;
  const currentQuestionAnswered = currentQuestion
    ? selectedByQuestionId[currentQuestion.questionId] !== null
    : false;
  const canSubmit =
    answeredQuestions === totalQuestions &&
    !isSaving &&
    completionState === 'idle' &&
    !saveError;
  const interactionLocked = completionState !== 'idle';
  const resumedAwayFromStart = initialQuestionIndex > 0;
  const showCompleteAction = isFinalQuestion || completionState !== 'idle' || submitError !== null;

  function goToQuestion(index: number) {
    setCurrentQuestionIndex(Math.max(0, Math.min(index, runner.questions.length - 1)));
  }

  function goToFirstUnanswered() {
    const nextIndex = runner.questions.findIndex(
      (question) => selectedByQuestionId[question.questionId] === null,
    );

    if (nextIndex >= 0) {
      goToQuestion(nextIndex);
    }
  }

  async function persistSelection(params: {
    questionId: string;
    selectedOptionId: string;
  }): Promise<SavePayload> {
    const response = await fetch(`/api/assessments/attempts/${runner.attemptId}/responses`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        assessmentKey: runner.assessmentKey,
        questionId: params.questionId,
        selectedOptionId: params.selectedOptionId,
      }),
    });

    const body = (await response.json()) as SavePayload | { error?: string };
    if (!response.ok) {
      throw new Error('error' in body && body.error ? body.error : 'Unable to save response');
    }

    return body as SavePayload;
  }

  function handleSelect(questionId: string, selectedOptionId: string) {
    if (interactionLocked) {
      return;
    }

    setSelectedByQuestionId((current) => ({
      ...current,
      [questionId]: selectedOptionId,
    }));
    setSaveError(null);

    const nextSave = saveQueueRef.current.then(async () => {
      setIsSaving(true);

      try {
        const result = await persistSelection({
          questionId,
          selectedOptionId,
        });
        setAnsweredQuestions(result.answeredQuestions);
        setCompletionPercentage(result.completionPercentage);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Unable to save response');
      } finally {
        setIsSaving(false);
      }
    });

    saveQueueRef.current = nextSave.catch(() => undefined);
  }

  async function handleSubmit() {
    if (!canSubmit || submitLockedRef.current) {
      return;
    }

    submitLockedRef.current = true;
    setSubmitError(null);
    setCompletionState('submitting');

    try {
      await saveQueueRef.current;

      const response = await fetch('/api/assessments/complete', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          attemptId: runner.attemptId,
        }),
      });

      const body = (await response.json()) as CompletionResponseBody;

      if (!response.ok) {
        setSubmitError(body.error ?? 'Unable to complete assessment');
        setCompletionState('idle');
        router.refresh();
        return;
      }

      if (body.resultStatus === 'ready' && body.resultId) {
        setCompletionState('redirecting');
        router.replace(`/app/results/${body.resultId}`);
        return;
      }

      if (body.resultStatus === 'processing') {
        setCompletionState('processing');
        router.refresh();
        return;
      }

      setSubmitError(body.error ?? 'Completion could not be finalized.');
      setCompletionState('idle');
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to complete assessment');
      setCompletionState('idle');
      router.refresh();
    } finally {
      submitLockedRef.current = false;
    }
  }

  function getCompletionMessage(): string | null {
    if (completionState === 'submitting') {
      return 'Submitting your responses. Please keep this tab open.';
    }

    if (completionState === 'processing') {
      return 'Responses submitted. Opening the processing state now.';
    }

    if (completionState === 'redirecting') {
      return 'Result ready. Opening your result.';
    }

    return null;
  }

  if (!currentQuestion) {
    return (
      <section className="sonartra-panel space-y-3">
        <h2 className="text-xl font-semibold text-white">No questions available</h2>
        <p className="text-sm text-white/65">
          This attempt has no persisted question set loaded for the current assessment version.
        </p>
        <Link href="/app/assessments" className="text-sm font-medium text-white/70 transition hover:text-white">
          Back to workspace
        </Link>
      </section>
    );
  }

  if (showIntro && runner.assessmentIntro) {
    return (
      <section className="sonartra-panel space-y-6 p-5 lg:p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
            <span>Assessment Intro</span>
            {runner.assessmentIntro.estimatedTimeOverride ? (
              <>
                <span className="text-white/22">/</span>
                <span>{runner.assessmentIntro.estimatedTimeOverride}</span>
              </>
            ) : null}
          </div>
          <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-white lg:text-[2.35rem]">
            {runner.assessmentIntro.introTitle || runner.assessmentTitle}
          </h2>
          <p className="text-sm text-white/58">{runner.assessmentTitle}</p>
          {runner.assessmentIntro.introSummary ? (
            <p className="max-w-3xl text-sm leading-7 text-white/74">
              {runner.assessmentIntro.introSummary}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
              How It Works
            </p>
            <p className="mt-3 text-sm leading-7 text-white/78">
              {runner.assessmentIntro.introHowItWorks}
            </p>
          </div>

          {runner.assessmentIntro.instructions ? (
            <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                Instructions
              </p>
              <p className="mt-3 text-sm leading-7 text-white/78">
                {runner.assessmentIntro.instructions}
              </p>
            </div>
          ) : null}

          {runner.assessmentIntro.confidentialityNote ? (
            <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                Confidentiality
              </p>
              <p className="mt-3 text-sm leading-7 text-white/78">
                {runner.assessmentIntro.confidentialityNote}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/52">
            The runner will begin at Question 1 and continue in the published assessment order.
          </p>
          <button
            type="button"
            onClick={() => setShowIntro(false)}
            className="inline-flex h-12 min-w-[12rem] items-center justify-center rounded-xl border border-white/15 bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-white/90"
          >
            Start Assessment
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="space-y-4">
        <section className="sonartra-panel space-y-4 p-5 lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                <span>Assessment Runner</span>
                <span className="text-white/22">/</span>
                <span>{runner.assessmentTitle}</span>
              </div>
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <h2 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-white lg:text-[1.8rem]">
                  Question {currentQuestionIndex + 1}
                </h2>
                <p className="pb-0.5 text-sm text-white/58">of {totalQuestions}</p>
              </div>
              <p className="text-sm text-white/65">
                {answeredQuestions} complete, {unansweredQuestions} remaining. Progress{' '}
                {completionPercentage}%.
              </p>
              {resumedAwayFromStart ? (
                <p className="text-sm text-white/46">
                  Resume opened at the next unanswered question from your saved progress.
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/58">
              {completionState === 'idle'
                ? isSaving
                  ? 'Saving latest selection...'
                  : 'Selections save automatically.'
                : 'Completion is in progress.'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-white/44">
              <span>Completion</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </section>

        <section className="sonartra-panel space-y-5 p-5 lg:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">
                {currentQuestion.domainTitle}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  currentQuestionAnswered
                    ? 'border-emerald-400/18 bg-emerald-400/10 text-emerald-100'
                    : 'border-white/10 bg-white/[0.03] text-white/52'
                }`}
              >
                {currentQuestionAnswered ? 'Answered' : 'Awaiting response'}
              </span>
            </div>
            <h3 className="max-w-4xl text-[1.8rem] font-semibold tracking-[-0.03em] text-white lg:text-[2rem]">
              {currentQuestion.prompt}
            </h3>
          </div>

          <div className="grid gap-3">
            {currentQuestion.options.map((option) => {
              const selected = selectedByQuestionId[currentQuestion.questionId] === option.optionId;

              return (
                <button
                  key={option.optionId}
                  type="button"
                  onClick={() => handleSelect(currentQuestion.questionId, option.optionId)}
                  disabled={interactionLocked}
                  className={`rounded-[1.1rem] border px-4 py-3.5 text-left transition ${
                    selected
                      ? 'border-white bg-white text-neutral-950 shadow-[0_14px_30px_rgba(255,255,255,0.08)]'
                      : 'border-white/10 bg-white/[0.03] text-white hover:border-white/24 hover:bg-white/[0.055]'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <div className="flex items-start gap-3">
                    {option.label ? (
                      <span
                        className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          selected ? 'bg-neutral-950/10 text-neutral-950' : 'bg-white/10 text-white'
                        }`}
                      >
                        {option.label}
                      </span>
                    ) : null}
                    <span className="text-sm leading-6 lg:text-[0.95rem]">{option.text}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {saveError ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {saveError}
            </p>
          ) : null}

          {submitError ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {submitError}
            </p>
          ) : null}

          {getCompletionMessage() ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/72">
              {getCompletionMessage()}
            </p>
          ) : null}

          <div className="border-white/8 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-3">
              <button
                type="button"
                onClick={() => goToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0 || interactionLocked}
                className="inline-flex h-12 min-w-[7rem] items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-white/35"
              >
                Back
              </button>
              {!isFinalQuestion ? (
                <button
                  type="button"
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  disabled={interactionLocked}
                  className="inline-flex h-12 min-w-[8rem] items-center justify-center rounded-xl border border-white/15 bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/20 disabled:text-white/45"
                >
                  Next
                </button>
              ) : unansweredQuestions > 0 ? (
                <button
                  type="button"
                  onClick={goToFirstUnanswered}
                  disabled={interactionLocked}
                  className="inline-flex h-12 min-w-[10.5rem] items-center justify-center rounded-xl border border-white/15 bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/20 disabled:text-white/45"
                >
                  Next Unanswered
                </button>
              ) : null}
            </div>

            {showCompleteAction ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex h-12 min-w-[12rem] items-center justify-center rounded-xl border border-white/15 bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/20 disabled:text-white/45"
              >
                {completionState === 'submitting'
                  ? 'Submitting...'
                  : completionState === 'processing'
                    ? 'Opening processing state...'
                    : completionState === 'redirecting'
                      ? 'Opening result...'
                      : 'Complete Assessment'}
              </button>
            ) : null}
          </div>

          {showCompleteAction && !canSubmit && completionState === 'idle' ? (
            <p className="text-sm text-white/52">
              {unansweredQuestions > 0
                ? `Complete the remaining ${unansweredQuestions} question${unansweredQuestions === 1 ? '' : 's'} before submitting.`
                : 'Completion is available once every question has a saved answer and no save is pending.'}
            </p>
          ) : null}
        </section>
      </div>

      <aside className="xl:sticky xl:top-6">
        <section className="sonartra-panel space-y-4 p-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
              Question Map
            </p>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  {answeredQuestions}/{totalQuestions}
                </p>
                <p className="text-sm text-white/58">Questions completed</p>
              </div>
              <p className="text-sm text-white/46">{unansweredQuestions} remaining</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-white/48">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-white" />
              Current
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-400/10 px-2.5 py-1 text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-200" />
              Complete
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-white/35" />
              Incomplete
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {runner.questions.map((question, index) => {
              const answered = selectedByQuestionId[question.questionId] !== null;
              const active = index === currentQuestionIndex;

              return (
                <button
                  key={question.questionId}
                  type="button"
                  onClick={() => goToQuestion(index)}
                  disabled={interactionLocked}
                  aria-label={`Question ${index + 1}${active ? ', current' : ''}${answered ? ', answered' : ', unanswered'}`}
                  className={`relative rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition ${
                    active
                      ? 'border-white bg-white text-neutral-950 shadow-[0_12px_24px_rgba(255,255,255,0.08)]'
                      : answered
                        ? 'border-emerald-400/18 bg-emerald-400/10 text-white hover:border-emerald-300/28 hover:bg-emerald-400/14'
                        : 'border-white/10 bg-white/[0.03] text-white/58 hover:border-white/18 hover:bg-white/[0.05]'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span>{index + 1}</span>
                  <span
                    className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${
                      active
                        ? 'bg-neutral-950/45'
                        : answered
                          ? 'bg-emerald-200'
                          : 'bg-white/28'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  );
}
