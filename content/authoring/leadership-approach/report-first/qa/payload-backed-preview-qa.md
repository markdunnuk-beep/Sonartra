# Payload-Backed Report-First Preview QA

## 1. Purpose

This QA reviews whether the structured JSON payload-backed preview preserves the premium report-first reader experience and resolves the raw Markdown fragility found in RF9.

This is not production approval. No runtime implementation has been made. No database schema has changed. The payload-backed preview is a static authoring proof used to test whether `report_first_canonical_payload_v1` can support a future web/PDF result experience without depending on fragile Markdown rendering.

## 2. Inputs reviewed

Payload fixture:

- `content/authoring/leadership-approach/report-first/payload-fixtures/process_results_people_vision.payload.json`

Payload preview:

- `content/authoring/leadership-approach/report-first/previews/process_results_people_vision.payload.preview.html`

Markdown preview:

- `content/authoring/leadership-approach/report-first/previews/process_results_people_vision.preview.html`

Canonical report source:

- `content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md`

Schema proposal:

- `content/authoring/leadership-approach/report-first/schema/report-first-canonical-payload-v1.md`

Renderer and tests:

- `scripts/authoring/render-report-first-preview.ts`
- `tests/authoring-report-first-preview.test.ts`
- `tests/authoring-report-first-payload-preview.test.ts`
- `tests/authoring-report-first-preview-static.test.ts`

## 3. QA method

QA methods used:

- static HTML inspection of the payload-backed preview
- payload fixture inspection against the RF10 schema proposal
- Markdown preview vs payload preview comparison
- focused renderer test coverage for Markdown and payload modes
- static preview checks for generated HTML files
- leakage checks against reader-facing output
- production build validation

Chrome DevTools was not used directly against the local static HTML in this environment. The practical method for this pass was static inspection plus node/static tests. That is sufficient for RF12 because the task is deciding payload/rendering feasibility, not approving a final browser UI.

## 4. Markdown vs payload comparison

| Area | Markdown-backed preview | Payload-backed preview | Verdict |
|---|---|---|---|
| Evidence panel rendering | Present, but dependent on source Markdown formatting. | Present and rendered from explicit `evidence` fields. | Payload is stronger. |
| Ranked signal rendering | Can collapse if source uses loose table-like text. | Uses structured ranked signal rows. | Payload fixes the RF9 weakness. |
| Score table rendering | The Process-led Markdown preview did not reliably render table-like evidence as a table. | Renders score rows as an actual table, including `Process` and `42%`. | Payload is production-feasibility positive. |
| Chapter rendering | Strong for narrative chapters, weaker for repeated lists/prompts. | Chapters render from explicit chapter keys and block types. | Payload is more reliable. |
| Key insight rendering | Good. | Good. | Equivalent. |
| Strength/tightening/development blocks | Can read as long prose if Markdown structure is loose. | Renders as typed cards/actions. | Payload is stronger. |
| Prompt groups | Can become paragraph-like. | Rendered as prompt groups with list structure. | Payload is stronger. |
| Admin/debug appendix | Separated. | Separated and includes payload-specific diagnostics. | Acceptable in static preview only. |
| Reader-facing leakage | Existing tests pass. | Payload tests pass; diagnostics remain out of the reader body. | Acceptable. |
| Overall premium feel | Premium but structurally weaker in evidence. | Premium and more controlled structurally. | Payload-backed rendering is the better production direction. |

The payload-backed preview preserves the editorial quality of the Process-led report while improving structural reliability. Markdown remains useful for authoring and editorial review, but it should not be the production payload.

## 5. Product/UX score

Scores use a 1-10 scale.

| Criterion | Score | Notes |
|---|---:|---|
| Hero impact | 9.0 | The hero still reads like a premium result statement. |
| Editorial reading experience | 8.7 | The report keeps its flow, though the fixture is a shortened proof rather than the full canonical text. |
| Evidence panel reliability | 9.1 | Structured evidence is materially better than Markdown inference. |
| Ranked signal clarity | 8.9 | Signal order, role labels, and scores are clear. |
| Chapter pacing | 8.4 | All chapters are present; future production payloads should carry the full approved report text. |
| Structured card/list rendering | 8.9 | Strength, tightening, development, and prompt blocks render cleanly. |
| Key insight value | 8.8 | The insight remains specific to the Process-led pattern. |
| Development section clarity | 8.8 | Development actions are clearer as typed blocks. |
| Closing synthesis strength | 8.5 | Strong enough for the proof, with full-report expansion needed for production parity. |
| PDF CTA fit | 8.5 | Natural in the page; PDF layout itself is still unproven. |
| Premium look and feel | 8.5 | Static style remains credible, though not final product design. |
| Absence of debug/component feel | 8.4 | Reader body is clean; appendix is clearly separated. |
| Payload suitability for web rendering | 9.0 | The block model is adequate for a production renderer plan. |
| Payload suitability for PDF-style rendering | 8.3 | Promising, but PDF-specific layout and pagination are unproven. |
| Overall production-feasibility confidence | 8.8 | Strong enough to justify implementation planning, not implementation approval. |

Overall product/UX score: 8.8/10.

## 6. Technical feasibility assessment

The payload shape appears sufficient for:

- result page rendering
- reading rail generation
- score evidence injection
- structured chapters
- cards, lists, tables, and prompt groups
- admin-only note separation
- initial PDF-style rendering exploration
- a future import/compile step from approved Markdown authoring source

Gaps:

- only one report has a payload fixture
- the fixture was hand-created, not compiled from Markdown
- schema validation is not implemented
- import/storage model is not implemented
- production renderer is not implemented
- PDF rendering has not been proven
- mobile/browser QA is still needed for any production renderer
- payload versioning and content hashing are not implemented
- admin preview/review workflow is not implemented
- the fixture is complete enough for feasibility but shorter than the approved full canonical report

None of these gaps block moving to production implementation planning. They do block production implementation approval.

## 7. Reader-facing leakage check

The payload-backed preview excludes the following from reader-facing content:

- Editorial QA Notes
- diagnostics/admin-only note content
- source file paths
- raw `pattern_key`
- schema, PSV, field map, runtime, payload, and `canonical_result_payload` language

The separated admin/debug appendix includes source type and diagnostics labels. That is acceptable for the static authoring preview only and should not appear in a production reader-facing result page.

## 8. Payload/schema implications

RF12 confirms the core RF10 direction:

- structured blocks are required
- raw Markdown should remain authoring-only
- evidence should be injected from scoring output
- table, list, card, prompt, and development action groups should be explicit block types
- diagnostics must be admin-only
- result retrieval should still read the persisted `canonical_result_payload` only

The main change from the Markdown-only proof is confidence level. The payload-backed preview demonstrates that the proposed structured content model can preserve premium editorial experience while reducing renderer fragility.

## 9. Production feasibility gate

`PAYLOAD_BACKED_PREVIEW_PASSED__PRODUCTION_IMPLEMENTATION_PLAN_RECOMMENDED`

This does not mean report-first is approved for production. It means the payload-backed static proof is strong enough to justify a dedicated production implementation plan.

Do not mark this as:

- `APPROVED_FOR_PRODUCTION`
- `IMPLEMENTED`
- `MIGRATED`
- `PUBLISHED`

## 10. Recommended next task

Recommended next task:

`RF13: Define report-first production implementation plan.`

RF13 should define:

- storage/import strategy
- completion-time assembly
- `canonical_result_payload` shape
- report-first result page renderer plan
- PDF/export plan
- admin preview/review plan
- testing/rollout plan
- legacy/current result compatibility
- production task breakdown

If implementation planning uncovers disproportionate complexity, the next step should be a narrower RF12A/RF13A planning correction rather than runtime changes.

## 11. Remaining no-go boundaries

Production implementation should still not begin until RF13 defines:

- exact storage model
- import/compile path
- validation/publish rules
- payload assembly flow
- result-page rendering plan
- PDF plan
- fallback and legacy strategy
- test strategy

The current ranked-pattern engine, scoring, runner, result persistence, and result retrieval boundaries remain unchanged.
