# Sonartra Report-First Fully Authored Import Template

This folder contains the reusable workbook template for the current Sonartra ranked-pattern report-first authoring model.

Use this template by copying `sonartra_report_first_fully_authored_import_TEMPLATE.xlsx` into a new assessment package folder, then replacing the placeholder metadata, signals, questions, options, weights, ranked patterns, and report-first report rows with the new assessment's authored content.

## Current Model

The current report-first model is based on the production-ready Leadership Approach version 3 package:

- one assessment domain
- four scored signals
- twenty-four ranked signal patterns
- one fully authored report per `pattern_key`
- twenty-four total report-first templates per assessment version
- deterministic scoring from `option_signal_weights`
- persisted canonical report payloads for result retrieval
- no runtime AI-generated prose

Runtime must not read this workbook directly. The workbook is an authoring and import artifact only. After import and publish preparation, report-first templates are stored in the database and completion persists the canonical report payload used by result pages, workspace cards, and assessment inventory.

## What This Template Is Not

The old single-domain builder is legacy and is not the source for report-first authoring.

This template does not use:

- score-shape language variants
- WPLP authoring
- multi-domain authoring
- pair-oriented single-domain builder rows
- overlays, archetypes, thresholds, or sentence-library rule-engine prose

Do not create separate report-first report rows for `concentrated`, `paired`, `graduated`, or `balanced`. Report-first coverage is one fully authored report per ranked `pattern_key`.

## Workbook Structure

The current ranked-pattern workbook parser still expects sheets `00_Metadata` through `18_Lookups` by exact name and header. Those sheets remain in this template so the package stays aligned with the current importer contract.

For report-first authoring, use `19_Report_First_Templates`.

The old score-shape language sheets are retained as contract placeholders only:

- `06_Orientation`
- `07_Recognition`
- `09_Pattern_Mechanics`
- `10_Pattern_Synthesis`
- `14_Closing_Integration`

Do not fill those sheets with score-shape report variants for report-first packages unless the importer is explicitly changed for a different model.

## Report-First Template Sheet

`19_Report_First_Templates` contains twenty-four placeholder rows, one for each ranked order of four generic signal keys:

- `signal_a`
- `signal_b`
- `signal_c`
- `signal_d`

For a real assessment, replace those keys with the assessment's four scored `signal_key` values and keep exactly one row per `pattern_key`.

Required report-first storage fields include:

- `assessment_key`
- `assessment_version`
- `package_key`
- `package_version`
- `domain_key`
- `pattern_key`
- `report_key`
- `report_contract`
- `score_shape_policy`
- `score_shape`
- `supported_score_shapes`
- `source_markdown_path`
- `source_content_hash`
- `content_hash`
- `report_template_json`
- `status`
- `manifest_status`
- `publishable`
- `ready_for_import`

`report_contract` must be `report_first_canonical_payload_v1`.

`score_shape_policy` must be `pattern_level_score_shape_neutral`.

`score_shape` must stay blank/null for report-first templates. The database column exists for compatibility metadata, but report-first publish readiness requires pattern-level score-shape-neutral rows with `score_shape` set to null.

## Coverage Rule

Publish readiness expects:

- 24 active/publishable report-first templates
- exactly one active template per ranked `pattern_key`
- no duplicate `pattern_key`
- no missing ranked patterns
- each `pattern_key` resolves to an active ranked pattern
- each template uses the report-first contract
- each template contains a complete structured report body
- no score-shape language expansion

## Authoring Notes

The `report_template_json` cell is intended to hold the compiled structured report JSON for that pattern. The current Leadership package generates this from fully authored markdown and stores/imports it through the report-first template artifact path. If future workflow work imports this sheet directly, it should preserve the same storage contract and still avoid runtime workbook reads.

