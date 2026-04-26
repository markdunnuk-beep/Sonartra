# Single-Domain Evidence Layer Upgrade

Date: 26 April 2026

Target result:

```text
https://www.sonartra.com/app/results/single-domain/3564633b-c1a0-4048-8e97-d0df055b9604
```

Reference:

- `docs/qa/single-domain-result-final-monetizable-audit.md`

## 1. Summary Of Changes

Upgraded the existing `Why this result was generated` panel only.

The panel now includes a compact proof stack before the explanatory evidence rows:

- primary signal
- reinforcing signal
- least available range
- response base
- leading pair, ordered to match the H1

No opening copy, Hero copy, Drivers copy, Pair copy, Limitation copy, Application copy, routes, auth, scoring, ranking, result generation, payload contract, database schema, assessment builder, or source language was changed.

## 2. Persisted Fields Used

The upgrade uses fields already present in the persisted single-domain result payload and existing result view model path:

| Displayed evidence | Persisted/source field |
| --- | --- |
| Primary signal | `payload.signals[]` sorted by persisted `rank` |
| Reinforcing signal | `payload.signals[]` sorted by persisted `rank` |
| Least available range | `payload.signals[]` with `position === 'underplayed'`, falling back to lowest persisted rank |
| Rank labels | persisted `signal.rank` |
| Score badges | persisted `signal.normalized_score` |
| Response count | `payload.diagnostics.answeredQuestionCount` and `payload.diagnostics.totalQuestionCount` |
| Leading pair | persisted `payload.hero.pair_key`, displayed through existing approved signal label formatting |
| Hero evidence detail | persisted `payload.hero.hero_opening` |
| Signal pattern detail | persisted signal ordering and diagnostics response count |
| Missing range title | persisted `payload.balancing.balancing_section_title` |

No UI-side score recalculation was added. The view layer displays persisted rank and normalized-score values.

## 3. Evidence Ordering Decision

The final audit flagged a trust friction:

```text
H1: Results-led pattern, reinforced by Process
Evidence: Leading pair - Process and Results
```

The persisted pair key can be stored in pair-key order, while the H1 is intentionally ordered by actual result role: primary signal first, reinforcing signal second.

Decision:

- Keep the underlying persisted pair untouched.
- Keep metadata pair display untouched.
- In the evidence panel, show the leading pair in primary-first order so it aligns with the H1.
- Add a short detail when the persisted pair label order differs: `Shown primary-first to match the headline.`

For the target result, the evidence panel should now read:

```text
Primary signal: Results
Reinforcing signal: Process
Least available range: Vision
Response base: 24/24 completed responses
Leading pair: Results and Process
```

## 4. Desktop / Mobile Validation

Pre-deployment validation:

| Check | Result |
| --- | --- |
| Focused render test | Passed |
| Lint | Passed |
| Production build | Passed |

Post-deployment Chrome MCP production validation:

| Check | Result |
| --- | --- |
| Desktop target route | Pending deployment check |
| Mobile target route | Pending deployment check |
| Evidence proof stack visible | Pending deployment check |
| Evidence order aligns with H1 | Pending deployment check |
| Horizontal overflow | Pending deployment check |

## 5. Console / Runtime Findings

Pre-deployment:

- `npm run lint` passed.
- `npm run build` passed.
- Focused report rendering test passed.

Post-deployment:

- Pending production verification after deployment.

## 6. Screenshots Captured

Pending production deployment check.

## 7. Remaining Weaknesses

- The evidence panel now has stronger proof density, but it is still a compact proof layer, not a full methodology or confidence explanation.
- Metadata still displays the persisted pair label separately; the evidence panel intentionally uses primary-first order to align with the H1.
- The broader Application-section weakness from the final monetizable audit remains intentionally untouched.
