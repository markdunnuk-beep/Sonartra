# Codex Task Template: Export Preview Fixture

Use this after the generated authoring set is structurally valid and language-audited.

```text
codex --model gpt-5.5 --reasoning medium

You are working in:
C:\Projects\sonartra-build\Sonartra

Task:
Export a /draft-result preview fixture for {{domain_title}}.

Assessment:
- assessment_key: {{assessment_key}}
- domain_key: {{domain_key}}
- domain_title: {{domain_title}}

Before exporting, read:
{{source_files_to_read}}

Use pattern:
- pattern_key: {{pattern_key}}
- score_shape: {{score_shape}}

Input:
{{full_import_file}}

Output:
content/draft-result/ranked-pattern-example.ts

Constraints:
- Do not change runtime engine code.
- Do not change scoring code.
- Do not change live result rendering.
- Do not change admin/import behaviour.
- Do not touch Supabase or Clerk.
- Do not rewrite generated PSV content during this task.
- Only update the preview fixture if the export command succeeds.

Run:
cmd /c npx tsx scripts/authoring/export-draft-result-fixture.ts --input {{full_import_file}} --pattern {{pattern_key}} --shape {{score_shape}} --output content/draft-result/ranked-pattern-example.ts
cmd /c npx tsx --test tests/draft-ranked-pattern-fixture.test.ts
cmd /c npx tsx --test tests/draft-result-page.test.tsx
cmd /c npm run lint
cmd /c npm run build

Report:
- source files reviewed
- exported pattern and score shape
- files changed
- fixture test result
- draft-result page test result
- lint result
- build result
- risks or follow-up notes

Do not commit.
```
