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
- `generated/report-first-template-import-rows.json`

## Runtime Boundary

The workbook is an authoring/import artifact only.

The runtime engine must not read this workbook. Runtime assessment delivery, scoring, result assembly, and result rendering must use database records and persisted result payloads only.

## Package Identity

- `assessment_key`: `leadership-approach`
- `version`: `1.00-test`
- `domain_key`: `leadership_approach`
- `domain_title`: `Leadership Approach`
- scored signals: `results`, `process`, `vision`, `people`
- active questions: 24
- active options: 96
- active option-signal weight rows: 96

The 24-question runtime set is a Leadership Approach product decision, not a
global ranked-pattern engine rule. Other ranked-pattern packages may define
their own question counts if their package audit and publish audit pass.

## Report-First Template Coverage

Report-first editorial source remains canonical under:

- `content/authoring/leadership-approach/report-first/canonical-reports/`

The package-level report-first manifest is:

- `content/assessment-packages/leadership-approach/report-first-template-manifest.json`

The manifest maps the 24 required ranked-pattern `pattern_key` permutations for the four scored
signals to their source Markdown paths when authored. It is an import-readiness map, not a second
source of report prose.

Generated report-first import rows are derived from the available canonical Markdown templates and
written to:

- `content/assessment-packages/leadership-approach/generated/report-first-template-import-rows.json`

That artifact is package/import preparation only. It is not a runtime dependency, and it does not
change the canonical result payload. Future XLSX/import package generation should consume those
rows when loading `assessment_report_first_templates`.

P11 adds the draft-storage handoff:

- importer service: `lib/server/report-first-template-import.ts`
- storage destination: `assessment_report_first_templates`
- imported row status: `draft`
- imported-ready rows today: 24
- missing templates today: 0

The importer consumes the generated JSON artifact, validates the package metadata and full
structured report body, and persists only rows marked `ready_for_import: true` and
`publishable: true`. Missing manifest entries are reported as blocking coverage findings; they are
not inserted as active or publishable placeholders.

The keyed ranked-pattern workflow exposes the handoff as an admin action:

- route: `/admin/assessments/ranked-pattern/leadership-approach/workflow`
- action: `Import generated report templates`
- expected current result: 24 draft template rows imported, 0 templates missing

The action is idempotent for draft rows: running it again updates the same draft template rows
rather than creating duplicate draft rows for the same pattern.

Current coverage:

- expected patterns: 24
- authored/import-ready templates: 24
- missing templates: 0
- package publishable as report-first: yes

The current report-first canonical templates are pattern-level and score-shape-neutral. The
generated import rows therefore set `score_shape_policy` to `pattern_level_score_shape_neutral`,
keep `score_shape` as `null`, and list the supported score shapes as metadata. This must not be
read as score-shape-specific editorial coverage.

The compiler path remains:

1. Author canonical Markdown in `content/authoring/leadership-approach/report-first/canonical-reports/`.
2. Compile with `scripts/authoring/compile-report-first-template.ts`.
3. Generate package import rows with `scripts/authoring/generate-leadership-report-first-import-artifact.ts`.
4. Validate coverage through `lib/server/leadership-report-first-package.ts`.
5. Later import compiled structured JSON into `assessment_report_first_templates`.

The runtime engine must not read the manifest, Markdown, or workbook. Runtime result pages continue
to read persisted `canonical_result_payload` only.

Importing report-first templates into draft storage is different from user result persistence:
template rows prepare future completion-time report assembly, while user results remain immutable
records produced by the engine and stored in `results.canonical_result_payload`.
