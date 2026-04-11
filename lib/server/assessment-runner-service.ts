import { createAssessmentDefinitionRepository } from '@/lib/engine/repository';
import { getRunnerState } from '@/lib/assessment-runner/runner-state';
import type { Queryable } from '@/lib/engine/repository-sql';
import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';
import {
  getAttemptForRunner,
  getAttemptProgressCounts,
  getLatestResultStatusForAttempt,
  listRunnerQuestions,
  loadPersistedResponsesForRunner,
  resolveRunnerStatus,
  upsertResponseForAttempt,
  validateQuestionOptionForAttempt,
} from '@/lib/server/assessment-runner-queries';
import type {
  AssessmentRunnerEntryResolution,
  AssessmentRunnerSubmitResult,
  AssessmentRunnerViewModel,
  SaveAssessmentResponseResult,
} from '@/lib/server/assessment-runner-types';
import {
  AssessmentRunnerForbiddenError,
  AssessmentRunnerNotFoundError,
  AssessmentRunnerStateError,
  AssessmentRunnerValidationError,
} from '@/lib/server/assessment-runner-types';

export type AssessmentRunnerServiceDeps = {
  db: Queryable;
  definitionRepository?: Pick<
    ReturnType<typeof createAssessmentDefinitionRepository>,
    'getAssessmentDefinitionByVersion'
  >;
  lifecycleService?: ReturnType<typeof createAssessmentAttemptLifecycleService>;
  completionService?: ReturnType<typeof createAssessmentCompletionService>;
};

export type AssessmentRunnerService = {
  resolveAssessmentEntry(params: {
    userId: string;
    assessmentKey: string;
  }): Promise<AssessmentRunnerEntryResolution>;
  getAssessmentRunnerViewModel(params: {
    userId: string;
    assessmentKey: string;
    attemptId: string;
  }): Promise<AssessmentRunnerViewModel>;
  saveAssessmentResponse(params: {
    userId: string;
    assessmentKey: string;
    attemptId: string;
    questionId: string;
    selectedOptionId: string;
  }): Promise<SaveAssessmentResponseResult>;
  completeAssessmentAttempt(params: {
    userId: string;
    assessmentKey: string;
    attemptId: string;
  }): Promise<AssessmentRunnerSubmitResult>;
};

function getRunnerHref(params: { assessmentKey: string; attemptId: string }): string {
  return `/app/assessments/${params.assessmentKey}/attempts/${params.attemptId}`;
}

function getResultHref(resultId: string | null): string {
  return resultId ? `/app/results/${resultId}` : '/app/results';
}

function getWorkspaceHref(assessmentKey: string): string {
  return `/app/assessments#${assessmentKey}`;
}

async function loadOwnedAttemptOrThrow(
  db: Queryable,
  params: {
    userId: string;
    assessmentKey: string;
    attemptId: string;
  },
) {
  const attempt = await getAttemptForRunner(db, params.attemptId);
  if (!attempt) {
    throw new AssessmentRunnerNotFoundError(`Attempt ${params.attemptId} was not found`);
  }

  if (attempt.userId !== params.userId) {
    throw new AssessmentRunnerForbiddenError(
      `Attempt ${params.attemptId} does not belong to user ${params.userId}`,
    );
  }

  if (attempt.assessmentKey !== params.assessmentKey) {
    throw new AssessmentRunnerNotFoundError(
      `Attempt ${params.attemptId} does not belong to assessment ${params.assessmentKey}`,
    );
  }

  return attempt;
}

export function createAssessmentRunnerService(
  deps: AssessmentRunnerServiceDeps,
): AssessmentRunnerService {
  const lifecycleService =
    deps.lifecycleService ?? createAssessmentAttemptLifecycleService({ db: deps.db });
  const definitionRepository =
    deps.definitionRepository ?? createAssessmentDefinitionRepository({ db: deps.db });
  const completionService =
    deps.completionService ?? createAssessmentCompletionService({ db: deps.db });

  return {
    async resolveAssessmentEntry(params) {
      const lifecycle = await lifecycleService.getAssessmentAttemptLifecycle({
        userId: params.userId,
        assessmentKey: params.assessmentKey,
      });

      if (lifecycle.status === 'ready') {
        return {
          kind: 'result',
          assessmentKey: params.assessmentKey,
          resultId: lifecycle.latestResultId,
          href: getResultHref(lifecycle.latestResultId),
        };
      }

      if (lifecycle.status === 'completed_processing') {
        if (!lifecycle.attemptId) {
          return {
            kind: 'workspace',
            assessmentKey: params.assessmentKey,
            href: getWorkspaceHref(params.assessmentKey),
          };
        }

        return {
          kind: 'runner',
          assessmentKey: params.assessmentKey,
          attemptId: lifecycle.attemptId,
          href: getRunnerHref({
            assessmentKey: params.assessmentKey,
            attemptId: lifecycle.attemptId,
          }),
        };
      }

      if (lifecycle.status === 'error') {
        return {
          kind: 'workspace',
          assessmentKey: params.assessmentKey,
          href: getWorkspaceHref(params.assessmentKey),
        };
      }

      const startedLifecycle = await lifecycleService.startAssessmentAttempt({
        userId: params.userId,
        assessmentKey: params.assessmentKey,
      });

      if (!startedLifecycle.attemptId) {
        throw new AssessmentRunnerStateError(
          `Unable to resolve an in-progress attempt for assessment ${params.assessmentKey}`,
          startedLifecycle.status,
        );
      }

      return {
        kind: 'runner',
        assessmentKey: params.assessmentKey,
        attemptId: startedLifecycle.attemptId,
        href: getRunnerHref({
          assessmentKey: params.assessmentKey,
          attemptId: startedLifecycle.attemptId,
        }),
      };
    },

    async getAssessmentRunnerViewModel(params) {
      const attempt = await loadOwnedAttemptOrThrow(deps.db, params);
      const [questions, savedResponses, latestResult, progress, definition] = await Promise.all([
        listRunnerQuestions(deps.db, attempt.assessmentVersionId),
        loadPersistedResponsesForRunner(deps.db, attempt.attemptId),
        getLatestResultStatusForAttempt(deps.db, attempt.attemptId),
        getAttemptProgressCounts(deps.db, attempt.attemptId, attempt.assessmentVersionId),
        definitionRepository.getAssessmentDefinitionByVersion({
          assessmentVersionId: attempt.assessmentVersionId,
        }),
      ]);

      const runnerStatus = resolveRunnerStatus({
        attemptLifecycleStatus: attempt.lifecycleStatus,
        latestResult,
      });
      const projectedQuestions = questions.map((question) => ({
        ...question,
        selectedOptionId: savedResponses.get(question.questionId) ?? null,
      }));

      return {
        attemptId: attempt.attemptId,
        assessmentId: attempt.assessmentId,
        assessmentKey: attempt.assessmentKey,
        assessmentTitle: attempt.assessmentTitle,
        assessmentDescription: attempt.assessmentDescription,
        assessmentIntro: definition?.assessmentIntro ?? null,
        assessmentVersionId: attempt.assessmentVersionId,
        versionTag: attempt.versionTag,
        status: runnerStatus.status,
        runnerState: getRunnerState({
          answeredCount: progress.answeredQuestions,
          totalQuestions: progress.totalQuestions,
          attemptStatus: runnerStatus.status,
        }),
        totalQuestions: progress.totalQuestions,
        answeredQuestions: progress.answeredQuestions,
        completionPercentage: progress.completionPercentage,
        latestReadyResultId: runnerStatus.latestReadyResultId,
        lastError: runnerStatus.lastError,
        questions: Object.freeze(projectedQuestions),
      };
    },

    async saveAssessmentResponse(params) {
      const attempt = await loadOwnedAttemptOrThrow(deps.db, params);
      const latestResult = await getLatestResultStatusForAttempt(deps.db, attempt.attemptId);
      const runnerStatus = resolveRunnerStatus({
        attemptLifecycleStatus: attempt.lifecycleStatus,
        latestResult,
      });

      if (runnerStatus.status !== 'in_progress') {
        throw new AssessmentRunnerStateError(
          `Attempt ${attempt.attemptId} is not editable in status ${runnerStatus.status}`,
          runnerStatus.status,
        );
      }

      const validQuestionOption = await validateQuestionOptionForAttempt(deps.db, {
        attemptId: attempt.attemptId,
        questionId: params.questionId,
        selectedOptionId: params.selectedOptionId,
      });

      if (!validQuestionOption) {
        throw new AssessmentRunnerValidationError(
          `Question ${params.questionId} and option ${params.selectedOptionId} are not valid for attempt ${attempt.attemptId}`,
        );
      }

      await upsertResponseForAttempt(deps.db, {
        attemptId: attempt.attemptId,
        questionId: params.questionId,
        selectedOptionId: params.selectedOptionId,
      });

      const progress = await getAttemptProgressCounts(
        deps.db,
        attempt.attemptId,
        attempt.assessmentVersionId,
      );

      return {
        attemptId: attempt.attemptId,
        questionId: params.questionId,
        selectedOptionId: params.selectedOptionId,
        answeredQuestions: progress.answeredQuestions,
        totalQuestions: progress.totalQuestions,
        completionPercentage: progress.completionPercentage,
      };
    },

    async completeAssessmentAttempt(params) {
      await loadOwnedAttemptOrThrow(deps.db, params);

      const completion = await completionService.completeAssessmentAttempt({
        attemptId: params.attemptId,
        userId: params.userId,
      });

      if (completion.resultStatus === 'ready') {
        return {
          kind: 'ready',
          href: getResultHref(completion.resultId),
          completion,
        };
      }

      if (completion.resultStatus === 'processing') {
        return {
          kind: 'processing',
          href: getRunnerHref({
            assessmentKey: params.assessmentKey,
            attemptId: params.attemptId,
          }),
          completion,
        };
      }

      return {
        kind: 'error',
        href: getRunnerHref({
          assessmentKey: params.assessmentKey,
          attemptId: params.attemptId,
        }),
        completion,
      };
    },
  };
}
