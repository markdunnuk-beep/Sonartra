BEGIN;

ALTER TABLE assessment_version_language_signals
  DROP CONSTRAINT IF EXISTS assessment_version_language_signals_section_check;

ALTER TABLE assessment_version_language_signals
  ADD CONSTRAINT assessment_version_language_signals_section_check
  CHECK (section IN ('chapterSummary', 'summary', 'strength', 'watchout', 'development'));

COMMIT;
