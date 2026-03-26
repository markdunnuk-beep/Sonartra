Sonartra — Codex Agent Instructions

Purpose:
This file defines how Codex should operate within the Sonartra repository.

It provides:
- system rules
- architecture constraints
- required reference files
- implementation priorities

This file must be followed for all tasks.

--------------------------------------------------
CORE PRINCIPLE
--------------------------------------------------

Build an engine-first assessment platform.

- One engine
- One scoring path
- One result contract
- Database-driven
- Deterministic outputs

Do NOT introduce:
- multiple engines
- UI-based scoring
- alternative result formats

--------------------------------------------------
MANDATORY REFERENCE FILES
--------------------------------------------------

Before implementing any logic, ALWAYS read and follow:

1. Engine contract (highest priority)
- /docs/engine-contract-context.txt

2. WPLP-80 seed context (data source of truth)
- /docs/wplp80-seed-context.txt

3. Build roadmap (task sequencing)
- /docs/sonartra-build-task-roadmap.txt

4. Insights report reference (output quality benchmark)
- /docs/insights-report-reference.txt

5. Design inspiration reference (UI direction)
- /docs/design-inspiration-reference.txt

6. Extraction mapping (data lineage)
- /docs/wplp80-extraction-mapping.md

--------------------------------------------------
PRIORITY ORDER (CRITICAL)
--------------------------------------------------

Always build in this order:

1. Database schema
2. Seed data (WPLP-80)
3. Engine runtime (scoring, normalization, results)
4. User flow (assessment completion)
5. Result retrieval
6. Admin tools
7. UI polish

DO NOT skip ahead.

--------------------------------------------------
ENGINE RULES
--------------------------------------------------

The engine MUST:

- load all data from database
- compute scores using option_signal_weights only
- normalize deterministically
- produce one canonical result payload
- persist results before retrieval

The engine MUST NOT:

- depend on Excel files
- depend on JSON packages at runtime
- compute anything in the UI
- generate multiple result formats

--------------------------------------------------
RESULT OUTPUT RULES
--------------------------------------------------

Outputs must be:

- deterministic
- rule-based (no AI-generated text for MVP)
- structured and consistent
- aligned with Insights-level quality

Use:
- sentence library
- archetypes
- thresholds
- rule engine

--------------------------------------------------
DATA RULES
--------------------------------------------------

- WPLP-80 seed data is the source of truth
- Do NOT modify seed structure at runtime
- Do NOT introduce new scoring logic outside seed mappings

--------------------------------------------------
UI RULES
--------------------------------------------------

- UI consumes result payload only
- UI does NOT compute scores
- UI must remain simple during early phases

--------------------------------------------------
TESTING RULE
--------------------------------------------------

The system is only valid if:

- WPLP-80 runs end-to-end
- user can complete assessment
- result is marked READY
- result appears in dashboard and results page

--------------------------------------------------
IMPLEMENTATION STYLE
--------------------------------------------------

- Keep code clean and minimal
- Avoid over-engineering
- Prefer explicit logic over abstraction
- No unused complexity

--------------------------------------------------
FINAL RULE
--------------------------------------------------

If a change violates:

- engine contract
- seed data structure
- single result pipeline

Then it must NOT be implemented.
