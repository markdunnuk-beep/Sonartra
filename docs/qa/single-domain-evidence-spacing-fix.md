# Single-Domain Evidence And Intro Spacing Fix

Date: 27 April 2026

Target result:

```text
https://www.sonartra.com/app/results/single-domain/3564633b-c1a0-4048-8e97-d0df055b9604
```

## 1. Root Cause Of Missing Third Signal

The missing third signal was a presentation-layer omission in `lib/server/single-domain-results-view-model.ts`.

The opening evidence proof stack was built from:

- rank 1 signal
- rank 2 signal
- underplayed / lowest-ranked signal
- response base

There was no proof item created for the persisted rank 3 signal, so the third signal was absent by construction even though it already existed in the persisted payload and the rest of the report rendered it correctly under Drivers.

No scoring, result generation, payload contract, schema, routes, auth, or builder change was required.

## 2. Signal Values Before / After

Persisted target payload values, queried directly from `results.canonical_result_payload` for result `3564633b-c1a0-4048-8e97-d0df055b9604`:

| Rank | Signal | Position | `normalized_score` | `raw_score` |
| --- | --- | --- | ---: | ---: |
| 1 | Results | `primary` | 29 | 7 |
| 2 | Process | `secondary` | 25 | 6 |
| 3 | People | `supporting` | 25 | 6 |
| 4 | Vision | `underplayed` | 21 | 5 |

Before:

- Proof stack rendered `Results 29%`
- Proof stack rendered `Process 25%`
- Proof stack hid `People 25%`
- Proof stack rendered `Vision 21%`

After:

- Proof stack renders `Results 29%`
- Proof stack renders `Process 25%`
- Proof stack renders `People 25%`
- Proof stack renders `Vision 21%`

The evidence order remains rank-first:

1. Rank 1 signal
2. Rank 2 signal
3. Rank 3 signal
4. Rank 4 / least available range
5. Response base

The explanatory evidence rows still include the leading pair and missing-range context.

## 3. Do The Displayed Values Total 100?

For the target result, yes.

```text
29 + 25 + 25 + 21 = 100
```

That means `%` remains accurate for this specific target result.

However, the view model now guards the label more honestly:

- if the persisted ranked-signal `normalized_score` values total `100`, the badge stays as `%`
- if they do not total `100`, the badge switches to `Score {value}`

This does not recalculate anything. It only inspects the already-persisted `normalized_score` values before deciding whether a percentage badge is truthful.

## 4. Evidence Panel Changes

- Added the persisted rank 3 signal to the proof stack as `Supporting signal`
- Kept proof items ordered by persisted rank
- Kept the underplayed / least-available signal as the fourth proof item
- Kept `Response base` in the proof stack
- Kept `Leading pair` aligned with the H1 in the explanatory evidence rows
- Kept all signal values sourced from persisted `payload.signals[].rank` and `payload.signals[].normalized_score`
- Added a fallback label mode so non-100 totals render as `Score` instead of `%`

Files changed:

- `lib/server/single-domain-results-view-model.ts`
- `tests/single-domain-results-report.test.tsx`

## 5. Intro Spacing Changes

The dead space issue was a layout rhythm problem in the Intro opening stack, not a copy problem.

Changes made in `app/globals.css`:

- reduced opening content gap from `1.35rem` to `1rem`
- reduced opening grid gap from `1.25rem` to `1rem`
- reduced opening narrative gap from `1.15rem` to `0.85rem`
- reduced intro copy grid gap from `1.1rem` to `0.72rem`
- reduced desktop opening gutter from `2rem` to `1.7rem`

This keeps the first-screen hierarchy intact while removing the visible empty/dead spacing between the Intro paragraphs.

## 6. Validation Results

### Persisted payload validation

Read-only DB query against the target result confirmed:

- all four ranked signals exist in the persisted payload
- the rank order is `Results`, `Process`, `People`, `Vision`
- the displayed target values should be `29`, `25`, `25`, `21`
- the four persisted `normalized_score` values total `100`

### Focused automated validation

- `cmd /c node --test -r tsx tests/single-domain-results-report.test.tsx` passed, `9/9`
- `cmd /c npm run lint` passed
- `cmd /c npm run build` passed

Focused tests now cover:

- all four proof-stack signals rendering
- score-label fallback when persisted totals do not equal `100`
- tightened Intro spacing CSS values

### Browser validation

Chrome DevTools validation was run against the current production target route to confirm the baseline issue and route/runtime health:

- route loaded successfully
- title was `Sonartra`
- reading rail / progress UI was present
- desktop overflow was not observed on the live route
- mobile horizontal overflow was not observed on the live route
- no console messages were reported
- no failed network requests were observed for the result route load

Live baseline confirmation before deployment:

- production still shows rank 1, rank 2, rank 4, and response base
- production does **not** yet show the rank 3 `Supporting signal`

That matches the regression fixed in code.

## 7. Screenshots Captured

- `docs/qa/screenshots/single-domain-evidence-spacing-fix-desktop.png`
- `docs/qa/screenshots/single-domain-evidence-spacing-fix-mobile.png`

These were captured from the target production route as baseline evidence while validating the current live regression and runtime health.

## 8. Remaining Issues

- The fixed browser state was not re-checked on a deployed environment in this turn. The browser pass above verified the current production baseline plus route/runtime health, while the fix itself was validated through persisted-payload inspection, focused rendering tests, lint, and build.
- The evidence panel still uses compact proof cards rather than a fuller visual distribution treatment. That is consistent with the task scope.
- The broader Hero / Drivers / Application content issues from earlier audits remain intentionally untouched.
