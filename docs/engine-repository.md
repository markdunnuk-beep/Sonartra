# Engine Definition Repository Layer (Task 7)

## Purpose

The engine repository layer loads the canonical assessment definition graph from the MVP database and assembles it into a `RuntimeAssessmentDefinition` for the single runtime execution path.

This layer is definition-loading only. It does **not** perform scoring, normalization, readiness checks, or result generation.

## Files and responsibilities

- `lib/engine/repository-sql.ts`
  - SQL access helpers for assessment/version resolution and graph row loading.
  - Reads only canonical definition tables (`assessments`, `assessment_versions`, `domains`, `signals`, `questions`, `options`, `option_signal_weights`).
- `lib/engine/repository-mappers.ts`
  - Pure mapping + assembly functions from SQL rows to runtime engine types.
  - Performs graph integrity checks and throws explicit integrity errors.
- `lib/engine/repository.ts`
  - Public repository API orchestration.
  - Supports loading by published assessment key and explicit version selectors.

## Loading sequence

1. Resolve assessment/version selector:
   - published by `assessment_key` + `lifecycle_status = 'PUBLISHED'`, or
   - explicit by `assessment_versions.id`, or
   - explicit by `(assessment_key + version)`.
2. Load full definition graph for the resolved `assessment_version_id`.
3. Assemble ordered runtime definition:
   - domains, signals, questions, options sorted by `order_index`
   - questions include options
   - options include signal weights
4. Return one canonical `RuntimeAssessmentDefinition`.

## Assembly boundary

Server-side assembly is required so the UI receives one deterministic runtime shape and does not perform relational joins, inference, or scoring-related graph construction.

This keeps the platform engine-first:
- one runtime data path
- one result contract path
- deterministic behavior across runs

## How later engine tasks consume this layer

Later runtime tasks (execution model loading, scoring, normalization, and payload generation) should depend on this repository API to obtain a pre-assembled `RuntimeAssessmentDefinition`.

That guarantees downstream logic always starts from the same canonical loaded graph.
