# Flow State Example Assessment Package

This folder contains the Flow State example package for validating the Sonartra reader-first import contract.

Flow State is the first populated example assessment package. It is not the canonical assessment, and future packages should be copied into their own folders rather than editing the reusable template directly.

The workbook is an authoring/import artifact. It is not a runtime dependency, and the runtime engine must never read it directly.

Current source status:

- `00_Metadata` and `01_Signals` are populated for Flow State.
- `02_Questions`, `03_Options`, and `04_Option_Weights` are structurally complete with a proposed 24-question Flow State runtime definition layer.
- The `02`-`04` rows are marked `active` so the package can serve as a full importer/audit fixture, but the question, option, and weight content source status is still draft/proposed pending review because no approved Flow State question set was found in the repository.
- `05_Context` is populated from the Flow State authoring context.
- `06_Orientation` through `14_Closing_Integration` are populated from the existing Flow State PSV files in `content/authoring/generated`.
- `15_Report_Preview` contains generic Flow State preview cases for import/audit testing.
