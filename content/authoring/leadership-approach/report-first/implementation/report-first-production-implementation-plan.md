# Report-First Production Implementation Plan

## 1. Purpose

This plan defines the proposed production implementation path for the Leadership Approach report-first canonical model.

Report-first is not implemented yet. This document is not production approval. It is a planning document that turns the RF1-RF12 proof track into a sequenced implementation proposal.

The existing scoring, runner, and `pattern_key` flow remain the foundation. The implementation must preserve the current single-domain ranked-pattern engine and continue to persist one completed `canonical_result_payload` for result retrieval.

## 2. Current proof status

The report-first proof track has reached a planning-ready state:

- four full Leadership Approach benchmark reports were created and QA'd
- a static report-first renderer was created
- a structured JSON payload fixture was created
- payload-backed preview rendering passed QA
- production implementation planning is now justified

Relevant decision statuses:

- `REPORT_FIRST_PROOF_SUPPORTED__STATIC_RENDERER_PROTOTYPE_RECOMMENDED`
- `STATIC_RENDERER_PROTOTYPE_PASSED__PAYLOAD_SCHEMA_PROTOTYPE_RECOMMENDED`
- `PAYLOAD_BACKED_PREVIEW_PASSED__PRODUCTION_IMPLEMENTATION_PLAN_RECOMMENDED`

## 3. Product direction

Recommended product/content direction:

`REPORT_FIRST_CANONICAL_MODEL_PREFERRED_FOR_LEADERSHIP_APPROACH`

The preferred model is:

- 24 canonical premium reports per assessment
- one report selected by `pattern_key`
- `score_shape` retained as metadata or diagnostic context unless later proven valuable for reader-facing variation
- structured report-first payload used for web and PDF-style rendering
- quality of reader insight prioritised over score-shape complexity

## 4. Non-goals

This implementation must not:

- rebuild the assessment runner
- rebuild scoring
- add a second scoring path
- recompute scores in the UI
- parse Markdown at runtime
- render Editorial QA Notes to users
- expose diagnostics in reader-facing output
- require score-shape-specific report variants
- destabilize current paid-ready result, workspace, or results-list flows

## 5. Proposed production architecture

Authoring:

```text
canonical Markdown reports
-> report-first compiler/importer
-> structured JSON report templates
```

Publish:

```text
validate 24 report templates
-> publish report-first content with assessment version
```

Completion:

```text
existing response/scoring pipeline
-> ranked signals
-> pattern_key
-> score_shape metadata
-> lookup report template by assessment_version_id + pattern_key
-> inject scoring evidence
-> assemble report_first_canonical_payload_v1
-> persist to results.canonical_result_payload
```

Retrieval:

```text
result page reads persisted canonical_result_payload
-> report-first renderer renders structured payload
-> no recomputation or language lookup
```

## 6. Storage strategy

### Option A: new normalized report-first tables

Pros:

- strong validation and queryability
- cleaner admin review per chapter/block
- easier to audit coverage and status

Cons:

- larger schema footprint
- more migrations and admin tooling
- slower path from authoring proof to runtime proof

### Option B: JSON report template per assessment_version_id + pattern_key

Pros:

- fastest bridge from Markdown authoring to runtime
- aligns with the RF10 structured payload model
- avoids proliferating tables too early
- supports future assessment-specific report structures
- can be validated before publish and normalized later if needed

Cons:

- requires strict JSON schema validation
- less queryable at individual block level
- admin editing requires preview/review tooling rather than simple row editing

### Option C: compile report templates into existing result language row infrastructure

Pros:

- may reuse some existing import/package concepts
- avoids a completely separate content import surface

Cons:

- risks forcing report-first content back into modular row assembly
- makes the model harder to reason about
- may preserve the very field-level complexity the proof track is trying to move beyond

Recommended initial approach:

Use JSON report template storage per `assessment_version_id + pattern_key`, with strict JSON validation and publish audit coverage.

Likely storage concept:

`assessment_report_first_templates`

Proposed fields:

- `id`
- `assessment_version_id`
- `domain_key`
- `pattern_key`
- `report_key`
- `report_contract`
- `report_template_json`
- `content_hash`
- `status`
- `created_at`
- `updated_at`
- `created_by`
- `import_batch_id` optional

No migration is created in this task.

## 7. Import/compile strategy

Markdown remains the authoring source. A compiler converts approved canonical Markdown reports into structured JSON templates. An importer validates and stores those templates against an assessment version. Runtime never reads Markdown.

The compiler/importer must:

- strip Editorial QA Notes or store them only in authoring/admin-only metadata
- version templates by assessment version
- preserve report contract version
- record content hash
- validate reader-facing content before publish

Validation requirements:

- exactly 24 active report templates for a published Leadership Approach version
- every report `pattern_key` resolves to one of the 24 ranked patterns
- required chapters exist
- required block types are valid
- no forbidden reader-facing terms
- admin notes excluded
- content hash recorded
- report status approved or publishable

## 8. Publish audit strategy

New publish audit checks should verify:

- 24 active report-first templates exist
- one template exists per `pattern_key`
- no duplicate `pattern_key` values
- no missing patterns
- `report_contract` matches the expected version
- JSON schema is valid
- required hero, opening, evidence, key insight, chapters, closing, and PDF fields are present
- required Leadership Approach chapter keys are present
- Editorial QA Notes are absent from reader-facing report content
- raw authoring/source/internal terms are absent from reader content
- all score evidence placeholders support runtime injection
- preview assembly succeeds for at least one case
- ideally preview assembly succeeds for all 24 reports

## 9. Completion-time assembly strategy

Existing scoring remains unchanged.

Completion adds:

- after `pattern_key` generation, resolve the report-first template
- inject actual `rankedSignals` and `normalizedScores` into evidence
- include `scoreShape` in scoring metadata
- set `scoreShapeCapturedButNotLanguageDriving = true`
- assemble `report_first_canonical_payload_v1`
- persist to `results.canonical_result_payload`

Failure rules:

- if the report template is missing, the result should not be marked `READY`
- if template JSON is invalid, the result should fail readiness
- if evidence injection fails, the result should fail readiness
- there should be no silent fallback to modular copy unless an explicit product-approved fallback policy exists

## 10. Result read model/rendering strategy

The result route/read model should detect payload contract name.

If `metadata.contractName` is `report_first_canonical_payload_v1`, use the report-first renderer. Existing modular/ranked-pattern payloads remain supported for historical and current results.

Rules:

- no recomputation
- no database language lookup at read time
- no UI-side score assembly
- reader-facing renderer ignores diagnostics/admin-only content

Production renderer should support:

- hero
- evidence panel
- reading rail
- key insight
- structured chapters
- tables
- signal stacks
- strength cards
- tightening cards
- development actions
- prompt groups
- closing synthesis
- final line
- PDF CTA
- hidden admin/debug data

## 11. Result page UI/UX strategy

The static preview proved feasibility, not final UI quality. The production page must meet the `/draft-result` quality bar and feel like a premium paid report, not a debug preview.

UI direction:

- refine the reading rail
- keep evidence premium but not dominant
- design mobile behavior deliberately
- preserve strong reading width and chapter pacing
- add accessibility review
- use Chrome DevTools and Playwright during implementation QA

Required UI QA:

- desktop
- tablet
- mobile
- no horizontal overflow
- readable chapter width
- sticky or otherwise usable reading rail
- evidence panel hierarchy
- PDF CTA placement
- no authoring/admin leakage

## 12. PDF/export strategy

Options:

### A. dynamic PDF from structured payload

Pros: one content source, easier personalization, closer to web renderer.

Cons: requires print/PDF layout engineering and pagination QA.

### B. pre-generated static PDFs per pattern with light personalization

Pros: stronger design control and predictable output.

Cons: harder personalization and more operational overhead.

### C. hybrid: web-rendered report now, PDF later

Pros: keeps report-first web implementation moving without forcing premature PDF decisions.

Cons: PDF CTA needs careful copy or gating.

Recommended initial production path:

Do not block report-first web implementation on premium PDF generation. Implement PDF as a separate phase.

Near-term:

- keep PDF CTA placeholder or gated/disabled copy if PDF is not ready
- define PDF strategy separately before launch

Later:

- prove dynamic or static PDF generation
- support light personalization: reader name, completion date, ranked signals, normalized scores, report title

## 13. Admin preview/review strategy

Admin should be able to preview report-first templates before publish.

Admin preview/review should show:

- structured report preview with sample scores
- template coverage by `pattern_key`
- import/publish audit status
- source content hash
- report contract version
- authoring/admin-only notes in an internal area only

No admin implementation is included in this task.

## 14. Legacy/current compatibility

Existing results with current canonical payloads remain readable. Report-first applies only to versions published with report-first templates.

During transition:

- result reader supports both existing ranked-pattern payloads and `report_first_canonical_payload_v1`
- no migration of old completed results is required unless later approved
- current workspace/results-list flows remain stable

## 15. Testing strategy

Required test groups:

- report-first template schema validation
- compiler/importer tests
- publish audit tests
- completion-time assembly tests
- result read model tests
- report renderer unit/component tests
- Playwright result-page tests
- Chrome DevTools manual QA
- mobile/overflow tests
- reader-facing leakage tests
- PDF tests later

## 16. Rollout strategy

Recommended phased rollout:

- Phase 0: planning/prototype complete
- Phase 1: storage/import/validation behind admin-only flow
- Phase 2: completion-time payload assembly for test/draft version only
- Phase 3: report-first result page behind version/payload contract detection
- Phase 4: Leadership Approach vNext internal test publish
- Phase 5: manual QA and limited user retake
- Phase 6: production publish decision

## 17. Production implementation task breakdown

### P1: Add report-first template storage schema

Objective: add storage for one structured report template per `assessment_version_id + pattern_key`.

Scope: database schema and repository access only.

Likely areas touched: migrations, database types, repository layer.

Validation required: migration tests, schema checks, no existing result flow regression.

Chrome DevTools/Playwright: not relevant.

### P2: Add Markdown-to-structured-report compiler

Objective: compile approved canonical Markdown into structured JSON templates.

Scope: authoring script/library and compiler tests.

Likely areas touched: `scripts/authoring`, report-first content folders, tests.

Validation required: compiler unit tests, fixture comparison, leakage checks.

Chrome DevTools/Playwright: not relevant.

### P3: Add report-first template importer/storage path

Objective: import compiled templates into report-first template storage.

Scope: import tooling and repository writes.

Likely areas touched: authoring/import scripts, repository layer, tests.

Validation required: import tests, duplicate/missing pattern tests, content hash checks.

Chrome DevTools/Playwright: not relevant.

### P4: Add publish audit coverage for 24 report templates

Objective: block publish readiness unless report-first template coverage and validation pass for report-first versions.

Scope: publish validation/audit only.

Likely areas touched: publish readiness checks, audit utilities, tests.

Validation required: missing/duplicate/invalid template tests, no impact on non-report-first versions.

Chrome DevTools/Playwright: not relevant.

### P5: Add completion-time report-first payload assembly

Objective: assemble `report_first_canonical_payload_v1` after existing scoring produces ranked signals and `pattern_key`.

Scope: completion service only after scoring.

Likely areas touched: completion service, payload builders, tests.

Validation required: completion path tests, missing-template failure tests, no score recomputation.

Chrome DevTools/Playwright: not initially; later browser proof after result page support.

### P6: Add report-first result read model support

Objective: detect report-first payload contract and expose a stable view model.

Scope: read model/presentation adapter only.

Likely areas touched: result read model, payload type guards, tests.

Validation required: existing payload compatibility tests, report-first payload tests.

Chrome DevTools/Playwright: not initially.

### P7: Build production report-first renderer/page

Objective: render structured report-first payloads in the production result experience.

Scope: result page renderer and components.

Likely areas touched: result components, CSS, view model, component tests.

Validation required: unit/component tests, leakage tests, responsive QA.

Chrome DevTools/Playwright: required.

### P8: Add admin preview/review support

Objective: allow admins to preview report-first templates before publish.

Scope: admin preview/review UI and supporting read models.

Likely areas touched: admin assessment workflow, preview components, tests.

Validation required: admin preview tests, audit status display checks.

Chrome DevTools/Playwright: relevant.

### P9: Add Leadership Approach report-first package/import content

Objective: provide all 24 approved Leadership Approach report templates for a report-first version.

Scope: content package only.

Likely areas touched: report-first canonical reports, compiled templates, import package docs.

Validation required: 24-template coverage, quality QA, similarity checks.

Chrome DevTools/Playwright: preview QA relevant after import.

### P10: Add PDF/export proof or gated CTA strategy

Objective: decide and implement either a PDF proof or a safe gated CTA.

Scope: PDF proof or CTA copy/availability logic.

Likely areas touched: result renderer, export tooling if approved, tests.

Validation required: PDF proof checks or CTA gating tests.

Chrome DevTools/Playwright: relevant for CTA behavior; PDF QA later.

### P11: End-to-end QA with Playwright/Chrome DevTools

Objective: prove the report-first flow end to end on a draft/test version.

Scope: test and QA only.

Likely areas touched: Playwright tests, QA docs.

Validation required: runner completion, result READY state, result page rendering, workspace/results-list continuity, leakage checks.

Chrome DevTools/Playwright: required.

### P12: Production rollout/fallback plan

Objective: define launch controls, fallback behavior, and production decision criteria.

Scope: rollout plan and any approved feature flags/version gates.

Likely areas touched: docs, config if approved, release checklist.

Validation required: rollback/fallback scenario tests and final manual QA.

Chrome DevTools/Playwright: required for launch QA.

## 18. Go/no-go before production implementation

Implementation go criteria:

- RF13 plan approved
- storage/import approach accepted
- 24-report authoring strategy accepted
- PDF strategy accepted or explicitly deferred
- implementation task sequence approved
- no unresolved production blocker from proof track

No-go criteria:

- implementation requires runner/scoring rebuild
- report-first result page cannot meet premium UX
- import/storage approach destabilizes current package flow
- 24-report authoring cannot maintain 8.5+/10 quality
- PDF expectation cannot be managed

## 19. Recommended next task

Recommended next task:

`P0: Review and approve RF13 implementation plan.`

If staying in proof mode, the next task should be:

`RF14: Create production task prompts P1-P12.`

Recommendation: review RF13 manually before writing production implementation tasks.

## 20. Decision status

`REPORT_FIRST_PRODUCTION_IMPLEMENTATION_PLAN_READY_FOR_REVIEW`

Do not set:

- `APPROVED_FOR_PRODUCTION`
- `IMPLEMENTED`
- `MIGRATED`
- `PUBLISHED`
