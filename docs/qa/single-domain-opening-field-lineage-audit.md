# Single-Domain Opening Field Lineage Audit

Date: 26 April 2026

## 1. Executive finding

The opening value pass did not change the single-domain language library, language import schemas, database language tables, `DRIVER_CLAIMS`, scoring, result payload generation, or result-builder logic.

The new visible H1, `Results-led pattern, reinforced by Process`, is a derived presentation-layer title created in `lib/server/single-domain-results-view-model.ts`. It is composed from already-persisted ranked signal labels in the canonical single-domain result payload:

- `payload.signals[]` sorted by `rank`
- primary `payload.signals[0].signal_label`
- secondary `payload.signals[1].signal_label`

The assessment builder does not currently author that H1 as a persisted language field. This is acceptable as a narrow presentation-layer title because it does not introduce scoring or alternate payload generation, but it is a builder-alignment gap if the intended product contract is that every prominent first-screen heading is author-controlled.

## 2. Files inspected

Commit diffs inspected:

- `46e3226 Improve single-domain result opening value`
- `c37e1a8 Format single-domain opening signal labels`
- `fb2c531 Document single-domain opening value pass`

Primary runtime files inspected:

- `components/results/single-domain-result-report.tsx`
- `lib/server/single-domain-results-view-model.ts`
- `lib/assessment-language/single-domain-composer.ts`
- `lib/server/single-domain-completion.ts`
- `lib/types/single-domain-result.ts`
- `lib/types/single-domain-language.ts`
- `lib/assessment-language/single-domain-import-mappers.ts`
- `lib/server/assessment-version-single-domain-language.ts`
- `lib/results/single-domain-reading-sections.ts`

Language and lineage references inspected:

- `db/migrations/202604120001_assessment_version_single_domain_language.sql`
- `db/migrations/202604260001_pair_scoped_single_domain_driver_claims.sql`
- `docs/results/gold-standard-language/authoring-csv/single_domain_intro.csv`
- `docs/results/gold-standard-language/authoring-csv/single_domain_hero_pairs.csv`
- `docs/results/gold-standard-language/authoring-csv/single_domain_pair_summaries.csv`
- `docs/results/gold-standard-language/authoring-csv/single_domain_limitations.csv`
- `docs/results/gold-standard-language/authoring-csv/single_domain_drivers_full.csv`
- `docs/results/single-domain-language-assembly-audit.md`
- `docs/qa/single-domain-result-opening-value-pass.md`

Required architecture references checked:

- `docs/engine-contract-context.txt`
- `docs/wplp80-seed-context.txt`
- `docs/sonartra-build-task-roadmap.txt`
- `docs/insights-report-reference.txt`
- `docs/design-inspiration-reference.txt`
- `docs/wplp80-extraction-mapping.md`

## 3. Commit diff summary

### `46e3226 Improve single-domain result opening value`

Changed files:

- `app/globals.css`
- `components/results/single-domain-result-report.tsx`
- `lib/server/single-domain-results-view-model.ts`
- `tests/single-domain-results-report.test.tsx`

Summary:

- Added `SingleDomainResultsOpeningSummary` and `createOpeningSummary()`.
- Replaced the intro header eyebrow/title/lead source from `assessmentTitle` + `report.domainTitle` + intro prompt with `openingSummary.eyebrow`, `openingSummary.title`, and `openingSummary.diagnosis`.
- Added the `OpeningEvidencePanel` with hardcoded UI label `Why this result was generated`.
- Moved metadata below the opening summary.
- Added CSS for the new opening layout and evidence panel.
- Added report tests for the new opening strings.

No changed files in this commit are builder authoring files, language import files, database migrations, seed language files, `DRIVER_CLAIMS`, completion, scoring, or result-builder files.

### `c37e1a8 Format single-domain opening signal labels`

Changed files:

- `lib/server/single-domain-results-view-model.ts`

Summary:

- Wrapped opening labels with existing display-formatting helpers.
- Changed `payload.hero.hero_opening` detail display through `formatNarrativeText()`.
- Changed the missing-range value to format `payload.balancing.balancing_section_title`.

No language source or persisted data path changed.

### `fb2c531 Document single-domain opening value pass`

Changed files:

- `docs/qa/single-domain-result-opening-value-pass.md`
- `docs/qa/screenshots/single-domain-result-opening-desktop.png`
- `docs/qa/screenshots/single-domain-result-opening-mobile.png`

Summary:

- Added QA documentation and screenshots only.
- The document explicitly records that scoring, result generation, payload shape, routes, database schema, `DRIVER_CLAIMS`, and authoring/import schemas were not changed.

## 4. Field lineage table

| Visible text | Source file/component | Classification | Underlying persisted fields | Builder controls it today? |
| --- | --- | --- | --- | --- |
| `Results-led pattern, reinforced by Process` | `lib/server/single-domain-results-view-model.ts`, `createOpeningSummary()`; rendered by `components/results/single-domain-result-report.tsx` as `ReportHeader.title` | Derived display text using hardcoded template | `payload.signals[].rank`, `payload.signals[].signal_label`; labels are display-normalised by `formatDisplayLabel()` | Not directly. Builder/import controls the language and signal model that ultimately produce persisted result labels, but there is no builder field for this exact H1 or template. |
| `Your leadership pattern` | `lib/server/single-domain-results-view-model.ts`, `createOpeningSummary()`; rendered as `ReportHeader.eyebrow` | Hardcoded UI/view-model label | None | No. |
| `Why this result was generated` | `components/results/single-domain-result-report.tsx`, `OpeningEvidencePanel` `aria-label` and kicker text | Hardcoded UI label | None | No. |
| `Blueprint - Understand how you lead` | Persisted assessment title loaded from `assessments.title`, then stored on `payload.metadata.assessmentTitle`; shown in metadata by `lib/server/single-domain-results-view-model.ts` and `MetadataCard` | Persisted assessment metadata | `payload.metadata.assessmentTitle`; runtime source is `a.title AS assessment_title` in the single-domain runtime/read-model path | Yes for assessment metadata/admin assessment title, not through the single-domain language authoring sections. |
| `results and process` | Lowercase/styled rendering of the hero section title/content path. Current authored language for the target pair is in `payload.hero.hero_headline`; fallback generation can use `${primary.signal_label} and ${secondary.signal_label}` in `lib/server/single-domain-completion.ts`. The display is cleaned by `cleanComposedReport()` / `formatDisplayLabel()` before `SingleDomainResultSection` renders it. | Persisted language when a `HERO_PAIRS` row exists; fallback-derived text if no pair-specific row exists | `payload.hero.hero_headline`, backed by `assessment_version_single_domain_hero_pairs.hero_headline` from `SINGLE_DOMAIN_HERO` / `HERO_PAIRS`; fallback uses ranked signal labels | Yes, if sourced from the `HERO_PAIRS` import/builder language row. No, if the result is using fallback language because the pair row is absent. |

## 5. Whether the language library changed

No language library change was found in the inspected commits.

The following did not change in `46e3226`, `c37e1a8`, or `fb2c531`:

- assessment builder language authoring code
- language import schemas
- language CSV files
- database seed language files
- Supabase language table mappings
- `DRIVER_CLAIMS`
- single-domain completion/result payload generation
- scoring/result builder logic

The opening value pass changed only rendering/composition around the persisted payload and added QA documentation/screenshots.

## 6. Whether assessment builder controls each visible text

| Visible text | Builder control status |
| --- | --- |
| `Results-led pattern, reinforced by Process` | Not directly controlled. It is composed from persisted ranked signal labels using a view-model template. |
| `Your leadership pattern` | Not controlled. It is a hardcoded view-model label. |
| `Why this result was generated` | Not controlled. It is a hardcoded component label. |
| `Blueprint - Understand how you lead` | Controlled as assessment metadata/title, not as single-domain report language. |
| `results and process` | Controlled when it comes from the `HERO_PAIRS`/`SINGLE_DOMAIN_HERO` language row; fallback-derived if that row is unavailable for the pair. |

## 7. Builder alignment gaps

The new H1 is a presentation-layer title, not persisted language. It is deterministic and derived from the canonical payload, so it does not violate the engine contract or single-result-pipeline rule.

The alignment gap is product/editorial rather than engine-critical:

- The builder currently controls authored intro, hero, driver, pair, limitation, and application language.
- The builder does not expose a first-screen opening title template or override field.
- The opening label `Your leadership pattern` and evidence panel label `Why this result was generated` are UI labels, not authored language.
- If the assessment-builder contract is meant to cover all first-screen report language, the new H1 and opening labels should either be documented as fixed UI chrome or promoted into the single-domain language schema in a future, deliberate schema task.

## 8. Recommendation

Treat `Results-led pattern, reinforced by Process` as an acceptable presentation-layer title for the current pass. It is deterministic, payload-derived, and did not alter scoring, persistence, language imports, or database mappings.

Recommended next step:

Document the opening H1 as a fixed view-model composition rule in the single-domain narrative/result contract. If editorial control is required later, add a dedicated builder/schema task for an opening-title template rather than slipping it into the current rendering layer or overloading existing intro/hero fields.
