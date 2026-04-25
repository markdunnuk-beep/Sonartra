# Single-Domain Application Editorial Refactor

## 1. Summary of Application layout changes

The Application chapter was refactored from a three-column card/grid layout into a vertical editorial closing chapter.

The chapter now renders:

- Rely on
- Notice
- Develop

Each entry is a full-width report subsection inside the existing `ReportChapter` structure. The UI still consumes the persisted single-domain result view model only; no scoring, result payload, or authored content changed.

## 2. Files changed

- `components/results/single-domain-result-section.tsx`
- `app/globals.css`
- `tests/single-domain-results-report.test.tsx`
- `docs/qa/single-domain-application-editorial-refactor.md`

## 3. Old layout patterns removed

- Removed the Application three-column desktop grid.
- Removed the Application card component styling.
- Removed decorative per-card background treatments for `Rely on`, `Notice`, and `Develop`.
- Removed Application frame/grid wrappers that created a dashboard-like closing section.
- Removed width-dependent horizontal splitting for Application prose.

## 4. New Application subsection structure

`ApplicationActionEntry` is an internal component in `components/results/single-domain-result-section.tsx`.

It renders:

- A semantic H3 using the persisted focus item label.
- One or more persisted prose paragraphs from the focus item content.
- A subtle top divider and report-width measure.

The component does not infer action priority, compute new meaning, or alter the result view model.

## 5. Accessibility notes

- The Application chapter still receives its H2 from `ReportChapter`.
- `Rely on`, `Notice`, and `Develop` are now semantic H3 headings.
- No IDs or anchors were changed.
- Reading rail anchors remain unchanged.
- Mobile reading progress remains unchanged.
- Keyboard/focus behavior was not modified.

## 6. Viewports checked

Chrome MCP was used against the production route at:

- 1440 x 1100
- 1280 x 1000
- 1024 x 1000
- 768 x 1024
- 430 x 932
- 390 x 844

The production route returned `200` and rendered without network failures. At inspection time, production still showed the previous deployed Application markup, so the new Application vertical layout requires a post-deployment visual confirmation.

## 7. Validation results

- `npm run lint`: passed.
- Targeted tests: passed.
  - `tests/single-domain-results-report.test.tsx`
  - `tests/single-domain-results-smoke.test.tsx`
  - `tests/single-domain-reading-sections-contract.test.ts`
  - `tests/result-reading-rail.test.tsx`
  - `tests/result-reading-progress.test.tsx`
- `npm run build`: passed.

## 8. Screenshot notes

No screenshots were saved for this pass.

## 9. Reading rail confirmation

The reading rail component, labels, styling, active-state logic, sticky positioning, anchors, and mobile progress component were not changed.

Chrome MCP confirmed the production route still rendered the reading rail and returned `200`. Since production was not yet running this commit during inspection, a post-deployment rail smoke check should still confirm sticky behavior and active-section updates.

Console/network findings:

- Main document: `200`.
- No render or network failures observed.
- Existing Clerk development-key warning observed.

## 10. Remaining issues

- Post-deployment browser confirmation is needed for the new Application layout on the live route.
- The persisted Application prose remains dense; this task changed presentation only and did not edit language rows.

## 11. Recommended next task

Run a post-deployment live QA pass for the full single-domain report across desktop/tablet/mobile, focusing on Application vertical flow, reading rail sticky behavior, active section state, and route health.
