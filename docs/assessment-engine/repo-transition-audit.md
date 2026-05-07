A. Executive Summary
  Read-only audit completed. No files were changed.

  The repo is mid-transition. It has a strong reusable core for database-driven assessment definitions, option-to-signal scoring, deterministic
  normalization, persisted results, and a dedicated single-domain completion branch. But it is not yet aligned with the new ranked-pattern import schema.

  The biggest mismatch: the active runtime still supports two result paths (multi_domain and single_domain), and the single-domain path is still based on an
  older pair/six-section language model, not the new 00_Metadata to 18_Lookups ranked-pattern package.

  B. Current Implementation Map
  Core reusable path:

  - DB definition tables: assessments, assessment_versions, domains, signals, questions, options, option_signal_weights, attempts, responses, results.
  - Runner loads published DB definitions and persisted responses.
  - Completion persists canonical_result_payload.
  - Single-domain result route reads persisted payload through createResultReadModelService.

  Active single-domain runtime:

  - Uses buildSingleDomainResultPayload.
  - Scores via scoreAssessmentResponses.
  - Normalizes via normalizeScoreResult.
  - Ranks signals deterministically.
  - Generates patternKey as ordered four-signal key for full-pattern application only.
  - Does not classify score_shape.

  C. Keep
  Keep:

  - Core DB assessment/attempt/response/result tables.
  - option_signal_weights scoring model.
  - Published assessment runner flow.
  - Result persistence and READY lifecycle.
  - Deterministic ranking/normalization helpers.
  - Single-domain result route shape: /app/results/single-domain/[resultId].
  - Authoring-side reader-first validator as a useful scaffold, but not as runtime importer.

  D. Remove
  Obsolete for the active model:

  - WPLP seed pipeline and scripts: convert:wplp80, verify:wplp80, seed:wplp80.
  - WPLP seed data and exports.
  - WPLP acceptance docs/tests as active product truth.
  - Multi-domain admin creation and builder routes.
  - Generic multi-domain result renderer as an active assessment path.
  - Voice default support hardcoded to wplp80.

  E. Rename/Refactor
  Refactor:

  - multi_domain fallback in resolveAssessmentMode; unknown modes currently fall back to multi-domain.
  - SingleDomainResultPayload naming/content: currently older intro/hero/signals/balancing/pairSummary/application, not ranked-pattern sections.
  - application.patternKey should become part of a broader canonical ranked-pattern result contract, not only application rows.
  - “pair” language should be demoted or replaced where the new model is full ranked pattern first.

  F. Replace
  Replace:

  - Existing single-domain language tables with ranked-pattern import tables or a normalized equivalent.
  - Existing single-domain builder language step with package import/review for 00_Metadata through 18_Lookups.
  - Multi-domain admin authoring with a single active single-domain package/import workflow.
  - Legacy WPLP seed docs as mandatory project truth.

  G. Missing Pieces
  Missing:

  - 00_Metadata, 01_Signals, 02_Questions, 03_Options, 04_Option_Weights.
  - 15_Report_Preview, 16_Import_Summary, 17_Validation_Reference, 18_Lookups.
  - Runtime score_shape classification.
  - Canonical result payload sections matching 05_Context through 14_Closing_Integration.
  - Import persistence path for the new package.
  - Validation that exactly four scored signals exist.
  - Validation that exactly 24 ranked patterns exist per assessment.
  - Runtime lookup by pattern_key + score_shape.

  H. Database Schema Gaps
  Current DB can support:

  - Metadata, signals, questions, options, option weights.
  - Attempts, responses, persisted results.
  - Single-domain mode flag.

  Current DB does not cleanly support:

  - Score-shape-specific rows for Orientation, Recognition, Pattern Mechanics, Pattern Synthesis, Closing Integration.
  - Pattern-level Strengths/Narrowing/Application in the new schema.
  - Lookup/reference/import summary sections.
  - One canonical import package transaction across all 19 sections.
  - Explicit score_shape and ranked pattern lookup tables.

  I. Engine Gaps
  Supports:

  - Option-to-signal weights.
  - Raw signal scores.
  - Normalized percentages.
  - Deterministic ranked signal order.
  - Persisted payload.

  Does not support:

  - score_shape classification.
  - Canonical ranked-pattern pattern_key + score_shape selection across report sections.
  - Enforced exactly-four-signal runtime model.
  - Reader-first result assembly from the new section schema.
  - One active path only: multi-domain engine path still exists.

  J. Admin UI Gaps
  Current admin has:

  - Multi-domain create/builder path.
  - Single-domain builder path with domain/signals/questions/responses/weightings/language/review.
  - Existing language import/admin components for older single-domain datasets.

  Gap:

  - Admin should be replaced by a package importer/reviewer for the new schema. Existing CRUD authoring should be hidden or retired for active builds,
    because it allows drift from the packaged deterministic model.

  K. Runner/Result Page Gaps
  Runner:

  - Mostly reusable. It is DB-driven from published definitions and persists responses.

  Results:

  - Single-domain detail route reads persisted payload, which is good.
  - But the view model recomposes display sections from the older payload contract.
  - Current rendered section model is still intro -> hero -> drivers -> pair -> limitation -> application, not 05_Context through 14_Closing_Integration.
  - Generic result route still handles multi-domain and redirects single-domain.

  L. Import Schema Gaps
  Current reader-first manifest covers only:
  05_Context through 14_Closing_Integration.

  It does not cover:
  00_Metadata, 01_Signals, 02_Questions, 03_Options, 04_Option_Weights, 15_Report_Preview, 16_Import_Summary, 17_Validation_Reference, 18_Lookups.

  It validates authoring files, but does not import into DB or drive runtime.

  M. Recommended Next Build Task
  One next task only:

  Define the canonical database/import contract for the new single-domain ranked-pattern package.

  Scope:

  - Document and design tables/mappings for all 19 sections.
  - Map 00-04 into existing assessment/signals/questions/options/weights tables.
  - Define new ranked-pattern language tables for 05-18.
  - Define required runtime lookup keys: domain_key, pattern_key, score_shape.
  - No UI, no importer implementation, no result rendering changes yet.

  N. Risks Before Build

  - Current repo guidance still names WPLP as mandatory truth, which conflicts with the active model.
  - Multi-domain fallback can silently preserve obsolete paths.
  - Existing single-domain runtime may appear close, but it is pair-oriented and not score-shape-aware.
  - Import schema and runtime schema are currently disconnected.
  - Existing admin CRUD can create definitions that do not match the new package contract.