# Reader-First Authoring Runbook

## 1. Purpose

This workflow creates validated, reader-first result language for future Sonartra assessments. It is an authoring process, not a runtime process.

AI or LLM prompts may assist authoring before import. AI must not generate live runtime outputs. The assessment engine remains deterministic. The UI must not write, score, or reinterpret result language. Result pages render imported or canonical content. The authoring toolkit is not part of the runtime scoring engine.

## 2. What The Workflow Produces

Tasks 1-5 create the factory. Running the factory creates the Flow State import file.

- Authoring toolkit: repo-local docs, prompts, manifest, scripts, and tests used to prepare content.
- Generated section rows: controlled rows created by scripts, such as `06_Orientation`.
- Full import PSV: a sectioned pipe-delimited file containing every required reader-first section.
- `/draft-result` preview fixture: a TypeScript fixture exported from one selected pattern and score shape for visual QA.
- Final import-ready dataset: the structurally valid, reviewed, upgraded language pack ready for platform import.

The factory is not final content by itself. Final content is produced only when the authoring workflow is run, reviewed, upgraded, validated, and accepted.

## 3. Roles Of Each Tool

- ChatGPT / LLM prompt work: language authoring, section judgement, rubric review, and targeted upgrades before import.
- Codex: controlled task execution, repo-local script updates, documentation updates, and repeatable file changes.
- PowerShell: run generators, validators, exporters, lint, build, and tests.
- Excel/schema workbook: controlled authoring and import surface when a spreadsheet review layer is useful.
- `/draft-result`: live preview surface for selected ranked-pattern results.

## 4. Two Operating Modes

### Option A: ChatGPT-Assisted Workflow

Use a ChatGPT Project for the context seed, section generation, rubric review, and targeted upgrade work. Use PowerShell scripts for deterministic generation, structural validation, and preview export.

This mode keeps language judgement in the strongest review environment while keeping structure enforced by repo scripts.

### Option B: Mostly Codex Workflow

Store prompts in the repo and run prompt-driven authoring tasks through Codex. Use Codex to produce controlled batches and run the structural scripts.

Even in this mode, do not skip human review checkpoints. Language judgement still matters after structure passes.

## 5. Step-By-Step Workflow

### Step 1: Create Flow State Context Seed

Use `content/authoring/prompts/01-context-seed-prompt.md` to create the domain context seed. Do not generate import rows at this step.

### Step 2: Generate 06_Orientation Rows

Run:

```powershell
cmd /c npx tsx scripts/authoring/generate-flow-orientation-rows.ts
```

This writes:

```text
content/authoring/generated/06-orientation-flow-state.psv
```

### Step 3: Generate Or Author Remaining Sections

Create or author:

- `07_Recognition`
- `08_Signal_Roles`
- `09_Pattern_Mechanics`
- `10_Pattern_Synthesis`
- `11_Strengths`
- `12_Narrowing`
- `13_Application`
- `14_Closing_Integration`

Use the prompt pack and the schema manifest. Work in batches. Avoid one huge prompt for all rows.

### Step 4: Assemble Sectioned PSV File

Assemble the full import file:

```text
content/authoring/generated/flow-state-full-import.psv
```

The file should contain section labels, exact headers, and rows for every reader-first section.

### Step 5: Run Structural Validation

Run:

```powershell
cmd /c npx tsx scripts/authoring/validate-reader-first-import.ts --input content/authoring/generated/flow-state-full-import.psv
```

Do not judge language quality until this passes.

### Step 6: Run Rubric Evaluation

Use `content/authoring/prompts/04-rubric-evaluation-prompt.md`.

Evaluate clarity, recognition, behavioural specificity, practical usefulness, section distinction, repetition control, tone, and commercial readiness.

### Step 7: Apply Targeted Upgrades

Use `content/authoring/prompts/05-targeted-upgrade-prompt.md`.

Upgrade only weak rows. Do not rewrite strong rows. Do not change keys, headers, order, enums, row counts, or pipe-delimited structure.

### Step 8: Validate Again

Run the structural validator again:

```powershell
cmd /c npx tsx scripts/authoring/validate-reader-first-import.ts --input content/authoring/generated/flow-state-full-import.psv
```

### Step 9: Export Selected Pattern To /draft-result

Run only when you intentionally want to update the preview fixture:

```powershell
cmd /c npx tsx scripts/authoring/export-draft-result-fixture.ts --input content/authoring/generated/flow-state-full-import.psv --pattern deep_focus_creative_movement_physical_rhythm_social_exchange --shape concentrated --output content/draft-result/ranked-pattern-example.ts
```

The exporter does not default to the real fixture path. You must provide the output path explicitly.

### Step 10: Run Build And Tests

Run:

```powershell
cmd /c npm run lint
cmd /c npm run build
cmd /c npx tsx --test tests/draft-result-page.test.tsx
```

### Step 11: Review /draft-result In Browser

Check desktop, mobile, dark mode, light mode, focus mode, reading rail, mobile section navigator, pattern signature, section rhythm, and content density.

### Step 12: Repeat For Multiple Patterns Before Final Import

Preview several representative patterns and score shapes before accepting the dataset.

## 6. Recommended Pattern Preview Set

Before finalising Flow State, preview at least:

- one Deep Focus primary pattern
- one Creative Movement primary pattern
- one Physical Rhythm primary pattern
- one Social Exchange primary pattern
- one concentrated score shape
- one paired score shape
- one balanced score shape

## 7. Section Authoring Strategy

Generated / controlled:

- `06_Orientation`
- possibly `08_Signal_Roles` baseline

AI-assisted authored:

- `07_Recognition`
- `09_Pattern_Mechanics`
- `10_Pattern_Synthesis`
- `12_Narrowing`
- `14_Closing_Integration`

Hybrid:

- `11_Strengths`
- `13_Application`

## 8. Quality Gates

Mandatory gates:

- structural validation before language review
- rubric evaluation before upgrade
- structural validation after upgrade
- `/draft-result` preview before import
- final structural validation before platform import

## 9. What Not To Do

- do not hand-author hundreds of rows without validation
- do not generate all rows in one huge prompt
- do not accept structurally invalid rows
- do not judge language before structural validation passes
- do not edit `/draft-result` UI to compensate for weak language
- do not use AI-generated text at runtime
- do not add UI-side recomputation
- do not use pipe characters inside field values
- do not use pipe characters inside `lookup_key`
- do not bypass the canonical engine/result contract

## 10. Final Import Readiness Checklist

- [ ] all required sections present
- [ ] exact headers
- [ ] expected row counts
- [ ] no duplicate lookup keys
- [ ] all pattern keys valid
- [ ] all score shapes covered
- [ ] structural validator PASS
- [ ] rubric target 8.5+
- [ ] no major section below 8.0
- [ ] previewed in `/draft-result`
- [ ] mobile QA passed
- [ ] light/dark/focus mode checked
- [ ] final import file ready
