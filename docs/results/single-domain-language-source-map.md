# Single-Domain Result Language Source Map

## Scope

This document maps the visible language on the single-domain result page back to its source.

Primary rendering path:

1. `lib/server/single-domain-completion.ts`
   - builds the persisted `SingleDomainResultPayload`
2. `lib/server/single-domain-results-view-model.ts`
   - formats display labels and opening summary copy for presentation
3. `lib/assessment-language/single-domain-composer.ts`
   - converts the payload into the six-section composed report
4. `components/results/single-domain-result-report.tsx`
   - renders the opening shell and evidence panel
5. `components/results/single-domain-result-section.tsx`
   - renders the six report sections

Import ownership path:

- Authoring CSVs in `docs/results/gold-standard-language/authoring-csv/*.csv`
- Imported into version-scoped tables via:
  - `lib/server/admin-single-domain-language-import.ts`
  - `lib/server/assessment-version-single-domain-language.ts`
- Loaded into `SingleDomainLanguageBundle`
- Applied during completion in `lib/server/single-domain-completion.ts`

Important distinction:

- The **result page UI does not load import CSVs directly**.
- It renders the **persisted result payload** plus a limited set of **UI-only presentation labels** and **view-model helper strings**.

---

## Section-By-Section Source Map

### Section 1 - Opening / Intro

| Result Section | Visible Text / Pattern | Source Type | Import File / Table | Source Field | Runtime Path | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Opening / Intro | Opening eyebrow `Your leadership pattern` | `ui-only` | none | none | `lib/server/single-domain-results-view-model.ts` -> `createOpeningSummary().eyebrow` -> `components/results/single-domain-result-report.tsx` | Safe UI edit. Not import-driven. |
| Opening / Intro | Opening title pattern `Results-led pattern, reinforced by Process` | `computed` | none | `payload.signals[*].signal_label`, `rank`, `payload.hero.pair_key` indirectly | `createOpeningSummary().title` | Built from rank 1 and rank 2 persisted signals. |
| Opening / Intro | Pair claim / lead paragraph under title | `imported` | `single_domain_pair_summaries.csv` / `assessment_version_single_domain_pair_summaries` | `pair_opening_paragraph` | import -> `single-domain-completion.ts` `toPairSummary()` -> payload `pairSummary.pair_opening_paragraph` -> view model `openingSummary.diagnosis` | If no usable pair row exists, falls back before persistence. |
| Opening / Intro | Opening implication paragraph | `imported` | `single_domain_limitations.csv` / `assessment_version_single_domain_balancing_sections` | `current_pattern_paragraph` | import -> `toBalancing()` -> payload `balancing.current_pattern_paragraph` -> `openingSummary.implication` | If no usable balancing row exists, falls back before persistence. |
| Opening / Intro | Intro scope text | `imported` | `single_domain_intro.csv` / `assessment_version_single_domain_framing` | `meaning_paragraph` | import -> `toIntro()` -> payload `intro.meaning_paragraph` -> composer `sections.intro.domain_scope` -> rendered from `introSection.paragraphs[1]` | Visible in the two-paragraph intro grid. |
| Opening / Intro | Interpretation guidance | `imported` | `single_domain_intro.csv` / `assessment_version_single_domain_framing` | `bridge_to_signals` | import -> payload `intro.bridge_to_signals` -> composer `sections.intro.interpretation_guidance` -> rendered from `introSection.paragraphs[2]` | Visible in the two-paragraph intro grid. |
| Opening / Intro | Blueprint / context note | `imported` | `single_domain_intro.csv` / `assessment_version_single_domain_framing` | `blueprint_context_line` | import -> payload `intro.blueprint_context_line` -> composer `sections.intro.intro_note` | Currently composed, but not rendered in the opening shell because only `introSection.paragraphs.slice(1, 3)` is shown there. |
| Opening / Intro | Evidence panel heading `Why this result was generated` | `ui-only` | none | none | `components/results/single-domain-result-report.tsx` `OpeningEvidencePanel` | Safe UI edit. |
| Opening / Intro | Evidence panel helper line `Built from X/Y completed responses, ordered to match the result headline.` | `computed` | none | `payload.diagnostics.answeredQuestionCount`, `totalQuestionCount` | `createOpeningSummary().evidenceLead` | Built entirely from persisted diagnostics. |
| Opening / Intro | Evidence proof label `Primary signal` | `ui-only` | none | none | `createOpeningSummary().proofItems[].label` | Safe UI edit. |
| Opening / Intro | Evidence proof label `Reinforcing signal` | `ui-only` | none | none | same as above | Safe UI edit. |
| Opening / Intro | Evidence proof label `Supporting signal` | `ui-only` | none | none | same as above | Safe UI edit. |
| Opening / Intro | Evidence proof label `Least available range` | `ui-only` | none | none | same as above | Safe UI edit. |
| Opening / Intro | Evidence proof label `Response base` | `ui-only` | none | none | same as above | Safe UI edit. |
| Opening / Intro | Signal names in proof stack | `computed` | none | `payload.signals[*].signal_label` | `createOpeningSummary()` -> `formatDisplayLabel()` | Uses persisted signal labels with approved display-label formatting. |
| Opening / Intro | Score badge `29%` / `25%` etc. | `computed` | none | `payload.signals[*].normalized_score` | `createOpeningSummary()` `formatScoreLabel()` | `%` is shown only when the four persisted scores sum to `100`; otherwise `Score X`. |
| Opening / Intro | Rank detail `Rank 1 in this completed result.` | `computed` | none | `payload.signals[*].rank` | `createOpeningSummary().proofItems[].detail` | Built from persisted rank only. |
| Opening / Intro | Response base value `24/24 completed responses` | `computed` | none | `payload.diagnostics.answeredQuestionCount`, `totalQuestionCount` | `createOpeningSummary().proofItems[Response base].value` | Built from persisted diagnostics. |
| Opening / Intro | Response base detail `Normal assessment completion, not a preview or imported result.` | `ui-only` | none | none | `createOpeningSummary().proofItems[Response base].detail` | Safe UI edit. |
| Opening / Intro | Evidence list label `Leading pair` | `ui-only` | none | none | `createOpeningSummary().evidenceItems` | Safe UI edit. |
| Opening / Intro | Leading pair value | `computed` | none | rank 1 + rank 2 persisted signal labels, plus `payload.hero.hero_opening` for detail | `createOpeningSummary().evidenceItems[Leading pair].value` | Ordered primary-first for headline alignment. |
| Opening / Intro | Leading pair detail `Shown primary-first to match the headline. ...` | `interpolated` | `single_domain_hero_pairs.csv` / `assessment_version_single_domain_hero_pairs` | `hero_opening` | payload `hero.hero_opening` + optional UI prefix in `createOpeningSummary()` | Prefix is UI-only; body is imported or completion fallback. |
| Opening / Intro | Evidence list label `Signal pattern` | `ui-only` | none | none | `createOpeningSummary().evidenceItems` | Safe UI edit. |
| Opening / Intro | Signal pattern sentence | `computed` | none | persisted rank order + signal labels | `createOpeningSummary().evidenceItems[Signal pattern].value` | Built from persisted signal ordering. |
| Opening / Intro | Signal pattern detail `Ranked from X/Y completed responses.` | `computed` | none | diagnostics counts | same as above | Built from persisted diagnostics. |
| Opening / Intro | Evidence list label `Missing range` | `ui-only` | none | none | `createOpeningSummary().evidenceItems` | Safe UI edit. |
| Opening / Intro | Missing range value `Vision: When results needs more vision` style string | `interpolated` | `single_domain_limitations.csv` / `assessment_version_single_domain_balancing_sections` | `balancing_section_title` plus weakest signal label | payload `balancing.balancing_section_title` + UI weaker-signal prefix in `createOpeningSummary()` | Prefix is computed from weakest signal; title body is imported or fallback. |
| Opening / Intro | Missing range detail `The least available range named by this result.` | `ui-only` | none | none | `createOpeningSummary().evidenceItems` | Safe UI edit. |
| Opening / Intro | Metadata labels `Completed`, `Time`, `Assessment`, `Version`, `Leading pair` | `ui-only` | none | none | `components/results/single-domain-result-report.tsx` `MetadataCard` | Safe UI edit. |
| Opening / Intro | Metadata values | `computed` | none | `payload.metadata.*`, top pair | view model metadata formatting | Date/time are formatted in the view model. |

### Section 2 - Your Style at a Glance

| Result Section | Visible Text / Pattern | Source Type | Import File / Table | Source Field | Runtime Path | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Your Style at a Glance | Section label `Your Style at a Glance` | `ui-only` | none | none | `components/results/single-domain-result-section.tsx` `SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.hero` | Safe UI edit. |
| Your Style at a Glance | Section helper / eyebrow intent | `ui-only` | none | none | `lib/results/single-domain-reading-sections.ts` `intentPrompt` -> `ResultSectionIntent` | Also used by reading rail progress context. |
| Your Style at a Glance | Hero chapter headline | `imported` | `single_domain_hero_pairs.csv` / `assessment_version_single_domain_hero_pairs` | `hero_headline` | import -> `toHero()` -> payload `hero.hero_headline` -> composer `sections.hero.pattern_label` -> rendered as section title | If pair-owned row is missing/unusable, completion fallback builds it. |
| Your Style at a Glance | Pattern statement / summary paragraph | `imported` | `single_domain_hero_pairs.csv` / `assessment_version_single_domain_hero_pairs` | `hero_opening` | payload `hero.hero_opening` -> composer `sections.hero.hero_statement` | If pair row missing/unusable, completion fallback builds it. |
| Your Style at a Glance | Supporting paragraph 1 | `imported` | `single_domain_hero_pairs.csv` / `assessment_version_single_domain_hero_pairs` | `hero_strength_paragraph` | payload `hero.hero_strength_paragraph` -> composer `sections.hero.hero_expansion` | If pair row missing/unusable, completion fallback builds it from signal chapter text. |
| Your Style at a Glance | Supporting paragraph 2 | `imported` | `single_domain_hero_pairs.csv` / `assessment_version_single_domain_hero_pairs` | `hero_tension_paragraph` | payload `hero.hero_tension_paragraph` | If pair row missing/unusable, completion fallback builds it from signal chapter text. |
| Your Style at a Glance | Supporting paragraph 3 | `imported` | `single_domain_hero_pairs.csv` / `assessment_version_single_domain_hero_pairs` | `hero_close_paragraph` | payload `hero.hero_close_paragraph` | Completion fallback adds a hardcoded signal-synthesis sentence if no pair row exists. |
| Your Style at a Glance | Disclosure label `Read supporting context` | `ui-only` | none | none | `components/results/single-domain-result-section.tsx` `ProseWithDisclosure` | Safe UI edit. |

### Section 3 - What Shapes Your Approach

| Result Section | Visible Text / Pattern | Source Type | Import File / Table | Source Field | Runtime Path | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| What Shapes Your Approach | Section label `What Shapes Your Approach` | `ui-only` | none | none | `SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.drivers` | Safe UI edit. |
| What Shapes Your Approach | Section title `What is creating this pattern` | `ui-only` | none | none | `components/results/single-domain-result-section.tsx` | Safe UI edit. |
| What Shapes Your Approach | Section helper / intent | `ui-only` | none | none | `single-domain-reading-sections.ts` | Also used in reading rail config. |
| What Shapes Your Approach | Driver row meta `Main cause` | `ui-only` | none | none | `SignalDriverEntry` inputs in `single-domain-result-section.tsx` | Safe UI edit. |
| What Shapes Your Approach | Driver row meta `Reinforcing cause` | `ui-only` | none | none | same as above | Safe UI edit. |
| What Shapes Your Approach | Driver row meta `Supporting layer` | `ui-only` | none | none | same as above | Safe UI edit. |
| What Shapes Your Approach | Driver row meta `Missing range` | `ui-only` | none | none | same as above | Safe UI edit. |
| What Shapes Your Approach | Driver title `Primary driver` / `Secondary driver` / `Supporting context` / `Range limitation` | `computed` | none | derived from driver role | `composeSingleDomainReport()` -> `buildDriversFocusItems()` | Labels are composer-owned, not import-driven. |
| What Shapes Your Approach | Driver body claim text when pair-aware driver claims exist | `imported` | `DRIVER_CLAIMS` / `assessment_version_single_domain_driver_claims` | `claim_text` | import -> completion `resolvePairScopedDriverClaim()` -> payload `signals[*].chapter_intro` -> composer `drivers.focusItems` | Preferred source for driver intro text by pair + signal + role. |
| What Shapes Your Approach | Driver body claim text when pair-aware driver claims do not exist | `fallback` | `single_domain_drivers_full.csv` legacy row source / `assessment_version_single_domain_signal_chapters` | role-specific intro or generic chapter fields | completion `getPositionLabel()` / `buildSignalChapterPayload()` | Falls back to `SIGNAL_CHAPTERS` / legacy signal chapter language before persistence. |
| What Shapes Your Approach | Disclosure label `Read more about primary driver` etc. | `interpolated` | none | row label only | `ProseWithDisclosure` `disclosureLabel={`Read more about ${position.toLowerCase()}`}` | UI shell built from computed driver label. |

### Section 4 - How Your Style Balances

| Result Section | Visible Text / Pattern | Source Type | Import File / Table | Source Field | Runtime Path | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| How Your Style Balances | Section label `How Your Style Balances` | `ui-only` | none | none | `SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.pair` | Safe UI edit. |
| How Your Style Balances | Section helper / intent | `ui-only` | none | none | `single-domain-reading-sections.ts` | Also used in rail/progress. |
| How Your Style Balances | Pair label / first paragraph | `imported` | `single_domain_pair_summaries.csv` / `assessment_version_single_domain_pair_summaries` | `pair_headline` | payload `pairSummary.pair_headline` -> composer `pair_label` -> first pair paragraph | If no usable pair row exists, completion fallback builds it from signal labels. |
| How Your Style Balances | Interaction claim | `imported` | same as above | `pair_opening_paragraph` | payload `pairSummary.pair_opening_paragraph` -> composer `interaction_claim` | If missing/unusable, completion fallback writes a signal-synthesis paragraph. |
| How Your Style Balances | Synergy claim | `imported` | same as above | `pair_strength_paragraph` | payload `pairSummary.pair_strength_paragraph` -> composer `synergy_claim` | Fallback uses primary signal summary if pair row missing. |
| How Your Style Balances | Tension claim | `imported` | same as above | `pair_tension_paragraph` | payload `pairSummary.pair_tension_paragraph` -> composer `tension_claim` | Fallback uses secondary signal summary if pair row missing. |
| How Your Style Balances | Pair outcome | `imported` | same as above | `pair_close_paragraph` | payload `pairSummary.pair_close_paragraph` -> composer `pair_outcome` | Completion fallback adds hardcoded line `This is a signal-level synthesis...`. |
| How Your Style Balances | Disclosure label `Read pair detail` | `ui-only` | none | none | `components/results/single-domain-result-section.tsx` | Safe UI edit. |

### Section 5 - Where This Can Work Against You

| Result Section | Visible Text / Pattern | Source Type | Import File / Table | Source Field | Runtime Path | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Where This Can Work Against You | Section label `Where This Can Work Against You` | `ui-only` | none | none | `SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.limitation` | Safe UI edit. |
| Where This Can Work Against You | Section helper / intent | `ui-only` | none | none | `single-domain-reading-sections.ts` | Also used in rail/progress. |
| Where This Can Work Against You | Limitation label / first paragraph | `imported` | `single_domain_limitations.csv` / `assessment_version_single_domain_balancing_sections` | `balancing_section_title` | payload `balancing.balancing_section_title` -> composer `limitation_label` | If usable balancing row missing, completion fallback builds `When {primary} needs more {weaker}`. |
| Where This Can Work Against You | Pattern cost | `imported` | same as above | `current_pattern_paragraph` | payload `balancing.current_pattern_paragraph` -> composer `pattern_cost` | If fallback used, completion builds a hardcoded primary-vs-weaker sentence. |
| Where This Can Work Against You | Range narrowing | `imported` | same as above | `practical_meaning_paragraph` | payload `balancing.practical_meaning_paragraph` -> composer `range_narrowing` | If fallback used, completion selects safe primary-signal risk text. |
| Where This Can Work Against You | Weaker signal link text | `interpolated` | same as above | `system_risk_paragraph` and `rebalance_intro` | payload `balancing.system_risk_paragraph`, `rebalance_intro` -> composer creates `{weaker_signal_key}: {weaker_signal_link}` paragraph | Prefix signal key is derived/computed; body is imported or fallback. |
| Where This Can Work Against You | Disclosure label `Read range detail` | `ui-only` | none | none | `components/results/single-domain-result-section.tsx` | Safe UI edit. |

### Section 6 - Putting This Into Practice

| Result Section | Visible Text / Pattern | Source Type | Import File / Table | Source Field | Runtime Path | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Putting This Into Practice | Section label `Putting This Into Practice` | `ui-only` | none | none | `SINGLE_DOMAIN_SECTION_DISPLAY_LABELS.application` | Safe UI edit. |
| Putting This Into Practice | Section title `What to rely on, notice, and develop` | `ui-only` | none | none | `components/results/single-domain-result-section.tsx` | Safe UI edit. |
| Putting This Into Practice | Section helper / intent | `ui-only` | none | none | `single-domain-reading-sections.ts` | Also used in rail/progress. |
| Putting This Into Practice | Grouping labels `Rely on`, `Notice`, `Develop` | `computed` | none directly | derived from focus area | composer `buildApplicationFocusItems()` | These labels are internal rendered group labels before UI remaps them to premium panel titles. |
| Putting This Into Practice | Number badges `01`, `02`, `03` | `computed` | none | index | `ApplicationActionEntry` `String(index + 1).padStart(2, '0')` | Safe UI edit if style/format changes are deliberate. |
| Putting This Into Practice | Panel title `Where to Lean In` | `ui-only` | none | none | `SINGLE_DOMAIN_APPLICATION_META.rely.title` | Safe UI edit. |
| Putting This Into Practice | Panel subtitle `The strengths you can rely on most when it matters.` | `ui-only` | none | none | `SINGLE_DOMAIN_APPLICATION_META.rely.subtitle` | Safe UI edit. |
| Putting This Into Practice | Panel title `Where to Stay Alert` | `ui-only` | none | none | `SINGLE_DOMAIN_APPLICATION_META.notice.title` | Safe UI edit. |
| Putting This Into Practice | Panel subtitle `Early signs to watch so performance doesn't drift.` | `ui-only` | none | none | `SINGLE_DOMAIN_APPLICATION_META.notice.subtitle` | Safe UI edit. |
| Putting This Into Practice | Panel title `Where to Grow` | `ui-only` | none | none | `SINGLE_DOMAIN_APPLICATION_META.develop.title` | Safe UI edit. |
| Putting This Into Practice | Panel subtitle `The next areas to focus on to strengthen your effectiveness.` | `ui-only` | none | none | `SINGLE_DOMAIN_APPLICATION_META.develop.subtitle` | Safe UI edit. |
| Putting This Into Practice | Application body guidance text | `imported` | `single_domain_application.csv` / `assessment_version_single_domain_application_statements` | `strength_statement_1/2`, `watchout_statement_1/2`, `development_statement_1/2` | import -> completion `buildApplicationStatements()` -> payload `application.*[].statement` -> composer `buildApplicationFocusItems()` -> renderer | The UI does not rewrite the body copy. |
| Putting This Into Practice | Rely / Notice / Develop grouping source | `computed` | none | ranked signals + application arrays | completion `buildApplicationStatements()` | Strengths come from top-ranked signals; watchouts combine top/top-2/lowest; development combines lowest/next-lowest/second. Grouping is not authored in CSV. |
| Putting This Into Practice | Disclosure labels `Read more about rely on` etc. | `interpolated` | none | internal group label | `ApplicationActionEntry` `disclosureLabel` | Built from computed group labels, not the UI panel titles. |

---

## Editorial Editing Targets

| Import File / Table | Controls Which Result Copy | Key Fields | Safe To Edit? | Notes |
| --- | --- | --- | --- | --- |
| `single_domain_intro.csv` / `assessment_version_single_domain_framing` | Opening intro scope and interpretation text | `domain_key`, `section_title`, `intro_paragraph`, `meaning_paragraph`, `bridge_to_signals`, `blueprint_context_line` | Yes, for prose fields only | Do not change `domain_key`. `section_title` feeds payload `intro.section_title` but is not the UI section label. |
| `single_domain_hero_pairs.csv` / `assessment_version_single_domain_hero_pairs` | Hero / Section 2 copy and part of opening evidence detail | `pair_key`, `hero_headline`, `hero_subheadline`, `hero_opening`, `hero_strength_paragraph`, `hero_tension_paragraph`, `hero_close_paragraph` | Yes, for prose fields only | `pair_key` must remain exact and runtime-order-safe. Missing/unusable rows trigger completion fallback. |
| `single_domain_drivers.csv` or `single_domain_drivers_full.csv` mapped into `DRIVER_CLAIMS` / `assessment_version_single_domain_driver_claims` | Driver claim body text in Section 3 | `domain_key`, `pair_key`, `signal_key`, `driver_role`, `claim_type`, `claim_text`, `materiality`, `priority` | Yes, for `claim_text` only | Structural keys and enums must remain exact. This is the preferred pair-aware driver source. |
| `SIGNAL_CHAPTERS` / `assessment_version_single_domain_signal_chapters` | Legacy signal chapter language; also completion fallback source for drivers, hero, limitation, and pair text | `signal_key`, role labels, `chapter_intro_*`, `chapter_how_it_shows_up`, `chapter_value_outcome`, `chapter_value_team_effect`, `chapter_risk_behaviour`, `chapter_risk_impact`, `chapter_development` | Yes, carefully | This is not directly rendered by the page, but it feeds persisted payload fields during completion and still powers fallback paths. |
| `single_domain_pair_summaries.csv` / `assessment_version_single_domain_pair_summaries` | Opening diagnosis and Section 4 pair language | `pair_key`, `pair_section_title`, `pair_headline`, `pair_opening_paragraph`, `pair_strength_paragraph`, `pair_tension_paragraph`, `pair_close_paragraph` | Yes, for prose fields only | `pair_key` must remain exact. Missing/unusable rows trigger signal-level fallback text. |
| `single_domain_limitations.csv` / `assessment_version_single_domain_balancing_sections` | Opening implication, opening missing-range title source, and Section 5 limitation text | `pair_key`, `balancing_section_title`, `current_pattern_paragraph`, `practical_meaning_paragraph`, `system_risk_paragraph`, `rebalance_intro`, `rebalance_action_1-3` | Yes, for prose fields only | `pair_key` must remain exact. If required prose is blank, completion fallback builds limitation copy before persistence. |
| `single_domain_application.csv` / `assessment_version_single_domain_application_statements` | Application guidance body text in Section 6 | `signal_key`, `strength_statement_1/2`, `watchout_statement_1/2`, `development_statement_1/2` | Yes, for statement fields only | `signal_key` must remain exact. Grouping into rely/notice/develop is runtime logic, not CSV structure. |
| `DRIVER_CLAIMS` legacy import adapter path | Section-first `single_domain_drivers` import contract maps here | `claim_text` and structural fields above | Yes, for `claim_text` only | The section-first narrative import contract maps `SINGLE_DOMAIN_DRIVERS` to legacy `DRIVER_CLAIMS`. |
| Completion fallback strings in `lib/server/single-domain-completion.ts` | Hero, pair, and limitation fallback text when pair rows are missing/unusable | none | No, not as editorial workflow | These are code-owned fallback sentences, not import-owned copy. |
| View-model / component helper strings | Opening evidence labels, section display labels, application meta labels, rail intent prompts | none | Yes, if UI wording change is intended | These are UI-owned and live outside the import datasets. |

### Structural keys that must not be rewritten

- `domain_key`
- `pair_key`
- `signal_key`
- `section_key`
- `driver_role`
- `claim_type`
- `materiality`
- `focus_area`
- `guidance_type`
- `linked_claim_type`
- `priority`

These are structural/runtime keys, not editorial prose.

---

## UI-Only Copy

| UI-Only Copy | File Where Defined | Safe To Edit? | Risk |
| --- | --- | --- | --- |
| Opening eyebrow `Your leadership pattern` | `lib/server/single-domain-results-view-model.ts` | Yes | Low. Test updates likely needed. |
| Evidence panel heading `Why this result was generated` | `components/results/single-domain-result-report.tsx` | Yes | Low. |
| Evidence labels `Primary signal`, `Reinforcing signal`, `Supporting signal`, `Least available range`, `Response base`, `Leading pair`, `Signal pattern`, `Missing range` | `lib/server/single-domain-results-view-model.ts` | Yes | Low. Tests may assert exact text. |
| Response base detail `Normal assessment completion, not a preview or imported result.` | `lib/server/single-domain-results-view-model.ts` | Yes | Low. |
| Missing range detail `The least available range named by this result.` | `lib/server/single-domain-results-view-model.ts` | Yes | Low. |
| Metadata labels `Completed`, `Time`, `Assessment`, `Version`, `Leading pair` | `components/results/single-domain-result-report.tsx` | Yes | Low. |
| Section labels `Your Style at a Glance`, `What Shapes Your Approach`, `How Your Style Balances`, `Where This Can Work Against You`, `Putting This Into Practice` | `components/results/single-domain-result-section.tsx` and `lib/results/single-domain-reading-sections.ts` | Yes | Medium. Reading rail and tests use these too. |
| Reading rail labels and short labels | `lib/results/single-domain-reading-sections.ts` | Yes | Medium. Keep anchor ids unchanged. |
| Section helper prompts / intent text | `lib/results/single-domain-reading-sections.ts` | Yes | Low. |
| Driver meta labels `Main cause`, `Reinforcing cause`, `Supporting layer`, `Missing range` | `components/results/single-domain-result-section.tsx` | Yes | Low. |
| Section title `What is creating this pattern` | `components/results/single-domain-result-section.tsx` | Yes | Low. |
| Application section title `What to rely on, notice, and develop` | `components/results/single-domain-result-section.tsx` | Yes | Low. |
| Application panel titles and subtitles | `components/results/single-domain-result-section.tsx` `SINGLE_DOMAIN_APPLICATION_META` | Yes | Low. Existing tests already assert these render. |
| Disclosure labels `Read supporting detail`, `Read supporting context`, `Read pair detail`, `Read range detail`, `Read more about ...` | `components/results/single-domain-result-section.tsx` | Yes | Low. |

---

## Computed And Interpolated Copy

| Visible Copy | What Is Computed | What Is Imported | What Can Safely Be Edited | What Should Not Be Edited Manually |
| --- | --- | --- | --- | --- |
| Opening title `X-led pattern, reinforced by Y` | Primary and secondary signal labels by rank | none | Edit only in view-model code if the headline pattern itself should change | Do not edit the rendered title directly in stored results. |
| Score badges `%` vs `Score X` | Uses persisted `normalized_score` and whether the total equals `100` | none | UI badge wording can be edited in the view model | Do not change the score math in UI. |
| Signal pattern sentence | Rank order and signal labels | none | Edit the sentence shell in the view model | Do not alter persisted ranking semantics. |
| Leading pair value | Primary-first signal ordering for display | `hero.hero_opening` only for detail text | UI sentence shell can be edited | Do not change pair-key logic in the UI. |
| Missing range value in evidence panel | Weakest signal label + imported limitation title | `balancing.balancing_section_title` | UI prefix shell can be edited | Do not change weaker-signal selection in UI. |
| Driver disclosure labels | Lower-cased driver labels | none | UI sentence shell can be edited | Do not change the role grouping logic casually. |
| Application number badges | Panel index | none | Display formatting can be edited | Do not repurpose them as data-owned content. |
| Application grouping | Rank-driven selection into strengths/watchouts/development | `APPLICATION_STATEMENTS` row text | UI panel titles/subtitles can be edited | Do not rewrite which signals land in which group without changing completion logic. |
| Limitation weaker-signal paragraph | Computed weaker-signal prefix + imported/fallback body | `system_risk_paragraph` / `rebalance_intro` | Prefix presentation can be edited | Do not manually edit stored results to fix linkage; change source or completion logic instead. |
| Pair / hero / limitation fallback paragraphs | Signal labels and selected signal chapter text | legacy signal chapter fields when pair rows are missing | These are code fallbacks, not editorial assets | Do not treat fallback code strings as normal editorial targets. |

---

## Unknowns And Risks

1. `intro.blueprint_context_line` is imported into the payload and composer, but the current opening shell does not visibly render it.
   - Status: mapped, but not visible in the live result shell.

2. `hero.hero_subheadline` is imported and persisted, but the current section renderer does not display it as a separate visible line.
   - In the section-first adapter path it can also be repurposed into `hero_strength`.
   - Status: persisted field with indirect or no visible use in the final page.

3. `SIGNAL_CHAPTERS` remains a major fallback dependency.
   - Even though the desired section-first import datasets are `single_domain_intro`, `single_domain_hero`, `single_domain_drivers`, `single_domain_pair_summaries`, `single_domain_limitations`, and `single_domain_application`, runtime completion still falls back to `assessment_version_single_domain_signal_chapters` when pair-aware or role-specific content is missing.
   - This means some visible text may still be indirectly controlled by legacy signal chapter rows rather than the newer section-owned CSVs.

4. Hero, pair, and limitation sections still have code-owned fallback prose in `lib/server/single-domain-completion.ts`.
   - These strings are not import-driven.
   - If authors expect every visible sentence to be editable via CSV, that expectation is currently false when fallback paths are active.

5. Driver claim ownership is split between:
   - preferred pair-aware `DRIVER_CLAIMS`
   - legacy `SIGNAL_CHAPTERS` fallback
   - completion-time neutral generation when role-compatible copy is missing
   - This is the highest-risk area for editorial confusion.

6. Application grouping is not author-controlled.
   - CSV authors supply per-signal statements.
   - Runtime logic decides which statements appear under strengths, watchouts, and development focus based on rank.
   - Editors can rewrite the sentence content, but not the grouping rules, via CSV alone.

7. Reading rail labels are UI-only.
   - They are not controlled by the intro/hero/drivers/pair/limitation/application import datasets.
   - Any later editorial program that expects them to be import-driven would require explicit scope expansion.

8. Existing docs and CSV names use two naming layers:
   - section-first import contract names such as `single_domain_intro`
   - legacy storage dataset names such as `DOMAIN_FRAMING`
   - Both are valid, but documentation and editing instructions should name both to avoid confusion.

---

## Practical Editing Guidance

If a non-engineer asks:

- **"Where do I edit this sentence?"**
  - First identify whether it is:
    - a section body sentence in the persisted report
    - a UI-only label
    - a fallback sentence generated during completion

- **"Is this UI-only or imported?"**
  - Section labels, evidence labels, panel titles/subtitles, and rail prompts are UI-only.
  - Most body paragraphs in Sections 2-6 are imported, but they may have reached the payload through completion fallback.

- **"Which CSV controls this section?"**
  - Intro -> `single_domain_intro.csv`
  - Hero -> `single_domain_hero_pairs.csv`
  - Drivers -> `single_domain_drivers.csv` / `DRIVER_CLAIMS`
  - Pair -> `single_domain_pair_summaries.csv`
  - Limitation -> `single_domain_limitations.csv`
  - Application -> `single_domain_application.csv`

- **"Which fields are safe to rewrite?"**
  - Prose fields such as paragraphs, statements, headlines, and claim text.
  - Not structural keys and enums.

- **"Which keys must not be touched?"**
  - `domain_key`, `pair_key`, `signal_key`, `section_key`, `driver_role`, `claim_type`, `materiality`, `focus_area`, `guidance_type`, `linked_claim_type`, `priority`

- **"Which copy is computed and should not be edited directly?"**
  - Headline pair ordering, rank/signal evidence strings, score badges, metadata formatting, application numbering, and any fallback sentence built in code.

---

## Validation Rationale

This is a documentation-only audit. No runtime behaviour was changed.

Requested validation can still be run to confirm the repo remains green after adding this document.
