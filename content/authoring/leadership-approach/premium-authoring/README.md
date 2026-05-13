# Leadership Approach Premium Authoring

This folder defines the premium authoring workflow for Leadership Approach ranked-pattern result language. Its purpose is to turn full end-to-end interpretation into reviewed, traceable PSV-ready fields without changing the active engine, scoring model, import package, result payload, or result rendering.

The active model remains single-domain ranked-pattern:

- one active domain per published assessment version
- four scored signals
- twenty-four ranked signal patterns
- four score shapes
- deterministic scoring from `option_signal_weights`
- normalized ranked signal percentages
- `score_shape` classification from the normalized distribution
- `pattern_key` from `rank_1` through `rank_4` signal keys
- one persisted `canonical_result_payload`
- result surfaces that read persisted payload data only

## Source Of Truth

Pattern Dossiers are the editorial source of truth for premium interpretation. A dossier describes the full reader experience for one ranked pattern and score-shape focus before any PSV field is written.

The first approved benchmark dossier is:

```text
content/authoring/leadership-approach/premium-authoring/pattern-dossiers/process_results_people_vision.md
```

Do not rewrite that dossier as part of this workflow contract. Use it as the first quality benchmark for future Pattern Dossiers and mapped fields.

## Field Mapping Matrix

PSV rows must be derived through a Field Mapping Matrix. They must not be written directly from memory, from isolated field prompts, or from ad hoc section drafting.

The matrix exists to preserve lineage from:

```text
Pattern Dossier -> source anchor -> field transformation -> reviewed final text -> staged PSV row
```

Every mapped field must show where the language came from, how it was transformed, and what drift risk was checked.

## Why This Layer Exists

This layer prevents semantic drift. Premium report language is easy to weaken when a strong dossier is split into small PSV fields. The contract keeps each field tied to the ranked pattern, the score shape, and the reader-facing leadership interpretation.

It also keeps audit metadata out of runtime artifacts. Source anchors, excerpts, transformation notes, drift checks, and review status belong in authoring documents only. They must not leak into runtime PSV rows, workbook rows, result payloads, or user-facing result pages.

## Runtime Boundary

This folder sits above the existing ranked-pattern import package. It is an editorial and authoring layer only.

Runtime behaviour remains unchanged:

- no new scoring logic
- no runtime recomputation
- no alternate result path
- no UI-side interpretation
- no schema change
- no workbook compilation requirement for this documentation task

