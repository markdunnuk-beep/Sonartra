BEGIN;

CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  locale TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT voice_sessions_attempt_identity_fk
    FOREIGN KEY (attempt_id, user_id, assessment_id, assessment_version_id)
    REFERENCES attempts(id, user_id, assessment_id, assessment_version_id)
    ON DELETE CASCADE,
  CONSTRAINT voice_sessions_time_order_check
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE TABLE voice_session_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL CHECK (turn_index >= 0),
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'agent')),
  transcript_text TEXT NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT voice_session_turns_session_turn_unique
    UNIQUE (voice_session_id, turn_index),
  CONSTRAINT voice_session_turns_time_order_check
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE TABLE voice_response_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  inferred_option_id UUID,
  final_selected_option_id UUID,
  confidence NUMERIC(5, 4),
  was_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  source_excerpt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT voice_response_resolutions_inferred_option_fk
    FOREIGN KEY (question_id, inferred_option_id)
    REFERENCES options(question_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT voice_response_resolutions_final_option_fk
    FOREIGN KEY (question_id, final_selected_option_id)
    REFERENCES options(question_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT voice_response_resolutions_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE TABLE voice_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX voice_sessions_attempt_idx
  ON voice_sessions (attempt_id);

CREATE INDEX voice_sessions_user_status_idx
  ON voice_sessions (user_id, status, created_at DESC);

CREATE INDEX voice_sessions_version_idx
  ON voice_sessions (assessment_version_id, created_at DESC);

CREATE INDEX voice_session_turns_session_turn_idx
  ON voice_session_turns (voice_session_id, turn_index);

CREATE INDEX voice_session_turns_question_idx
  ON voice_session_turns (question_id);

CREATE INDEX voice_response_resolutions_session_question_idx
  ON voice_response_resolutions (voice_session_id, question_id, created_at DESC);

CREATE INDEX voice_response_resolutions_final_option_idx
  ON voice_response_resolutions (final_selected_option_id);

CREATE INDEX voice_session_events_session_created_idx
  ON voice_session_events (voice_session_id, created_at DESC);

CREATE INDEX voice_session_events_type_idx
  ON voice_session_events (event_type);

COMMIT;
