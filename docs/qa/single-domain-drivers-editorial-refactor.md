# Single-Domain Drivers Editorial Refactor

## 1. Summary of Drivers layout changes

The Drivers chapter was refactored from a dashboard-style primary/support rail into a vertical editorial sequence inside the existing `ReportChapter` grammar.

The chapter now renders:

- Primary driver
- Secondary driver
- Supporting context
- Range limitation

Each driver entry sits full-width within the report reading measure and uses the existing persisted focus item labels and body copy. No scoring, payload, completion, or language data changed.

## 2. Files changed

- `components/results/single-domain-result-section.tsx`
- `app/globals.css`
- `tests/single-domain-results-report.test.tsx`
- `docs/qa/single-domain-drivers-editorial-refactor.md`

## 3. What old layout patterns were removed

- Removed the Drivers two-column desktop grid.
- Removed the right-hand support rail.
- Removed the primary driver card treatment.
- Removed nested driver cards for secondary/supporting/range content.
- Removed min-height matching behavior on the primary driver surface.
- Removed driver-specific dashboard surface shadows, radial treatments, and card padding.

The remaining Drivers structure is a single vertical flow with subtle top dividers and report-width prose.

## 4. New driver entry structure

`SignalDriverEntry` is an internal component in `components/results/single-domain-result-section.tsx`.

It renders:

- A quiet metadata line, such as `Main cause` or `Missing range`.
- A semantic H3 using the persisted focus item label, such as `Primary driver`.
- One or more persisted prose paragraphs from the focus item content.

The component does not infer scores, rankings, or signal meaning. It only presents the existing single-domain result view model data in a calmer reading structure.

## 5. Accessibility notes

- The Drivers chapter still receives its H2 from `ReportChapter`.
- Each driver entry now has an H3, giving the chapter a logical heading structure.
- The Drivers anchor remains `#drivers`, so the reading rail target is unchanged.
- No duplicate IDs were introduced.
- Existing focus behavior and reduced-motion handling were not changed.

## 6. Viewports checked

Chrome MCP was used against the live production route for route health and semantic structure at:

- 1440 x 1100
- 1280 x 1000
- 1024 x 1000
- 768 x 1024
- 430 x 932
- 390 x 844

The live route returned `200` and rendered without network failures. Because this code was not deployed at the time of the check, the live browser snapshot still showed the previous deployed Drivers markup. The local exact result id is still not available locally, so local visual validation against that record was blocked by the same data-level limitation noted in the shell pass.

## 7. Test/validation results

- `npm run lint`: passed.
- Targeted result tests: initial sandbox run failed with `spawn EPERM`; final rerun passed.
  - `tests/single-domain-results-report.test.tsx`
  - `tests/single-domain-results-smoke.test.tsx`
  - `tests/single-domain-reading-sections-contract.test.ts`
  - `tests/result-reading-rail.test.tsx`
  - `tests/result-reading-progress.test.tsx`
- `npm run build`: passed after fixing an invalid Tailwind `text-white/88` token in the new CSS.

Chrome MCP console/network on the live route:

- Main document: `200`.
- No render or network failures observed.
- Console warning observed: Clerk is using development keys in production.

## 8. Screenshots captured

No screenshots were saved for this pass.

## 9. Remaining issues

- The live route needs a post-deployment visual check to confirm the new Drivers section is active in production.
- The application chapter still uses the previous three-column/card-like structure and remains the next major report-flow issue.
- The current Drivers content is dense because the persisted prose itself is long; this task changed layout only and did not edit language rows.

## 10. Recommended next task

Refactor the Application chapter into the same editorial report grammar: vertical subsections for `Rely on`, `Notice`, and `Develop`, with consistent H3 headings, single-column prose, and reduced card styling.
