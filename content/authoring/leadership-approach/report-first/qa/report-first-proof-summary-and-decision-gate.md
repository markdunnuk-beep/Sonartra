# Leadership Approach Report-First Proof Summary And Decision Gate

## 1. Purpose

This document summarizes the report-first authoring proof for Leadership Approach and defines the decision gate for what happens next.

This is not production approval. No runtime changes have been made. The existing single-domain ranked-pattern engine remains intact, including deterministic scoring, ranked signal calculation, `pattern_key` generation, and persisted result retrieval. The report-first model is being evaluated here as a product and content model, not as an implemented production result path.

## 2. Report-first model under consideration

The model under consideration is:

- 24 canonical premium reports per assessment
- one fully authored report per ranked `pattern_key`
- `score_shape` may remain metadata or diagnostic context
- `score_shape` should not drive reader-facing variation unless proven to improve quality
- report selected by `pattern_key` after deterministic scoring
- result rendered as a premium editorial report for web and PDF-style output

The intent is to preserve the current scoring and ranked-pattern assumptions while replacing modular result-language assembly with a complete authored report selected by ranked pattern.

## 3. Current proof artefacts

Benchmark candidates:

- `process_results_people_vision` — `content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md`
- `results_process_people_vision` — `content/authoring/leadership-approach/report-first/canonical-reports/results_process_people_vision.md`
- `people_process_results_vision` — `content/authoring/leadership-approach/report-first/canonical-reports/people_process_results_vision.md`
- `vision_people_process_results` — `content/authoring/leadership-approach/report-first/canonical-reports/vision_people_process_results.md`

Supporting standards:

- `content/authoring/report-first/sonartra-premium-editorial-report-standard.md`
- `content/authoring/leadership-approach/report-first/leadership-approach-report-structure-v1.md`
- `content/authoring/leadership-approach/report-first/premium-result-language-quality-rubric.md`
- `content/authoring/leadership-approach/report-first/templates/canonical-report-template.md`

Supporting QA docs:

- `content/authoring/leadership-approach/report-first/qa/process_results_people_vision-report-first-comparison.md`
- `content/authoring/leadership-approach/report-first/qa/report-first-authoring-repeatability-check.md`

## 4. Manual QA summary

| pattern_key | lead signal | report title | quality estimate | QA status | core differentiation | main QA risk |
|---|---|---|---:|---|---|---|
| `process_results_people_vision` | Process | Leadership Approach — Process, Results, People, Vision | 9.0/10 | PASS | Starts with structure, sequence, repeatability, and making work easier to hold. | Overusing path/route language or becoming too operational. |
| `results_process_people_vision` | Results | Leadership Approach — Results, Process, People, Vision | 9.0-9.1/10 | PASS | Starts with traction, closure, visible progress, and action. | Drifting into generic productivity or action language. |
| `people_process_results_vision` | People | Leadership Approach — People, Process, Results, Vision | 9.0-9.1/10 | PASS | Starts with trust, ownership, participation, and human conditions that make work carryable. | Drifting into generic inclusive-leadership or soft-skills language. |
| `vision_people_process_results` | Vision | Leadership Approach — Vision, People, Process, Results | 9.0/10 | PASS | Starts with future direction, strategic meaning, and what the work is meant to build. | Drifting into generic inspirational, purpose-led, or strategy-language content. |

## 5. Cross-pattern differentiation assessment

The four reports are sufficiently differentiated for this proof stage. They are not simple signal swaps, and each has a different centre of gravity.

The first leadership move differs clearly:

- Process-led starts by making work structured, sequenced, and easier to hold.
- Results-led starts by creating traction, closure, action, and visible progress.
- People-led starts by building trust, ownership, participation, and shared commitment.
- Vision-led starts by naming future direction, strategic meaning, and what the work is meant to create.

The pressure tightening patterns also differ:

- Process-led tightens toward control, sequence, and delivery discipline.
- Results-led tightens toward urgency, closure, output, and pace.
- People-led tightens toward protection, reassurance, and cohesion.
- Vision-led tightens toward explaining the future direction, building confidence, and restating purpose.

The development edges are distinct:

- Process-led needs structure to become more shared and meaningful.
- Results-led needs progress to become owned, evidence-aware, and directionally meaningful.
- People-led needs trust to produce timely decisions, candour, and visible traction.
- Vision-led needs future direction to become concrete, sequenced, owned, and evidence-backed.

Lower-ranked signals are consistently framed as range rather than weakness. Each report also uses different commercial application contexts and language families: operational route language for Process, traction and closure language for Results, trust and ownership language for People, and future capability and strategy translation language for Vision.

## 6. Report-first vs modular model conclusion

The RF2 comparison remains the current product/editorial conclusion.

The modular paired preview is strong and paid-quality. It remains a credible fallback because it is concise, coherent, and materially stronger than earlier modular result-language approaches.

The report-first benchmark is stronger as a premium editorial product. It provides a fuller reader journey, better opening-to-closing arc, stronger PDF suitability, greater creative control, and more realistic scaling to 6-8 assessments if the canonical report model proves implementable.

Report-first should therefore be treated as the preferred product/content direction unless implementation complexity proves disproportionate.

## 7. Recommended product direction

Recommended product/content direction:

`REPORT_FIRST_CANONICAL_MODEL_PREFERRED_FOR_LEADERSHIP_APPROACH`

This is a product and content direction. It is not production implementation approval. Runtime architecture still needs a separate feasibility and prototype stage before any production decision.

## 8. Decision gate before implementation

Recommended next proof stage: build a static report-first preview renderer prototype before authoring all remaining 20 reports.

Reason:

- the authoring proof is now strong enough
- the next major unknown is whether canonical reports can render into a premium Sonartra result page and PDF-style output without losing quality
- renderer and payload feasibility should be tested before scaling the full 24-report inventory

Decision gate requirements for the renderer prototype:

- render one or more canonical Markdown reports as a premium web-style preview
- include hero, evidence panel, reading rail, chapters, pull quote/key insight, development section, closing synthesis, and PDF CTA
- exclude Editorial QA Notes from reader-facing output
- preserve existing scoring and `pattern_key` assumptions
- avoid runtime and database changes
- provide a payload/schema recommendation after static rendering is proven

## 9. Alternative next option

Alternative: author 4 more canonical reports before renderer work.

This would be preferred if:

- product confidence in authoring repeatability is still low
- more evidence is needed across different second, third, and fourth-ranked combinations
- implementation work should be deferred

Recommendation: given the four lead-signal benchmark reports now pass manual QA, the preferred next step is renderer/payload feasibility, not more authoring.

## 10. Production no-go boundaries

Production implementation should not begin unless:

- renderer prototype proves the report-first content can produce a premium reader experience
- `canonical_result_payload` retrieval rules can be preserved
- runner/scoring does not need to be rebuilt
- Editorial QA Notes can be excluded from reader output
- score evidence can be injected without disrupting the authored report
- PDF/static export approach is technically credible
- report-first import/storage model can be defined without destabilising current package flow

## 11. Remaining risks

- 24 full reports still need to be authored and QA'd.
- Cross-pattern similarity checks will be required.
- Vision-led and People-led reports need ongoing concreteness checks.
- PDF output may require a separate design pass.
- Report-first schema/payload still needs definition.
- Implementation must not destabilise the existing paid-ready runner, workspace, result persistence, or retrieval path.

## 12. Recommended next task

Recommended next task:

`RF8: Build static report-first preview renderer prototype.`

Objective: render the existing canonical Markdown reports into a local/static premium result preview, without runtime database changes.

The renderer should test:

- content parsing
- report structure
- reading rail
- evidence panel
- chapter layout
- exclusion of Editorial QA Notes
- PDF-style layout suitability
- whether the report-first model can replace the modular result page experience

Do not implement production runtime yet.

## 13. Decision status

`REPORT_FIRST_PROOF_SUPPORTED__STATIC_RENDERER_PROTOTYPE_RECOMMENDED`
