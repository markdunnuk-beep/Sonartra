# Engine Runner (Task 12)

## Purpose

`runAssessmentEngine(...)` is the single canonical execution entrypoint for the Sonartra MVP engine.

It enforces one path only:

1. load definition
2. build runtime execution model
3. score responses
4. normalize results
5. build canonical result payload

There are no alternate execution modes, hybrid paths, or UI-side orchestration branches.

## Public API

```ts
runAssessmentEngine(params: {
  repository: AssessmentDefinitionRepository;
  assessmentKey?: string;
  versionKey?: string;
  responses: RuntimeResponseSet;
}): Promise<CanonicalResultPayload>
```

Selection behavior:

- `assessmentKey` only:
  - loads the published definition for that assessment
- `versionKey` present:
  - loads the explicit version for the resolved assessment key
  - the assessment key comes from `params.assessmentKey` or falls back to `responses.assessmentKey`

If the target definition cannot be found, the runner throws `EngineNotFoundError`.

## Stage responsibilities

- repository:
  - definition loading only
- runtime loader:
  - validation and execution indexing
- scoring:
  - raw signal and domain totals
- normalization:
  - percentages, domain-local shares, ranking
- result builder:
  - canonical payload projection and deterministic summary fields

The runner does not duplicate any of that logic. It only wires the stages together in strict order.

## Determinism

The orchestration layer adds no new runtime behavior beyond stage composition:

- no timestamps
- no randomness
- no DB writes
- no persistence
- no UI formatting

Given the same repository result and response set, it returns the same `CanonicalResultPayload`.

## Future persistence wrapper

Later persistence or attempt-completion services should wrap this runner rather than bypass it.

That keeps the platform aligned with the engine-first rule:

- one engine
- one execution path
- one result contract
