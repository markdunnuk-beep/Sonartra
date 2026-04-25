# Blueprint Leadership Post-Deploy Smoke Audit

Date: 25 April 2026

Target records:

- `result_id`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`
- `attempt_id`: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`

## Executive Summary

The canonical Blueprint Leadership single-domain result flow is healthy after the semantic fallback, limitation prefix, report layout, and visual polish changes.

Go/no-go for the canonical flow: **Go**.

The main remaining issue is compatibility on the generic `/app/results/[resultId]` route. It returns `200` and does not 500, but it still renders the older generic result view rather than redirecting to, or delegating to, the canonical single-domain report route.

## Routes Checked

| Route | Result |
| --- | --- |
| `https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48` | `200`, canonical single-domain report rendered |
| `https://www.sonartra.com/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48` | `200`, older generic result view rendered |
| `https://www.sonartra.com/app/workspace` | `200`, target card shows `RESULTS READY` |

## Single-Domain Result Findings

Canonical route:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Findings:

- Route returned `200`.
- Page rendered without a 500.
- Report rendered as the single-domain editorial report.
- Drivers remained vertical.
- Application remained vertical.
- Disclosure controls worked; clicking a disclosure changed its open state.
- Reading rail was present with the expected six anchors: Intro, Hero, Drivers, Pair, Limitation, Application.
- Desktop reading rail sticky child remained visible while scrolling.
- Desktop active rail state updated when navigating to the Application anchor.
- No horizontal overflow was observed.

Contradiction checks:

| Pattern | Present? |
| --- | --- |
| `Process is the main driver` | No |
| `People is the main driver` | No |
| `Vision is the main driver` | No |
| `Results is the weaker range` | No |
| `Vision: The People signal` | No |

Limitation prefix:

```text
People: The People signal is therefore the missing range to develop around this result...
```

The limitation prefix remains coherent.

## Generic Route Findings

Generic route:

```text
https://www.sonartra.com/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Findings:

- Route returned `200`.
- No 500 or application error was observed.
- The route did not redirect to the canonical single-domain route.
- It rendered the older generic result view.
- Older generic content was visible, including generic report framing such as `Domain chapters`, `No persisted domain summaries are available for this result`, `Start here`, and `Read this first`.
- The generic route did not show the single-domain canonical chapter structure.

Contradiction checks on the generic route:

- The specific target contradiction strings were not observed.
- The problem is compatibility and presentation, not a hard route failure.

Follow-up classification:

- Non-blocking for the canonical result flow.
- Should be fixed before relying on generic result links for single-domain results.

## Workspace Findings

Workspace route:

```text
https://www.sonartra.com/app/workspace
```

Findings:

- Route returned `200`.
- Target assessment card showed `RESULTS READY`.
- Target card heading: `Blueprint - Understand how you lead`.
- Target card CTA: `View Results`.
- Target CTA linked to:

```text
/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

- Latest result block also showed `Blueprint - Understand how you lead`.
- Latest result CTA linked to the same canonical single-domain result route.
- No fallback to `IN PROGRESS` or `Resume` was observed on the target card.

Note:

- The workspace still has a separate recommended next action for another in-progress assessment. That does not affect the target Blueprint Leadership result card.

## Mobile And Desktop Findings

Desktop viewport checked:

- `1440 x 1100`

Desktop result:

- Canonical report rendered correctly.
- Reading rail was visible and sticky.
- Active rail state updated when moving to Application.
- Drivers and Application remained vertical.
- Limitation prefix was coherent.

Mobile viewport checked:

- `430 x 932`

Mobile result:

- Canonical report rendered correctly.
- Mobile progress component rendered.
- Mobile progress state updated to `Limitation` during the scroll check.
- Limitation prefix remained coherent.
- Drivers and Application remained vertical.
- No horizontal overflow was observed.

Mobile note:

- During a deep anchor-style scroll, the progress component's state updated correctly, but the element was above the viewport after the jump. This did not block the smoke audit, but if persistent mobile orientation is required through the full report, it should be checked in a dedicated mobile progress QA pass.

## Console And Network Findings

Console:

- Known Clerk development-key warning appeared.
- No result-render errors were observed.

Network:

- Canonical single-domain document request returned `200`.
- Generic result document request returned `200`.
- Workspace document request returned `200`.
- Relevant RSC/navigation requests returned `200`.
- No failed result/RSC requests were observed.

## Validation

Passed:

```text
cmd /c npm run lint
```

No code changes were made for this smoke audit.

## Remaining Issues

1. Generic result route compatibility:
   - `/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48` still renders the older generic result view instead of redirecting to or delegating to the single-domain report.

2. Mobile progress persistence:
   - Mobile progress rendered and updated, but a deeper targeted pass should confirm whether it is intended to remain visible through all chapters during manual scroll, not only update state.

## Go/No-Go Recommendation

Canonical Blueprint Leadership result flow: **Go**.

Do not treat the generic `/app/results/[resultId]` route as production-ready for this single-domain result until it safely redirects or renders the canonical single-domain report.

## Recommended Next Task

Fix generic result route compatibility for single-domain results:

- Detect `metadata.mode === 'single_domain'` or the equivalent persisted mode in the result read model.
- Redirect `/app/results/[resultId]` to `/app/results/single-domain/[resultId]`, or render the single-domain report from the generic route without introducing a second rendering contract.
- Preserve canonical payload consumption only.
- Add a route-level regression test proving the generic URL does not render the older generic report for single-domain results.
