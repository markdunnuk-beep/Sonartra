# 05 Targeted Upgrade Prompt

Use this prompt to upgrade weak rows based on a rubric evaluation.

## Task

Upgrade only the rows or fields identified as weak. Do not rewrite strong rows. Do not make broad style passes.

## Preserve Exactly

Preserve:

- headers
- row counts
- keys
- row order
- section order
- enums
- pattern keys
- signal keys
- score shapes
- status values
- pipe-delimited format

Do not change structure.

## Upgrade Standard

Improve:

- immediate clarity
- recognition
- behavioural specificity
- practical usefulness
- section distinction
- repetition control
- tone
- commercial readiness

Use British English, plain behavioural language, and calm authority.

## Output

Return only the upgraded rows or fields requested. Do not include commentary inside the data.
