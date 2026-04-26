# Pair-Aware Driver Resolution Architecture

Date: 26 April 2026

## 1. Current vs Target Model

### Current model

The current single-domain result pipeline is engine-first and persists one canonical result payload before retrieval. Retrieval and UI rendering consume that payload only.

Current flow:

1. Authoring/import
   - Section-native narrative import accepts `SINGLE_DOMAIN_DRIVERS` rows with this source shape:
     `domain_key|section_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority`.
   - `lib/assessment-language/single-domain-import-mappers.ts` maps `SINGLE_DOMAIN_DRIVERS` into the legacy `SIGNAL_CHAPTERS` dataset.
   - During that mapping, rows are grouped by `signal_key`; `pair_key` is discarded.

2. Storage
   - The active single-domain language tables are:
     - `assessment_version_single_domain_framing`
     - `assessment_version_single_domain_hero_pairs`
     - `assessment_version_single_domain_signal_chapters`
     - `assessment_version_single_domain_balancing_sections`
     - `assessment_version_single_domain_pair_summaries`
     - `assessment_version_single_domain_application_statements`
   - Driver language lands in `assessment_version_single_domain_signal_chapters`, keyed by `(assessment_version_id, signal_key)`.
   - Driver roles are stored as columns:
     - `chapter_intro_primary`
     - `chapter_intro_secondary`
     - `chapter_intro_supporting`
     - `chapter_intro_underplayed`

3. Runtime loading
   - `lib/server/assessment-version-single-domain-language.ts` loads the six language datasets.
   - `lib/server/single-domain-runtime-definition.ts` attaches those datasets to the runtime definition as `languageBundle`.
   - The runtime language expectation for drivers is still `SIGNAL_CHAPTERS = signalCount`.

4. Completion lookup and payload construction
   - `lib/server/single-domain-completion.ts` scores responses through the shared engine path, ranks signals, derives the top pair, and assigns signal positions:
     - rank 1 -> `primary`
     - rank 2 -> `secondary`
     - lowest signal in a 4-signal set -> `underplayed`
     - all others -> `supporting`
   - `buildSignalChapterPayload` reads a `SignalChaptersRow` by `signal_key`.
   - `getPositionLabel` chooses the role-specific column for the runtime position.
   - Current hardening prevents unsafe semantic fallback and generates deterministic neutral copy when authored role-compatible text is missing.
   - The output is safe, but fallback-generated language is still an approximation when the source contained pair-specific driver meaning.

5. UI consumption
   - `app/(user)/app/results/[resultId]/page.tsx` redirects single-domain results to `/app/results/single-domain/[resultId]`.
   - The single-domain result route reads the persisted payload.
   - `lib/server/single-domain-results-view-model.ts` builds a view model from the payload and formats display labels.
   - `lib/assessment-language/single-domain-composer.ts` adapts the persisted payload into the locked six-section report:
     `intro -> hero -> drivers -> pair -> limitation -> application`.
   - `components/results/single-domain-result-report.tsx` and `components/results/single-domain-result-section.tsx` render the composed report without scoring or semantic recomputation.

### Target model

Driver language should be resolved by the same semantic key used by the source:

```text
pair_key + signal_key + driver_role -> claim_text
```

When authored data exists for that key, completion must use it directly. Role-compatible fallback remains only for old/incomplete assessments or temporary operational safety, not as the normal path.

## 2. Root Problem Summary

The source language is pair-scoped and complete for authored pair scenarios, but current persistence collapses it into signal-scoped storage. That loses the distinction between:

- Results as primary in `process_results`
- Results as secondary in `results_process` source ordering
- Results as supporting context for another pair
- Results as the range limitation for another pair

The current system therefore cannot faithfully answer the intended lookup:

```text
assessment_version_id + domain_key + pair_key + signal_key + driver_role
```

It can only answer:

```text
assessment_version_id + signal_key + role-column
```

That makes pair-specific driver meaning unavailable during completion. The recent guardrail fix avoids contradictory output, but it does not restore authored pair specificity.

## 3. Proposed Architecture

Choose Option B: persist a pair-scoped driver language table.

Add a first-class dataset/table for single-domain driver claims:

```text
assessment_version_single_domain_driver_claims
```

This table becomes the canonical runtime source for driver-section claim text. `assessment_version_single_domain_signal_chapters` remains as a legacy compatibility dataset for older imports, signal-level auxiliary text, and transitional fallback only.

The completion path should load pair-scoped driver claims into the single-domain runtime language bundle and resolve driver text by exact key:

```text
assessment_version_id
domain_key
pair_key
signal_key
driver_role
claim_type
```

Selection rule:

1. Derive `topPairKey` from the top two ranked signals using the current canonical pair-key logic.
2. Assign driver roles from the ranked signal positions.
3. For each ranked signal, resolve claims by `(domainKey, topPairKey, signalKey, driverRole)`.
4. Sort multiple matching rows by `priority`.
5. Join same-key claims deterministically with newline separation.
6. Persist the resolved authored text into the canonical payload.
7. If no pair-scoped claim exists, use transitional fallback only when compatibility mode allows it, and emit diagnostics.

This preserves the single result pipeline: scoring remains unchanged, completion still builds one canonical payload, and the UI continues to render persisted payload data only.

## 4. Data Model

Canonical driver language structure:

```text
assessment_version_id UUID NOT NULL
domain_key TEXT NOT NULL
pair_key TEXT NOT NULL
signal_key TEXT NOT NULL
driver_role TEXT NOT NULL
claim_type TEXT NOT NULL
claim_text TEXT NOT NULL
materiality TEXT NOT NULL
priority INTEGER NOT NULL
```

Recommended database table:

```sql
CREATE TABLE assessment_version_single_domain_driver_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL,
  pair_key TEXT NOT NULL,
  signal_key TEXT NOT NULL,
  driver_role TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  materiality TEXT NOT NULL,
  priority INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT avsd_driver_claims_unique_version_pair_signal_role_priority
    UNIQUE (assessment_version_id, domain_key, pair_key, signal_key, driver_role, priority),
  CONSTRAINT avsd_driver_claims_driver_role_check
    CHECK (driver_role IN ('primary_driver', 'secondary_driver', 'supporting_context', 'range_limitation')),
  CONSTRAINT avsd_driver_claims_claim_type_check
    CHECK (claim_type IN ('driver_primary', 'driver_secondary', 'driver_supporting_context', 'driver_range_limitation')),
  CONSTRAINT avsd_driver_claims_materiality_check
    CHECK (materiality IN ('core', 'supporting', 'material_underplay'))
);

CREATE INDEX avsd_driver_claims_version_pair_signal_role_idx
  ON assessment_version_single_domain_driver_claims (
    assessment_version_id,
    domain_key,
    pair_key,
    signal_key,
    driver_role
  );
```

Validation invariants:

- `primary_driver` requires `claim_type = driver_primary` and `materiality = core`.
- `secondary_driver` requires `claim_type = driver_secondary` and `materiality = core`.
- `supporting_context` requires `claim_type = driver_supporting_context` and `materiality = supporting`.
- `range_limitation` requires `claim_type = driver_range_limitation` and `materiality = material_underplay`.
- `pair_key` must resolve against the current signal-derived pair set.
- `signal_key` must resolve against the current authored signal set.
- `domain_key` must match the single authored domain.

Expected row count for strict published readiness:

```text
derivedPairCount * requiredDriverClaimsPerPair
```

For the current four-signal Blueprint Leadership shape:

```text
6 pairs * 4 driver roles = 24 rows
```

This assumes each pair provides exactly the four runtime-needed driver claims: primary, secondary, supporting, and range limitation. Validation should reject duplicate role rows for the same pair unless the duplicate differs only by `priority` and is intentionally joined.

## 5. Option Comparison

### Option A: Runtime query from source rows

Runtime completion would query the section-native source rows directly, without creating a new canonical table.

Pros:

- Fastest to implement if source rows already exist in a table.
- Preserves pair specificity.
- Avoids a migration for derived storage.

Cons:

- There is no current persisted section-native source table for drivers; the source is imported and then collapsed.
- If runtime reads import staging/source blobs, it risks making import artifacts part of the engine runtime.
- It weakens the current database-driven contract unless the source rows are promoted to a real runtime table.

Decision: reject. It solves the lookup shape only by making a non-canonical source path part of completion.

### Option B: Persist pair-scoped table

Persist driver claims in a first-class runtime table keyed by pair, signal, and role.

Pros:

- Matches the authored source contract exactly.
- Keeps runtime database-driven and deterministic.
- Makes readiness validation explicit.
- Avoids UI-side correction and avoids semantic approximation when authored data exists.
- Cleanly separates pair-scoped driver language from legacy signal chapter language.

Cons:

- Requires a migration, repository changes, import changes, runtime-definition changes, and tests.
- Existing assessments need compatibility handling until their driver rows are reimported or backfilled.

Decision: choose this option.

### Option C: Hybrid derived mapping at completion

Completion would derive an in-memory pair-aware map from existing `SIGNAL_CHAPTERS`, pair summaries, balancing rows, or imported legacy columns.

Pros:

- No immediate schema change.
- Can reduce some fallback use.
- Lower deployment risk than a new table.

Cons:

- It cannot recover pair-specific meaning already discarded by import.
- It formalises inference as runtime behaviour.
- It keeps the root problem hidden behind mapping logic.
- It risks another semantic approximation layer inside completion.

Decision: reject as the target architecture. It may be acceptable only as a temporary compatibility adapter for old rows.

## 6. Completion Logic

Completion should resolve driver claims as follows:

1. Load runtime definition and language bundle.
   - Add `DRIVER_CLAIMS` to the single-domain language bundle.
   - Keep loading `SIGNAL_CHAPTERS` for compatibility and any non-driver signal chapter fields still needed.

2. Score and rank through the existing engine.
   - No scoring, normalisation, option weighting, or rank assignment changes.

3. Derive pair and roles.
   - `topPairKey` remains the canonical pair key for rank 1 and rank 2.
   - `primary_driver` maps to rank 1.
   - `secondary_driver` maps to rank 2.
   - `range_limitation` maps to the underplayed/lowest signal.
   - `supporting_context` maps to the remaining supporting signal(s). For a four-signal assessment this is the rank 3 signal.

4. Resolve exact pair-scoped claims.
   - Build a map keyed by:
     `domain_key|pair_key|signal_key|driver_role`.
   - Resolve pair keys through the same canonical/reversed pair-key helper used for hero, pair, and balancing language.
   - Prefer canonical `pair_key`; accept reversed legacy order only during migration, then persist canonical order.
   - Do not choose a row for another pair.
   - Do not choose a row for another signal.
   - Do not choose a row for another role.

5. Persist payload fields.
   - `SingleDomainResultSignal.chapter_intro` should come from the exact driver claim for that signal and role.
   - Driver-focused report text should come from the selected claim text, not from `chapter_how_it_shows_up`.
   - Existing additional signal fields may remain populated from signal chapter rows while the report still needs them, but the Drivers section must be pair-claim-owned.

6. Avoid ambiguity.
   - If zero rows match and strict mode applies, completion should fail before marking the result READY.
   - If zero rows match and compatibility mode applies, use the current safe fallback path and add a diagnostic warning:
     `single_domain_pair_driver_claim_missing: pair_key=<pair>; signal_key=<signal>; driver_role=<role>`.
   - If multiple rows match with distinct priorities, join by ascending `priority`.
   - If multiple rows match with the same priority, fail validation/import rather than choosing arbitrarily.

## 7. Migration Plan

Existing data needs a schema migration and an authoring data migration.

Required migration:

1. Add `assessment_version_single_domain_driver_claims`.
2. Add repository functions:
   - `getSingleDomainDriverClaimRows`
   - `replaceSingleDomainDriverClaimRows`
3. Add `DRIVER_CLAIMS` to the single-domain language dataset keys, row types, schemas, and bundle.
4. Change `SINGLE_DOMAIN_DRIVERS` import mapping so it writes to `DRIVER_CLAIMS`, not `SIGNAL_CHAPTERS`.
5. Keep `SIGNAL_CHAPTERS` import and storage intact for legacy datasets and non-driver signal chapter copy.

Backfill strategy:

- Do not synthesize pair-specific meaning from signal-scoped rows as if it were authored truth.
- For current published Blueprint Leadership, reimport the authoritative 24 pair-scoped source rows into the new table.
- For existing assessments without pair-scoped source rows, leave `DRIVER_CLAIMS` empty and rely on compatibility fallback until they are re-authored.
- Existing persisted results do not need in-place mutation. They continue to render their persisted payloads.
- Any result that should reflect pair-aware language must be regenerated through the approved completion path after the new data is present.

Fallback compatibility:

- Required for existing published assessments and old results during rollout.
- Not required for newly published single-domain versions once strict readiness validation is enabled.
- Publish/review should block a new single-domain version when `DRIVER_CLAIMS` coverage is incomplete for expected pair-role combinations.

## 8. Risks

Builder impact:

- The builder language import UI must expose `DRIVER_CLAIMS` as the canonical driver dataset or route `SINGLE_DOMAIN_DRIVERS` into it.
- Preview must read pair-scoped driver claims for the selected pair instead of rebuilding driver rows from `SIGNAL_CHAPTERS`.
- Visible admin labels must remain section-first and must not leak raw internal dataset names where friendly labels are expected.

Publish workflow:

- Readiness checks need new row-count and key-coverage expectations.
- Draft review must distinguish "legacy signal chapters present" from "pair-aware driver claims complete".
- Published versions should not be allowed to rely on generated neutral fallback when authored pair-specific driver data is expected.

Backward compatibility:

- Old single-domain versions may not have the new table populated.
- Completion must support compatibility fallback for those versions until they are reimported.
- Retrieval should not change old persisted payloads.
- Generic result and single-domain result routes remain unchanged because the payload contract remains canonical.

Test coverage impact:

- Add migration tests for the new table and indexes.
- Add repository tests for loading and replacing driver claims.
- Add import tests proving `SINGLE_DOMAIN_DRIVERS` preserves `pair_key`.
- Add runtime-definition tests for driver-claim key validation and row counts.
- Add completion tests proving exact `pair_key + signal_key + driver_role` selection.
- Add compatibility tests proving old signal-scoped rows still complete safely with warnings.
- Add regression tests for the current target ranking:
  Results primary, Process secondary, People supporting, Vision underplayed, `process_results` top pair.

## 9. Implementation Plan

### Task 2: Schema and repository

- Add migration for `assessment_version_single_domain_driver_claims`.
- Extend `lib/types/single-domain-language.ts` with `DriverClaimsRow`.
- Add `DRIVER_CLAIMS` to dataset keys, columns, validation schemas, dataset metadata, and bundle types.
- Add load/replace functions in `lib/server/assessment-version-single-domain-language.ts`.
- Extend migration and repository tests.

### Task 3: Import, runtime readiness, and admin preview

- Route `SINGLE_DOMAIN_DRIVERS` rows to `DRIVER_CLAIMS`.
- Stop collapsing pair-scoped driver rows into `SIGNAL_CHAPTERS`.
- Preserve legacy `SIGNAL_CHAPTERS` import for old signal-level datasets.
- Extend runtime definition readiness to validate pair, signal, domain, role, materiality, and count coverage.
- Update builder preview to read driver claims for the selected pair.
- Add import and runtime-definition tests.

### Task 4: Completion resolver and result regeneration

- Add a pair-aware driver resolver in `lib/server/single-domain-completion.ts`.
- Resolve each signal's driver claim by exact pair/signal/role before signal-scoped fallback.
- Emit diagnostics for compatibility fallback.
- Keep payload shape stable so UI and read-model consumers do not change.
- Add completion regression tests for exact pair-aware selection and legacy fallback.
- Reimport the authoritative 24 Blueprint Leadership driver rows.
- Regenerate affected target results through the approved completion path after deployment.

## Final Decision

Use Option B: persist pair-scoped driver claims as first-class runtime language.

This is the only option that preserves authored meaning, keeps completion deterministic, avoids UI-side correction, and removes the need for semantic approximation when authored pair-specific driver data exists.
