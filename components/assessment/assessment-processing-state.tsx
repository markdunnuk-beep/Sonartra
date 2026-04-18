'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { AssessmentLoader } from '@/components/assessment/assessment-loader';
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

function formatFailureMessage(lastError: string | null): string {
  if (!lastError) {
    return 'Please return to your workspace and try again.';
  }

  return `Please return to your workspace. ${lastError.replace(/_/g, ' ')}.`;
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
      <div className="border-white/7 relative mx-auto w-full max-w-[44rem] overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top_left,rgba(145,168,214,0.09),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] px-7 py-8 shadow-[0_22px_62px_rgba(0,0,0,0.2)] sm:px-10 sm:py-10 md:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent_22%,transparent_78%,rgba(255,255,255,0.012))]" />
        <div className="relative mx-auto max-w-[35rem] space-y-6">{children}</div>
      </div>
    </section>
  );
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
  const [resolvedReadyHref, setResolvedReadyHref] = useState<string | null>(readyHref);
  const [pollFailure, setPollFailure] = useState<string | null>(null);
  const [recoveryHref, setRecoveryHref] = useState<string | null>(null);
  const [statusCheckFailureCount, setStatusCheckFailureCount] = useState(0);
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

  if (pollFailure) {
    const isReturnToAssessment = pollFailure === 'assessment_in_progress' && recoveryHref;

    return (
      <ProcessingShell>
        <div className="space-y-3">
          <p className="sonartra-report-kicker">Completion status</p>
          <h1 className="text-[1.95rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[2.2rem]">
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
        <div className="space-y-3">
          <p className="sonartra-report-kicker">Completion status</p>
          <h1 className="text-[1.95rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[2.2rem]">
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

  return (
    <AssessmentLoader
      title="Analysing your response patterns"
      subtitle="Building your behavioural profile"
      variant="processing"
      progressMode="simulated"
      isComplete={Boolean(resolvedReadyHref) && stage !== 'submitting'}
    />
  );
}
