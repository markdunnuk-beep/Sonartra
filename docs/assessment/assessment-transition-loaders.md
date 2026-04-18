# Assessment Transition Loaders

## Purpose

This note defines the explicit UI/runtime transition state model for the Sonartra assessment loader experience.

It exists to support two premium transition moments without changing the canonical engine architecture:

- pre-assessment initialisation
- post-submission result processing

These states are presentation and runtime coordination states around the existing canonical flow. They do not change engine execution, result persistence, result retrieval, or readiness semantics.

## Why these states are being introduced

The current platform already separates:

- attempt lifecycle resolution
- canonical completion execution
- persisted result retrieval

The new loader experience needs explicit state names so future UI work can present:

- a short starting transition between entry and first-question render
- a clear processing transition between final submit and persisted ready result retrieval

The goal is clarity at the UI/runtime layer, not a second assessment lifecycle.

## Canonical transition state model

The frontend/runtime transition states are:

- `IDLE`
- `STARTING`
- `IN_PROGRESS`
- `SUBMITTING`
- `PROCESSING_RESULT`
- `READY`
- `RESULTS_VIEW`

These states sit above the existing persisted Sonartra lifecycle and must be interpreted as follows:

- `IDLE`
  - no live runner session is active yet
  - usually maps to persisted lifecycle `not_started`
- `STARTING`
  - the app is creating or resolving the attempt and preparing the runner route/view model
  - this is a transient UI/runtime state, not a persisted engine state
- `IN_PROGRESS`
  - the user is actively answering questions in the canonical runner
  - maps to persisted lifecycle `in_progress`
- `SUBMITTING`
  - the user has completed the runner and the app is handing off to the canonical completion endpoint
  - this is a transient UI/runtime handoff state, not a second completion phase
- `PROCESSING_RESULT`
  - the canonical completion pipeline is running, or the UI is waiting on the persisted canonical result to become ready
  - usually maps to persisted lifecycle `completed_processing` and/or persisted result readiness `PROCESSING`
- `READY`
  - a canonical persisted result exists and satisfies the existing readiness rules
  - maps to persisted lifecycle `ready` and persisted result readiness `READY`
- `RESULTS_VIEW`
  - the user is viewing the persisted canonical result payload
  - this is a results-route/view state entered only after persisted result retrieval

## State definitions

### `IDLE`

The user has not yet entered the live assessment run state.

This is the pre-run state before attempt creation or resume has been resolved. It must not imply any scoring work, result generation, or provisional readiness.

### `STARTING`

Short UI/runtime initialisation state shown after Start assessment is triggered and before the first question is shown.

This may cover:

- attempt creation
- attempt reuse/resume resolution
- runner route handoff
- runtime view-model preparation

This state must not:

- run scoring
- generate results
- inspect or fabricate a result payload beyond normal lifecycle routing

### `IN_PROGRESS`

The user is actively answering assessment questions.

This is the normal runner state for persisted response capture. The UI may save and restore answers, but it must not perform any scoring or derive result content locally.

### `SUBMITTING`

Final answer submission is in progress.

This is the handoff point from runner completion into the canonical completion pipeline. It covers the client/runtime transition after the final answer is confirmed and before the completion response has settled.

This state must not become a shadow processing pipeline. Its only purpose is to hand control to the canonical completion service once.

### `PROCESSING_RESULT`

The canonical engine completion pipeline is running or awaiting completion:

- load persisted responses
- score
- normalize
- build canonical result payload
- persist result
- mark ready

This state must map to real engine work or real readiness waiting. It must not introduce any second processing path, secondary polling source, or temporary result object.

If the canonical pipeline fails, the flow leaves `PROCESSING_RESULT` through failure handling and must not pretend that a ready result exists.

### `READY`

Canonical persisted result exists and satisfies readiness rules.

The meaning of `READY` is unchanged. It is not a UI-only milestone and it is not reached because a loader animation finishes. It is reached only when the persisted canonical result is structurally complete and stored under the existing readiness rules.

### `RESULTS_VIEW`

The user is viewing the persisted result payload.

This state exists after retrieval of the stored canonical result and belongs to the results UI. It does not run the engine, rebuild payload sections, or refresh readiness by recomputation.

## Transition flow

Primary allowed flow:

- `IDLE -> STARTING -> IN_PROGRESS`
- `IN_PROGRESS -> SUBMITTING -> PROCESSING_RESULT -> READY -> RESULTS_VIEW`

Legitimate alternative transitions:

- `IDLE -> STARTING -> IN_PROGRESS`
  - via either new-attempt creation or resume of the latest in-progress attempt
- `SUBMITTING -> READY`
  - if the canonical completion call returns an already-ready persisted result immediately
- `PROCESSING_RESULT ->` failure handling
  - if the canonical completion pipeline fails or resolves to an error state
- `READY -> RESULTS_VIEW`
  - via persisted result retrieval only

Disallowed interpretations:

- `STARTING` must not skip directly into result generation
- `SUBMITTING` must not run scoring on the client
- `RESULTS_VIEW` must not trigger engine re-execution
- `READY` must not be inferred from UI progress alone

## Ownership boundaries

UI/runtime layer owns:

- presentation of `STARTING`
- presentation of `SUBMITTING`
- presentation of `PROCESSING_RESULT`
- transition polish
- routing and handoff between runner and results surfaces

Canonical engine and completion pipeline own:

- loading persisted responses for completion
- scoring
- normalization
- result construction
- persistence
- readiness

Results UI owns:

- rendering the persisted result payload only
- reading canonical result sections from persisted retrieval services

The existing Sonartra architecture remains unchanged:

- attempt lifecycle resolves app-facing persisted status
- completion service runs the single canonical completion path
- result read model retrieves persisted canonical ready results

## Guardrails

The loader model must not:

- compute scores in UI
- build temporary result payloads in UI
- introduce duplicate completion calls
- re-run engine work from results page render
- create alternate readiness criteria
- create multiple result object shapes
- treat loader completion as equivalent to canonical readiness
- bypass persisted result retrieval when entering the results view

Failure handling must also remain canonical:

- if completion fails, the UI may show failure messaging or route back to a recoverable surface
- if no canonical ready result exists, the UI must not behave as if one does

## Relationship to canonical result contract

This state model is constrained by the existing Sonartra principles:

- engine-first model
- deterministic result generation
- persisted canonical result payload
- no alternative scoring paths

Nothing in this transition model changes:

- the one-engine rule
- the one-execution-path rule
- the canonical result contract
- the existing readiness definition

`PROCESSING_RESULT` is therefore not a new result stage definition. It is a frontend/runtime representation of the already-defined canonical completion and readiness process.

`READY` continues to mean that the persisted canonical result is available for dashboard, results list, and result detail retrieval under the existing result read model.

## Acceptance criteria

This transition-loader model is acceptable only if all of the following remain true:

- transition loaders are editorial and presentation states around the canonical flow
- the meaning of `READY` is unchanged
- the completion service remains the single canonical completion path
- result retrieval continues to read persisted canonical payloads only
- the results page does not recompute or regenerate result content
- if the engine cannot produce a canonical ready result, the UI must not behave as if it has
