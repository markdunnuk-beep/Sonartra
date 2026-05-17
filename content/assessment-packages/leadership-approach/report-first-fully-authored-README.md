# Leadership Approach Clean Report-First Backfill

This workbook is the clean RFA backfill of the live Leadership Approach report-first package:

`sonartra_report_first_fully_authored_LEADERSHIP_APPROACH.xlsx`

It is for editorial review and future clean import preparation. Runtime must not read this workbook directly.

## Model

The workbook uses the clean report-first fully authored model:

- one assessment
- one active domain
- four scored signals
- twenty-four ranked signal patterns
- twenty-four fully authored premium reports
- one report per `pattern_key`
- no score-shape report variants
- no modular report-language worksheet assembly as the clean authoring surface

## Central Review Sheet

`06_Report_Templates` is the central review sheet.

Each row is one complete Leadership report for one ranked signal pattern. The row includes:

- the resolved `pattern_key`
- rank 1 through rank 4 signal keys
- report title and summary fields
- `report_body_json`
- source markdown path where available
- editorial and review metadata fields

## Source Relationship

The report rows are backfilled from the existing generated report-first import artifact and canonical source markdown paths.

The existing legacy-compatible import workbooks remain separate. They are useful compatibility artifacts for the current production importer, but they are not the clean authoring model.

## Review Guidance

Use this workbook to review Leadership Approach as the benchmark report-first assessment.

Before any future clean import workflow treats this workbook as import-ready, confirm:

- all 24 report rows remain present
- each `report_body_json` cell is valid structured JSON
- source markdown paths still resolve
- report titles, takeaways, opening summaries, closing summaries, and memorable lines are editorially approved
- no score-shape report variants have been introduced
