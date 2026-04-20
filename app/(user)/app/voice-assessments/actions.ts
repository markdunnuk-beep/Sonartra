'use server';

import { getDbPool } from '@/lib/server/db';
import {
  isAuthenticatedUserRequiredError,
  isClerkUserProfileRequiredError,
  isDisabledUserAccessError,
  requireCurrentUser,
} from '@/lib/server/request-user';
import type { VoiceAssessmentPreparationResult } from '@/lib/server/voice/voice-attempt-orchestrator';
import {
  createVoiceSessionService,
  VoiceSessionConflictError,
  VoiceSessionForbiddenError,
  VoiceSessionNotFoundError,
  VoiceSessionValidationError,
} from '@/lib/server/voice/voice-session.service';
import { createVoiceAttemptOrchestrator } from '@/lib/server/voice/voice-attempt-orchestrator';
import type {
  VoiceResponseResolution,
  VoiceSession,
  VoiceSessionEvent,
  VoiceSessionSpeaker,
  VoiceSessionTurn,
} from '@/lib/types/voice';

type VoiceActionResult<T> =
  | {
      ok: true;
      data: T;
      error: null;
    }
  | {
      ok: false;
      data: null;
      error: string;
    };

type VoiceFailurePayload = {
  session: VoiceSession;
  event: VoiceSessionEvent | null;
};

function failure<T>(error: string): VoiceActionResult<T> {
  return {
    ok: false,
    data: null,
    error,
  };
}

async function requireVoiceActionUserId(): Promise<string> {
  try {
    const requestUser = await requireCurrentUser();
    return requestUser.userId;
  } catch (error) {
    if (
      isAuthenticatedUserRequiredError(error)
      || isClerkUserProfileRequiredError(error)
    ) {
      throw new VoiceSessionForbiddenError('Authentication is required for voice assessment actions.');
    }

    if (isDisabledUserAccessError(error)) {
      throw new VoiceSessionForbiddenError('Disabled users cannot access voice assessment actions.');
    }

    throw error;
  }
}

function mapVoiceActionError<T>(error: unknown): VoiceActionResult<T> {
  if (error instanceof VoiceSessionValidationError) {
    return failure(error.message);
  }

  if (error instanceof VoiceSessionNotFoundError) {
    return failure(error.message);
  }

  if (error instanceof VoiceSessionForbiddenError) {
    return failure(error.message);
  }

  if (error instanceof VoiceSessionConflictError) {
    return failure(error.message);
  }

  return failure('Voice session persistence failed. Try again.');
}

export async function startVoiceSessionAction(params: {
  attemptId: string;
  assessmentId: string;
  assessmentVersionId: string;
  provider: string;
  model: string;
  locale?: string | null;
}): Promise<VoiceActionResult<VoiceSession>> {
  const service = createVoiceSessionService();

  try {
    const userId = await requireVoiceActionUserId();
    const session = await service.startVoiceSession({
      userId,
      attemptId: params.attemptId,
      assessmentId: params.assessmentId,
      assessmentVersionId: params.assessmentVersionId,
      provider: params.provider,
      model: params.model,
      locale: params.locale ?? null,
    });

    return {
      ok: true,
      data: session,
      error: null,
    };
  } catch (error) {
    return mapVoiceActionError(error);
  }
}

export async function prepareVoiceAssessmentAction(
  assessmentKey: string,
): Promise<VoiceActionResult<VoiceAssessmentPreparationResult>> {
  const orchestrator = createVoiceAttemptOrchestrator({
    db: getDbPool(),
  });

  try {
    const userId = await requireVoiceActionUserId();
    const preparation = await orchestrator.prepareVoiceAssessment({
      userId,
      assessmentKey,
    });

    return {
      ok: true,
      data: preparation,
      error: null,
    };
  } catch (error) {
    return mapVoiceActionError(error);
  }
}

export async function appendTurnAction(params: {
  voiceSessionId: string;
  turnIndex: number;
  speaker: VoiceSessionSpeaker;
  transcriptText: string;
  questionId?: string | null;
  startedAt: string;
  endedAt?: string | null;
}): Promise<VoiceActionResult<VoiceSessionTurn>> {
  const service = createVoiceSessionService();

  try {
    const userId = await requireVoiceActionUserId();
    const turn = await service.appendVoiceTurn({
      userId,
      voiceSessionId: params.voiceSessionId,
      turnIndex: params.turnIndex,
      speaker: params.speaker,
      transcriptText: params.transcriptText,
      questionId: params.questionId ?? null,
      startedAt: params.startedAt,
      endedAt: params.endedAt ?? null,
    });

    return {
      ok: true,
      data: turn,
      error: null,
    };
  } catch (error) {
    return mapVoiceActionError(error);
  }
}

export async function recordResolutionAction(params: {
  voiceSessionId: string;
  questionId: string;
  inferredOptionId: string | null;
  confidence: number | null;
  sourceExcerpt: string;
}): Promise<VoiceActionResult<VoiceResponseResolution>> {
  const service = createVoiceSessionService();

  try {
    const userId = await requireVoiceActionUserId();
    const resolution = await service.recordResolutionAttempt({
      userId,
      voiceSessionId: params.voiceSessionId,
      questionId: params.questionId,
      inferredOptionId: params.inferredOptionId,
      confidence: params.confidence,
      sourceExcerpt: params.sourceExcerpt,
    });

    return {
      ok: true,
      data: resolution,
      error: null,
    };
  } catch (error) {
    return mapVoiceActionError(error);
  }
}

export async function finalizeResolutionAction(params: {
  voiceSessionId: string;
  questionId: string;
  finalSelectedOptionId: string;
  wasConfirmed: boolean;
}): Promise<VoiceActionResult<VoiceResponseResolution>> {
  const service = createVoiceSessionService();

  try {
    const userId = await requireVoiceActionUserId();
    const resolution = await service.finalizeVoiceResolution({
      userId,
      voiceSessionId: params.voiceSessionId,
      questionId: params.questionId,
      finalSelectedOptionId: params.finalSelectedOptionId,
      wasConfirmed: params.wasConfirmed,
    });

    return {
      ok: true,
      data: resolution,
      error: null,
    };
  } catch (error) {
    return mapVoiceActionError(error);
  }
}

export async function completeVoiceSessionAction(params: {
  voiceSessionId: string;
}): Promise<VoiceActionResult<VoiceSession>> {
  const service = createVoiceSessionService();

  try {
    const userId = await requireVoiceActionUserId();
    const session = await service.markVoiceSessionCompleted({
      userId,
      voiceSessionId: params.voiceSessionId,
    });

    return {
      ok: true,
      data: session,
      error: null,
    };
  } catch (error) {
    return mapVoiceActionError(error);
  }
}

export async function failVoiceSessionAction(params: {
  voiceSessionId: string;
  eventType?: string | null;
  payloadJson?: Record<string, unknown> | null;
}): Promise<VoiceActionResult<VoiceFailurePayload>> {
  const service = createVoiceSessionService();

  try {
    const userId = await requireVoiceActionUserId();
    const failurePayload = await service.markVoiceSessionFailed({
      userId,
      voiceSessionId: params.voiceSessionId,
      eventType: params.eventType ?? null,
      payloadJson: params.payloadJson ?? null,
    });

    return {
      ok: true,
      data: failurePayload,
      error: null,
    };
  } catch (error) {
    return mapVoiceActionError(error);
  }
}
