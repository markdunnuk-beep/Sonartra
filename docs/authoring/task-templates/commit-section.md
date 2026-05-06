# Codex Task Template: Commit Reader-First Section

Use this only after validation and audit have passed, and only when a commit is requested.

```text
codex --model gpt-5.5 --reasoning medium

You are working in:
C:\Projects\sonartra-build\Sonartra

Task:
Commit the completed reader-first authoring work for {{domain_title}} section {{section_key}}.

Before committing:
- Review git status and git diff.
- Confirm only expected authoring files changed.
- Confirm no runtime, scoring, import, admin, UI, /draft-result, Supabase, Clerk, or live rendering files changed unless explicitly allowed.
- Confirm generated PSV content has already passed validation and audit.

Expected files:
{{output_files}}

Run:
{{validation_command}}
cmd /c npm run lint
cmd /c npm run build

If tests are relevant, also run:
{{additional_test_commands}}

Commit message:
{{commit_message}}

Report:
- files committed
- validation result
- lint result
- build result
- test results
- commit hash
- any remaining notes
```
