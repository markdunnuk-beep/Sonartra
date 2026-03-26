# Engine Scoring (Task 9)

## Purpose

The scoring phase is the canonical raw-score stage of the Sonartra engine pipeline.

It accepts:

- a validated `RuntimeExecutionModel`
- a canonical `RuntimeResponseSet`

It returns:

- a deterministic `ScoreResult`

This phase does not normalize scores, build narratives, persist results, or access the database.

## Public API

```ts
scoreAssessmentResponses(params: {
  executionModel: RuntimeExecutionModel;
  responses: RuntimeResponseSet;
}): ScoreResult
```

## Scoring rule

For each resolved response:

1. find the question in the execution model
2. find the selected option for that question
3. read the option's `signalWeights`
4. add each weight value to the referenced signal total

This is the only raw scoring rule for MVP.

## Execution boundary

Scoring trusts the `RuntimeExecutionModel` as the validated execution-time shape produced by Task 8.

Scoring does not:

- rebuild indexes
- revalidate definition graph integrity
- reinterpret overlay policies
- perform reverse-score transformations

Scoring only validates response references:

- response question exists
- selected option belongs to that question

## Output behavior

`ScoreResult` includes:

- `signalScores` for every signal in execution-model order, including zero totals
- `domainSummaries` for every domain in execution-model order
- restrained diagnostics for answer coverage and scoring totals

Signal scores preserve runtime metadata required by later normalization:

- signal id and key
- signal title
- domain linkage
- overlay fields
- raw total

Domain summaries preserve:

- domain metadata
- domain raw total
- ordered member signal scores
- signal count
- answered-question count

## Deterministic rules

- signal result order follows execution-model signal order
- domain summary order follows execution-model domain order
- domain member signals preserve signal order
- zero-score signals are retained
- repeated runs over the same inputs produce equivalent output

## Known assumptions

- MVP supports one selected option per question
- unanswered questions are allowed and do not fail scoring
- reverse scoring is unsupported in the canonical runtime because reverse-flag handling is not part of the persisted MVP scoring path
- overlay signals are scored exactly like any other signal when weights exist
