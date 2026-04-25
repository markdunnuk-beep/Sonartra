# Reading Rail Sticky Scroll Restoration

## 1. Root cause

The reading rail sticky panel was not getting a useful sticky containing height on desktop.

The prior shell fix removed the extra rail wrapper, but the desktop report grid still set:

```css
.sonartra-report-shell-layout {
  align-items: start;
}
```

With the rail rendered as a grid item, `align-items: start` made the rail item size to its own content instead of stretching to the full report row height. The sticky child inside the rail therefore had a containing block roughly the same height as the rail itself, so it appeared pinned at the top of the page rather than following the viewport through the report.

The sticky element itself was still `position: sticky` with the approved `top-[5.7rem]` value. The issue was the parent grid item height, not the rail visual design.

Chrome MCP inspection was attempted against the target production route, but the browser session was redirected to Clerk sign-in during this pass, so live computed-style inspection could not be completed in the authenticated page. The diagnosis was confirmed from the local shell CSS and component structure.

## 2. Files changed

- `app/globals.css`
- `tests/single-domain-results-report.test.tsx`
- `docs/qa/reading-rail-sticky-scroll-restoration.md`

## 3. Fix applied

Changed the desktop report shell grid alignment from `align-items: start` to `align-items: stretch`.

This restores the rail grid item to the full report row height and gives the rail's existing sticky child enough containing height to remain visible as the viewport scrolls.

No reading rail visual styling was changed.

## 4. What did not change

- Rail labels did not change.
- Rail active-state classes did not change.
- Rail visual classes did not change.
- Section IDs did not change.
- Section order did not change.
- Mobile progress design did not change.
- Canonical payload logic and result content did not change.

## 5. Validation run

- `npm run lint`: passed.
- Targeted tests, sandboxed: failed with `spawn EPERM`.
- Targeted tests, rerun outside sandbox: passed.
  - `tests/result-reading-rail.test.tsx`
  - `tests/result-reading-progress.test.tsx`
  - `tests/single-domain-results-report.test.tsx`
  - `tests/single-domain-reading-sections-contract.test.ts`
- `npm run build`: passed.

A regression assertion now checks that the desktop report shell uses `align-items: stretch` and not `align-items: start`.

## 6. Browser sticky behaviour

The target route could not be manually confirmed in Chrome MCP during this pass because navigation redirected to Clerk sign-in:

- `https://integral-garfish-36.accounts.dev/sign-in?...`

Post-deployment authenticated verification is still required to confirm:

- the rail remains visible while scrolling from intro to application
- active section state updates while scrolling
- rail anchors still land on the expected sections
- mobile progress remains unchanged

## 7. Remaining issues

- Authenticated live browser confirmation remains outstanding because of the Clerk redirect.
- The Application chapter still uses the older grid/card layout and remains the next presentation refactor candidate.
