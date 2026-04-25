# Single-Domain Drivers Import Completeness Audit

Date: 25 April 2026

Target assessment:

- Assessment: Blueprint - Understand how you lead
- `assessment_version_id`: `1f1e673d-1c80-4142-ab97-8d8126119dfb`

Target result:

- `result_id`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`
- `attempt_id`: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`

## Executive Summary

The semantic contradictions were not caused by a simple builder persistence failure where populated template fields were dropped on save. The section-native `SINGLE_DOMAIN_DRIVERS` importer maps present driver rows into the expected legacy-backed database columns.

The root cause is a combination of source coverage, storage shape, and completion fallback:

- The section-native driver template shape is row-based, not column-based. It expects `driver_role` plus `claim_text`, not separate `primary_driver`, `secondary_driver`, `supporting_context`, and `range_limitation` text columns.
- The importer groups driver rows by `signal_key` and persists them into `assessment_version_single_domain_signal_chapters`, which is a per-signal storage table with one column per role.
- The current persisted live assessment has only 12 of the possible 16 signal-role cells populated.
- Missing role cells are expected when no source row was imported for that signal-role combination.
- The mapper also copies role-specific text into generic legacy columns such as `chapter_how_it_shows_up`, `chapter_risk_impact`, and `chapter_development`.
- Completion then falls back from blank role-specific fields into those generic columns, which can carry incompatible phrases such as "main driver" or "weaker range".

So the builder/import process persisted the rows it had, but the current import/storage contract is incomplete for arbitrary result rankings. Completion then turns that incompleteness into user-visible contradictions.

## Expected Source Template Structure

The current section-native schema defines `SINGLE_DOMAIN_DRIVERS` with these required fields:

```text
domain_key|section_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority
```

The expected role values are:

- `primary_driver`
- `secondary_driver`
- `supporting_context`
- `range_limitation`

The expected claim-type mapping is:

| `driver_role` | Required `claim_type` | Required `materiality` |
| --- | --- | --- |
| `primary_driver` | `driver_primary` | `core` |
| `secondary_driver` | `driver_secondary` | `core` |
| `supporting_context` | `driver_supporting_context` | `supporting` |
| `range_limitation` | `driver_range_limitation` | `material_underplay` |

There are no template columns named `primary_driver`, `secondary_driver`, `supporting_context`, or `range_limitation`. Those are values in the `driver_role` column.

The checked-in gold-standard CSV at `docs/results/gold-standard-language/authoring-csv/single_domain_drivers.csv` has this shape and contains four driver rows for the `results_process` pair:

| Source pair | Signal | Source role | Claim type | Import status |
| --- | --- | --- | --- | --- |
| `results_process` | `process` | `primary_driver` | `driver_primary` | Complete row |
| `results_process` | `results` | `secondary_driver` | `driver_secondary` | Complete row |
| `results_process` | `vision` | `supporting_context` | `driver_supporting_context` | Complete row |
| `results_process` | `people` | `range_limitation` | `driver_range_limitation` | Complete row |

That source is coherent for a specific authored ranking where Process is primary, Results is secondary, Vision is supporting, and People is the range limitation. It is not a full 4 signals x 4 roles matrix.

## Persisted DB Field Coverage

The live assessment version has these single-domain language tables:

- `assessment_version_single_domain_application_statements`
- `assessment_version_single_domain_balancing_sections`
- `assessment_version_single_domain_framing`
- `assessment_version_single_domain_hero_pairs`
- `assessment_version_single_domain_pair_summaries`
- `assessment_version_single_domain_signal_chapters`

No separate single-domain driver staging table was found. Driver language lands in `assessment_version_single_domain_signal_chapters`.

Persisted row counts for `assessment_version_id = 1f1e673d-1c80-4142-ab97-8d8126119dfb`:

| Table | Row count |
| --- | ---: |
| `assessment_version_single_domain_signal_chapters` | 4 |
| `assessment_version_single_domain_hero_pairs` | 6 |
| `assessment_version_single_domain_pair_summaries` | 6 |
| `assessment_version_single_domain_balancing_sections` | 6 |
| `assessment_version_single_domain_application_statements` | 4 |

Pair-level tables contain all six expected pair keys:

- `process_people`
- `process_results`
- `process_vision`
- `results_people`
- `results_vision`
- `vision_people`

Driver language does not contain pair-key rows after persistence. It contains one row per signal.

## Persisted Driver Role Matrix

| Signal | `chapter_intro_primary` | `chapter_intro_secondary` | `chapter_intro_supporting` | `chapter_intro_underplayed` | Coverage |
| --- | --- | --- | --- | --- | --- |
| `people` | Present | Present | Blank | Present | 3/4 |
| `process` | Present | Blank | Present | Present | 3/4 |
| `results` | Blank | Present | Present | Present | 3/4 |
| `vision` | Present | Present | Present | Blank | 3/4 |

Missing/blank role fields:

- `people.chapter_intro_supporting`
- `process.chapter_intro_secondary`
- `results.chapter_intro_primary`
- `vision.chapter_intro_underplayed`

Additional blank generic fields:

- `vision.chapter_risk_behaviour`
- `vision.chapter_risk_impact`
- `vision.chapter_development`

Those gaps align directly with the contradictions seen in the target result:

- Results is rank 1 but has no primary intro, so completion falls through to secondary/generic Results copy.
- Process is rank 2 but has no secondary intro, so completion falls through to generic Process copy that contains primary-driver wording.
- People is rank 3 but has no supporting intro, so completion falls through to generic People copy that contains primary-driver wording.
- Vision is rank 4/underplayed but has no range-limitation or risk/development copy, so completion falls through to generic Vision copy that contains primary-driver wording.

## Expected vs Actual Mapping Table

| Source template field | Expected DB column | Actual DB value present? | Used by completion? | Notes |
| --- | --- | --- | --- | --- |
| `domain_key` | Not persisted on `signal_chapters`; validated against current domain | Yes, at import validation time | Indirectly | Used to validate the import belongs to `leadership-approach`. |
| `section_key` | Not persisted on `signal_chapters`; must be `drivers` | Yes, at import validation time | No | Section-native parser validates shape before mapping. |
| `pair_key` | Not persisted on `signal_chapters` | No, intentionally discarded in drivers storage | No | This is lossy. Source rows are pair-scoped, but stored rows are signal-scoped. |
| `signal_key` | `assessment_version_single_domain_signal_chapters.signal_key` | Yes for `results`, `process`, `people`, `vision` | Yes | All four signal rows exist. |
| `driver_role = primary_driver` | `chapter_intro_primary` | Present for `people`, `process`, `vision`; blank for `results` | Yes for primary-ranked signals via `getPositionLabel` | Blank Results primary caused fallback for the target result. |
| `driver_role = secondary_driver` | `chapter_intro_secondary` | Present for `people`, `results`, `vision`; blank for `process` | Yes for secondary-ranked signals via `getPositionLabel` | Blank Process secondary caused fallback to primary-style text. |
| `driver_role = supporting_context` | `chapter_intro_supporting` | Present for `process`, `results`, `vision`; blank for `people` | Yes for supporting-ranked signals via `getPositionLabel` | Blank People supporting caused fallback to primary-style text. |
| `driver_role = range_limitation` | `chapter_intro_underplayed` | Present for `people`, `process`, `results`; blank for `vision` | Yes for underplayed-ranked signals via `getPositionLabel` | Blank Vision underplayed caused fallback to primary-style text. |
| `claim_type` | Not separately persisted; controls target role through `driver_role` validation | Validated at import time | No | Import validator enforces role-to-claim mapping. |
| `claim_text` | One of `chapter_intro_primary`, `chapter_intro_secondary`, `chapter_intro_supporting`, `chapter_intro_underplayed` | Yes where a source row exists for the role | Yes | This is the principal driver text. |
| `materiality` | Not separately persisted; influences validity of role row | Validated at import time | No | Import validator enforces `range_limitation -> material_underplay`. |
| `priority` | Used to join multiple same-role claims in mapper; not persisted | Used during mapping only | No | Multiple claims are newline-joined by role. |
| `primary_driver` as a column | No such current source field | Not applicable | Not applicable | The current importer does not support wide role columns. |
| `secondary_driver` as a column | No such current source field | Not applicable | Not applicable | Use `driver_role = secondary_driver` plus `claim_text`. |
| `supporting_context` as a column | No such current source field | Not applicable | Not applicable | Use `driver_role = supporting_context` plus `claim_text`. |
| `range_limitation` as a column | No such current source field | Not applicable | Not applicable | Use `driver_role = range_limitation` plus `claim_text`. |

## Missing/Blank Fields Identified

The persisted driver matrix is incomplete for arbitrary live result rankings:

| Signal | Missing role field | Impact on target result |
| --- | --- | --- |
| `results` | `chapter_intro_primary` | Results is primary in the target result, so completion cannot use primary-specific Results copy. |
| `process` | `chapter_intro_secondary` | Process is secondary in the target result, so completion falls back to text that says Process is the main driver. |
| `people` | `chapter_intro_supporting` | People is supporting in the target result, so completion falls back to text that says People is the main driver. |
| `vision` | `chapter_intro_underplayed`, `chapter_risk_impact`, `chapter_development` | Vision is underplayed in the target result, so completion falls back to text that says Vision is the main driver. |

## Pair Key And Signal Coverage

Pair-level coverage is complete for the live assessment version:

| Dataset | Expected pair coverage | Actual pair coverage |
| --- | --- | --- |
| Hero pairs | 6 pair keys | 6 pair keys present |
| Pair summaries | 6 pair keys | 6 pair keys present |
| Balancing sections | 6 pair keys | 6 pair keys present |

Driver coverage is not pair-key based after import:

| Expected combination type | Actual storage model | Finding |
| --- | --- | --- |
| `pair_key + signal_key + driver_role` source rows | `signal_key` rows with role columns | Pair-specific driver rows are collapsed into signal-wide language. |
| All relevant pair-key plus signal-key combinations | Not stored | Cannot confirm per-pair driver coverage from DB because `pair_key` is discarded. |
| All four signal roles for all four signals | Partially stored | 12/16 signal-role cells are populated. |

## Whether Builder Import Is At Fault

The builder import path is not proven to have dropped populated role fields. The mapper does what the current code says it should do:

- `primary_driver` rows become `chapter_intro_primary`.
- `secondary_driver` rows become `chapter_intro_secondary`.
- `supporting_context` rows become `chapter_intro_supporting`.
- `range_limitation` rows become `chapter_intro_underplayed`.

However, the current import/storage design is a contributing fault because it is lossy:

- It accepts pair-scoped driver rows.
- It stores them as signal-scoped rows.
- It discards `pair_key` for driver language.
- It allows missing role coverage for a signal to persist as blank role columns.
- It copies role-specific text into generic legacy columns, which later become dangerous fallbacks.

So the builder/import did not fail at basic persistence, but it does not provide a complete role matrix or preserve pair context for drivers.

## Whether Completion Reading/Fallback Is At Fault

Yes. Completion is the layer that turns incomplete role coverage into contradictions.

`getPositionLabel` reads the correct role-specific column first, but if it is blank it falls back to generic legacy fields. Those generic fields may contain incompatible role language because the importer populated them from whichever role existed for that signal.

Examples:

- `process.chapter_intro_secondary` is blank, so secondary Process falls back to `chapter_how_it_shows_up`, which contains "Process is the main driver".
- `people.chapter_intro_supporting` is blank, so supporting People falls back to `chapter_how_it_shows_up`, which contains "People is the main driver".
- `vision.chapter_intro_underplayed` and Vision risk/development fields are blank, so underplayed Vision falls back to `chapter_how_it_shows_up`, which contains "Vision is the main driver".

The limitation contradiction has an additional completion fault:

- The valid `process_results` balancing row exists in `assessment_version_single_domain_balancing_sections`.
- It was not used in the target payload.
- Completion fell back to `toBalancingFallback`.
- That fallback used `results.chapter_risk_impact` as the practical limitation paragraph.
- `results.chapter_risk_impact` says Results is the weaker range, even though Results is primary in the target result.

## Root Cause Classification

| Possible cause | Classification | Evidence |
| --- | --- | --- |
| Source template missing fields | Yes, for arbitrary rankings | The section-native source shape supplies rows for authored roles, not every role for every signal. The checked-in gold-standard driver source is four rows for one target pair. |
| Importer failed to map fields | No direct evidence | Populated role rows map to the expected legacy columns. |
| Importer mapped fields into wrong DB columns | Partly | Role columns are correct, but generic legacy columns are populated from role-specific text and later misused. |
| Builder stored fields correctly but completion reads wrong fields | Partly | Completion reads the intended role column first, but then falls back to generic columns with incompatible semantics. |
| Completion fallback incorrectly ignores available fields | Yes | When a role-specific field is blank, fallback can select a semantically incompatible generic field instead of failing or selecting role-compatible text. |
| Pair-specific row guard incorrectly rejected available valid row | Yes | The coherent `process_results` balancing row exists but the persisted target payload used generated fallback limitation text. |

## Recommended Fix Layer

Fix this at the import contract and completion layer, not in the report UI.

Recommended order:

1. Decide whether drivers are genuinely pair-scoped or signal-role scoped.
2. If pair-scoped, add pair-preserving storage or runtime lookup for driver rows instead of collapsing drivers into signal-only `SIGNAL_CHAPTERS`.
3. If signal-role scoped, require a complete 4 x 4 signal-role matrix for Blueprint Leadership before the assessment can be published.
4. Add completion semantic guards so blank role-specific language cannot fall through to incompatible generic text.
5. Stop using role-specific text as generic fallback without tagging its semantic role.
6. Fix the balancing row specificity guard so valid pair-level limitation rows can name a third missing range without being rejected.
7. Regenerate the target result only after the contract/fallback fix is deployed.

## Proposed Next Codex Task

Implement a single-domain driver language contract hardening pass:

- Add a validation rule that identifies missing driver-role coverage for every signal-role combination required by runtime completion.
- Add tests proving that `results`, `process`, `people`, and `vision` cannot fall back to semantically incompatible text for primary, secondary, supporting, or range-limitation positions.
- Update `lib/server/single-domain-completion.ts` to fail closed or select only role-compatible text when role-specific language is blank.
- Review `lib/assessment-language/single-domain-import-mappers.ts` so generic legacy fields are not populated with semantically role-specific prose unless that role is also stored.
- Adjust pair-specific balancing row acceptance so `process_results` uses the imported pair-owned limitation row.
- Regenerate `result_id = 7caefdbf-ee98-47c7-bd21-33484e1cec48` through the approved completion path after the fix.

## Validation Notes

- Read-only database inspection was performed against `assessment_version_id = 1f1e673d-1c80-4142-ab97-8d8126119dfb`.
- Source template structure was inspected from the section-native schema and checked-in `single_domain_drivers.csv`.
- Import mapper and parser behaviour were inspected in code.
- No runtime code, language rows, payloads, UI, scoring, or importer code were changed.
- `npm run lint` was not run because this task created documentation only and added no helper scripts.
