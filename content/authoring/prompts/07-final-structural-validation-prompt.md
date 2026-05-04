# 07 Final Structural Validation Prompt

Use this prompt immediately before import.

Evaluate structure only. Do not evaluate language quality.

## Check

Confirm:

- all required sections are present
- headers exactly match the manifest
- expected row counts are present
- pattern keys are valid
- score shapes are covered
- lookup keys are unique
- no pipe characters appear inside field values
- no pipe characters appear inside `lookup_key`
- no required field is blank
- enums are valid
- rank fields match pattern key order

## Output

Return:

- PASS or FAIL
- blocking errors
- non-blocking warnings
- row counts by section

Do not rewrite data. Do not comment on prose quality.
