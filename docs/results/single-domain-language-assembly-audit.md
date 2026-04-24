# Single-Domain Language Assembly Audit

## 1. Audit scope

This audit documents how single-domain report language moves from pipe-delimited admin imports into the final persisted and rendered single-domain results report.

Scope includes:

- Section-first pipe-delimited import contracts for intro, hero, drivers, pair, limitation, and application.
- Legacy dataset adapter mappings that still back the current storage tables.
- Database tables, lookup keys, validation rules, and compatibility paths.
- Runtime completion flow, language row resolution, persisted payload shape, read-model conversion, and React render mapping.
- A seeded-result trace for `/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`.

Scope excludes:

- No report language changes.
- No builder-linked language changes.
- No assessment builder data or seed data changes.
- No engine, composer, scoring, persistence, result payload, result contract, or UI computation changes.

## 2. Files inspected

Import and validation:

- `components/admin/assessments/single-domain-narrative-builder.tsx`
- `components/admin/assessments/single-domain-section-panel.tsx`
- `components/admin/single-domain-language-import.tsx`
- `lib/assessment-language/single-domain-narrative-schema.ts`
- `lib/assessment-language/single-domain-narrative-types.ts`
- `lib/assessment-language/single-domain-import-headers.ts`
- `lib/assessment-language/single-domain-import-parsers.ts`
- `lib/assessment-language/single-domain-import-validators.ts`
- `lib/assessment-language/single-domain-import-mappers.ts`
- `lib/admin/single-domain-language-datasets.ts`
- `lib/server/admin-single-domain-narrative-import.ts`
- `lib/server/admin-single-domain-language-import.ts`
- `lib/server/assessment-version-single-domain-language.ts`
- `lib/server/assessment-version-single-domain-language-types.ts`
- `lib/types/single-domain-language.ts`
- `lib/validation/single-domain-language.ts`

Composer, runtime, persistence, and retrieval:

- `lib/assessment-language/single-domain-composer.ts`
- `lib/server/single-domain-runtime-definition.ts`
- `lib/server/single-domain-completion.ts`
- `lib/server/assessment-completion-service.ts`
- `lib/server/assessment-completion-queries.ts`
- `lib/types/single-domain-result.ts`
- `lib/server/result-read-model.ts`
- `lib/server/result-read-model-queries.ts`
- `lib/server/single-domain-results-view-model.ts`

Rendering:

- `app/(user)/app/results/single-domain/[resultId]/page.tsx`
- `components/results/single-domain-result-report.tsx`
- `components/results/single-domain-result-section.tsx`
- `components/results/result-reading-rail.tsx`
- `components/results/result-reading-progress.tsx`
- `lib/results/single-domain-reading-sections.ts`

Database and tests:

- `db/migrations/202604120001_assessment_version_single_domain_language.sql`
- `tests/admin-single-domain-language-import.test.ts`
- `tests/single-domain-import-parsers.test.ts`
- `tests/single-domain-import-validators.test.ts`
- `tests/single-domain-composer.test.ts`
- `tests/single-domain-completion.test.ts`
- `tests/single-domain-results-report.test.tsx`
- `tests/single-domain-results-smoke.test.tsx`

## 3. Import datasets and pipe-delimited schemas

The current admin narrative builder presents six section-first imports through `SingleDomainNarrativeBuilder`. The contracts are defined in `SINGLE_DOMAIN_NARRATIVE_DATASET_COLUMNS` and parsed by `parseSingleDomainImportInput`.

| Section | Narrative dataset | Admin module | Pipe columns | Parser / normaliser | Saved as legacy dataset |
| --- | --- | --- | --- | --- | --- |
| Intro | `SINGLE_DOMAIN_INTRO` | Single-domain language step, intro panel | `domain_key`, `section_key`, `domain_title`, `domain_definition`, `domain_scope`, `interpretation_guidance`, `intro_note` | `single-domain-import-parsers.ts`, `single-domain-import-validators.ts`, `single-domain-import-mappers.ts` | `DOMAIN_FRAMING` |
| Hero | `SINGLE_DOMAIN_HERO` | Single-domain language step, hero panel | `domain_key`, `section_key`, `pair_key`, `pattern_label`, `hero_statement`, `hero_expansion`, `hero_strength` | same parser / validator / mapper stack | `HERO_PAIRS` |
| Drivers | `SINGLE_DOMAIN_DRIVERS` | Single-domain language step, drivers panel | `domain_key`, `section_key`, `pair_key`, `signal_key`, `driver_role`, `claim_type`, `claim_text`, `materiality`, `priority` | same parser / validator / mapper stack | `SIGNAL_CHAPTERS` |
| Pair | `SINGLE_DOMAIN_PAIR` | Single-domain language step, pair panel | `domain_key`, `section_key`, `pair_key`, `pair_label`, `interaction_claim`, `synergy_claim`, `tension_claim`, `pair_outcome` | same parser / validator / mapper stack | `PAIR_SUMMARIES` |
| Limitation | `SINGLE_DOMAIN_LIMITATION` | Single-domain language step, limitation panel | `domain_key`, `section_key`, `pair_key`, `limitation_label`, `pattern_cost`, `range_narrowing`, `weaker_signal_key`, `weaker_signal_link` | same parser / validator / mapper stack | `BALANCING_SECTIONS` |
| Application | `SINGLE_DOMAIN_APPLICATION` | Single-domain language step, application panel | `domain_key`, `section_key`, `pair_key`, `focus_area`, `guidance_type`, `signal_key`, `guidance_text`, `linked_claim_type`, `priority` | same parser / validator / mapper stack | `APPLICATION_STATEMENTS` |

The older direct dataset import surface still exists in `components/admin/single-domain-language-import.tsx` and `lib/server/admin-single-domain-language-import.ts`. It imports the legacy-shaped datasets directly:

- `DOMAIN_FRAMING`
- `HERO_PAIRS`
- `SIGNAL_CHAPTERS`
- `BALANCING_SECTIONS`
- `PAIR_SUMMARIES`
- `APPLICATION_STATEMENTS`

The final runtime currently reads those legacy-named tables, so the section-first narrative imports are adapted before storage rather than stored in separate section-native tables.

## 4. Database tables and lookup keys

All six language datasets are stored per `assessment_version_id`.

| Stored dataset | Table | Primary lookup in runtime | Uniqueness rule | Used for |
| --- | --- | --- | --- | --- |
| `DOMAIN_FRAMING` | `assessment_version_single_domain_framing` | `domain_key` | unique `(assessment_version_id, domain_key)` | Intro |
| `HERO_PAIRS` | `assessment_version_single_domain_hero_pairs` | `pair_key` | unique `(assessment_version_id, pair_key)` | Hero |
| `SIGNAL_CHAPTERS` | `assessment_version_single_domain_signal_chapters` | `signal_key` | unique `(assessment_version_id, signal_key)` | Drivers and per-signal payload language |
| `BALANCING_SECTIONS` | `assessment_version_single_domain_balancing_sections` | `pair_key` | unique `(assessment_version_id, pair_key)` | Limitation |
| `PAIR_SUMMARIES` | `assessment_version_single_domain_pair_summaries` | `pair_key` | unique `(assessment_version_id, pair_key)` | Pair synthesis |
| `APPLICATION_STATEMENTS` | `assessment_version_single_domain_application_statements` | `signal_key` | unique `(assessment_version_id, signal_key)` | Application |

Validation rules:

- Header order must exactly match the dataset contract.
- Blank rows are rejected.
- Column count must exactly match the expected pipe-delimited column count.
- Section-first imports require `section_key` to match the selected section.
- Section-first imports require `domain_key` to match the current authored domain.
- `pair_key` must canonicalize cleanly and resolve against the current signal-derived pair set.
- Signal-backed rows must use current authored signal keys.
- Drivers enforce the role-to-claim mapping: `primary_driver -> driver_primary`, `secondary_driver -> driver_secondary`, `supporting_context -> driver_supporting_context`, `range_limitation -> driver_range_limitation`.
- Drivers enforce materiality: primary and secondary are `core`, supporting is `supporting`, range limitation is `material_underplay`.
- Application rows require valid `focus_area`, `guidance_type`, `linked_claim_type`, current signal key, non-empty text, and positive integer `priority`.
- The direct legacy importer enforces non-empty string fields and duplicate target-key rejection through `singleDomainLanguageSchemaRegistry`.

## 5. Composer/result builder flow

There are two related assembly paths:

1. Admin preview composer.
2. Runtime persisted result builder.

Admin preview composer:

- `buildSingleDomainDraftPreviewInput` adapts stored legacy-shaped rows back into section-first preview input.
- `composeSingleDomainReport` creates six `ComposedNarrativeSection` records in locked order: intro, hero, drivers, pair, limitation, application.
- This path is for authoring preview and section diagnostics. It does not persist user results.

Runtime persisted result builder:

- `createAssessmentCompletionService.completeAssessmentAttempt` detects `attempt.assessmentMode === 'single_domain'`.
- It calls `buildSingleDomainResultPayload`.
- `buildSingleDomainResultPayload` loads the exact published version with `loadSingleDomainRuntimeDefinition`.
- Runtime loading pulls domains, signals, questions, options, option-signal weights, and the single-domain language bundle.
- Scoring runs through `scoreAssessmentResponses` using option-signal weights.
- Normalization runs through `normalizeScoreResult`.
- Ranked signals are sorted by normalized rank, then signal key, then signal id.
- The top two ranked signals derive the canonical `topPairKey`.
- Language maps are built by `domain_key`, `pair_key`, and `signal_key`.
- Missing required language rows throw `SingleDomainCompletionError`; the result does not become ready.
- The final payload is persisted by `upsertReadyResult` into `results.canonical_result_payload` with `readiness_status = 'READY'`.

Selection rules:

- Primary signal is rank `1`.
- Secondary signal is rank `2`.
- If there are four or more signals, the final ranked signal is marked `underplayed`.
- Other non-primary/non-secondary signals are `supporting`.
- Top pair is the canonical pair derived from rank `1` and rank `2`.
- Hero, pair, and limitation language resolve by that top pair key.
- Intro language resolves by the authored domain key.
- Signal chapter language resolves once per ranked signal by `signal_key`.
- Application language resolves by `signal_key`, then picks statements based on ranked position.

Application selection:

- `strengths` takes up to the top three ranked signals.
- First strength uses `strength_statement_1`; later strengths use `strength_statement_2`.
- `watchouts` considers top signal, second signal, and lowest-ranked signal, deduplicated by signal key.
- First watchout uses `watchout_statement_1`; later watchouts use `watchout_statement_2`.
- `developmentFocus` considers lowest-ranked signal, second-lowest signal, and second-ranked signal, deduplicated by signal key.
- First development item uses `development_statement_1`; later development items use `development_statement_2`.

## 6. Persisted payload map

The persisted payload type is `SingleDomainResultPayload`.

Top-level shape:

- `metadata`
- `intro`
- `hero`
- `signals`
- `balancing`
- `pairSummary`
- `application`
- `diagnostics`

Section mapping:

| Final page section | Source language table(s) | Runtime builder field(s) | Persisted payload field(s) | Rendered component(s) |
| --- | --- | --- | --- | --- |
| Intro | `assessment_version_single_domain_framing` | `toIntro` | `intro.section_title`, `intro.intro_paragraph`, `intro.meaning_paragraph`, `intro.bridge_to_signals`, `intro.blueprint_context_line` | `SingleDomainResultReport` opening header |
| Hero | `assessment_version_single_domain_hero_pairs` | `toHero` | `hero.hero_headline`, `hero.hero_subheadline`, `hero.hero_opening`, `hero.hero_strength_paragraph`, `hero.hero_tension_paragraph`, `hero.hero_close_paragraph` | `SingleDomainResultSection` hero branch |
| Drivers | `assessment_version_single_domain_signal_chapters` plus scoring ranks | `getSignalPosition`, `getPositionLabel`, signal chapter row mapping | `signals[].position`, `signals[].position_label`, `signals[].chapter_intro`, `signals[].chapter_*` | `createSingleDomainResultsViewModel`, then `SingleDomainResultSection` drivers branch |
| Pair | `assessment_version_single_domain_pair_summaries` | `toPairSummary` | `pairSummary.pair_section_title`, `pairSummary.pair_headline`, `pairSummary.pair_opening_paragraph`, `pairSummary.pair_strength_paragraph`, `pairSummary.pair_tension_paragraph`, `pairSummary.pair_close_paragraph` | `SingleDomainResultSection` pair branch |
| Limitation | `assessment_version_single_domain_balancing_sections` plus lowest/range-limitation signal | `toBalancing`, composer limitation adapter | `balancing.balancing_section_title`, `balancing.current_pattern_paragraph`, `balancing.practical_meaning_paragraph`, `balancing.system_risk_paragraph`, `balancing.rebalance_intro`, `balancing.rebalance_actions` | `SingleDomainResultSection` limitation branch |
| Application | `assessment_version_single_domain_application_statements` plus ranked signal selection | `buildApplicationStatements` | `application.strengths[]`, `application.watchouts[]`, `application.developmentFocus[]` | `SingleDomainResultSection` application branch |

Important distinction:

- The persisted payload is the durable result contract.
- The results page does not go back to the language tables.
- The results page builds a view model from `detail.singleDomainResult`, which comes from `results.canonical_result_payload`.

## 7. Results page render map

Route:

- `app/(user)/app/results/single-domain/[resultId]/page.tsx`

Server read path:

- `createResultReadModelService().getAssessmentResultDetail`
- `getReadyResultDetailForUser`
- Filters by current user, result id, `readiness_status = 'READY'`, and non-null `canonical_result_payload`.
- `parseCanonicalPayload` checks `metadata.mode` / assessment mode and validates with `isSingleDomainResultPayload`.
- The single-domain page requires `detail.mode === 'single_domain'` and `detail.singleDomainResult`.

View model:

- `createSingleDomainResultsViewModel(payload)` calls `buildSingleDomainResultComposerInput(payload)` and `composeSingleDomainReport`.
- The composer transforms the persisted payload back into the six-section rendering model.
- `cleanResultCopy` applies display cleanup and approved display-label mappings. This is a presentation view-model cleanup path, not a language-table rewrite and not result recomputation.
- Metadata strip values are created from persisted metadata and rendered as static report details.
- Reading rail sections come from `createSingleDomainResultReadingSections`.

Rendered text categories:

- Persisted payload text: section titles, hero copy, signal chapter copy, pair copy, limitation copy, and application statements.
- Static UI labels: `Completed`, `Time`, `Assessment`, `Version`, `Leading pair`, `Main cause`, `Reinforcing cause`, `Supporting layer`, `Missing range`, `Rely on`, `Notice`, `Develop`, and reading rail labels.
- Derived display labels: pair labels such as `results_process` are converted to approved display labels where available, e.g. `Delivery and Process`.
- Fallback / cleanup text: copy cleanup removes or replaces known internal/system terms if they appear in persisted copy.
- Builder-linked authored language: the substantive narrative content comes from imported language rows that were persisted into the result payload at completion time.

Reading rail anchors:

- `intro`
- `hero`
- `drivers`
- `pair`
- `limitation`
- `application`

## 8. End-to-end seeded result trace

Seeded route:

- Result ID: `f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`
- Attempt ID: `ef1ed8d4-91b2-4fd2-bdc0-dc78b18b0c01`
- Assessment key: `leadership`
- Assessment title: `Leadership`
- Assessment version ID: `0e78d8e9-7945-4f39-b4dc-2f53a3e54178`
- Readiness: `READY`
- Domain key: `leadership-approach`
- Persisted top pair: `results_process`
- Ranked signals: `process` rank 1, `results` rank 2, `vision` rank 3, `people` rank 4.

Trace table:

| Final report section | Rendered text role | Payload field | Composer source | Language table | Import dataset | Pipe columns | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Intro | Main title | `report.domainTitle` from `payload.intro.section_title` | `buildSingleDomainResultComposerInput.sections.intro.domain_title` | `assessment_version_single_domain_framing.section_title` | `SINGLE_DOMAIN_INTRO` mapped to `DOMAIN_FRAMING` | `domain_title` -> `section_title` | Seeded value: `Understand how you lead`. |
| Intro | Opening explanatory copy | `intro.intro_paragraph`, `intro.meaning_paragraph`, `intro.bridge_to_signals`, `intro.blueprint_context_line` | Composer intro paragraphs | `assessment_version_single_domain_framing` | `SINGLE_DOMAIN_INTRO` | `domain_definition`, `domain_scope`, `interpretation_guidance`, `intro_note` | The first paragraph is visually promoted; later paragraphs render below. |
| Hero | Hero headline | `hero.hero_headline` | Composer hero paragraph 1 | `assessment_version_single_domain_hero_pairs.hero_headline` | `SINGLE_DOMAIN_HERO` mapped to `HERO_PAIRS` | `pattern_label` -> `hero_headline` | Seeded value: `You turn direction into disciplined execution`. |
| Hero | Hero opening / strength / tension / close | `hero.hero_opening`, `hero.hero_strength_paragraph`, `hero.hero_tension_paragraph`, `hero.hero_close_paragraph` | Composer hero paragraphs | `assessment_version_single_domain_hero_pairs` | `SINGLE_DOMAIN_HERO` | `hero_statement`, `hero_expansion`, `hero_strength` mapped into legacy hero fields | Section-first hero currently compresses seven stored hero fields into three narrative import body fields. |
| Drivers | Primary driver | `signals[0].chapter_intro` after position selection | `getSignalPosition` + `getPositionLabel` | `assessment_version_single_domain_signal_chapters.chapter_intro_primary` for `process` | `SINGLE_DOMAIN_DRIVERS` mapped to `SIGNAL_CHAPTERS` | `driver_role`, `claim_type`, `claim_text`, `materiality`, `priority` | Seeded primary signal is `process`; primary copy comes from `chapter_intro_primary`. |
| Drivers | Secondary driver | `signals[1].chapter_intro` | same | `chapter_intro_secondary` for `results` | `SINGLE_DOMAIN_DRIVERS` | same | Seeded secondary signal is `results`. |
| Drivers | Supporting context | `signals[2].chapter_intro` | same | `chapter_intro_supporting` for `vision` | `SINGLE_DOMAIN_DRIVERS` | same | Seeded supporting signal is `vision`. |
| Drivers | Missing range | `signals[3].chapter_intro` | same | `chapter_intro_underplayed` for `people` | `SINGLE_DOMAIN_DRIVERS` | same | Seeded underplayed signal is `people`, because it is rank 4 of 4 and raw score is 0. |
| Pair | Pair headline and body | `pairSummary.*` | Composer pair paragraphs | `assessment_version_single_domain_pair_summaries` row for `results_process` | `SINGLE_DOMAIN_PAIR` mapped to `PAIR_SUMMARIES` | `pair_label`, `interaction_claim`, `synergy_claim`, `tension_claim`, `pair_outcome` | Persisted pair headline is `Results × Process`; view model cleans this to approved display language where possible. |
| Limitation | Turning-point label and body | `balancing.*` | Composer limitation adapter | `assessment_version_single_domain_balancing_sections` row for `results_process` | `SINGLE_DOMAIN_LIMITATION` mapped to `BALANCING_SECTIONS` | `limitation_label`, `pattern_cost`, `range_narrowing`, `weaker_signal_key`, `weaker_signal_link` | Runtime stores all balancing fields; composer uses balancing title, current pattern, practical meaning, and system risk. |
| Application | Rely on | `application.strengths[]` | `buildApplicationStatements` | `assessment_version_single_domain_application_statements` for top three ranked signals | `SINGLE_DOMAIN_APPLICATION` mapped to `APPLICATION_STATEMENTS` | `focus_area`, `guidance_type`, `signal_key`, `guidance_text`, `linked_claim_type`, `priority` | Seeded strengths come from `process.strength_statement_1`, `results.strength_statement_2`, `vision.strength_statement_2`. |
| Application | Notice | `application.watchouts[]` | `buildApplicationStatements` | same table | `SINGLE_DOMAIN_APPLICATION` | same | Seeded watchouts come from `process.watchout_statement_1`, `results.watchout_statement_2`, `people.watchout_statement_2`. |
| Application | Develop | `application.developmentFocus[]` | `buildApplicationStatements` | same table | `SINGLE_DOMAIN_APPLICATION` | same | Seeded development comes from `people.development_statement_1`, `vision.development_statement_2`, `results.development_statement_2`. |

## 9. Fallbacks and legacy compatibility paths

Import compatibility:

- Section-first narrative import keys map into legacy storage dataset keys through `SINGLE_DOMAIN_NARRATIVE_TO_LEGACY_DATASET_MAP`.
- `buildSingleDomainDraftPreviewInput` adapts legacy stored rows back into section-first preview input.
- The direct legacy dataset importer still exists and writes directly to the same storage tables.

Runtime fallback / failure behavior:

- Runtime completion does not generate replacement narrative language if required language rows are missing.
- Missing domain framing, hero pair, balancing section, pair summary, signal chapter, or application statement rows throw completion errors.
- Incomplete responses throw before ready result persistence.
- Failed completion writes a failed result row and marks the attempt failed.

Read-model compatibility:

- `result-read-model.ts` supports both multi-domain canonical payloads and single-domain payloads.
- Single-domain payloads are validated by `isSingleDomainResultPayload`.
- A compatibility payload is built internally so shared result list/detail projections can keep working, but the single-domain route receives `singleDomainResult` and renders from the single-domain payload.
- Legacy/multi-domain payload readability helpers exist for older payloads and missing application plan compatibility; these are not used as the primary single-domain report source.

Presentation cleanup:

- `createSingleDomainResultsViewModel` applies copy cleanup and approved signal/pair display-label replacement.
- This can hide internal terms or normalize display tokens, but it is not a substitute for authoring clean final report language.
- Because cleanup happens after persistence, authors should not rely on it to fix narrative structure, repetition, section ownership, or tone.

## 10. Gold-standard language authoring recommendations

Author the six imports as one report system, not as independent fragments.

Blocks that must be written together:

- Hero, pair, limitation, and application need to be authored together per `pair_key`, because the runtime picks one top pair and then renders all pair-owned sections as one narrative arc.
- Drivers and application need to be authored together per `signal_key`, because the application section selects statements based on ranked signal position and may pull multiple statements for the same signal across different roles.
- Intro should set the domain frame without repeating the hero claim. It should establish what is being measured and how to read the signal pattern.

Repetition risks:

- Hero `hero_opening`, pair `pair_opening_paragraph`, and limitation `current_pattern_paragraph` can easily restate the same central pattern.
- Driver `chapter_intro_*` fields and application statements can repeat if every signal row uses the same generic strength/risk wording.
- Pair tension and limitation cost can collapse into the same paragraph unless pair tension explains the interaction and limitation explains the consequence.
- Application watchouts can duplicate limitation copy if they are written as diagnosis rather than applied behavior.

Section role guidance:

- Intro fields should orient the reader: domain definition, scope, interpretation guidance, and report context.
- Hero fields should carry the defining identity of the pattern: what this result means at a high level and why it matters.
- Driver fields should explain causality: primary cause, secondary reinforcement, supporting layer, and missing range.
- Pair fields should explain interaction: how the top two tendencies combine, what they create, and where their tension sits.
- Limitation fields should carry cost and narrowing: what becomes less available when the pattern over-relies on its strengths.
- Application fields should be practical and forward-facing: what to rely on, what to notice, and what to develop.

Authoring implications for current schema:

- The section-first import schema is better for complete-report authoring, but it still stores through legacy-shaped tables. Authors should understand which narrative import columns are compressed into legacy storage fields.
- For hero, avoid putting the same sentence into `hero_statement`, `hero_expansion`, and `hero_strength`; these map into multiple hero paragraphs.
- For drivers, use `priority` only to order multiple claims within a role; runtime result selection is still driven by scoring rank and signal position.
- For application, write both statement slots for each signal intentionally, because the runtime may use `_1` for first-selected items and `_2` for later-selected items.
- Treat weaker-signal language as a connected thread: drivers `range_limitation`, limitation `weaker_signal_link`, application `watchout` / `development_focus`, and any range recovery copy should point to the same narrative absence.
- Write per-pair language for every derived pair, but review the whole pair set for tonal consistency so the report quality does not depend on which pair wins.

Recommended authoring workflow:

1. Draft the full six-section report for a representative top pair and ranked signal set.
2. Mark each paragraph by section role before importing.
3. Convert into pipe-delimited rows only after the narrative arc is coherent.
4. Review the composer preview and final seeded route for repetition across hero, pair, limitation, and application.
5. Repeat by pair family and signal, preserving section ownership.

## 11. Explicit no-change confirmation

This audit did not change:

- Report language.
- Builder-linked language.
- Assessment builder data.
- Seed data.
- Engine logic.
- Composer logic.
- Scoring logic.
- Result payload structure.
- Result contract.
- Persistence logic.
- UI-side computation.

Only this documentation file was created.
