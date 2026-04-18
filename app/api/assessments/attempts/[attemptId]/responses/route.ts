import { NextResponse } from 'next/server';

import { getDbPool } from '@/lib/server/db';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  requireCurrentUser,
  isAuthenticatedUserRequiredError,
  isClerkUserProfileRequiredError,
  isDisabledUserAccessError,
} from '@/lib/server/request-user';

type SaveResponseBody = {
  assessmentKey?: string;
  questionId?: string;
  selectedOptionId?: string;
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      attemptId: string;
    }>;
  },
) {
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

    const message = error instanceof Error ? error.message : 'internal_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!requestUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { attemptId } = await context.params;
  const body = (await request.json()) as SaveResponseBody;

  if (!body.assessmentKey || !body.questionId || !body.selectedOptionId) {
    return NextResponse.json(
      { error: 'assessmentKey, questionId, and selectedOptionId are required' },
      { status: 400 },
    );
  }

  const service = createAssessmentRunnerService({
    db: getDbPool(),
  });

  try {
    const result = await service.saveAssessmentResponse({
      userId: requestUser.userId,
      assessmentKey: body.assessmentKey,
      attemptId,
      questionId: body.questionId,
      selectedOptionId: body.selectedOptionId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error';
    const status =
      error instanceof Error && error.name === 'AssessmentRunnerValidationError'
        ? 400
        : error instanceof Error && error.name === 'AssessmentRunnerNotFoundError'
          ? 404
          : error instanceof Error && error.name === 'AssessmentRunnerForbiddenError'
            ? 403
            : error instanceof Error && error.name === 'AssessmentRunnerStateError'
              ? 409
              : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
