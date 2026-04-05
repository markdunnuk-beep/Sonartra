# Hero Pattern Exploration Harness

This folder contains a standalone TypeScript harness for pressure-testing a fully data-driven Hero model before any engine, database, or admin-builder work is introduced.

The fixture data in this folder is intentionally provisional. It models a future six-domain, 36-pair Hero import shape, including a four-option tension-response set to keep the exploration space at `6^6` combinations.

## Purpose

- Define the future builder-shaped fixture datasets in plain TypeScript.
- Aggregate domain-pair choices into trait totals deterministically.
- Apply deterministic Hero pattern rules with explicit priority ordering.
- Surface collisions, dead patterns, fallback usage, and over-dominant winners before any live implementation.
- Compare a baseline rule set against the current refined rule set in one deterministic run.

Nothing in this folder is wired into the engine, admin builder, result rendering, or completion flow.

## Files

- `hero-exploration-types.ts`: shared types for datasets and reports
- `pair-trait-weights.ts`: 36-pair canonical weighting table
- `hero-pattern-rules.ts`: deterministic Hero rule thresholds and priorities
- `hero-pattern-rules.ts`: baseline and refined Hero rule thresholds, priorities, and pattern change notes
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
- Whether the before/after comparison is reducing fallback without making collisions explode

## Output artifacts

Running the harness writes:

- `scripts/hero-exploration/output/hero-exploration-report.json`
- `scripts/hero-exploration/output/hero-exploration-summary.md`

The current run strategy is full combinatorial evaluation across 46,656 generated profiles plus the curated editorial examples.

Round 2 still remains exploratory. It materially improves fallback and removes dead refined patterns, but the resulting collision volume is still high enough that the Hero layer should go through at least one more harness round before any engine or builder implementation is attempted.
