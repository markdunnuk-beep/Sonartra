# Sonartra MVP Canonical Database Schema

This schema is the Task 4 foundation for Sonartra's engine-first runtime.

## Why this schema exists

The model enforces one execution path:

1. Assessment definitions are loaded from relational tables.
2. Responses are captured per attempt and question.
3. The engine computes using `option_signal_weights` only.
4. A single canonical result payload is persisted in `results`.
5. Dashboard/results consumers read that persisted payload only.

No alternate result format tables are introduced. No runtime Excel/JSON parsing is represented.

## Tables

### Definition tables (versioned runtime model)

- `assessments`: top-level assessment identity (`assessment_key`) and metadata.
- `assessment_versions`: versioned snapshots and publish lifecycle (`DRAFT` / `PUBLISHED` / `ARCHIVED`).
- `domains`: version-scoped domain groupings, with explicit `domain_type`:
  - `QUESTION_SECTION`
  - `SIGNAL_GROUP`
- `signals`: version-scoped scoring signals, ordered and attached to a signal-group domain.
- `questions`: version-scoped ordered prompts, attached to question-section domains.
- `options`: ordered selectable options per question.
- `option_signal_weights`: canonical deterministic option → signal numeric weights.

### Runtime tables (attempt, response, result)

- `attempts`: user attempt/session lifecycle (`NOT_STARTED` → `RESULT_READY` / `FAILED`) and timestamps.
- `responses`: exactly one active response per attempt + question; overwrite is supported by upsert.
- `results`: one row per attempt, storing pipeline/readiness state and the single canonical result payload (`canonical_result_payload` JSONB).

## Key relational rules

- One published version per assessment is enforced with a partial unique index.
- Domains, signals, and questions are all version-scoped and ordered.
- Signals and questions are constrained to domains from the same `assessment_version_id`.
- Responses enforce one-answer-per-question-per-attempt with `UNIQUE (attempt_id, question_id)`.
- Responses enforce option/question consistency via `(question_id, selected_option_id)` FK.
- Results enforce one canonical payload contract per attempt via `UNIQUE (attempt_id)`.
- `results` check constraint enforces payload presence when `readiness_status = 'READY'`.

## Premium language tables

The premium language persistence layer is version-scoped and assessment-owned.

- `assessment_version_language_signals`: signal language blocks with sections `summary`, `strength`, `watchout`, `development`.
- `assessment_version_language_pairs`: signal-pair language blocks with sections `summary`, `strength`, `watchout`.
- `assessment_version_language_domains`: domain language blocks with sections `summary`, `focus`, `pressure`, `environment`.
- `assessment_version_language_overview`: overview language blocks with sections `headline`, `summary`, `strengths`, `watchouts`, `development`.

Each language table:

- is owned by `assessment_version_id`
- rejects blank `content` via `CHECK (btrim(content) <> '')`
- enforces deterministic uniqueness on `(assessment_version_id, key, section)`
- avoids any global language store outside an assessment version

## WPLP-80 fidelity choice

WPLP-80 contains both question sections and scoring signal groups. The `domains.domain_type` field preserves both cleanly without parallel schemas.

## Migration location

- `db/migrations/202603260001_mvp_canonical_schema.sql`
- `db/migrations/202604010001_assessment_version_language_tables.sql`

Run this migration before Task 5 seeding.
