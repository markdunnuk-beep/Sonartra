# Single-Domain Active Language Source Audit

## 1. Purpose

This audit verifies the active language sources feeding the current single-domain result page before any editorial rewrite work begins.

The goal is to separate:

- preferred imported language
- persisted payload fields
- computed/view-model text
- UI-only labels
- legacy or code-owned fallback paths

from one another, so Task 4B/4C/4D/4E can edit the right assets first.

## 2. Method

Files inspected:

- `docs/results/single-domain-language-source-map.md`
- `lib/server/single-domain-completion.ts`
- `lib/server/single-domain-results-view-model.ts`
- `lib/assessment-language/single-domain-composer.ts`
- `components/results/single-domain-result-report.tsx`
- `components/results/single-domain-result-section.tsx`
- `lib/server/admin-single-domain-language-import.ts`
- `lib/server/assessment-version-single-domain-language.ts`
- `lib/assessment-language/single-domain-import-mappers.ts`
- `tests/single-domain-results-report.test.tsx`
- `tests/single-domain-results-view-model.test.ts`
- `tests/single-domain-reading-sections-contract.test.ts`
- `tests/single-domain-completion.test.ts`

Primary source map used:

- `docs/results/single-domain-language-source-map.md`

Focused validation run:

- `cmd /c node --test -r tsx tests/single-domain-results-report.test.tsx tests/single-domain-reading-sections-contract.test.ts tests/single-domain-results-view-model.test.ts`
- `cmd /c node --test -r tsx tests/single-domain-completion.test.ts`
- `cmd /c npm run lint`
- `cmd /c npm run build`

Validation result:

- targeted report/view-model/contract tests passed: `16/16`
- targeted completion tests passed: `13/13`
- lint passed
- build passed

Chrome MCP/browser checks performed:

- route verified: `http://localhost:3000/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`
- desktop snapshots checked at `1440x1100` and `1280x900`
- mobile snapshots checked at `430x932` and `390x844`
- screenshots saved:
  - `docs/qa/screenshots/single-domain-active-language-audit-desktop.png`
  - `docs/qa/screenshots/single-domain-active-language-audit-mobile.png`

Important audit limitation:

- direct live inspection of the local route's persisted `payload.diagnostics.warnings` was attempted through the read-model service, but local Postgres was unavailable (`ECONNREFUSED` on `127.0.0.1:5432` / `::1:5432`).
- because of that, persisted warning-array contents for this local route were not confirmed directly.
- fallback behaviour was instead verified from code paths, targeted completion tests, and the rendered page text.

## 3. Active Source Summary

| Section | Preferred Source | Confirmed Active Source | Fallback Used? | UI-Only Copy Present? | Notes |
| --- | --- | --- | --- | --- | --- |
| Opening / Intro | `single_domain_intro.csv`, plus pair and limitation persisted fields for the opening summary | `payload.intro.meaning_paragraph`, `payload.intro.bridge_to_signals`, `payload.pairSummary.pair_opening_paragraph`, `payload.balancing.current_pattern_paragraph` | No evidence of active fallback on the current route | Yes | Opening eyebrow, evidence heading, evidence labels, metadata labels, and the H1 pattern shell are UI/view-model owned. |
| Your Style at a Glance | `single_domain_hero_pairs.csv` -> `assessment_version_single_domain_hero_pairs` | `payload.hero.hero_headline`, `hero_opening`, `hero_strength_paragraph`, `hero_tension_paragraph` | No evidence on the current route | Yes | Section label and helper copy are UI-only. The visible hero prose exactly matches the gold-standard hero row for `results_process`. |
| What Shapes Your Approach | `single_domain_drivers.csv` -> `DRIVER_CLAIMS` -> `assessment_version_single_domain_driver_claims` | `payload.signals[*].chapter_intro` rendered through composer driver focus items | No evidence on the current route | Yes | This is the highest-confidence active `DRIVER_CLAIMS` section. Visible driver prose exactly matches pair-scoped driver rows for `results_process`. |
| How Your Style Balances | `single_domain_pair_summaries.csv` -> `assessment_version_single_domain_pair_summaries` | `payload.pairSummary.*` | No evidence on the current route | Yes | Section label, helper copy, and disclosure label are UI-only. Rendered pair prose exactly matches the imported pair row for `results_process`. |
| Where This Can Work Against You | `single_domain_limitations.csv` -> `assessment_version_single_domain_balancing_sections` | `payload.balancing.balancing_section_title`, `current_pattern_paragraph`, `practical_meaning_paragraph`, `system_risk_paragraph` | No evidence on the current route | Yes | The weaker-signal prefix `People:` is composer/view-model driven; the body copy matches imported limitation prose. |
| Putting This Into Practice | `single_domain_application.csv` -> `assessment_version_single_domain_application_statements` | `payload.application.strengths`, `watchouts`, `developmentFocus` | No evidence on the current route | Yes | Panel titles/subtitles are UI-only; grouping into Lean In / Stay Alert / Grow is computed, but the visible body sentences match imported application rows. |

## 4. Driver Claims Detail

The visible Drivers section on the current local result matches the pair-scoped `results_process` gold-standard driver rows exactly. That is the strongest evidence in this audit that `DRIVER_CLAIMS` is active and winning over legacy `SIGNAL_CHAPTERS`.

| Driver Role | Signal | Rendered Text Start | Confirmed Source | Fallback Used? | Notes |
| --- | --- | --- | --- | --- | --- |
| Primary driver | `process` | `Process is the main cause of this pattern.` | `single_domain_drivers.csv` -> `DRIVER_CLAIMS` -> `assessment_version_single_domain_driver_claims.claim_text` -> completion `resolvePairScopedDriverClaim()` -> persisted `signals[].chapter_intro` -> composer Drivers | No evidence | Exact text match to the `results_process/process/primary_driver` import row. |
| Secondary driver | `results` | `Results reinforces the pattern by adding urgency and commercial seriousness.` | `single_domain_drivers.csv` -> `DRIVER_CLAIMS` -> `assessment_version_single_domain_driver_claims.claim_text` -> persisted `signals[].chapter_intro` -> composer Drivers | No evidence | Exact text match to the `results_process/results/secondary_driver` import row. |
| Supporting context | `vision` | `Vision sits behind the pattern as a supporting layer.` | `single_domain_drivers.csv` -> `DRIVER_CLAIMS` -> `assessment_version_single_domain_driver_claims.claim_text` -> persisted `signals[].chapter_intro` -> composer Drivers | No evidence | Exact text match to the `results_process/vision/supporting_context` import row. |
| Range limitation | `people` | `People is the weaker range in this result.` | `single_domain_drivers.csv` -> `DRIVER_CLAIMS` -> `assessment_version_single_domain_driver_claims.claim_text` -> persisted `signals[].chapter_intro` -> composer Drivers | No evidence | Exact text match to the `results_process/people/range_limitation` import row. |

Driver verdict:

- preferred source: `DRIVER_CLAIMS`
- confirmed active source on the current route: `DRIVER_CLAIMS`
- legacy `SIGNAL_CHAPTERS` fallback does still exist in code, but it does not appear to be supplying the visible Drivers copy on this result

## 5. Fallback Diagnostics

Diagnostics paths found in code:

- persisted into `payload.diagnostics.warnings`:
  - `single_domain_driver_language_fallback`
  - `single_domain_pair_driver_claim_missing`
  - `single_domain_driver_claim_source`
- not persisted into the payload warning array:
  - hero fallback warnings
  - pair fallback warnings
  - limitation fallback warnings

Hero/pair/limitation fallback behaviour:

- `lib/server/single-domain-completion.ts` uses `warnPairFallback('hero' | 'pair' | 'limitation', pairKey)`.
- those warnings only hit `console.warn` when `SONARTRA_DEBUG_SINGLE_DOMAIN_FALLBACK === 'true'`.
- they are not stored in `payload.diagnostics.warnings`.

What the completion tests confirm:

- exact pair-scoped `DRIVER_CLAIMS` resolution produces `single_domain_driver_claim_source: ... source=driver_claims`
- missing pair-scoped driver rows produce `single_domain_pair_driver_claim_missing`
- role-incompatible signal-chapter fallbacks produce `single_domain_driver_language_fallback`

What was found on the current local route:

- no visible fallback phrases leaked into the UI
- no visible `signal-level synthesis` fallback prose
- no visible `controlled signal-level synthesis` fallback prose
- no visible pair-key reversal leakage
- no visible raw `SINGLE_DOMAIN_*` or MVP/debug leakage

What could not be confirmed directly for this local route:

- the exact stored contents of `payload.diagnostics.warnings`, because the local DB-backed read-model inspection failed with `ECONNREFUSED`

Fallback assessment for the current route:

- Drivers: no evidence of fallback
- Hero: no evidence of fallback
- Pair: no evidence of fallback
- Limitation: no evidence of fallback
- Application: no evidence of fallback

Any ambiguous fallback path still present in code:

- `SIGNAL_CHAPTERS` remains the legacy fallback source for Drivers and also supports fallback language for Hero/Pair/Limitation when pair-specific rows are missing or rejected.
- this path is still live in code even though it does not appear active for the current local result.

## 6. Chrome MCP Findings

Desktop findings:

- `1440x1100` and `1280x900` both rendered the full six-section structure.
- visible section order was correct:
  - Intro
  - Your Style at a Glance
  - What Shapes Your Approach
  - How Your Style Balances
  - Where This Can Work Against You
  - Putting This Into Practice
- the opening H1 rendered as `Process-led pattern, reinforced by Results`, confirming the title is computed primary-first from ranked persisted signals rather than copied from pair-owned text.
- the pair body still rendered `Results and Process`, confirming pair-owned imported language is separate from the computed opening-title shell.
- application meta labels rendered correctly:
  - `Where to Lean In`
  - `Where to Stay Alert`
  - `Where to Grow`

Mobile findings:

- `430x932` and `390x844` both rendered the same six sections.
- the mobile top bar and `Open sidebar` button appeared as expected.
- the mobile reading-progress surface appeared between Hero and Drivers.
- no visible truncation or fallback/debug leakage was observed in the inspected snapshots.

Console findings:

- no runtime errors
- no result-page console errors
- informational local-dev messages present:
  - React DevTools recommendation
  - HMR connected
- one warning present:
  - Clerk development-key warning

Network findings:

- document request returned `200`
- no failed result-page requests were observed
- page-critical local requests resolved cleanly
- Clerk asset requests showed expected `307` redirects that then resolved to `200`

Screenshots:

- `docs/qa/screenshots/single-domain-active-language-audit-desktop.png`
- `docs/qa/screenshots/single-domain-active-language-audit-mobile.png`

## 7. Editorial Implications

What this means for the next editorial tasks:

- edit `single_domain_drivers.csv` first for Drivers. On the current route, `DRIVER_CLAIMS` appears to be the active source and is safe to rewrite.
- edit `single_domain_hero_pairs.csv` for Hero copy.
- edit `single_domain_pair_summaries.csv` for Opening diagnosis and Pair copy.
- edit `single_domain_limitations.csv` for Opening implication and Limitation copy.
- edit `single_domain_application.csv` for Application body copy.
- edit `single_domain_intro.csv` for the two rendered Intro body paragraphs.

Specific recommendations:

- `DRIVER_CLAIMS` is safe to rewrite first. It appears to be the live/current active source for the Drivers body copy on this result.
- `SIGNAL_CHAPTERS` still matters as a fallback safety net, but it does not appear to own the currently rendered Drivers copy here.
- do not remove or casually rewrite code-owned fallback prose as part of editorial work. Leave fallback logic untouched unless there is a separate runtime-scope task.
- UI-only labels should be treated separately from editorial CSV work:
  - opening eyebrow
  - evidence labels
  - section display labels
  - application panel titles/subtitles
  - rail labels

## 8. Remaining Risks

- direct inspection of the local route's persisted `payload.diagnostics.warnings` was not possible because local Postgres was unavailable.
- Hero/Pair/Limitation fallback warnings are console-only when debug mode is enabled, not persisted diagnostics, so there is no stable warning-array proof for those sections.
- `SIGNAL_CHAPTERS` remains active as a code fallback path and could reappear if a future import row is missing or rejected.
- `intro.blueprint_context_line` is imported and composed but is not rendered in the current opening shell.
- `hero.hero_subheadline` is persisted but is not displayed as an independent visible line in the current section render.

## 9. Final Recommendation

It is safe to proceed to editorial rewrite.

Reason:

- the current local result is rendering section-first imported language through the expected payload -> composer -> renderer path
- Drivers is strongly confirmed as `DRIVER_CLAIMS`-owned on the active page
- no visible legacy `SIGNAL_CHAPTERS` prose or code-owned fallback prose is appearing on the current route
- tests, lint, and build all passed

Recommended editorial priority:

1. `single_domain_drivers.csv`
2. `single_domain_pair_summaries.csv`
3. `single_domain_limitations.csv`
4. `single_domain_hero_pairs.csv`
5. `single_domain_application.csv`
6. `single_domain_intro.csv`

Keep fallback logic untouched during editorial-only tasks unless a separate runtime hardening task is explicitly opened.
