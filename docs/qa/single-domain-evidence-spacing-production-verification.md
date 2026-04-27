# Single-Domain Evidence Coverage And Intro Spacing Verification

Date: 27 April 2026

## 1. Local Result URL Used

```text
http://localhost:3000/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001
```

## 2. Production Result URL Used

```text
https://www.sonartra.com/app/results/single-domain/3564633b-c1a0-4048-8e97-d0df055b9604
```

## 3. Environment Context

- Local: authenticated QA session for `qa-user@sonartra.local`
- Production: authenticated production Clerk session for `mark.dunn.uk@gmail.com`
- Different result IDs were expected and treated as valid

## 4. Evidence Panel Validation

### Local

Observed evidence proof stack:

1. `Primary signal` -> `Process` -> `54%`
2. `Reinforcing signal` -> `Results` -> `33%`
3. `Supporting signal` -> `Vision` -> `13%`
4. `Least available range` -> `People` -> `0%`
5. `Response base` -> `15/15 completed responses`

Validation:

- `4` ranked signal cards are visible before `Response base`
- ordered correctly from rank `1` to rank `4`
- values match the persisted payload
- displayed values total `100`
- all badges remain percentages
- no `Score X` fallback was triggered on this result

### Production

Observed evidence proof stack:

1. `Primary signal` -> `Results` -> `29%`
2. `Reinforcing signal` -> `Process` -> `25%`
3. `Supporting signal` -> `People` -> `25%`
4. `Least available range` -> `Vision` -> `21%`
5. `Response base` -> `24/24 completed responses`

Validation:

- `4` ranked signal cards are visible before `Response base`
- ordered correctly from rank `1` to rank `4`
- values match the persisted payload
- displayed values total `100`
- all badges remain percentages
- no `Score X` fallback was triggered on this result

## 5. Signal Values Observed

Persisted payload values were read directly from `results.canonical_result_payload` and matched against the rendered page.

### Local persisted/result-page match

| Rank | Signal | Position | Rendered value | Persisted `normalized_score` |
| --- | --- | --- | ---: | ---: |
| 1 | Process | `primary` | 54% | 54 |
| 2 | Results | `secondary` | 33% | 33 |
| 3 | Vision | `supporting` | 13% | 13 |
| 4 | People | `underplayed` | 0% | 0 |

Total:

```text
54 + 33 + 13 + 0 = 100
```

### Production persisted/result-page match

| Rank | Signal | Position | Rendered value | Persisted `normalized_score` |
| --- | --- | --- | ---: | ---: |
| 1 | Results | `primary` | 29% | 29 |
| 2 | Process | `secondary` | 25% | 25 |
| 3 | People | `supporting` | 25% | 25 |
| 4 | Vision | `underplayed` | 21% | 21 |

Total:

```text
29 + 25 + 25 + 21 = 100
```

## 6. Intro Spacing Validation

Local and production both render the tightened Intro rhythm correctly.

Observed behaviour:

- no excessive vertical gaps between Intro paragraphs
- no dead-space block between the two follow-on Intro paragraphs
- text remains continuous without feeling cramped
- evidence panel spacing remains balanced against the Intro copy
- the opening still reads as a first-screen hierarchy rather than a compressed text block

DOM checks on both environments showed a small, consistent gap between the intro narrative blocks rather than the earlier oversized vertical separation.

## 7. Layout And Navigation Validation

### Layout

Local:

- no desktop overflow
- no mobile horizontal overflow
- no clipping or overlap
- evidence panel does not dominate the opening
- Hero remains readable below the Intro

Production:

- no desktop overflow
- no mobile horizontal overflow
- no clipping or overlap
- evidence panel does not dominate the opening
- Hero remains readable below the Intro

### Navigation

Desktop rail:

- sticky behaviour confirmed on local
- sticky behaviour confirmed on production
- one active rail item at a time on both environments
- active rail tracking correctly advanced through:
  - `Intro`
  - `Hero`
  - `Drivers`
  - `Pair`
  - `Limitation`
  - `Application`

Mobile progress:

- progress updated correctly on local from step `1` through step `6`
- progress updated correctly on production from step `1` through step `6`
- no horizontal overflow during mobile scroll checks

## 8. Console / Runtime Findings

### Local

- page title: `Sonartra`
- no console errors
- no failed result, RSC, or auth requests observed
- Clerk dev assets loaded successfully

Observed non-blocking local warnings:

- Next.js `scroll-behavior: smooth` warning
- React DevTools info message
- HMR connected log
- Clerk development-keys warning

These are development-environment warnings only, not result-page runtime failures.

### Production

- page title: `Sonartra`
- no console messages observed
- no failed result, RSC, or auth requests observed
- Clerk assets loaded successfully from `clerk.sonartra.com`

Observed network behaviour:

- result route returned `200`
- Clerk asset redirect hops returned `307` and resolved successfully
- no broken result, RSC, or auth fetches were observed

## 9. Screenshots Captured

Local:

- `docs/qa/screenshots/single-domain-evidence-spacing-local-desktop.png`
- `docs/qa/screenshots/single-domain-evidence-spacing-local-mobile.png`

Production:

- `docs/qa/screenshots/single-domain-evidence-spacing-production-desktop.png`
- `docs/qa/screenshots/single-domain-evidence-spacing-production-mobile.png`

## 10. Remaining Issues

- Local still emits expected development-environment warnings unrelated to the evidence or spacing fix.
- The verification pass did not exercise a non-100 score-sum result in-browser; that fallback remains covered by focused automated test coverage rather than a live route in this check.
- The pre-existing editorial issues noted in earlier result audits remain outside this verification scope.
