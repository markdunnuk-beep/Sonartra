import { getDbPool } from '@/lib/server/db';
import {
  createAssessmentRunnerService,
  type AssessmentRunnerService,
} from '@/lib/server/assessment-runner-service';
import {
  AssessmentRunnerForbiddenError,
  AssessmentRunnerNotFoundError,
  AssessmentRunnerStateError,
  AssessmentRunnerValidationError,
  type SaveAssessmentResponseResult,
} from '@/lib/server/assessment-runner-types';
import { getAttemptForRunner } from '@/lib/server/assessment-runner-queries';
import type { Queryable } from '@/lib/engine/repository-sql';
import {
  createVoiceSessionRepository,
  VoiceSessionConflictError,
  VoiceSessionForbiddenError,
  VoiceSessionNotFoundError,
  VoiceSessionValidationError,
} from '@/lib/server/voice/voice-session.repository';
import { resolveVoiceOption } from '@/lib/voice/resolution/voice-option-resolution';
import type {
  VoiceResolutionAttemptPayload,
  VoiceResolutionSettlementIntent,
  VoiceResolutionSettlementStatus,
} from '@/lib/voice/resolution/voice-resolution.types';
import type {
  VoiceResponseResolution,
  VoiceSession,
  VoiceSessionEvent,
  VoiceSessionSpeaker,
  VoiceSessionTurn,
} from '@/lib/types/voice';

export {
  VoiceSessionConflictError,
  VoiceSessionForbiddenError,
  VoiceSessionNotFoundError,
  VoiceSessionValidationError,
} from '@/lib/server/voice/voice-session.repository';

export class VoiceSessionResolutionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceSessionResolutionStateError';
  }
}

type VoiceSessionService = {
  startVoiceSession(params: {
    userId: string;
    attemptId: string;
    assessmentId: string;
    assessmentVersionId: string;
    provider: string;
    model: string;
    locale?: string | null;
  }): Promise<VoiceSession>;
  appendVoiceTurn(params: {
    userId: string;
    voiceSessionId: string;
    turnIndex: number;
    speaker: VoiceSessionSpeaker;
    transcriptText: string;
    questionId?: string | null;
    startedAt: string;
    endedAt?: string | null;
  }): Promise<VoiceSessionTurn>;
  recordResolutionAttempt(params: {
    userId: string;
    voiceSessionId: string;
    questionId: string;
    inferredOptionId: string | null;
    confidence: number | null;
    sourceExcerpt: string;
  }): Promise<VoiceResponseResolution>;
  finalizeVoiceResolution(params: {
    userId: string;
    voiceSessionId: string;
    questionId: string;
    finalSelectedOptionId: string;
    wasConfirmed: boolean;
  }): Promise<VoiceResponseResolution>;
  markVoiceSessionCompleted(params: {
    userId: string;
    voiceSessionId: string;
  }): Promise<VoiceSession>;
  markVoiceSessionFailed(params: {
    userId: string;
    voiceSessionId: string;
    eventType?: string | null;
    payloadJson?: Record<string, unknown> | null;
  }): Promise<{
    session: VoiceSession;
    event: VoiceSessionEvent | null;
  }>;
  resolveVoiceAnswer(params: {
    userId: string;
    voiceSessionId: string;
    questionId: string;
    sourceExcerpt: string;
  }): Promise<{
    outcome: VoiceResolutionAttemptPayload['result'];
    matchedOption: VoiceResolutionAttemptPayload['matchedOption'];
    audit: VoiceResponseResolution;
  }>;
  settleResolvedVoiceAnswer(params: {
    userId: string;
    voiceSessionId: string;
    questionId: string;
    intent: VoiceResolutionSettlementIntent;
    correctedOptionId?: string | null;
  }): Promise<{
    status: VoiceResolutionSettlementStatus;
    audit: VoiceResponseResolution;
    selectedOption: VoiceResolutionAttemptPayload['matchedOption'];
  }>;
  commitVoiceAnswerToCanonicalResponse(params: {
    userId: string;
    voiceSessionId: string;
    questionId: string;
  }): Promise<{
    audit: VoiceResponseResolution;
    committedOptionId: string;
    response: SaveAssessmentResponseResult;
  }>;
};

export function createVoiceSessionService(deps?: {
  db?: Queryable;
  assessmentRunnerService?: Pick<AssessmentRunnerService, 'saveAssessmentResponse'>;
}): VoiceSessionService {
  const db = deps?.db ?? getDbPool();
  const repository = createVoiceSessionRepository({ db });
  const assessmentRunnerService =
    deps?.assessmentRunnerService ?? createAssessmentRunnerService({ db });

  return {
    async startVoiceSession(params) {
      return repository.createVoiceSessionForAttempt(params);
    },

    async appendVoiceTurn(params) {
      await repository.getOwnedVoiceSession({
        voiceSessionId: params.voiceSessionId,
        userId: params.userId,
      });

      return repository.appendVoiceTurn({
        voiceSessionId: params.voiceSessionId,
        turnIndex: params.turnIndex,
        speaker: params.speaker,
        transcriptText: params.transcriptText,
        questionId: params.questionId ?? null,
        startedAt: params.startedAt,
        endedAt: params.endedAt ?? null,
      });
    },

    async recordResolutionAttempt(params) {
      await repository.getOwnedVoiceSession({
        voiceSessionId: params.voiceSessionId,
        userId: params.userId,
      });

      return repository.recordResolutionAttempt({
        voiceSessionId: params.voiceSessionId,
        questionId: params.questionId,
        inferredOptionId: params.inferredOptionId,
        confidence: params.confidence,
        sourceExcerpt: params.sourceExcerpt,
      });
    },

    async finalizeVoiceResolution(params) {
      await repository.getOwnedVoiceSession({
        voiceSessionId: params.voiceSessionId,
        userId: params.userId,
      });

      return repository.finalizeVoiceResolution({
        voiceSessionId: params.voiceSessionId,
        questionId: params.questionId,
        finalSelectedOptionId: params.finalSelectedOptionId,
        wasConfirmed: params.wasConfirmed,
      });
    },

    async markVoiceSessionCompleted(params) {
      await repository.getOwnedVoiceSession({
        voiceSessionId: params.voiceSessionId,
        userId: params.userId,
      });

      return repository.markVoiceSessionCompleted({
        voiceSessionId: params.voiceSessionId,
      });
    },

    async markVoiceSessionFailed(params) {
      await repository.getOwnedVoiceSession({
        voiceSessionId: params.voiceSessionId,
        userId: params.userId,
      });

      return repository.markVoiceSessionFailed({
        voiceSessionId: params.voiceSessionId,
        eventType: params.eventType ?? null,
        payloadJson: params.payloadJson ?? null,
      });
    },

    async resolveVoiceAnswer(params) {
      await repository.getOwnedVoiceSession({
        voiceSessionId: params.voiceSessionId,
        userId: params.userId,
      });

      const question = await repository.getResolutionQuestionForVoiceSession({
        voiceSessionId: params.voiceSessionId,
        questionId: params.questionId,
      });

      let resolution: VoiceResolutionAttemptPayload;
      try {
        resolution = resolveVoiceOption({
          question,
          transcript: params.sourceExcerpt,
        });
      } catch (error) {
        resolution = {
          result: {
            status: 'runtime_error',
            questionId: params.questionId,
            inferredOptionId: null,
            confidence: null,
            sourceExcerpt: params.sourceExcerpt.trim(),
            confirmationMode: 'require_retry',
            candidateOptionLabel: null,
            candidateOptionText: null,
            canRetry: true,
            canCorrect: false,
            internalReason:
              error instanceof Error ? error.message : 'resolution_runtime_error',
          },
          matchedOption: null,
        };
      }

      const audit = await repository.recordResolutionAttempt({
        voiceSessionId: params.voiceSessionId,
        questionId: params.questionId,
        inferredOptionId: resolution.result.inferredOptionId,
        confidence: resolution.result.confidence,
        sourceExcerpt: resolution.result.sourceExcerpt,
      });

      return {
        outcome: resolution.result,
        matchedOption: resolution.matchedOption,
        audit,
      };
    },

    async settleResolvedVoiceAnswer(params) {
      await repository.getOwnedVoiceSession({
        voiceSessionId: params.voiceSessionId,
        userId: params.userId,
      });

      const latestAttempt = await repository.getLatestResolutionAttempt({
        voiceSessionId: params.voiceSessionId,
        questionId: params.questionId,
      });

      const question = await repository.getResolutionQuestionForVoiceSession({
        voiceSessionId: params.voiceSessionId,
        questionId: params.questionId,
      });

      if (params.intent === 'reject') {
        return {
          status: 'rejected',
          audit: latestAttempt,
          selectedOption: null,
        };
      }

      const finalSelectedOptionId =
        params.intent === 'correct'
          ? params.correctedOptionId ?? null
          : latestAttempt.inferredOptionId;

      if (!finalSelectedOptionId) {
        throw new VoiceSessionValidationError(
          `Question ${params.questionId} does not have a candidate option available to confirm.`,
        );
      }

      const audit = await repository.finalizeVoiceResolution({
        voiceSessionId: params.voiceSessionId,
        questionId: params.questionId,
        finalSelectedOptionId,
        wasConfirmed: true,
      });

      return {
        status: params.intent === 'correct' ? 'corrected' : 'confirmed',
        audit,
        selectedOption:
          question.options.find((option) => option.optionId === finalSelectedOptionId) ?? null,
      };
    },

    async commitVoiceAnswerToCanonicalResponse(params) {
      const session = await repository.getOwnedVoiceSession({
        voiceSessionId: params.voiceSessionId,
        userId: params.userId,
      });

      const attempt = await getAttemptForRunner(db, session.attemptId);
      if (!attempt) {
        throw new VoiceSessionNotFoundError(
          `Attempt ${session.attemptId} linked to voice session ${params.voiceSessionId} was not found`,
        );
      }

      if (attempt.userId !== params.userId) {
        throw new VoiceSessionForbiddenError(
          `Attempt ${attempt.attemptId} does not belong to user ${params.userId}`,
        );
      }

      const latestAttempt = await repository.getLatestResolutionAttempt({
        voiceSessionId: params.voiceSessionId,
        questionId: params.questionId,
      });

      const finalSelectedOptionId =
        latestAttempt.finalSelectedOptionId ?? latestAttempt.inferredOptionId;

      if (!latestAttempt.wasConfirmed || !finalSelectedOptionId) {
        throw new VoiceSessionResolutionStateError(
          `Question ${params.questionId} does not have a confirmed voice resolution ready for canonical persistence.`,
        );
      }

      try {
        const response = await assessmentRunnerService.saveAssessmentResponse({
          userId: params.userId,
          assessmentKey: attempt.assessmentKey,
          attemptId: attempt.attemptId,
          questionId: params.questionId,
          selectedOptionId: finalSelectedOptionId,
        });

        return {
          audit: latestAttempt,
          committedOptionId: finalSelectedOptionId,
          response,
        };
      } catch (error) {
        if (error instanceof AssessmentRunnerValidationError) {
          throw new VoiceSessionValidationError(error.message);
        }

        if (error instanceof AssessmentRunnerForbiddenError) {
          throw new VoiceSessionForbiddenError(error.message);
        }

        if (error instanceof AssessmentRunnerNotFoundError) {
          throw new VoiceSessionNotFoundError(error.message);
        }

        if (error instanceof AssessmentRunnerStateError) {
          throw new VoiceSessionValidationError(error.message);
        }

        throw error;
      }
    },
  };
}
