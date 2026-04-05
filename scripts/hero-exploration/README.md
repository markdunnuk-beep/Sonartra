# Hero Pattern Exploration Harness

This folder contains a standalone TypeScript harness for pressure-testing a fully data-driven Hero model before any engine, database, or admin-builder work is introduced.

The fixture data in this folder is intentionally provisional. It models a future six-domain, 36-pair Hero import shape, including a four-option tension-response set to keep the exploration space at `6^6` combinations.

## Purpose

- Define the future builder-shaped fixture datasets in plain TypeScript.
- Aggregate domain-pair choices into trait totals deterministically.
- Apply deterministic Hero pattern rules with explicit priority ordering.
- Support minimal rule exclusions for overlap reduction while keeping evaluation deterministic and data-driven.
- Surface collisions, dead patterns, fallback usage, and over-dominant winners before any live implementation.
- Compare round 2, round 3, and the final 12-pattern consolidation in one deterministic run.

Nothing in this folder is wired into the engine, admin builder, result rendering, or completion flow.

## Files

- `hero-exploration-types.ts`: shared types for datasets and reports
- `pair-trait-weights.ts`: 36-pair canonical weighting table
- `hero-pattern-rules.ts`: round-2, round-3, and final 12-pattern Hero rule thresholds, priorities, optional exclusions, and consolidation notes
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
- Whether the round-2 vs round-3 vs final comparison shows a cleaner identity model without making fallback or overlap unacceptable
- Which older patterns were merged into the final 12 active patterns

## Output artifacts

Running the harness writes:

- `scripts/hero-exploration/output/hero-exploration-report.json`
- `scripts/hero-exploration/output/hero-exploration-summary.md`

The current run strategy is full combinatorial evaluation across 46,656 generated profiles plus the curated editorial examples.

The final pass keeps the pair-trait weight table unchanged and consolidates the Hero layer to 12 active patterns plus fallback. The current result is cleaner editorially and materially lowers both fallback and multi-match volume relative to the embedded round-2 and round-3 baselines, but it is still not implementation-ready because fallback remains too high and worst-case collision depth is still above the target.
