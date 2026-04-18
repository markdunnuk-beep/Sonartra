'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

import { AssessmentProcessingState } from '@/components/assessment/assessment-processing-state';
import { cn } from '@/components/shared/user-app-ui';
import { getRunnerState } from '@/lib/assessment-runner/runner-state';
import {
  getResumeQuestionIndex,
  shouldShowAssessmentIntro,
} from '@/lib/assessment-runner/runner-ux';
import type { AssessmentRunnerViewModel } from '@/lib/server/assessment-runner-types';
import type { AssessmentMode } from '@/lib/types/assessment';
import { getAssessmentResultHref } from '@/lib/utils/assessment-mode';

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
  mode?: AssessmentMode;
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

function RunnerMetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sonartra-runner-meta-stat">
      <p className="sonartra-runner-meta-label">{label}</p>
      <p className="sonartra-runner-meta-value">{value}</p>
    </div>
  );
}

function getAutosaveStateLabel(params: {
  completionState: CompletionUiState;
  isSaving: boolean;
  saveError: string | null;
}): string {
  if (params.completionState !== 'idle') {
    return 'Submitting responses';
  }

  if (params.saveError) {
    return 'Needs attention';
  }

  if (params.isSaving) {
    return 'Saving response';
  }

  return 'Responses saved';
}

function getRunnerModeCopy(params: {
  runnerState: ReturnType<typeof getRunnerState>;
  currentQuestionNumber: number;
  totalQuestions: number;
  isFinalQuestion: boolean;
}) {
  if (params.runnerState === 'ANSWERED_AWAITING_SUBMIT') {
    return {
      modeLabel: 'Review Mode',
      modeTitle: 'All questions answered',
      modeDescription:
        'Everything is answered. Review any response before you complete the assessment.',
      navigationLabel: 'Review Question',
      nextLabel: 'Next Response',
      finalActionHint: 'You can continue reviewing responses before you complete the assessment.',
    };
  }

  return {
    modeLabel: 'In Progress',
    modeTitle: `Question ${params.currentQuestionNumber} of ${params.totalQuestions}`,
    modeDescription: params.isFinalQuestion
      ? 'Finish this question to move into final review.'
      : 'Answer the current question to keep moving through the assessment.',
    navigationLabel: 'Question',
    nextLabel: 'Next',
    finalActionHint: 'Complete the remaining questions to move into final review.',
  };
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
  const [completionReadyHref, setCompletionReadyHref] = useState<string | null>(null);
  const [compactNavigatorOpen, setCompactNavigatorOpen] = useState(false);
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
  const canSubmit =
    answeredQuestions === totalQuestions && !isSaving && completionState === 'idle' && !saveError;
  const interactionLocked = completionState !== 'idle';
  const showCompleteAction = isFinalQuestion || completionState !== 'idle' || submitError !== null;
  const showReviewHandoff = runnerState === 'ANSWERED_AWAITING_SUBMIT';
  const showFooterCompleteAction = showCompleteAction && !showReviewHandoff;
  const mobileOrientationLabel =
    runnerState === 'ANSWERED_AWAITING_SUBMIT'
      ? 'Ready to complete'
      : `${unansweredQuestions} remaining`;
  const currentQuestionNumber = currentQuestionIndex + 1;
  const activePhase = showIntro ? 'intro' : completionState !== 'idle' ? 'completion' : 'question';
  const autosaveStateLabel = getAutosaveStateLabel({
    completionState,
    isSaving,
    saveError,
  });
  const modeCopy = getRunnerModeCopy({
    runnerState,
    currentQuestionNumber,
    totalQuestions,
    isFinalQuestion,
  });

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
    setCompactNavigatorOpen(false);
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
    setCompletionReadyHref(null);
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
        setCompletionReadyHref(getAssessmentResultHref(body.resultId, body.mode));
        return;
      }

      if (body.resultStatus === 'processing') {
        setCompletionState('processing');
        return;
      }

      setSubmitError(body.error ?? 'Completion could not be finalized.');
      setCompletionReadyHref(null);
      setCompletionState('idle');
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to complete assessment');
      setCompletionReadyHref(null);
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
        <h1 className="sonartra-type-page-title">Assessment unavailable</h1>
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

  if (completionState !== 'idle') {
    return (
      <AssessmentProcessingState
        assessmentKey={runner.assessmentKey}
        attemptId={runner.attemptId}
        stage={completionState}
        readyHref={completionReadyHref}
      />
    );
  }

  if (showIntro && runner.assessmentIntro) {
    return (
      <div
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start"
        data-runner-phase="intro"
      >
        <div className="space-y-4">
          <header className="px-1">
            <p className="sonartra-type-eyebrow text-white/42">Assessment runner</p>
            <h1 className="sonartra-type-page-title mt-2 max-w-[16ch]">{runner.assessmentTitle}</h1>
          </header>

          <section
            className="sonartra-motion-reveal sonartra-panel sonartra-runner-stage overflow-hidden p-5 sm:p-6 lg:p-7"
            style={getRevealStyle(0)}
            aria-labelledby="assessment-intro-title"
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
                    <h2
                      id="assessment-intro-title"
                      className="sonartra-type-page-title max-w-[16ch] text-[2.15rem] sm:text-[2.55rem] lg:text-[2.9rem]"
                    >
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
                    <p className="sonartra-type-body-secondary text-white/56 max-w-[32rem]">
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
      className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start"
      data-runner-phase={activePhase}
      data-runner-state={runnerState}
    >
      <div className="space-y-3">
        <header className="px-1">
          <p className="sonartra-type-eyebrow text-white/42">Assessment runner</p>
          <h1 className="sonartra-type-page-title mt-2 max-w-[16ch]">{runner.assessmentTitle}</h1>
          <p className="sonartra-type-body-secondary text-white/58 mt-2 max-w-[42rem]">
            {showReviewHandoff
              ? 'All responses are in place. Review freely, then complete the assessment when ready.'
              : 'Work through each question in order. Responses save automatically as you go.'}
          </p>
        </header>

        <nav
          className="sticky top-3 z-20 xl:hidden"
          data-runner-mobile-nav
          aria-label="Question navigator"
        >
          <div className="sonartra-runner-mobile-orientation rounded-[1.25rem] border border-white/10 px-3.5 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="sonartra-type-eyebrow text-white/42">Assessment focus</p>
                <div className="mt-1 flex items-end gap-3">
                  <p className="sonartra-type-section-title text-[1.15rem]">
                    {currentQuestionNumber}/{totalQuestions}
                  </p>
                  <p className="sonartra-type-caption text-white/52 pb-0.5">
                    {mobileOrientationLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-controls="runner-compact-navigator"
                aria-expanded={compactNavigatorOpen}
                aria-label={
                  compactNavigatorOpen ? 'Hide question navigator' : 'Open question navigator'
                }
                onClick={() => setCompactNavigatorOpen((current) => !current)}
                className={getRunnerButtonClass({
                  variant: 'secondary',
                  minWidthClassName: 'min-w-[8.75rem]',
                })}
              >
                {compactNavigatorOpen ? 'Hide Navigator' : 'Question Navigator'}
              </button>
            </div>

            {compactNavigatorOpen ? (
              <div
                id="runner-compact-navigator"
                className="sonartra-motion-reveal-soft border-white/8 mt-3 space-y-3 border-t pt-3"
                role="region"
                aria-label="Question navigator sheet"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="sonartra-type-body-secondary text-white/58">
                    Jump to any question without leaving the runner.
                  </p>
                  <p className="sonartra-type-caption text-white/46">
                    {showReviewHandoff ? 'Review mode' : `${unansweredQuestions} remaining`}
                  </p>
                </div>

                <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
                  {runner.questions.map((question, index) => {
                    const answered = selectedByQuestionId[question.questionId] !== null;
                    const active = index === currentQuestionIndex;

                    return (
                      <button
                        key={question.questionId}
                        type="button"
                        onClick={() => goToQuestion(index)}
                        disabled={interactionLocked}
                        aria-label={`Jump to question ${index + 1}${active ? ', current' : ''}${answered ? ', answered' : ', unanswered'}`}
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
              </div>
            ) : null}
          </div>
        </nav>

        <section
          className="sonartra-motion-reveal sonartra-motion-stage-2 sonartra-panel sonartra-runner-stage min-h-[34rem] space-y-5 p-5 lg:p-6"
          style={getRevealStyle(1)}
          aria-labelledby="runner-question-title"
        >
          <div
            key={currentQuestion.questionId}
            className="sonartra-motion-reveal-soft flex min-h-[30rem] flex-col justify-between space-y-5"
            style={getRevealStyle(0)}
          >
            <div className="space-y-5">
              <div className="sonartra-motion-status border-white/8 rounded-[1rem] border bg-white/[0.03] px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="sonartra-type-eyebrow flex flex-wrap items-center gap-2 text-white/40">
                      <span>Assessment Runner</span>
                      <span className="text-white/22">/</span>
                      <span>{runner.assessmentTitle}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'sonartra-type-caption inline-flex items-center rounded-full border px-3 py-1.5',
                          runnerState === 'ANSWERED_AWAITING_SUBMIT'
                            ? 'border-emerald-400/18 bg-emerald-400/10 text-emerald-100'
                            : 'border-white/10 bg-white/[0.03] text-white/60',
                        )}
                      >
                        {modeCopy.modeLabel}
                      </span>
                      <p className="sonartra-type-nav text-white/82">
                        {modeCopy.navigationLabel} {currentQuestionNumber} of {totalQuestions}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <span
                      aria-live="polite"
                      className={cn(
                        'sonartra-type-caption inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-white/60',
                        saveError
                          ? 'border-red-400/25 bg-red-500/10 text-red-100'
                          : 'border-white/10 bg-white/[0.03]',
                      )}
                    >
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          saveError ? 'bg-red-300' : isSaving ? 'bg-amber-300' : 'bg-emerald-200',
                        )}
                      />
                      {autosaveStateLabel}
                    </span>
                    <span className="sonartra-type-caption text-white/48">
                      {completionPercentage}%
                    </span>
                  </div>
                </div>
                <div className="bg-white/8 mt-3 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="sonartra-motion-progress h-full rounded-full bg-white"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <span className="sonartra-status sonartra-status-neutral">
                  {currentQuestion.domainTitle}
                </span>

                {showReviewHandoff ? (
                  <div className="sonartra-motion-reveal-soft sonartra-runner-review-handoff border-white/12 rounded-[1.4rem] border bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.24)] sm:p-5">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                      <div className="max-w-[42rem] space-y-4">
                        <div className="space-y-2">
                          <p className="sonartra-type-eyebrow text-white/46">
                            Completion checkpoint
                          </p>
                          <h2 className="sonartra-type-section-title text-[1.55rem] leading-[1.04] text-white sm:text-[1.8rem]">
                            Ready to complete
                          </h2>
                          <p className="sonartra-type-body-secondary text-white/68 max-w-[34rem]">
                            Your response set is complete. You can still move through the assessment
                            and change any answer before final submission.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="border-emerald-400/18 inline-flex items-center rounded-full border bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-100">
                            All questions answered
                          </span>
                          <span className="text-white/72 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm">
                            Response set complete
                          </span>
                          <span className="text-white/72 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm">
                            Assessment ready to complete
                          </span>
                        </div>

                        <p className="sonartra-type-body-secondary text-white/56 max-w-[36rem]">
                          Completing the assessment finalises your responses and moves Sonartra into
                          results preparation.
                        </p>
                      </div>

                      <div className="flex min-w-[15rem] flex-col items-stretch gap-2 lg:max-w-[16rem]">
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={!canSubmit}
                          aria-label="Complete the assessment and submit your responses"
                          className={getRunnerButtonClass({
                            variant: 'primary',
                            disabled: !canSubmit,
                            minWidthClassName:
                              'min-w-[12rem] shadow-[0_18px_40px_rgba(255,255,255,0.1)]',
                          })}
                        >
                          Complete Assessment
                        </button>
                        <p className="sonartra-type-caption text-white/44">
                          Review remains available until you choose to complete.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p
                    className={cn(
                      'sonartra-type-caption uppercase tracking-[0.22em]',
                      runnerState === 'ANSWERED_AWAITING_SUBMIT'
                        ? 'text-emerald-100/72'
                        : 'text-white/42',
                    )}
                  >
                    {modeCopy.modeTitle}
                  </p>
                  <p className="sonartra-type-body-secondary text-white/62 max-w-[46rem]">
                    {modeCopy.modeDescription}
                  </p>
                </div>
                <h2
                  id="runner-question-title"
                  className="sonartra-type-section-title max-w-[30ch] text-[2rem] leading-[1.02] sm:text-[2.25rem] lg:text-[2.7rem]"
                >
                  {currentQuestion.prompt}
                </h2>
              </div>

              <fieldset className="grid gap-3">
                <legend className="sr-only">{currentQuestion.prompt}</legend>
                {currentQuestion.options.map((option, index) => {
                  const selected =
                    selectedByQuestionId[currentQuestion.questionId] === option.optionId;
                  const optionInputId = `runner-option-${currentQuestion.questionId}-${option.optionId}`;

                  return (
                    <label key={option.optionId} htmlFor={optionInputId} className="block">
                      <input
                        id={optionInputId}
                        type="radio"
                        name={`question-${currentQuestion.questionId}`}
                        value={option.optionId}
                        checked={selected}
                        onChange={() => handleSelect(currentQuestion.questionId, option.optionId)}
                        disabled={interactionLocked}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          'sonartra-motion-choice sonartra-runner-option block rounded-[1.15rem] border px-5 py-4 text-left transition peer-focus-visible:ring-2 peer-focus-visible:ring-white/55 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-neutral-950',
                          selected
                            ? 'ring-white/12 border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,255,0.94))] text-neutral-950 shadow-[0_18px_38px_rgba(255,255,255,0.08)] ring-1'
                            : 'hover:border-white/24 border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.055]',
                          interactionLocked && 'cursor-not-allowed opacity-70',
                        )}
                      >
                        <span className="flex items-start gap-3">
                          {option.label ? (
                            <span
                              className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                                selected
                                  ? 'bg-neutral-950/10 text-neutral-950'
                                  : 'bg-white/10 text-white'
                              }`}
                              aria-hidden="true"
                            >
                              {option.label}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span className="sonartra-type-body block max-w-[54ch] text-[0.98rem] leading-7 text-inherit lg:text-[1.05rem]">
                              {option.text}
                            </span>
                          </span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
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
                  <p className="sonartra-type-eyebrow text-white/40">Completion status</p>
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
                    aria-label={
                      runnerState === 'ANSWERED_AWAITING_SUBMIT'
                        ? 'Go to previous response'
                        : 'Go to previous question'
                    }
                    className={getRunnerButtonClass({
                      disabled: currentQuestionIndex === 0 || interactionLocked,
                      minWidthClassName: 'min-w-[7rem]',
                    })}
                  >
                    {runnerState === 'ANSWERED_AWAITING_SUBMIT' ? 'Previous Response' : 'Back'}
                  </button>
                  {!isFinalQuestion ? (
                    <button
                      type="button"
                      onClick={() => goToQuestion(currentQuestionIndex + 1)}
                      disabled={interactionLocked}
                      aria-label={
                        runnerState === 'ANSWERED_AWAITING_SUBMIT'
                          ? 'Go to next response'
                          : 'Go to next question'
                      }
                      className={getRunnerButtonClass({
                        variant:
                          runnerState === 'ANSWERED_AWAITING_SUBMIT' ? 'secondary' : 'primary',
                        disabled: interactionLocked,
                        minWidthClassName: 'min-w-[8rem]',
                      })}
                    >
                      {modeCopy.nextLabel}
                    </button>
                  ) : unansweredQuestions > 0 ? (
                    <button
                      type="button"
                      onClick={goToFirstUnanswered}
                      disabled={interactionLocked}
                      aria-label="Go to the next unanswered question"
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

                {showFooterCompleteAction ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    aria-label="Complete the assessment and submit your responses"
                    className={getRunnerButtonClass({
                      variant: 'primary',
                      disabled: !canSubmit,
                      minWidthClassName: 'min-w-[12rem]',
                    })}
                  >
                    Complete Assessment
                  </button>
                ) : null}
              </div>

              {(showFooterCompleteAction || showReviewHandoff) &&
              !canSubmit &&
              completionState === 'idle' ? (
                <p className="sonartra-type-body-secondary text-white/52">
                  {unansweredQuestions > 0
                    ? `Complete the remaining ${unansweredQuestions} question${unansweredQuestions === 1 ? '' : 's'} before submitting.`
                    : modeCopy.finalActionHint}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {showReviewHandoff ? (
          <aside
            className="sticky bottom-3 z-20 xl:hidden"
            data-runner-mobile-review-bar
            aria-label="Review completion actions"
          >
            <div className="sonartra-runner-mobile-review-bar rounded-[1.35rem] border border-white/10 px-3.5 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="sonartra-type-eyebrow text-white/42">Completion</p>
                  <p className="sonartra-type-nav text-white/82 mt-1">Ready to complete</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCompactNavigatorOpen(true)}
                    aria-label="Open question navigator to review responses"
                    className={getRunnerButtonClass({
                      variant: 'secondary',
                      minWidthClassName: 'min-w-[6.75rem]',
                    })}
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    aria-label="Complete the assessment and submit your responses"
                    className={getRunnerButtonClass({
                      variant: 'primary',
                      disabled: !canSubmit,
                      minWidthClassName: 'min-w-[10rem]',
                    })}
                  >
                    Complete Assessment
                  </button>
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      <aside className="hidden xl:sticky xl:top-6 xl:block">
        <section
          className="sonartra-motion-reveal sonartra-motion-stage-3 sonartra-panel sonartra-runner-support-card space-y-4 p-4"
          style={getRevealStyle(2)}
          aria-labelledby="runner-desktop-nav-title"
        >
          <div className="space-y-2">
            <p id="runner-desktop-nav-title" className="sonartra-type-eyebrow text-white/46">
              Question navigator
            </p>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="sonartra-type-section-title text-2xl">
                  {answeredQuestions}/{totalQuestions}
                </p>
                <p className="sonartra-type-body-secondary text-white/58">
                  {runnerState === 'ANSWERED_AWAITING_SUBMIT'
                    ? 'Responses ready for review'
                    : 'Questions completed'}
                </p>
              </div>
              <p className="sonartra-type-caption text-white/46">
                {runnerState === 'ANSWERED_AWAITING_SUBMIT'
                  ? 'Ready to submit'
                  : `${unansweredQuestions} remaining`}
              </p>
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

          <nav className="grid grid-cols-5 gap-2" aria-label="Question navigator">
            {runner.questions.map((question, index) => {
              const answered = selectedByQuestionId[question.questionId] !== null;
              const active = index === currentQuestionIndex;

              return (
                <button
                  key={question.questionId}
                  type="button"
                  onClick={() => goToQuestion(index)}
                  disabled={interactionLocked}
                  aria-label={`Jump to question ${index + 1}${active ? ', current' : ''}${answered ? ', answered' : ', unanswered'}`}
                  className={cn(
                    'sonartra-motion-choice sonartra-type-nav sonartra-runner-map-item relative rounded-xl border px-2 py-2.5 text-center',
                    active
                      ? 'ring-white/12 border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,255,0.94))] text-neutral-950 shadow-[0_14px_30px_rgba(255,255,255,0.1)] ring-1'
                      : answered
                        ? 'border-emerald-400/18 hover:border-emerald-300/28 hover:bg-emerald-400/14 bg-emerald-400/10 text-white'
                        : 'text-white/58 hover:border-white/18 border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                >
                  <span>{index + 1}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${
                      active ? 'bg-neutral-950/45' : answered ? 'bg-emerald-200' : 'bg-white/28'
                    }`}
                  />
                </button>
              );
            })}
          </nav>
        </section>
      </aside>
    </div>
  );
}
