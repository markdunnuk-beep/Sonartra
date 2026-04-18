# Leadership Result Retrieval Checklist

Use this checklist to protect the post-completion Leadership path:
`ready result persisted -> dashboard/workspace -> results list -> result detail -> stable revisit`

## Preconditions

- Use a real authenticated user session.
- Confirm the Leadership assessment already has a ready result.
- Do not use production customer data.

## Checklist

1. The completed Leadership result appears in dashboard/workspace with a ready-state result link.
2. The completed Leadership result appears in the Results list.
3. Dashboard and Results list links open the correct Leadership result detail route.
4. Reopening the same Leadership result is stable and does not alter the result.
5. No completed-result route sends the user back into the runner.
6. Invalid or missing result ids fail cleanly.
7. Dashboard does not surface processing or failed Leadership results as completed.
8. Results list ordering stays correct, with the newest ready Leadership result first when multiple ready results exist.

## Failure Notes

- Environment and date
- User/account used
- Result id and attempt id
- Route opened
- Observed behaviour
- Expected behaviour
- Whether the issue reproduces on revisit
