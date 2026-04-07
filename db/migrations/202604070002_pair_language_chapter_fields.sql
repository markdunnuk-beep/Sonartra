BEGIN;

ALTER TABLE assessment_version_language_pairs
  DROP CONSTRAINT IF EXISTS assessment_version_language_pairs_section_check;

ALTER TABLE assessment_version_language_pairs
  ADD CONSTRAINT assessment_version_language_pairs_section_check
  CHECK (
    section IN (
      'chapterSummary',
      'pressureFocus',
      'environmentFocus',
      'summary',
      'strength',
      'watchout'
    )
  );

COMMIT;
