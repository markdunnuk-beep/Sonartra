# Leadership Results Process Import Validation

## Purpose

This note records the local import and rendered-page validation for the gold-standard Leadership `results_process` single-domain language. It covers the section-first import source, storage landing checks, deterministic result refresh, browser validation, and remaining risks.

## Source

- Source rows: `docs/results/gold-standard-language/leadership-results-process-pipe-imports.md`
- Target result route: `/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`
- Assessment version: Leadership `1.0.0`, published single-domain version `0e78d8e9-7945-4f39-b4dc-2f53a3e54178`
- Runtime pair key: `results_process`

## Import Method Used

The current local Leadership version is published and has no draft version, so the full admin action path was not available for direct execution. The import used the same section-first import stack that backs the admin language builder:

- section-first pipe parser
- section-first dataset validator
- pair-key runtime canonicalisation
- section-first to legacy-backed mapper
- single-domain narrative storage service

The direct legacy dataset importer was not used.

## Datasets Imported

| Section-first dataset | Source rows | Legacy-backed storage dataset | Stored rows |
| --- | ---: | --- | ---: |
| `SINGLE_DOMAIN_INTRO` | 1 | `DOMAIN_FRAMING` | 1 |
| `SINGLE_DOMAIN_HERO` | 1 | `HERO_PAIRS` | 6 |
| `SINGLE_DOMAIN_DRIVERS` | 4 | `SIGNAL_CHAPTERS` | 4 |
| `SINGLE_DOMAIN_PAIR` | 1 | `PAIR_SUMMARIES` | 6 |
| `SINGLE_DOMAIN_LIMITATION` | 1 | `BALANCING_SECTIONS` | 6 |
| `SINGLE_DOMAIN_APPLICATION` | 15 | `APPLICATION_STATEMENTS` | 4 |

## Storage Confirmation

The imported language landed in the expected legacy-backed storage datasets:

- `DOMAIN_FRAMING`: `leadership-approach`
- `HERO_PAIRS`: `results_process`, `results_vision`, `results_people`, `process_vision`, `process_people`, `vision_people`
- `SIGNAL_CHAPTERS`: `results`, `process`, `vision`, `people`
- `PAIR_SUMMARIES`: `results_process`, `results_vision`, `results_people`, `process_vision`, `process_people`, `vision_people`
- `BALANCING_SECTIONS`: `results_process`, `results_vision`, `results_people`, `process_vision`, `process_people`, `vision_people`
- `APPLICATION_STATEMENTS`: `results`, `process`, `vision`, `people`

The target pair-owned rows are stored with the runtime canonical key `results_process`.

## Result Regeneration

Regeneration was required. The existing deterministic QA result did not automatically pick up the imported language.

The deterministic target attempt had no responses, so the complete source Leadership attempt was refreshed first through the approved result-building path:

- source result: `69cedee7-60cf-422e-88bc-ae62c236a1a0`
- source attempt: `7f3b80d5-b74e-4b80-9dc0-09ea097f4628`
- response count: 15

After the source result was refreshed, the existing QA fixture script was run to recreate the deterministic target route:

```powershell
cmd /c node --import tsx scripts/seed-single-domain-qa-result.ts
```

The target route then returned `200` locally and rendered the regenerated payload for `f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`.

## Rendered Route Checked

`http://localhost:3000/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`

The page rendered the new gold-standard report language across the six locked sections:

- Intro: new Leadership orientation appears.
- Hero: new `Disciplined delivery` language appears.
- Drivers: new Process, Results, Vision, and People driver language appears.
- Pair: new Delivery and Process synthesis appears.
- Limitation: new `When structure outruns commitment` limitation appears.
- Application: new rely-on, notice, and develop guidance appears.

The weaker People thread appears in Drivers, Limitation, and Application.

## Viewport Findings

| Viewport | Screenshot | Finding |
| --- | --- | --- |
| `1440x1000` | `.codex-artifacts/leadership-gold-import-1440.png` | Full desktop route renders with reading rail and all six sections. |
| `1024x1000` | `.codex-artifacts/leadership-gold-import-1024.png` | Narrow desktop/tablet-width layout renders all sections and rail links. |
| `768x1024` | `.codex-artifacts/leadership-gold-import-768.png` | Tablet layout renders all report content without raw import keys. |
| `390x844` | `.codex-artifacts/leadership-gold-import-390.png` | Mobile layout renders the full report content without raw import keys. |

## Structural Browser Checks

- Main landmarks: one `main` element.
- Duplicate IDs: none found.
- Section anchors present: `intro`, `hero`, `drivers`, `pair`, `limitation`, `application`.
- Reading rail links present for all six sections.
- Anchor hash navigation works for all six section links.
- Raw import keys visible: none found for `SINGLE_DOMAIN_`, `results_process`, or `process_results`.
- Console findings: Clerk development-key warnings and standard React DevTools/HMR messages only.
- Network findings: no relevant failed route or asset requests observed.

## Language Assembly Issues Found

The import validated and the target result rendered, but the pass exposed several assembly risks:

- The runtime storage contract currently requires all six pair rows for `HERO_PAIRS`, `PAIR_SUMMARIES`, and `BALANCING_SECTIONS`. The source import only contains the target `results_process` pair. Non-target pair rows were therefore populated from the target pair wording as a structural fallback so the current runtime payload validator could pass. Those non-target pairs are not editorially complete.
- The current section-first mapper can leave required legacy fields blank when a section-first row does not naturally own every legacy field. Required fallback text was populated in storage for the imported language so payload validation could pass.
- Existing display cleanup still rewrites visible labels and phrases in ways that can feel editorially rough, including examples such as `Over Relying`, `Under Read`, `Performance Critical`, `Follow Through`, and `Outcome Focused`.
- Existing display label cleanup also maps `results` to `Delivery` in some visible pair labels, so `results_process` appears to users as `Delivery and Process`.

## Remaining Risks

- The target route is validated, but other Leadership pair outcomes should not be treated as editorially ready until their own pair-specific rows are authored.
- The section-first import path should be hardened so a one-pair import cannot accidentally leave runtime-required legacy fields empty.
- The display cleanup layer should be reviewed separately so imported prose is not unexpectedly title-cased or semantically renamed in body text.
- This validation was local. It does not prove production deployment parity.

## No-Change Confirmation

No engine logic, composer logic, scoring logic, result payload contract, UI layout, seed scoring data, section order, or UI-side computation was changed as part of this import-validation pass.

