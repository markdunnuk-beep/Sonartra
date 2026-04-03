# Results Language Output Map

## Scope

This audit covers the current individual result detail experience rendered at `app/(user)/app/results/[resultId]/page.tsx`.

Primary conclusion:

- The page reads a persisted canonical result payload through `createResultReadModelService()` in `lib/server/result-read-model.ts`.
- The page does not rerun engine scoring, normalization, or engine interpretation logic at read time.
- The page does still add a small amount of UI-side helper copy and formatting around the persisted payload:
  - hero fallback strings
  - domain fallback strings
  - signal context sentences in domain chapters
  - domain ring signal descriptor text and empty-state text
  - within-domain display percentages for the ring visual

So the current result detail page is engine-output-driven for the main report narrative, but not 100% free of UI-side presentational copy generation.

## 1. Results Page Section Map

| UI section | Rendered in | Payload field used | Content type | Notes |
| --- | --- | --- | --- | --- |
| Hero metadata strip | `app/(user)/app/results/[resultId]/page.tsx` `ResultDetailPage()` | `assessmentTitle`, `metadata.assessmentKey`, `version`, `generatedAt` or `createdAt` | mixed | Mostly persisted metadata; date/time is formatted in UI by `formatResultTimestamp()`. |
| Hero headline | `app/(user)/app/results/[resultId]/page.tsx` `getHeroHeading()` | `overviewSummary.headline` | imported language or deterministic computed text, with UI fallback | Primary source is persisted `overviewSummary.headline`. If blank, UI falls back to `topSignal.title`, then `"Overall pattern"`. |
| Hero narrative first paragraph | `app/(user)/app/results/[resultId]/page.tsx` `getHeroSupport()` | `overviewSummary.narrative` | imported language or deterministic computed text, with UI fallback | Primary source is persisted `overviewSummary.narrative`. UI splits persisted narrative into sentences with `splitNarrative()`. |
| Hero narrative support paragraph | `app/(user)/app/results/[resultId]/page.tsx` `getHeroSupport()` | `overviewSummary.narrative` | mixed | Derived by sentence-splitting the persisted narrative; not newly authored by engine at read time. |
| Action section header | `app/(user)/app/results/[resultId]/page.tsx` `ActionSection()` | none | static UI copy | `"Interpretation to hold onto"` and supporting sentence are static. |
| Strengths list | `app/(user)/app/results/[resultId]/page.tsx` `ActionList()` | `strengths[]` | imported language or deterministic computed text | Each item reads `title` and `detail` directly from payload. UI only truncates to first three visible items. |
| Watchouts list | `app/(user)/app/results/[resultId]/page.tsx` `ActionList()` | `watchouts[]` | imported language or deterministic computed text | Same pattern as strengths. |
| Development Focus list | `app/(user)/app/results/[resultId]/page.tsx` `ActionList()` | `developmentFocus[]` | imported language or deterministic computed text | Same pattern as strengths. |
| Domain section header | `app/(user)/app/results/[resultId]/page.tsx` `DomainSection()` | `domainSummaries.length` | mixed | Count is derived from persisted payload length; title/description copy is static UI text. |
| Domain chapter title | `app/(user)/app/results/[resultId]/page.tsx` `DomainChapter()` | `domainSummaries[*].domainTitle` | mixed | Uses persisted `domainTitle`; if blank, UI derives label from `domainKey` with `formatDomainLabel()`. |
| Domain summary paragraph | `app/(user)/app/results/[resultId]/page.tsx` `getPersistedDomainInterpretation()` | `domainSummaries[*].interpretation.summary` | imported language or deterministic computed text, with UI fallback | Primary source is persisted interpretation summary. If missing, UI shows `"A domain reading is not available for this area yet."` |
| Domain supporting line | `app/(user)/app/results/[resultId]/page.tsx` `getPersistedDomainInterpretation()` | `domainSummaries[*].interpretation.supportingLine` | deterministic computed text or static omission | Persisted only; omitted if null. No UI recomputation. |
| Domain tension line | `app/(user)/app/results/[resultId]/page.tsx` `getPersistedDomainInterpretation()` | `domainSummaries[*].interpretation.tensionClause` | deterministic computed text or static omission | Persisted only; omitted if null. No UI recomputation. |
| Domain signal ring summary line | `components/results/domain-signal-ring.tsx` | `domainSummaries[*].interpretation.summary` via ring view-model | imported language or deterministic computed text | `buildDomainSignalRingViewModel()` copies the persisted interpretation summary into `domainSummary`. |
| Domain signal ring bars | `components/results/domain-signal-ring.tsx` | `domainSummaries[*].signalScores[]` | mixed | Visual percentages are derived in UI from persisted signal scores by `normalizeWithinDomainPercents()`. |
| Domain signal ring active signal descriptor | `components/results/domain-signal-ring.tsx` `getSignalDetailCopy()` | `domainSummaries[*].signalScores[*].signalKey` / `signalTitle` | static UI copy or mixed | `resolveDomainSignalDescriptor()` in `lib/server/domain-signal-descriptor.ts` maps signal keys/titles to a local descriptor library. This is not read from canonical narrative payload fields. |
| Domain signal context sentence below ring | `app/(user)/app/results/[resultId]/page.tsx` `getDomainSignalContext()` | `domainSummaries[*].signalScores[0..1].signalTitle` | deterministic computed text in UI | Built in UI from persisted primary and secondary signal titles. |
| Additional signal context disclosure | `app/(user)/app/results/[resultId]/page.tsx` `DomainChapter()` | `domainSummaries[*].signalScores[2..]` | mixed | Signal titles come from payload; sentence shell `"also appears in this area"` is static UI copy. |
| Empty strengths/watchouts/development states | `app/(user)/app/results/[resultId]/page.tsx` `ActionList()` | none | static UI copy | `"No items available in this section."` |
| Empty domain section state | `app/(user)/app/results/[resultId]/page.tsx` `DomainSection()` | none | static UI copy | `"No persisted domain summaries are available for this result."` |
| Empty domain signal state | `app/(user)/app/results/[resultId]/page.tsx` `DomainChapter()` | none | static UI copy | `"No persisted domain signals are available for this area."` |
| Empty domain ring state | `components/results/domain-signal-ring.tsx` | none | static UI copy | `"No signal balance is available for this area yet."` and `"No signal reading is available for this area yet."` |

## 2. Canonical Payload Map

The result detail page loads a `PersistedReadyResultRecord` with `canonical_result_payload` in `lib/server/result-read-model-queries.ts`, validates it with `isCanonicalResultPayload()` in `lib/server/result-read-model.ts`, and projects it into `AssessmentResultDetailViewModel`.

The page then reads these persisted fields directly:

| Payload field | Populated in | Persisted? | UI reads directly without recomputation? |
| --- | --- | --- | --- |
| `metadata.assessmentKey` | `lib/engine/result-builder-helpers.ts` `buildPayload()` from `normalizedResult.metadata` | yes, inside `results.canonical_result_payload` via `upsertReadyResult()` in `lib/server/assessment-completion-queries.ts` | yes |
| `metadata.version` | same as above | yes | yes |
| `metadata.attemptId` | same as above | yes | yes |
| `topSignal` | `lib/engine/result-builder-helpers.ts` `buildTopSignal()` | yes | mostly yes; only used as hero fallback if overview text is blank |
| `rankedSignals[]` | `lib/engine/result-builder-helpers.ts` `buildRankedSignals()` | yes | not used by current detail page |
| `normalizedScores[]` | `lib/engine/result-builder-helpers.ts` `buildNormalizedScores()` | yes | not used by current detail page |
| `domainSummaries[]` | `lib/engine/result-builder-helpers.ts` `buildDomainSummaries()` | yes | yes for the main domain rendering contract |
| `domainSummaries[*].domainId` | same | yes | yes |
| `domainSummaries[*].domainKey` | same | yes | yes |
| `domainSummaries[*].domainTitle` | same | yes | yes, except UI derives a fallback label if blank |
| `domainSummaries[*].domainSource` | normalization output carried through builder | yes | yes |
| `domainSummaries[*].signalScores[]` | normalization output carried through builder after canonical sorting | yes | yes for signal lists and ring input; ring percentages are presentation-derived from these values |
| `domainSummaries[*].interpretation.summary` | `lib/engine/domain-interpretation.ts` `buildDomainInterpretation()` | yes | yes |
| `domainSummaries[*].interpretation.supportingLine` | same | yes | yes |
| `domainSummaries[*].interpretation.tensionClause` | same | yes | yes |
| `overviewSummary.headline` | `lib/engine/result-interpretation.ts` `buildOverviewSummary()` | yes | yes, with UI fallback only when blank |
| `overviewSummary.narrative` | `lib/engine/result-interpretation.ts` `buildOverviewSummary()` | yes | yes, with UI fallback only when blank |
| `strengths[]` | `lib/engine/result-interpretation.ts` `buildStrengths()` | yes | yes |
| `watchouts[]` | `lib/engine/result-interpretation.ts` `buildWatchouts()` | yes | yes |
| `developmentFocus[]` | `lib/engine/result-interpretation.ts` `buildDevelopmentFocus()` | yes | yes |
| `diagnostics` | `lib/engine/result-builder-helpers.ts` `buildDiagnostics()` | yes | not used by current detail page |

Persistence path:

1. `createAssessmentCompletionService()` in `lib/server/assessment-completion-service.ts` runs the engine.
2. `runAssessmentEngine()` in `lib/engine/engine-runner.ts` builds the canonical payload.
3. `upsertReadyResult()` in `lib/server/assessment-completion-queries.ts` stores the payload as `results.canonical_result_payload`.
4. `createResultReadModelService()` in `lib/server/result-read-model.ts` reads the persisted payload back without rerunning engine logic.

## 3. Language Source Resolution Map

### Overview summary

- Field: `overviewSummary.headline`
- Source: `Overview_Language.headline` for the resolved canonical top-two pattern key
- Resolver: `lib/engine/result-interpretation.ts` `resolveOverviewTemplateHeadline()`
- Key used: `resolveCanonicalOverviewPatternKey()` derives a canonical pair key from the top two ranked signals using `canonicalizeSignalPairKey()`
- Fallback: signal template headline from `getSignalTemplate(topSignal.signalKey).headline`

- Field: `overviewSummary.narrative`
- Source: `Pair_Language.summary` for the resolved canonical top-two pattern key
- Resolver: `lib/engine/result-interpretation.ts` `resolvePairLanguageSummary()`
- Key used: same canonical pair key resolved by `resolveCanonicalOverviewPatternKey()`
- Fallback: deterministic overview narrative built by `buildOverviewSummary()` from the top signal template `hero` + either:
  - template `impact`, or
  - a balanced-distribution sentence mentioning the second-ranked signal

Important current behavior:

- `Overview_Language.summary` is not used by the current engine result builder.
- `Overview_Language.strengths`, `Overview_Language.watchouts`, and `Overview_Language.development` are also not used by the current result builder.
- The overview headline and narrative therefore come from two different datasets when imported:
  - headline from `Overview_Language.headline`
  - narrative from `Pair_Language.summary`

### Strengths

- Field: `strengths[*].detail`
- Source: `Signal_Language.strength`
- Resolver: `lib/engine/result-interpretation.ts` `resolveSignalLanguageSection(signalKey, 'strength', context)`
- Key used: each selected signal's `signalKey`
- Fallback: deterministic signal template `strength` from `getSignalTemplate(signalKey).strength`

- Field: `strengths[*].title`
- Source: none of the import datasets
- Resolver: `lib/engine/result-interpretation.ts` `getActionFocusSignalLabel()`
- Fallback: deterministic label based on signal key or signal title

### Watchouts

- Field: `watchouts[0].detail` for the top-signal overuse bullet
- Source: `Signal_Language.watchout`
- Resolver: `lib/engine/result-interpretation.ts` `resolveSignalLanguageSection(signalKey, 'watchout', context)`
- Key used: top-ranked signal `signalKey`
- Fallback: deterministic signal template `watchout`

- Field: rule-based pressure bullet, if present
- Source: no import dataset
- Resolver: `lib/engine/result-interpretation.ts` `RULE_BASED_WATCHOUTS`
- Key used: top-five signal key presence set
- Fallback: none; this bullet is hard-coded deterministic text

- Field: low-access bullet detail
- Source: `Signal_Language.watchout`
- Resolver: `resolveSignalLanguageSection(lowestSignal.signalKey, 'watchout', context)`
- Key used: lowest-ranked qualifying signal `signalKey`
- Fallback: deterministic signal template `lowSignalRisk`

### Development focus

- Field: `developmentFocus[*].detail`
- Source: `Signal_Language.development`
- Resolver: `lib/engine/result-interpretation.ts` `resolveSignalLanguageSection(signalKey, 'development', context)`
- Key used: each selected lower-ranked signal `signalKey`
- Fallback: deterministic signal template `development`

### Domain summary text

- Field: `domainSummaries[*].interpretation.summary`
- Source: `Domain_Language.summary`
- Resolver: `lib/engine/domain-interpretation.ts` `resolveDomainLanguageSummary()`
- Key used: `domainSummary.domainKey`
- Fallback:
  - for core signal-group domains, pairwise rule text from `buildPairwiseSummary()` when a matching pair rule exists
  - otherwise fragment-based fallback from `buildFallbackSummary()`
  - for empty core domains, fixed empty-domain summary from `DOMAIN_EMPTY_SUMMARIES`

- Field: `domainSummaries[*].interpretation.supportingLine`
- Source: no import dataset currently used
- Resolver: `lib/engine/domain-interpretation.ts` `buildSupportLine()`
- Key used: primary/secondary domain signals and any pairwise rule support line
- Fallback: deterministic supporting sentence

- Field: `domainSummaries[*].interpretation.tensionClause`
- Source: no import dataset currently used
- Resolver: `lib/engine/domain-interpretation.ts` `buildTensionClause()`
- Key used: primary/secondary domain signals and any pairwise rule tension clause
- Fallback: deterministic tension/risk sentence

### Signal-specific narrative shown in domain sections

There are two different signal-related outputs in the domain section:

1. Persisted engine output
- Field: `domainSummaries[*].signalScores[*]`
- Use: feeds the ring visual and visible signal ordering
- Source dataset: none; scoring output, not language import

2. UI-only helper copy
- Field basis: `domainSummaries[*].signalScores[*].signalKey` and `signalTitle`
- Resolver: `lib/server/domain-signal-descriptor.ts` `resolveDomainSignalDescriptor()`
- Source: local descriptor map `SONARTRA_SIGNAL_DESCRIPTOR_BY_KEY` / `SONARTRA_SIGNAL_DESCRIPTOR_BY_LABEL`, with optional description field if present
- Fallback: `"A short descriptor is not available for this signal yet."` in `components/results/domain-signal-ring.tsx`

Also note:

- `app/(user)/app/results/[resultId]/page.tsx` `getDomainSignalContext()` creates UI sentences such as `"X is most evident in this area..."` from persisted signal titles.
- This is not sourced from any language import dataset.

### Pair-specific narrative

- Persisted field affected: `overviewSummary.narrative`
- Source: `Pair_Language.summary`
- Resolver: `lib/engine/result-interpretation.ts` `resolvePairLanguageSummary()`
- Key used: canonical top-two signal pair from `resolveCanonicalOverviewPatternKey()`
- Fallback: deterministic overview summary from signal templates

No current results-page field uses:

- `Pair_Language.strength`
- `Pair_Language.watchout`

## 4. Unused / Partial / Overlapping Language Audit

### Unused imported language

- `Signal_Language.summary`
  - Stored in `assessment_version_language_signals`
  - Defined in `db/migrations/202604010001_assessment_version_language_tables.sql`
  - Exposed in bundle type `AssessmentVersionLanguageSignalSection`
  - Not consumed by `lib/engine/result-interpretation.ts`
  - Affected UI section: none on the current individual results page

- `Pair_Language.strength`
  - Stored in `assessment_version_language_pairs`
  - Not consumed by current result builder
  - Affected UI section: none

- `Pair_Language.watchout`
  - Stored in `assessment_version_language_pairs`
  - Not consumed by current result builder
  - Affected UI section: none

- `Domain_Language.focus`
  - Stored in `assessment_version_language_domains`
  - Not consumed by `buildDomainInterpretation()`
  - Affected UI section: none

- `Domain_Language.pressure`
  - Stored in `assessment_version_language_domains`
  - Not consumed by `buildDomainInterpretation()`
  - Affected UI section: none

- `Domain_Language.environment`
  - Stored in `assessment_version_language_domains`
  - Not consumed by `buildDomainInterpretation()`
  - Affected UI section: none

- `Overview_Language.summary`
  - Stored in `assessment_version_language_overview`
  - Not consumed by `buildOverviewSummary()`
  - Current narrative comes from `Pair_Language.summary` instead
  - Affected UI section: hero / overview narrative

- `Overview_Language.strengths`
  - Stored in `assessment_version_language_overview`
  - Not consumed by current result builder
  - Affected UI section: none

- `Overview_Language.watchouts`
  - Stored in `assessment_version_language_overview`
  - Not consumed by current result builder
  - Affected UI section: none

- `Overview_Language.development`
  - Stored in `assessment_version_language_overview`
  - Not consumed by current result builder
  - Affected UI section: none

### Partially used datasets

- `Signal_Language`
  - Used sections: `strength`, `watchout`, `development`
  - Unused section: `summary`
  - Current responsibility on page: action lists only

- `Pair_Language`
  - Used section: `summary`
  - Unused sections: `strength`, `watchout`
  - Current responsibility on page: overview narrative only

- `Domain_Language`
  - Used section: `summary`
  - Unused sections: `focus`, `pressure`, `environment`
  - Current responsibility on page: domain summary paragraph only

- `Overview_Language`
  - Used section: `headline`
  - Unused sections: `summary`, `strengths`, `watchouts`, `development`
  - Current responsibility on page: overview headline only

### Overlap / duplicated meaning

- `Pair_Language.summary` vs `Overview_Language.summary`
  - Both appear intended to author overview-level narrative by top-two pattern.
  - Current engine uses only `Pair_Language.summary` for `overviewSummary.narrative`.
  - This is the clearest overlap in the current model.

- `Domain_Language.summary` vs deterministic pairwise domain rules in `lib/engine/domain-interpretation.ts`
  - Both author the same `domainSummaries[*].interpretation.summary` field.
  - Imported domain summary fully overrides the fallback summary, while fallback support/tension lines remain.

- `Signal_Language.watchout` vs deterministic watchout templates and rule-based watchouts
  - Signal language only overrides signal-led bullets.
  - Rule-based pressure bullets still come from local hard-coded rules.
  - Result: the watchouts section can mix imported and fully deterministic copy in one list.

- `Signal_Language.*` vs UI signal descriptor map
  - Action sections use imported signal language.
  - Domain ring descriptors use `lib/server/domain-signal-descriptor.ts`, a separate local map not tied to the language tables.
  - This creates two independent signal-copy systems on the same page.

### Simplification opportunities

- Clarify whether overview narrative ownership belongs to `Pair_Language.summary` or `Overview_Language.summary`; keeping both is ambiguous.
- Clarify whether the domain ring descriptor copy should remain a UI concern or become part of persisted signal/domain output.
- Remove or formally reserve unused import columns/sections if they are not part of the current report contract.

## 5. End-to-End Flow

```text
Admin language input
  -> components/admin/admin-*-language-import.tsx
  -> lib/server/admin-*-language-import-actions.ts
  -> lib/server/admin-*-language-import.ts preview/import functions
  -> parse/validate rows in lib/admin/*-language-import.ts
  -> replaceAssessmentVersionLanguage*() in lib/server/assessment-version-language.ts
  -> write to assessment_version_language_signals / pairs / domains / overview
     keyed by assessment_version_id

Assessment completion
  -> lib/server/assessment-completion-service.ts completeAssessmentAttempt()
  -> load persisted responses
  -> runAssessmentEngine() in lib/engine/engine-runner.ts
  -> repository.getAssessmentVersionLanguageBundle()
  -> getAssessmentVersionLanguageBundle() in lib/server/assessment-version-language.ts
  -> buildCanonicalResultPayload() in lib/engine/result-builder.ts
     -> buildDomainSummaries()
     -> buildOverviewSummary()
     -> buildStrengths()
     -> buildWatchouts()
     -> buildDevelopmentFocus()
  -> upsertReadyResult() in lib/server/assessment-completion-queries.ts
  -> persist JSON payload to results.canonical_result_payload

Result retrieval
  -> createResultReadModelService() in lib/server/result-read-model.ts
  -> getReadyResultDetailForUser() in lib/server/result-read-model-queries.ts
  -> validate canonical payload shape
  -> project payload into AssessmentResultDetailViewModel

UI rendering
  -> app/(user)/app/results/[resultId]/page.tsx
  -> getResultDetailDomains()
  -> buildDomainSignalRingViewModel()
  -> render hero, action lists, and domain chapters from persisted payload
  -> add small presentational helper copy in the UI layer
```

## 6. Recommended Next Actions

1. No-code clarification: decide whether overview narrative ownership should live in `Pair_Language.summary` or `Overview_Language.summary`. The current split between overview headline and overview narrative is not obvious.
2. No-code clarification: document that the current results page is payload-driven for report sections, but still contains UI-only helper copy for ring descriptors, empty states, and some fallback sentences.
3. Small safe refactor: add an explicit audit note to `docs/results-pages-wiring.md` or `docs/result-read-model.md` listing the exact payload fields the page consumes.
4. Small safe refactor: either remove unused language sections from the import contract, or mark them as reserved/not yet surfaced so authors do not expect them to appear in results.
5. Small safe refactor: consider moving domain ring signal descriptors out of UI-local maps into a persisted/published data source if they are meant to be part of the authored report language contract.
6. Small safe refactor: if the contract requires zero UI prose generation, move `getDomainSignalContext()` and hero/domain fallback strings behind persisted payload fields or explicit server-side view-model fields.

## Validation Notes

- Current detail route: `app/(user)/app/results/[resultId]/page.tsx`
- Persisted payload read-model: `lib/server/result-read-model.ts`
- Result query layer: `lib/server/result-read-model-queries.ts`
- Engine entry point: `lib/engine/engine-runner.ts`
- Result builder: `lib/engine/result-builder.ts`, `lib/engine/result-builder-helpers.ts`
- Overview / strengths / watchouts / development logic: `lib/engine/result-interpretation.ts`
- Domain interpretation logic: `lib/engine/domain-interpretation.ts`
- Language storage/repository: `lib/server/assessment-version-language.ts`
- Version-scoped language schema: `db/migrations/202604010001_assessment_version_language_tables.sql`
- UI signal descriptor layer: `lib/server/domain-signal-descriptor.ts`
- Relevant behavior tests:
  - `tests/result-detail-page-domain-rendering.test.ts`
  - `tests/result-read-model.test.ts`
  - `tests/assessment-completion-service.test.ts`
  - `tests/engine-result-builder.test.ts`
