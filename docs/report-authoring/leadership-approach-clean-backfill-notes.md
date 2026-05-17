# Leadership Approach Clean Backfill Notes

## Purpose

RFA-04 backfills the existing Leadership Approach report-first package into the clean RFA workbook structure created in RFA-02.

Primary workbook:

`content/assessment-packages/leadership-approach/sonartra_report_first_fully_authored_LEADERSHIP_APPROACH.xlsx`

This is an editorial review and future clean import-preparation artifact. It is not a runtime dependency and does not mutate production data.

## Source Files Inspected

- `docs/report-authoring/report-first-fully-authored-package-contract.md`
- `content/assessment-packages/TEMPLATE/sonartra_report_first_fully_authored_TEMPLATE.xlsx`
- `content/assessment-packages/TEMPLATE/report-first-fully-authored-README.md`
- `content/assessment-packages/leadership-approach/README.md`
- `content/assessment-packages/leadership-approach/leadership-approach-24questions.xlsx`
- `content/assessment-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx`
- `content/assessment-packages/leadership-approach/report-first-template-manifest.json`
- `content/assessment-packages/leadership-approach/generated/report-first-template-import-rows.json`
- `content/authoring/leadership-approach/report-first/canonical-reports/`
- `scripts/authoring/compile-report-first-template.ts`
- `scripts/authoring/generate-leadership-report-first-import-artifact.ts`

## Source Files Used

- Runtime definition rows were backfilled from `leadership-approach-24questions.xlsx`.
- Signal labels and descriptions were backfilled from `sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx`.
- Ranked pattern coverage and source markdown paths were validated against `report-first-template-manifest.json`.
- Structured report JSON was backfilled from `generated/report-first-template-import-rows.json`.
- Canonical source markdown paths point to `content/authoring/leadership-approach/report-first/canonical-reports/`.

## Legacy Bridge Workbook

A legacy-compatible Leadership workbook exists:

`content/assessment-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx`

It was used only as source evidence for existing metadata and signal definitions. It is not treated as the clean authoring model.

## Markdown and Structured Payload Availability

Canonical markdown/source reports were found for the 24 Leadership `pattern_key` values through the manifest and source paths.

Structured report template JSON was found for all 24 patterns in:

`content/assessment-packages/leadership-approach/generated/report-first-template-import-rows.json`

The clean workbook therefore populates `report_body_json` for all 24 report rows.

## Report Row Status

- active report rows: 24
- draft report rows: 0
- missing pattern reports: 0

Rows are marked active because each pattern has an existing generated structured report template and source markdown path.

## Question, Option, and Weight Backfill

The clean workbook includes:

- 24 question rows
- 96 option rows
- 96 option-weight rows

These were backfilled from `leadership-approach-24questions.xlsx`.

## Uncertain Mappings

The following fields are derived from the existing structured report template rather than a clean authoring-specific source column:

- `report_subtitle` maps to `report.hero.title`.
- `concise_takeaway` maps to `report.keyInsight.text`.
- `opening_summary` maps to `report.hero.resultStatement`.
- `closing_summary` maps to the first closing synthesis block.
- `memorable_line` maps to `report.closing.finalLine`.

These mappings should be reviewed during editorial QA because the clean RFA workbook may eventually want more explicit source fields.

## Known Gaps

- The clean workbook is not wired to an importer yet.
- The clean workbook does not replace the current production import path.
- Editorial approval fields such as `reviewed_by` and `quality_score` are intentionally blank.
- The workbook uses version `3` to align with the published Leadership package, while some source artifacts retain earlier package-version labels from the report-first preparation workflow.

## Recommended Next Editorial Task

RFA-05 should perform an editorial QA pass on `06_Report_Templates` for Leadership Approach:

- verify all source markdown paths
- review title/subtitle/takeaway mappings
- review opening and closing summaries
- confirm every `report_body_json` payload is suitable as the benchmark clean authoring record
- identify any report prose that should be polished in source markdown before future clean import work
