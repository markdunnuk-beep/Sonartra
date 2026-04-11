'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/components/shared/user-app-ui';
import { getRunnerState } from '@/lib/assessment-runner/runner-state';
import {
  getResumeQuestionIndex,
  shouldShowAssessmentIntro,
} from '@/lib/assessment-runner/runner-ux';
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

function getRevealStyle(step = 0): CSSProperties {
  return {
    '--sonartra-motion-delay': `${step * 60}ms`,
  } as CSSProperties;
}

function getRunnerButtonClass(params: {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  minWidthClassName?: string;
}): string {
  const variant = params.variant ?? 'secondary';

  return cn(
    'sonartra-button sonartra-focus-ring',
    params.minWidthClassName,
    variant === 'primary' ? 'sonartra-button-primary' : 'sonartra-button-secondary',
    params.disabled && 'cursor-not-allowed border-white/10 bg-white/20 text-white/45',
  );
}

function RunnerMetaStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="sonartra-runner-meta-stat">
      <p className="sonartra-runner-meta-label">{label}</p>
      <p className="sonartra-runner-meta-value">{value}</p>
    </div>
  );
}

export function AssessmentRunnerClient({ userId, runner }: AssessmentRunnerClientProps) {
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
  const runnerState = getRunnerState({
    answeredCount: answeredQuestions,
    totalQuestions,
    attemptStatus: runner.status,
  });
  const currentQuestionAnswered = currentQuestion
    ? selectedByQuestionId[currentQuestion.questionId] !== null
    : false;
  const canSubmit =
    answeredQuestions === totalQuestions && !isSaving && completionState === 'idle' && !saveError;
  const interactionLocked = completionState !== 'idle';
  const resumedAwayFromStart = initialQuestionIndex > 0;
  const showCompleteAction = isFinalQuestion || completionState !== 'idle' || submitError !== null;
  const currentQuestionNumber = currentQuestionIndex + 1;
  const activePhase = showIntro ? 'intro' : completionState !== 'idle' ? 'completion' : 'question';
  const progressSummary =
    unansweredQuestions === 0
      ? 'Every question now has a saved response.'
      : `${unansweredQuestions} question${unansweredQuestions === 1 ? '' : 's'} still remain.`;

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    console.debug('[runner-state]', {
      attemptId: runner.attemptId,
      assessmentKey: runner.assessmentKey,
      runnerState,
      lifecycleStatus: runner.status,
      answeredQuestions,
      totalQuestions,
      currentQuestionIndex,
      currentQuestionId: currentQuestion?.questionId ?? null,
    });
  }, [
    answeredQuestions,
    currentQuestion?.questionId,
    currentQuestionIndex,
    runner.assessmentKey,
    runner.attemptId,
    runner.status,
    runnerState,
    totalQuestions,
  ]);

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
      <section className="sonartra-motion-reveal sonartra-panel space-y-3">
        <h2 className="sonartra-type-card-title">No questions available</h2>
        <p className="sonartra-type-body-secondary max-w-[44rem]">
          This attempt has no persisted question set loaded for the current assessment version.
        </p>
        <Link
          href="/app/assessments"
          className="sonartra-type-nav text-white/72 transition hover:text-white"
        >
          Back to workspace
        </Link>
      </section>
    );
  }

  if (showIntro && runner.assessmentIntro) {
    return (
      <div
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start"
        data-runner-phase="intro"
      >
        <div className="space-y-4">
          <section
            className="sonartra-motion-reveal sonartra-panel sonartra-runner-stage overflow-hidden p-5 sm:p-6 lg:p-7"
            style={getRevealStyle(0)}
          >
            <div className="space-y-6 lg:space-y-7">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.82fr)] xl:gap-8">
                <div className="space-y-5">
                  <div className="sonartra-type-eyebrow flex flex-wrap items-center gap-x-3 gap-y-2 text-white/40">
                    <span>Assessment Intro</span>
                    <span className="bg-white/18 hidden h-1 w-1 rounded-full sm:inline-block" />
                    <span>{runner.assessmentTitle}</span>
                  </div>

                  <div className="space-y-3">
                    <p className="sonartra-type-caption text-white/54">{runner.assessmentTitle}</p>
                    <h2 className="sonartra-type-page-title max-w-[16ch] text-[2.15rem] sm:text-[2.55rem] lg:text-[2.9rem]">
                      {runner.assessmentIntro.introTitle || runner.assessmentTitle}
                    </h2>
                  </div>

                  {runner.assessmentIntro.introSummary ? (
                    <p className="sonartra-type-body text-white/76 max-w-[58ch]">
                      {runner.assessmentIntro.introSummary}
                    </p>
                  ) : null}

                  <div className="border-white/8 flex flex-wrap items-center gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setShowIntro(false)}
                      className={getRunnerButtonClass({
                        variant: 'primary',
                      })}
                    >
                      Start Assessment
                    </button>
                    <p className="sonartra-type-body-secondary max-w-[32rem] text-white/56">
                      The first question opens in the same runner view. Responses save as you go.
                    </p>
                  </div>
                </div>

                <div className="sonartra-motion-reveal-soft border-white/8 flex flex-col gap-4 border-t pt-5 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
                  <div className="sonartra-runner-support-card space-y-4 rounded-[1.15rem] border p-4 sm:p-5">
                    {runner.assessmentIntro.estimatedTimeOverride ? (
                      <div className="space-y-1">
                        <p className="sonartra-type-eyebrow text-white/38">Estimated duration</p>
                        <p className="sonartra-type-nav text-white/84">
                          {runner.assessmentIntro.estimatedTimeOverride}
                        </p>
                      </div>
                    ) : null}

                    {runner.assessmentIntro.instructions ? (
                      <div className="space-y-1">
                        <p className="sonartra-type-eyebrow text-white/38">Instructions</p>
                        <p className="sonartra-type-body-secondary max-w-[38ch] leading-6">
                          {runner.assessmentIntro.instructions}
                        </p>
                      </div>
                    ) : null}

                    {runner.assessmentIntro.introHowItWorks ? (
                      <div className="space-y-1">
                        <p className="sonartra-type-eyebrow text-white/38">How it works</p>
                        <p className="sonartra-type-body-secondary max-w-[38ch] leading-6">
                          {runner.assessmentIntro.introHowItWorks}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-6">
          <section
            className="sonartra-motion-reveal sonartra-motion-stage-2 sonartra-panel sonartra-runner-support-card space-y-4 p-4"
            style={getRevealStyle(1)}
          >
            <div className="space-y-2">
              <p className="sonartra-type-eyebrow text-white/46">Before you begin</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <RunnerMetaStat label="Questions" value={`${totalQuestions}`} />
                <RunnerMetaStat label="Starting point" value="Question 1" />
              </div>
            </div>

            <p className="sonartra-type-body-secondary text-white/58">
              Progress appears once the first response is saved. The runner then keeps the question,
              answers, and progress map in a stable layout.
            </p>
          </section>
        </aside>
      </div>
    );
  }

  return (
    <div
      className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start"
      data-runner-phase={activePhase}
    >
      <div className="space-y-4">
        <section
          className="sonartra-motion-reveal sonartra-panel sonartra-runner-support-card space-y-5 p-5 lg:p-6"
          style={getRevealStyle(0)}
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start">
            <div className="space-y-3">
              <div className="sonartra-type-eyebrow text-white/46 flex flex-wrap items-center gap-2">
                <span>Assessment Runner</span>
                <span className="text-white/22">/</span>
                <span>{runner.assessmentTitle}</span>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                  <h2 className="sonartra-type-section-title text-[1.55rem] lg:text-[1.8rem]">
                    Question {currentQuestionNumber}
                  </h2>
                  <p className="sonartra-type-caption pb-0.5 text-white/58">of {totalQuestions}</p>
                </div>
                <p className="sonartra-type-body-secondary max-w-[44rem] text-white/62">
                  {progressSummary}
                </p>
                {resumedAwayFromStart ? (
                  <p className="sonartra-type-caption text-white/46">
                    Resume opened at the next unanswered question from your saved progress.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <RunnerMetaStat label="Answered" value={`${answeredQuestions}/${totalQuestions}`} />
                <RunnerMetaStat label="Remaining" value={`${unansweredQuestions}`} />
                <RunnerMetaStat label="Progress" value={`${completionPercentage}%`} />
              </div>
              <div className="space-y-2">
                <div className="text-white/44 flex items-center justify-between text-xs font-medium">
                  <span>Completion</span>
                  <span>{completionPercentage}%</span>
                </div>
                <div className="bg-white/8 h-2.5 overflow-hidden rounded-full">
                  <div
                    className="sonartra-motion-progress h-full rounded-full bg-white"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
              <div className="sonartra-motion-status sonartra-type-caption rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-white/58">
                {completionState === 'idle'
                  ? isSaving
                    ? 'Saving latest selection...'
                    : 'Selections save automatically.'
                  : completionState === 'submitting'
                    ? 'Submitting your responses.'
                    : completionState === 'processing'
                      ? 'Opening the processing state.'
                      : 'Opening your result.'}
              </div>
            </div>
          </div>
        </section>

        <section
          className="sonartra-motion-reveal sonartra-motion-stage-2 sonartra-panel sonartra-runner-stage min-h-[34rem] space-y-5 p-5 lg:p-6"
          style={getRevealStyle(1)}
        >
          <div
            key={currentQuestion.questionId}
            className="sonartra-motion-reveal-soft flex min-h-[30rem] flex-col justify-between space-y-6"
            style={getRevealStyle(0)}
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="sonartra-status sonartra-status-neutral">
                  {currentQuestion.domainTitle}
                </span>
                <span
                  className={`sonartra-status ${
                    currentQuestionAnswered
                      ? 'border-emerald-400/18 bg-emerald-400/10 text-emerald-100'
                      : 'border-white/10 bg-white/[0.03] text-white/52'
                  }`}
                >
                  {currentQuestionAnswered ? 'Answered' : 'Awaiting response'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="sonartra-type-caption text-white/44">
                  Question {currentQuestionNumber} of {totalQuestions}
                </div>
                <h3 className="sonartra-type-section-title max-w-[34ch] text-[1.8rem] leading-[1.08] lg:text-[2rem]">
                  {currentQuestion.prompt}
                </h3>
              </div>

              <div className="grid gap-3">
                {currentQuestion.options.map((option) => {
                  const selected =
                    selectedByQuestionId[currentQuestion.questionId] === option.optionId;

                  return (
                    <button
                      key={option.optionId}
                      type="button"
                      onClick={() => handleSelect(currentQuestion.questionId, option.optionId)}
                      disabled={interactionLocked}
                      className={cn(
                        'sonartra-motion-choice sonartra-runner-option rounded-[1.1rem] border px-4 py-3.5 text-left',
                        selected
                          ? 'border-white bg-white text-neutral-950 shadow-[0_14px_30px_rgba(255,255,255,0.08)]'
                          : 'border-white/10 bg-white/[0.03] text-white hover:border-white/24 hover:bg-white/[0.055]',
                        'disabled:cursor-not-allowed disabled:opacity-70',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {option.label ? (
                          <span
                            className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                              selected
                                ? 'bg-neutral-950/10 text-neutral-950'
                                : 'bg-white/10 text-white'
                            }`}
                          >
                            {option.label}
                          </span>
                        ) : null}
                        <div className="min-w-0 flex-1 space-y-2">
                          <span className="sonartra-type-body block max-w-[54ch] text-sm leading-6 text-inherit lg:text-[0.95rem]">
                            {option.text}
                          </span>
                          {selected ? (
                            <span className="sonartra-type-caption block text-neutral-950/70">
                              Selection saved automatically.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {saveError ? (
                <p className="sonartra-motion-banner sonartra-type-body-secondary rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-100">
                  {saveError}
                </p>
              ) : null}

              {submitError ? (
                <p className="sonartra-motion-banner sonartra-type-body-secondary rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-100">
                  {submitError}
                </p>
              ) : null}

              {getCompletionMessage() ? (
                <div className="sonartra-motion-banner sonartra-runner-completion-card space-y-2 rounded-[1.1rem] border px-4 py-3.5">
                  <p className="sonartra-type-eyebrow text-white/40">Finalizing</p>
                  <p className="sonartra-type-body-secondary text-white/72">
                    {getCompletionMessage()}
                  </p>
                </div>
              ) : null}

              <div className="border-white/8 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 gap-3">
                  <button
                    type="button"
                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0 || interactionLocked}
                    className={getRunnerButtonClass({
                      disabled: currentQuestionIndex === 0 || interactionLocked,
                      minWidthClassName: 'min-w-[7rem]',
                    })}
                  >
                    Back
                  </button>
                  {!isFinalQuestion ? (
                    <button
                      type="button"
                      onClick={() => goToQuestion(currentQuestionIndex + 1)}
                      disabled={interactionLocked}
                      className={getRunnerButtonClass({
                        variant: 'primary',
                        disabled: interactionLocked,
                        minWidthClassName: 'min-w-[8rem]',
                      })}
                    >
                      Next
                    </button>
                  ) : unansweredQuestions > 0 ? (
                    <button
                      type="button"
                      onClick={goToFirstUnanswered}
                      disabled={interactionLocked}
                      className={getRunnerButtonClass({
                        variant: 'primary',
                        disabled: interactionLocked,
                        minWidthClassName: 'min-w-[10.5rem]',
                      })}
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
                    className={getRunnerButtonClass({
                      variant: 'primary',
                      disabled: !canSubmit,
                      minWidthClassName: 'min-w-[12rem]',
                    })}
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
                <p className="sonartra-type-body-secondary text-white/52">
                  {unansweredQuestions > 0
                    ? `Complete the remaining ${unansweredQuestions} question${unansweredQuestions === 1 ? '' : 's'} before submitting.`
                    : 'Completion is available once every question has a saved answer and no save is pending.'}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-6">
        <section
          className="sonartra-motion-reveal sonartra-motion-stage-3 sonartra-panel sonartra-runner-support-card space-y-4 p-4"
          style={getRevealStyle(2)}
        >
          <div className="space-y-2">
            <p className="sonartra-type-eyebrow text-white/46">Question Map</p>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="sonartra-type-section-title text-2xl">
                  {answeredQuestions}/{totalQuestions}
                </p>
                <p className="sonartra-type-body-secondary text-white/58">Questions completed</p>
              </div>
              <p className="sonartra-type-caption text-white/46">{unansweredQuestions} remaining</p>
            </div>
          </div>

          <div className="sonartra-type-utility text-white/48 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-white" />
              Current
            </span>
            <span className="border-emerald-400/18 inline-flex items-center gap-2 rounded-full border bg-emerald-400/10 px-2.5 py-1 text-emerald-100">
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
                  className={cn(
                    'sonartra-motion-choice sonartra-type-nav sonartra-runner-map-item relative rounded-xl border px-2 py-2.5 text-center',
                    active
                      ? 'border-white bg-white text-neutral-950 shadow-[0_12px_24px_rgba(255,255,255,0.08)]'
                      : answered
                        ? 'border-emerald-400/18 hover:border-emerald-300/28 hover:bg-emerald-400/14 bg-emerald-400/10 text-white'
                        : 'text-white/58 hover:border-white/18 border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                >
                  <span>{index + 1}</span>
                  <span
                    className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${
                      active ? 'bg-neutral-950/45' : answered ? 'bg-emerald-200' : 'bg-white/28'
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
