BEGIN;

DROP INDEX IF EXISTS options_assessment_version_option_key_idx;

CREATE UNIQUE INDEX IF NOT EXISTS options_question_option_key_idx
  ON options (question_id, option_key);

COMMIT;
