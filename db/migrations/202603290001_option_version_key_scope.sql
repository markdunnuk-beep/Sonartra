BEGIN;

ALTER TABLE options
ADD COLUMN assessment_version_id UUID;

UPDATE options o
SET assessment_version_id = q.assessment_version_id
FROM questions q
WHERE q.id = o.question_id
  AND o.assessment_version_id IS NULL;

ALTER TABLE options
ALTER COLUMN assessment_version_id SET NOT NULL;

ALTER TABLE options
ADD CONSTRAINT options_question_version_fk
FOREIGN KEY (question_id, assessment_version_id)
REFERENCES questions(id, assessment_version_id)
ON DELETE CASCADE;

CREATE UNIQUE INDEX options_assessment_version_option_key_idx
  ON options (assessment_version_id, option_key);

COMMIT;
