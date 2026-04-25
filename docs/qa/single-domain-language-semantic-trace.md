# Single-Domain Language Semantic Trace

Date: 25 April 2026

Target result:
`https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

Target records:

- `result_id`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`
- `attempt_id`: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`
- `assessment_version_id`: `1f1e673d-1c80-4142-ab97-8d8126119dfb`

## Executive Summary

The contradictions are already present in the persisted `canonical_result_payload`. The UI is not inventing the contradictory roles; it is rendering the persisted payload through the single-domain composer and view model.

The root cause is a role-specific language fallback problem in the completion/composer pipeline:

- Some role-specific source fields are blank, especially `chapter_intro_supporting`, `chapter_intro_secondary`, `chapter_intro_underplayed`, and risk/development fields for some signals.
- Completion then falls back to generic fields such as `chapter_how_it_shows_up`.
- Those generic fields currently contain primary-driver wording such as "is the main driver of this pattern".
- The limitation fallback also reuses signal-level risk/development fields that contain underplayed wording even when the signal is primary in this result.
- A coherent pair-specific balancing row for `process_results` exists, but it was rejected by the specificity guard and the generated fallback was used instead.

Recommended fix layer: completion/composer fallback and validation. Do not patch this in the UI. The UI should continue to consume persisted single-domain result payloads only.

## Signal Ranking For The Target Result

The target payload ranks the signals as follows:

| Rank | Signal | Position | Normalised score | Raw score | Rendered role |
| --- | --- | --- | ---: | ---: | --- |
| 1 | `results` | `primary` | 42 | 10 | Primary driver |
| 2 | `process` | `secondary` | 33 | 8 | Secondary driver |
| 3 | `people` | `supporting` | 17 | 4 | Supporting context |
| 4 | `vision` | `underplayed` | 8 | 2 | Range limitation |

The leading pair is persisted as `process_results`, displayed as Process and Results in the shell metadata and Results and Process in pair copy.

## Rendered Contradiction Examples

Live snapshot confirmed these visible examples:

- Secondary driver renders Process, but the prose begins "Process is the main driver of this pattern."
- Supporting context renders People, but the prose begins "People is the main driver of this pattern."
- Range limitation renders Vision, but the prose begins "Vision is the main driver of this pattern."
- Limitation title says "When results needs more vision", but the second limitation paragraph says "Results is the weaker range in this result."
- Limitation then renders "Vision: Vision is the main driver of this pattern."

These exact semantics are already present in the persisted payload fields used by the composer.

## Source Trace Table

| Rendered section | Rendered role | Signal key | Payload field | View-model field | Composer/completion path | Source table/dataset | Fallback used? | Valid for rendered role? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Drivers | Primary driver | `results` | `signals[results].chapter_intro` | `section.focusItems[label="Primary driver"].content` | `buildSingleDomainResultComposerInput` -> `getSignalDriverRole(primary_driver)` -> `getSignalDriverClaimText(chapter_intro)` | `assessment_version_single_domain_signal_chapters`, mapped from `SINGLE_DOMAIN_DRIVERS` | Yes. `chapter_intro_primary` was blank, so completion selected `chapter_how_it_shows_up`, which contains Results strength copy from secondary/imported material. | Mostly valid for primary. It says Results strengthens the pattern rather than "main driver", but does not contradict the rank. |
| Drivers | Secondary driver | `process` | `signals[process].chapter_intro` | `section.focusItems[label="Secondary driver"].content` | `getSignalDriverRole(secondary_driver)` -> `getSignalDriverClaimText(chapter_intro)` | `assessment_version_single_domain_signal_chapters` | Yes. `chapter_intro_secondary` was blank, so completion selected `chapter_how_it_shows_up`, which contains primary-driver wording. | Not valid. Secondary driver should not say "main driver". |
| Drivers | Supporting context | `people` | `signals[people].chapter_intro` | `section.focusItems[label="Supporting context"].content` | `getSignalDriverRole(supporting_context)` -> `getSignalDriverClaimText(chapter_intro)` | `assessment_version_single_domain_signal_chapters` | Yes. `chapter_intro_supporting` was blank, so completion selected `chapter_how_it_shows_up`, which contains primary-driver wording. | Not valid. Supporting context should not say "main driver". |
| Drivers | Range limitation | `vision` | `signals[vision].chapter_risk_impact`, then `chapter_development`, then `chapter_intro` | `section.focusItems[label="Range limitation"].content` | `getSignalDriverRole(range_limitation)` -> `getSignalDriverClaimText(chapter_risk_impact || chapter_development || chapter_intro)` | `assessment_version_single_domain_signal_chapters` | Yes. `chapter_intro_underplayed`, `chapter_risk_impact`, and `chapter_development` were blank in source. Completion fell through to `chapter_how_it_shows_up`; persisted risk/development then carried primary-driver wording. | Not valid. Range limitation should not say "main driver". |
| Limitation | Pattern cost | `results` + `vision` | `balancing.current_pattern_paragraph` | `section.paragraphs[1]` | `toBalancingFallback.current_pattern_paragraph` -> composer `limitation.pattern_cost` | Fallback, not imported balancing row | Yes. Pair-specific balancing row was not used. | Valid enough as fallback structure. It says Results dominates without Vision. |
| Limitation | Range narrowing | `results` | `balancing.practical_meaning_paragraph` | `section.paragraphs[2]` | `toBalancingFallback.primaryLimitation` selected `primary.chapter_risk_impact` | Source `results.chapter_risk_impact` from `assessment_version_single_domain_signal_chapters` | Yes. Imported pair row was bypassed, then fallback used Results risk copy. | Not valid. Results is primary, but the copied risk text says Results is weaker. |
| Limitation | Weaker signal link | `vision` | `balancing.system_risk_paragraph` and `balancing.rebalance_intro` | `section.paragraphs[3]`, prefixed with `weaker_signal_key` | `toBalancingFallback.weakerTension` selected `weaker.chapter_risk_impact || chapter_development || chapter_intro` | Source `vision` signal fields from `assessment_version_single_domain_signal_chapters` | Yes. Imported pair row was bypassed; Vision underplayed fields were blank, so persisted fallback text came from primary-driver wording. | Not valid. Vision is underplayed here, but the text says Vision is the main driver. |

## Root Cause Assessment

The issue is not the React layout, the reading rail, or the report shell. The issue is the semantic role mapping and fallback path that populates the persisted payload.

The important pipeline is:

1. `lib/server/single-domain-completion.ts` ranks signals and assigns positions using `getSignalPosition`.
2. `buildSignalChapterPayload` persists role-specific signal text into `canonical_result_payload.signals`.
3. `getPositionLabel` selects role-specific intro text, but falls back to generic chapter fields when the role-specific field is empty.
4. `toBalancingFallback` builds limitation text from primary and weaker signal chapter fields if no usable pair-specific balancing row is accepted.
5. `lib/assessment-language/single-domain-composer.ts` converts the persisted payload into the report sections.
6. `lib/server/single-domain-results-view-model.ts` cleans formatting only.
7. `components/results/single-domain-result-section.tsx` renders the composed sections.

The canonical payload therefore introduces the contradiction before the UI renders it.

## Why Supporting Context Says Main Driver

For `people`:

- The imported `chapter_intro_supporting` source field is blank.
- Completion falls back to `chapter_how_it_shows_up`.
- `chapter_how_it_shows_up` contains "People is the main driver of this pattern."
- The composer correctly assigns People to `supporting_context` because it is rank 3.
- The UI correctly renders that content under Supporting context.

So the role label is correct, but the persisted paragraph selected for that role is semantically wrong.

## Why Range Limitation Says Main Driver

For `vision`:

- The imported `chapter_intro_underplayed`, `chapter_risk_impact`, and `chapter_development` fields are blank.
- Completion falls back through generic fields and persists the primary-style Vision text into risk/development-related payload fields.
- The composer correctly assigns Vision to `range_limitation` because it is rank 4 and `position = underplayed`.
- The range-limitation claim then uses `chapter_risk_impact || chapter_development || chapter_intro`, which now contains "Vision is the main driver of this pattern."

Again, the rendered role is correct; the selected text is not valid for that role.

## Why Results Is Described As Weaker

The `process_results` balancing source row exists and is coherent. It says the missing range is People, and it avoids calling Results weaker.

However, the completion specificity guard requires pair text to reference both pair signals or the pair key. The existing `process_results` balancing row speaks about structure, outcomes, and People, but does not satisfy that exact token check strongly enough. It is therefore rejected, and `toBalancingFallback` is used.

That fallback sets:

- `primary = results`
- `weaker = vision` because Vision is the lowest-ranked underplayed signal
- `practical_meaning_paragraph = primary.chapter_risk_impact`

The Results risk-impact source text says "Results is the weaker range in this result." That is valid underplayed Results language, but invalid when Results is rank 1 primary. The fallback reuses it in the limitation chapter and creates the contradiction.

## Whether Language Import Is At Fault

Partly, but not as a simple "the imported paragraphs are contradictory" issue.

The imported rows contain role-specific gaps:

- `people.chapter_intro_supporting` is blank.
- `process.chapter_intro_secondary` is blank.
- `vision.chapter_intro_underplayed`, `vision.chapter_risk_impact`, and `vision.chapter_development` are blank.
- `results.chapter_intro_primary` is blank.

The imported rows also store role-specific wording in generic signal fields:

- `chapter_how_it_shows_up` can contain primary-driver language.
- `chapter_risk_impact` can contain underplayed/weaker-range language.

Those rows may be coherent in isolation if each field is only used for the intended role. The defect appears when completion and fallback logic use those fields across roles without semantic guards.

## Whether Composer, Fallback, View Model, Or UI Is At Fault

| Layer | Assessment |
| --- | --- |
| Imported language | Incomplete role-specific coverage and generic fields carrying role-specific wording. This creates the conditions for the defect. |
| Import mapper | Contributes by mapping primary/underplayed claims into generic legacy fields such as `chapter_how_it_shows_up`, `chapter_risk_impact`, and `chapter_development`. |
| Completion | Primary fault. `getPositionLabel` and `buildSignalChapterPayload` allow cross-role fallbacks that persist semantically invalid text. |
| Balancing fallback | Primary fault. `toBalancingFallback` reuses primary signal risk text even when the risk text says the primary signal is weaker. |
| Pair-specific row guard | Contributing fault. A coherent `process_results` balancing row exists but is rejected, which forces fallback. |
| Composer | Mostly faithful. It maps persisted roles to report sections correctly, but it trusts payload fields and does not validate role semantics. |
| View model | Not at fault. It formats and cleans text; it does not choose the semantics. |
| UI rendering | Not at fault. It renders the composed role groups and persisted text. |

## Recommended Fix Layer

Fix this before or during result generation, not in the UI.

Recommended implementation direction:

1. Tighten completion fallback rules so a role-specific output cannot fall back to text with an incompatible semantic role.
2. Add semantic validation for role phrases during single-domain completion:
   - supporting/secondary/range limitation must not contain "main driver" unless explicitly allowed.
   - primary/secondary/supporting text must not contain "weaker range".
   - primary signal limitation fallback must not use underplayed wording for that same signal.
3. Improve `toBalancingFallback` so it does not copy `primary.chapter_risk_impact` when that text declares the primary signal weaker.
4. Review `getSpecificBalancingRow` so coherent pair-owned limitation rows are not rejected merely because they discuss the missing range rather than both pair signals literally.
5. Add tests using the target ranking shape:
   - Results primary
   - Process secondary
   - People supporting
   - Vision underplayed
6. Regenerate the target result through the approved completion/regeneration path after the fallback fix.

Do not fix this by replacing strings in `components/results/*`. That would create UI-side semantic correction and weaken the single-payload contract.

## Proposed Next Implementation Task

Implement a single-domain completion semantic fallback hardening pass:

- Add role-compatible text selection helpers in `lib/server/single-domain-completion.ts`.
- Prevent `getPositionLabel` from selecting primary-driver text for secondary/supporting/underplayed roles.
- Prevent `toBalancingFallback` from using "weaker range" text for a primary signal.
- Adjust pair-specific balancing row acceptance so pair rows can validly identify a third missing range.
- Add targeted tests for the Blueprint Leadership target ranking and the `process_results` balancing row.
- Regenerate `result_id = 7caefdbf-ee98-47c7-bd21-33484e1cec48` only after the fix is deployed.

## Validation Notes

- Live route snapshot was inspected at `1440 x 1100`; the rendered contradictions match the payload.
- Read-only database inspection confirmed the contradictions are persisted in `canonical_result_payload`.
- Read-only database inspection confirmed the source `process_results` balancing row exists and is coherent, but the persisted payload used fallback limitation text instead.
- No code inspection helpers were added.
- `npm run lint` was not run because this task created documentation only and did not change runtime code.
