# Live Blueprint Leadership Result UX Audit

Date: 2026-04-25

Route audited:

`https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48`

Scope: live UX/UI and editorial layout audit only. No product code, scoring, payload logic, language data, or persisted result data was changed.

## 1. Executive Summary

The live single-domain Blueprint Leadership result page renders reliably and the content is strong enough to support a premium behavioural report. The current presentation does not yet match that content quality. It reads as a collection of styled product UI blocks rather than a coherent report.

The dominant issue is structural: long narrative prose is being placed inside dashboard-style cards, horizontal grids, and small supporting rails. Those patterns work for short summaries, but they make this result harder to read because the text now has report-level density. The page should move toward a traditional report-reading model: a linear editorial flow, one primary reading column, restrained section dividers, generous vertical rhythm, and narrow paragraph measures.

The drivers section is the clearest failure point. At desktop widths it uses a two-column grid with a large primary card and a right-hand support rail. Because the primary and secondary driver prose is long, the right rail becomes a tall column of compressed cards. This creates uneven density, visual fragmentation, and dead space relationships between cards. The content wants to be read in sequence, not compared as dashboard modules.

## 2. Viewports Tested

Chrome DevTools MCP was used against the live production route.

| Viewport | Result |
| --- | --- |
| `1440 x 1000` | Route rendered, full page reviewed, screenshot captured. |
| `1280 x 900` | Route rendered, full page reviewed, screenshot captured. |
| `1024 x 900` | Route rendered, full page reviewed, screenshot captured. |
| `768 x 1024` | Route rendered, full page reviewed, screenshot captured. |
| `430 x 932` | Route rendered, full page reviewed, screenshot captured. |
| `390 x 844` | Route rendered, full page reviewed, screenshot captured. |

Screenshots:

- `.codex-artifacts/live-blueprint-ux-1440-full.png`
- `.codex-artifacts/live-blueprint-ux-1280-full.png`
- `.codex-artifacts/live-blueprint-ux-1024-full.png`
- `.codex-artifacts/live-blueprint-ux-768-full.png`
- `.codex-artifacts/live-blueprint-ux-430-full.png`
- `.codex-artifacts/live-blueprint-ux-390-full.png`

## 3. Top UX Issues Ranked By Severity

1. **Dashboard-card composition is fighting long-form reading.** Hero support, drivers, and application all rely on card/grid patterns that fragment prose. The page should feel like a report chapter sequence, not a product dashboard.

2. **Drivers is structurally unsuitable for the content length.** The two-column desktop layout and nested support rail create compressed text blocks, uneven card heights, and a visually awkward right column. The user has to compare blocks that should be read linearly.

3. **Typography hierarchy is over-expressive in headings and under-composed in body prose.** The large display headings and tight tracking create brand drama, but the body copy needs a calmer report measure, more consistent paragraph rhythm, and fewer competing label styles.

4. **Horizontal prose splits reduce comprehension.** Intro and hero both split long prose across columns at larger breakpoints. Two dense narrative columns side by side are tiring and make the report feel assembled rather than authored.

5. **Section treatments are inconsistent.** Hero is a large rounded feature card, pair is a compact bordered card, limitation is a warning-tinted card, application is a three-column card row, and drivers is a multi-card dashboard. The result lacks one consistent report grammar.

## 4. Typography Audit Findings

### H1, H2, H3 Scale

- The opening H1 is visually strong, but it uses very tight negative tracking and a display scale that feels more like a landing page hero than a report title.
- The hero H2 is too large for the amount of body copy that follows. At mobile and tablet widths, `results and process` dominates the viewport before the report has established enough reading context.
- Section H2s are inconsistent in tone: `What is creating this pattern` is plain and report-like, while the hero and limitation headings are more dramatic.
- The report has few true H3s inside the single-domain route. Labels such as `MAIN CAUSE`, `REINFORCING CAUSE`, `RELY ON`, `NOTICE`, and `DEVELOP` are visually doing H3 work but are marked and styled as utility labels.

Recommendation: use a more restrained report type scale:

- H1: editorial title, large but not landing-page scale.
- H2: chapter title, consistent across all six sections.
- H3: subsection title for drivers and application groups.
- Utility labels: sparse, not every content block.

### Body Text Size And Line Height

- Body text is generally readable, but dense long paragraphs inside small cards feel cramped.
- Primary driver text at desktop uses a larger size and generous line height, but the card width and surrounding UI treatment make it feel like a feature block, not report prose.
- Secondary/supporting cards use smaller and dimmer text, which makes important content look less report-worthy even when the prose is substantive.

Recommendation: set a default report body around `1rem` to `1.08rem` with `1.75` to `1.85` line height, and use contrast around `text-white/76` to `text-white/84` for primary reading text. Avoid making secondary report content too faint.

### Paragraph Measure

- The best reading measure appears in pair and limitation where paragraphs sit around a single column.
- The weakest measures appear when long text is split into two columns or placed in narrow support cards.
- At 1440px, the hero support and intro supporting paragraphs use two-column layouts. This turns long narrative into side-by-side chunks and breaks the report flow.

Recommendation: use a central report column around `64ch` to `76ch` for long prose. Use side notes only for short metadata, quotes, or navigational support.

### Label And Badge Usage

- Uppercase labels are overused: assessment title, metadata labels, `HERO`, `DRIVERS`, cause labels, application group labels, rail labels, and state labels.
- The labels add operational UI noise and make the report feel tagged rather than written.

Recommendation: preserve section numbers or quiet chapter labels, but reduce uppercase micro-labels inside prose sections. Replace many labels with semantic subheads.

## 5. Layout Audit Findings

### Overall Reading Flow

The section order is right: intro, hero, drivers, pair, limitation, application. The problem is the visual grammar inside that order. Each section has a different container model, so the reader keeps relearning the page instead of settling into a report.

Recommendation: keep the six-section order but make every section part of one editorial spine:

- consistent section header block.
- single prose column for primary text.
- optional inset callout for concise emphasis only.
- no side-by-side long narratives.

### Horizontal Stacks

The current page uses horizontal grids in these places:

- Intro supporting copy at `1280px+`.
- Hero support paragraphs at `sm:grid-cols-2`.
- Drivers two-column layout at `1100px+`.
- Application three-column layout at `1040px+`.

For this result, those grids are too aggressive. The text is no longer short enough for comparison-card treatment.

Recommendation: collapse long prose to vertical sections at all report widths. If a two-column treatment remains, reserve it for short pull quotes, metadata, or one-sentence summaries.

### Dead Space And Card Height

Drivers creates the clearest dead-space pattern. The primary driver card and right rail are aligned as parallel objects, but content length differs across nested cards. This creates an awkward visual ladder: one large block on the left, then several stacked smaller blocks on the right. The right column feels compressed, while the left column occupies a large visual mass.

This is not mainly a min-height bug. It is a content-model mismatch caused by `grid-template-columns: minmax(0, 1.34fr) minmax(18rem, 0.66fr)` and a nested support rail with several cards.

### Page Width

At 1440px, the report is boxed inside the app shell and a reading rail, leaving a narrow central report area. The width is not wrong for a web app, but the large cards make it feel like a dashboard inside a frame. For report reading, the central content should feel like a page, not a card collection.

Recommendation: use the rail as a light table of contents and give the report content a paper-like editorial column. The rail should support reading, not visually compete with the report.

## 6. Section-By-Section Findings

### Intro / Opening

What works:

- The metadata is useful and confirms the result identity.
- The opening content is logically ordered.
- The H1 is clear.

Issues:

- Metadata, uppercase labels, and the large title create a product UI opening rather than a report cover.
- The intro copy splits into two columns at desktop, which weakens the narrative.
- The opening subtitle repeats instruction-like framing. It is acceptable, but visually it adds another UI line before the report settles into prose.

Recommendation:

- Treat intro as a report cover plus executive orientation.
- Keep metadata quiet in a single line or compact details row.
- Keep the intro body as one column.
- Remove or visually soften micro-labels.

### Hero Section

What works:

- The section has a clear role as the main result pattern.
- It creates a visual moment and makes the result feel important.

Issues:

- The huge display heading and rounded card treatment feel more like a marketing hero than a report summary.
- The two supporting paragraphs are long and placed side by side. This is hard to read.
- The fallback-generated lowercase heading `results and process` reduces premium polish.
- The card background and large radius make this section feel detached from the rest of the report.

Recommendation:

- Make Hero the executive summary section, not a landing-page hero.
- Use a restrained H2, followed by a short lead paragraph and then stacked supporting paragraphs.
- Consider a single bordered editorial panel rather than a large decorative card.

### Signal / Drivers Section

What works:

- The labels map to a meaningful conceptual model: primary, secondary, supporting, limitation.
- The reader can see the ranked structure.

Issues:

- The layout forces comparison, but the content is explanatory and sequential.
- The secondary driver is as narratively important as the primary driver, but the right rail makes it look secondary in quality as well as rank.
- Supporting and range limitation are cramped into nested mini-cards.
- The section creates the most dead space and fragmentation on desktop.

Recommendation:

- Redesign as a vertical chapter:
  - short orientation paragraph.
  - four stacked signal subsections.
  - each subsection has a rank marker, signal label, position label, score if needed, and prose.
  - optionally use a slim visual ladder on the left to show rank/order.
- Do not use a two-column rail for long prose.

### Pair Synthesis

What works:

- This is the closest section to a traditional report block.
- Paragraph measure is more comfortable.
- The bordered treatment is restrained compared with other sections.

Issues:

- It still feels like a card rather than a chapter.
- The body paragraphs are compact and could use more vertical rhythm.

Recommendation:

- Use Pair as the model for the rest of the redesign, but make it less card-like and more page-like.
- Add explicit subheads only if they improve scanability without breaking the prose.

### Limitations / Watchouts

What works:

- The warning tint gives the section a useful tonal distinction.
- The section has a clear role in the narrative.

Issues:

- The amber treatment risks making it feel like an alert rather than reflective report guidance.
- The heading is large and dramatic for a limitation section.
- The body is readable but could be broken into clearer paragraphs with calmer headings.

Recommendation:

- Keep a subtle accent, but reduce alert styling.
- Treat it as "where the pattern narrows" with a mature report tone.

### Application Plan

What works:

- The three categories, `Rely on`, `Notice`, and `Develop`, are useful.
- The content is naturally actionable.

Issues:

- The three-column desktop grid is too dashboard-like.
- The columns differ in reading density and make the end of the report feel like cards rather than a closing chapter.
- On mobile it stacks and reads better, which suggests the vertical model is stronger.

Recommendation:

- Use vertical subsections or numbered action groups.
- Consider making each group a short chapter with a heading and bullet-like paragraphs, not a card column.

### Navigation / Reading Rail

What works:

- Desktop rail is useful and semantically a nav.
- Mobile progress component is helpful and sticky.
- `aria-current="location"` is used for active rail items.

Issues:

- The rail visually reinforces the product UI feeling because it is a mini control panel next to the report.
- On tablet/mobile, the sticky progress control takes vertical space and adds another UI surface inside an already dense reading experience.

Recommendation:

- Keep the rail, but make it quieter and more table-of-contents-like.
- On mobile, consider a thinner progress bar with a collapsible section list rather than a persistent card.

## 7. Drivers Section Diagnosis

Current implementation:

- `components/results/single-domain-result-section.tsx:183` branches into a custom drivers layout.
- `components/results/single-domain-result-section.tsx:211` renders `sonartra-single-domain-driver-layout`.
- `components/results/single-domain-result-section.tsx:212` renders the primary driver in `driver-main`.
- `components/results/single-domain-result-section.tsx:225` renders secondary/supporting/limitation inside `driver-support-rail`.
- `app/globals.css:1017` switches the layout to two desktop columns at `1100px+`.
- `app/globals.css:1023` sets the main driver surface to `min-height: 100%`.

Why dead space appears:

- The layout turns one narrative sequence into a comparison grid.
- The left column gets one large primary card. The right column gets a stacked rail of three different content types.
- Text length is variable, so card heights cannot create a balanced composition.
- The right rail uses narrower measure for long prose, so it becomes tall and dense.
- `min-height: 100%` on the main surface encourages the primary block to visually match the layout column rather than the content's natural reading rhythm.
- The nested cards create their own internal padding, labels, borders, and gaps, multiplying whitespace around already long paragraphs.

Better structure:

- Replace the drivers grid with a single vertical "Signal drivers" chapter.
- Use four ordered driver entries:
  1. Primary driver
  2. Secondary driver
  3. Supporting context
  4. Range limitation
- Each entry should use one prose measure and a modest rank label.
- If scores are useful, place them in a small inline metadata row, not a side card.
- Use a subtle left-side timeline/rank rail if visual structure is needed.

## 8. Recommended Redesign Direction

Move from "premium dashboard report" to "premium traditional behavioural report".

The target feel should be:

- One coherent report page.
- Editorial chapters with consistent rhythm.
- Calm typography and strong prose measure.
- Fewer rounded cards.
- Fewer uppercase labels.
- Long text in a single vertical reading flow.
- Navigation that behaves like a table of contents.
- Accent treatments used sparingly for emphasis, not every section.

Recommended page model:

1. Report cover / metadata strip.
2. Executive summary / hero pattern.
3. Driver narrative, vertical ranked subsections.
4. Pair synthesis chapter.
5. Limitation / range chapter.
6. Application chapter.

## 9. Specific Implementation Recommendations

1. **Create a report page shell.**
   - Add a `ReportChapter` or `SingleDomainReportChapter` component with consistent header, prose, and optional accent variants.
   - Use it across hero, drivers, pair, limitation, and application.

2. **Replace the drivers grid.**
   - Remove the desktop two-column `driver-layout`.
   - Render four vertical driver entries.
   - Use one shared `SignalDriverEntry` component.

3. **Convert hero support to vertical prose.**
   - Remove `sm:grid-cols-2` for long support paragraphs.
   - Use a single lead paragraph plus stacked body paragraphs.

4. **Convert application from three columns to report subsections.**
   - Render `Rely on`, `Notice`, and `Develop` vertically at all widths.
   - If a horizontal treatment is retained, use only for very short action items.

5. **Normalize type scale.**
   - Reduce hero display heading size and negative tracking.
   - Use consistent H2 sizes across chapters.
   - Use H3s for driver/application subsections.
   - Standardize body copy to a readable report measure.

6. **Reduce visual surface count.**
   - Remove nested cards inside drivers.
   - Make pair and limitation feel like chapters, not separate widgets.
   - Use borders/dividers more than filled panels.

7. **Refine mobile progress.**
   - Keep the helpful progress behavior, but reduce card height and visual weight.
   - Consider a compact sticky bar with current section and a disclosure for the full list.

8. **Preserve result contract boundaries.**
   - Continue to render from `SingleDomainResultsViewModel` and the persisted single-domain payload.
   - Do not compute scores, rankings, or result text in UI.

## 10. Suggested Component / File Targets

Primary targets:

- `components/results/single-domain-result-report.tsx`
  - Owns report shell, intro, rail/progress placement, and section ordering.
  - Relevant lines: `43`, `44`, `78`, `100`, `115`.

- `components/results/single-domain-result-section.tsx`
  - Owns hero, drivers, application, pair, and limitation section rendering.
  - Relevant lines: `167`, `183`, `211`, `212`, `225`, `266`, `290`, `312`.

- `app/globals.css`
  - Owns most single-domain report layout and visual treatment.
  - Relevant lines: `736`, `781`, `787`, `967`, `1017`, `1023`, `1041`, `1073`.

Secondary targets:

- `components/results/result-reading-rail.tsx`
  - Desktop reading navigation.

- `components/results/result-reading-progress.tsx`
  - Mobile/tablet sticky reading progress.

- `lib/server/single-domain-results-view-model.ts`
  - Only if existing section model needs additional display metadata. Avoid adding computed result meaning here unless it remains a pure projection of the persisted payload.

## 11. Accessibility And Semantics

What is sound:

- The page has a `main` landmark.
- The result rail is a `nav` with `aria-label="Report reading navigation"`.
- Active reading rail items use `aria-current="location"`.
- Mobile progress includes an `aria-live="polite"` status.
- Reduced motion is covered in CSS through `prefers-reduced-motion: reduce`.
- The single-domain route uses H1 followed by H2 section headings.

Issues and recommendations:

- Driver and application subgroups are visually headings but are mostly styled as utility labels. Promote these to semantic H3s where they introduce meaningful subsections.
- Focus states exist through shared focus-ring classes, but the rail and mobile progress should be checked again after redesign because lower visual weight can accidentally weaken focus visibility.
- Contrast is generally acceptable for high-level text, but secondary prose often uses low-opacity white. For long report text, avoid going too dim.
- Motion reveal is restrained and has reduced-motion handling, but a report page should not depend on reveal animation to feel structured.

## 12. Console And Network Findings

Console:

- No render errors were observed.
- Only Clerk development-key warnings appeared.

Network:

- The live route returned `200`.
- Static assets, RSC requests, Clerk resources, and the Sonartra logo loaded successfully.
- No relevant failed route or render-network failures were observed during the viewport checks.

## 13. Proposed Follow-Up Codex Task Sequence

Break implementation into multiple tasks. One large redesign task would risk mixing layout, typography, navigation, and regression validation.

Recommended sequence:

1. **Report shell and typography pass**
   - Create the shared report chapter grammar.
   - Normalize H1/H2/body measures.
   - Reduce uppercase label noise.
   - Keep section order and payload use unchanged.

2. **Drivers section rebuild**
   - Replace the two-column driver grid with vertical ranked driver entries.
   - Add semantic H3s.
   - Validate desktop/tablet/mobile with screenshots.

3. **Hero, pair, limitation, and application editorial pass**
   - Convert hero support and application to vertical reading flow.
   - Make pair and limitation use the same chapter grammar.
   - Preserve all persisted text.

4. **Reading rail and mobile progress refinement**
   - Make navigation quieter and more report-like.
   - Recheck focus states, `aria-current`, sticky behavior, and mobile viewport space.

5. **Final live UX regression**
   - Verify 1440, 1280, 1024, 768, 430, and 390 widths.
   - Capture before/after screenshots.
   - Confirm no route, console, or network regressions.

## 14. Blockers

No technical blocker prevented the audit. The only product constraint is that a high-quality redesign should preserve the canonical result payload rule: the UI should continue to consume persisted result payload text and structure, not recompute scoring or result meaning.
