# Sonartra Report-First Fully Authored Template

This folder contains the clean report-first fully authored workbook template:

`sonartra_report_first_fully_authored_TEMPLATE.xlsx`

Use it as an authoring and import-preparation artifact for future ranked-pattern report-first assessments. Copy the workbook into the assessment package folder, replace placeholder values, complete the authored reports, and then run the future compiler/import workflow for the package.

Runtime must not read this workbook directly. Published database rows and persisted `canonical_result_payload` remain the runtime source for result retrieval and rendering.

## Clean Model

The clean model is:

- one assessment
- one active domain
- four scored signals
- twenty-four ranked signal patterns
- twenty-four fully authored premium reports
- one report template per `pattern_key`
- deterministic scoring from selected options and option weights
- persisted `canonical_result_payload` rendered by result pages

## Workbook Structure

The clean workbook has these sheets:

- `00_Assessment`
- `01_Signals`
- `02_Questions`
- `03_Options`
- `04_Option_Weights`
- `05_Ranked_Patterns`
- `06_Report_Templates`
- `07_Report_QA_Cases`
- `08_Import_Summary`
- `09_Lookups`

The central authoring sheet is `06_Report_Templates`. It contains twenty-four report rows, one for each ranked signal `pattern_key`.

## Report Template Rules

Each row in `06_Report_Templates` represents one complete premium report for one ranked pattern.

Required report-template expectations:

- exactly 24 report templates
- exactly one active report template per active `pattern_key`
- `report_contract = report_first_canonical_payload_v1`
- `report_body_json` contains the complete structured report body when used as the canonical report content field
- no duplicate active report rows for the same `pattern_key`

The workbook does not use score-shape report variants. Do not create separate report rows for concentrated, paired, graduated, or balanced outcomes.

The workbook does not use the old modular `05_Context` through `14_Closing_Integration` report-language authoring model. Reports are authored as complete report templates, not assembled from modular worksheet fragments.

## Relationship To The Legacy-Compatible Workbook

`sonartra_report_first_fully_authored_import_TEMPLATE.xlsx` is a legacy-compatible bridge artifact for the current parser/import shape. It is not the clean authoring source of truth.

The clean template in `sonartra_report_first_fully_authored_TEMPLATE.xlsx` is based on the RFA package contract in:

`docs/report-authoring/report-first-fully-authored-package-contract.md`

Future importer or compiler work should map this clean workbook into the production storage/import requirements. Do not preserve legacy sheet names in the clean authoring package solely because the current parser expects them.
