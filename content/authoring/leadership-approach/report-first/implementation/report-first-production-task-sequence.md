# Report-First Production Task Sequence

This sequence is a planning artifact only. It does not approve production implementation.

## P1: Add report-first template storage schema

- Objective: store one structured report template per `assessment_version_id + pattern_key`.
- Dependency: RF13 plan approval.
- Primary risk: schema adds complexity before storage model is accepted.
- Validation required: migration/schema tests, repository tests, no regression to existing results.
- Chrome DevTools/Playwright: not relevant.

## P2: Add Markdown-to-structured-report compiler

- Objective: compile approved canonical Markdown into structured JSON templates.
- Dependency: P1 storage contract, or an agreed local template contract if compiler is built first.
- Primary risk: compiler misses nuanced authoring structures or leaks QA notes.
- Validation required: compiler unit tests, fixture snapshots, forbidden-term checks.
- Chrome DevTools/Playwright: not relevant.

## P3: Add report-first template importer/storage path

- Objective: validate and store compiled report-first templates.
- Dependency: P1 and P2.
- Primary risk: importer silently accepts duplicate, missing, or invalid pattern templates.
- Validation required: import tests for duplicates, missing patterns, invalid JSON, and content hashes.
- Chrome DevTools/Playwright: not relevant.

## P4: Add publish audit coverage for 24 report templates

- Objective: make report-first template coverage part of publish readiness for report-first versions.
- Dependency: P3.
- Primary risk: publish audit blocks unrelated non-report-first versions.
- Validation required: publish audit tests for report-first and non-report-first versions.
- Chrome DevTools/Playwright: not relevant.

## P5: Add completion-time report-first payload assembly

- Objective: assemble `report_first_canonical_payload_v1` after existing scoring produces ranked signals and `pattern_key`.
- Dependency: P3 and P4.
- Primary risk: implementation accidentally changes scoring or adds UI-side assembly assumptions.
- Validation required: completion tests, missing-template failure tests, evidence injection tests.
- Chrome DevTools/Playwright: not initially; browser proof comes after renderer support.

## P6: Add report-first result read model support

- Objective: detect report-first payload contracts and provide a stable renderer view model.
- Dependency: P5 payload assembly contract.
- Primary risk: historical/current result payloads regress.
- Validation required: type guard tests, read model tests for old and new payloads.
- Chrome DevTools/Playwright: not initially.

## P7: Build production report-first renderer/page

- Objective: render the structured report-first payload in the production result experience.
- Dependency: P6.
- Primary risk: page feels like a static prototype or leaks admin diagnostics.
- Validation required: component tests, leakage tests, responsive checks, visual QA.
- Chrome DevTools/Playwright: required.

## P8: Add admin preview/review support

- Objective: let admins preview report-first templates and validation status before publish.
- Dependency: P3 and P7 renderer components or shared preview renderer.
- Primary risk: admin preview becomes a second renderer or diverges from production output.
- Validation required: admin preview tests, audit display tests, source hash/status checks.
- Chrome DevTools/Playwright: relevant.

## P9: Add Leadership Approach report-first package/import content

- Objective: provide all 24 approved Leadership Approach report templates.
- Dependency: P2, P3, and authoring approval for remaining reports.
- Primary risk: quality or differentiation drops below paid-report bar.
- Validation required: 24-template coverage, quality QA, similarity checks, publish audit.
- Chrome DevTools/Playwright: preview QA relevant after import.

## P10: Add PDF/export proof or gated CTA strategy

- Objective: either prove PDF/export from structured payload or safely gate/defer the CTA.
- Dependency: P7 and product decision on PDF timing.
- Primary risk: user-facing PDF promise outruns actual export quality.
- Validation required: CTA gating tests or PDF proof checks.
- Chrome DevTools/Playwright: relevant for CTA behavior; PDF-specific QA later.

## P11: End-to-end QA with Playwright/Chrome DevTools

- Objective: prove a draft/test report-first Leadership Approach version end to end.
- Dependency: P5-P10.
- Primary risk: result page works in isolation but breaks completion/workspace/results continuity.
- Validation required: runner completion, READY result, workspace card, results list, result page, leakage checks, responsive checks.
- Chrome DevTools/Playwright: required.

## P12: Production rollout/fallback plan

- Objective: define rollout controls, fallback policy, and final publish decision criteria.
- Dependency: P11.
- Primary risk: unclear behavior if a report template is missing or a PDF/export expectation is deferred.
- Validation required: rollback/fallback tests, launch checklist, manual production-readiness QA.
- Chrome DevTools/Playwright: required for launch QA.

## Decision status

`REPORT_FIRST_PRODUCTION_TASK_SEQUENCE_READY_FOR_REVIEW`
