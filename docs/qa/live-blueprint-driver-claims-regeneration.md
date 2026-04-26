# Live Blueprint Driver Claims Regeneration

Date: 26 April 2026

Target records:

- `assessment_version_id`: `1f1e673d-1c80-4142-ab97-8d8126119dfb`
- `attempt_id`: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`
- `result_id`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`

## 1. Migration Status

Applied migration:

```text
202604260001_pair_scoped_single_domain_driver_claims.sql
```

Command:

```text
cmd /c npm run db:migrate
```

Result:

```text
Applied 1 migration(s):
- 202604260001_pair_scoped_single_domain_driver_claims.sql
```

Post-migration verification confirmed the target database now has:

- `assessment_version_single_domain_driver_claims`
- primary key on `id`
- foreign key to `assessment_versions(id) ON DELETE CASCADE`
- role, claim type, materiality, and positive-priority checks
- unique constraint on `assessment_version_id, domain_key, pair_key, signal_key, driver_role, priority`
- lookup index on `assessment_version_id, domain_key, pair_key, signal_key, driver_role`

## 2. Driver Claims Load Method

No driver claims were loaded.

Reason: the authoritative 24-row Blueprint Leadership `SINGLE_DOMAIN_DRIVERS` source was not found in the repo or in the target table. The checked-in gold-standard source contains four rows for `results_process`, not the required 24 rows across six pairs.

Checked source:

- `docs/results/gold-standard-language/authoring-csv/single_domain_drivers.csv`
- `docs/results/gold-standard-language/leadership-results-process-pipe-imports.md`
- repo-wide search for `SINGLE_DOMAIN_DRIVERS`, `primary_driver`, `range_limitation`, `process_results`, and `results_process`
- `data/language/Language_Database.xlsx`
- `data/language/Language_Database_v2_expanded.xlsx`

The available checked-in driver source is coherent for this authored ranking:

| Source pair | Signal | Role |
| --- | --- | --- |
| `results_process` | `process` | `primary_driver` |
| `results_process` | `results` | `secondary_driver` |
| `results_process` | `vision` | `supporting_context` |
| `results_process` | `people` | `range_limitation` |

That does not satisfy the requested target coverage for `process_results` where `results` is primary, `process` is secondary, `people` is supporting, and `vision` is range limitation.

## 3. Driver Claims Coverage Table

Target table coverage after migration:

| Metric | Count |
| --- | ---: |
| Persisted `DRIVER_CLAIMS` rows | 0 |
| Distinct pair keys | 0 |
| Expected rows | 24 |
| Expected pair keys | 6 |

Coverage by pair:

| Pair key | Rows | Roles |
| --- | ---: | --- |
| none | 0 | none |

## 4. Readiness Result

Driver-claims readiness remains incomplete for the target assessment version because there are no persisted pair-scoped driver claim rows.

Expected readiness coverage:

- 6 pair keys
- 4 roles per pair
- 24 rows total
- exactly one `primary_driver`, `secondary_driver`, `supporting_context`, and `range_limitation` row per pair

Actual coverage:

- 0 pair keys
- 0 rows

## 5. Regeneration Simulation Result

Read-only simulation command:

```text
cmd /c npx tsx .codex-temp/pair-driver-readonly-check.ts
```

Result:

| Check | Result |
| --- | --- |
| Payload valid | Pass |
| `topPair` | `process_results` |
| Response count | 24 |
| Required signal blanks | 0 |
| `DRIVER_CLAIMS` source diagnostics | 0 |
| Pair-driver fallback warnings | 4 |
| Contradiction patterns checked | none found |

Fallback warnings were emitted for the four live driver roles:

- `process_results + results + primary_driver`
- `process_results + process + secondary_driver`
- `process_results + people + supporting_context`
- `process_results + vision + range_limitation`

The simulation did not meet the Task 4 success criteria because it could not source those four driver claims from `DRIVER_CLAIMS`.

## 6. Live Regeneration Method

Live regeneration was not performed.

Reason:

- the target table exists, but the required 24 authoritative driver claim rows are absent
- the read-only simulation still used fallback for all four live driver roles
- the deployed application could not be confirmed to include the pair-aware completion resolver before regeneration

No `canonical_result_payload` text was manually edited.

## 7. Persisted Payload Validation

The existing persisted result was inspected but not regenerated.

| Field | Value |
| --- | --- |
| `result_id` | `7caefdbf-ee98-47c7-bd21-33484e1cec48` |
| `attempt_id` | `78fd04b9-48f1-451a-b568-db66e8c4ab6e` |
| `pipeline_status` | `COMPLETED` |
| `readiness_status` | `READY` |
| `attempt.lifecycle_status` | `RESULT_READY` |
| persisted `topPair` | `process_results` |
| persisted warnings | 16 legacy driver-language fallback warnings |

The persisted payload does not contain the new `single_domain_driver_claim_source` diagnostics. Its warnings are the earlier `single_domain_driver_language_fallback` diagnostics.

## 8. Browser Route Verification

Authenticated browser verification used `mark.dunn.uk@gmail.com`.

Canonical route:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Result:

- HTTP `200`
- single-domain report renders
- Drivers, Pair, Limitation, and Application sections render
- Limitation prefix remains coherent: `People: The People signal ...`
- mobile progress rail is present at `430px`
- disclosure interaction works
- no render errors observed

Driver text is still fallback-derived, not pair-scoped `DRIVER_CLAIMS` text.

Generic route:

```text
https://www.sonartra.com/app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Result:

- browser lands on `/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`
- network shows `GET /app/results/7caefdbf-ee98-47c7-bd21-33484e1cec48 [307]`
- final canonical request returns `200`
- legacy generic view is not rendered

Console:

- no render errors observed
- Clerk development-key warning only

## 9. Workspace Status

Workspace route:

```text
https://www.sonartra.com/app/workspace
```

Result:

- target card shows `RESULTS READY`
- target CTA is `View Results`
- target CTA points to `/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`
- latest-result card also links to the canonical single-domain result route

## 10. Remaining Issues

The regeneration task is blocked by missing authoritative pair-scoped driver source data.

The current repo source contains four authored `SINGLE_DOMAIN_DRIVERS` rows for `results_process`; the required 24 rows for all six pairs are not present. Loading the four-row source would not satisfy readiness, would not provide exact `process_results` driver text for the live ranking, and would still leave completion in fallback for the requested live driver roles.

The deployed code state for the pair-aware completion resolver was not independently confirmed. The current persisted payload predates `DRIVER_CLAIMS` sourcing and contains only legacy fallback diagnostics.

## 11. Recommended Next Task

Provide or commit the authoritative 24-row Blueprint Leadership `SINGLE_DOMAIN_DRIVERS` source for the six pair keys, then run the approved import/repository path to load it into `DRIVER_CLAIMS`.

After that:

1. confirm 24 persisted rows and six pair keys
2. confirm readiness coverage passes
3. rerun the read-only regeneration simulation
4. confirm all four live driver roles source from `DRIVER_CLAIMS`
5. regenerate the live result through the approved completion path
6. browser-verify canonical route, generic redirect, and workspace status

## Validation Commands

```text
cmd /c npm run db:migrate
cmd /c npx tsx .codex-temp/live-driver-claims-state.ts
cmd /c npx tsx .codex-temp/pair-driver-readonly-check.ts
cmd /c npm run lint
```

Results:

- migration passed
- read-only database state check passed
- read-only simulation passed structurally but used fallback driver text
- lint passed
