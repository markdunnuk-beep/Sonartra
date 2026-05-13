# Premium Language Drift Audit

Generated: 2026-05-13T21:17:26.531Z

Overall result: PASS_WITH_WARNINGS

## Input Files

- Dossier: content/authoring/leadership-approach/premium-authoring/pattern-dossiers/process_results_people_vision.md
- Field map: content/authoring/leadership-approach/premium-authoring/field-maps/process_results_people_vision.paired.psv
- Generated preview directory: content/authoring/leadership-approach/premium-authoring/generated-preview

## Counts

- Field map rows checked: 51
- Generated preview files checked: 8
- Generated preview rows checked: 14
- Errors: 0
- Warnings: 1

## Anchor Usage

| source_anchor | exists_in_dossier | usage_count |
| --- | ---: | ---: |
| pattern_identity | yes | 6 |
| core_leadership_thesis | yes | 3 |
| attention_pattern | yes | 2 |
| value_creation | yes | 4 |
| felt_experience | yes | 3 |
| decision_behaviour | yes | 2 |
| communication_behaviour | yes | 2 |
| pressure_behaviour | yes | 5 |
| protective_function | yes | 1 |
| hidden_cost | yes | 4 |
| narrowing_pattern | yes | 2 |
| rank_3_extension | yes | 5 |
| rank_4_extension | yes | 3 |
| development_moves | yes | 5 |
| integrated_closing | yes | 3 |
| memorable_line | yes | 1 |

## Field Traceability Summary

- Traceability fields present for all checked rows.

## Generated PSV Leakage Check

- No authoring-only fields or untraced generated text detected.

## Generic/Modular Language Warnings

- none

## Repetition Warnings

- none

## Score-Shape Warnings

- none

## List-Section Item Identity Warning

- 11/12/13 list item identity currently relies on quality_notes markers for preview generation and must be production-hardened before promotion if required.

## Errors

- none

## Warnings

- LIST_ITEM_IDENTITY_PREVIEW_ONLY: 11/12/13 list item identity currently relies on quality_notes markers for preview generation and must be production-hardened before promotion if required.

## Recommended Next Actions

- No blocking errors found.
- Review warnings for generic wording, repetition, paired-shape clarity, and list-section item identity before Task 7.
- Keep generated preview rows out of production package files until a separate promotion task.
