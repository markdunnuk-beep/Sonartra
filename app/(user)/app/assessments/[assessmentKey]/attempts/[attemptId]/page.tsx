import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AssessmentRunnerClient } from '@/app/(user)/app/assessments/[assessmentKey]/attempts/[attemptId]/assessment-runner-client';
import { AssessmentProcessingState } from '@/components/assessment/assessment-processing-state';
import { ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE } from '@/lib/assessment/completion-error-copy';
import { getDbPool } from '@/lib/server/db';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  AssessmentRunnerForbiddenError,
  AssessmentRunnerNotFoundError,
} from '@/lib/server/assessment-runner-types';
import { getRequestUserId } from '@/lib/server/request-user';
import { getAssessmentResultHref } from '@/lib/utils/assessment-mode';

type AssessmentAttemptRunnerPageProps = {
  params: Promise<{
    assessmentKey: string;
    attemptId: string;
  }>;
};

export default async function AssessmentAttemptRunnerPage({
  params,
}: AssessmentAttemptRunnerPageProps) {
  const { assessmentKey, attemptId } = await params;
  const userId = await getRequestUserId();
  const service = createAssessmentRunnerService({
    db: getDbPool(),
  });

  let runner;
  try {
    runner = await service.getAssessmentRunnerViewModel({
      userId,
      assessmentKey,
      attemptId,
    });
  } catch (error) {
    if (
      error instanceof AssessmentRunnerNotFoundError ||
      error instanceof AssessmentRunnerForbiddenError
    ) {
      notFound();
    }

    throw error;
  }

  if (runner.status === 'ready') {
    redirect(
      runner.latestReadyResultId
        ? getAssessmentResultHref(runner.latestReadyResultId)
        : '/app/results',
    );
  }

  return (
    <main className="space-y-5">
      {runner.status === 'completed_processing' ? (
        <AssessmentProcessingState
          assessmentKey={runner.assessmentKey}
          attemptId={runner.attemptId}
          stage="processing"
        />
      ) : null}

      {runner.status === 'error' ? (
        <section className="border-white/7 relative overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top_left,rgba(145,168,214,0.09),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] px-7 py-8 shadow-[0_22px_62px_rgba(0,0,0,0.2)] sm:px-10 sm:py-10 md:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent_22%,transparent_78%,rgba(255,255,255,0.012))]" />
          <div className="relative mx-auto max-w-[35rem] space-y-6">
            <div className="space-y-3">
              <p className="sonartra-report-kicker">Completion status</p>
              <h2 className="text-[1.95rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[2.2rem]">
                We couldn&apos;t complete your result
              </h2>
              <p className="max-w-[32rem] text-[0.98rem] leading-7 text-white/60">
                {ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE}
              </p>
            </div>

            <p className="max-w-[32rem] text-[0.95rem] leading-7 text-white/52">
              This assessment is no longer editable here. Continue from your workspace.
            </p>

            <div className="flex flex-wrap gap-3 border-t border-white/8 pt-5">
              <Link
                href={`/app/assessments#${runner.assessmentKey}`}
                className="sonartra-button sonartra-button-secondary sonartra-focus-ring"
              >
                Back to workspace
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {runner.status === 'in_progress' ? (
        <AssessmentRunnerClient userId={userId} runner={runner} />
      ) : null}
    </main>
  );
}
