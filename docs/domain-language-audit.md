# Domain Language Audit

Date: 2026-04-07

Purpose: map the current language and domain chapter pipeline without changing runtime behavior.

## Scope

Reviewed the current engine, language repository, admin import flow, result read-model, and results page rendering for:

- domain chapter summary / focus / pressure / environment
- signal language
- pair language
- hero header / overview compatibility
- pair usage in the canonical result payload

## 1. Current Domain Chapter Fields

Canonical domain chapter shape lives in `lib/engine/types.ts` as `ResultDomainChapter`:

- `domainKey`
- `domainLabel`
- `summary`
- `focus`
- `pressure`
- `environment`
- `primarySignal`
- `secondarySignal`
- `pairSummary`
- `signals`

Current source ownership in `lib/engine/result-builder-helpers.ts`:

- `domains[*].summary`
  - built from `domainSummary.interpretation.summary`
  - interpretation is produced by `buildDomainInterpretation(...)`
  - deterministic pairwise / fragment / single-signal fallback is engine-owned
  - optional authored override comes from `languageBundle.domains[domainKey].summary`
- `domains[*].focus`
  - direct domain-language lookup
  - source: `assessment_version_language_domains.section = 'focus'`
- `domains[*].pressure`
  - direct domain-language lookup
  - source: `assessment_version_language_domains.section = 'pressure'`
- `domains[*].environment`
  - direct domain-language lookup
  - source: `assessment_version_language_domains.section = 'environment'`
- `domains[*].primarySignal` / `secondarySignal`
  - selected from the top two persisted domain signals
  - summary / strength / watchout / development come from signal language
- `domains[*].pairSummary`
  - `pairKey` is derived from the top two domain signals
  - `text` comes from pair language summary only

`domainFocus` does not exist in the current canonical payload or active UI. Search results show no active `domainFocus` references; the live field name is `focus`.

`pressureFocus` and `environmentFocus` also do not exist as active field names. The canonical fields are `pressure` and `environment`.

## 2. Language Ownership Today

### Domain language

Storage:

- `assessment_version_language_domains`
- sections: `summary`, `focus`, `pressure`, `environment`

Current ownership:

- `summary` can override the engine-computed domain interpretation summary
- `focus`, `pressure`, `environment` are fully authored domain chapter fields

Important constraint:

- admin import only allows signal-group domains as valid targets
- import path explicitly loads domain keys from `domains.domain_type = 'SIGNAL_GROUP'`

### Signal language

Storage:

- `assessment_version_language_signals`
- sections: `summary`, `strength`, `watchout`, `development`

Current ownership:

- feeds `domains[*].primarySignal.*`
- feeds `domains[*].secondarySignal.*`
- feeds `hero.domainHighlights[*].summary` using the primary signal summary
- feeds canonical action blocks:
  - strengths
  - watchouts
  - developmentFocus

### Pair language

Storage:

- `assessment_version_language_pairs`
- repository type still allows `summary`, `strength`, `watchout`

Current active ownership:

- only `summary` is authorable in the supported import path
- active runtime usages:
  - `domains[*].pairSummary.text`
  - `hero.narrative` fallback path in `lib/engine/result-interpretation.ts`

Inactive / legacy allowance:

- repository types and table ordering still mention pair `strength` and `watchout`
- supported admin report-language import explicitly rejects those fields as legacy-only

### Hero header / overview compatibility

Split ownership:

- Hero headline:
  - preferred active source is `assessment_version_language_hero_headers`
  - used for `hero.headline`
- Hero narrative compatibility:
  - report-language `hero` rows still write into `assessment_version_language_overview`
  - `headline` maps to overview `headline`
  - `narrative` maps to overview `summary`

Current runtime reality:

- canonical Hero engine output comes from `heroDefinition.patternLanguage` when present
- fallback overview builder uses hero header + pair summary + signal templates
- overview strengths/watchouts/development are not used by the current result builder

## 3. Result Builder Mapping

Core execution path:

1. `lib/engine/engine-runner.ts`
   - loads definition
   - loads version-scoped language bundle
   - scores responses
   - normalizes scores
   - calls canonical result builder

2. `lib/engine/result-builder-helpers.ts`
   - builds persisted canonical payload

3. `lib/engine/domain-interpretation.ts`
   - computes domain interpretation summary
   - summary override can come from domain language

Detailed mapping:

- `hero.headline`
  - Hero engine pattern headline if `heroDefinition` exists
  - otherwise hero header language by derived top pair
  - otherwise top-signal fallback headline
- `hero.narrative`
  - Hero engine narrative if `heroDefinition` exists
  - otherwise pair summary by derived top pair
- `hero.summary`, `hero.subheadline`, `hero.pressureOverlay`, `hero.environmentOverlay`
  - Hero engine only
- `domains[*].summary`
  - deterministic interpretation summary with optional domain summary override
- `domains[*].focus`, `pressure`, `environment`
  - domain-language direct lookup
- `domains[*].primarySignal.*`, `secondarySignal.*`
  - signal-language lookup
- `domains[*].pairSummary.text`
  - pair-language summary lookup
- `actions.*`
  - signal-language strength / watchout / development when present
  - otherwise deterministic fallback templates / rules

Fallback and mixing behavior:

- domain summary is hybrid:
  - deterministic engine interpretation
  - optionally replaced by authored domain summary
- focus / pressure / environment do not have engine fallbacks
- pair summary is optional and may be null even when `pairKey` exists
- action blocks can mix authored signal text with deterministic rule-based lines
- results page ring view-model can fall back from signal chapter text to action text for strength/watchout/development

## 4. UI Rendering

Primary user result page:

- `app/(user)/app/results/[resultId]/page.tsx`

Rendering behavior:

- result page reads persisted `result.domains`
- does not compute scores or interpretations in the UI
- renders domain chapters in persisted order
- shows:
  - `domain.summary`
  - `domain.focus`
  - `domain.pressure`
  - `domain.environment`
  - signal ring
  - `primarySignal.summary`
  - `secondarySignal.summary`
  - `pairSummary.text` if present
  - hidden extra signal labels for signals ranked below the top two

Pair usage in UI:

- pair is not structurally primary in the domain chapter
- pair summary is rendered as a short italic line after the signal reading
- the visual primary structure is:
  - chapter summary
  - focus / pressure / environment
  - signal ring
  - primary / secondary signal blocks

Ring view-model:

- `lib/server/domain-signal-ring-view-model.ts`
- when built from canonical `domains`, it:
  - preserves authored signal order
  - uses chapter signal summaries first
  - falls back to action text for strength / watchout / development

Compatibility projection:

- `lib/server/result-read-model.ts` builds `domainSummaries` from canonical `domains`
- this is a compatibility shape for older consumers/tests
- it maps:
  - `domain.summary -> interpretation.summary`
  - `domain.focus -> interpretation.supportingLine`
  - `domain.pressure -> interpretation.tensionClause`
- `environment` is not represented in that compatibility interpretation object

## 5. Admin Builder / Stage 8 Language Structure

Language step entry:

- `app/(admin)/admin/assessments/[assessmentKey]/language/page.tsx`
- `components/admin/admin-assessment-language-step.tsx`
- `lib/server/admin-assessment-language-step.ts`

Current structure:

- one shared report-language import surface for:
  - hero header
  - domain
  - signal
  - pair
- separate Hero engine dataset import surface for:
  - pair trait weights
  - hero pattern rules
  - hero pattern language

Report-language import dispatch:

- `lib/server/admin-language-dataset-import-actions.ts`
- `heroHeader` routes to `admin-hero-header-language-import`
- `domain` / `signal` / `pair` route to `admin-report-language-import`

Supported report-language authoring model:

- `lib/admin/report-language-import.ts`
- accepted rows:
  - `hero | <pair> | headline|narrative | ...`
  - `domain | <domainKey> | summary|focus|pressure|environment | ...`
  - `signal | <signalKey> | summary|strength|watchout|development | ...`
  - `pair | <pair> | summary | ...`

Explicitly blocked in the supported import path:

- actions authoring
- hero primaryPattern / domainHighlights authoring
- pair strength / watchout
- legacy hero strengths / watchouts / development

## 6. Import Paths

Report-language import path:

- parse: `lib/admin/report-language-import.ts`
- preview / execution: `lib/server/admin-report-language-import.ts`
- persistence: `lib/server/assessment-version-language.ts`

Dataset storage targets:

- hero rows -> overview table compatibility layer
- domain rows -> `assessment_version_language_domains`
- signal rows -> `assessment_version_language_signals`
- pair rows -> `assessment_version_language_pairs`

Hero header import path:

- parse / validate: `lib/admin/hero-header-language-import.ts`
- preview / execution: `lib/server/admin-hero-header-language-import.ts`
- persistence: `assessment_version_language_hero_headers`

## 7. Pair Usage vs Bypass

Active pair usage:

- domain chapter pair key derivation from top two domain signals
- domain chapter pair summary text lookup
- hero narrative fallback uses top overall pair summary
- hero headline fallback uses top overall hero header pair
- Hero engine itself uses pair trait weights and pattern language as canonical pair-driven logic

Bypass / non-usage:

- domain chapter summary is not built from pair language
- it is built from domain interpretation logic first
- pair strength/watchout are defined in legacy storage types but not used by the supported import path or result builder
- UI domain layout is signal-led, not pair-led

## 8. Risks / Issues

1. Hybrid ownership of domain summary
   - `domains[*].summary` is both engine-derived and optionally domain-authored
   - this is intentional in code, but it means summary ownership is not single-source the way focus/pressure/environment are

2. Legacy pair sections still exist in repository types
   - pair `strength` and `watchout` remain in `assessment-version-language-types.ts`
   - the supported import path rejects them
   - storage shape therefore advertises more than the runtime actively uses

3. Hero report-language import is still overview-backed
   - report-language hero rows do not write to the hero header table
   - hero header has its own separate import surface
   - this keeps compatibility but splits authoring ownership across two stores

4. Ring view-model mixes chapter-local and action language
   - `buildDomainSignalRingViewModel(...)` falls back to action text for strength/watchout/development
   - this can blur the line between signal-level authored language and global action output

5. Compatibility read-model repurposes fields
   - `result-read-model.ts` maps `focus` to `supportingLine` and `pressure` to `tensionClause`
   - `environment` is dropped from that compatibility interpretation object
   - this is not the canonical payload, but it is still a coupling point for legacy consumers/tests

6. Silent nulls remain in some chapter sections
   - focus / pressure / environment have no deterministic fallback
   - pair summary can resolve to `{ pairKey, text: null }`
   - result page simply omits absent text, which is safe but silent

7. Domain key validation is narrower than raw storage capability
   - import path only accepts signal-group domains
   - that is correct for current results, but it means the repository storage shape is broader than the supported authoring path

## 9. Test Coverage

Strong coverage present:

- result builder
  - `tests/engine-result-builder.test.ts`
  - `tests/engine-runner.test.ts`
  - `tests/domain-interpretation.test.ts`
- domain rendering
  - `tests/result-detail-page-domain-rendering.test.ts`
  - `tests/domain-signal-ring-view-model.test.ts`
  - `tests/domain-signal-ring.test.tsx`
  - `tests/result-read-model.test.ts`
- language import / storage
  - `tests/report-language-import.test.ts`
  - `tests/admin-report-language-import.test.ts`
  - `tests/admin-assessment-language-route.test.tsx`
  - `tests/assessment-version-language-repository.test.ts`
  - `tests/assessment-language-repository.test.ts`

Notable gaps:

- no active test asserting that `domainFocus` / `pressureFocus` / `environmentFocus` are absent from the canonical contract
- no dedicated test asserting `environment` is preserved or intentionally omitted in compatibility `domainSummaries[*].interpretation`
- no dedicated test asserting ring-model fallback to action text does not mask missing signal-language ownership incorrectly
- no dedicated test covering pair-summary-null behavior when `pairKey` exists but `text` is absent
- no dedicated test covering report-language domain import rejection for non-`SIGNAL_GROUP` domains by intent
- no dedicated end-to-end test proving hero report-language overview rows and hero-header rows do not conflict in an unexpected way

## 10. Validation Checklist

- [x] All `domainFocus` references identified
- [x] All language import paths mapped
- [x] Result builder fully understood
- [x] Pair usage vs bypass clearly identified
- [x] Stage 8 language structure documented
- [x] Test coverage gaps identified

## File Set Reviewed

- `lib/engine/engine-runner.ts`
- `lib/engine/result-builder-helpers.ts`
- `lib/engine/domain-interpretation.ts`
- `lib/engine/result-interpretation.ts`
- `lib/engine/types.ts`
- `lib/server/assessment-version-language.ts`
- `lib/server/assessment-version-language-types.ts`
- `lib/server/assessment-language-repository.ts`
- `lib/server/admin-report-language-import.ts`
- `lib/server/admin-hero-header-language-import.ts`
- `lib/server/admin-language-dataset-import-actions.ts`
- `lib/server/admin-assessment-language-step.ts`
- `lib/server/result-read-model.ts`
- `lib/server/result-read-model-types.ts`
- `lib/server/domain-signal-ring-view-model.ts`
- `lib/admin/report-language-import.ts`
- `lib/admin/pair-language-import.ts`
- `components/admin/admin-assessment-language-step.tsx`
- `components/admin/admin-language-dataset-import.tsx`
- `app/(user)/app/results/[resultId]/page.tsx`
- relevant tests under `tests/`
