# Import Package Contract

## Purpose

The ranked-pattern import package is the canonical source format for creating and publishing a single-domain Sonartra assessment version.

The package has three categories:

- runtime assessment definition: sheets `00` to `04`
- runtime result content: sheets `05` to `14`
- admin/import support only: sheets `15` to `18`

Only sheets `00` to `14` may contribute to runtime assessment delivery or persisted result payload assembly. Sheets `15` to `18` support QA, validation, previews, import audit, and authoring governance only.

All import rows require explicit status handling. Publishable runtime rows must be `active` or another configured publishable status. Draft rows are not publishable unless the importer is running an explicit preview-only mode.

## Sheet Contracts

### 00_Metadata

- Category: runtime assessment definition
- Purpose: declares the assessment version identity and active domain.
- Primary key or lookup key: `assessment_key + version`
- Required relationship keys: `domain_key`
- Status handling: one publishable metadata row is required.
- Publish-time validation: exactly one metadata record exists; assessment key, version, title, and domain key are present; declared model is single-domain ranked-pattern.

### 01_Signals

- Category: runtime assessment definition
- Purpose: declares the four scored signals available in the assessment version.
- Primary key or lookup key: `domain_key + signal_key`
- Required relationship keys: `domain_key`
- Status handling: exactly four publishable scored signal rows are required.
- Publish-time validation: all keys are unique, active, non-empty, and attached to the metadata domain; no overlay or unscored signal rows are publishable for this engine version.

### 02_Questions

- Category: runtime assessment definition
- Purpose: defines ordered assessment prompts.
- Primary key or lookup key: `domain_key + question_key`
- Required relationship keys: `domain_key`
- Status handling: only active questions are delivered at runtime.
- Publish-time validation: question keys are unique, order is deterministic, every active question belongs to the active domain, and every active question has active options.

### 03_Options

- Category: runtime assessment definition
- Purpose: defines ordered selectable options for each question.
- Primary key or lookup key: `question_key + option_key`
- Required relationship keys: `domain_key`, `question_key`
- Status handling: only active options are delivered at runtime.
- Publish-time validation: every option resolves to an active question; option order is deterministic; every active question has the required option set; every scored option has explicit weights or is explicitly marked unscored.

### 04_Option_Weights

- Category: runtime assessment definition
- Purpose: maps selected options to scored signal weights.
- Primary key or lookup key: `option_key + signal_key`
- Required relationship keys: `domain_key`, `question_key`, `option_key`, `signal_key`
- Status handling: active rows participate in scoring; inactive rows are ignored.
- Publish-time validation: every row resolves to one active option and one active scored signal; weights are numeric and deterministic; duplicate option/signal mappings are blocked.

### 05_Context

- Category: runtime result content
- Purpose: provides domain-level context and interpretation guidance.
- Primary key or lookup key: `domain_key + section_key`, recommended `lookup_key = domain_key::intro`
- Required relationship keys: `domain_key`
- Status handling: one publishable row is required.
- Publish-time validation: row resolves to active domain and required text fields are complete.

### 06_Orientation

- Category: runtime result content
- Purpose: gives the first ranked-pattern orientation for a specific pattern and score shape.
- Primary key or lookup key: `domain_key + pattern_key + score_shape`
- Required relationship keys: `domain_key`, `pattern_key`, `score_shape`, `rank_1_signal_key` to `rank_4_signal_key`
- Status handling: active rows are eligible for result assembly.
- Publish-time validation: complete coverage is required for all 24 `pattern_key` values across all 4 supported `score_shape` values.

### 07_Recognition

- Category: runtime result content
- Purpose: provides recognition language for a pattern and score shape.
- Primary key or lookup key: `domain_key + pattern_key + score_shape`
- Required relationship keys: `domain_key`, `pattern_key`, `score_shape`, `rank_1_signal_key` to `rank_4_signal_key`
- Status handling: active rows are eligible for result assembly.
- Publish-time validation: complete 24 x 4 coverage; pattern key must match rank order.

### 08_Signal_Roles

- Category: runtime result content
- Purpose: defines how each signal reads when it appears in each ranked role.
- Primary key or lookup key: `domain_key + signal_key + rank_position`
- Required relationship keys: `domain_key`, `signal_key`, `rank_position`
- Status handling: active rows are eligible for result assembly.
- Publish-time validation: exactly four active role rows per signal; rank positions cover 1 to 4 once per signal.

### 09_Pattern_Mechanics

- Category: runtime result content
- Purpose: explains why the ranked pattern shows up and what it protects.
- Primary key or lookup key: `domain_key + pattern_key + score_shape`
- Required relationship keys: `domain_key`, `pattern_key`, `score_shape`, `rank_1_signal_key` to `rank_4_signal_key`
- Status handling: active rows are eligible for result assembly.
- Publish-time validation: complete 24 x 4 coverage; pattern key must match rank order.

### 10_Pattern_Synthesis

- Category: runtime result content
- Purpose: synthesizes the gift, trap, takeaway, and broader pattern meaning.
- Primary key or lookup key: `domain_key + pattern_key + score_shape`
- Required relationship keys: `domain_key`, `pattern_key`, `score_shape`, `rank_1_signal_key` to `rank_4_signal_key`
- Status handling: active rows are eligible for result assembly.
- Publish-time validation: complete 24 x 4 coverage; pattern key must match rank order.

### 11_Strengths

- Category: runtime result content
- Purpose: lists pattern-specific strengths.
- Primary key or lookup key: `domain_key + pattern_key + strength_key`
- Required relationship keys: `domain_key`, `pattern_key`, `linked_signal_key`
- Status handling: active rows are eligible for result assembly.
- Publish-time validation: required number of strength rows exists for each of 24 patterns; priorities are unique and deterministic within each pattern.

### 12_Narrowing

- Category: runtime result content
- Purpose: lists where the pattern can narrow or overuse its strongest route.
- Primary key or lookup key: `domain_key + pattern_key + narrowing_key`
- Required relationship keys: `domain_key`, `pattern_key`, `missing_range_signal_key`
- Status handling: active rows are eligible for result assembly.
- Publish-time validation: required number of narrowing rows exists for each of 24 patterns; referenced signals resolve.

### 13_Application

- Category: runtime result content
- Purpose: provides practical application guidance for the selected pattern.
- Primary key or lookup key: `domain_key + pattern_key + application_key`
- Required relationship keys: `domain_key`, `pattern_key`, `linked_signal_key`
- Status handling: active rows are eligible for result assembly.
- Publish-time validation: required number of application rows exists for each of 24 patterns; priorities are unique and deterministic within each pattern.

### 14_Closing_Integration

- Category: runtime result content
- Purpose: closes the result with the integrated meaning, gift, trap, development edge, and memorable line.
- Primary key or lookup key: `domain_key + pattern_key + score_shape`
- Required relationship keys: `domain_key`, `pattern_key`, `score_shape`
- Status handling: active rows are eligible for result assembly.
- Publish-time validation: complete 24 x 4 coverage.

### 15_Report_Preview

- Category: admin/import support only
- Purpose: supplies preview cases for authoring review and import QA.
- Primary key or lookup key: `preview_case_key`
- Required relationship keys: `domain_key`, expected ranked signal keys, expected score shape, expected pattern key
- Status handling: preview rows may be draft or active, but they are not runtime result sections.
- Publish-time validation: at least one valid preview or simulation case must prove result payload assembly; preview rows are not persisted into user results.

### 16_Import_Summary

- Category: admin/import support only
- Purpose: captures package-level summary, source provenance, row counts, and authoring notes.
- Primary key or lookup key: `import_summary_key` or import batch id
- Required relationship keys: assessment key, version, package identifier
- Status handling: not used by runtime.
- Publish-time validation: row counts must agree with imported runtime sections before publish.

### 17_Validation_Reference

- Category: admin/import support only
- Purpose: records expected validation rules, allowed values, and coverage expectations shipped with the package.
- Primary key or lookup key: `validation_rule_key`
- Required relationship keys: section key, field key, allowed values or expected count
- Status handling: not used by runtime result assembly.
- Publish-time validation: imported package must pass the active platform validator; package reference rows may inform diagnostics but do not override platform rules.

### 18_Lookups

- Category: admin/import support only
- Purpose: defines controlled values such as statuses, score shapes, rank positions, and section keys.
- Primary key or lookup key: `lookup_group + lookup_key`
- Required relationship keys: section key or field key when applicable
- Status handling: lookup rows are import governance data only unless explicitly promoted into platform configuration.
- Publish-time validation: runtime rows must use supported platform values; unsupported lookup additions are blocked until the platform contract is updated.
