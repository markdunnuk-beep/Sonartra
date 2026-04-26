# Pair-Aware Driver Claims Schema And Repository

Date: 26 April 2026

## 1. Summary Of Schema Added

Added migration:

`db/migrations/202604260001_pair_scoped_single_domain_driver_claims.sql`

The migration creates `assessment_version_single_domain_driver_claims` with:

- `id`
- `assessment_version_id`
- `domain_key`
- `pair_key`
- `signal_key`
- `driver_role`
- `claim_type`
- `claim_text`
- `materiality`
- `priority`
- `created_at`
- `updated_at`

Constraints added:

- Unique key on `(assessment_version_id, domain_key, pair_key, signal_key, driver_role, priority)`.
- `driver_role` check for `primary_driver`, `secondary_driver`, `supporting_context`, `range_limitation`.
- `claim_type` check for `driver_primary`, `driver_secondary`, `driver_supporting_context`, `driver_range_limitation`.
- `materiality` check for `core`, `supporting`, `material_underplay`.
- Positive priority check.

Lookup index added:

`avsd_driver_claims_version_pair_signal_role_idx`

## 2. Dataset And Type Changes

Added `DriverClaimsRow` in `lib/types/single-domain-language.ts`.

Added `DRIVER_CLAIMS` as a first-class single-domain language dataset while preserving `SIGNAL_CHAPTERS`.

The intended distinction is now explicit:

- `DRIVER_CLAIMS`: pair-scoped driver section claims.
- `SIGNAL_CHAPTERS`: legacy/signal-level chapter language and compatibility data.

Validation now enforces:

- Required fields.
- Exact role to `claim_type` mapping.
- Exact role to `materiality` mapping.
- Positive integer `priority`.
- Non-empty `claim_text`.

## 3. Repository Functions Added

Added repository support in `lib/server/assessment-version-single-domain-language.ts`:

- `getSingleDomainDriverClaimRows`
- `replaceSingleDomainDriverClaimRows`

`getSingleDomainLanguageBundle` now includes `DRIVER_CLAIMS`.

`saveSingleDomainLanguageDataset` now dispatches `DRIVER_CLAIMS` to the new replace function.

Repository ordering is deterministic:

1. `domain_key`
2. `pair_key`
3. `driver_role`
4. `priority`
5. `signal_key`

## 4. Tests Added

Updated targeted tests for:

- `DRIVER_CLAIMS` parser validation.
- Role to `claim_type` validation.
- Role to `materiality` validation.
- Positive integer priority validation.
- Repository load/replace behaviour.
- Deterministic repository ordering.
- Language bundle inclusion.
- Migration table, constraints, and index expectations.
- Migration reconciliation for the new migration.

## 5. Validation Results

Focused tests:

```text
cmd /c node --test -r tsx tests/admin-single-domain-language-import.test.ts tests/assessment-version-single-domain-language-repository.test.ts tests/db-migrations.test.ts
```

Result: passed, 21/21 tests.

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

Note: the first sandboxed focused test run hit the known `spawn EPERM` environment issue. The same command passed when rerun outside the sandbox.

## 6. Intentionally Not Changed

This task did not change:

- Completion lookup.
- Result payload construction.
- UI rendering.
- Report routes.
- Scoring.
- Existing result data.
- Result regeneration.
- Legacy `SIGNAL_CHAPTERS` compatibility.

The new table is available to the system but completion does not yet consume it.

## 7. Recommended Next Task

Task 3: route `SINGLE_DOMAIN_DRIVERS` imports into `DRIVER_CLAIMS`, add runtime readiness coverage checks for pair-scoped driver claims, and update admin preview to read driver claims for the selected pair.
