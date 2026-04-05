# Hero Pattern Exploration Harness

This folder contains a standalone TypeScript harness for pressure-testing a fully data-driven Hero model before any engine, database, or admin-builder work is introduced.

The fixture data in this folder is intentionally provisional. It models a future six-domain, 36-pair Hero import shape, including a four-option tension-response set to keep the exploration space at `6^6` combinations.

## Purpose

- Define the future builder-shaped fixture datasets in plain TypeScript.
- Aggregate domain-pair choices into trait totals deterministically.
- Apply deterministic Hero pattern rules with explicit priority ordering.
- Support minimal rule exclusions for overlap reduction while keeping evaluation deterministic and data-driven.
- Surface collisions, dead patterns, fallback usage, and over-dominant winners before any live implementation.
- Compare the round-2 rule set against the current round-3 refinement in one deterministic run.

Nothing in this folder is wired into the engine, admin builder, result rendering, or completion flow.

## Files

- `hero-exploration-types.ts`: shared types for datasets and reports
- `pair-trait-weights.ts`: 36-pair canonical weighting table
- `hero-pattern-rules.ts`: round-2 and round-3 Hero rule thresholds, priorities, optional exclusions, and pattern change notes
- `hero-pattern-language.ts`: full seven-field Hero copy records
- `profile-fixtures.ts`: curated profiles plus full combinatorial generation
- `run-hero-exploration.ts`: evaluator, reporting, and artifact writer

## How to run

```bash
cmd /c node --import tsx scripts/hero-exploration/run-hero-exploration.ts
```

## What to look for

- Whether any patterns never match or never win
- Which patterns are frequently collided out by higher-priority rules
- Whether fallback usage is too high, suggesting thresholds are too strict
- Whether any single winner dominates the full combinatorial space
- Whether the worked examples return coherent copy and defensible reasons
- Whether the round-2 vs round-3 comparison is reducing fallback and multi-match volume without making the overlap families harder to explain

## Output artifacts

Running the harness writes:

- `scripts/hero-exploration/output/hero-exploration-report.json`
- `scripts/hero-exploration/output/hero-exploration-summary.md`

The current run strategy is full combinatorial evaluation across 46,656 generated profiles plus the curated editorial examples.

Round 3 keeps the pair-trait weight table unchanged and focuses on rule separation only: threshold tuning, minimal exclusions, and consolidation of overlap-heavy families. The current model is still exploratory. It reduces multi-match volume relative to the embedded round-2 baseline, but fallback and worst-case collision depth are still too high for engine or builder implementation.
