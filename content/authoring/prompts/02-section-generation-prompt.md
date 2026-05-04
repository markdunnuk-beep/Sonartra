# 02 Section Generation Prompt

Use this prompt to generate reader-first import rows for selected sections or selected pattern batches.

Work in one of these scopes:

- one pattern
- one primary-signal batch
- one section at a time

Do not generate all sections in one huge prompt.

## Inputs

Provide:

- target section key
- exact header
- selected pattern key or batch
- selected score shape where applicable
- signal definitions
- score-shape logic
- any approved context seed
- existing approved rows for tone consistency

## Rules

Preserve exactly:

- headers
- row counts
- keys
- enums
- pattern keys
- signal keys
- status values
- pipe-delimited format

Use Plain Behavioural Intelligence:

- plain
- behavioural
- practical
- recognisable
- direct
- adult but easy to understand

## Avoid

Avoid:

- abstract premium fog
- poetic headings
- generic coaching
- schema-led wording
- "leads the pattern"
- "shapes it"
- "stretch route"
- "private depth"
- "private clarity becomes private certainty"

Do not use pipe characters inside field values or `lookup_key`.

## Output

Return only the requested pipe-delimited rows unless asked for a short rationale. Preserve the supplied header order and row order.
