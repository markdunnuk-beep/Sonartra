# Report-First Schema Decision Note

## Purpose

RF9 showed that the static report-first renderer is viable enough to continue, but it also showed that raw Markdown is not sufficient as a future production payload.

The clearest issue was the Process-led preview: table-like source content collapsed into paragraphs when the Markdown was not consistently structured. That is acceptable for an authoring prototype, but it is too fragile for paid result rendering.

## Decision

Use Markdown for editorial authoring and review, but compile/import report-first content into structured JSON payload templates before runtime use.

Structured blocks are recommended because they preserve the report-first reading experience while giving the renderer reliable primitives for:

- evidence panels
- ranked signal stacks
- score tables
- chapter bodies
- prompt groups
- strength cards
- tightening cards
- development actions
- pull quotes
- PDF-ready sections
- diagnostics/admin-only notes

## Runtime boundary

Runtime scoring remains unchanged.

The existing runner should continue to compute scores from `option_signal_weights`, normalize ranked signal percentages, generate `pattern_key`, and persist one completed result payload.

`canonical_result_payload` remains the result retrieval source. Result pages, workspace surfaces, and results lists should continue to read persisted payloads only. No retrieval-time score recomputation, Markdown parsing, or runtime language lookup is recommended.

## Recommendation

Recommended next task:

`RF11: Create a static JSON payload fixture for one canonical report and render it through the static preview renderer.`

RF11 should test whether a structured payload can preserve the premium report-first experience without relying on raw Markdown parsing and without changing production runtime behavior.
