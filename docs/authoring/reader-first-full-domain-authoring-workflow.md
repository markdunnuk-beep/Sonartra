# Reader-First Full-Domain Authoring Workflow

This workflow defines the authoring-side process for the Sonartra Reader-First Full-Domain Language Authoring Model. It is a content preparation workflow only. It does not change scoring, result payloads, runtime generation, admin import code, or production result rendering.

## 1. Prepare Authoring Pack

Create the domain authoring workspace with the schema manifest, section guide, language standard, prompt notes, generated-row area, flow-state source area, and validation notes. Confirm the target domain key, signal keys, score shapes, rank roles, application areas, required row counts, and lookup-key convention before any prose is written.

## 2. Create Domain Context Seed

Author the single domain context row for `05_Context`. This row should establish the domain definition, scope, interpretation guidance, and introductory framing that all later sections must obey.

## 3. Build Controlled Phrase Libraries

Create controlled phrase libraries for recurring wording patterns before generating systematic rows. Libraries should cover signal labels, rank-position phrasing, score-shape phrasing, application guidance types, risk language, and development language.

Phrase libraries must keep language plain, behavioural, concrete, and consistent. They are authoring aids, not runtime AI generation.

## 4. Generate Systematic Rows

Generate deterministic rows for sections whose structure is systematic:

- ranked patterns from the four signals
- score-shape variants where required
- signal-rank rows where required
- application-area variants where required

Generated rows should fill structural keys and leave authored prose empty or explicitly marked as draft until reviewed.

## 5. Generate Authored Pattern Rows In Batches

Author full prose in controlled batches. Work by section and by pattern family so tone, section purpose, and phrase reuse stay consistent. Do not mix structural row generation with editorial upgrade work in the same pass.

## 6. Structural Pre-Validation

Run structural validation before rubric review. Validation should check required headers, duplicate fields, required row counts, allowed constants, lookup-key format, missing required values, rank completeness, score-shape coverage, and unsupported statuses.

## 7. Rubric Evaluation

Evaluate drafted rows against the language standard and section purpose guide. Review for immediate clarity, recognition, behavioural specificity, practical usefulness, calm authority, and absence of abstract premium fog.

## 8. Targeted Upgrade

Upgrade only the rows or sections that failed validation or rubric review. Keep approved rows stable unless there is a clear consistency issue.

## 9. Repeat Validation

Repeat structural validation and rubric evaluation after targeted upgrades. The pack should not move to preview until both checks pass.

## 10. Live /draft-result Preview QA

Use `/draft-result` as a selected-pattern preview surface only after the authoring pack is structurally valid. Preview representative concentrated, paired, graduated, and balanced patterns. Check reading flow, section continuity, clarity, and practical usefulness.

This step must not modify `/draft-result` or its fixture as part of the scaffold task.

## 11. Final Structural Validation

Run the final structural validation before export. Confirm counts, headers, lookup keys, allowed constants, row ordering, statuses, and unsupported delimiter usage.

## 12. Import Into Admin / Assessment Builder

Only after the pack is structurally valid and previewed should future tooling export rows for the admin or assessment builder import path. Import must remain database-driven and deterministic, with no runtime AI generation and no UI-side scoring or computation.
