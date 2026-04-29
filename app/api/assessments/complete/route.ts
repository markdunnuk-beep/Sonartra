import { Pool } from 'pg';
import { NextResponse } from 'next/server';

import { ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE } from '@/lib/assessment/completion-error-copy';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';
import {
  AssessmentCompletionForbiddenError,
  AssessmentCompletionNotFoundError,
  AssessmentCompletionPersistenceError,
  AssessmentCompletionStateError,
} from '@/lib/server/assessment-completion-types';
import {
  requireCurrentUser,
  isAuthenticatedUserRequiredError,
  isClerkUserProfileRequiredError,
  isDisabledUserAccessError,
} from '@/lib/server/request-user';

const globalForAssessmentCompletion = globalThis as typeof globalThis & {
  sonartraCompletionPool?: Pool;
};

function getPool(): Pool {
  if (!globalForAssessmentCompletion.sonartraCompletionPool) {
    globalForAssessmentCompletion.sonartraCompletionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return globalForAssessmentCompletion.sonartraCompletionPool;
}

type CompletionRequestBody = {
  attemptId?: string;
};

export async function POST(request: Request) {
  let requestUser;

  try {
    requestUser = await requireCurrentUser();
  } catch (error) {
    if (isAuthenticatedUserRequiredError(error)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (isClerkUserProfileRequiredError(error)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (isDisabledUserAccessError(error)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    console.error('[assessment-completion] user resolution failed', error);
    return NextResponse.json({ error: ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE }, { status: 500 });
  }

  if (!requestUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as CompletionRequestBody;
  if (!body.attemptId) {
    return NextResponse.json({ error: 'attemptId is required' }, { status: 400 });
  }

  const service = createAssessmentCompletionService({
    db: getPool(),
  });

  try {
    const result = await service.completeAssessmentAttempt({
      attemptId: body.attemptId,
      userId: requestUser.userId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AssessmentCompletionNotFoundError) {
      console.error('[assessment-completion] attempt not found', error);
      return NextResponse.json({ error: ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE }, { status: 404 });
    }

    if (error instanceof AssessmentCompletionForbiddenError) {
      console.error('[assessment-completion] forbidden attempt access', error);
      return NextResponse.json({ error: ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE }, { status: 403 });
    }

    if (error instanceof AssessmentCompletionStateError) {
      console.error('[assessment-completion] invalid completion state', error);
      return NextResponse.json({ error: ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE }, { status: 409 });
    }

    if (error instanceof AssessmentCompletionPersistenceError) {
      console.error('[assessment-completion] persistence failure', error);
      return NextResponse.json({ error: ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE }, { status: 500 });
    }

    console.error('[assessment-completion] completion failure', error);
    return NextResponse.json({ error: ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE }, { status: 500 });
  }
}
