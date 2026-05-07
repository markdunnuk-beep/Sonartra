# Publish Audit Contract

## Purpose

Publish validation blocks incomplete or inconsistent ranked-pattern assessment versions from becoming runtime definitions.

The audit must run before publish and must be deterministic. Blocking findings prevent publication.

## Blocking Checks

### Metadata

- one assessment metadata record exists
- assessment mode is single-domain ranked-pattern
- assessment key, version, title, and active domain key are present
- WPLP or multi-domain metadata is not accepted as active package metadata

### Domain

- exactly one active domain exists
- all runtime rows reference the active domain key
- question-section, signal-group, and overlay domain concepts are not active publish concepts

### Signals

- exactly four active scored signals exist
- all signal keys are unique
- all signal keys resolve wherever referenced
- no overlay dimensions are active scored signals

### Questions

- all questions resolve to the active assessment version
- all active questions resolve to the active domain
- question keys are unique
- question order is deterministic

### Options

- all options resolve to valid active questions
- option keys are unique within the assessment version or question scope defined by implementation
- every active question has valid active options
- option order is deterministic

### Weights

- all option weights resolve to valid options and valid signals
- every active scored option has explicit weights or is explicitly unscored
- duplicate option/signal weight rows are blocked
- weights are numeric

### Ranked Patterns

- exactly twenty-four ranked signal patterns are present
- each `pattern_key` contains the four active signal keys exactly once
- every `pattern_key` matches `rank_1_signal_key` through `rank_4_signal_key`
- all twenty-four permutations of the four active signals are covered once

### Score Shapes

- all four supported score shape values are present:
  - `concentrated`
  - `paired`
  - `graduated`
  - `balanced`
- unsupported score-shape values are blocked
- score-shape rule configuration is present, or the platform-level fixed score-shape policy is explicitly named
- exact thresholds are validated if present; absent thresholds remain a product decision and cannot be inferred silently

### Runtime Result Content Coverage

- required `pattern_key + score_shape` sections have complete coverage:
  - `06_Orientation`
  - `07_Recognition`
  - `09_Pattern_Mechanics`
  - `10_Pattern_Synthesis`
  - `14_Closing_Integration`
- required `pattern_key` list sections have complete coverage:
  - `11_Strengths`
  - `12_Narrowing`
  - `13_Application`
- required `signal_key + rank_position` sections have complete coverage:
  - `08_Signal_Roles`
- `05_Context` has exactly one active row for the active domain

### Status Rules

- draft rows are not publishable unless an explicit preview-only mode is being used
- inactive rows do not satisfy runtime coverage
- duplicate active rows for the same runtime lookup are blocked
- all lookup keys are unique within their section

### Lookup Integrity

- all lookup keys use the platform-approved delimiter
- all relationship keys resolve to active metadata, domain, signal, pattern, score-shape, question, option, or weight records as applicable
- no runtime result content may reference unsupported signals, unsupported patterns, or unsupported score shapes

### Preview And Simulation

- at least one preview/simulation case must be available
- the runtime result payload can be assembled from at least one preview/simulation case
- preview cases must prove:
  - raw scores can be represented
  - normalized percentages can be ranked
  - score shape can be classified
  - pattern key resolves
  - every required result payload section resolves
- `15_Report_Preview`, `16_Import_Summary`, `17_Validation_Reference`, and `18_Lookups` must not become normal runtime result sections

## Publish Result

Publication is allowed only when all blocking checks pass. Warnings may be retained for admin review, but warnings must not mask missing runtime rows, missing weights, unresolved keys, malformed pattern coverage, unsupported score shapes, or incomplete result payload assembly.
