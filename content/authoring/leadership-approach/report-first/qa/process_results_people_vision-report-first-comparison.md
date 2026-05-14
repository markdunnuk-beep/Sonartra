# Report-First Benchmark Comparison: process_results_people_vision

## 1. Purpose

This document compares:

- the report-first canonical benchmark
- the modular paired preview

The aim is to decide whether the report-first model should become the preferred Leadership Approach result-language direction.

This is a product and editorial QA comparison only. It does not approve production implementation, change runtime behavior, alter scoring, define import logic, or replace the existing persisted result pipeline.

## 2. Inputs reviewed

Reviewed files:

- `content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md`
- `content/authoring/leadership-approach/premium-authoring/previews/process_results_people_vision.paired.preview.md`
- `content/authoring/report-first/sonartra-premium-editorial-report-standard.md`
- `content/authoring/leadership-approach/report-first/leadership-approach-report-structure-v1.md`
- `content/authoring/leadership-approach/report-first/premium-result-language-quality-rubric.md`

## 3. Summary verdict

The modular paired preview is strong. It is concise, coherent, materially better than earlier modular result-language approaches, and it proves that the field-map workflow can carry Process-and-Results meaning while framing People and Vision as range.

The report-first canonical benchmark is stronger as a premium editorial reading experience. It has a clearer reader journey, richer chapter progression, more complete leadership interpretation, better pressure and development coverage, and a stronger opening-to-closing arc. It also appears better suited to PDF output because it already reads like a reference report rather than a set of assembled result sections.

Product recommendation: treat report-first as the preferred Leadership Approach direction unless later implementation complexity proves disproportionate. This is not a production decision. It is a product/editorial recommendation to continue the proof.

## 4. Scored comparison

| Category | Modular paired preview | Report-first canonical benchmark |
|---|---:|---:|
| Hero/opening impact | 8.7 | 9.2 |
| Editorial coherence | 8.5 | 9.3 |
| Reader recognition | 8.7 | 9.1 |
| Behavioural specificity | 8.8 | 9.2 |
| Leadership applicability | 8.8 | 9.3 |
| Team impact | 8.6 | 9.2 |
| Decision behaviour | 8.4 | 9.1 |
| Communication behaviour | 8.3 | 9.0 |
| Pressure behaviour | 8.5 | 9.2 |
| Development value | 8.6 | 9.2 |
| Lower-ranked signal framing | 8.9 | 9.2 |
| Absence of modular/component feel | 8.1 | 9.3 |
| Premium tone | 8.7 | 9.2 |
| PDF suitability | 8.0 | 9.3 |
| Scalability across future assessments | 8.4 | 9.0 |
| Overall commercial product strength | 8.6 | 9.2 |

Headline: the modular preview clears the paid-quality bar and remains a credible fallback at roughly `8.6/10`. The report-first benchmark is the stronger commercial product candidate at roughly `9.2/10`, mainly because it feels authored as a complete report rather than assembled from high-quality components.

## 5. Strengths of the modular preview

The modular preview is concise and easy to scan. It gives the reader the core Process-and-Results meaning quickly without overloading the page.

It is structurally disciplined. The preview validates the field-map workflow and shows that a schema-driven generation path can produce coherent reader-facing language.

It carries the paired Process-and-Results interpretation well. The copy makes clear that Process creates the route while Results keeps it connected to movement and progress.

It frames People and Vision as range rather than weakness. The lower-ranked signals are treated as useful extension, especially around ownership, meaning, and direction.

It is useful for testing schema-driven generation because the sections map cleanly to orientation, recognition, mechanics, synthesis, strengths, narrowing, application, and closing integration.

It provides a controlled fallback if report-first is not implemented. The preview is strong enough to protect result quality while the product decides whether the extra authoring and rendering work for report-first is justified.

## 6. Limitations of the modular preview

The modular preview is still visibly section/block-based. The sections are individually strong, but the result still reads like a well-arranged preview rather than a finished editorial report.

It has less editorial pacing. The reader moves quickly from concept to section to section, with less room for recognition, interpretation, implication, and application to build progressively.

It is less PDF-native. It could be exported, but it would feel more like a concise result summary than a premium reference document.

It is more tied to field-level content assembly. That makes it useful for controlled generation, but it also increases the risk that scaled outputs will feel mechanically composed.

It has a higher risk of feeling component-generated when scaled across patterns, especially if the same section rhythm, list shape, and closing structure repeat across many reports.

## 7. Strengths of the report-first benchmark

The report-first benchmark creates a stronger reader journey. It begins with a clear result statement, builds recognition, explains the pattern, shows evidence, expands into leadership behavior, and closes with a coherent synthesis.

It has a stronger opening and closing. The opening gives the result immediate meaning, while the final synthesis feels earned by the chapters that precede it.

It provides a more complete editorial arc. The chapters cover value creation, team experience, decision behavior, communication behavior, pressure behavior, strengths, narrowing, rank 3 range, rank 4 range, development, and closing integration.

It has better chapter progression. Each chapter adds a distinct layer rather than repeating the same Process-and-Results idea in a different block.

It is better suited to PDF output. The depth, pacing, chapter structure, evidence panel, development section, final line, and PDF CTA already resemble a premium reference report.

It is easier to manage premium tone because the report can be authored as one interpretation rather than optimized one field at a time.

It gives stronger creative control. The author can shape pacing, emphasis, and transitions without being constrained by a modular result-section contract.

It looks more realistic for 24 canonical reports per assessment than 96 score-shape variants, provided cross-pattern QA prevents repetition and each report remains differentiated.

## 8. Limitations and risks of the report-first model

The model requires authoring 24 high-quality canonical reports for Leadership Approach. That is a smaller inventory than 96 score-shape variants, but each report has to clear a higher editorial bar.

It requires a new report-first payload/rendering model if implemented. That implementation must preserve the existing runtime constraints: deterministic scoring, `pattern_key` generation from ranked signals, one persisted canonical result payload, and retrieval from persisted payload only.

It may reduce score-shape nuance. `score_shape` can remain metadata or diagnostic context, but report-first should not force four reader-facing variants per pattern unless evidence proves that extra nuance improves product quality.

It needs safeguards to prevent 24 reports from becoming too similar. The current benchmark is strong, but the product proof is not complete until multiple patterns across different first-ranked signals are reviewed together.

It requires cross-pattern QA and similarity checks. Reports must differ in leadership attention, pressure behavior, team impact, decision behavior, communication behavior, and development moves.

It still needs proof via more than one pattern. One excellent report is a benchmark, not yet a validated authoring system.

## 9. Recommended go/no-go criteria

Go criteria:

- `process_results_people_vision` remains `9+/10` after QA.
- The next 3 canonical reports across different first-ranked signals reach at least `8.5+/10`, preferably `9+`.
- Reports are clearly differentiated from each other.
- Report-first content can be rendered in a premium web layout without major compromise.
- PDF-style output looks credible from the same content model.
- Runtime integration can preserve canonical_result_payload retrieval rules.
- Implementation does not require rebuilding the runner or scoring engine.

No-go criteria:

- Canonical reports become too hard to author consistently.
- Reports feel repetitive across patterns.
- The report-first renderer becomes disproportionately complex.
- PDF output cannot be made credible without excessive manual production.
- Implementation would require destabilising the current runner/scoring/publish flow.

## 10. Recommended next proof step

Recommended RF3 path: create 3 additional canonical Leadership Approach reports across different `rank_1_signal_key` values before building renderer work.

Reason: the report-first benchmark is strong enough to continue, but the main unresolved product risk is authoring repeatability and cross-pattern differentiation. Before investing in schema, payload, or renderer work, the product should prove that the model can produce several distinct premium reports without drift, repetition, or generic leadership language.

If product confidence is already high, the alternative RF3 path is to create a report-first canonical report schema/payload proposal and a static markdown-to-preview renderer prototype, without runtime database changes. That path is useful, but it answers implementation shape before authoring repeatability has been proven.

Do not change production runtime until at least one report-first rendered prototype has been reviewed.

## 11. Decision status

`RECOMMEND_REPORT_FIRST_PROOF_CONTINUES`
