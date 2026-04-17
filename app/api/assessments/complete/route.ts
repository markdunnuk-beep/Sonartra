import { Pool } from 'pg';
import { NextResponse } from 'next/server';

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

    if (isDisabledUserAccessError(error)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const message = error instanceof Error ? error.message : 'internal_error';
    return NextResponse.json({ error: message }, { status: 500 });
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
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof AssessmentCompletionForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof AssessmentCompletionStateError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof AssessmentCompletionPersistenceError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const message = error instanceof Error ? error.message : 'internal_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
