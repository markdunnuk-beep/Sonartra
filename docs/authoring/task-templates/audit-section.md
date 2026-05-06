# Codex Task Template: Audit Reader-First Section

Use this for a read-only section audit. Edit only if there is a clear blocking defect.

```text
codex --model gpt-5.5 --reasoning medium

You are working in:
C:\Projects\sonartra-build\Sonartra

Task:
Audit reader-first authoring content for {{domain_title}} section {{section_key}}.

Assessment:
- assessment_key: {{assessment_key}}
- domain_key: {{domain_key}}
- domain_title: {{domain_title}}

Audit files:
{{output_files}}

Required source/reference files:
{{source_files_to_read}}

Do not change files unless there is a clear blocking defect.
Do not touch runtime, scoring, import, admin, UI, /draft-result, Supabase, Clerk, or live result rendering code.

Assess:
1. Source alignment with the assessment context seed.
2. Signal accuracy for {{signal_labels}}.
3. Section purpose alignment for {{section_key}}.
4. Rank 4 treated as deliberate range, not a deficit.
5. Score-shape handling where applicable.
6. Plain Behavioural Intelligence.
7. Repetition across patterns.
8. Distinction from earlier sections.
9. Import readiness.

Run:
{{validation_command}}
cmd /c npm run lint
cmd /c npm run build

Report:
- source files reviewed
- generated files audited
- structural validation result
- quality verdict out of 10
- top recurring issues, if any
- specific rows needing rewrite, if any
- whether the section is safe to commit as-is

Do not commit.
```
