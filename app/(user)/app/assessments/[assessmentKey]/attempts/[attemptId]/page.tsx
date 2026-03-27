import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AssessmentRunnerClient } from '@/app/(user)/app/assessments/[assessmentKey]/attempts/[attemptId]/assessment-runner-client';
import { getDbPool } from '@/lib/server/db';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  AssessmentRunnerForbiddenError,
  AssessmentRunnerNotFoundError,
} from '@/lib/server/assessment-runner-types';
import { getRequestUserId } from '@/lib/server/request-user';

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
    redirect(runner.latestReadyResultId ? `/app/results/${runner.latestReadyResultId}` : '/app/results');
  }

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-white/45">Assessment Runner</p>
        <h1 className="text-3xl font-semibold text-white">{runner.assessmentTitle}</h1>
        <p className="max-w-3xl text-sm text-white/65">
          {runner.assessmentDescription ?? 'Persisted assessment definition and response state.'}
        </p>
      </header>

      {runner.status === 'completed_processing' ? (
        <section className="sonartra-panel space-y-4">
          <h2 className="text-2xl font-semibold text-white">Processing result</h2>
          <p className="text-sm text-white/65">
            Your responses have been submitted. The canonical completion flow is still processing
            this attempt.
          </p>
          <div className="flex gap-3">
            <Link
              href="/app/results"
              className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Open results
            </Link>
            <Link
              href="/app/assessments"
              className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Back to workspace
            </Link>
          </div>
        </section>
      ) : null}

      {runner.status === 'error' ? (
        <section className="sonartra-panel space-y-4">
          <h2 className="text-2xl font-semibold text-white">Attempt needs review</h2>
          <p className="text-sm text-white/65">
            {runner.lastError
              ? `The last completion attempt failed: ${runner.lastError.replace(/_/g, ' ')}.`
              : 'The last completion attempt failed and cannot be edited from the runner.'}
          </p>
          <p className="text-sm text-white/55">
            MVP behavior keeps failed attempts out of the editable runner. Recovery happens from
            the assessment workspace.
          </p>
          <Link
            href={`/app/assessments#${runner.assessmentKey}`}
            className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Back to workspace
          </Link>
        </section>
      ) : null}

      {runner.status === 'in_progress' ? (
        <AssessmentRunnerClient userId={userId} runner={runner} />
      ) : null}
    </main>
  );
}
