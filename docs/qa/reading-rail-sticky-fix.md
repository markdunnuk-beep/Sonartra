# Reading Rail Sticky Fix

## Summary

The reading rail sticky regression was caused by the extra `sonartra-report-shell-rail` wrapper introduced by the report shell foundation. The rail component places the sticky panel inside the `nav`; with the extra wrapper, the `nav` no longer stretched to the full report grid height, so the sticky element lost the tall containing block it previously relied on.

The fix removes that wrapper and renders the existing `ResultReadingRail` directly as the second grid item in `ReportShell`.

## Files changed

- `components/results/report-shell.tsx`
- `app/globals.css`
- `tests/single-domain-results-report.test.tsx`
- `docs/qa/reading-rail-sticky-fix.md`

## What changed

- Removed the extra rail wrapper from `ReportShell`.
- Removed the unused `.sonartra-report-shell-rail` CSS rule.
- Added a regression assertion that the single-domain report still renders `data-result-reading-rail="true"` and does not render `sonartra-report-shell-rail`.

## What did not change

- No reading rail visual classes changed.
- No rail labels changed.
- No active-state styling changed.
- No section order changed.
- No canonical payload, scoring, result content, or completion logic changed.
- No mobile progress styling changed.

## Accessibility and behavior notes

- The reading rail remains a `nav` with `aria-label="Report reading navigation"`.
- The rail anchors still target `#intro`, `#hero`, `#drivers`, `#pair`, `#limitation`, and `#application`.
- The mobile reading progress component remains unchanged.
- IntersectionObserver targets remain the same section IDs.

## Validation

- `npm run lint`: passed.
- Targeted reading rail/progress and single-domain result tests:
  - sandbox run failed with `spawn EPERM`
  - rerun outside sandbox passed
- `npm run build`: passed.

Targeted tests run:

- `tests/result-reading-rail.test.tsx`
- `tests/result-reading-progress.test.tsx`
- `tests/single-domain-results-report.test.tsx`
- `tests/single-domain-results-smoke.test.tsx`
- `tests/single-domain-reading-sections-contract.test.ts`

## Browser check

Chrome MCP was used on the production route:

- `https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`
- Desktop viewport: `1440 x 1100`
- Route returned `200`.
- The deployed page rendered the editorial Drivers section and reading rail.
- Console warning observed: Clerk development keys warning.
- No render or network failures observed.

Because this fix was not deployed at the moment of inspection, the final sticky behavior still needs a post-deploy visual confirmation on the live route.

## Remaining issues

- Post-deployment browser confirmation should verify that the rail remains visible as the report scrolls, active section state updates, and anchor navigation still lands on the expected chapter sections.
- The Application section remains the next report-layout candidate, but it was not touched here.
