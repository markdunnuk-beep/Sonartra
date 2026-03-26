# Engine Core Types (Task 6)

This document defines the shared type system used by Sonartra's engine-first MVP runtime.

The types are implemented in:

- `lib/engine/types.ts`
- `lib/engine/result-contract.ts`
- `lib/engine/readiness.ts`

## Why this model exists

The engine requires one deterministic execution path and one canonical result contract. The shared types enforce that contract across repository loading, runtime processing, and persisted results.

The type system is intentionally split by pipeline stage to avoid mixing concerns:

1. Persisted definition records (DB shape)
2. Runtime assembled definition (resolved object graph)
3. Response capture state
4. Raw scoring output
5. Normalization output
6. Canonical result payload
7. Readiness status

## 1) Persisted definition record types (DB model)

Record types represent relational rows loaded from database tables:

- `AssessmentRecord`
- `AssessmentVersionRecord`
- `DomainRecord`
- `SignalRecord`
- `QuestionRecord`
- `OptionRecord`
- `OptionSignalWeightRecord`

These support deterministic loading with explicit identifiers, keys, ordering, version linkage, published status, and source discrimination.

## 2) Runtime assembled definition types

Runtime types represent the fully resolved definition graph used by the engine:

- `RuntimeAssessmentDefinition`
- `RuntimeDomain`
- `RuntimeSignal`
- `RuntimeQuestion`
- `RuntimeOption`
- `RuntimeOptionSignalWeight`

`RuntimeQuestion` contains ordered options, and each `RuntimeOption` contains its resolved signal weights so scoring can run from one direct graph.

## 3) Response capture types

Response model types are designed for MVP semantics (one selected option per question):

- `AssessmentAttemptStatus`
- `ResponseValue`
- `RuntimeResponse`
- `RuntimeResponseSet`

`RuntimeResponseSet.responsesByQuestionId` enables overwrite-before-completion behavior while still enforcing one active selected option per question.

## 4) Scoring and normalization types

Raw scoring contract:

- `RawSignalScore`
- `RawDomainScoreSummary`
- `ScoreDiagnostics`
- `ScoreResult`

Normalization contract:

- `NormalizedSignalScore`
- `NormalizedDomainSummary`
- `NormalizationDiagnostics`
- `NormalizedResult`

These types preserve deterministic and reproducible outputs through explicit fields for totals, normalized values, percentages, rank order, and diagnostics.

## 5) Canonical result payload (single source of truth)

The canonical payload contract is:

- `CanonicalResultPayload`

Supported by:

- `ResultMetadata`
- `ResultTopSignal`
- `ResultRankedSignal`
- `ResultOverviewSummary`
- `ResultBulletItem`
- `ResultDiagnostics`

This payload is the single source of truth for persisted assessment results and for all downstream result retrieval and rendering.

`lib/engine/result-contract.ts` exports:

- canonical payload types
- `CANONICAL_RESULT_PAYLOAD_FIELDS`
- `isCanonicalResultPayload` helper guard

## 6) Readiness types

Readiness types are intentionally separate from attempt lifecycle state:

- `ResultReadinessStatus`
- `ReadinessFailureReason`
- `ReadinessCheckSummary`

`lib/engine/readiness.ts` exports readiness constants and narrow helper guards.

## WPLP-80 domain representation

WPLP-80 requires preserving two domain concepts:

1. Question-section domains (`source = "question_section"`) for grouping questions.
2. Signal-group domains (`source = "signal_group"`) for scoring/output alignment.

This is represented with `DomainSource` on `DomainRecord` and `RuntimeDomain`.

Decision and Role overlays are represented with:

- `SignalRecord.isOverlay`
- `SignalRecord.overlayType`
- mirrored runtime fields on `RuntimeSignal`

This keeps overlays type-compatible without creating alternative scoring paths.
