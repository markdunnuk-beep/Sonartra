# Ranked-Pattern Result Language Authoring

This document defines reusable authoring rules for ranked-pattern result-language rows. It is an authoring guide only. It does not change the workbook schema, scoring, normalization, score-shape policy, canonical payload assembly, result rendering, or runtime data flow.

Runtime remains database-driven after import. Workbooks and generated PSV files are admin/import artifacts only.

## 06_Orientation Authoring Rules

`06_Orientation` is the first pattern-level interpretation shown to the reader. It should help the reader understand:

1. their first leadership route
2. what the second signal adds
3. how the third and fourth signals extend range
4. how the score shape changes the interpretation of the ranked pattern

### Field Rules

#### orientation_title

Use:

```text
{Rank 1} first, {Rank 2} next
```

Purpose: a short title that names the top two ranked signals in plain language.

Examples:

- `Results first, Process next`
- `Vision first, People next`
- `Process first, Results next`

Avoid:

- `Results with Process close by`
- `Results and Process`
- `Results-led pattern`
- vague or abstract titles

#### rank_1_phrase

Recommended structure:

```text
Lead with {Rank 1} by [primary leadership behaviour].
```

Example:

```text
Lead with Results by deciding what needs to happen, clarifying the outcome, and moving work forward.
```

Purpose: make the top signal feel like the reader's primary leadership route, not an abstract trait.

#### rank_2_phrase

Recommended structure:

```text
{Rank 2} strengthens your leadership by [what it adds].
```

Example:

```text
Process strengthens your leadership by turning intent into structure, sequence, and repeatable standards.
```

Purpose: show how the second-ranked signal supports, strengthens, or shapes the first route.

#### rank_3_phrase

Recommended structure:

```text
{Rank 3} extends your leadership when the situation needs [what it broadens].
```

Example:

```text
Vision extends your leadership when the situation needs future context, possibility, or a broader direction.
```

Purpose: show useful range without making rank 3 sound primary.

#### rank_4_phrase

Recommended structure:

```text
Add {Rank 4} deliberately when your leadership needs [what it protects, restores, or brings back into view].
```

Example:

```text
Add People deliberately when your leadership needs deeper trust, communication, or shared confidence.
```

Purpose: avoid framing the fourth signal as a weakness. Describe it as an intentional range signal the reader can add when needed.

#### orientation_summary

Recommended structure:

```text
Your leadership starts with [rank_1 leadership behaviour], then uses {Rank 2} to [rank_2 contribution]. This combination is strongest when [rank_1 value] is supported by [rank_2 value].
```

Example:

```text
Your leadership starts by deciding what needs to happen, then uses Process to organise the work so it can happen reliably. This combination is strongest when clear outcomes are supported by structure, sequence, and repeatable standards.
```

Rules:

- use exactly two sentences where practical
- mention leadership directly
- focus only on rank 1 and rank 2
- do not foreground rank 3 or rank 4
- do not include score-shape interpretation here

#### score_shape_summary

Purpose: explain how the reader should interpret the strength and spread of their ranked signals.

Required score shapes:

- `concentrated`
- `paired`
- `graduated`
- `balanced`

Recommended templates:

```text
Because this is a concentrated pattern, your leadership is pulled most strongly toward {Rank 1}: {rank_1 leadership meaning}. {Rank 2}, {Rank 3}, and {Rank 4} still matter; bring them in deliberately when the situation needs {rank_2 need}, {rank_3 need}, or {rank_4 need}.
```

```text
Because this is a paired pattern, your leadership works most naturally through {Rank 1} and {Rank 2} together: {rank_1 + rank_2 leadership meaning}. {Rank 3} and {Rank 4} broaden the approach when the situation needs {rank_3 need} or {rank_4 need}.
```

```text
Because this is a graduated pattern, your leadership has a clear sequence. Start with {Rank 1}: {rank_1 leadership meaning}, strengthen it with {Rank 2}, then draw on {Rank 3} and {Rank 4} as the situation broadens.
```

```text
Because this is a balanced pattern, your leadership is not defined by a single signal. {Rank 1} is still the first route, but {Rank 2}, {Rank 3}, and {Rank 4} need to stay available so the approach does not become too narrow.
```

### General Language Rules

Do:

- write in plain English
- describe the reader's style directly
- connect each signal to behaviour
- keep phrases concise enough for the result page
- make rank order clear
- treat lower-ranked signals as useful range, not failure
- keep score-shape interpretation in `score_shape_summary`

Avoid:

- `you may`
- `might`
- `could`
- `close by`
- `not absent`
- `visible progress` when it blurs Results and Vision
- abstract signal-only descriptions
- clinical language
- old pair-oriented result language
- language that makes rank 3 or rank 4 sound like the main driver

### Reusable Example Row

For:

```text
rank_1_signal_key = results
rank_2_signal_key = process
rank_3_signal_key = vision
rank_4_signal_key = people
score_shape = concentrated
```

Use:

```text
orientation_title:
Results first, Process next

orientation_summary:
Your leadership starts by deciding what needs to happen, then uses Process to organise the work so it can happen reliably. This combination is strongest when clear outcomes are supported by structure, sequence, and repeatable standards.

score_shape_summary:
Because this is a concentrated pattern, your leadership is pulled most strongly toward Results: deciding what needs to happen, clarifying the outcome, and moving work forward. Process, Vision, and People still matter; bring them in deliberately when the situation needs stronger structure and repeatable standards, longer-range direction, or deeper trust and shared confidence.

rank_1_phrase:
Lead with Results by deciding what needs to happen, clarifying the outcome, and moving work forward.

rank_2_phrase:
Process strengthens your leadership by turning intent into structure, sequence, and repeatable standards.

rank_3_phrase:
Vision extends your leadership when the situation needs future context, possibility, or a broader direction.

rank_4_phrase:
Add People deliberately when your leadership needs deeper trust, communication, or shared confidence.
```

## Reuse Notes

For future assessments, reuse the structure, not the Leadership Approach semantics by default. Signal meanings must come from that assessment's own signal definitions. Do not copy Leadership Approach signal meanings into unrelated assessments unless the signals are intentionally the same.

Before writing rows, confirm:

- the assessment has one active ranked-pattern domain
- the domain has exactly four scored signals
- the authoring config and generated rows use explicit keys
- `pattern_key` matches `rank_1_signal_key` through `rank_4_signal_key`
- `06_Orientation` covers all 24 ranked patterns across all 4 score shapes
