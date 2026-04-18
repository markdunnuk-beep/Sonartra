'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AssessmentLoader } from '@/components/assessment/assessment-loader';
import { getAssessmentLoaderMinimumVisibleMs } from '@/lib/assessment/loader-progress';

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

const PROCESSING_POLL_INTERVAL_MS = 1200;
const PROCESSING_REDIRECT_SETTLE_MS = 220;

function formatFailureMessage(lastError: string | null): string {
  if (!lastError) {
    return 'The canonical completion flow did not finish successfully.';
  }

  return `The canonical completion flow failed: ${lastError.replace(/_/g, ' ')}.`;
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
  const [resolvedReadyHref, setResolvedReadyHref] = useState<string | null>(readyHref);
  const [pollFailure, setPollFailure] = useState<string | null>(null);

  useEffect(() => {
    if (readyHref) {
      setResolvedReadyHref(readyHref);
    }
  }, [readyHref]);

  useEffect(() => {
    if (stage !== 'processing' || resolvedReadyHref) {
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
          return;
        }

        if (body.status === 'error') {
          setPollFailure(body.lastError ?? 'assessment_completion_failed');
          return;
        }

        pollTimerRef.current = window.setTimeout(checkStatus, PROCESSING_POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPollFailure(
          error instanceof Error ? error.message : 'processing_status_unavailable',
        );
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
  }, [assessmentKey, attemptId, resolvedReadyHref, stage]);

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
    return (
      <section className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-10 sm:px-6 lg:px-8">
        <div className="sonartra-card mx-auto w-full max-w-[40rem] space-y-5 px-7 py-8 sm:px-10 sm:py-10">
          <div className="space-y-2">
            <p className="sonartra-type-eyebrow text-white/40">Completion status</p>
            <h1 className="text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[1.85rem]">
              Processing could not be completed
            </h1>
            <p className="max-w-[34rem] text-sm leading-7 text-white/60 sm:text-[0.95rem]">
              {formatFailureMessage(pollFailure)}
            </p>
          </div>

          <p className="text-sm leading-7 text-white/52">
            This attempt is no longer editable from the runner. Return to the assessment workspace
            to continue from the canonical lifecycle state.
          </p>

          <div className="flex flex-wrap gap-3 border-t border-white/8 pt-4">
            <Link
              href={`/app/assessments#${assessmentKey}`}
              className="sonartra-button sonartra-button-secondary sonartra-focus-ring"
            >
              Back to workspace
            </Link>
          </div>
        </div>
      </section>
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
