# Scoring And Shape Contract

## Canonical Pipeline

The ranked-pattern scoring pipeline is:

```text
selected responses
-> selected options
-> option_signal_weights
-> raw signal scores
-> normalized percentages
-> deterministic ranked signals
-> score_shape classification
-> pattern_key generation
```

No UI, admin view, result page, or dashboard may compute scores or alter the ranked order.

## Required Decisions

### Four Scored Signals

This engine version requires exactly four active scored signals per published assessment version.

Publish must fail if:

- fewer than four active scored signals exist
- more than four active scored signals exist
- any option weight points at a missing or inactive signal
- any scored option lacks explicit weights unless it is explicitly marked unscored

### Raw Scores

Raw scores are aggregated from selected options through `option_signal_weights`.

Rules:

- weights are numeric
- weights are deterministic
- all selected option ids must resolve to the submitted assessment version
- every applied weight must resolve to one of the four active scored signals

### Normalized Percentages

Normalized scores must be deterministic and reproducible.

The normalization method must define:

- how raw score totals convert to percentages
- rounding policy
- zero-score handling
- total percentage handling

The current implementation already uses deterministic percentage allocation in the engine. The ranked-pattern contract keeps deterministic normalization as mandatory, but the exact final rounding policy should be named in the implementation contract once locked.

### Ranked Signals

Signals are ranked by normalized percentage descending.

Tie-breaking must be deterministic. The platform must define and test tie-break order. Recommended tie-break inputs:

1. normalized percentage descending
2. raw score descending
3. imported signal order ascending
4. signal key ascending

The result must produce `rank_1` through `rank_4` with no gaps.

### Score Shape

`score_shape` classifies the distribution of normalized scores. It must not alter raw scores, normalized scores, or rank order.

Supported values:

- `concentrated`
- `paired`
- `graduated`
- `balanced`

Required configuration fields:

- `score_shape`
- `rule_key`
- `priority`
- `minimum_gap` or equivalent gap configuration
- `maximum_gap` or equivalent gap configuration
- optional top-pair closeness configuration
- optional all-signal spread configuration
- human-readable validation description

Exact threshold numbers are not defined in the current import schema and remain a product decision. Until those values are supplied, implementation must not invent them silently.

### Pattern Key

`pattern_key` is generated from the ranked signal order:

```text
rank_1_signal_key + "_" + rank_2_signal_key + "_" + rank_3_signal_key + "_" + rank_4_signal_key
```

Example:

```text
results_process_vision_people
```

The generated key must resolve to one of exactly twenty-four active ranked patterns for the assessment version.

## Failure Rules

Runtime must fail explicitly if:

- an assessment version is not single-domain ranked-pattern
- exactly four active scored signals are not available
- selected responses do not resolve
- selected options do not resolve
- required option weights are missing
- normalized scores cannot be produced deterministically
- rank order cannot be produced deterministically
- score shape cannot be classified
- generated pattern key is not in the active pattern set
- required result-language rows for `pattern_key`, `score_shape`, `signal_key`, or `rank_position` are missing

Failures must mark the result as failed or keep it non-ready. Partial or malformed outputs must not be surfaced as READY.
