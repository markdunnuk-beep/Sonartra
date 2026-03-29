import { createAssessmentDefinitionRepository, type AssessmentDefinitionRepository } from '@/lib/engine/repository';
import type { Queryable } from '@/lib/engine/repository-sql';
import { runAssessmentEngine } from '@/lib/engine/engine-runner';
import type { RuntimeResponseSet } from '@/lib/engine/types';
import {
  getAttemptForCompletion,
  getExistingResultForAttempt,
  loadPersistedResponsesForAttempt,
  markAttemptFailed,
  markAttemptReady,
  markAttemptSubmitted,
  upsertFailedResult,
  upsertProcessingResult,
  upsertReadyResult,
} from '@/lib/server/assessment-completion-queries';
import {
  AssessmentCompletionForbiddenError,
  AssessmentCompletionNotFoundError,
  AssessmentCompletionPersistenceError,
  AssessmentCompletionStateError,
  type AssessmentCompletionExecuteEngine,
  type AssessmentCompletionPersistedResponse,
  type AssessmentCompletionServiceResult,
} from '@/lib/server/assessment-completion-types';

export type AssessmentCompletionServiceDeps = {
  db: Queryable;
  repository?: AssessmentDefinitionRepository;
  executeEngine?: AssessmentCompletionExecuteEngine;
};

export type AssessmentCompletionService = {
  completeAssessmentAttempt(params: {
    attemptId: string;
    userId: string;
  }): Promise<AssessmentCompletionServiceResult>;
};

function toRuntimeResponseSet(params: {
  attemptId: string;
  assessmentKey: string;
  versionTag: string;
  responses: readonly AssessmentCompletionPersistedResponse[];
}): RuntimeResponseSet {
  const responsesByQuestionId = Object.fromEntries(
    params.responses.map((response) => [
      response.questionId,
      {
        responseId: response.responseId,
        attemptId: response.attemptId,
        questionId: response.questionId,
        value: {
          selectedOptionId: response.selectedOptionId,
        },
        updatedAt: response.updatedAt,
      },
    ]),
  );

  const submittedAt = params.responses.reduce<string | null>((latest, response) => {
    if (!latest || response.updatedAt > latest) {
      return response.updatedAt;
    }

    return latest;
  }, null);

  return {
    attemptId: params.attemptId,
    assessmentKey: params.assessmentKey,
    versionTag: params.versionTag,
    status: 'submitted',
    responsesByQuestionId,
    submittedAt,
  };
}

function toFailureReason(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'assessment_completion_failed';
}

export function createAssessmentCompletionService(
  deps: AssessmentCompletionServiceDeps,
): AssessmentCompletionService {
  const repository =
    deps.repository ??
    createAssessmentDefinitionRepository({
      db: deps.db,
    });
  const executeEngine = deps.executeEngine ?? runAssessmentEngine;

  return {
    async completeAssessmentAttempt(params) {
      const attempt = await getAttemptForCompletion(deps.db, params.attemptId);
      if (!attempt) {
        throw new AssessmentCompletionNotFoundError(`Attempt ${params.attemptId} was not found`);
      }

      if (attempt.userId !== params.userId) {
        throw new AssessmentCompletionForbiddenError(
          `Attempt ${params.attemptId} does not belong to user ${params.userId}`,
        );
      }

      const existingResult = await getExistingResultForAttempt(deps.db, attempt.attemptId);

      if (
        existingResult &&
        existingResult.readinessStatus === 'READY' &&
        existingResult.hasCanonicalResultPayload
      ) {
        return {
          success: true,
          attemptId: attempt.attemptId,
          resultId: existingResult.resultId,
          lifecycleStatus: 'ready',
          resultStatus: 'ready',
          hasResult: true,
          payloadReady: true,
          alreadyCompleted: true,
          error: null,
        };
      }

      if (existingResult && existingResult.readinessStatus === 'PROCESSING') {
        return {
          success: true,
          attemptId: attempt.attemptId,
          resultId: existingResult.resultId,
          lifecycleStatus: 'completed_processing',
          resultStatus: 'processing',
          hasResult: true,
          payloadReady: false,
          alreadyCompleted: true,
          error: null,
        };
      }

      const completableStatuses = new Set(['IN_PROGRESS', 'SUBMITTED', 'SCORED', 'FAILED']);
      if (!completableStatuses.has(attempt.lifecycleStatus)) {
        throw new AssessmentCompletionStateError(
          `Attempt ${attempt.attemptId} is not in a completable state: ${attempt.lifecycleStatus}`,
        );
      }

      const persistedResponses = await loadPersistedResponsesForAttempt(deps.db, attempt.attemptId);
      const responseSet = toRuntimeResponseSet({
        attemptId: attempt.attemptId,
        assessmentKey: attempt.assessmentKey,
        versionTag: attempt.versionTag,
        responses: persistedResponses,
      });

      await markAttemptSubmitted(deps.db, attempt.attemptId);

      const processingResultId = await upsertProcessingResult(deps.db, {
        attemptId: attempt.attemptId,
        assessmentId: attempt.assessmentId,
        assessmentVersionId: attempt.assessmentVersionId,
      });

      if (!processingResultId) {
        throw new AssessmentCompletionPersistenceError(
          `Unable to create processing result row for attempt ${attempt.attemptId}`,
        );
      }

      try {
        // Runtime bridge: the attempt is pinned to a concrete published version id,
        // so completion resolves the exact definition that attempt started against.
        const payload = await executeEngine({
          repository,
          assessmentVersionId: attempt.assessmentVersionId,
          responses: responseSet,
        });

        const resultId = await upsertReadyResult(deps.db, {
          attemptId: attempt.attemptId,
          assessmentId: attempt.assessmentId,
          assessmentVersionId: attempt.assessmentVersionId,
          payload,
        });

        if (!resultId) {
          throw new AssessmentCompletionPersistenceError(
            `Unable to persist ready result for attempt ${attempt.attemptId}`,
          );
        }

        await markAttemptReady(deps.db, attempt.attemptId);

        return {
          success: true,
          attemptId: attempt.attemptId,
          resultId,
          lifecycleStatus: 'ready',
          resultStatus: 'ready',
          hasResult: true,
          payloadReady: true,
          alreadyCompleted: false,
          error: null,
        };
      } catch (error) {
        const failureReason = toFailureReason(error);
        const resultId = await upsertFailedResult(deps.db, {
          attemptId: attempt.attemptId,
          assessmentId: attempt.assessmentId,
          assessmentVersionId: attempt.assessmentVersionId,
          failureReason,
        });
        await markAttemptFailed(deps.db, attempt.attemptId);

        if (!resultId) {
          throw new AssessmentCompletionPersistenceError(
            `Unable to persist failed result for attempt ${attempt.attemptId}`,
          );
        }

        throw error;
      }
    },
  };
}
