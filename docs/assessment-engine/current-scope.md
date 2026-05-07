# Current Assessment Engine Scope

## Active Model

The active Sonartra assessment engine model is single-domain ranked-pattern only.

Each active assessment version must be built around:

- one active domain
- exactly four active scored signals
- deterministic scoring from option-to-signal weights
- normalized signal percentages
- deterministic ranked signal order
- one of four score shapes: `concentrated`, `paired`, `graduated`, `balanced`
- one `pattern_key` generated from the ranked signal order
- reader-first result sections
- one persisted canonical result payload

Runtime assessment delivery remains database-driven. The runner must load published assessment definitions from runtime database tables, persist responses, and submit attempts through the canonical scoring pipeline.

Result retrieval must read `results.canonical_result_payload` only. Result pages, dashboards, result lists, and workspace summaries must not recompute scores, perform report-language lookup, or reassemble result meaning at retrieval time.

## Superseded Work

The previous WPLP and multi-domain strategy is superseded for active implementation.

The existing single-domain and multi-domain builder fork is also superseded as an active build target. It may remain in the repository during transition, but it is not the source of truth for new implementation.

## Out Of Scope

The following concepts are out of scope for the active build:

- WPLP-80 canonical seed strategy
- WPLP workbook conversion as active runtime source
- multi-domain assessments
- multi-domain assessment authoring
- question-section domains
- signal-group domains
- overlay dimensions
- thresholds
- archetypes
- sentence libraries
- old rule-engine rows
- old pair-oriented single-domain result language model
- alternate scoring paths
- alternate result payload formats

## Required Runtime Boundaries

The active engine must preserve these boundaries:

- database definitions are the runtime source of truth
- option-to-signal weights are the only scoring source
- score shape classifies the normalized distribution and does not alter scores
- result language is selected during completion and persisted into the result payload
- retrieval layers render persisted payload data only

## Legacy Handling

Legacy WPLP and multi-domain files may remain in the repository as archived reference material until removed by a separate cleanup task. They must not drive active implementation, acceptance criteria, schema decisions, runtime scoring, or result rendering for the ranked-pattern engine.
