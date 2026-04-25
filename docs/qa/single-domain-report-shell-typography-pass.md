# Single-Domain Report Shell Typography Pass

## 1. Summary of shell/component changes

This pass introduces a small shared editorial report structure for the single-domain result page without changing the persisted result payload, scoring, completion flow, or authored result text.

- Added `ReportShell` and `ReportBody` in `components/results/report-shell.tsx`.
- Added `ReportHeader` and `ReportChapter` in `components/results/report-chapter.tsx`.
- Reworked `components/results/single-domain-result-report.tsx` so the single-domain page now renders through one report shell with a central report body and secondary reading rail.
- Reworked `components/results/single-domain-result-section.tsx` so hero, drivers, pair, limitation, and application use the shared chapter wrapper while keeping their existing internal content models.
- Preserved the locked section order: intro, hero, drivers, pair, limitation, application.
- Preserved canonical result consumption. The UI still reads from the persisted single-domain result view model and does not recompute scoring or reshape the payload.

## 2. Files changed

- `components/results/report-shell.tsx`
- `components/results/report-chapter.tsx`
- `components/results/single-domain-result-report.tsx`
- `components/results/single-domain-result-section.tsx`
- `app/globals.css`
- `docs/qa/single-domain-report-shell-typography-pass.md`

## 3. Typography changes made

- Added a calmer report title class for the page H1: reduced display scale, softened negative tracking, and improved line-height for report reading rather than hero marketing treatment.
- Added a shared chapter title class for H2 headings so section headings now use one consistent editorial scale.
- Added a feature chapter variant for the hero chapter that remains prominent but is no longer oversized relative to the report.
- Added a shared reading measure around 72ch for intro prose and long-form summary copy.
- Increased report body flow spacing slightly to create clearer chapter rhythm.
- Removed the intro two-column prose split at desktop so long paragraphs read in a single editorial measure.
- Changed the hero support copy from a two-column prose grid to a vertical flow.
- Quieted the hero surface treatment by reducing the heavy gradient and shadow treatment.

## 4. What was intentionally not changed

- No scoring logic changed.
- No completion or regeneration logic changed.
- No canonical payload fields or shape changed.
- No persisted result copy changed.
- The drivers section internals were not rebuilt; the existing primary/supporting layout remains for the next dedicated task.
- The application section internals were not rebuilt.
- Multi-domain and generic result routes were not refactored.
- The reading rail component and mobile progress component behavior were preserved.

## 5. Accessibility notes

- The page still renders through the existing `PageFrame` main landmark via `ReportShell`.
- The intro keeps one H1.
- Each report chapter renders a section with an H2 and `aria-labelledby`.
- The reading rail remains a navigation component with stable in-page anchor links.
- Mobile/tablet progress keeps its polite live region behavior.
- Existing reduced-motion handling in `app/globals.css` was not weakened.

## 6. Viewports checked

Chrome MCP was used against the live production route for route health and semantic structure at:

- 1440 x 1100
- 1280 x 1000
- 1024 x 1000
- 768 x 1024
- 430 x 932
- 390 x 844

The live route returned `200` and rendered the expected result content. The local dev route for the exact live result id returned a data-level `404`, so the changed local shell could not be visually inspected against that production result record before deployment. Local confidence is from lint, targeted component tests, and production build.

No screenshots were saved for this pass.

## 7. Test/validation results

- `npm run lint`: passed.
- Targeted result tests, sandboxed: failed with `spawn EPERM`.
- Targeted result tests, rerun outside sandbox: passed.
  - `tests/single-domain-results-report.test.tsx`
  - `tests/single-domain-results-smoke.test.tsx`
  - `tests/result-reading-rail.test.tsx`
  - `tests/result-reading-progress.test.tsx`
  - `tests/single-domain-reading-sections-contract.test.ts`
- `npm run build`, sandboxed: failed because Next could not fetch the configured Google font.
- `npm run build`, rerun outside sandbox: passed.

Chrome MCP console/network on the live route:

- Main document: `200`.
- No render or network failures observed.
- Console warning observed: Clerk is using development keys in production.

## 8. Recommended next task

Refactor the drivers section into the new chapter grammar as a dedicated task. The likely direction is to replace the current primary/support rail with a vertical editorial sequence: primary driver, secondary driver, supporting context, and range limitation as full-width report subsections with consistent prose width and quieter labels.
