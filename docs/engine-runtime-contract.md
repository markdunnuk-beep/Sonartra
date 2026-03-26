# Sonartra Engine Runtime Contract (Task 2)

## Purpose

Define the single canonical boundary for the Sonartra MVP engine runtime before scoring and persistence implementations are added.

## Canonical execution sequence

The engine executes one deterministic path only:

1. Load published assessment definition from repository
2. Load complete response set for attempt
3. Score responses into raw signal scores
4. Normalize raw scores into comparable values
5. Rank signals and compute top signal
6. Build canonical result payload
7. Persist canonical payload once
8. Evaluate and persist readiness status
9. Serve result from persisted payload only

No stage is optional for a READY result.

## Stage responsibilities

- **Scoring stage**: resolves option selections into raw signal scores via option-to-signal weights.
- **Normalization stage**: converts raw scores to deterministic normalized outputs.
- **Ranking stage**: creates stable ordering for signals.
- **Result builder stage**: composes the canonical result payload shape.
- **Readiness evaluation stage**: validates completion and structural integrity before READY.
- **Orchestrator**: enforces single stage order and coordinates repository usage.

## Data ownership and boundaries

- **Engine layer (`lib/engine`)** owns runtime contracts, pipeline contracts, and orchestration contracts.
- **Server layer (`lib/server`)** owns repository interfaces for definitions, responses, and persisted results.
- **Database implementations** are intentionally deferred; engine depends on interfaces only.

## Persistence boundary

- Result payload is persisted exactly once as the canonical output artifact for an attempt.
- Result readiness is stored explicitly and updated through repository contracts.
- Retrieval consumers (dashboard, results list, result detail) must read persisted payloads.

## Why UI never recalculates

UI must remain a rendering client for persisted artifacts. Recalculation in UI would create non-deterministic behavior, duplicate logic, and contract drift.

## Why there is only one result contract

A single persisted contract guarantees:

- deterministic retrieval behavior
- no legacy/v1/v2 drift
- one source of truth for all user and admin result views
- stable base for WPLP-80 and future assessments
