# 03 Structural Validation Prompt

Use this prompt as a manual equivalent of the structural validator.

Evaluate structure only. Do not evaluate language quality, tone, recognition, or prose strength.

## Check

Review the supplied reader-first import data for:

- exact section presence
- exact headers
- row counts
- pattern coverage
- score-shape coverage
- key consistency
- enum validity
- duplicate rows
- blank fields
- pipe-delimited safety

## Required Result

Return:

- PASS or FAIL
- error list
- warning list
- row counts by section
- pattern coverage summary
- score-shape coverage summary

## Constraints

Do not rewrite the data. Do not repair rows automatically. Do not make language suggestions.
