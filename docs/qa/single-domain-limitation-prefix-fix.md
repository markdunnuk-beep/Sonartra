# Single-Domain Limitation Prefix Fix

Date: 25 April 2026

Target records:

- `assessment_version_id`: `1f1e673d-1c80-4142-ab97-8d8126119dfb`
- `attempt_id`: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`
- `result_id`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`

## Root Cause

The canonical payload after semantic hardening is structurally valid and uses the accepted `process_results` balancing row. That balancing row correctly names People as the missing range:

```text
The People signal is therefore the missing range to develop around this result...
```

The contradiction was introduced after payload construction, while adapting the persisted payload into the composed report input.

In `buildSingleDomainResultComposerInput`, the Limitation section used:

- `weaker_signal_key` from the ranked range-limitation signal, which is `vision`
- `weaker_signal_link` from `payload.balancing.system_risk_paragraph`, which is pair-owned `process_results` copy naming People

`composeSingleDomainReport` then prefixed the paragraph as:

```text
vision: The People signal is therefore...
```

The view model correctly formatted that prefix to:

```text
Vision: The People signal is therefore...
```

So the payload did not introduce the prefix contradiction. The composer adapter did.

## Fix Applied

Updated `lib/assessment-language/single-domain-composer.ts` so the Limitation prefix is resolved from the balancing text being rendered, not blindly from the ranked underplayed signal.

The new logic:

1. Selects the actual limitation link text from `system_risk_paragraph` or `rebalance_intro`.
2. Detects an explicit signal prefix when present, such as `people: ...`.
3. Detects the first named authored signal in the selected balancing paragraph.
4. Uses the explicit or first-named signal when it is unambiguous.
5. Omits the prefix if an explicit prefix conflicts with the first named signal.
6. Falls back to the ranked underplayed signal only when the balancing text does not identify a different signal.
7. Strips an existing known signal prefix from the rendered link text to avoid doubled prefixes.

This preserves generated fallback behaviour while preventing pair-owned balancing text from being prefixed with a conflicting ranked signal.

## Files Changed

- `lib/assessment-language/single-domain-composer.ts`
- `tests/single-domain-results-report.test.tsx`
- `docs/qa/single-domain-limitation-prefix-fix.md`

## Tests Added

Added a report-rendering regression for the live shape:

- top pair: `process_results`
- primary signal: `results`
- secondary signal: `process`
- supporting signal: `people`
- ranked underplayed signal: `vision`
- accepted balancing row text names People

Assertions:

- rendered report does not contain `Vision: The People signal`
- rendered report does contain `People: The People signal is therefore the missing range`

## Regeneration Simulation Result

Ran a read-only local simulation against the target attempt using the current completion path and persisted responses.

Result:

| Check | Result |
| --- | --- |
| `isSingleDomainResultPayload` | `true` |
| `diagnostics.topPair` | `process_results` |
| `balancing.pair_key` | `process_results` |
| Imported balancing row used | `true` |
| Required signal/balancing blanks | `0` |
| Rendered `Vision: The People signal` | `false` |
| Rendered `People: The People signal` | `true` |
| Process secondary says `main driver` | `false` |
| People supporting says `main driver` | `false` |
| Vision range says `main driver` | `false` |
| `Results is the weaker range` | `false` |
| `Results is underplayed` | `false` |

Rendered Limitation excerpt from the simulation:

```text
People: The People signal is therefore the missing range to develop around this result...
```

## Validation

Passed:

```text
cmd /c node --test -r tsx tests/single-domain-results-report.test.tsx
cmd /c node --test -r tsx tests/single-domain-completion.test.ts
cmd /c node --test -r tsx tests/single-domain-results-smoke.test.tsx
cmd /c npm run lint
cmd /c npm run build
```

Additional note:

- `tests/single-domain-results-view-model.test.ts` was briefly run while placing the regression. The new regression itself passed, but that suite currently has two unrelated stale assertions around pair-label mapping and release-copy casing. The regression was moved into `tests/single-domain-results-report.test.tsx`, which is one of the required targeted tests and now passes.

## Whether Live Regeneration Is Required

No additional result regeneration is required for this specific prefix fix after the code is deployed.

The problematic prefix is not persisted in `canonical_result_payload`; it is produced by the composer/view-model adaptation at render time. The existing regenerated live payload already contains the accepted `process_results` balancing row and the People balancing paragraph. Once this code is deployed, the same persisted payload should render without the `Vision:` prefix mismatch.

## Remaining Risks

- The source driver matrix still has missing role-specific cells. The semantic fallback hardening prevents contradictory persisted text, but the language coverage gap remains worth closing.
- Pair-owned balancing rows can name a different missing range than the ranked underplayed signal. This fix guards the rendered Limitation prefix, but a future schema improvement could persist the balancing row's intended missing signal explicitly.

## Recommended Next Task

Deploy this fix, then run a live browser verification on:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Confirm the Limitation chapter renders `People: The People signal...` or another non-conflicting prefix, with no `Vision: The People signal...` mismatch.
