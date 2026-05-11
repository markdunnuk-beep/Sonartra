# Flow State Assessment Package

This folder contains the compiled Flow State ranked-pattern assessment package.

The package follows the active single-domain ranked-pattern import contract. It is an authoring/import artifact only; the runtime engine must not read this workbook directly.

## Files

- `sonartra_reader_first_import_schema_FLOW_STATE_EXAMPLE.xlsx`
- `00-assessment-authoring-config.json`
- `02-questions.psv`
- `03-options.psv`
- `04-option-weights.psv`
- `15-report-preview.psv`

## Package Identity

- `assessment_key`: `flow-state`
- `version`: `1`
- `domain_key`: `flow_state`
- `domain_title`: `Flow State`
- model: `single_domain_ranked_pattern`
- scored signals: `deep_focus`, `creative_movement`, `physical_rhythm`, `social_exchange`

## Coverage

- `00_Metadata` and `01_Signals` are populated from the package authoring config.
- `02_Questions`, `03_Options`, and `04_Option_Weights` contain 24 active questions, 96 active options, and 96 active one-signal weight rows.
- `05_Context` is populated from the package authoring config.
- `06_Orientation` through `14_Closing_Integration` are populated from the Flow State generated PSV files in `content/authoring/generated`.
- `15_Report_Preview` through `18_Lookups` are admin/import support sheets only and are not runtime result sections.
