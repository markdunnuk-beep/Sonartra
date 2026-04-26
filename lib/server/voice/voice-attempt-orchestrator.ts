import type { Queryable } from '@/lib/engine/repository-sql';
import {
  AssessmentLifecycleNotFoundError,
  InvalidAssessmentLifecycleDataError,
  createAssessmentAttemptLifecycleService,
} from '@/lib/server/assessment-attempt-lifecycle';
import { getPublishedAssessmentSummaryByKey } from '@/lib/server/assessment-attempt-lifecycle-queries';
import { createVoiceQuestionDeliveryService } from '@/lib/server/voice/voice-question-delivery';
import { getVoiceAssessmentSupportState } from '@/lib/server/voice/voice-feature';

type AssessmentRecordRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_title: string;
  assessment_description: string | null;
};

type PublishedAssessmentMetadataRow = AssessmentRecordRow & {
  assessment_version_id: string;
  version_tag: string;
};

export type VoicePreparedAssessmentQuestionOption = {
  optionId: string;
  label: string | null;
  text: string;
};

export type VoicePreparedAssessmentQuestion = {
  questionId: string;
  questionNumber: number;
  prompt: string;
  options: readonly VoicePreparedAssessmentQuestionOption[];
  selectedOptionId: string | null;
};

export type VoicePreparedAssessmentData = {
  assessment: {
    assessmentId: string;
    assessmentKey: string;
    title: string;
    description: string | null;
    assessmentVersionId: string;
    versionTag: string;
  };
  attempt: {
    attemptId: string;
    status: 'ready_to_start' | 'resumed_in_progress' | 'all_questions_answered';
    lifecycleStatus: 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error';
  };
  delivery: {
    totalQuestionCount: number;
    answeredQuestionCount: number;
    currentQuestionIndex: number | null;
    currentQuestionNumber: number | null;
    currentQuestion: VoicePreparedAssessmentQuestion | null;
    questions: readonly VoicePreparedAssessmentQuestion[];
  };
};

export type VoiceAssessmentPreparationResult =
  | {
      state:
        | 'feature_disabled'
        | 'unsupported_assessment'
        | 'assessment_not_found'
        | 'no_published_version'
        | 'attempt_unavailable';
      data: null;
      error: string | null;
    }
  | {
      state: 'ready_to_start' | 'resumed_in_progress' | 'all_questions_answered';
      data: VoicePreparedAssessmentData;
      error: null;
    };

async function getAssessmentRecordByKey(
  db: Queryable,
  assessmentKey: string,
): Promise<AssessmentRecordRow | null> {
  const result = await db.query<AssessmentRecordRow>(
    `
    SELECT
      id AS assessment_id,
      assessment_key,
      title AS assessment_title,
      description AS assessment_description
    FROM assessments
    WHERE assessment_key = $1
    `,
    [assessmentKey],
  );

  return result.rows[0] ?? null;
}

async function getPublishedAssessmentMetadataByKey(
  db: Queryable,
  assessmentKey: string,
): Promise<PublishedAssessmentMetadataRow | null> {
  const result = await db.query<PublishedAssessmentMetadataRow>(
    `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      a.title AS assessment_title,
      a.description AS assessment_description,
      av.id AS assessment_version_id,
      av.version AS version_tag
    FROM assessments a
    INNER JOIN assessment_versions av ON av.assessment_id = a.id
    WHERE a.assessment_key = $1
      AND av.lifecycle_status = 'PUBLISHED'
    `,
    [assessmentKey],
  );

  return result.rows[0] ?? null;
}

function mapPreparedQuestions(
  questions: Awaited<ReturnType<ReturnType<typeof createVoiceQuestionDeliveryService>['getQuestionDelivery']>>['questions'],
): readonly VoicePreparedAssessmentQuestion[] {
  return Object.freeze(
    questions.map((question) => ({
      questionId: question.questionId,
      questionNumber: question.questionNumber,
      prompt: question.prompt,
      selectedOptionId: question.selectedOptionId,
      options: Object.freeze(
        question.options.map((option) => ({
          optionId: option.optionId,
          label: option.label,
          text: option.text,
        })),
      ),
    })),
  );
}

function mapPreparationState(params: {
  previousLifecycleStatus: 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error';
  allQuestionsAnswered: boolean;
}): 'ready_to_start' | 'resumed_in_progress' | 'all_questions_answered' {
  if (params.allQuestionsAnswered) {
    return 'all_questions_answered';
  }

  return params.previousLifecycleStatus === 'in_progress'
    ? 'resumed_in_progress'
    : 'ready_to_start';
}

export type VoiceAttemptOrchestrator = {
  prepareVoiceAssessment(params: {
    userId: string;
    assessmentKey: string;
  }): Promise<VoiceAssessmentPreparationResult>;
};

export function createVoiceAttemptOrchestrator(params: {
  db: Queryable;
}): VoiceAttemptOrchestrator {
  const { db } = params;
  const lifecycleService = createAssessmentAttemptLifecycleService({ db });
  const questionDeliveryService = createVoiceQuestionDeliveryService({ db });

  return {
    async prepareVoiceAssessment(input) {
      const supportState = getVoiceAssessmentSupportState(input.assessmentKey);
      if (supportState === 'feature_disabled') {
        return {
          state: 'feature_disabled',
          data: null,
          error: 'Voice assessment is disabled in this environment.',
        };
      }

      const assessmentRecord = await getAssessmentRecordByKey(db, input.assessmentKey);
      if (!assessmentRecord) {
        return {
          state: 'assessment_not_found',
          data: null,
          error: `Assessment ${input.assessmentKey} was not found.`,
        };
      }

      const publishedSummary = await getPublishedAssessmentSummaryByKey(db, input.assessmentKey);
      if (!publishedSummary) {
        return {
          state: 'no_published_version',
          data: null,
          error: `Assessment ${input.assessmentKey} does not have a published version.`,
        };
      }

      if (supportState === 'unsupported_assessment') {
        return {
          state: 'unsupported_assessment',
          data: null,
          error: `Assessment ${input.assessmentKey} is not supported for voice delivery.`,
        };
      }

      try {
        const [previousLifecycle, startedLifecycle, publishedMetadata] = await Promise.all([
          lifecycleService.getAssessmentAttemptLifecycle({
            userId: input.userId,
            assessmentKey: input.assessmentKey,
          }),
          lifecycleService.startAssessmentAttempt({
            userId: input.userId,
            assessmentKey: input.assessmentKey,
          }),
          getPublishedAssessmentMetadataByKey(db, input.assessmentKey),
        ]);

        if (!startedLifecycle.attemptId || !publishedMetadata) {
          return {
            state: 'attempt_unavailable',
            data: null,
            error: `Voice assessment could not prepare an attempt for ${input.assessmentKey}.`,
          };
        }

        const delivery = await questionDeliveryService.getQuestionDelivery({
          assessmentVersionId: publishedSummary.assessmentVersionId,
          attemptId: startedLifecycle.attemptId,
        });
        const preparedState = mapPreparationState({
          previousLifecycleStatus: previousLifecycle.status,
          allQuestionsAnswered: delivery.allQuestionsAnswered,
        });

        return {
          state: preparedState,
          data: {
            assessment: {
              assessmentId: publishedMetadata.assessment_id,
              assessmentKey: publishedMetadata.assessment_key,
              title: publishedMetadata.assessment_title,
              description: publishedMetadata.assessment_description,
              assessmentVersionId: publishedMetadata.assessment_version_id,
              versionTag: publishedMetadata.version_tag,
            },
            attempt: {
              attemptId: startedLifecycle.attemptId,
              status: preparedState,
              lifecycleStatus: previousLifecycle.status,
            },
            delivery: {
              totalQuestionCount: delivery.totalQuestionCount,
              answeredQuestionCount: delivery.answeredQuestionCount,
              currentQuestionIndex: delivery.currentQuestionIndex,
              currentQuestionNumber: delivery.currentQuestionNumber,
              currentQuestion:
                delivery.currentQuestion === null
                  ? null
                  : {
                      questionId: delivery.currentQuestion.questionId,
                      questionNumber: delivery.currentQuestion.questionNumber,
                      prompt: delivery.currentQuestion.prompt,
                      selectedOptionId: delivery.currentQuestion.selectedOptionId,
                      options: Object.freeze(
                        delivery.currentQuestion.options.map((option) => ({
                          optionId: option.optionId,
                          label: option.label,
                          text: option.text,
                        })),
                      ),
                    },
              questions: mapPreparedQuestions(delivery.questions),
            },
          },
          error: null,
        };
      } catch (error) {
        if (
          error instanceof AssessmentLifecycleNotFoundError
          || error instanceof InvalidAssessmentLifecycleDataError
        ) {
          return {
            state: 'attempt_unavailable',
            data: null,
            error: error.message,
          };
        }

        throw error;
      }
    },
  };
}
