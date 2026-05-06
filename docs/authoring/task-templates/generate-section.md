# Codex Task Template: Generate Reader-First Section

Use this when generating one reader-first authoring section for a four-signal ranked-pattern assessment.

```text
codex --model gpt-5.5 --reasoning medium

You are working in:
C:\Projects\sonartra-build\Sonartra

Task:
Create reader-first authoring content for {{domain_title}} section {{section_key}}.

Assessment:
- assessment_key: {{assessment_key}}
- domain_key: {{domain_key}}
- domain_title: {{domain_title}}

Signals:
{{signal_keys}}

Signal labels:
{{signal_labels}}

Before generating content, read:
{{source_files_to_read}}

Core constraints:
- Authoring-content only.
- Do not change runtime engine code.
- Do not change scoring code.
- Do not change import/runtime logic.
- Do not change admin UI.
- Do not change /draft-result unless this task explicitly asks for preview export.
- Do not touch Supabase or Clerk.
- Do not change live result rendering.
- Runtime must remain deterministic.

Section to generate:
{{section_key}}

Output files:
{{output_files}}

Use the existing schema manifest header for {{section_key}} unless the task explicitly says a narrow manifest update is required.

Expected structure:
- 24 rank-order patterns where applicable.
- {{expected_batch_rows}} data rows per primary-signal batch where applicable.
- {{expected_combined_rows}} data rows in the combined file.
- Pattern keys must contain all four signals exactly once.
- No internal pipe characters inside fields.
- No blank lines.
- No duplicate lookup_key values.

Language:
- Use Plain Behavioural Intelligence.
- Use British English.
- Keep the tone practical, clear, adult, and behaviourally specific.
- Keep rank 4 as deliberate range, not a weakness.
- Keep score-shape logic aligned with the context seed where score_shape applies.

Validation:
Run:
{{validation_command}}
cmd /c npm run lint
cmd /c npm run build

Report back with:
- source files reviewed
- files changed
- combined line count
- row count
- unique pattern count
- rows per pattern confirmation
- score-shape coverage confirmation, if applicable
- validator result
- lint result
- build result
- quality verdict
- risks or follow-up notes

Do not commit.
```
