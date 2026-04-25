# Single-Domain Result Post-Deploy Visual QA

## 1. Executive summary

The live single-domain Blueprint Leadership result page is now rendering as a coherent editorial report. The production route is healthy, the Drivers and Application chapters have deployed as vertical report sections, and the approved reading rail remains visually unchanged while sticky behavior and active section updates work on desktop.

No blocking regressions were found. No code changes were made in this QA pass.

## 2. Viewports tested

Chrome MCP was used on the production route at:

- 1440 x 1100
- 1280 x 1000
- 1024 x 1000
- 768 x 1024
- 430 x 932
- 390 x 844

Note: Chrome reported an effective narrow viewport width of `500px` after the 430 and 390 resize commands, but the mobile layout mode was active and no horizontal overflow was detected.

## 3. Route, network, and console findings

- Route: `https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`
- Main document: `200`
- No 500s observed.
- No failed RSC requests observed.
- No render errors observed in console.
- Console warning observed: Clerk development keys warning.
- All listed document, CSS, JS, Clerk, logo, and RSC requests in the inspected network page returned `200`, `304`, or expected Clerk `307` redirects.

## 4. Section-by-section findings

### Intro

- Reads as a report opening rather than a dashboard header.
- One H1 is present: `Understand how you lead`.
- Metadata strip is compact and does not dominate the page.
- Intro prose is vertical and readable.

### Hero

- Hero remains prominent but now sits within the report spine.
- The section is still visually distinct, but not disruptive to the surrounding editorial flow.
- Long support prose is no longer split into side-by-side columns.

### Drivers

- Drivers now reads vertically as an editorial chapter.
- The old primary/support rail layout is gone.
- No `sonartra-single-domain-driver-layout`, support rail, or context stack classes were present.
- The visible structure is:
  - Primary driver
  - Secondary driver
  - Supporting context
  - Range limitation
- The section uses H3 subsections and one reading measure.

### Pair

- Pair remains a coherent synthesis chapter.
- It still uses a framed treatment, but does not create the same fragmentation issue as the previous Drivers/Application layouts.
- Paragraph rhythm is readable.

### Limitation

- Limitation remains a distinct cautionary chapter.
- The warm accent treatment is visible but not broken.
- No obvious spacing or overflow issue was observed.

### Application

- Application now reads as a vertical closing chapter.
- The old three-column/card layout is gone.
- No `sonartra-single-domain-application-grid` or `sonartra-single-domain-application-card` classes were present.
- The visible structure is:
  - Rely on
  - Notice
  - Develop
- The section uses H3 subsections and one reading measure.

## 5. Drivers confirmation

Confirmed.

- Drivers uses `sonartra-single-domain-driver-flow`.
- No side-by-side long prose remains.
- No dashboard support rail remains.
- The H3 sequence is logical and visible in the accessibility tree.
- No dead space regression was observed.

## 6. Application confirmation

Confirmed.

- Application uses `sonartra-single-domain-application-flow`.
- No three-column grid remains.
- No side-by-side long prose remains.
- `Rely on`, `Notice`, and `Develop` render as clear report subsections.
- The closing chapter now reads as part of the report rather than a card dashboard.

## 7. Reading rail confirmation

Confirmed on desktop.

- Reading rail remains visible while scrolling.
- Sticky panel top stayed around `91px` through Hero, Drivers, Pair, Limitation, and Application.
- Active state updated while scrolling:
  - Intro at top
  - Drivers at Drivers
  - Pair at Pair
  - Limitation at Limitation
  - Application at Application
- Anchor click to Hero landed on the Hero chapter and updated the active rail state.
- Rail visual design, labels, and active-state treatment appeared unchanged.

## 8. Mobile progress confirmation

Confirmed on tablet/mobile.

- Desktop rail hides below desktop.
- Mobile progress appears at 1024, 768, 430, and 390 requested widths.
- Mobile progress updated while scrolling:
  - Hero
  - Drivers
  - Pair
  - Limitation
  - Application
- No horizontal overflow was detected.
- The progress control uses vertical space, but it did not obscure content excessively in this pass.

## 9. Typography and readability findings

- H1 scale is calmer and appropriate for a report title.
- H2 chapter headings are consistent across the main chapters.
- H3 subsection headings are now consistent in Drivers and Application.
- Body prose sits in a more comfortable measure than before.
- Paragraph spacing is much stronger than the earlier dashboard/card layout.
- Uppercase labels still exist for chapter eyebrows and rail metadata, but they are no longer the dominant reading structure.
- The page now reads substantially more like a traditional behavioural report.

## 10. Accessibility smoke findings

- One H1 found.
- H2 order is logical:
  - results and process
  - What is creating this pattern
  - Results and Process
  - When results needs more vision
  - What to rely on, notice, and develop
- H3 order is logical:
  - Primary driver
  - Secondary driver
  - Supporting context
  - Range limitation
  - Rely on
  - Notice
  - Develop
- Main landmark remains present.
- Reading rail remains a nav with `aria-label="Report reading navigation"`.
- Rail links remain keyboard-focusable and target stable section anchors.

## 11. Screenshots captured

Saved under `.codex-artifacts/`:

- `single-domain-report-1440-full.png`
- `single-domain-report-1440-top.png`
- `single-domain-report-1440-drivers.png`
- `single-domain-report-1440-application.png`
- `single-domain-report-430-mobile.png`

## 12. Remaining issues

- The Hero, Pair, and Limitation chapters still have more visual treatment than a fully restrained print-like report, but none of these blocked the current acceptance criteria.
- The copy itself remains dense in places because the persisted payload contains long repeated prose; this QA did not change content.
- Colour/contrast polish was intentionally not started.

## 13. Recommended next task

Run a separate colour, contrast, and final premium polish audit after the current editorial layout has had stakeholder review. Keep that task scoped to visual refinement only unless a live accessibility defect is found.
