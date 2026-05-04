# Authoring Toolkit Readme

This toolkit is for authoring-side preparation of reader-first full-domain language packs. It creates structure for schemas, prompts, generated draft rows, validators, rubric checks, and future exporters.

Start with `docs/authoring/reader-first-authoring-runbook.md`. The prompt pack lives in `content/authoring/prompts`.

## Boundaries

- No runtime AI generation.
- No scoring changes.
- No result payload changes.
- No UI-side computation.
- No engine, import, runtime, admin, live result, `/draft-result`, or production rendering changes are part of this scaffold.
- No Excel parsing is introduced by this toolkit scaffold.

## Folder Roles

- `docs/authoring`: workflow, language standard, section purpose, and toolkit documentation.
- `content/authoring`: schema manifests and authoring-side source files.
- `content/authoring/flow-state`: Flow State authoring pack source area.
- `content/authoring/generated`: future generated structural rows before editorial review.
- `content/authoring/prompts`: future prompt templates and batch instructions for authoring support.
- `scripts/authoring`: future local generators, validators, rubric runners, and exporters.
- `tests/authoring`: focused tests for authoring-side manifests and utilities.

## Future Tooling Model

Future generators should create deterministic structural rows from the manifest. They should not generate final content without review, call AI at runtime, or change result computation.

Future validators should check headers, row counts, lookup keys, allowed constants, statuses, rank completeness, score-shape coverage, and export safety.

Future rubric evaluators should assess language quality against the plain behavioural intelligence standard and section purpose guide.

Future exporters should convert approved authoring rows into the format expected by the existing admin or assessment builder import path. Exporters must preserve the single engine and single result contract.
