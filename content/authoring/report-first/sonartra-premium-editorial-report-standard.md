# Sonartra Premium Editorial Report Standard

## 1. Purpose

The Sonartra Premium Editorial Report Standard defines how assessment results should be authored, structured, rendered, and reviewed when using the report-first model.

The purpose is to ensure every reader receives a result that feels:

- personally relevant
- commercially credible
- behaviourally specific
- polished and premium
- coherent from opening to closing
- suitable for web and PDF presentation

The report should not feel like a generated assessment output. It should feel like a carefully authored behavioural intelligence report.

## 2. Core principle

A Sonartra report is not a collection of result components.

A Sonartra report is a structured editorial reading experience.

The assessment engine identifies the reader’s pattern. The report explains what that pattern means, how it shows up, where it creates value, where it narrows, and how the reader can use it more deliberately.

The report should answer:

> “What does this result help me understand about the way I work, lead, decide, communicate, perform, or grow?”

## 3. Universal report architecture

Every premium Sonartra report should contain these core layers.

### 3.1 Hero result statement

The report must open with a strong reader-facing result statement.

The hero statement should be:

- personal
- specific
- behaviourally meaningful
- commercially credible
- memorable without becoming slogan-like

Example:

> You lead by turning complexity into structured progress.

Avoid:

> Your top signal is Process.

Avoid:

> You are a Process-Results leader.

### 3.2 Editorial introduction

The introduction explains the result in plain, premium language.

It should:

- orient the reader quickly
- explain the dominant pattern
- avoid technical model language
- create recognition
- introduce the main strength and development edge

It should not over-explain the scoring model.

### 3.3 Pattern summary

The report should include a simple explanation of the ranked pattern.

This can be shown as a visual stack, ranked signal panel, sidebar, or short written section.

It should answer:

- what comes first
- what supports it
- what extends it
- what range may need to be brought in deliberately

### 3.4 Score evidence panel

The report should show the evidence behind the result, but evidence should not dominate the reading experience.

The score evidence panel may include:

- ranked signals
- normalized percentages
- completion date
- pattern name/title
- optional score shape if retained as metadata

The tone should be:

> “Here is the evidence behind this report.”

Not:

> “Here is the technical result calculation.”

### 3.5 Key insight / pull quote

Each report should include one high-quality key insight.

This should be a sentence the reader could remember, quote, or revisit.

Example:

> Your leadership creates confidence by making work feel more manageable. The next step is making sure people can see themselves in the route before you ask them to own it.

The pull quote should not be generic motivation.

### 3.6 Chaptered report body

The report body should be divided into clear chapters.

Each chapter should have:

- a chapter title
- a clear purpose
- 2–6 paragraphs depending on depth
- optional cards, quotes, lists, or prompts where useful

Chapters should build progressively. They should not feel interchangeable.

### 3.7 Development section

Every report should include practical development guidance.

This section should help the reader apply the result without making them feel deficient.

It should answer:

- what to keep
- what to broaden
- what to notice under pressure
- what to try in real situations
- what questions to ask before action

### 3.8 Closing synthesis

The report should end with an integrated synthesis.

The closing should:

- restate the core gift
- name the main narrowing risk
- define the development edge
- leave the reader with a memorable final line

The close should feel earned, not simply repeated.

### 3.9 PDF export call to action

The report should include a PDF export CTA.

The positioning should be:

> This report is a reference document.

Not:

> Download your results.

Example:

> Download your Leadership Approach report as a PDF. Save it, revisit it before important decisions, and use the development questions to broaden your leadership range over time.

## 4. Required content elements

A premium Sonartra report should normally include the following content elements.

| Element | Purpose |
|---|---|
| Hero title | The reader’s result in one strong line |
| Result statement | The short explanation of the pattern |
| Editorial introduction | The opening interpretation |
| Ranked signal summary | Plain-language explanation of the pattern |
| Score evidence panel | Shows the result data without overwhelming the report |
| Key insight | Memorable sentence or pull quote |
| Chaptered body | Main editorial reading experience |
| Strengths | What the pattern gives the reader |
| Narrowing risks | Where the pattern can overuse itself |
| Development moves | Practical ways to use and broaden the pattern |
| Reflection questions | Optional prompts for deeper use |
| Closing synthesis | Integrated final meaning |
| PDF CTA | Save/export the report as a premium reference |

## 5. Approved content block types

The report-first model should use a defined set of reusable content blocks.

### 5.1 Paragraph

Used for core editorial explanation.

Guidance:

- 40–110 words per paragraph
- avoid overlong blocks
- keep prose precise and grounded
- use second-person voice where appropriate

### 5.2 Chapter heading

Used to structure the main report body.

Guidance:

- clear and reader-facing
- not technical
- not overly clever
- should help the reader know what they are about to learn

Examples:

> How your leadership creates value

> What happens under pressure

> How to broaden your range

### 5.3 Subheading

Used inside chapters where useful.

Guidance:

- should organise the argument
- avoid excessive nesting
- use sparingly

### 5.4 Pull quote

Used for one or two high-value insights.

Guidance:

- should be memorable
- should reflect the specific pattern
- should not be motivational filler

### 5.5 Key insight card

Used to highlight the central interpretation.

Fields:

```text
title
text
```

Purpose:

- reinforce the report’s core meaning
- give the reader an anchor point

### 5.6 Ranked signal card

Used to show how each signal functions in the result.

Fields:

```text
rank
signal_label
role_title
role_summary
```

Purpose:

- explain the pattern without turning the report into a score sheet

### 5.7 Score evidence panel

Fields:

```text
assessment_title
completion_date
pattern_title
ranked_signals
normalized_scores
optional_score_shape
```

Purpose:

- provide evidence and transparency

### 5.8 Strength card

Fields:

```text
title
text
linked_signal
```

Purpose:

- show what the pattern contributes when working well

### 5.9 Narrowing card

Fields:

```text
title
text
range_to_add
```

Purpose:

- show where the pattern can overuse itself

### 5.10 Development action card

Fields:

```text
title
text
application_context
```

Purpose:

- give practical action the reader can use

### 5.11 Reflection prompt

Fields:

```text
prompt
context
```

Purpose:

- help the reader apply the insight

Examples:

> Where might the route be clear to you but not yet owned by others?

### 5.12 Sidebar note

Used for secondary context.

Purpose:

- explain interpretation boundaries
- clarify what the report is and is not saying
- avoid cluttering the main body

### 5.13 Closing line

The final sentence or short paragraph.

Purpose:

- leave the reader with the main report insight
- should be specific to the pattern
- should not sound like a generic quote

## 6. Voice and tone

Sonartra reports should sound:

- mature
- precise
- commercially credible
- calm
- behaviourally specific
- insightful without being dramatic
- personal without being over-familiar

Preferred voice:

```text
Your pattern tends to...
You may notice...
This can create...
The development edge is...
At its best, your approach...
```

Avoid:

```text
You are the kind of person who...
You always...
You lack...
Your weakness is...
You must...
```

The tone should not sound like:

- therapy
- corporate training filler
- motivational coaching
- horoscope-style personality copy
- AI-generated modular prose

## 7. Language rules

### 7.1 Explain behaviour, not labels

Use the model to interpret behaviour.

Do not simply define the signals.

Weak:

> Process means you like structure.

Better:

> You are likely to look for the sequence, owner, standard, and next step before the work moves too far.

### 7.2 Lower-ranked signals are range, not weakness

Reports must not frame lower-ranked signals as deficiencies.

Use:

```text
range to bring in
extension
broader capacity
deliberate addition
useful counterweight
```

Avoid:

```text
weak
low
lacking
missing
deficient
underdeveloped
```

### 7.3 Do not overclaim

The report should describe likely patterns, not fixed identity.

Use:

```text
you may
you are likely to
this can
others may experience
under pressure, this may
```

Avoid:

```text
you always
you never
this proves
you are unable to
```

### 7.4 Use concrete work language

Reports should include real contexts.

Examples:

- meetings
- decisions
- delegation
- pressure
- ownership
- communication
- performance
- recovery
- energy
- direction
- trust
- pace
- standards
- follow-through

### 7.5 Avoid generic premium-sounding filler

Avoid overusing phrases such as:

```text
unlock your potential
step into your power
lean into your strengths
drive success
thrive
game changer
authentic leadership
holistic approach
```

## 8. Structural quality rules

Each report should pass these checks.

### 8.1 Coherence

The report should feel like one authored interpretation.

It should not read like:

```text
summary block
then strength block
then weakness block
then advice block
```

The chapters should build from recognition to meaning to application.

### 8.2 Progression

The report should move through a clear reader journey:

```text
recognise the pattern
understand its value
see how others experience it
understand the narrowing risk
learn how to broaden it
leave with a memorable synthesis
```

### 8.3 Section distinction

Each chapter must add something new.

Avoid repeating the same point under different headings.

### 8.4 Reader usefulness

Every report should give the reader practical value.

A reader should leave with:

- a clearer understanding of themselves
- language for their pattern
- awareness of impact
- one or more useful development moves

### 8.5 Commercial credibility

The report should feel worth paying for.

It should not feel like a free personality quiz result.

## 9. Web rendering standard

The web result page should render the report as a premium reading experience.

Recommended layout:

```text
Hero
Score evidence panel
Reading rail
Editorial introduction
Key insight
Chapters
Development section
Closing synthesis
PDF CTA
```

### Web page requirements

- clear top-level result statement
- generous reading width
- premium typography
- chapter navigation / reading rail
- evidence panel visible but not dominant
- strong mobile reading experience
- no raw internal keys in reader-facing UI
- no debug language outside admin-only appendix
- PDF CTA positioned after the reader has received value

## 10. PDF rendering standard

The PDF should feel like a premium report, not a printout of a web page.

Recommended PDF structure:

```text
Cover page
Result summary
Ranked signal evidence
Key insight
Chaptered report body
Development actions
Reflection prompts
Closing synthesis
Appendix / methodology note
```

### Static PDF model

If using pre-authored static PDFs, each pattern PDF may be generated and stored as a canonical asset.

Light personalisation may include:

```text
reader_name
completion_date
assessment_title
ranked_signal_order
normalized_scores
pattern_title
```

This is acceptable if:

- the core report remains premium and coherent
- personalisation does not break layout
- the PDF still matches the web result
- the methodology note is clear and not over-technical

## 11. QA rubric

Each report should be scored before publication.

Target score:

```text
Minimum: 8.5/10
Preferred: 9+/10
```

### QA categories

| Category | Question |
|---|---|
| Recognition | Will the reader recognise themselves? |
| Specificity | Does it describe real behaviour? |
| Coherence | Does it read as one authored report? |
| Insight | Does it say something non-obvious? |
| Usefulness | Can the reader apply it? |
| Premium tone | Does it feel commercially credible? |
| Structure | Is the report easy and satisfying to read? |
| Distinction | Is this result clearly different from other patterns? |
| Development value | Does it broaden the reader without shaming them? |
| Re-read value | Would the reader return to it later? |

### Publication rule

A canonical report should not be published unless:

```text
overall score >= 8.5/10
no major section below 8/10
no raw model language leaks into reader copy
no lower-ranked signal is framed as deficiency
no chapter feels like generic filler
```

## 12. Assessment-specific structures

Each assessment must define its own report structure before authoring the 24 reports.

Examples:

### Leadership Approach

Likely chapters:

```text
1. Your leadership pattern
2. How your leadership creates value
3. How others experience your leadership
4. Decision behaviour
5. Communication behaviour
6. Pressure behaviour
7. Strengths
8. Where the pattern narrows
9. How to broaden your range
10. Closing synthesis
```

### Flow State

Likely chapters:

```text
1. Your flow pattern
2. How your best energy builds
3. What helps you enter flow
4. What disrupts your rhythm
5. How your pattern affects work and recovery
6. Your strongest flow conditions
7. Where your pattern can narrow
8. How to design better conditions
9. Practical flow rituals
10. Closing synthesis
```

## 13. Authoring workflow

Recommended workflow for the report-first model:

```text
1. Define assessment-specific report structure.
2. Write one gold-standard canonical report.
3. Review against the premium editorial standard.
4. Convert the report into structured report blocks.
5. Render web preview.
6. Render PDF preview.
7. QA the complete reader experience.
8. Use the approved report as the model for the remaining 23 patterns.
9. Author the remaining reports in small batches.
10. Run cross-pattern similarity and quality audits.
11. Promote only approved reports into the assessment package.
```

## 14. Strategic rule

The content model should protect the reader experience.

If a scoring nuance or authoring mechanism improves the reader’s understanding, keep it.

If it makes the report more complex, modular, repetitive, or lower quality, remove or hide it.

The user pays for the quality of the insight, not the complexity of the engine.
