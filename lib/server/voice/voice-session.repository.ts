import type { Queryable } from '@/lib/engine/repository-sql';
import type {
  VoiceResponseResolution,
  VoiceSession,
  VoiceSessionEvent,
  VoiceSessionSpeaker,
  VoiceSessionStatus,
  VoiceSessionTurn,
} from '@/lib/types/voice';
import type { VoiceResolutionQuestion } from '@/lib/voice/resolution/voice-resolution.types';

type VoiceSessionRow = {
  id: string;
  attempt_id: string;
  user_id: string;
  assessment_id: string;
  assessment_version_id: string;
  status: VoiceSessionStatus;
  provider: string;
  model: string;
  locale: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type VoiceSessionTurnRow = {
  id: string;
  voice_session_id: string;
  turn_index: number;
  speaker: VoiceSessionSpeaker;
  transcript_text: string;
  question_id: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

type VoiceResponseResolutionRow = {
  id: string;
  voice_session_id: string;
  question_id: string;
  inferred_option_id: string | null;
  final_selected_option_id: string | null;
  confidence: string | number | null;
  was_confirmed: boolean;
  source_excerpt: string;
  created_at: string;
};

type VoiceSessionEventRow = {
  id: string;
  voice_session_id: string;
  event_type: string;
  payload_json: Record<string, unknown> | null;
  created_at: string;
};

type AttemptOwnershipRow = {
  id: string;
  user_id: string;
  assessment_id: string;
  assessment_version_id: string;
};

type SessionOwnershipRow = {
  id: string;
  user_id: string;
  assessment_id: string;
  assessment_version_id: string;
  status: VoiceSessionStatus;
};

type QuestionVersionRow = {
  id: string;
};

type OptionQuestionRow = {
  id: string;
};

type VoiceResolutionQuestionRow = {
  question_id: string;
  prompt: string;
  option_id: string;
  option_label: string | null;
  option_text: string;
  option_order_index: number;
};

export class VoiceSessionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceSessionNotFoundError';
  }
}

export class VoiceSessionForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceSessionForbiddenError';
  }
}

export class VoiceSessionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceSessionValidationError';
  }
}

export class VoiceSessionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceSessionConflictError';
  }
}

function mapVoiceSessionRow(row: VoiceSessionRow): VoiceSession {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    userId: row.user_id,
    assessmentId: row.assessment_id,
    assessmentVersionId: row.assessment_version_id,
    status: row.status,
    provider: row.provider,
    model: row.model,
    locale: row.locale,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVoiceSessionTurnRow(row: VoiceSessionTurnRow): VoiceSessionTurn {
  return {
    id: row.id,
    voiceSessionId: row.voice_session_id,
    turnIndex: row.turn_index,
    speaker: row.speaker,
    transcriptText: row.transcript_text,
    questionId: row.question_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  };
}

function mapVoiceResponseResolutionRow(
  row: VoiceResponseResolutionRow,
): VoiceResponseResolution {
  return {
    id: row.id,
    voiceSessionId: row.voice_session_id,
    questionId: row.question_id,
    inferredOptionId: row.inferred_option_id,
    finalSelectedOptionId: row.final_selected_option_id,
    confidence: row.confidence === null ? null : Number(row.confidence),
    wasConfirmed: row.was_confirmed,
    sourceExcerpt: row.source_excerpt,
    createdAt: row.created_at,
  };
}

function mapVoiceSessionEventRow(row: VoiceSessionEventRow): VoiceSessionEvent {
  return {
    id: row.id,
    voiceSessionId: row.voice_session_id,
    eventType: row.event_type,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
  };
}

async function getAttemptOwnershipRecord(
  db: Queryable,
  attemptId: string,
): Promise<AttemptOwnershipRow | null> {
  const result = await db.query<AttemptOwnershipRow>(
    `
    SELECT
      id,
      user_id,
      assessment_id,
      assessment_version_id
    FROM attempts
    WHERE id = $1
    `,
    [attemptId],
  );

  return result.rows[0] ?? null;
}

async function getVoiceSessionOwnershipRecord(
  db: Queryable,
  voiceSessionId: string,
): Promise<SessionOwnershipRow | null> {
  const result = await db.query<SessionOwnershipRow>(
    `
    SELECT
      id,
      user_id,
      assessment_id,
      assessment_version_id,
      status
    FROM voice_sessions
    WHERE id = $1
    `,
    [voiceSessionId],
  );

  return result.rows[0] ?? null;
}

async function validateQuestionForAssessmentVersion(
  db: Queryable,
  params: {
    assessmentVersionId: string;
    questionId: string;
  },
): Promise<void> {
  const result = await db.query<QuestionVersionRow>(
    `
    SELECT id
    FROM questions
    WHERE id = $1
      AND assessment_version_id = $2
    `,
    [params.questionId, params.assessmentVersionId],
  );

  if (!result.rows[0]) {
    throw new VoiceSessionValidationError(
      `Question ${params.questionId} is not valid for assessment version ${params.assessmentVersionId}`,
    );
  }
}

async function validateOptionForQuestion(
  db: Queryable,
  params: {
    questionId: string;
    optionId: string;
  },
): Promise<void> {
  const result = await db.query<OptionQuestionRow>(
    `
    SELECT id
    FROM options
    WHERE id = $1
      AND question_id = $2
    `,
    [params.optionId, params.questionId],
  );

  if (!result.rows[0]) {
    throw new VoiceSessionValidationError(
      `Option ${params.optionId} is not valid for question ${params.questionId}`,
    );
  }
}

export type VoiceSessionRepository = {
  createVoiceSessionForAttempt(params: {
    attemptId: string;
    userId: string;
    assessmentId: string;
    assessmentVersionId: string;
    provider: string;
    model: string;
    locale?: string | null;
  }): Promise<VoiceSession>;
  appendVoiceTurn(params: {
    voiceSessionId: string;
    turnIndex: number;
    speaker: VoiceSessionSpeaker;
    transcriptText: string;
    questionId?: string | null;
    startedAt: string;
    endedAt?: string | null;
  }): Promise<VoiceSessionTurn>;
  recordResolutionAttempt(params: {
    voiceSessionId: string;
    questionId: string;
    inferredOptionId: string | null;
    confidence: number | null;
    sourceExcerpt: string;
  }): Promise<VoiceResponseResolution>;
  finalizeVoiceResolution(params: {
    voiceSessionId: string;
    questionId: string;
    finalSelectedOptionId: string;
    wasConfirmed: boolean;
  }): Promise<VoiceResponseResolution>;
  markVoiceSessionCompleted(params: {
    voiceSessionId: string;
  }): Promise<VoiceSession>;
  markVoiceSessionFailed(params: {
    voiceSessionId: string;
    eventType?: string | null;
    payloadJson?: Record<string, unknown> | null;
  }): Promise<{
    session: VoiceSession;
    event: VoiceSessionEvent | null;
  }>;
  getOwnedVoiceSession(params: {
    voiceSessionId: string;
    userId: string;
  }): Promise<VoiceSession>;
  getResolutionQuestionForVoiceSession(params: {
    voiceSessionId: string;
    questionId: string;
  }): Promise<VoiceResolutionQuestion>;
  getLatestResolutionAttempt(params: {
    voiceSessionId: string;
    questionId: string;
  }): Promise<VoiceResponseResolution>;
};

export function createVoiceSessionRepository(params: {
  db: Queryable;
}): VoiceSessionRepository {
  const { db } = params;

  return {
    async createVoiceSessionForAttempt(input) {
      const attempt = await getAttemptOwnershipRecord(db, input.attemptId);

      if (!attempt) {
        throw new VoiceSessionNotFoundError(`Attempt ${input.attemptId} was not found`);
      }

      if (attempt.user_id !== input.userId) {
        throw new VoiceSessionForbiddenError(
          `Attempt ${input.attemptId} does not belong to user ${input.userId}`,
        );
      }

      if (
        attempt.assessment_id !== input.assessmentId
        || attempt.assessment_version_id !== input.assessmentVersionId
      ) {
        throw new VoiceSessionValidationError(
          `Attempt ${input.attemptId} does not match the provided assessment context`,
        );
      }

      const result = await db.query<VoiceSessionRow>(
        `
        INSERT INTO voice_sessions (
          attempt_id,
          user_id,
          assessment_id,
          assessment_version_id,
          status,
          provider,
          model,
          locale,
          started_at
        )
        VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, $7, NOW())
        RETURNING
          id,
          attempt_id,
          user_id,
          assessment_id,
          assessment_version_id,
          status,
          provider,
          model,
          locale,
          started_at,
          ended_at,
          created_at,
          updated_at
        `,
        [
          input.attemptId,
          input.userId,
          input.assessmentId,
          input.assessmentVersionId,
          input.provider,
          input.model,
          input.locale ?? null,
        ],
      );

      return mapVoiceSessionRow(result.rows[0]);
    },

    async appendVoiceTurn(input) {
      const session = await getVoiceSessionOwnershipRecord(db, input.voiceSessionId);

      if (!session) {
        throw new VoiceSessionNotFoundError(`Voice session ${input.voiceSessionId} was not found`);
      }

      if (input.questionId) {
        await validateQuestionForAssessmentVersion(db, {
          assessmentVersionId: session.assessment_version_id,
          questionId: input.questionId,
        });
      }

      try {
        const result = await db.query<VoiceSessionTurnRow>(
          `
          INSERT INTO voice_session_turns (
            voice_session_id,
            turn_index,
            speaker,
            transcript_text,
            question_id,
            started_at,
            ended_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            voice_session_id,
            turn_index,
            speaker,
            transcript_text,
            question_id,
            started_at,
            ended_at,
            created_at
          `,
          [
            input.voiceSessionId,
            input.turnIndex,
            input.speaker,
            input.transcriptText,
            input.questionId ?? null,
            input.startedAt,
            input.endedAt ?? null,
          ],
        );

        return mapVoiceSessionTurnRow(result.rows[0]);
      } catch (error) {
        if (
          error instanceof Error
          && error.message.includes('voice_session_turns_session_turn_unique')
        ) {
          throw new VoiceSessionConflictError(
            `Turn ${input.turnIndex} already exists for voice session ${input.voiceSessionId}`,
          );
        }

        throw error;
      }
    },

    async recordResolutionAttempt(input) {
      const session = await getVoiceSessionOwnershipRecord(db, input.voiceSessionId);

      if (!session) {
        throw new VoiceSessionNotFoundError(`Voice session ${input.voiceSessionId} was not found`);
      }

      await validateQuestionForAssessmentVersion(db, {
        assessmentVersionId: session.assessment_version_id,
        questionId: input.questionId,
      });

      if (input.inferredOptionId) {
        await validateOptionForQuestion(db, {
          questionId: input.questionId,
          optionId: input.inferredOptionId,
        });
      }

      const result = await db.query<VoiceResponseResolutionRow>(
        `
        INSERT INTO voice_response_resolutions (
          voice_session_id,
          question_id,
          inferred_option_id,
          final_selected_option_id,
          confidence,
          was_confirmed,
          source_excerpt
        )
        VALUES ($1, $2, $3, NULL, $4, FALSE, $5)
        RETURNING
          id,
          voice_session_id,
          question_id,
          inferred_option_id,
          final_selected_option_id,
          confidence,
          was_confirmed,
          source_excerpt,
          created_at
        `,
        [
          input.voiceSessionId,
          input.questionId,
          input.inferredOptionId,
          input.confidence,
          input.sourceExcerpt,
        ],
      );

      return mapVoiceResponseResolutionRow(result.rows[0]);
    },

    async finalizeVoiceResolution(input) {
      const session = await getVoiceSessionOwnershipRecord(db, input.voiceSessionId);

      if (!session) {
        throw new VoiceSessionNotFoundError(`Voice session ${input.voiceSessionId} was not found`);
      }

      await validateQuestionForAssessmentVersion(db, {
        assessmentVersionId: session.assessment_version_id,
        questionId: input.questionId,
      });
      await validateOptionForQuestion(db, {
        questionId: input.questionId,
        optionId: input.finalSelectedOptionId,
      });

      const result = await db.query<VoiceResponseResolutionRow>(
        `
        WITH latest_resolution AS (
          SELECT id
          FROM voice_response_resolutions
          WHERE voice_session_id = $1
            AND question_id = $2
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        )
        UPDATE voice_response_resolutions
        SET
          final_selected_option_id = $3,
          was_confirmed = $4
        WHERE id IN (SELECT id FROM latest_resolution)
        RETURNING
          id,
          voice_session_id,
          question_id,
          inferred_option_id,
          final_selected_option_id,
          confidence,
          was_confirmed,
          source_excerpt,
          created_at
        `,
        [
          input.voiceSessionId,
          input.questionId,
          input.finalSelectedOptionId,
          input.wasConfirmed,
        ],
      );

      const row = result.rows[0];
      if (!row) {
        throw new VoiceSessionNotFoundError(
          `No resolution attempt exists for question ${input.questionId} in voice session ${input.voiceSessionId}`,
        );
      }

      return mapVoiceResponseResolutionRow(row);
    },

    async markVoiceSessionCompleted(input) {
      const result = await db.query<VoiceSessionRow>(
        `
        UPDATE voice_sessions
        SET
          status = 'completed',
          ended_at = COALESCE(ended_at, NOW()),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          attempt_id,
          user_id,
          assessment_id,
          assessment_version_id,
          status,
          provider,
          model,
          locale,
          started_at,
          ended_at,
          created_at,
          updated_at
        `,
        [input.voiceSessionId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new VoiceSessionNotFoundError(`Voice session ${input.voiceSessionId} was not found`);
      }

      return mapVoiceSessionRow(row);
    },

    async markVoiceSessionFailed(input) {
      const sessionResult = await db.query<VoiceSessionRow>(
        `
        UPDATE voice_sessions
        SET
          status = 'failed',
          ended_at = COALESCE(ended_at, NOW()),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          attempt_id,
          user_id,
          assessment_id,
          assessment_version_id,
          status,
          provider,
          model,
          locale,
          started_at,
          ended_at,
          created_at,
          updated_at
        `,
        [input.voiceSessionId],
      );

      const sessionRow = sessionResult.rows[0];
      if (!sessionRow) {
        throw new VoiceSessionNotFoundError(`Voice session ${input.voiceSessionId} was not found`);
      }

      let event: VoiceSessionEvent | null = null;

      if (input.eventType) {
        const eventResult = await db.query<VoiceSessionEventRow>(
          `
          INSERT INTO voice_session_events (
            voice_session_id,
            event_type,
            payload_json
          )
          VALUES ($1, $2, $3)
          RETURNING
            id,
            voice_session_id,
            event_type,
            payload_json,
            created_at
          `,
          [input.voiceSessionId, input.eventType, input.payloadJson ?? null],
        );

        event = mapVoiceSessionEventRow(eventResult.rows[0]);
      }

      return {
        session: mapVoiceSessionRow(sessionRow),
        event,
      };
    },

    async getOwnedVoiceSession(input) {
      const result = await db.query<VoiceSessionRow>(
        `
        SELECT
          id,
          attempt_id,
          user_id,
          assessment_id,
          assessment_version_id,
          status,
          provider,
          model,
          locale,
          started_at,
          ended_at,
          created_at,
          updated_at
        FROM voice_sessions
        WHERE id = $1
        `,
        [input.voiceSessionId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new VoiceSessionNotFoundError(`Voice session ${input.voiceSessionId} was not found`);
      }

      if (row.user_id !== input.userId) {
        throw new VoiceSessionForbiddenError(
          `Voice session ${input.voiceSessionId} does not belong to user ${input.userId}`,
        );
      }

      return mapVoiceSessionRow(row);
    },

    async getResolutionQuestionForVoiceSession(input) {
      const session = await getVoiceSessionOwnershipRecord(db, input.voiceSessionId);

      if (!session) {
        throw new VoiceSessionNotFoundError(`Voice session ${input.voiceSessionId} was not found`);
      }

      await validateQuestionForAssessmentVersion(db, {
        assessmentVersionId: session.assessment_version_id,
        questionId: input.questionId,
      });

      const result = await db.query<VoiceResolutionQuestionRow>(
        `
        SELECT
          q.id AS question_id,
          q.prompt,
          o.id AS option_id,
          o.option_label,
          o.option_text,
          o.order_index AS option_order_index
        FROM questions q
        INNER JOIN options o ON o.question_id = q.id
        WHERE q.id = $1
          AND q.assessment_version_id = $2
        ORDER BY o.order_index ASC, o.id ASC
        `,
        [input.questionId, session.assessment_version_id],
      );

      const rows = result.rows;
      if (rows.length === 0) {
        throw new VoiceSessionNotFoundError(
          `Question ${input.questionId} has no authored options for voice resolution.`,
        );
      }

      return {
        questionId: rows[0].question_id,
        prompt: rows[0].prompt,
        options: Object.freeze(
          rows.map((row) => ({
            optionId: row.option_id,
            label: row.option_label,
            text: row.option_text,
          })),
        ),
      };
    },

    async getLatestResolutionAttempt(input) {
      const session = await getVoiceSessionOwnershipRecord(db, input.voiceSessionId);

      if (!session) {
        throw new VoiceSessionNotFoundError(`Voice session ${input.voiceSessionId} was not found`);
      }

      await validateQuestionForAssessmentVersion(db, {
        assessmentVersionId: session.assessment_version_id,
        questionId: input.questionId,
      });

      const result = await db.query<VoiceResponseResolutionRow>(
        `
        SELECT
          id,
          voice_session_id,
          question_id,
          inferred_option_id,
          final_selected_option_id,
          confidence,
          was_confirmed,
          source_excerpt,
          created_at
        FROM voice_response_resolutions
        WHERE voice_session_id = $1
          AND question_id = $2
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        `,
        [input.voiceSessionId, input.questionId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new VoiceSessionNotFoundError(
          `No resolution attempt exists for question ${input.questionId} in voice session ${input.voiceSessionId}`,
        );
      }

      return mapVoiceResponseResolutionRow(row);
    },
  };
}
