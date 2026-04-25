# Single-Domain Language Authoring CSV Templates

These CSV files are Excel-ready authoring templates for the single-domain section-first language import system. They preserve the exact import fields used by the admin import path, then add three helper columns for editorial workflow:

- `authoring_status`
- `notes`
- `ready_for_import`

The helper columns are for authoring only. Remove them before converting the rows back into pipe-delimited imports.

## Files

- `single_domain_intro.csv`
- `single_domain_hero_pairs.csv`
- `single_domain_drivers.csv`
- `single_domain_pair_summaries.csv`
- `single_domain_limitations.csv`
- `single_domain_application.csv`

## Editing In Excel

Open each CSV directly in Excel or import it as comma-delimited UTF-8 text. Keep the first row unchanged. The field order before the helper columns matches the section-first import headers.

Use `authoring_status` to track editorial state, `notes` for reviewer comments, and `ready_for_import` to mark rows that should be included in the final pipe conversion. Recommended values are `todo`, `draft`, `review`, and `complete` for `authoring_status`, and `TRUE` or `FALSE` for `ready_for_import`.

## Required Columns

All columns before `authoring_status` are import fields. These must be preserved exactly when rows are converted back into pipe-delimited imports.

Do not rename, reorder, or remove:

- `domain_key`
- `section_key`
- `pair_key`
- `signal_key`
- enum fields such as `driver_role`, `claim_type`, `materiality`, `focus_area`, `guidance_type`, and `linked_claim_type`
- `priority`

Some files do not use every key column because their section schema is different. Keep each file's header exactly as supplied.

## Helper Columns

The final three columns are ignored during import preparation:

- `authoring_status`
- `notes`
- `ready_for_import`

Before generating pipe-delimited imports, filter to rows with `ready_for_import` set to `TRUE`, then remove the helper columns. Rows with `FALSE` are templates or optional authoring slots and should not be imported.

## Keys And Enums

Do not change these keys unless the schema is deliberately updated:

- `domain_key`: `leadership-approach`
- Signal keys: `results`, `process`, `vision`, `people`
- Runtime-order pair keys: `results_process`, `results_vision`, `results_people`, `process_vision`, `process_people`, `vision_people`
- Section keys: `intro`, `hero`, `drivers`, `pair`, `limitation`, `application`

The current gold-standard rows are complete for `results_process`. Blank rows are provided for the remaining Leadership pair combinations where pair-owned language is required.

## Recommended Authoring Order

1. Review the intro language so the domain frame is stable.
2. Complete or revise driver language for all four signals.
3. Complete application guidance for the signal-level rows that should be imported.
4. Author pair summaries for the remaining pair keys.
5. Author hero rows for the remaining pair keys.
6. Author limitation rows and confirm the weaker signal thread is explicit.
7. Run a repetition pass across hero, pair, limitation, and application before pipe conversion.

## Export Back For Pipe Conversion

When authoring is complete:

1. Save a clean CSV export from Excel.
2. Filter to `ready_for_import=TRUE`.
3. Remove the helper columns.
4. Preserve the exact import headers and field order.
5. Convert commas to the pipe-delimited format expected by the section-first import path.
6. Validate with the import parser and validator tests before pasting into the admin language builder.
