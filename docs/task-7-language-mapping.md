# Task 7 Language Mapping

## Purpose

The final persisted report contract is now proven in runtime code:

1. `intro`
2. `hero`
3. `domains`
4. `actions`

This document maps the current language authoring model to that final report shape before any import, UI, or schema refactor happens.

The goal is to keep one engine-owned execution path and define a cleaner future authoring model without changing the report contract, moving interpretation into the UI, or duplicating content ownership.

## Final report contract

The current canonical payload is defined in `lib/engine/types.ts` and assembled in `lib/engine/result-builder-helpers.ts`.

Persisted report fields:

- `intro.assessmentDescription`
- `hero.headline`
- `hero.narrative`
- `hero.primaryPattern`
- `hero.domainHighlights[]`
- `domains[].summary`
- `domains[].focus`
- `domains[].pressure`
- `domains[].environment`
- `domains[].primarySignal.{summary,strength,watchout,development}`
- `domains[].secondarySignal.{summary,strength,watchout,development}`
- `domains[].pairSummary`
- `actions.strengths[]`
- `actions.watchouts[]`
- `actions.developmentFocus[]`

## Current source mapping

### Intro

| Final field | Current source | Current ownership | Current engine resolution path | Type | Status | Recommended target home | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `intro.assessmentDescription` | `assessment_version_language_assessment.section = assessment_description` | assessment-level language | `engine-runner.ts` loads `getAssessmentLanguage()` -> `metadata.assessmentDescription` -> `buildIntro()` | Authored | Keep | Intro | This is already clean. It is version-scoped, persisted, and rendered directly. No duplication needed elsewhere. |

### Hero

| Final field | Current source | Current ownership | Current engine resolution path | Type | Status | Recommended target home | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `hero.headline` | `assessment_version_language_overview.section = headline`, keyed by canonical top-two pattern | overview language | `buildOverviewSummary()` -> `resolveOverviewLanguageSection('headline')` -> `buildHero()` | Hybrid authored + deterministic fallback | Keep | Hero | Good long-term fit. Authoring key is not a section key, it is a canonical signal-pair key derived from overall ranking. |
| `hero.narrative` | `assessment_version_language_overview.section = summary`, keyed by canonical top-two pattern | overview language | `buildOverviewSummary()` -> `resolveOverviewLanguageSection('summary')` -> `buildHero()` | Hybrid authored + deterministic fallback | Keep | Hero | Good long-term fit. This is the main authored hero narrative today. |
| `hero.primaryPattern.label` | top-ranked overall signal title | ranking / normalized scores | `buildHero()` -> first ranked signal | Derived | Derive | Hero, engine-owned | Should not be separately authored. It is a deterministic label for the current top signal. |
| `hero.primaryPattern.signalKey` | top-ranked overall signal key | ranking / normalized scores | `buildHero()` -> first ranked signal | Derived | Derive | Hero, engine-owned | Should remain derived from ranking. |
| `hero.primaryPattern.signalLabel` | top-ranked overall signal title | ranking / normalized scores | `buildHero()` -> first ranked signal | Derived | Derive | Hero, engine-owned | Duplicates `label` intentionally for the contract; do not add a new language source. |
| `hero.domainHighlights[].domainKey` | persisted domain summary order | domain/runtime definition | `buildHero()` iterates `domainSummaries` | Derived | Keep | Hero, engine-owned | Stays derived from canonical domain ordering. |
| `hero.domainHighlights[].domainLabel` | domain title | domain/runtime definition | `buildHero()` iterates `domainSummaries` | Derived | Keep | Hero, engine-owned | No separate language bucket needed. |
| `hero.domainHighlights[].primarySignalKey` | top-ranked signal inside each domain | normalized domain scores | `buildHero()` -> first signal in each domain | Derived | Derive | Hero, engine-owned | Should not be separately authored. |
| `hero.domainHighlights[].primarySignalLabel` | top-ranked signal title inside each domain | normalized domain scores | `buildHero()` -> first signal in each domain | Derived | Derive | Hero, engine-owned | Should not be separately authored. |
| `hero.domainHighlights[].summary` | `assessment_version_language_signals.section = summary` for the domain primary signal only | signal language | `buildHero()` -> `getSignalLanguageSummary(primarySignal.signalKey)` | Derived-from-authored | Derive | Signals | Do not create a separate domain-highlight summary table. Current behavior is clean: hero highlights reuse the same authored signal summary already used in domain chapters. |

### Domain chapters

| Final field | Current source | Current ownership | Current engine resolution path | Type | Status | Recommended target home | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `domains[].summary` | deterministic domain interpretation, optionally overridden by `assessment_version_language_domains.section = summary` | engine domain interpretation + optional domain language override | `buildDomainInterpretation()` -> fallback pairwise/fragment/single-signal summary -> optional `resolveDomainLanguageSummary()` -> `buildDomains()` | Hybrid | Simplify | Domain Chapters | Current reality is hybrid. Recommended future model: keep deterministic fallback, but treat authored `domain.summary` as an optional chapter-level override, not a required duplicate of signal/pair content. |
| `domains[].focus` | `assessment_version_language_domains.section = focus` | domain language | `buildDomains()` -> `resolveDomainLanguageSection('focus')` | Authored | Keep | Domain Chapters | Good fit as a domain-level authored subsection. |
| `domains[].pressure` | `assessment_version_language_domains.section = pressure` | domain language | `buildDomains()` -> `resolveDomainLanguageSection('pressure')` | Authored | Keep | Domain Chapters | Good fit as a domain-level authored subsection. |
| `domains[].environment` | `assessment_version_language_domains.section = environment` | domain language | `buildDomains()` -> `resolveDomainLanguageSection('environment')` | Authored | Keep | Domain Chapters | Good fit as a domain-level authored subsection. |
| `domains[].primarySignal.summary` | `assessment_version_language_signals.section = summary` for primary signal | signal language | `buildDomainChapterSignal()` -> `resolveSignalLanguageBundle()` | Authored | Keep | Signals | Good fit. Same source also feeds hero domain-highlight summary. |
| `domains[].primarySignal.strength` | `assessment_version_language_signals.section = strength` for primary signal | signal language | `buildDomainChapterSignal()` -> `resolveSignalLanguageBundle()` | Authored | Keep | Signals | Good fit. Also reused by `actions.strengths[]` when that signal is selected. |
| `domains[].primarySignal.watchout` | `assessment_version_language_signals.section = watchout` for primary signal | signal language | `buildDomainChapterSignal()` -> `resolveSignalLanguageBundle()` | Authored | Keep | Signals | Good fit. Also reused by `actions.watchouts[]` when that signal is selected. |
| `domains[].primarySignal.development` | `assessment_version_language_signals.section = development` for primary signal | signal language | `buildDomainChapterSignal()` -> `resolveSignalLanguageBundle()` | Authored | Keep | Signals | Good fit. Also reused by `actions.developmentFocus[]` when that signal is selected. |
| `domains[].secondarySignal.summary` | `assessment_version_language_signals.section = summary` for secondary signal | signal language | `buildDomainChapterSignal()` -> `resolveSignalLanguageBundle()` | Authored | Keep | Signals | Same ownership as primary signal. |
| `domains[].secondarySignal.strength` | `assessment_version_language_signals.section = strength` for secondary signal | signal language | `buildDomainChapterSignal()` -> `resolveSignalLanguageBundle()` | Authored | Keep | Signals | Same ownership as primary signal. |
| `domains[].secondarySignal.watchout` | `assessment_version_language_signals.section = watchout` for secondary signal | signal language | `buildDomainChapterSignal()` -> `resolveSignalLanguageBundle()` | Authored | Keep | Signals | Same ownership as primary signal. |
| `domains[].secondarySignal.development` | `assessment_version_language_signals.section = development` for secondary signal | signal language | `buildDomainChapterSignal()` -> `resolveSignalLanguageBundle()` | Authored | Keep | Signals | Same ownership as primary signal. |
| `domains[].pairSummary.pairKey` | canonicalized token pair from top two domain signals | engine ranking + pair-key canonicalization | `buildDomains()` -> `buildCanonicalSignalPairKey()` | Derived | Derive | Pairs, engine-owned key | Should remain derived. No separate authoring field needed for the key itself. |
| `domains[].pairSummary.text` | `assessment_version_language_pairs.section = summary` for derived domain pair | pair language | `buildDomains()` -> lookup `languageBundle.pairs[pairKey]?.summary` | Authored | Keep | Pairs | Good fit as pair-level authored copy. This is currently the only active pair-language field in the final report. |

### Actions

| Final field | Current source | Current ownership | Current engine resolution path | Type | Status | Recommended target home | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `actions.strengths[]` | top-ranked unique signals, with `signal.strength` override when present and deterministic template fallback otherwise | engine action selection + signal language override | `buildStrengths()` -> top signals -> `resolveSignalLanguageSection('strength')` -> `buildActions()` | Hybrid | Derive | Actions derived from Signals | Do not introduce separately authored action rows for MVP. Current signal-level ownership is enough. |
| `actions.watchouts[]` | top-signal overuse, hard-coded rule watchouts, and lower-access signals, with `signal.watchout` override only where a signal owns the item | engine action selection + signal language override | `buildWatchouts()` -> signal/rule selection -> `resolveSignalLanguageSection('watchout')` -> `buildActions()` | Hybrid | Derive | Actions derived from Signals | Keep derived. Rule-only watchouts intentionally have no signal attribution and are dropped from the persisted action blocks if attribution is ambiguous. |
| `actions.developmentFocus[]` | lower-ranked signals, with `signal.development` override when present and deterministic template fallback otherwise | engine action selection + signal language override | `buildDevelopmentFocus()` -> lower-ranked signals -> `resolveSignalLanguageSection('development')` -> `buildActions()` | Hybrid | Derive | Actions derived from Signals | Do not add separate action authoring unless a concrete MVP gap appears. |

## What can stay as-is

- `assessment_version_language_assessment.assessment_description` should stay as the source for `intro.assessmentDescription`.
- `assessment_version_language_signals.summary` should stay as the source for signal summaries in domain chapters and for `hero.domainHighlights[].summary`.
- `assessment_version_language_signals.strength/watchout/development` should stay as the authored source reused by both domain chapters and action blocks.
- `assessment_version_language_domains.focus/pressure/environment` should stay as domain-level authored chapter sections.
- `assessment_version_language_domains.summary` can stay, but as an optional domain-summary override rather than the only valid source of `domains[].summary`.
- `assessment_version_language_overview.headline/summary` should stay as the authored hero-level language keyed by the canonical top-two overall pattern.
- `assessment_version_language_pairs.summary` should stay as the authored source for `domains[].pairSummary.text`.

## What should move or be simplified later

- The later import and admin model should be reorganized around report reading order rather than current table order:
  - Intro
  - Hero
  - Domain Chapters
  - Signals
  - Pairs
  - Actions derived
- Overview language should be framed as Hero authoring in the UI and docs, even if the storage key remains a canonical pattern key.
- Domain language should be framed as Domain Chapter authoring, not as a generic catch-all language bucket.
- The current code comments around domain-language ownership need cleanup later: `lib/engine/domain-interpretation.ts` still describes `focus`, `pressure`, and `environment` as reserved even though `buildDomains()` actively persists them.

## What should remain derived

- `hero.primaryPattern`
- `hero.domainHighlights[].domainKey`
- `hero.domainHighlights[].domainLabel`
- `hero.domainHighlights[].primarySignalKey`
- `hero.domainHighlights[].primarySignalLabel`
- `domains[].pairSummary.pairKey`
- action list membership and ordering

These are all correctly engine-resolved from persisted scoring and ranking. They should not become separate import datasets.

## What should not be duplicated in the future model

- Do not create a separate authored source for `hero.primaryPattern`.
- Do not create a separate authored source for `hero.domainHighlights[].summary`; it should continue to reuse `signal.summary`.
- Do not create separate authored action records for strengths, watchouts, or development for MVP; those should continue to reuse signal language plus deterministic engine selection.
- Do not author the same sentence at both signal and action level.
- Do not author the same sentence at both signal and hero-domain-highlight level.
- Do not duplicate the pair summary into domain summary or hero narrative imports.

## Recommended target authoring model

### 1. Intro

- Owns `intro.assessmentDescription`
- One assessment-version-scoped authored record

### 2. Hero

- Owns `hero.headline`
- Owns `hero.narrative`
- Keyed by canonical top-two overall pattern
- Does not own `hero.primaryPattern`
- Does not own `hero.domainHighlights[].summary`

### 3. Domain Chapters

- Owns optional authored `domains[].summary`
- Owns authored `domains[].focus`
- Owns authored `domains[].pressure`
- Owns authored `domains[].environment`
- `domains[].summary` should remain optional because the engine already has a deterministic interpretation path

### 4. Signals

- Owns signal `summary`
- Owns signal `strength`
- Owns signal `watchout`
- Owns signal `development`
- These sections are reused in multiple report locations and should remain the primary authored sentence source

### 5. Pairs

- Owns `domains[].pairSummary.text`
- Pair key remains engine-derived from the top two signals in a domain
- Pair `strength` and `watchout` exist in the table/import model today but are not used in the proven final report contract

### 6. Actions

- No separate action authoring model for MVP
- Membership, ordering, and persistence remain engine-derived
- Copy should continue to reuse signal language when a signal owns the item, with deterministic fallback templates otherwise

## Answers to the key analysis questions

### Should `hero.primaryPattern` ever be separately authored?

No.

Current code derives it directly from the top-ranked overall signal in `buildHero()`. Authoring it separately would create a second truth for something the engine already determines canonically.

### Should `hero.domainHighlights[].summary` be separately authored?

No.

Current code resolves it from the top signal in each domain and reuses `signal.summary`. This is the right boundary. A separate domain-highlight summary would duplicate signal authorship.

### Should actions be separately authored?

No for MVP.

Current action blocks are deterministic selections built from scored signals. Their text already reuses signal language where the item has clear signal provenance. That gives one sentence source with multiple report uses.

### Should `domains[].summary` remain partly deterministic, or should authored language fully own it?

It should remain partly deterministic.

Current code already uses a deterministic interpretation path for every signal-group domain and then allows `domain.summary` to override it. That is the cleanest long-term model:

- deterministic fallback guarantees completeness
- authored override allows higher-quality chapter opening copy where needed
- signal and pair language remain the more granular authored sources

### Where is the clean boundary between domain, signal, pair, and overview language?

- Overview/Hero language owns the high-level report opening for the overall top-two pattern.
- Domain language owns chapter-level framing: optional chapter summary override plus focus, pressure, and environment.
- Signal language owns reusable signal-specific content: summary, strength, watchout, development.
- Pair language owns the relationship text between the top two signals inside a domain chapter.

## Awkward mappings and gaps in the current model

- `assessment_version_language_overview` is really hero language, but the current naming is legacy. The storage works; the naming is what is awkward.
- `assessment_version_language_pairs.strength` and `assessment_version_language_pairs.watchout` exist in the import/storage model but are not consumed by the final report contract.
- `assessment_version_language_overview.strengths/watchouts/development` exist in the import/storage model but are not consumed by the final report contract.
- Domain-summary ownership is currently hybrid by design, but that can look ambiguous unless documented: it is a deterministic engine summary with an optional authored override.
- A comment in `lib/engine/domain-interpretation.ts` still says `focus`, `pressure`, and `environment` are reserved even though they are active in the canonical payload.

## Non-goals for the later refactor

The later Task 7 implementation should not:

- move interpretation or language lookup into the UI
- create duplicate authored records for the same sentence in multiple sections
- make `hero.primaryPattern` separately authored
- make `hero.domainHighlights[].summary` separately authored
- introduce separate MVP action-language records when signal language already owns the copy cleanly
- introduce multiple competing import or runtime models
- change the canonical persisted result payload shape

## Recommended split for later Task 7 work

### 7.2 Import/parser compatibility layer

- Keep current tables and runtime behavior working
- Reframe imports around report-aligned groups
- Mark currently inactive sections as legacy or reserved in docs and validation messaging

### 7.3 Admin language step reorganisation

- Reorder the admin language step around Intro, Hero, Domain Chapters, Signals, and Pairs
- Preserve current storage writes
- Make reuse explicit so authors understand that signal summaries feed hero highlights and actions reuse signal language

### 7.4 Engine cleanup and alignment

- Rename or document overview language as hero language at the service/UI boundary
- Tighten comments and internal naming around domain-summary override behavior
- Leave the canonical payload unchanged

### 7.5 Legacy pathway removal and validation tightening

- Remove or explicitly mark unused overview and pair sections that are not part of the proven report contract
- Tighten preview/import guidance so authors do not create rows for sections the report never reads

## Final recommendation

The clean target model is:

- Intro: authored
- Hero: authored by overall pattern
- Domain Chapters: authored chapter sections plus optional summary override
- Signals: authored reusable signal content
- Pairs: authored relationship summary
- Actions: derived, not separately authored

That matches the proven report contract, preserves one engine-owned resolution path, and avoids duplicating language responsibility across multiple import shapes.
