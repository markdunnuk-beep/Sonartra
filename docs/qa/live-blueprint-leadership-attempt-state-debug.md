# Live Blueprint Leadership Attempt State Debug

## Route And Records Checked

- Workspace route: `https://www.sonartra.com/app/workspace`
- Assessment entry route: `https://www.sonartra.com/app/assessments/blueprint-understand-how-you-lead`
- Failed result route: `https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`
- Attempt: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`
- Result: `7caefdbf-ee98-47c7-bd21-33484e1cec48`
- User observed in browser: `mark.dunn.uk@gmail.com`

## Production Deployment Check

The latest local fix is present in the repository at commit `f2739a9` (`Align single-domain payload language fallbacks`).

Production deployment of that commit could not be confirmed from the browser or database alone because the live response headers expose Vercel request identifiers, but not the deployed git SHA. The live result row was generated before the local fix and has not been regenerated:

- `generated_at`: `2026-04-25T13:35:14.572Z`
- `updated_at`: `2026-04-25T13:35:14.572Z`

The current live failure therefore proves that the existing persisted result data is still invalid. It does not, by itself, prove whether the latest code has or has not reached production.

## Browser Findings

The live workspace renders the Blueprint card as:

- Status: `IN PROGRESS`
- Button: `Resume`
- Recommended action: `Continue your assessment`

Clicking Resume did not reopen the runner. It redirected through:

1. `GET /app/assessments/blueprint-understand-how-you-lead` -> `307`
2. `GET /app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48` -> `500`

The explicit single-domain route also fails:

- `GET /app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48` -> `500`

Console findings:

- Production Server Components render error on the result route.
- Clerk development-key warning is present and unrelated to this failure.

Network findings:

- Workspace route: `200`
- Assessment entry route: `307`
- Legacy result route: `500`
- Single-domain result route: `500`
- No failed assessment save or submit request was triggered during this read-only check.

Screenshots:

- `.codex-artifacts/live-blueprint-attempt-workspace.png`
- `.codex-artifacts/live-blueprint-attempt-resume-route.png`
- `.codex-artifacts/live-blueprint-attempt-single-domain-error.png`

## Attempt State

The live attempt exists and is not actually in progress at the persistence layer:

- `lifecycle_status`: `RESULT_READY`
- `started_at`: `2026-04-25T13:29:55.974Z`
- `submitted_at`: `2026-04-25T13:35:13.412Z`
- `completed_at`: `2026-04-25T13:35:13.412Z`
- `last_activity_at`: `2026-04-25T13:35:14.735Z`
- Response count: `24`
- Distinct question count: `24`
- Distinct selected option count: `24`
- Missing selected options: `0`

No assignment rows were found for this user in `user_assessment_assignments`, so the workspace card state is not coming from assignment status.

## Result State

The result row exists and is marked ready:

- `pipeline_status`: `COMPLETED`
- `readiness_status`: `READY`
- `failure_reason`: `null`
- `canonical_result_payload`: present
- Assessment key: `blueprint-understand-how-you-lead`
- Assessment mode: `single_domain`
- Version: `1.0.0`
- Version lifecycle: `PUBLISHED`

The payload itself is invalid for the current single-domain result contract because required fields are blank. The live payload still contains blank values across required signal and balancing fields, including:

- `signals[0].chapter_intro:results`
- `signals[0].chapter_strength:results`
- `signals[0].chapter_watchout:results`
- `signals[1].chapter_intro:process`
- `signals[1].chapter_strength:process`
- `signals[1].chapter_watchout:process`
- `signals[2].chapter_intro:people`
- `signals[2].chapter_strength:people`
- `signals[2].chapter_watchout:people`
- `signals[3].chapter_intro:vision`
- `signals[3].chapter_strength:vision`
- `signals[3].chapter_watchout:vision`
- `signals[3].chapter_development:vision`
- `signals[3].chapter_risk_behaviour:vision`
- `signals[3].chapter_risk_impact:vision`
- `balancing.system_risk_paragraph`
- `balancing.rebalance_actions[2]`

The result has one linked result row only, so there is no newer repaired result for the same attempt.

## Why The Inventory Shows In Progress

The workspace status is derived from the result read model first, then attempt presence:

- `lib/server/workspace-service.ts` lists ready results with `createResultReadModelService(...).listAssessmentResults`.
- It marks an assessment as `results_ready` only when a valid ready result list item exists.
- If no listable ready result exists but an attempt exists, it marks the assessment `in_progress`.

The result read model drops malformed ready payloads from list results:

- `lib/server/result-read-model.ts` validates single-domain payloads with `isSingleDomainResultPayload`.
- `tryToListItem` catches `AssessmentResultPayloadError` and returns `null`.

That means this live result is present in the database as `READY`, but it is invisible to the workspace result list because its payload is malformed. The workspace then sees `lifecycle.attemptId !== null` and displays `IN PROGRESS`.

The assessment entry route has the same underlying issue. It resolves the lifecycle as ready because the result row exists and has a payload, but the valid result list item cannot be found. The fallback URL is therefore the legacy `/app/results/{resultId}` route rather than the mode-specific `/app/results/single-domain/{resultId}` route. Both routes still fail because both ultimately read the same invalid payload.

## Completion Flow Classification

Root cause classification:

- Primary: payload validation issue from an invalid persisted single-domain result payload.
- Secondary UI/read-model symptom: dashboard status query falls back to `IN PROGRESS` when a ready result exists but cannot be converted into a result list item.

This is not an incomplete submission:

- The attempt is `RESULT_READY`.
- `submitted_at` and `completed_at` are populated.
- All 24 responses are saved.

This is not an assignment status issue:

- No relevant assignment row was found.

This is not a simple auth/access issue:

- The workspace loads for the authenticated user.
- The result route reaches a server render error, not a sign-in or forbidden state.

This is best described as a ready-result data integrity failure created before the composer fallback fix, with a dashboard fallback that mislabels the broken ready result as in progress.

## Remediation Required

Data remediation is required for this existing result:

- Regenerate `7caefdbf-ee98-47c7-bd21-33484e1cec48` from attempt `78fd04b9-48f1-451a-b568-db66e8c4ab6e` using the approved completion/regeneration path after the fixed composer is deployed.
- Do not edit the payload manually.
- Do not change scoring or responses.

Code remediation is required or already pending deployment:

- The composer fix in local commit `f2739a9` must be deployed before regenerating this result.
- A further hardening pass is recommended so a `RESULT_READY` attempt with an invalid ready result does not appear as `IN PROGRESS`; it should surface a repair/error state internally rather than inviting Resume.
- The assessment entry/result redirect should prefer the known assessment mode or result mode even when the list-item read model cannot materialise the result, but that does not remove the need to repair the payload.

## Safe Next Action

1. Confirm the production deployment contains commit `f2739a9` or a later commit with the same single-domain payload fallback and validation changes.
2. Regenerate the failed result through the project-approved completion/regeneration mechanism.
3. Reopen `/app/workspace` and confirm the Blueprint card changes from `IN PROGRESS` to `RESULTS READY`.
4. Reopen `/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48` and confirm the report renders.
5. Add a defensive test for workspace status when a ready result row is malformed, if this state should never again be labelled as in progress.

## No-Change Confirmation

This investigation did not change live data, language content, scoring, result payload contract, or UI layout. The only repository change from this task is this QA/debug note.
