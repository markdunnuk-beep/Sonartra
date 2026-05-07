# Result Payload Contract

## Purpose

Each completed ranked-pattern assessment must persist one canonical result payload in `results.canonical_result_payload`.

Result pages must not recompute scores. Result pages must not perform language lookup. Result pages, dashboards, result lists, and workspace summaries must render or summarize persisted payload data only.

## Required Shape

```text
metadata
assessment
attempt
domain
topSignal
rankedSignals
normalizedScores
scoreShape
patternKey
context
orientation
recognition
signalRoles
patternMechanics
patternSynthesis
strengths
narrowing
application
closingIntegration
diagnostics
```

## Section Contracts

### metadata

- Source import sheet: runtime completion plus `00_Metadata`
- Lookup strategy: attempt and assessment version ids
- Payload structure: payload version, generated timestamp, contract name, assessment version id, mode `single_domain_ranked_pattern`
- Result page rendering: yes, directly
- Dashboard/results-list use: yes, for dates, mode, and contract checks

### assessment

- Source import sheet: `00_Metadata`
- Lookup strategy: assessment key and version
- Payload structure: key, title, version, description
- Result page rendering: yes
- Dashboard/results-list use: yes

### attempt

- Source import sheet: runtime data, not import package
- Lookup strategy: attempt id
- Payload structure: attempt id, submitted/completed timestamps, answered question count, total question count
- Result page rendering: yes
- Dashboard/results-list use: yes

### domain

- Source import sheet: `00_Metadata` and `05_Context`
- Lookup strategy: `domain_key`
- Payload structure: domain key, title, definition, scope
- Result page rendering: yes
- Dashboard/results-list use: optional summary only

### topSignal

- Source import sheet: `01_Signals` plus computed rank
- Lookup strategy: `rank_1_signal_key`
- Payload structure: signal key, label, rank, raw score, normalized percentage
- Result page rendering: yes
- Dashboard/results-list use: yes

### rankedSignals

- Source import sheet: `01_Signals` plus scoring output
- Lookup strategy: ranked signal keys
- Payload structure: four ordered signal entries with rank, key, label, raw score, normalized percentage
- Result page rendering: yes
- Dashboard/results-list use: yes

### normalizedScores

- Source import sheet: scoring output, not language import
- Lookup strategy: scored signal ids/keys
- Payload structure: signal key to normalized percentage, plus raw score if needed for audit
- Result page rendering: yes
- Dashboard/results-list use: yes

### scoreShape

- Source import sheet: score-shape configuration or platform score-shape rules
- Lookup strategy: classified from normalized score distribution
- Payload structure: value, rule key, rule explanation, optional diagnostics
- Result page rendering: yes
- Dashboard/results-list use: optional badge/filter

### patternKey

- Source import sheet: `assessment_ranked_patterns`, derived from ranked signal order
- Lookup strategy: `rank_1_signal_key` to `rank_4_signal_key`
- Payload structure: generated pattern key and rank signal keys
- Result page rendering: yes
- Dashboard/results-list use: optional

### context

- Source import sheet: `05_Context`
- Lookup strategy: `domain_key`
- Payload structure: title, definition, scope, interpretation guidance, intro note
- Result page rendering: yes
- Dashboard/results-list use: no, except optional short domain context

### orientation

- Source import sheet: `06_Orientation`
- Lookup strategy: `domain_key + pattern_key + score_shape`
- Payload structure: title, summary, score-shape summary, rank phrases
- Result page rendering: yes
- Dashboard/results-list use: optional headline/summary

### recognition

- Source import sheet: `07_Recognition`
- Lookup strategy: `domain_key + pattern_key + score_shape`
- Payload structure: headline, recognition statement, recognition expansion
- Result page rendering: yes
- Dashboard/results-list use: yes for concise result summary if appropriate

### signalRoles

- Source import sheet: `08_Signal_Roles`
- Lookup strategy: `domain_key + signal_key + rank_position` for each ranked signal
- Payload structure: four role entries with signal key, rank position, role label, title, description, productive expression, risk pattern, development note
- Result page rendering: yes
- Dashboard/results-list use: optional top-signal role only

### patternMechanics

- Source import sheet: `09_Pattern_Mechanics`
- Lookup strategy: `domain_key + pattern_key + score_shape`
- Payload structure: title, core mechanism, why it shows up, what it protects
- Result page rendering: yes
- Dashboard/results-list use: no

### patternSynthesis

- Source import sheet: `10_Pattern_Synthesis`
- Lookup strategy: `domain_key + pattern_key + score_shape`
- Payload structure: title, gift, trap, takeaway, synthesis text
- Result page rendering: yes
- Dashboard/results-list use: optional takeaway

### strengths

- Source import sheet: `11_Strengths`
- Lookup strategy: `domain_key + pattern_key`, ordered by priority
- Payload structure: ordered list of strength key, title, text, linked signal key
- Result page rendering: yes
- Dashboard/results-list use: optional first strength only

### narrowing

- Source import sheet: `12_Narrowing`
- Lookup strategy: `domain_key + pattern_key`, ordered by priority
- Payload structure: ordered list of narrowing key, title, text, missing range signal key
- Result page rendering: yes
- Dashboard/results-list use: optional risk/watchout summary

### application

- Source import sheet: `13_Application`
- Lookup strategy: `domain_key + pattern_key`, ordered by priority
- Payload structure: ordered list of application key, title, text, linked signal key
- Result page rendering: yes
- Dashboard/results-list use: optional next-step summary

### closingIntegration

- Source import sheet: `14_Closing_Integration`
- Lookup strategy: `domain_key + pattern_key + score_shape`
- Payload structure: closing summary, core gift, core trap, development edge, memorable line
- Result page rendering: yes
- Dashboard/results-list use: optional memorable line

### diagnostics

- Source import sheet: runtime validation and scoring output
- Lookup strategy: attempt/result ids
- Payload structure: scoring method, normalization method, score-shape rule, pattern lookup, row lookup keys, warning list, import batch id, validation evidence
- Result page rendering: not normally user-facing; admin/debug only
- Dashboard/results-list use: contract validation only

## Retrieval Rules

- Result pages render `canonical_result_payload` only.
- Dashboards and results lists may consume compact fields from persisted payload only.
- No retrieval layer may recompute raw scores, normalized scores, rank order, score shape, pattern key, or report language.
- Missing required payload sections make the result unreadable and must not be papered over by UI fallbacks.
