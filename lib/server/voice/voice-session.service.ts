import { getDbPool } from '@/lib/server/db';
import {
  createVoiceSessionRepository,
  VoiceSessionConflictError,
  VoiceSessionForbiddenError,
  VoiceSessionNotFoundError,
  VoiceSessionValidationError,
} from '@/lib/server/voice/voice-session.repository';
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
};

export function createVoiceSessionService(): VoiceSessionService {
  const repository = createVoiceSessionRepository({ db: getDbPool() });

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
  };
}
