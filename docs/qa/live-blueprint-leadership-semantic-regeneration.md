# Live Blueprint Leadership Semantic Regeneration

Date: 25 April 2026

Target records:

- `assessment_version_id`: `1f1e673d-1c80-4142-ab97-8d8126119dfb`
- `attempt_id`: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`
- `result_id`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`

Target routes:

- `https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`
- `https://www.sonartra.com/app/workspace`

## Regeneration Method Used

The result was regenerated through the project completion path rather than by editing `canonical_result_payload` directly.

Method:

1. Read the target result and attempt state.
2. Used the existing regeneration helper at `.codex-temp/regenerate-live-blueprint-result.ts`.
3. The helper temporarily upserted the target result to `FAILED` and marked the attempt `FAILED` so `createAssessmentCompletionService(...).completeAssessmentAttempt(...)` would not short-circuit on the existing READY payload.
4. The completion service loaded the persisted responses for `attempt_id = 78fd04b9-48f1-451a-b568-db66e8c4ab6e`.
5. The single-domain completion path rebuilt the canonical payload from the existing attempt, existing responses, existing assessment version, and existing language rows.
6. `upsertReadyResult` persisted the rebuilt payload through the standard result persistence path.

No scoring, responses, assessment language rows, UI components, result schema, attempt identity, or assessment identity were changed.

Deployment note: the hardening code is present in this workspace and was the code path used for regeneration. The repo state did not independently prove a previously deployed commit because the hardening changes were still uncommitted locally at the start of this task. I did not claim external deployment parity from git history alone.

## Whether Result Was Updated Or Replaced

The existing result was updated in place.

- Result ID before: `7caefdbf-ee98-47c7-bd21-33484e1cec48`
- Result ID after: `7caefdbf-ee98-47c7-bd21-33484e1cec48`
- `sameResultUpdated`: `true`
- Previous `generated_at`: `2026-04-25T19:45:53.556Z`
- New `generated_at`: `2026-04-25T22:10:12.914Z`

## Payload Validation Result

Post-regeneration payload state:

| Check | Result |
| --- | --- |
| `pipeline_status` | `COMPLETED` |
| `readiness_status` | `READY` |
| Attempt lifecycle | `RESULT_READY` |
| `isSingleDomainResultPayload` | `true` |
| `diagnostics.topPair` | `process_results` |
| `hero.pair_key` | `process_results` |
| Required signal blanks | `0` |
| Required balancing blanks | `0` |
| Balancing title | `When structure outruns commitment` |

Signal ranking remained unchanged:

| Rank | Signal | Position | Normalised score | Raw score |
| --- | --- | --- | ---: | ---: |
| 1 | `results` | `primary` | 42 | 10 |
| 2 | `process` | `secondary` | 33 | 8 |
| 3 | `people` | `supporting` | 17 | 4 |
| 4 | `vision` | `underplayed` | 8 | 2 |

## Semantic Contradiction Checks

Post-regeneration payload checks found no matches for the target contradiction patterns:

- `Process is the main driver` in secondary Process: not present.
- `People is the main driver` in supporting People: not present.
- `Vision is the main driver` in range-limitation Vision: not present.
- `Results is the weaker range`: not present.
- `Results is underplayed`: not present.

The rendered Drivers section now reads without the original hierarchy contradictions:

- Primary driver: Results strength language.
- Secondary driver: Process supporting/secondary-safe language.
- Supporting context: People strengthening/supporting language.
- Range limitation: Vision supporting-range language, not main-driver language.

## Diagnostics Warnings

The regenerated payload includes fallback diagnostics, as expected, because the underlying driver language matrix still has missing role-specific cells.

Warnings were present for:

- `results` missing `primary_driver`
- `process` missing `secondary_driver`
- `people` missing `supporting_context`
- `vision` missing `range_limitation`

Example warning format:

```text
single_domain_driver_language_fallback: signal_key=process; missing_role=secondary_driver; fallback_source=chapter_value_outcome; generated=false
```

The warnings confirm that fallback hardening was active during regeneration.

## Workspace Status

Live workspace route:

`https://www.sonartra.com/app/workspace`

Observed state:

- Route returned `200`.
- The target card for `Blueprint - Understand how you lead` showed `RESULTS READY`.
- The card linked to `/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`.
- Latest result also pointed to the same target result.

## Result Route And Browser Status

Live result route:

`https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

Observed state:

- Route returned `200`.
- Page rendered without a 500.
- Drivers section rendered with the original main-driver contradictions removed.
- Limitation used the imported `process_results` balancing row (`When structure outruns commitment`).
- Disclosure interaction worked; expanding the Primary driver details updated the disclosure state and revealed additional prose.
- Reading rail remained visible as the page scrolled.
- Active rail state updated to `Application` after scrolling to the application section.
- No horizontal overflow was detected in the desktop browser check.

## Console And Network Findings

Console:

- Two Clerk development-key warnings.
- No render errors observed.

Network:

- Result route document request returned `200`.
- Workspace route document request returned `200`.
- Relevant RSC requests for the target result and workspace returned `200`.
- No relevant failed result or workspace network requests observed.

## Remaining Issues

One semantic issue remains in the Limitation chapter:

```text
Vision: The People signal is therefore the missing range to develop around this result...
```

The imported `process_results` balancing row correctly names People as the missing range, but the result-level weaker signal is Vision. The composer currently prefixes the limitation weaker-link paragraph with `weaker_signal_key` derived from the ranked underplayed signal rather than from the imported pair-owned balancing row.

This is no longer the original "main driver" / "Results is weaker" contradiction, but it is still a trust issue because the prefix and paragraph disagree.

## Whether Pair-Aware Driver Resolution Is Still Recommended

Yes.

Pair-aware or row-aware driver/limitation resolution is still recommended because the current system stores driver language as signal-scoped rows and derives limitation prefixing from result ranking, while pair-owned balancing rows can name a third missing range.

Recommended follow-up:

- Preserve the imported limitation weaker signal key through payload construction, or infer the limitation prefix from `balancing.rebalance_intro` / `system_risk_paragraph` when a pair-owned balancing row is accepted.
- Add a regression for `process_results` where the result underplayed signal is Vision but the accepted pair-owned balancing row names People.
- Ensure the rendered limitation never prefixes People-owned limitation copy with `Vision:`.

## Validation Commands

```text
cmd /c npm run lint
```

Result: passed.

No additional code changes were made in this regeneration task beyond the existing hardening work already present in the workspace.
