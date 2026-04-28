-- WARNING: DESTRUCTIVE OPERATION
-- This script permanently deletes assessment-related runtime and definition data.
-- It is intended for Supabase SQL Editor use when you need a clean assessment slate.
-- Do NOT run this in an environment where you need to preserve assessment content,
-- attempts, responses, results, assignments, or voice assessment runtime history.
--
-- This script does NOT delete:
-- - users
-- - organisations
-- - Clerk/auth records
-- - admin/user roles
-- - unrelated application settings
--
-- FK notes:
-- - Runtime children are deleted before attempts / questions / options / assessments.
-- - Assessment-language tables are listed explicitly even though most cascade from assessment_versions.
-- - Voice runtime tables are included because they reference attempts, questions, options, and assessments.

BEGIN;

-- Voice runtime branch
DELETE FROM voice_session_events;
DELETE FROM voice_response_resolutions;
DELETE FROM voice_session_turns;
DELETE FROM voice_sessions;

-- Core runtime branch
DELETE FROM responses;
DELETE FROM results;
DELETE FROM user_assessment_assignments;
DELETE FROM attempts;

-- Single-domain language / import tables
DELETE FROM assessment_version_single_domain_driver_claims;
DELETE FROM assessment_version_single_domain_application_statements;
DELETE FROM assessment_version_single_domain_pair_summaries;
DELETE FROM assessment_version_single_domain_balancing_sections;
DELETE FROM assessment_version_single_domain_signal_chapters;
DELETE FROM assessment_version_single_domain_hero_pairs;
DELETE FROM assessment_version_single_domain_framing;

-- Multi-domain and generic assessment-language tables
DELETE FROM assessment_version_application_action_prompts;
DELETE FROM assessment_version_application_development;
DELETE FROM assessment_version_application_risk;
DELETE FROM assessment_version_application_contribution;
DELETE FROM assessment_version_application_thesis;
DELETE FROM assessment_version_hero_pattern_language;
DELETE FROM assessment_version_hero_pattern_rules;
DELETE FROM assessment_version_pair_trait_weights;
DELETE FROM assessment_version_intro;
DELETE FROM assessment_version_language_hero_headers;
DELETE FROM assessment_version_language_assessment;
DELETE FROM assessment_version_language_overview;
DELETE FROM assessment_version_language_domains;
DELETE FROM assessment_version_language_pairs;
DELETE FROM assessment_version_language_signals;

-- Core authored definition tables
DELETE FROM option_signal_weights;
DELETE FROM options;
DELETE FROM questions;
DELETE FROM signals;
DELETE FROM domains;
DELETE FROM assessment_versions;
DELETE FROM assessments;

COMMIT;
