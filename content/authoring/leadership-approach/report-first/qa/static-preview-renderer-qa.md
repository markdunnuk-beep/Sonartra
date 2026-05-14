# Static Report-First Preview Renderer QA

## 1. Purpose

This audit reviews the RF8 static HTML previews as a product and UX proof. It is not production implementation approval.

The goal is to judge whether the authored report-first content can survive rendering into a premium web-style result experience, and whether the prototype is strong enough to justify a payload/schema proposal stage.

No production result routes, scoring, database schema, admin import flow, package rows, PDF generation, or runtime report-first integration are approved by this document.

## 2. Inputs reviewed

Preview HTML files:

- `content/authoring/leadership-approach/report-first/previews/process_results_people_vision.preview.html`
- `content/authoring/leadership-approach/report-first/previews/results_process_people_vision.preview.html`
- `content/authoring/leadership-approach/report-first/previews/people_process_results_vision.preview.html`
- `content/authoring/leadership-approach/report-first/previews/vision_people_process_results.preview.html`

Source canonical reports:

- `content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md`
- `content/authoring/leadership-approach/report-first/canonical-reports/results_process_people_vision.md`
- `content/authoring/leadership-approach/report-first/canonical-reports/people_process_results_vision.md`
- `content/authoring/leadership-approach/report-first/canonical-reports/vision_people_process_results.md`

Supporting renderer/test files:

- `scripts/authoring/render-report-first-preview.ts`
- `tests/authoring-report-first-preview.test.ts`
- `tests/authoring-report-first-preview-static.test.ts`

## 3. QA method

QA methods used:

- manual file inspection of all generated preview HTML files
- static HTML inspection of structure, anchors, appendix separation, and content leakage
- focused node test coverage for parser/renderer behavior from RF8
- additional static HTML tests for generated preview files
- leakage checks for QA notes and internal authoring/runtime terms
- production build validation to confirm the new authoring script does not break type/build checks

Chrome DevTools was not used directly against local static files in this environment. The preview files are file-based authoring artifacts rather than a served route, so the practical QA method here was manual/static HTML inspection plus Playwright-style static checks through `node:test`.

## 4. Visual/product audit criteria

Scores use a 1-10 scale.

| Preview | Hero impact | Editorial reading experience | Typography/readability | Evidence panel usefulness | Reading rail usefulness | Chapter pacing | Key insight value | Development clarity | Closing strength | PDF CTA fit | Premium look and feel | Absence of debug/component feel | Mobile/responsive suitability | Overall static prototype readiness |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `process_results_people_vision` | 9.0 | 8.5 | 8.4 | 6.8 | 8.3 | 8.8 | 8.7 | 8.6 | 8.8 | 8.5 | 8.2 | 7.8 | 7.6 | 8.1 |
| `results_process_people_vision` | 9.1 | 8.8 | 8.5 | 8.2 | 8.4 | 8.8 | 8.8 | 8.8 | 8.9 | 8.5 | 8.3 | 8.0 | 7.7 | 8.6 |
| `people_process_results_vision` | 8.9 | 8.8 | 8.5 | 8.2 | 8.4 | 8.8 | 8.7 | 8.8 | 8.8 | 8.5 | 8.3 | 8.0 | 7.7 | 8.6 |
| `vision_people_process_results` | 8.8 | 8.7 | 8.5 | 8.2 | 8.4 | 8.7 | 8.7 | 8.7 | 8.8 | 8.5 | 8.3 | 8.0 | 7.7 | 8.5 |

## 5. Per-preview no-BS assessment

### process_results_people_vision

Score: 8.1/10 as a static rendered prototype.

What works:

- The hero is strong and immediately report-like.
- The chapter flow still reads as a premium editorial report.
- The sticky reading rail makes a long report navigable.
- The dark editorial styling feels credible for a Sonartra prototype.

What feels weak:

- The source report uses tab-separated evidence and pattern rows, so the renderer collapses those into paragraphs instead of proper tables.
- The evidence panel is visually distinct but not yet polished enough because the score evidence is not consistently table-rendered.
- Some question lists render as paragraph runs rather than discrete prompts.

UX/content/rendering issue:

- This is the clearest renderer/source-format defect. Before payload/schema work, the model needs a normalized table/list representation or the renderer needs support for tab-separated canonical report tables.

Premium/editorial quality:

- The report still feels premium overall, but the evidence/pattern rendering weakens confidence compared with the other three previews.

### results_process_people_vision

Score: 8.6/10 as a static rendered prototype.

What works:

- The hero has strong commercial impact.
- The evidence panel renders more cleanly because the source uses Markdown tables.
- The report preserves its Results-led pace and distinct development edge.
- Chapter pacing remains strong in the rendered format.

What feels weak:

- The reading rail has repeated `Range` labels for Chapter 8/9, which works but is not ideal for scanning.
- Long prompt sequences sometimes render as paragraphs rather than checklist-like lines.

UX/content/rendering issue:

- Development moves are readable, but a production renderer should treat repeated numbered sub-sections and prompt groups as stronger visual units.

Premium/editorial quality:

- The report survives rendering well and still feels authored rather than assembled.

### people_process_results_vision

Score: 8.6/10 as a static rendered prototype.

What works:

- The People-led report retains a mature, commercially grounded tone.
- The layout helps prevent the relational content from feeling soft or generic.
- Evidence, rail, insight, chapters, closing, and CTA all appear in the expected order.

What feels weak:

- The page is long, and the static rail helps but does not provide active state or progress feedback.
- Some development sections would benefit from card-like grouping in a later renderer.

UX/content/rendering issue:

- No blocker. The main improvement is stronger visual grouping for development moves and pressure checks.

Premium/editorial quality:

- The rendered version remains premium and distinct from Process-led and Results-led reports.

### vision_people_process_results

Score: 8.5/10 as a static rendered prototype.

What works:

- The final concrete-language polish keeps the Vision-led report commercially grounded.
- The rendered report maintains future direction without collapsing into generic inspiration.
- The evidence panel, reading rail, and chapter sequence support the report’s length.

What feels weak:

- This is still the highest abstraction-risk report; layout alone cannot solve that.
- The static design is credible but not yet distinctive enough for the most future-facing content.

UX/content/rendering issue:

- A production renderer should give Vision-led evidence, development, and practical proof sections stronger visual structure to keep the report anchored in action.

Premium/editorial quality:

- The report remains premium when rendered, but it should keep receiving close concreteness QA.

## 6. Cross-preview comparison

All four previews feel like the same premium product family. The shared layout helps because it creates a stable report format across different leadership patterns.

Each report remains differentiated. Process is structure-first, Results is traction-first, People is ownership-first, and Vision is future-direction-first. The rendered HTML does not flatten those distinctions.

The repeated layout mostly helps. It makes the reports feel like a product system rather than four unrelated documents. The downside is that long reports can feel mechanically paced if future renderer work does not add better visual grouping for strengths, tightening risks, development moves, and prompt clusters.

The page length is appropriate for a premium report. It is too long for a simple web card result, but that is the point of the report-first model. The reading rail is necessary and useful.

The evidence panel supports the report when the source uses Markdown tables. It weakens when tab-separated source content collapses into paragraphs.

The PDF CTA feels natural as a report reference affordance, but this prototype does not prove PDF layout quality.

## 7. Technical/rendering checks

Findings:

- Editorial QA Notes are not rendered in reader-facing output.
- Authoring/runtime terms did not leak into reader-facing output in the static checks.
- Raw internal `pattern_key` is not shown in reader-facing sections.
- Evidence panel exists in all four previews.
- Reading rail anchors link to existing sections.
- Chapters render in the correct order.
- Markdown tables render legibly when the source uses pipe table syntax.
- Tab-separated table-like content does not render as tables; this affects the Process-led preview.
- Pull quotes/key insights render as visually distinct highlighted sections.
- Static appendix is clearly separated from reader-facing report content.
- Generated HTML is deterministic enough for QA because no timestamp is included.
- No broken rail anchors were detected by static tests.

## 8. Playwright/static checks

A focused static HTML test was added:

`tests/authoring-report-first-preview-static.test.ts`

Checks covered:

- all four preview HTML files exist
- each contains hero, evidence, reading rail, key insight, chapters, closing, and PDF CTA
- each excludes Editorial QA Notes content from reader-facing body
- forbidden authoring/internal terms are not present in reader-facing body
- reading rail links point to existing anchors
- static appendix is present and separated from the reader-facing body

No full browser E2E was added. No production routes were created or modified.

## 9. Chrome DevTools findings

Chrome DevTools was not used directly against the local static files in this environment.

Static/manual inspection findings:

- desktop layout appears structurally credible: fixed-width content column, sticky reading rail, strong hero hierarchy, and visually distinct evidence/insight/CTA areas
- mobile CSS collapses the grid and places the rail above the report, which should avoid horizontal overflow
- readability is generally good, though long paragraphs and prompt groups need better production treatment
- evidence panel placement is right, but evidence formatting needs normalization
- reading rail behavior is useful as static anchor navigation, but lacks active state/progress feedback

## 10. Main issues and recommendations

Blocker:

- None for moving to payload/schema prototyping.

Should fix before payload/schema work:

- Normalize table/list content in the content model. The Process-led preview proves that relying on loose Markdown/table-like text is fragile.
- Define structured payload fields for evidence, ranked signals, normalized scores, chapters, lists, tables, and authoring-only notes rather than treating the final product as one Markdown blob.
- Ensure Editorial QA Notes are structurally separate from reader content in any future payload/import model.

Nice to have:

- Better visual grouping for strengths, tightening risks, development moves, and pressure questions.
- Distinct rail labels for rank 3 and rank 4 expansion instead of repeated `Range`.
- Active rail state or progress indication in a later web prototype.
- More refined mobile rail treatment for long reports.

Later production polish:

- PDF-specific layout pass.
- Print stylesheet or separate PDF renderer.
- Accessibility pass for heading hierarchy, landmark structure, contrast, and keyboard navigation.
- Visual design pass to align with the final paid result page system.

## 11. Payload/schema implications

A future report-first payload must preserve:

- metadata
- scoring evidence
- report hero
- opening statement
- evidence panel
- key insight
- reading rail/chapters
- cards/lists/tables/quotes
- closing synthesis
- final line
- PDF CTA
- diagnostics/admin-only notes excluded from reader output

Payload design should not depend on raw Markdown alone. Markdown is good for authoring and static preview, but the rendered previews show that the production payload needs structured content for evidence, tables, repeated development moves, prompt lists, and admin-only diagnostics.

## 12. Decision

`STATIC_RENDERER_PROTOTYPE_PASSED__PAYLOAD_SCHEMA_PROTOTYPE_RECOMMENDED`

This is not production approval. It means the static renderer is strong enough as a proof to justify defining a report-first canonical payload/schema proposal.

## 13. Recommended next task

Recommended next task:

`RF10: Define report-first canonical payload/schema proposal.`

RF10 should define the reader-facing and admin-only payload structure needed to preserve the report-first experience while keeping the existing scoring, runner, `pattern_key`, and persisted result retrieval constraints intact.
