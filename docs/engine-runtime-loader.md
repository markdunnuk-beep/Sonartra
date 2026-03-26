# Engine Runtime Loader (Task 8)

## Purpose

The runtime loader converts a `RuntimeAssessmentDefinition` into a `RuntimeExecutionModel` that is safe for deterministic engine execution.

This layer sits between:

1. Task 7 definition loading and assembly
2. Later engine execution stages such as scoring and normalization

It does not score, normalize, persist, or fetch data. Its job is to validate the assembled definition graph and prepare stable execution-time lookup structures.

## Files

- `lib/engine/runtime-loader.ts`
  - Public loader entry point
  - Graph validation orchestration
  - Typed validation errors
- `lib/engine/runtime-indexes.ts`
  - Pure deterministic index builders
  - Ordered collection helpers

## Public API

```ts
loadRuntimeExecutionModel(definition: RuntimeAssessmentDefinition): RuntimeExecutionModel
```

The loader:

- accepts the Task 7 runtime definition
- validates relationship integrity
- builds immutable lookup records
- preserves stable ordering for iteration
- returns one execution-ready structure

## Validation responsibilities

The loader fails explicitly when the assembled graph is not safe to execute.

It validates:

- duplicate ids and keys for domains, signals, questions, and options
- question -> domain references
- signal -> domain references
- option -> question references
- option signal weight -> signal references
- orphan domains with no related questions or signals
- orphan questions with no options
- orphan options with no signal weights
- orphan signals with no referenced weights

Invalid definitions throw `RuntimeExecutionModelValidationError`. The loader never returns a partially valid execution model.

## Indexes and ordered collections

The execution model provides:

- `domainById`
- `domainByKey`
- `signalById`
- `signalByKey`
- `questionById`
- `questionByKey`
- `optionById`
- `optionsByQuestionId`

It also provides ordered arrays for deterministic iteration:

- `domains`
- `signals`
- `questions`
- `options`

Ordering is derived from `orderIndex`, with stable id/key tie-breakers to avoid ambiguous runtime traversal.

## WPLP-80 compatibility

The loader remains generic and does not special-case WPLP-80, but it fully preserves the shape required by the WPLP-80 seed:

- question-section domains via `source = "question_section"`
- signal-group domains via `source = "signal_group"`
- overlay signals via `isOverlay` and `overlayType`

## Pipeline role

The intended engine path is:

1. Repository loads published assessment data from the database
2. Repository assembles a `RuntimeAssessmentDefinition`
3. Runtime loader validates and indexes that definition into a `RuntimeExecutionModel`
4. Scoring and later pipeline stages consume the execution model

This keeps the platform engine-first:

- one definition path
- one execution path
- one result contract
- deterministic runtime behavior
