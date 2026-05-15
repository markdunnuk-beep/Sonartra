# Leadership Approach Test Assessment Package

This folder contains a test/admin import validation package for the reusable Sonartra ranked-pattern import workflow.

The workbook is intended to validate:

- create draft version
- audit package
- dry-run import
- apply import to draft
- run publish audit
- publish audited draft
- complete assessment
- render the persisted result payload

## Status

This is not final approved commercial Leadership Approach content.

The package combines structurally valid draft runtime definition rows with existing Leadership Approach reader-first authoring rows where compatible. It is suitable for validating the import contract and admin workflow, but it should not be treated as the editorially approved Leadership Approach product package without explicit approval.

Flow State remains the original populated example fixture for the ranked-pattern import contract.

## Files

- `sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx`
- `report-first-template-manifest.json`

## Runtime Boundary

The workbook is an authoring/import artifact only.

The runtime engine must not read this workbook. Runtime assessment delivery, scoring, result assembly, and result rendering must use database records and persisted result payloads only.

## Package Identity

- `assessment_key`: `leadership-approach`
- `version`: `1.00-test`
- `domain_key`: `leadership_approach`
- `domain_title`: `Leadership Approach`
- scored signals: `results`, `process`, `vision`, `people`

## Report-First Template Coverage

Report-first editorial source remains canonical under:

- `content/authoring/leadership-approach/report-first/canonical-reports/`

The package-level report-first manifest is:

- `content/assessment-packages/leadership-approach/report-first-template-manifest.json`

The manifest maps the 24 required ranked-pattern `pattern_key` permutations for the four scored
signals to their source Markdown paths when authored. It is an import-readiness map, not a second
source of report prose.

Current coverage:

- expected patterns: 24
- authored/import-ready templates: 4
- missing templates: 20
- package publishable as report-first: no

Available templates:

- `process_results_people_vision`
- `results_process_people_vision`
- `people_process_results_vision`
- `vision_people_process_results`

Missing templates are explicitly marked `missing`, `ready_for_import: false`, and
`publishable: false`. They must not satisfy publish readiness until full canonical reports are
authored, compiled, reviewed, and marked import-ready.

The compiler path remains:

1. Author canonical Markdown in `content/authoring/leadership-approach/report-first/canonical-reports/`.
2. Compile with `scripts/authoring/compile-report-first-template.ts`.
3. Validate coverage through `lib/server/leadership-report-first-package.ts`.
4. Later import compiled structured JSON into `assessment_report_first_templates`.

The runtime engine must not read the manifest, Markdown, or workbook. Runtime result pages continue
to read persisted `canonical_result_payload` only.
