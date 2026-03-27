'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

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

export function AssessmentRunnerClient({
  userId,
  runner,
}: AssessmentRunnerClientProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
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
  const [isSubmitting, startSubmitting] = useTransition();
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const currentQuestion = runner.questions[currentQuestionIndex] ?? null;
  const totalQuestions = runner.totalQuestions;
  const canSubmit = answeredQuestions === totalQuestions && !isSaving && !isSubmitting && !saveError;

  function goToQuestion(index: number) {
    setCurrentQuestionIndex(Math.max(0, Math.min(index, runner.questions.length - 1)));
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

  function handleSubmit() {
    setSubmitError(null);

    startSubmitting(async () => {
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

      const body = (await response.json()) as {
        error?: string;
        resultId?: string | null;
        resultStatus?: 'ready' | 'processing' | 'failed';
      };

      if (!response.ok) {
        setSubmitError(body.error ?? 'Unable to complete assessment');
        router.refresh();
        return;
      }

      if (body.resultStatus === 'ready' && body.resultId) {
        router.push(`/app/results/${body.resultId}`);
        return;
      }

      router.refresh();
    });
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

  return (
    <div className="space-y-6">
      <section className="sonartra-panel space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-white/45">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
            <h2 className="text-2xl font-semibold text-white">{runner.assessmentTitle}</h2>
            <p className="text-sm text-white/65">
              {answeredQuestions} answered of {totalQuestions}. Progress {completionPercentage}%.
            </p>
          </div>
          <div className="text-sm text-white/55">
            {isSaving ? 'Saving latest selection...' : 'Selections save automatically.'}
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </section>

      <section className="sonartra-panel space-y-5">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-white/45">
            {currentQuestion.domainTitle}
          </p>
          <h3 className="text-2xl font-semibold text-white">{currentQuestion.prompt}</h3>
        </div>

        <div className="grid gap-3">
          {currentQuestion.options.map((option) => {
            const selected = selectedByQuestionId[currentQuestion.questionId] === option.optionId;

            return (
              <button
                key={option.optionId}
                type="button"
                onClick={() => handleSelect(currentQuestion.questionId, option.optionId)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? 'border-white bg-white text-neutral-950'
                    : 'border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/8'
                }`}
              >
                <div className="flex items-start gap-3">
                  {option.label ? (
                    <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      selected ? 'bg-neutral-950/10 text-neutral-950' : 'bg-white/10 text-white'
                    }`}>
                      {option.label}
                    </span>
                  ) : null}
                  <span className="text-sm leading-6">{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        {saveError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {saveError}
          </p>
        ) : null}

        {submitError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => goToQuestion(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/35"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => goToQuestion(currentQuestionIndex + 1)}
              disabled={currentQuestionIndex >= runner.questions.length - 1}
              className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/35"
            >
              Next
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/20 disabled:text-white/45"
          >
            {isSubmitting ? 'Submitting...' : 'Complete Assessment'}
          </button>
        </div>

        {!canSubmit ? (
          <p className="text-sm text-white/55">
            Completion is available once every question has a saved answer and no save is pending.
          </p>
        ) : null}
      </section>

      <section className="grid gap-2 md:grid-cols-5 xl:grid-cols-8">
        {runner.questions.map((question, index) => {
          const answered = selectedByQuestionId[question.questionId] !== null;
          const active = index === currentQuestionIndex;

          return (
            <button
              key={question.questionId}
              type="button"
              onClick={() => goToQuestion(index)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                active
                  ? 'border-white bg-white text-neutral-950'
                  : answered
                    ? 'border-white/20 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </section>
    </div>
  );
}
