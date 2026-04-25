# Live Blueprint Leadership Result Error Debug

Date checked: 2026-04-25

Scope: investigation first. No code, language content, database records, builder data, publish state, scoring, payload contract, or UI layout were changed.

## Route Tested

Failed live route:

`https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

Assessment:

`Blueprint - Understand how you lead`

## Browser Error Observed

The result route returns the production error page:

- Heading: `This page couldn’t load`
- Message: `A server error occurred. Reload to try again.`
- Error digest: `304516468`

Screenshot captured:

`.codex-artifacts/live-blueprint-leadership-result-error.png`

## Console And Network Findings

Console:

- `Failed to load resource: the server responded with a status of 500`
- `Uncaught Error: An error occurred in the Server Components render...`
- Clerk development-key warning also appears. This is not the result route failure.

Network:

- `GET /app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48` returned `500`.
- Static assets and Clerk requests returned `200` or expected `307 -> 200` redirects.
- No other relevant failed result data request was visible because the failure occurs during Server Components render.

## Result Record Status

Production result row exists.

- Result ID: `7caefdbf-ee98-47c7-bd21-33484e1cec48`
- Attempt ID: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`
- Assessment version ID: `1f1e673d-1c80-4142-ab97-8d8126119dfb`
- Assessment key: `blueprint-understand-how-you-lead`
- Assessment mode: `single_domain`
- Version mode: `single_domain`
- Version lifecycle: `PUBLISHED`
- Pipeline status: `COMPLETED`
- Readiness status: `READY`
- Failure reason: `null`
- `canonical_result_payload`: present
- Payload metadata mode: `single_domain`
- Payload domain key: `leadership-approach`
- Payload top pair: `process_results`

## Attempt And Response Status

Linked attempt:

- Attempt lifecycle: `RESULT_READY`
- Started: `2026-04-25T13:29:55.974Z`
- Submitted: `2026-04-25T13:35:13.412Z`
- Completed: `2026-04-25T13:35:13.412Z`

Responses:

- Response count: 24
- Distinct question count: 24
- Distinct selected option count: 24
- Invalid response count: 0
- Selected options with weight rows: 24 of 24
- Selected option weight sum: 24

This rules out an incomplete attempt, missing saved responses, invalid selected options, and missing selected-option weights as the immediate cause.

## Runtime Language Resolution Findings

Published language row counts are complete by count:

- Domain framing: 1
- Hero pairs: 6
- Signal chapters: 4
- Pair summaries: 6
- Balancing sections: 6
- Application statements: 4

However, read-only inspection of the published language rows found blank required fields:

Signal chapter blanks:

- `people`: `chapter_intro_supporting`
- `process`: `chapter_intro_secondary`
- `results`: `chapter_intro_primary`
- `vision`: `chapter_intro_underplayed`, `chapter_risk_behaviour`, `chapter_risk_impact`, `chapter_development`

Balancing section blanks:

- All six pair rows have blank `rebalance_action_2` and `rebalance_action_3`.

The completed result's top pair is `process_results`. Its payload contains blank fields that match the source language gaps and fallback path:

- `signals[0].chapter_intro`: blank for `results`
- `signals[1].chapter_intro`: blank for `process`
- `signals[2].chapter_intro`: blank for `people`
- `signals[3].chapter_intro`: blank for `vision`
- `signals[3].chapter_risk_behaviour`: blank for `vision`
- `signals[3].chapter_risk_impact`: blank for `vision`
- `signals[3].chapter_development`: blank for `vision`
- `balancing.system_risk_paragraph`: blank
- `balancing.rebalance_actions[2]`: blank

The balancing blanks are worsened by fallback behaviour: because the specific `process_results` balancing language did not appear to resolve as pair-specific enough for the selected signal pair, completion used signal-level fallback. The fallback selected the underplayed `vision` signal, but the required `vision` risk/development fields were blank, so the fallback produced blank limitation content.

## Payload And Read-Model Findings

Local reproduction against the persisted production payload:

- `isSingleDomainResultPayload(payload)` returned `false`.
- `createSingleDomainResultsViewModel(payload)` can compose a six-section report if called directly, but the result route does not get that far.

The live route calls:

1. `getAssessmentResultDetail`
2. `parseCanonicalPayload`
3. `isSingleDomainResultPayload`
4. `createSingleDomainResultsViewModel`

Because `isSingleDomainResultPayload` rejects the persisted payload, `parseCanonicalPayload` throws `AssessmentResultPayloadError`. In production this becomes the Server Components 500 error page.

## Root Cause

Root cause classification: **payload validation issue caused by incomplete published single-domain language data, with a completion/readiness gap**.

The assessment completion path successfully scored and persisted a result as `READY`, but the generated single-domain payload contains blank fields that violate the current `SingleDomainResultPayload` validator. Runtime readiness and publish readiness counted language rows but did not enforce all non-empty fields needed by the result payload contract. Completion also did not validate the generated single-domain payload before persisting it as `READY`.

This is not an auth/access issue, not a missing result issue, not an incomplete response issue, and not a UI layout issue.

## Recommended Fix

Recommended sequence:

1. Tighten single-domain publish/runtime readiness so required language fields are non-empty, not just row-count complete.
2. Validate the generated single-domain payload with `isSingleDomainResultPayload` before calling `upsertReadyResult`.
3. If validation fails, persist the result as `FAILED` with a clear failure reason instead of `READY`.
4. Correct the published Blueprint leadership language data:
   - fill position-specific signal intro fields for all signals that can occupy those positions.
   - fill `vision` risk/development fields.
   - fill all required balancing actions or loosen the payload contract only if the product deliberately allows fewer actions.
   - review why `process_results` balancing language fell back instead of resolving as specific pair language.
5. After code and data are corrected, regenerate this result through an approved completion/remediation path.

## Whether Code Change Is Required

Yes.

At minimum, code should prevent malformed single-domain payloads from being marked `READY`. The readiness checks should also fail earlier when language rows have blank fields that are required to generate a valid result payload.

## Whether Language Or Import Data Needs Correction

Yes.

The published single-domain language rows contain blank fields that directly produced invalid payload fields. The Blueprint language data should be corrected before republishing or regenerating affected results.

## Whether Result Can Be Regenerated Safely

Yes, but only after the language data and validation gap are fixed.

The linked attempt is complete, has 24 valid responses, and all selected options have weights. The result should be regenerable from the existing attempt through a project-approved remediation/completion path. Do not manually edit the persisted payload unless a maintenance path explicitly supports that operation.

## Files Inspected

- `app/(user)/app/results/single-domain/[resultId]/page.tsx`
- `lib/server/result-read-model.ts`
- `lib/server/result-read-model-queries.ts`
- `lib/types/single-domain-result.ts`
- `lib/server/single-domain-results-view-model.ts`
- `lib/server/single-domain-completion.ts`
- `lib/server/assessment-completion-service.ts`
- `lib/assessment-language/single-domain-composer.ts`
- `db/migrations/202603260001_mvp_canonical_schema.sql`

## Validation

Run after documenting:

`npm run lint`
