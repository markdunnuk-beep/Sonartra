import { NextResponse } from 'next/server';

import { getDbPool } from '@/lib/server/db';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';

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
  const userId = request.headers.get('x-user-id');
  if (!userId) {
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
      userId,
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
