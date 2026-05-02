'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { getAssessmentCompletionSafeErrorMessage } from '@/lib/assessment/completion-error-copy';
import { getAssessmentLoaderMinimumVisibleMs } from '@/lib/assessment/loader-progress';
import {
  ASSESSMENT_PROCESSING_LONG_WAIT_MS,
  ASSESSMENT_PROCESSING_POLL_INTERVAL_MS,
  ASSESSMENT_PROCESSING_STATUS_RETRY_MS,
  hasAssessmentProcessingStatusCheckFailed,
  isAssessmentProcessingLongWait,
} from '@/lib/assessment/processing-state-policy';

type AssessmentProcessingStatusResponse = {
  status: 'processing' | 'ready' | 'error' | 'in_progress';
  resultId?: string | null;
  href?: string | null;
  lastError?: string | null;
};

type AssessmentProcessingStateProps = {
  assessmentKey: string;
  attemptId: string;
  stage: 'submitting' | 'processing' | 'redirecting';
  readyHref?: string | null;
};

const PROCESSING_REDIRECT_SETTLE_MS = 260;
const RESULT_TRANSITION_STEPS = [
  'Analysing response pattern',
  'Building your leadership profile',
  'Preparing your result',
] as const;

function formatFailureMessage(lastError: string | null): string {
  return getAssessmentCompletionSafeErrorMessage(lastError);
}

function formatLongProcessingMessage(stage: AssessmentProcessingStateProps['stage']): string {
  if (stage === 'submitting') {
    return 'We are still waiting for the completion service to confirm your submission. Keep this tab open while Sonartra finishes the handoff.';
  }

  return 'Your result is still being prepared. Sonartra will open the persisted report as soon as the canonical result is ready.';
}

function ProcessingShell({ children }: { children: ReactNode }) {
  return (
    <section className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-10 sm:px-6 lg:px-8">
      <div className="border-white/8 relative mx-auto w-full max-w-[42rem] overflow-hidden rounded-[1.65rem] border bg-[radial-gradient(circle_at_50%_0%,rgba(210,220,245,0.105),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.026),rgba(255,255,255,0.01))] px-6 py-8 shadow-[0_24px_72px_rgba(0,0,0,0.22)] sm:px-10 sm:py-10 md:px-12">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.26),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.014),transparent_30%,transparent_78%,rgba(255,255,255,0.01))]" />
        <div className="relative mx-auto max-w-[35rem] space-y-6">{children}</div>
      </div>
    </section>
  );
}

function ResultTransitionLogo() {
  return (
    <div
      aria-hidden="true"
      className="border-white/9 mx-auto flex h-14 w-[10rem] items-center justify-center rounded-2xl border bg-white/[0.024] px-5 shadow-[0_18px_42px_rgba(0,0,0,0.18)] sm:w-[10.75rem]"
    >
      <Image
        src="/images/brand/sonartra-logo-white.svg"
        alt=""
        width={6259}
        height={1529}
        className="h-auto w-full opacity-90"
        priority
      />
    </div>
  );
}

function getTransitionCopy(params: {
  stage: AssessmentProcessingStateProps['stage'];
  resolvedReadyHref: string | null;
}) {
  if (params.resolvedReadyHref && params.stage !== 'submitting') {
    return {
      title: 'Opening your report',
      subtitle: 'Your result is ready. Sonartra is taking you to the persisted report.',
    };
  }

  if (params.stage === 'submitting') {
    return {
      title: 'Submitting your responses',
      subtitle: 'Your answers are saved. Sonartra is moving them into result preparation.',
    };
  }

  return {
    title: 'Preparing your result',
    subtitle: 'Sonartra is building your leadership profile from the saved response pattern.',
  };
}

export function AssessmentProcessingState({
  assessmentKey,
  attemptId,
  stage,
  readyHref = null,
}: AssessmentProcessingStateProps) {
  const router = useRouter();
  const startedAtRef = useRef(Date.now());
  const redirectTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const longWaitTimerRef = useRef<number | null>(null);
  const stateHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [resolvedReadyHref, setResolvedReadyHref] = useState<string | null>(readyHref);
  const [pollFailure, setPollFailure] = useState<string | null>(null);
  const [recoveryHref, setRecoveryHref] = useState<string | null>(null);
  const [, setStatusCheckFailureCount] = useState(0);
  const [isLongWait, setIsLongWait] = useState(
    isAssessmentProcessingLongWait(Date.now() - startedAtRef.current),
  );

  useEffect(() => {
    if (readyHref) {
      setResolvedReadyHref(readyHref);
    }
  }, [readyHref]);

  useEffect(() => {
    if (!resolvedReadyHref) {
      return;
    }

    router.prefetch(resolvedReadyHref);
  }, [resolvedReadyHref, router]);

  useEffect(() => {
    if (resolvedReadyHref || pollFailure || isLongWait) {
      return;
    }

    const elapsedMs = Date.now() - startedAtRef.current;
    const remainingMs = Math.max(0, ASSESSMENT_PROCESSING_LONG_WAIT_MS - elapsedMs);

    longWaitTimerRef.current = window.setTimeout(() => {
      setIsLongWait(true);
    }, remainingMs);

    return () => {
      if (longWaitTimerRef.current !== null) {
        window.clearTimeout(longWaitTimerRef.current);
        longWaitTimerRef.current = null;
      }
    };
  }, [isLongWait, pollFailure, resolvedReadyHref]);

  useEffect(() => {
    if (stage !== 'processing' || resolvedReadyHref || pollFailure) {
      return;
    }

    let cancelled = false;

    async function checkStatus() {
      try {
        const response = await fetch(
          `/api/assessments/${assessmentKey}/attempts/${attemptId}/status`,
          {
            method: 'GET',
            headers: {
              'content-type': 'application/json',
            },
            cache: 'no-store',
          },
        );

        const body = (await response.json()) as AssessmentProcessingStatusResponse;

        if (!response.ok) {
          throw new Error(body.lastError ?? body.status ?? 'processing_status_unavailable');
        }

        if (cancelled) {
          return;
        }

        if (body.status === 'ready' && body.href) {
          setResolvedReadyHref(body.href);
          setPollFailure(null);
          setRecoveryHref(null);
          setStatusCheckFailureCount(0);
          return;
        }

        if (body.status === 'error') {
          setPollFailure(body.lastError ?? 'assessment_completion_failed');
          return;
        }

        if (body.status === 'in_progress') {
          setRecoveryHref(body.href ?? `/app/assessments/${assessmentKey}/attempts/${attemptId}`);
          setPollFailure('assessment_in_progress');
          return;
        }

        setPollFailure(null);
        setRecoveryHref(null);
        setStatusCheckFailureCount(0);
        pollTimerRef.current = window.setTimeout(
          checkStatus,
          ASSESSMENT_PROCESSING_POLL_INTERVAL_MS,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatusCheckFailureCount((current) => {
          const next = current + 1;

          if (hasAssessmentProcessingStatusCheckFailed(next)) {
            setPollFailure(
              error instanceof Error ? error.message : 'processing_status_unavailable',
            );
            return next;
          }

          pollTimerRef.current = window.setTimeout(
            checkStatus,
            ASSESSMENT_PROCESSING_STATUS_RETRY_MS,
          );
          return next;
        });
      }
    }

    void checkStatus();

    return () => {
      cancelled = true;
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [assessmentKey, attemptId, pollFailure, resolvedReadyHref, stage]);

  useEffect(() => {
    if (!resolvedReadyHref || (stage !== 'redirecting' && stage !== 'processing')) {
      return;
    }

    const elapsedMs = Date.now() - startedAtRef.current;
    const remainingVisibleMs = Math.max(
      0,
      getAssessmentLoaderMinimumVisibleMs('processing') - elapsedMs,
    );

    redirectTimerRef.current = window.setTimeout(() => {
      router.replace(resolvedReadyHref);
    }, remainingVisibleMs + PROCESSING_REDIRECT_SETTLE_MS);

    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [resolvedReadyHref, router, stage]);

  useEffect(() => {
    if (!pollFailure && !isLongWait) {
      return;
    }

    stateHeadingRef.current?.focus();
  }, [isLongWait, pollFailure]);

  if (pollFailure) {
    const isReturnToAssessment = pollFailure === 'assessment_in_progress' && recoveryHref;

    return (
      <ProcessingShell>
        <div role="alert" aria-live="assertive" aria-atomic="true" className="space-y-3">
          <p className="sonartra-report-kicker">Completion status</p>
          <h1
            ref={stateHeadingRef}
            tabIndex={-1}
            className="text-[1.95rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white outline-none sm:text-[2.2rem]"
          >
            {isReturnToAssessment ? 'Your assessment is still open' : 'We couldn&apos;t complete your result'}
          </h1>
          <p className="max-w-[32rem] text-[0.98rem] leading-7 text-white/60">
            {isReturnToAssessment
              ? 'This assessment is still open in the runner. Return to the assessment to continue from the saved attempt.'
              : formatFailureMessage(pollFailure)}
          </p>
        </div>

        <p className="max-w-[32rem] text-[0.95rem] leading-7 text-white/52">
          {isReturnToAssessment
            ? 'No result has been marked ready yet. Continue from the saved runner state.'
            : 'This assessment is no longer editable from the runner. Continue from your workspace.'}
        </p>

        <div className="flex flex-wrap gap-3 border-t border-white/8 pt-5">
          {isReturnToAssessment && recoveryHref ? (
            <Link
              href={recoveryHref}
              className="sonartra-button sonartra-button-secondary sonartra-focus-ring"
            >
              Return to assessment
            </Link>
          ) : null}
          <Link
            href={`/app/assessments#${assessmentKey}`}
            className="sonartra-button sonartra-button-secondary sonartra-focus-ring"
          >
            Back to workspace
          </Link>
        </div>
      </ProcessingShell>
    );
  }

  if (isLongWait) {
    return (
      <ProcessingShell>
        <div role="status" aria-live="polite" aria-atomic="true" className="space-y-3">
          <p className="sonartra-report-kicker">Completion status</p>
          <h1
            ref={stateHeadingRef}
            tabIndex={-1}
            className="text-[1.95rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white outline-none sm:text-[2.2rem]"
          >
            {stage === 'submitting'
              ? 'This is taking longer than expected'
              : 'Your result is still being prepared'}
          </h1>
          <p className="max-w-[32rem] text-[0.98rem] leading-7 text-white/60">
            {formatLongProcessingMessage(stage)}
          </p>
        </div>

        <div className="space-y-3 border-t border-white/8 pt-5">
          <p className="max-w-[32rem] text-[0.94rem] leading-7 text-white/52">
            {stage === 'processing'
              ? 'We are still checking the real persisted status in the background.'
              : 'Once the completion service confirms the handoff, Sonartra will continue into the persisted processing state automatically.'}
          </p>
          {stage === 'processing' ? (
            <p className="max-w-[32rem] text-[0.9rem] leading-7 text-white/46">
              If you leave this page, you can return from your workspace and open the assessment again.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/app/assessments#${assessmentKey}`}
            className="sonartra-button sonartra-button-secondary sonartra-focus-ring"
          >
            Back to workspace
          </Link>
        </div>
      </ProcessingShell>
    );
  }

  const transitionCopy = getTransitionCopy({ stage, resolvedReadyHref });

  return (
    <ProcessingShell>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-busy={!resolvedReadyHref}
        className="text-center"
      >
        <ResultTransitionLogo />

        <div className="mx-auto mt-7 max-w-[34rem] space-y-3">
          <p className="sonartra-report-kicker text-white/42">Result preparation</p>
          <h1 className="text-[2rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[2.35rem]">
            {transitionCopy.title}
          </h1>
          <p className="mx-auto max-w-[31rem] text-[0.98rem] leading-7 text-white/62">
            {transitionCopy.subtitle}
          </p>
        </div>

        <div className="mx-auto mt-7 grid max-w-[31rem] gap-2.5 text-left sm:grid-cols-3">
          {RESULT_TRANSITION_STEPS.map((step) => (
            <div
              key={step}
              className="border-white/8 rounded-xl border bg-white/[0.022] px-3.5 py-3"
            >
              <span className="block h-1.5 w-1.5 rounded-full bg-white/55" aria-hidden="true" />
              <span className="mt-2 block text-[0.78rem] font-medium leading-5 text-white/58">
                {step}
              </span>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-[29rem] text-[0.84rem] leading-6 text-white/42">
          This usually takes a few seconds.
        </p>
      </div>
    </ProcessingShell>
  );
}
