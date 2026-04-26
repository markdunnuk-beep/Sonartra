# Pair-Aware Driver Completion Resolution

Date: 26 April 2026

## 1. Summary Of Completion Resolver Changes

Single-domain completion now resolves driver intro copy from pair-scoped `DRIVER_CLAIMS` before using legacy signal chapter language.

The canonical payload shape is unchanged. Pair-scoped claim text is written into the existing signal `chapter_intro` field consumed by the Drivers section.

Scoring, ranking, result routes, report rendering, reading rail behaviour, and UI layout were not changed.

## 2. Driver Claim Resolution Order

For each ranked signal, completion derives:

```text
domain_key + top_pair_key + signal_key + driver_role
```

Role mapping:

- `primary` -> `primary_driver`
- `secondary` -> `secondary_driver`
- `supporting` -> `supporting_context`
- `underplayed` -> `range_limitation`

Resolution order:

1. Exact `DRIVER_CLAIMS` match for `(domain_key, pair_key, signal_key, driver_role)`.
2. Reversed pair-key compatibility match when the stored pair key resolves safely to the runtime pair.
3. Existing semantically guarded `SIGNAL_CHAPTERS` fallback.
4. Deterministic neutral fallback from the existing hardened completion path.

Completion emits:

- `single_domain_driver_claim_source` when `DRIVER_CLAIMS` supplies the driver intro.
- `single_domain_pair_driver_claim_missing` when completion falls back because a pair-scoped driver claim is absent.

Diagnostics are deduplicated.

## 3. Current Assessment Driver-Claim Coverage

Target assessment version:

```text
1f1e673d-1c80-4142-ab97-8d8126119dfb
```

Read-only DB coverage check result:

```text
assessment_version_single_domain_driver_claims does not exist
```

This means the configured target database has not yet had the Task 2 migration applied. Current coverage could not be counted as `0/24` because the table itself is absent.

No driver claims were imported in this task. Import is blocked until the migration exists in the target database and the authoritative 24-row source is available through the approved import/repository path.

## 4. Tests Added

Updated `tests/single-domain-completion.test.ts`.

Added coverage for:

- Exact pair-scoped `DRIVER_CLAIMS` selection for `process_results`.
- Results primary from `process_results + results + primary_driver`.
- Process secondary from `process_results + process + secondary_driver`.
- People supporting from `process_results + people + supporting_context`.
- Vision range limitation from `process_results + vision + range_limitation`.
- No pair-driver fallback warnings when complete claims exist.
- Payload still passes `isSingleDomainResultPayload`.
- Required signal text fields remain non-empty.
- Legacy `SIGNAL_CHAPTERS` compatibility still completes when `DRIVER_CLAIMS` is absent.
- Existing semantic guardrails still prevent contradiction patterns.

Focused validation:

```text
cmd /c node --test -r tsx tests/single-domain-completion.test.ts tests/single-domain-runtime-definition.test.ts tests/single-domain-import-parsers.test.ts tests/assessment-version-single-domain-language-repository.test.ts tests/admin-single-domain-language-import.test.ts
```

Result: passed, 46/46 tests.

The first sandboxed focused-suite attempt hit the known `spawn EPERM` restriction. The same command passed outside the sandbox.

Lint:

```text
cmd /c npm run lint
```

Result: passed.

Build:

```text
cmd /c npm run build
```

Result: passed.

## 5. Regeneration Simulation Result

A read-only regeneration simulation helper was run against the target attempt:

```text
78fd04b9-48f1-451a-b568-db66e8c4ab6e
```

Result:

```text
Blocked before payload simulation: relation "assessment_version_single_domain_driver_claims" does not exist
```

Because runtime loading now includes `DRIVER_CLAIMS`, the target database must have the migration applied before a valid read-only simulation can run.

## 6. Live Regeneration Result

Live regeneration was not performed.

Reason:

- The target database is missing the `assessment_version_single_domain_driver_claims` table.
- Pair-scoped driver claims are therefore not present.
- The code change has not been proven deployed in production from this task.

No canonical result payload was manually edited.

## 7. Browser Validation Result

Full browser validation was not completed because live regeneration was blocked.

Available checks:

- Direct unauthenticated HTTP check for the generic result URL returned `404`.
- Direct unauthenticated HTTP check for the canonical single-domain URL returned `404`.
- Existing DevTools page showed only the known Clerk development-key warning.

Post-regeneration browser checks remain required after deployment, migration, import, and regeneration.

## 8. Remaining Compatibility Risks

Older single-domain versions without `DRIVER_CLAIMS` still complete through the existing legacy fallback path.

The main operational risk is deployment order:

1. Deploy this completion resolver.
2. Apply the Task 2 migration to the target database.
3. Import or repository-load the authoritative 24 pair-scoped driver rows.
4. Run read-only regeneration simulation.
5. Regenerate the target result through the approved completion path.
6. Browser-verify the canonical and generic routes.

## 9. Recommended Next Task

Apply the pending driver-claims migration to the target database, load the authoritative 24 Blueprint Leadership `DRIVER_CLAIMS` rows, rerun the read-only regeneration simulation, then regenerate and browser-verify result:

```text
7caefdbf-ee98-47c7-bd21-33484e1cec48
```
