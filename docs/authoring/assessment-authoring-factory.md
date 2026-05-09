# Assessment Authoring Factory

This factory makes reader-first assessment language repeatable. It is an authoring-side process only. It must not change scoring, runtime result generation, live rendering, admin import behaviour, Supabase, Clerk, or the canonical result contract.

The Flow State pack is the reference implementation. Future assessments, such as Leadership Approach, should reuse the same structure with a new assessment authoring package, signal model, context seed, generated PSV files, and validation evidence.

## Factory Boundary

The factory produces reviewed authoring artefacts:

- source context and signal definitions
- prompt inputs and task instructions
- generated PSV section files
- structural validation evidence
- reader-experience audit notes
- optional `/draft-result` preview fixture export

The factory does not produce runtime AI copy. It does not compute scores. It does not reinterpret results in the UI. Runtime remains deterministic and database-driven after import.

## Assessment Authoring Package

Each assessment should have a package with:

- an assessment key, domain key, and domain title
- one context seed that defines scope, signal meanings, rank roles, score shapes, and language guardrails
- a four-signal ranked-pattern model
- a section plan that follows `content/authoring/reader-first-schema-manifest.ts`
- generated PSV outputs under `content/authoring/generated`
- validation commands and audit evidence
- a clear decision on which pattern and score shape will be exported for preview

For Flow State, the source package lives in `content/authoring/flow-state` and the generated files use the `*-flow-state.psv` suffix.

## Required Source Files

Before generating any section, read:

- `docs/authoring/plain-behavioural-intelligence-language-standard.md`
- `docs/authoring/reader-first-section-purpose-guide.md`
- `docs/authoring/reader-first-authoring-runbook.md`
- `docs/assessment-engine/ranked-pattern-result-language-authoring.md`
- the assessment context seed
- `content/authoring/reader-first-schema-manifest.ts`
- the already approved generated sections for the same assessment
- the relevant task template from `docs/authoring/task-templates`

Use the manifest for exact headers, section keys, allowed coverage model, and expected row counts. Do not rely on remembered headers.

## Config-Driven Signal Model

Each assessment should start with a small config file or task brief that defines:

- `assessmentKey`
- `domainKey`
- `domainTitle`
- four signal keys and labels
- rank roles
- score shapes
- section sequence
- batch strategy
- generated file naming pattern
- validation commands

Use `content/authoring/examples/assessment-authoring-config.example.json` as the model. The config is an authoring aid, not runtime data.

## Pattern Model

For four ranked signals, the factory uses 24 rank-order pattern keys. Each pattern key joins signal keys with underscores, in rank order.

Use:

```powershell
cmd /c npx tsx scripts/authoring/list-reader-first-patterns.ts --signals deep_focus,creative_movement,physical_rhythm,social_exchange
```

For one primary-signal batch:

```powershell
cmd /c npx tsx scripts/authoring/list-reader-first-patterns.ts --signals deep_focus,creative_movement,physical_rhythm,social_exchange --primary deep_focus
```

This keeps batch boundaries explicit and prevents missing or duplicated ranked patterns.

## Section Generation Sequence

Generate and review sections in this order:

1. `05_Context`
2. `06_Orientation`
3. `07_Recognition`
4. `08_Signal_Roles`
5. `09_Pattern_Mechanics`
6. `10_Pattern_Synthesis`
7. `11_Strengths`
8. `12_Narrowing`
9. `13_Application`
10. `14_Closing_Integration`

Do not generate later sections without reading earlier approved sections. Later sections should add a new layer rather than repeat earlier language.

For `06_Orientation`, use the ranked-pattern result-language authoring rules. Orientation titles name the first two ranked signals, orientation summaries explain how rank 1 and rank 2 combine, score-shape summaries explain the distribution, and rank phrases connect each signal to the reader's style.

## Batch Generation Model

Use section-sized work, split into primary-signal batches where patterns are involved:

- one batch for each rank-1 signal
- 6 patterns per primary-signal batch
- 24 patterns in the combined section
- score-shape sections: 4 rows per pattern, 96 data rows
- pattern-level three-row sections: 3 rows per pattern, 72 data rows
- signal-rank sections: 4 signals x 4 rank roles, 16 data rows

Create combined files only after batch files are complete and checked. The combined file should preserve the manifest header and append batches in a predictable order.

## Validation Gates

Run structural validation before language judgement:

```powershell
cmd /c npx tsx scripts/authoring/validate-reader-first-import.ts --section {{section_key}} --input {{combined_file}}
```

For final authoring set validation, run every generated section individually. Confirm:

- exact header
- expected row count
- no blank lines
- no duplicate lookup keys
- valid pattern keys
- all four signals exactly once per pattern
- score-shape coverage where required
- valid status values
- no internal pipe characters

If `tsx` fails with `spawn EPERM` before a verdict appears, rerun the same command outside the sandbox before treating the content as defective.

## Audit Gates

After structural validation passes, audit language against:

- immediate clarity
- recognition
- behavioural specificity
- practical usefulness
- section distinction
- repetition control
- calm adult tone
- signal accuracy
- rank-4 range framing
- score-shape interpretation

Rewrite only rows with clear defects. Do not churn accepted rows for polish.

## Preview And Export Gate

Only export a `/draft-result` fixture after the section set is structurally valid and language-audited.

Use:

```powershell
cmd /c npx tsx scripts/authoring/export-draft-result-fixture.ts --input content/authoring/generated/{{domain_key}}-full-import.psv --pattern {{pattern_key}} --shape {{score_shape}} --output content/draft-result/ranked-pattern-example.ts
```

Then run preview tests and browser QA. Do not edit `/draft-result` to hide weak source language.

## Package Compiler Gate

After the authoring config, runtime base rows, and generated PSV files are ready, compile a complete ranked-pattern import workbook with the authoring package compiler.

Dry-run first:

```powershell
cmd /c npm run authoring:compile-package:dry-run -- --assessment-key {{assessment_key}} --domain-key {{domain_key}} --authoring-dir content/authoring/{{assessment_key}} --generated-dir content/authoring/generated --template-workbook content/assessment-packages/_template/sonartra_reader_first_import_schema_TEMPLATE.xlsx --output-workbook tmp/compiled-packages/{{assessment_key}}/sonartra_reader_first_import_schema_{{ASSESSMENT_KEY}}_COMPILED.xlsx
```

Write mode:

```powershell
cmd /c npm run authoring:compile-package -- --assessment-key {{assessment_key}} --domain-key {{domain_key}} --authoring-dir content/authoring/{{assessment_key}} --generated-dir content/authoring/generated --template-workbook content/assessment-packages/_template/sonartra_reader_first_import_schema_TEMPLATE.xlsx --output-workbook tmp/compiled-packages/{{assessment_key}}/sonartra_reader_first_import_schema_{{ASSESSMENT_KEY}}_COMPILED.xlsx --write --overwrite
```

The compiler creates sheets `00_Metadata` through `18_Lookups`, preserves workbook headers, and runs package audit after writing. It validates four scored signals, twenty-four ranked patterns, score-shape coverage, signal-role coverage, duplicate lookup keys, blank required fields, pattern/rank consistency, and import-summary row counts.

Use `tmp/compiled-packages/...` for proof runs. Write under `content/assessment-packages/<assessment-key>/...` only when intentionally adding a package artifact to the repository. The compiler does not silently normalize `assessment_key`, `domain_key`, or signal keys; fix mismatches explicitly in source files.

## Commit Gate

Before commit:

- run section validators
- run the package compiler dry-run/write/audit flow when creating or changing a package workbook
- run focused authoring tests
- run lint
- run build
- review `git diff`
- confirm no runtime, scoring, import, admin, UI, Supabase, Clerk, or live rendering files were touched
- include validation evidence in the handoff

Commit only when requested.

## Reusing For Leadership Approach

For Leadership Approach or any future four-signal assessment:

1. Create the context seed and signal definitions.
2. Copy the example config and replace Flow State values.
3. Use `list-reader-first-patterns.ts` to confirm the 24 pattern keys.
4. Use the section templates to generate one section at a time.
5. Validate each section against the manifest.
6. Audit against the language standard and section purpose guide.
7. Export a preview fixture only after the language set is structurally valid.

Do not create assessment-specific runtime logic. If a future assessment needs a different section shape, update the authoring manifest and validator narrowly before generating content.
