# Live Blueprint Language/Review Readiness Diagnosis

Date: 2026-04-28
Assessment key: `sonartra-blueprint-leadership`

## Scope

This investigation traces why the admin stepper can show:

- Language: `IN PROGRESS`
- Review: `IN PROGRESS`

while visible sections appear complete.

## Important environment finding

The local task environment has no `DATABASE_URL` configured, so this run cannot execute a direct live read of the draft rows from the production database.

Observed command:

```bash
printenv | rg '^DATABASE_URL|^POSTGRES|^PG'
```

Result: no matching variables.

## Contract-level findings

### 1) Why `singleDomainLanguageValidation.overallReady` can be false

`overallReady` is computed as `datasets.every((dataset) => dataset.isReady)`.

For the single-domain builder this means one or more datasets failed strict row-count gates:

- `DOMAIN_FRAMING`: at least 1
- `HERO_PAIRS`: exactly expected pair count
- `DRIVER_CLAIMS`: exactly expected pairs × 4 roles
- `SIGNAL_CHAPTERS`: exactly signal count
- `BALANCING_SECTIONS`: exactly expected pair count
- `PAIR_SUMMARIES`: exactly expected pair count
- `APPLICATION_STATEMENTS`: exactly signal count

So if Drivers is now `24/24` and still false, the remaining blocker must be another dataset count mismatch.

### 2) Why `draftValidation.isPublishReady` can be false

`draftValidation` in single-domain mode is sourced from runtime readiness (`getSingleDomainDraftReadiness`) and is publish-ready only if there are no blocking runtime issues.

Runtime language checks are NOT identical to admin language checks:

- blocking if:
  - `DOMAIN_FRAMING < 1`
  - `SIGNAL_CHAPTERS !== signalCount`
  - `APPLICATION_STATEMENTS !== signalCount`
  - key mismatches for framing/signal chapters/application and invalid pair keys in hero/balancing/pair summaries
- warning (non-blocking) if:
  - `DRIVER_CLAIMS` count mismatch
  - `DRIVER_CLAIMS` key/coverage/role-mapping mismatches

Therefore, `draftValidation.isPublishReady === false` with Drivers fixed strongly points to a blocking non-driver issue, most likely `APPLICATION_STATEMENTS` or `SIGNAL_CHAPTERS` count/key mismatch.

### 3) APPLICATION contract status

- Admin structural validation expects `APPLICATION_STATEMENTS` to be signal-scoped (`expectedRowCount = signalCount`).
- Runtime readiness expects the same (`APPLICATION_STATEMENTS = signalCount`).
- Runtime completion resolves application text by `signal_key` map and does not use `pair_key`.

Conclusion: runtime APPLICATION is signal-scoped (4 rows for 4 signals), not pair-scoped (6 pair rows).

### 4) Why audit can report missing APPLICATION rows

The audit script reads authoring CSV (`single_domain_application.csv`) and checks pair presence per canonical pair key.

This is a different contract layer than persisted runtime `APPLICATION_STATEMENTS` rows.

So the audit can report pair gaps while runtime/admin still legitimately operate on 4 signal-scoped rows.

### 5) Pair-key, fallback, and UI substitution checks

- Completion only accepts canonical (non-reversed) pair rows into runtime pair maps.
- Reversed pair rows are intentionally excluded by `createPairLanguageMap`.
- No UI-side score/language substitution path was found for these readiness gates; readiness is computed server-side.

## Net diagnosis

Given this code path, the stuck state requires at least one unresolved blocking condition outside Drivers.

Most probable blockers:

1. `APPLICATION_STATEMENTS` persisted count not equal to signal count OR unresolved `signal_key` values.
2. `SIGNAL_CHAPTERS` persisted count not equal to signal count OR unresolved keys.
3. `DOMAIN_FRAMING` missing.

If Drivers alone was remediated to 24/24, that is not sufficient to clear `overallReady` or `isPublishReady` when another dataset still fails.

## Minimal fix recommendation

1. Query and log the persisted runtime language row counts for draft `assessment_version_id`:
   - `DOMAIN_FRAMING`
   - `HERO_PAIRS`
   - `DRIVER_CLAIMS`
   - `SIGNAL_CHAPTERS`
   - `BALANCING_SECTIONS`
   - `PAIR_SUMMARIES`
   - `APPLICATION_STATEMENTS`
2. Compare against runtime expectations (`signalCount`, `expectedPairCount`).
3. If mismatch is in `APPLICATION_STATEMENTS`, repair only the signal-scoped rows (one per signal key) and leave runtime logic unchanged.
4. Keep audit script as authoring quality check, but do not treat its pair-scoped APPLICATION rule as runtime readiness rule.

