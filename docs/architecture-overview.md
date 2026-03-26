# Sonartra MVP Architecture Overview

## Purpose

Sonartra MVP is built as an **engine-first** assessment platform with one canonical runtime.

## Canonical Runtime Direction

- One engine
- One execution path
- One result contract
- Deterministic outputs only
- Database-driven runtime behavior

## Boundary Rules

- UI layers do not compute scores.
- Runtime does not parse Excel files.
- Runtime does not parse packaged JSON files for execution.
- Persisted result payloads are the source for dashboard and results views.

## Data Direction

WPLP-80 seed data is the source-of-truth reference for initial runtime behavior and will be loaded into the database for engine execution in later tasks.
