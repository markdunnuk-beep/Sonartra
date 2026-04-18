# Leadership Regression Checklist

Use this checklist to protect the validated Leadership assessment path:
`clean entry -> start -> starting loader -> runner -> processing -> results`

## Preconditions

- Use the live or target environment with a real authenticated user session.
- Confirm the test user starts from a known state:
  - not-started
  - in-progress
  - processing
  - ready result
- Do not use production customer data.

## Checklist

1. Not-started state is visible and shows one obvious primary `Start` action.
2. Starting from a clean entry responds immediately and does not require a second click.
3. The starting loader appears with no blank frame, flicker, or shell reset.
4. The loader-to-runner handoff lands on question 1 cleanly with no duplicate render feel.
5. The runner shell stays composed while answering and progress remains stable.
6. Refresh during the runner resumes the same attempt without losing saved answers.
7. Submitting a complete attempt enters processing immediately with no false-ready state.
8. Refresh during processing returns to the same processing handoff or proceeds to the ready result cleanly.
9. The results page loads fully from the persisted result with no broken intermediary state.
10. Resume behaviour never creates a duplicate attempt and completed attempts do not re-complete incorrectly.

## Failure Notes

Record these fields for any failure:

- Environment and date
- User/account used
- Assessment key and attempt id
- Exact route
- Observed behaviour
- Expected behaviour
- Whether the issue is reproducible after refresh
