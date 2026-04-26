# Blueprint Driver Claims Full Dataset Import

Date: 26 April 2026

Target records:

- `assessment_version_id`: `1f1e673d-1c80-4142-ab97-8d8126119dfb`
- `attempt_id`: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`
- `result_id`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`

## 1. Dataset Created

Created:

- `docs/results/gold-standard-language/authoring-csv/single_domain_drivers_full.csv`

Format:

```text
domain_key|section_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority
```

The dataset contains 24 `SINGLE_DOMAIN_DRIVERS` rows:

- 6 pair keys
- 4 driver roles per pair
- 1 row per pair-role

The full dataset uses runtime-canonical pair key `process_results` for the Results/Process pair so the current live result resolves by exact match rather than reversed-pair compatibility.

## 2. Pair Coverage Table

| Pair key | Primary | Secondary | Supporting | Range limitation |
| --- | --- | --- | --- | --- |
| `process_results` | `results` | `process` | `people` | `vision` |
| `results_people` | `results` | `people` | `process` | `vision` |
| `results_vision` | `results` | `vision` | `process` | `people` |
| `process_people` | `process` | `people` | `results` | `vision` |
| `process_vision` | `process` | `vision` | `results` | `people` |
| `vision_people` | `vision` | `people` | `process` | `results` |

Validation confirmed:

- total rows: 24
- distinct pair keys: 6
- each pair has exactly one `primary_driver`
- each pair has exactly one `secondary_driver`
- each pair has exactly one `supporting_context`
- each pair has exactly one `range_limitation`
- no duplicate `(pair_key, signal_key, driver_role)` keys

Role mapping validation:

| Driver role | Claim type | Materiality |
| --- | --- | --- |
| `primary_driver` | `driver_primary` | `core` |
| `secondary_driver` | `driver_secondary` | `core` |
| `supporting_context` | `driver_supporting_context` | `supporting` |
| `range_limitation` | `driver_range_limitation` | `material_underplay` |

## 3. Import Result

Import script:

```text
cmd /c npx tsx .codex-temp/import-full-driver-claims.ts
```

Import path:

1. parsed the pipe-delimited `SINGLE_DOMAIN_DRIVERS` file
2. validated against the target single-domain assessment context
3. normalised pair keys through the runtime pair-key resolver
4. mapped `SINGLE_DOMAIN_DRIVERS` to `DRIVER_CLAIMS`
5. persisted via `saveSingleDomainLanguageDataset(..., datasetKey: 'DRIVER_CLAIMS')`

Result:

| Check | Result |
| --- | --- |
| Parsed source rows | 24 |
| Persisted rows | 24 |
| Persisted distinct pair keys | 6 |
| Target domain | `leadership-approach` |
| Target signals | `process`, `results`, `vision`, `people` |

Persisted pair coverage:

| Pair key | Rows |
| --- | ---: |
| `process_people` | 4 |
| `process_results` | 4 |
| `process_vision` | 4 |
| `results_people` | 4 |
| `results_vision` | 4 |
| `vision_people` | 4 |

## 4. Readiness Result

Runtime readiness after import:

| Check | Result |
| --- | --- |
| `DRIVER_CLAIMS` row count | 24 |
| Expected driver-claim rows | 24 |
| Driver-claim readiness issues | 0 |

Coverage is now `24/24`.

## 5. Regeneration Simulation Result

Simulation command:

```text
cmd /c npx tsx .codex-temp/pair-driver-readonly-check.ts
```

Result:

| Check | Result |
| --- | --- |
| Payload valid | Pass |
| `topPair` | `process_results` |
| Response count | 24 |
| `DRIVER_CLAIMS` source diagnostics | 4 |
| Pair-driver fallback warnings | 0 |
| Required signal blanks | 0 |
| Contradiction patterns | none found |

The four live driver roles resolved from `DRIVER_CLAIMS`:

- `process_results + results + primary_driver`
- `process_results + process + secondary_driver`
- `process_results + people + supporting_context`
- `process_results + vision + range_limitation`

## 6. Regeneration Result

Regeneration command:

```text
cmd /c npx tsx .codex-temp/regenerate-live-blueprint-result.ts
```

Result:

| Check | Result |
| --- | --- |
| Completion success | true |
| Same `result_id` preserved | true |
| `result_id` | `7caefdbf-ee98-47c7-bd21-33484e1cec48` |
| `attempt.lifecycle_status` | `RESULT_READY` |
| `pipeline_status` | `COMPLETED` |
| `readiness_status` | `READY` |
| Payload valid | true |
| Payload mode | `single_domain` |
| `topPair` | `process_results` |
| Hero pair key | `process_results` |
| Required signal and balancing blanks | 0 |
| Generated at | `2026-04-26T16:29:06.693Z` |

Persisted diagnostics now include four pair-scoped driver source records:

- `single_domain_driver_claim_source: pair_key=process_results; signal_key=results; role=primary_driver; source=driver_claims`
- `single_domain_driver_claim_source: pair_key=process_results; signal_key=process; role=secondary_driver; source=driver_claims`
- `single_domain_driver_claim_source: pair_key=process_results; signal_key=people; role=supporting_context; source=driver_claims`
- `single_domain_driver_claim_source: pair_key=process_results; signal_key=vision; role=range_limitation; source=driver_claims`

No `single_domain_pair_driver_claim_missing` warnings remain.

Note: legacy `single_domain_driver_language_fallback` diagnostics still exist for older signal-chapter detail fields outside the pair-scoped driver-claim lookup. They do not drive the visible Drivers claims after this regeneration.

## 7. Browser Verification

Authenticated production browser session:

```text
mark.dunn.uk@gmail.com
```

Canonical route:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Result:

- route returns `200`
- report renders
- Drivers section shows the new pair-scoped `DRIVER_CLAIMS` copy
- old fallback driver phrases are absent from the refreshed page
- Application section remains vertical and present
- Limitation remains coherent with `People: The People signal ...`
- mobile progress rail is present at `430px`
- no render errors observed

Generic route:

```text
https://www.sonartra.com/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Result:

- network shows `GET /app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48 [307]`
- browser lands on `/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`
- legacy generic view is not rendered

Workspace:

```text
https://www.sonartra.com/app/workspace
```

Result:

- target card shows `RESULTS READY`
- target CTA is `View Results`
- target CTA links to `/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`
- latest result card shows completed date `26 Apr 2026`
- latest result link points to the canonical route

Console:

- no render errors observed
- Clerk development-key warnings only

## 8. Before vs After Drivers

Before regeneration, the visible Drivers copy was fallback-derived:

| Role | Before |
| --- | --- |
| Primary driver | `Results strengthens this pattern by adding urgency and focus...` |
| Secondary driver | `Process sits behind the pattern as a supporting influence...` |
| Supporting context | `People strengthens this pattern by shaping how others experience the work...` |
| Range limitation | `Vision sits behind the pattern as a supporting influence...` |

After regeneration, the visible Drivers copy comes from exact pair-scoped `DRIVER_CLAIMS`:

| Role | After |
| --- | --- |
| Primary driver | `Results is the main cause of this pattern...` |
| Secondary driver | `Process reinforces the pattern by adding structure and operating discipline...` |
| Supporting context | `People sits behind the pattern as a supporting layer...` |
| Range limitation | `Vision is the weaker range in this result...` |

The after-state is role-accurate for:

- primary = `results`
- secondary = `process`
- supporting = `people`
- range limitation = `vision`

## 9. Validation Commands

```text
cmd /c npx tsx .codex-temp/import-full-driver-claims.ts
cmd /c npx tsx .codex-temp/pair-driver-readonly-check.ts
cmd /c npx tsx .codex-temp/regenerate-live-blueprint-result.ts
cmd /c npx tsx .codex-temp/live-driver-claims-state.ts
cmd /c npx tsx .codex-temp/inspect-driver-copy.ts
```

Results:

- import passed
- readiness coverage passed
- simulation passed
- regeneration passed
- persisted payload inspection passed
- browser verification passed after a hard refresh of the result route

## 10. Final Status

Complete.

Pair-aware driver resolution is now active for the live Blueprint Leadership result:

- `DRIVER_CLAIMS` coverage is complete at `24/24`
- live result uses `DRIVER_CLAIMS` for all four visible `process_results` driver roles
- pair-driver fallback warnings are zero
- visible driver contradictions are absent
- canonical route, generic redirect, and workspace state remain valid
