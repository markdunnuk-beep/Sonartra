# Report-First Fully Authored Package Contract

## Purpose

This document defines the clean source-of-truth authoring contract for future Sonartra report-first fully authored assessment packages.

This contract is for authoring and import preparation only. It is not a runtime contract. Runtime must continue to load published database rows, compute scores from option weights, persist one canonical result payload, and render persisted `canonical_result_payload`.

The model is:

- one assessment
- one active domain
- four scored signals
- twenty-four ranked signal patterns
- twenty-four fully authored premium reports
- one report per `pattern_key`
- no score-shape report variants
- no modular report-language worksheet assembly
- no runtime AI-generated prose

## Out Of Scope

The following are explicitly out of scope for this clean authoring contract:

- the legacy `00_Metadata` through `18_Lookups` workbook as the authoring model
- the legacy `05_Context` through `14_Closing_Integration` modular report-language worksheets as the clean authoring model
- score-shape language variants
- `concentrated`, `paired`, `graduated`, or `balanced` report variants
- the old single-domain builder
- WPLP
- multi-domain authoring
- pair-oriented report language
- thresholds
- archetypes
- overlays
- sentence-library rule engines
- runtime AI-generated prose

## Clean Workbook Sheets

Future report-first fully authored packages should use these sheets:

1. `00_Assessment`
2. `01_Signals`
3. `02_Questions`
4. `03_Options`
5. `04_Option_Weights`
6. `05_Ranked_Patterns`
7. `06_Report_Templates`
8. `07_Report_QA_Cases`
9. `08_Import_Summary`
10. `09_Lookups`

## Status Handling

Every sheet that includes `status` uses controlled values from `09_Lookups`.

Allowed values:

- `draft`
- `active`
- `inactive`

Import and publish readiness should only consider rows whose status is publishable for the intended stage. By default, `active` rows are publishable. `draft` rows may be imported into a draft package but must not be treated as published runtime rows. `inactive` rows must not participate in scoring, pattern resolution, report coverage, or preview readiness.

## Pattern Key Generation

`pattern_key` is deterministic and must be generated from the ranked signal tuple:

```text
pattern_key = rank_1_signal_key + "_" + rank_2_signal_key + "_" + rank_3_signal_key + "_" + rank_4_signal_key
```

The rank tuple must contain the four active scored signal keys exactly once.

## 00_Assessment

Purpose: define the assessment identity, version, active domain, and report contract.

Runtime/admin category: `assessment_definition`

Required columns:

- `assessment_key`
- `assessment_title`
- `assessment_description`
- `version`
- `domain_key`
- `domain_title`
- `domain_definition`
- `domain_scope`
- `model_key`
- `report_contract`
- `status`

Optional columns:

- `audience`
- `reader_promise`
- `authoring_notes`

Required row count:

- exactly 1 active row

Key uniqueness rules:

- `assessment_key` plus `version` must identify one package version.
- `domain_key` must be unique within the package.

Relationship keys:

- `assessment_key` and `version` are referenced by report templates, QA cases, and import summary rows.
- `domain_key` is referenced by signals, questions, options, weights, patterns, reports, and QA cases.

Publish/import validation rules:

- `model_key` must identify the report-first fully authored ranked-pattern model.
- `report_contract` must be `report_first_canonical_payload_v1`.
- `domain_key` must resolve across all relevant sheets.
- exactly one row must be active for the package.
- `status` must be publishable for import or publish.

## 01_Signals

Purpose: define the four scored signals used by the assessment.

Runtime/admin category: `assessment_definition`

Required columns:

- `domain_key`
- `signal_key`
- `signal_label`
- `signal_short_label`
- `signal_description`
- `signal_order`
- `is_scored`
- `status`

Optional columns:

- `signal_reader_description`
- `signal_authoring_notes`

Required row count:

- exactly 4 active scored signals

Key uniqueness rules:

- `signal_key` values must be unique within the active domain.
- `signal_order` must cover 1 through 4 once.

Relationship keys:

- `domain_key` resolves to `00_Assessment.domain_key`.
- `signal_key` is referenced by option weights, ranked patterns, report templates, and QA cases.

Publish/import validation rules:

- all four active signals must be scored.
- no overlay or unscored dimension may be treated as a publishable signal.
- every active signal must be represented in the 24 ranked-pattern permutations.
- inactive signals must not appear in active scoring or report coverage.

## 02_Questions

Purpose: define ordered assessment prompts.

Runtime/admin category: `assessment_definition`

Required columns:

- `domain_key`
- `question_key`
- `question_order`
- `prompt`
- `status`

Optional columns:

- `helper_text`
- `question_theme`
- `authoring_notes`

Required row count:

- assessment-specific. Leadership currently uses 24 questions, but 24 questions must not become a global hard gate unless a specific package declares it.

Key uniqueness rules:

- `question_key` values must be unique within the assessment and domain.
- `question_order` must be unique among active questions and deterministic.

Relationship keys:

- `domain_key` resolves to `00_Assessment.domain_key`.
- `question_key` is referenced by options and option weights.

Publish/import validation rules:

- active questions must resolve to the active domain.
- every active question must have active options.
- inactive questions must not be served by the runner.
- prompt text must be present for every active question.

## 03_Options

Purpose: define ordered selectable options for each question.

Runtime/admin category: `assessment_definition`

Required columns:

- `domain_key`
- `question_key`
- `option_key`
- `option_order`
- `option_label`
- `option_text`
- `status`

Optional columns:

- `option_intent`
- `authoring_notes`

Required row count:

- assessment-specific. Every active question must have its required active option set.

Key uniqueness rules:

- `option_key` must be unique within `question_key` scope.
- `option_order` must be unique within each active question.

Relationship keys:

- `domain_key` resolves to `00_Assessment.domain_key`.
- `question_key` resolves to `02_Questions.question_key`.
- `option_key` is referenced by option weights.

Publish/import validation rules:

- each option must resolve to an active question.
- option ordering must be deterministic.
- every active question must have the required option set for that assessment.
- inactive options must not be selectable by the runner.

## 04_Option_Weights

Purpose: map selected options to scored signal weights.

Runtime/admin category: `scoring_definition`

Required columns:

- `domain_key`
- `question_key`
- `option_key`
- `signal_key`
- `weight`
- `status`

Optional columns:

- `weighting_notes`

Required row count:

- assessment-specific. Every active scored option must have the required signal-weight mapping for deterministic scoring.

Key uniqueness rules:

- duplicate active `question_key` plus `option_key` plus `signal_key` mappings are blocked.

Relationship keys:

- `domain_key` resolves to `00_Assessment.domain_key`.
- `question_key` and `option_key` resolve to an active option in `03_Options`.
- `signal_key` resolves to an active scored signal in `01_Signals`.

Publish/import validation rules:

- every weight row must resolve to an active option and active scored signal.
- `weight` must be numeric.
- scoring must remain deterministic from option weights.
- no runtime AI, UI calculation, or alternate scoring path may influence scoring.
- inactive weight rows must not be used by scoring.

## 05_Ranked_Patterns

Purpose: define the 24 ranked signal permutations that can resolve from scoring.

Runtime/admin category: `scoring_definition`

Required columns:

- `domain_key`
- `pattern_key`
- `rank_1_signal_key`
- `rank_2_signal_key`
- `rank_3_signal_key`
- `rank_4_signal_key`
- `pattern_order`
- `status`

Optional columns:

- `pattern_label`
- `pattern_short_summary`
- `authoring_notes`

Required row count:

- exactly 24 active rows

Key uniqueness rules:

- no duplicate active `pattern_key` values.
- no duplicate active rank tuples.
- `pattern_order` must be unique and deterministic across the 24 active patterns.

Relationship keys:

- `domain_key` resolves to `00_Assessment.domain_key`.
- each ranked signal key resolves to an active scored signal in `01_Signals`.
- `pattern_key` is referenced by report templates and QA cases.

Publish/import validation rules:

- each `pattern_key` must be generated from `rank_1_signal_key` through `rank_4_signal_key` using the pattern key generation rule.
- each rank tuple must contain the four active signal keys exactly once.
- all 24 permutations of the four active signals must be represented once.
- inactive ranked patterns must not be considered valid result targets.

## 06_Report_Templates

Purpose: define the 24 fully authored premium reports, one report per ranked pattern.

Runtime/admin category: `report_authoring`

Required columns:

- `assessment_key`
- `version`
- `domain_key`
- `pattern_key`
- `rank_1_signal_key`
- `rank_2_signal_key`
- `rank_3_signal_key`
- `rank_4_signal_key`
- `report_title`
- `report_subtitle`
- `concise_takeaway`
- `opening_summary`
- `report_body_json`
- `closing_summary`
- `memorable_line`
- `report_contract`
- `status`

Optional columns:

- `report_slug`
- `editorial_version`
- `author`
- `reviewed_by`
- `quality_score`
- `authoring_notes`
- `source_markdown_path`
- `source_doc_path`

Required row count:

- exactly 24 active or publishable report rows.
- exactly one active report row per active `pattern_key`.

Key uniqueness rules:

- duplicate active report rows for the same `pattern_key` are blocked.
- `report_slug`, if provided, must be unique within the assessment version.

Relationship keys:

- `assessment_key` and `version` resolve to `00_Assessment`.
- `domain_key` resolves to `00_Assessment.domain_key`.
- `pattern_key` resolves to `05_Ranked_Patterns.pattern_key`.
- rank signal keys must match the resolved ranked pattern.

Publish/import validation rules:

- `pattern_key` must resolve to an active ranked pattern.
- `rank_1_signal_key` through `rank_4_signal_key` must match the resolved ranked pattern.
- `report_contract` must be `report_first_canonical_payload_v1`.
- `report_body_json` must be present and valid structured JSON if it is used as the canonical report content field.
- every active `pattern_key` must have exactly one active report template.
- missing report templates block import and publish readiness.
- `score_shape` must not be required.
- `concentrated`, `paired`, `graduated`, and `balanced` variants must not be created.
- reports are fully authored. They are not assembled from modular `05_Context` through `14_Closing_Integration` worksheet prose at authoring time.

Report body guidance:

If the implementation stores structured report JSON, `report_body_json` is the canonical complete report field.

`report_body_json` should be capable of representing the premium report structure, including:

- opening blocks
- ranked signal summary
- evidence or score explanation
- chapter sections
- strengths
- risks or tightening patterns
- development actions
- reflection prompts
- closing synthesis

If future authoring uses separate markdown or source documents, those sources should compile into `report_body_json`. Do not reintroduce the old modular worksheet model as the clean authoring surface.

## 07_Report_QA_Cases

Purpose: provide preview and QA cases for authoring review, import validation, and report rendering checks.

Runtime/admin category: `qa_support`

Required columns:

- `qa_case_key`
- `assessment_key`
- `version`
- `domain_key`
- `pattern_key`
- `rank_1_signal_key`
- `rank_2_signal_key`
- `rank_3_signal_key`
- `rank_4_signal_key`
- `expected_report_contract`
- `expected_report_title`
- `status`

Optional columns:

- `normalized_rank_1`
- `normalized_rank_2`
- `normalized_rank_3`
- `normalized_rank_4`
- `qa_notes`
- `reviewer_notes`

Required row count:

- at least one valid active QA case should exist before import or publish readiness.

Key uniqueness rules:

- `qa_case_key` must be unique within the assessment version.

Relationship keys:

- `assessment_key` and `version` resolve to `00_Assessment`.
- `domain_key` resolves to `00_Assessment.domain_key`.
- `pattern_key` resolves to `05_Ranked_Patterns.pattern_key`.
- rank signal keys must match the resolved ranked pattern.

Publish/import validation rules:

- QA rows are not runtime report templates.
- QA cases must resolve to active `pattern_key` values.
- `expected_report_contract` must be `report_first_canonical_payload_v1`.
- QA rows must not be persisted as user result content.

## 08_Import_Summary

Purpose: capture package-level summary, provenance, authoring notes, and expected row counts.

Runtime/admin category: `import_governance`

Required columns:

- `import_summary_key`
- `assessment_key`
- `version`
- `package_identifier`
- `source_name`
- `generated_at`
- `generated_by`
- `expected_signal_count`
- `expected_pattern_count`
- `expected_report_template_count`
- `status`

Optional columns:

- `source_hash`
- `authoring_notes`
- `validation_notes`
- `release_notes`

Required row count:

- exactly 1 active or draft row per package version.

Key uniqueness rules:

- `import_summary_key` must be unique.
- `assessment_key` plus `version` must resolve to the single assessment row.

Relationship keys:

- `assessment_key` and `version` resolve to `00_Assessment`.

Publish/import validation rules:

- `expected_signal_count` should be 4.
- `expected_pattern_count` should be 24.
- `expected_report_template_count` should be 24.
- row count claims must match actual package content.
- inactive summary rows must not authorize import or publish readiness.

## 09_Lookups

Purpose: define controlled values used by the clean authoring package.

Runtime/admin category: `import_governance`

Required columns:

- `lookup_group`
- `lookup_key`
- `lookup_label`
- `sort_order`
- `applies_to_sheet`
- `applies_to_field`
- `status`

Optional columns:

- `notes`

Required row count:

- enough rows to define the required lookup groups and values below.

Required lookup groups:

- `status`
- `model_key`
- `report_contract`
- `runtime_category`
- `rank_position`

Required lookup values:

`status`:

- `draft`
- `active`
- `inactive`

`report_contract`:

- `report_first_canonical_payload_v1`

`rank_position`:

- `1`
- `2`
- `3`
- `4`

`runtime_category`:

- `assessment_definition`
- `scoring_definition`
- `report_authoring`
- `qa_support`
- `import_governance`

Key uniqueness rules:

- `lookup_group` plus `lookup_key` must be unique.

Relationship keys:

- lookup rows constrain controlled fields across all package sheets.

Publish/import validation rules:

- required lookup groups and values must be present.
- do not include `score_shape` as a report-template variant lookup.
- inactive lookup rows must not authorize active package values.

## Report Coverage Audit

Import and publish readiness must require:

- exactly four active scored signals
- exactly 24 active ranked patterns
- exactly 24 active report templates
- one active report template per active `pattern_key`
- no duplicate active report templates
- valid `report_contract` on every report template
- present and valid `report_body_json` on every active report template
- no score-shape variant expansion
- no unresolved signal references
- no unresolved pattern references
- all active ranked patterns resolve to exactly four active scored signals
- all active report templates resolve to active ranked patterns

Readiness must fail when any active pattern lacks a report template, when any active template references a missing pattern, or when score-shape report variants are introduced.

## Relationship To Persisted Canonical Result Payload

The workbook is an authoring and import artifact. Runtime must not read the workbook directly.

After import and publish, the database-backed report templates are used by the completion pipeline to produce and persist `canonical_result_payload`.

Result pages render persisted `canonical_result_payload` only. Retrieval layers must not reassemble reports from workbook rows, markdown files, JSON package files, or UI-side language lookups.

The report-first result remains deterministic:

- scoring comes from selected options and option weights.
- pattern resolution comes from ranked scored signals.
- report content comes from the imported fully authored template for the resolved `pattern_key`.
- the user-facing page renders the persisted canonical payload.

## Relationship to existing production importer

The clean report-first authoring package is the future authoring source of truth.

The existing `00_Metadata` through `18_Lookups` workbook may still exist as a parser and import compatibility layer. That compatibility workbook must not define the editorial authoring model.

The fully authored report source in this clean contract is `06_Report_Templates`.

Future importer or compiler work should map the clean authoring package into the current production storage and import requirements. The clean package should not preserve legacy sheet names solely because the current parser expects them.

The previously regenerated report-first workbook should be treated as a legacy-compatible bridge artifact, not as the clean authoring package.

## Open Implementation Questions

Resolve these before RFA-02 or RFA-03:

- Should `report_body_json` be the only canonical report content field, or should it be compiled from markdown or source documents during authoring?
- Will the existing importer be adapted directly, or will a compiler map the clean package into current storage and import requirements?
- Should question count remain package-configurable, or should some future package types declare fixed question-count gates?
- Should QA cases include normalized scores, or only ranked signal order?
- How should editorial versioning be represented across drafts, reviews, and published report templates?
- Should source markdown paths be required for editorial traceability, or remain optional authoring metadata?
- What validation should compare `report_title`, `opening_summary`, and `closing_summary` against `report_body_json` when those fields overlap?
