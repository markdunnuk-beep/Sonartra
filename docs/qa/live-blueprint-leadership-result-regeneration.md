# Live Blueprint Leadership Result Regeneration

Date: 2026-04-25

## Target Records

- Attempt: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`
- Result: `7caefdbf-ee98-47c7-bd21-33484e1cec48`
- Assessment: `Blueprint - Understand how you lead`
- Mode: `single_domain`

## Regeneration Method Used

The result was regenerated through the project completion path:

1. Loaded the existing result and attempt owner from the live database.
2. Moved the existing result through the existing failed-result transition using `upsertFailedResult(...)` and `markAttemptFailed(...)` so the completion service would not short-circuit on the old READY payload.
3. Called `createAssessmentCompletionService({ db }).completeAssessmentAttempt({ attemptId, userId })`.
4. Re-read the persisted result and validated the regenerated payload with `isSingleDomainResultPayload`.

The regeneration did not manually edit `canonical_result_payload`, scoring, responses, language rows, assessment data, or selected options.

During the first regeneration attempt the local completion path exposed a timestamp serialization gap: live Postgres timestamps were entering the engine response set as `Date` objects, while the single-domain payload contract requires string timestamps. The fix was applied at the completion-query boundary so persisted response timestamps are converted to ISO strings before payload assembly.

## Existing Result Updated Or Replaced

The existing result row was updated in place.

- Returned `resultId`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`
- Same result updated: yes
- Final attempt lifecycle: `RESULT_READY`
- Final result pipeline status: `COMPLETED`
- Final result readiness status: `READY`
- Final `generated_at`: `2026-04-25T19:45:53.556Z`

## Payload Validation Result

Validation passed.

- `isSingleDomainResultPayload`: `true`
- Payload mode: `single_domain`
- Top pair: `process_results`
- Hero pair key: `process_results`
- Required signal and balancing blank-field count: `0`

Signal summary after regeneration:

| Signal | Rank | Position | Normalized | Raw | Required text present |
| --- | ---: | --- | ---: | ---: | --- |
| `results` | 1 | `primary` | 42 | 10 | yes |
| `process` | 2 | `secondary` | 33 | 8 | yes |
| `people` | 3 | `supporting` | 17 | 4 | yes |
| `vision` | 4 | `underplayed` | 8 | 2 | yes |

## Workspace Status After Regeneration

Verified in Chrome DevTools MCP at `https://www.sonartra.com/app/workspace`.

The target Blueprint leadership card changed from the previous broken `IN PROGRESS` state to:

- Badge: `RESULTS READY`
- Current state: `Results ready`
- CTA: `View Results`
- Result link: `/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

The workspace still shows a separate `Sonartra Blueprint` card as `IN PROGRESS`; that is a different assessment route and not the target record.

## Result Route Status

Verified routes:

| Route | Browser result | Network status |
| --- | --- | --- |
| `https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48` | Single-domain report renders without the previous server error | `200` |
| `https://www.sonartra.com/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48` | Generic result route renders without 500 | `200` |
| `https://www.sonartra.com/app/workspace` | Workspace renders and links the target card to the single-domain result route | `200` |

## Console And Network Findings

Console:

- No result-route render errors observed after regeneration.
- Only Clerk development-key warnings appeared.

Network:

- Single-domain result document request returned `200`.
- Generic result document request returned `200`.
- Workspace document request returned `200`.
- No relevant failed route, RSC, or asset requests were observed during the checked navigations.

## Validation Commands

- `npm run lint`: passed.
- `node --test -r tsx tests/single-domain-completion.test.ts tests/assessment-completion-service.test.ts`: initial sandboxed run failed with the known `spawn EPERM`; rerun outside the sandbox passed with 20 tests.

## Remaining Issues

- The generic `/app/results/{resultId}` route renders the older generic result-detail view rather than the single-domain six-section report. It no longer 500s, but the canonical user-facing route for this result is the single-domain route.
- Some fallback-generated visible wording is mechanically valid but editorially rough, for example lowercase signal labels in the fallback hero. This does not break the payload contract or route rendering, but it remains a presentation/content polish item.
