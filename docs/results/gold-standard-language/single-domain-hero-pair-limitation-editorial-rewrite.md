# Single-Domain Hero, Pair, And Limitation Editorial Rewrite

## 1. Rows Changed

The following authoring rows were rewritten in full:

| Dataset | Pair rows changed |
| --- | --- |
| `single_domain_hero_pairs.csv` | `results_process`, `results_vision`, `results_people`, `process_vision`, `process_people`, `vision_people` |
| `single_domain_pair_summaries.csv` | `results_process`, `results_vision`, `results_people`, `process_vision`, `process_people`, `vision_people` |
| `single_domain_limitations.csv` | `results_process`, `results_vision`, `results_people`, `process_vision`, `process_people`, `vision_people` |

## 2. Fields Changed

Only editorial prose fields were changed.

Actual current authoring fields:

| Dataset | Fields changed |
| --- | --- |
| `single_domain_hero_pairs.csv` | `pattern_label`, `hero_statement`, `hero_expansion`, `hero_strength` |
| `single_domain_pair_summaries.csv` | `pair_label`, `interaction_claim`, `synergy_claim`, `tension_claim`, `pair_outcome` |
| `single_domain_limitations.csv` | `limitation_label`, `pattern_cost`, `range_narrowing`, `weaker_signal_link` |

Important mapping note:

- The current authoring CSVs use the section-first schema above.
- The import mapper in [single-domain-import-mappers.ts](/C:/Projects/sonartra-build/Sonartra/lib/assessment-language/single-domain-import-mappers.ts:43) translates those fields into the persisted runtime fields described in the source map, including `hero_headline`, `hero_opening`, `hero_strength_paragraph`, `pair_headline`, `pair_opening_paragraph`, `balancing_section_title`, and related payload fields.
- No structural key names were changed to match the older field names in the task brief.

## 3. Editorial Principles Applied

- Behavioural wording over type labels or identity labels.
- Clear operating stance for each pair instead of generic praise.
- Strength and tension both present in each section.
- Practical trade-offs instead of coaching language.
- Probabilistic phrasing such as `likely`, `tends to`, and `can`.
- Concise paragraphs with less repeated explanation.
- British English and plain operational language.

## 4. Key Before/After Examples

Hero, `results_process`:

- Before: `Your leadership is strongest when direction needs to become a disciplined system of delivery.`
- After: `You are likely to lead by turning pressure for progress into a more structured route for delivery.`
- Change: less static, more behavioural, and more clearly tied to an operating stance.

Pair, `results_process`:

- Before: `The Results and Process pairing creates a leadership pattern centred on disciplined delivery.`
- After: `Together Results and Process create a pattern that pushes work towards visible completion without leaving the route to chance.`
- Change: explains interaction directly rather than naming the pair and then describing it abstractly.

Limitation, `results_process`:

- Before: `The cost of this pattern is not a lack of ambition or discipline.`
- After: `The cost appears when progress and control become the clearest test of leadership.`
- Change: more candid and specific, with less defensive framing.

## 5. Structural Fields Preserved

The following were preserved exactly:

- `domain_key`
- `section_key`
- `pair_key`
- `weaker_signal_key`
- `authoring_status`
- `notes`
- `ready_for_import`

No scoring, payload, rendering, fallback, or route logic was changed.

## 6. Rows Intentionally Left Unchanged

None.

All current pair rows in the three targeted datasets were rewritten or completed.

## 7. Import And Regeneration Instructions

This task updated the source authoring CSVs only.

Import was not run in this task because there is no repo-local one-shot script that ingests these three CSVs directly into the current draft version. The canonical import path remains the admin single-domain narrative/language import flow backed by:

- [admin-single-domain-narrative-import.ts](/C:/Projects/sonartra-build/Sonartra/lib/server/admin-single-domain-narrative-import.ts:1)
- [admin-single-domain-language-import.ts](/C:/Projects/sonartra-build/Sonartra/lib/server/admin-single-domain-language-import.ts:1)

Result regeneration was also not run in this task. The local QA helper [seed-single-domain-qa-result.ts](/C:/Projects/sonartra-build/Sonartra/scripts/seed-single-domain-qa-result.ts:1) seeds or refreshes a stable QA-owned result route, but it does not import these revised CSV rows by itself.

If import and regeneration are run later, the expected order is:

1. Import the revised Hero, Pair, and Limitation datasets into the target draft assessment version through the approved admin import path.
2. Regenerate the target result through the approved completion path so the persisted payload picks up the new pair-owned language.
3. Re-run browser QA on the regenerated result route.
