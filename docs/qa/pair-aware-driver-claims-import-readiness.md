# Pair-Aware Driver Claims Import And Readiness

Date: 26 April 2026

## 1. Summary Of Import Routing Changes

`SINGLE_DOMAIN_DRIVERS` section-native imports now map to `DRIVER_CLAIMS`.

The import mapper preserves the authored pair-scoped row shape:

```text
domain_key
pair_key
signal_key
driver_role
claim_type
claim_text
materiality
priority
```

Rows are no longer collapsed into signal-scoped `SIGNAL_CHAPTERS` fields during the section-native drivers import.

`SIGNAL_CHAPTERS` remains available for legacy signal-level language and compatibility fallback. No completion lookup or result payload construction was changed in this task.

## 2. Readiness Coverage Rules Added

Runtime/admin readiness now expects pair-scoped driver claim coverage:

```text
expected rows = derived pair count * 4 driver roles
```

Each expected pair should have exactly one row for:

- `primary_driver`
- `secondary_driver`
- `supporting_context`
- `range_limitation`

Readiness also checks:

- `domain_key` matches the single authored domain.
- `pair_key` resolves against the signal-derived pair set.
- `signal_key` resolves against the authored signal set.
- `driver_role`, `claim_type`, and `materiality` preserve the required mapping.

For this compatibility task, driver-claim coverage findings are warnings, not blocking failures. Blocking runtime failures still block readiness.

## 3. Admin Preview Behaviour

The single-domain composer preview now reads driver rows from `DRIVER_CLAIMS` for the selected pair when pair-scoped claims exist.

If the selected pair has no `DRIVER_CLAIMS`, preview falls back to the legacy `SIGNAL_CHAPTERS` adapter so older drafts can still be reviewed during rollout.

## 4. Files Changed

- `lib/assessment-language/single-domain-import-mappers.ts`
- `lib/assessment-language/single-domain-composer.ts`
- `lib/server/single-domain-runtime-definition.ts`
- `lib/server/single-domain-draft-readiness.ts`
- `lib/types/single-domain-runtime.ts`
- `tests/single-domain-import-parsers.test.ts`
- `tests/single-domain-composer.test.ts`
- `tests/single-domain-runtime-definition.test.ts`

## 5. Tests Added

Added or extended tests for:

- `SINGLE_DOMAIN_DRIVERS` mapping to `DRIVER_CLAIMS`.
- Preservation of `pair_key`.
- 24 Blueprint-style driver rows staying as 24 pair-scoped rows.
- No collapse into four signal-scoped rows for the driver dataset.
- Complete pair-role driver coverage passing readiness.
- Missing pair-role coverage producing a warning.
- Invalid driver `pair_key` and `signal_key` producing warnings.
- Invalid role/claim/materiality mapping producing a warning.
- Admin preview preferring `DRIVER_CLAIMS` over legacy `SIGNAL_CHAPTERS`.
- Existing repository and parser coverage for `DRIVER_CLAIMS` and `SIGNAL_CHAPTERS` compatibility.

## 6. Validation Results

Focused tests:

```text
cmd /c node --test -r tsx tests/single-domain-import-parsers.test.ts tests/single-domain-composer.test.ts tests/single-domain-runtime-definition.test.ts tests/admin-single-domain-language-import.test.ts tests/assessment-version-single-domain-language-repository.test.ts
```

Result: passed, 36/36 tests.

Note: the first sandboxed focused test run hit the known `spawn EPERM` environment restriction. The same command passed when rerun outside the sandbox.

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

## 7. What Remains For Task 4

Task 4 should update completion to resolve driver language by exact key:

```text
pair_key + signal_key + driver_role
```

Completion should prefer `DRIVER_CLAIMS`, emit compatibility diagnostics when it falls back to `SIGNAL_CHAPTERS`, and keep the result payload shape stable.

## 8. Compatibility Risks

Older single-domain drafts may have `SIGNAL_CHAPTERS` but no `DRIVER_CLAIMS`. This task keeps those drafts previewable and readiness-compatible with warnings.

New single-domain imports will populate `DRIVER_CLAIMS`; completion will not use the pair-scoped rows until Task 4.
