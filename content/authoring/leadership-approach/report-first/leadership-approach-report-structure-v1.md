# Leadership Approach Report Structure v1

## 1. Purpose

The Leadership Approach Report Structure defines the premium editorial format for Sonartra’s Leadership Approach assessment.

It sits below the **Sonartra Premium Editorial Report Standard** and adapts that universal standard for one domain: how a reader tends to lead, influence, decide, communicate, respond under pressure, create value, and broaden their leadership range.

The purpose is to support a **report-first canonical model**:

```text
one ranked leadership pattern
→ one fully authored premium editorial report
→ rendered as a web result and PDF-quality reference document
```

The report should feel like a high-quality behavioural intelligence report, not a modular assessment result.

## 2. Product intent

A Leadership Approach report should help the reader understand:

- what their leadership pattern naturally pays attention to
- how they create value through work, teams, decisions, and communication
- how others may experience their leadership
- what happens when the pattern is under pressure
- where the pattern can narrow
- which lower-ranked signals broaden the pattern
- what practical development moves make the pattern more effective

The reader should leave with language they can use to understand their leadership, discuss it with others, and apply it in real work.

## 3. Canonical report unit

Each published Leadership Approach version should contain **24 canonical reports**, one for each ranked signal pattern.

Each canonical report is selected by:

```text
pattern_key
```

Example:

```text
process_results_people_vision
```

The report may still receive score and rank evidence from the engine, including normalized scores and score shape metadata, but the authored report is primarily selected by the ranked pattern.

If score shape is retained, it should be treated as metadata or light interpretive context unless a future product decision proves that score-shape-specific report language improves reader value.

## 4. Required report identity fields

Each Leadership Approach report should include the following identity fields.

```yaml
assessment_key: leadership-approach
assessment_title: Leadership Approach
domain_key: leadership_approach
pattern_key:
rank_1_signal_key:
rank_2_signal_key:
rank_3_signal_key:
rank_4_signal_key:
report_title:
report_subtitle:
report_status:
quality_score_target: 9+
```

## 5. Leadership Approach signal roles

The four Leadership Approach signals should be interpreted as leadership attention patterns, not personality labels.

| Signal | Reader-facing role |
|---|---|
| Process | How the reader creates structure, sequence, rhythm, standards, and repeatability |
| Results | How the reader creates action, movement, decisions, outcomes, and measurable progress |
| People | How the reader creates trust, communication, ownership, inclusion, and shared confidence |
| Vision | How the reader creates direction, purpose, future context, possibility, and strategic meaning |

Reports should never imply that lower-ranked signals are weaknesses. They are range to bring in deliberately.

## 6. Required report structure

Every Leadership Approach canonical report should follow this structure unless a pattern-specific editorial reason justifies a small deviation.

```text
1. Hero result statement
2. Editorial introduction
3. Pattern at a glance
4. Score evidence panel
5. Key insight
6. Chapter 1 — How your leadership creates value
7. Chapter 2 — How others experience your leadership
8. Chapter 3 — Decision behaviour
9. Chapter 4 — Communication behaviour
10. Chapter 5 — What happens under pressure
11. Chapter 6 — The strength of this pattern
12. Chapter 7 — Where the pattern can narrow
13. Chapter 8 — How rank 3 expands your leadership
14. Chapter 9 — How rank 4 expands your leadership
15. Chapter 10 — Development focus
16. Closing synthesis
17. Final line
18. PDF export CTA
```

This structure is intentionally editorial. The report should read as one continuous interpretation, not as disconnected cards.

## 7. Hero result statement

### Purpose

The hero result statement is the reader’s core leadership pattern in one strong line.

It should be:

- personal
- behaviourally specific
- memorable
- commercially credible
- suitable as the report title

### Example

```text
You lead by turning complexity into structured progress
```

### Avoid

```text
Your top signal is Process
You are a Process-Results leader
Process > Results > People > Vision
```

### Recommended fields

```yaml
hero_title:
hero_subtitle:
hero_result_statement:
```

## 8. Editorial introduction

### Purpose

The editorial introduction should give the reader an immediate sense of recognition and value.

It should explain:

- which signals lead the pattern
- how the top two signals work together
- what the pattern does well
- where the pattern may narrow
- why the lower-ranked signals matter

### Guidance

Length: 2–5 paragraphs.

The introduction should avoid technical scoring language. The reader should understand the result without needing to understand the engine.

### Example direction

```text
Your leadership approach is led by Process and strengthened by Results. You tend to create confidence by giving work a clearer route, then making sure that route produces practical movement.
```

## 9. Pattern at a glance

### Purpose

This section gives the reader a fast, plain-English explanation of the ranked signal pattern.

It should include:

- rank 1 role
- rank 2 role
- rank 3 extension
- rank 4 extension

### Recommended layout

Use four ranked signal cards.

```yaml
rank:
signal_label:
role_title:
role_summary:
```

### Example labels

```text
First route
Close support
Range to bring in
Further extension
```

### Quality rule

The ranked signal explanation should feel interpretive, not like a signal glossary.

## 10. Score evidence panel

### Purpose

The score evidence panel provides transparency without dominating the report.

It should show:

- ranked signal order
- normalized percentages
- completion date
- optional score shape metadata
- assessment title

### Recommended tone

```text
Here is the evidence behind this result.
```

Avoid making the score panel feel like the main product. The main product is the interpretation.

### Recommended fields

```yaml
completion_date:
ranked_signals:
normalized_scores:
score_shape:
pattern_key:
```

`pattern_key` should not normally be shown to the reader.

## 11. Key insight / pull quote

### Purpose

The key insight gives the report one memorable anchor.

It should be specific to the pattern.

### Example

```text
Your leadership creates confidence by making work feel more manageable. The next step is making sure people can see themselves in the route before you ask them to own it.
```

### Placement

Use near the top of the report after the pattern summary, or after the opening chapter if the page needs more editorial build.

## 12. Chapter 1 — How your leadership creates value

### Purpose

This chapter explains the positive contribution of the pattern.

It should answer:

- what value this leadership pattern creates
- where it is especially useful
- what it makes easier for teams or organisations
- why the top-ranked signals matter

### Content guidance

Include real leadership contexts, such as:

- operational leadership
- implementation
- change delivery
- process improvement
- commercial execution
- project governance
- team coordination
- decision follow-through

### Avoid

Generic strengths, praise, or phrases that could apply to any leader.

## 13. Chapter 2 — How others experience your leadership

### Purpose

This chapter explains the interpersonal and team impact of the pattern.

It should cover:

- the positive experience others may have
- the possible tension others may feel
- how the pattern affects trust, ownership, contribution, and confidence
- where the leader may need to make more room for others

### Quality rule

This chapter should feel balanced and mature. It should not flatter the reader or criticise them.

## 14. Chapter 3 — Decision behaviour

### Purpose

This chapter explains how the pattern shapes decisions.

It should cover:

- what makes a decision feel sound to the reader
- how the reader handles ambiguity, evidence, closure, and trade-offs
- where the decision strength lies
- what may be under-considered
- questions that improve decision quality

### Example decision questions

```text
Who needs to understand or shape this before it lands?
What longer-term direction does this decision need to support?
```

## 15. Chapter 4 — Communication behaviour

### Purpose

This chapter explains how the pattern shapes communication.

It should cover:

- how the reader naturally communicates
- what their communication clarifies
- what may be under-communicated
- how communication can broaden the pattern
- how the reader can create shared confidence

### Required emphasis

Communication should be described as leadership behaviour, not as a generic soft skill.

## 16. Chapter 5 — What happens under pressure

### Purpose

This chapter explains how the pattern changes when stakes rise, time compresses, or uncertainty increases.

It should cover:

- the pressure narrowing
- the short-term value of that narrowing
- the possible cost for people, trust, or strategy
- practical pressure checks

### Example pressure checks

```text
What am I not seeing from the team?
Who needs more context or support before this lands?
Are we solving the immediate issue in a way that still supports the longer direction?
```

### Quality rule

Do not pathologise the reader. Pressure behaviour should be framed as a narrowed version of a real strength.

## 17. Chapter 6 — The strength of this pattern

### Purpose

This chapter names the strongest repeatable contributions of the pattern.

Recommended structure:

```text
Strength 1
Strength 2
Strength 3
```

Each strength should include:

```yaml
strength_title:
strength_text:
linked_signal:
```

### Guidance

Strengths should be behaviourally specific and work-facing.

Avoid generic virtues such as:

```text
strong communicator
resilient leader
good team player
```

unless grounded in the actual pattern.

## 18. Chapter 7 — Where the pattern can narrow

### Purpose

This chapter explains the overuse risk of the pattern.

Recommended structure:

```text
Narrowing 1
Narrowing 2
Narrowing 3
```

Each narrowing point should include:

```yaml
narrowing_title:
narrowing_text:
range_to_add:
```

### Quality rule

The narrowing section should never sound like a weakness list.

Use language such as:

```text
can narrow when
may overuse
may arrive too late
range to bring in
```

Avoid:

```text
weakness
lacks
low
deficient
failure
```

## 19. Chapter 8 — How rank 3 expands your leadership

### Purpose

This chapter explains how the third-ranked signal broadens the main pattern.

For Leadership Approach, rank 3 should be described as practical range that is available but may need to be brought in earlier.

### Required content

- what rank 3 adds
- when it matters
- how it strengthens the pattern
- practical questions or behaviours that activate it

### Example

If rank 3 is People, this chapter might explain how People turns clarity into shared ownership.

## 20. Chapter 9 — How rank 4 expands your leadership

### Purpose

This chapter explains how the fourth-ranked signal adds deliberate range.

Rank 4 should not be framed as missing or weak. It is a further extension that becomes especially useful when the pattern narrows.

### Required content

- what rank 4 contributes
- why it may arrive later
- when to invite it deliberately
- how it strengthens the whole pattern

### Example

If rank 4 is Vision, this chapter might explain how Vision connects reliable action to a larger direction.

## 21. Chapter 10 — Development focus

### Purpose

This chapter gives practical actions that help the reader use and broaden the pattern.

It should include:

- what to keep
- what to broaden
- what to ask before action
- what to do in meetings, decisions, delegation, or pressure moments
- how to use the lower-ranked signals deliberately

### Recommended structure

```text
The development work is not to abandon [strength]. It is to broaden [range].
```

Then provide practical moves.

### Development action cards

Each action may be structured as:

```yaml
action_title:
action_text:
application_context:
linked_signal:
```

## 22. Closing synthesis

### Purpose

The closing synthesis integrates the full report.

It should:

- restate the core value
- name the main narrowing risk
- explain the development edge
- connect the lower-ranked signals back into the whole pattern
- leave the reader with a sense of practical usefulness

### Quality rule

The closing should feel earned. It should not merely summarize earlier headings.

## 23. Final line

### Purpose

The final line should be a precise, memorable closing statement.

Example:

```text
Your leadership turns complexity into structured, consistent progress. The next step is making sure people can see themselves in the route before you ask them to own it.
```

The final line should be specific enough that it could not appear unchanged in every report.

## 24. PDF export CTA

### Purpose

The PDF CTA positions the report as a reference document.

Example:

```text
Download your Leadership Approach report as a PDF.

Your report is designed as a reference document. Save it, revisit it before important decisions, and use the development questions to broaden your leadership range over time.
```

## 25. Web rendering guidance

The Leadership Approach result page should render the report as a premium reading experience.

Recommended layout:

```text
Hero
Score evidence panel
Reading rail
Editorial introduction
Key insight
Chaptered report body
Development section
Closing synthesis
PDF CTA
```

### Reading rail

The reading rail should map to report chapters, not internal schema names.

Example:

```text
Overview
Pattern
Value
Others
Decisions
Communication
Pressure
Strengths
Narrowing
Range
Development
Closing
```

### Score evidence position

The score evidence panel should be visible near the top but visually secondary to the hero statement.

## 26. PDF rendering guidance

The PDF should feel like a premium report, not a printout.

Recommended PDF structure:

```text
Cover page
Result summary
Ranked signal evidence
Key insight
Main chapters
Development actions
Reflection prompts
Closing synthesis
Method note
```

### Static PDF approach

A canonical static PDF may be generated for each of the 24 Leadership Approach reports.

Light personalization may include:

```text
reader_name
completion_date
assessment_title
ranked_signal_order
normalized_scores
report_title
```

The static PDF approach is acceptable if:

- the canonical report remains premium
- personalisation does not break layout
- the PDF matches the web report
- methodology language is clear and minimal

## 27. Report QA checklist

Before a Leadership Approach report is approved, it should pass this checklist.

```text
Does the hero title feel strong enough to lead the result?
Does the introduction create recognition quickly?
Does the report explain leadership behaviour rather than signal labels?
Does it show how the pattern creates value?
Does it show how others may experience the pattern?
Does it explain decision behaviour?
Does it explain communication behaviour?
Does it explain pressure behaviour?
Does it identify strengths without generic praise?
Does it identify narrowing without shame or deficiency?
Does it explain how rank 3 expands the pattern?
Does it explain how rank 4 expands the pattern?
Does it give practical development moves?
Does the closing synthesis feel earned?
Does the final line feel specific to the pattern?
Would a paying reader feel this was useful and premium?
```

## 28. Quality threshold

Target quality:

```text
Preferred: 9+/10
Minimum acceptable: 8.5/10
```

A report should not be approved if:

- it reads like modular assessment copy
- it relies on generic leadership language
- it defines signals rather than interpreting behaviour
- it frames lower-ranked signals as weakness
- it lacks real-world leadership application
- it feels too similar to another pattern report
- it would not be credible as a paid premium result

## 29. Authoring workflow for 24 reports

Recommended workflow:

```text
1. Approve this Leadership Approach Report Structure.
2. Convert the existing process_results_people_vision report into the first canonical report.
3. Render it as a web preview.
4. Render it as a PDF-style preview.
5. QA against the report-first quality threshold.
6. Use the approved report as the model for the remaining 23 patterns.
7. Author the next 3–4 reports as a batch.
8. Compare the batch for quality, repetition, and differentiation.
9. Promote only approved reports.
10. Continue in small batches until all 24 canonical reports are complete.
```

## 30. Strategic rule

The Leadership Approach report should serve the reader before it serves the model.

If a structural element improves reader clarity, keep it.

If a scoring nuance or content block makes the report feel more technical, modular, or lower quality, simplify it.

The reader is paying for insight, not for the complexity of the assessment architecture.
