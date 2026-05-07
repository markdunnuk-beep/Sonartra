# Database Import Contract

## Purpose

This contract defines how the single-domain ranked-pattern import package maps to database concepts. It is a design contract only; it does not define migrations or implementation code.

The active engine should reuse the existing assessment runtime tables for assessment delivery and scoring, then add normalized import/audit and ranked-pattern language storage.

## Existing Tables To Reuse

### assessments

- Maps from: `00_Metadata`
- Purpose: stable assessment identity.
- Required active fields: assessment key, title, description, active flag.
- Contract: active ranked-pattern assessments must be single-domain only.

### assessment_versions

- Maps from: `00_Metadata`
- Purpose: versioned publish boundary.
- Required active fields: assessment id, version, lifecycle status, mode.
- Contract: active versions for this engine must use `single_domain`.

### signals

- Maps from: `01_Signals`
- Purpose: the four scored signals.
- Required active fields: assessment version id, signal key, label, description, order index.
- Contract: exactly four active scored signals per version.

### questions

- Maps from: `02_Questions`
- Purpose: runtime ordered prompts.
- Required active fields: assessment version id, domain relationship, question key, prompt, order index.
- Contract: all active questions belong to the single active domain.

### options

- Maps from: `03_Options`
- Purpose: runtime ordered selectable answers.
- Required active fields: assessment version id, question id, option key, label/text, order index.
- Contract: options resolve to active questions and are served by the runner.

### option_signal_weights

- Maps from: `04_Option_Weights`
- Purpose: only scoring source.
- Required active fields: option id, signal id, numeric weight.
- Contract: every scored option has explicit weights, or is explicitly unscored in the import contract before publish.

### attempts

- Maps from: runtime, not import package.
- Purpose: user attempt lifecycle.
- Contract: attempts pin to one published assessment version.

### responses

- Maps from: runtime, not import package.
- Purpose: persisted selected options.
- Contract: one response per question per attempt.

### results

- Maps from: runtime completion, not import package.
- Purpose: persisted canonical result payload.
- Contract: `canonical_result_payload` is the only source for result retrieval and rendering.

## Proposed New Concepts

### assessment_import_batches

- Purpose: import transaction boundary for one workbook/package attempt.
- Key fields: `id`, `assessment_id`, `assessment_version_id`, `source_name`, `source_hash`, `import_status`, `started_at`, `completed_at`, `created_by`, `summary`.
- Uniqueness rules: source hash should be unique per assessment version when retained; only one publish-candidate batch may be active per draft version.
- Relationship to assessment_versions: belongs to one target assessment version.
- Runtime required: no. Admin/import QA only.

### assessment_import_files

- Purpose: store package file metadata and sheet-level ingestion records.
- Key fields: `id`, `import_batch_id`, `sheet_key`, `file_name`, `content_hash`, `row_count`, `parsed_at`, `parse_status`.
- Uniqueness rules: one row per `import_batch_id + sheet_key + content_hash`; duplicate sheet keys within a batch are blocked unless explicitly superseded.
- Relationship to assessment_versions: indirectly through `assessment_import_batches`.
- Runtime required: no. Admin/import QA only.

### assessment_import_audit_items

- Purpose: row-level and package-level validation findings.
- Key fields: `id`, `import_batch_id`, `sheet_key`, `row_number`, `severity`, `code`, `message`, `field_key`, `lookup_key`, `related_keys`.
- Uniqueness rules: no hard uniqueness required; findings are appendable per import batch.
- Relationship to assessment_versions: indirectly through `assessment_import_batches`.
- Runtime required: no. Admin/import QA only, but publish must read these findings or equivalent validation output.

### assessment_ranked_patterns

- Purpose: stores the 24 valid rank-order patterns for one assessment version.
- Key fields: `id`, `assessment_version_id`, `domain_key`, `pattern_key`, `rank_1_signal_key`, `rank_2_signal_key`, `rank_3_signal_key`, `rank_4_signal_key`, `status`.
- Uniqueness rules: unique `assessment_version_id + domain_key + pattern_key`; unique rank tuple per version; exactly 24 active rows.
- Relationship to assessment_versions: directly belongs to one assessment version.
- Runtime required: yes. Used to validate generated pattern keys and language coverage.

### assessment_score_shape_rules

- Purpose: stores score shape classification configuration.
- Key fields: `id`, `assessment_version_id`, `score_shape`, `rule_key`, `priority`, `rule_config`, `status`.
- Uniqueness rules: unique `assessment_version_id + score_shape + rule_key`; exactly four supported active score shapes.
- Relationship to assessment_versions: directly belongs to one assessment version.
- Runtime required: yes, unless the platform uses a fixed global score-shape policy. Exact threshold values are a product decision if not supplied by the import schema.

### assessment_result_section_definitions

- Purpose: defines the normalized result-language sections and their lookup policy.
- Key fields: `id`, `assessment_version_id`, `section_key`, `section_order`, `source_sheet_key`, `runtime_category`, `lookup_strategy`, `required_coverage`, `status`.
- Uniqueness rules: unique `assessment_version_id + section_key`; section order unique per version.
- Relationship to assessment_versions: directly belongs to one assessment version.
- Runtime required: yes. Used to assemble payload sections consistently.

### assessment_result_language_rows

- Purpose: normalized storage for runtime result language from sheets `05` to `14`.
- Key fields: `id`, `assessment_version_id`, `section_key`, `lookup_key`, `domain_key`, `pattern_key`, `score_shape`, `signal_key`, `rank_position`, `item_key`, `priority`, `field_values`, `status`.
- Uniqueness rules: unique `assessment_version_id + section_key + lookup_key`; additional section-specific uniqueness derived from section definitions.
- Relationship to assessment_versions: directly belongs to one assessment version and references `assessment_result_section_definitions`.
- Runtime required: yes for sections `05` to `14`.
- Storage rule: prefer one normalized language table with strict section definitions over one runtime table per report section. Section-specific shape is enforced by validator and `field_values` schema rules, not by proliferating tables.

### assessment_report_preview_cases

- Purpose: stores preview/simulation cases from `15_Report_Preview`.
- Key fields: `id`, `assessment_version_id`, `preview_case_key`, `domain_key`, `ranked_signal_keys`, `normalized_scores`, `expected_score_shape`, `expected_pattern_key`, `expected_payload_snapshot`, `status`.
- Uniqueness rules: unique `assessment_version_id + preview_case_key`.
- Relationship to assessment_versions: directly belongs to one assessment version.
- Runtime required: no. Admin/import QA only. Publish validation must prove at least one preview/simulation can assemble a complete payload.

## Sheet Mapping Summary

| Sheet | Database target |
| --- | --- |
| 00_Metadata | `assessments`, `assessment_versions`, import batch metadata |
| 01_Signals | `signals` |
| 02_Questions | `questions` |
| 03_Options | `options` |
| 04_Option_Weights | `option_signal_weights` |
| 05_Context to 14_Closing_Integration | `assessment_result_section_definitions`, `assessment_result_language_rows`, `assessment_ranked_patterns` where pattern-bearing |
| 15_Report_Preview | `assessment_report_preview_cases` |
| 16_Import_Summary | `assessment_import_batches`, `assessment_import_files` |
| 17_Validation_Reference | `assessment_import_audit_items` or import QA metadata |
| 18_Lookups | import QA metadata and platform validation comparison |
