# Leadership Approach Section Plan

This plan follows `content/authoring/reader-first-schema-manifest.ts`. Use the manifest as the source of truth for exact headers and validation rules before generating any PSV file.

Do not generate Leadership Approach PSV files until a task explicitly asks for a section.

## File Naming

Combined section files should use:

```text
content/authoring/generated/{{section_slug}}-leadership-approach.psv
```

Primary-signal batch files should use:

```text
content/authoring/generated/{{section_slug}}-leadership-approach-{{primary_signal_slug}}.psv
```

Suggested primary signal slugs:

- `results`
- `process`
- `vision`
- `people`

## Pattern Model

Signals:

```text
results,process,vision,people
```

Expected pattern count: 24.

Primary-signal batches:

- 6 patterns where `results` is rank 1
- 6 patterns where `process` is rank 1
- 6 patterns where `vision` is rank 1
- 6 patterns where `people` is rank 1

Pattern command:

```powershell
cmd /c npx tsx scripts/authoring/list-reader-first-patterns.ts --signals results,process,vision,people
```

Primary batch command example:

```powershell
cmd /c npx tsx scripts/authoring/list-reader-first-patterns.ts --signals results,process,vision,people --primary results
```

## Section Sequence

### 05_Context

Purpose: Set the domain context. Explain what Leadership Approach measures, how to read it, and how not to overclaim it.

Coverage: one row per domain.

Expected data rows: 1.

Notes:

- Use `01-context-seed.md` as source.
- Keep this section broad and practical.
- Do not introduce pattern-specific interpretation here.

### 06_Orientation

Purpose: Give the reader fast recognition of the ranked leadership pattern.

Coverage: 24 patterns x 4 score shapes.

Expected data rows: 96.

Batch model: 24 data rows per primary-signal batch.

Notes:

- Name the ranked route plainly.
- Explain score shape without overclaiming.
- Keep balanced profiles specific, not vague.

### 07_Recognition

Purpose: Help the reader recognise how the leadership pattern may show up in real work.

Coverage: 24 patterns x 4 score shapes unless a future task explicitly chooses pattern-only coverage and updates validation accordingly.

Expected data rows: 96.

Batch model: 24 data rows per primary-signal batch.

Notes:

- Use observable leadership behaviour.
- Avoid repeating Orientation phrasing.
- Keep recognition practical rather than flattering.

### 08_Signal_Roles

Purpose: Explain each signal's role by rank position.

Coverage: 4 signals x 4 rank roles.

Expected data rows: 16.

Notes:

- This section is signal-rank based, not pattern based.
- Use consistent rank-role language.
- Keep rank 4 as deliberate range.

### 09_Pattern_Mechanics

Purpose: Explain how the pattern works in motion: what starts it, sustains it, protects, and can overrun.

Coverage: 24 patterns x 4 score shapes.

Expected data rows: 96.

Batch model: 24 data rows per primary-signal batch.

Notes:

- Describe the mechanics, not the strengths.
- Keep the writing behavioural and cause-and-effect based.
- Avoid abstract model language.

### 10_Pattern_Synthesis

Purpose: State the central meaning of the pattern, including gift, trap, takeaway, and synthesis.

Coverage: 24 patterns x 4 score shapes.

Expected data rows: 96.

Batch model: 24 data rows per primary-signal batch.

Notes:

- Give a compact whole-pattern interpretation.
- Keep traps as overuse risks, not character flaws.
- Avoid repeating Recognition or Mechanics wording.

### 11_Strengths

Purpose: Explain what comes easily when the ranked leadership pattern is working well.

Coverage: 24 patterns x 3 strength rows.

Expected data rows: 72.

Batch model: 18 data rows per primary-signal batch.

Rows per pattern:

- `strength_1`: mainly linked to rank 1
- `strength_2`: linked to rank 1 and rank 2 together
- `strength_3`: shows how rank 3 or rank 4 adds useful range when used deliberately

Notes:

- Do not make strengths generic praise.
- Link strengths to practical leadership consequences.

### 12_Narrowing

Purpose: Explain where the leadership pattern can narrow when overused, rushed, or left unchecked.

Coverage: 24 patterns x 3 narrowing rows.

Expected data rows: 72.

Batch model: 18 data rows per primary-signal batch.

Rows per pattern:

- `narrowing_1`: main overuse risk from rank 1
- `narrowing_2`: rank 1 and rank 2 interaction risk
- `narrowing_3`: what may be missed if rank 3 or rank 4 is not deliberately used

Notes:

- Frame narrowing as context risk, not weakness.
- Do not make rank 4 sound like a deficit.

### 13_Application

Purpose: Give practical ways to use the leadership pattern in real work.

Coverage: 24 patterns x 3 application rows.

Expected data rows: 72.

Batch model: 18 data rows per primary-signal batch.

Rows per pattern:

- `application_1`: how to start leadership work well using rank 1
- `application_2`: how to improve or stabilise the work using rank 2 or rank 3
- `application_3`: how to avoid narrowing by deliberately bringing in rank 4

Notes:

- Advice should be usable the same day.
- Do not use generic coaching advice.

### 14_Closing_Integration

Purpose: Give a calm final synthesis of the whole result.

Coverage: 24 patterns x 4 score shapes.

Expected data rows: 96.

Batch model: 24 data rows per primary-signal batch.

Notes:

- Integrate rank order and score shape.
- Give one clear take-forward line.
- Avoid motivational slogans.
- Do not repeat Strengths, Narrowing, or Application too closely.

## Validation Plan

Run section validation after each generated section. Use the commands in `00-assessment-authoring-config.json`, replacing files only after the section exists.

After all sections exist, run:

```powershell
cmd /c npm run lint
cmd /c npm run build
```

For preview fixture work, use the dedicated export-preview task template. Do not update `/draft-result` during section generation.
