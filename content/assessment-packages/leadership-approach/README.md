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

## Runtime Boundary

The workbook is an authoring/import artifact only.

The runtime engine must not read this workbook. Runtime assessment delivery, scoring, result assembly, and result rendering must use database records and persisted result payloads only.

## Package Identity

- `assessment_key`: `leadership-approach`
- `version`: `1.00-test`
- `domain_key`: `leadership_approach`
- `domain_title`: `Leadership Approach`
- scored signals: `results`, `process`, `vision`, `people`
