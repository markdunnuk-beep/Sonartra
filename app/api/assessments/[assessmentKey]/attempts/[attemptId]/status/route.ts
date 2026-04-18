import { NextResponse } from 'next/server';

import { getDbPool } from '@/lib/server/db';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  AssessmentRunnerForbiddenError,
  AssessmentRunnerNotFoundError,
} from '@/lib/server/assessment-runner-types';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import {
  requireCurrentUser,
  isAuthenticatedUserRequiredError,
  isClerkUserProfileRequiredError,
  isDisabledUserAccessError,
} from '@/lib/server/request-user';
import { getAssessmentResultHref } from '@/lib/utils/assessment-mode';

type AssessmentAttemptStatusRouteProps = {
  params: Promise<{
    assessmentKey: string;
    attemptId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: AssessmentAttemptStatusRouteProps,
) {
  let requestUser;

  try {
    requestUser = await requireCurrentUser();
  } catch (error) {
    if (isAuthenticatedUserRequiredError(error) || isClerkUserProfileRequiredError(error)) {
      return NextResponse.json({ lastError: 'unauthorized' }, { status: 401 });
    }

    if (isDisabledUserAccessError(error)) {
      return NextResponse.json({ lastError: 'forbidden' }, { status: 403 });
    }

    const message = error instanceof Error ? error.message : 'internal_error';
    return NextResponse.json({ lastError: message }, { status: 500 });
  }

  if (!requestUser) {
    return NextResponse.json({ lastError: 'unauthorized' }, { status: 401 });
  }

  const { assessmentKey, attemptId } = await params;
  const db = getDbPool();
  const runnerService = createAssessmentRunnerService({ db });
  const resultReadModel = createResultReadModelService({ db });

  try {
    const runner = await runnerService.getAssessmentRunnerViewModel({
      userId: requestUser.userId,
      assessmentKey,
      attemptId,
    });

    if (runner.status === 'ready' && runner.latestReadyResultId) {
      const readyResult = (await resultReadModel.listAssessmentResults({
        userId: requestUser.userId,
      })).find((result) => result.resultId === runner.latestReadyResultId);

      return NextResponse.json(
        {
          status: 'ready',
          resultId: runner.latestReadyResultId,
          href: getAssessmentResultHref(runner.latestReadyResultId, readyResult?.mode),
        },
        { status: 200 },
      );
    }

    if (runner.status === 'error') {
      return NextResponse.json(
        {
          status: 'error',
          lastError: runner.lastError ?? 'assessment_completion_failed',
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        status:
          runner.status === 'completed_processing' ? 'processing' : runner.status,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AssessmentRunnerNotFoundError) {
      return NextResponse.json({ lastError: error.message }, { status: 404 });
    }

    if (error instanceof AssessmentRunnerForbiddenError) {
      return NextResponse.json({ lastError: error.message }, { status: 403 });
    }

    const message = error instanceof Error ? error.message : 'internal_error';
    return NextResponse.json({ lastError: message }, { status: 500 });
  }
}
