CREATE TABLE assessment_version_language_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT assessment_language_unique UNIQUE (assessment_version_id, section),
  CONSTRAINT assessment_language_section_check CHECK (section = 'assessment_description'),
  CONSTRAINT assessment_language_content_check CHECK (length(trim(content)) > 0)
);
