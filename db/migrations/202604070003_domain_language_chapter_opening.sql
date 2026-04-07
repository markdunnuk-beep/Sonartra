BEGIN;

ALTER TABLE assessment_version_language_domains
  DROP CONSTRAINT IF EXISTS assessment_version_language_domains_section_check;

ALTER TABLE assessment_version_language_domains
  ADD CONSTRAINT assessment_version_language_domains_section_check
  CHECK (section IN ('chapterOpening', 'summary')) NOT VALID;

COMMIT;
