# Single-Domain Narrative Framework

## Purpose

This document locks the canonical narrative framework for single-domain reports.
It is the contract for:

- builder authoring
- dataset imports
- composer preview
- persisted result composition
- result rendering

The framework is definition-only in this task. It does not change engine scoring,
normalization, or the canonical completion pipeline.

## Governing rules

- One single-domain narrative framework
- One six-section report flow
- One ownership model for narrative claims
- One import contract per section
- No UI-side runtime recomposition for user-facing results

This schema must be treated as the sole narrative structure for single-domain
reports authored against the canonical engine.

## Locked section flow

The final section order is fixed:

1. `intro`
2. `hero`
3. `drivers`
4. `pair`
5. `limitation`
6. `application`

That flow must be preserved in:

- imports
- builder previews
- persisted section composition
- result page rendering

## Section intent

### 1. `intro`

Question owned:

- What is this domain about?

Responsibility:

- define the domain frame
- explain what the domain measures
- orient the reader to the lens used in the report

Must not:

- describe the user's specific pattern
- rank signals
- explain top-signal interaction
- introduce limitation or development advice

### 2. `hero`

Question owned:

- What is the defining pattern here?

Responsibility:

- state the dominant overall pattern in this domain
- describe the most evident behavioral shape created by the top tendencies
- establish the report's main narrative identity

Must not:

- explain driver mechanics in detail
- duplicate the pair interaction section
- present weaker signals as neutral context
- provide action advice

### 3. `drivers`

Question owned:

- What is creating that pattern?

Responsibility:

- explain the signal-level causes behind the hero pattern
- identify which signal is the `primary_driver`
- identify which signal is the `secondary_driver`
- allow supporting context only where it sharpens the explanation
- treat materially weaker signals as `range_limitation`

Must not:

- restate the hero paragraph at full length
- explain cost or narrowness as the main point
- give recommendations

### 4. `pair`

Question owned:

- How do the top two tendencies combine?

Responsibility:

- explain the interaction between the top two ranked tendencies
- define the compound pattern produced by those two tendencies together
- clarify how the combination differs from either tendency in isolation

Must not:

- duplicate hero framing sentence-for-sentence
- broaden into full limitation analysis
- become an action section

### 5. `limitation`

Question owned:

- Where does that pattern become costly or narrow?

Responsibility:

- describe the cost, narrowing effect, or blind spot in the dominant pattern
- connect that cost to at least one weaker signal when one is materially underplayed
- frame weaker signals as range limitations, not as neutral omissions

Must not:

- re-explain the domain
- re-explain pair dynamics as if no cost exists
- become a generic caution list untethered to the dominant pattern

### 6. `application`

Question owned:

- What should the user rely on, notice, and develop?

Responsibility:

- convert the narrative into practical guidance
- include what to rely on in the established pattern
- include what to notice when the pattern narrows
- include at least one development item or watchout tied to a materially underplayed signal when present

Must not:

- redefine the pattern
- repeat limitation language without translating it into action

## Locked claim ownership

Each section owns a distinct narrative claim set. A claim must have one primary
owner section even if other sections reference it secondarily.

| Section | Allowed question | Allowed primary claim types | Disallowed overlap |
| --- | --- | --- | --- |
| `intro` | What is this domain about? | `domain_definition`, `domain_scope`, `interpretation_guidance` | user-specific pattern claims, signal ranking, pair dynamics, limitations, development |
| `hero` | What is the defining pattern here? | `dominant_pattern`, `pattern_identity`, `pattern_strength` | driver mechanics, pair mechanics, limitation framing, application advice |
| `drivers` | What is creating that pattern? | `driver_primary`, `driver_secondary`, `driver_supporting_context`, `driver_range_limitation` | hero restatement, pair synthesis, action guidance |
| `pair` | How do the top two tendencies combine? | `pair_interaction`, `pair_synergy`, `pair_tension` | domain framing, raw driver inventory, limitation ownership, application advice |
| `limitation` | Where does that pattern become costly or narrow? | `pattern_cost`, `range_narrowing`, `weaker_signal_linkage`, `blind_spot` | intro framing, hero identity, generic action lists |
| `application` | What should the user rely on, notice, and develop? | `applied_strength`, `watchout`, `development_focus`, `range_recovery_action` | pattern definition, pair explanation, limitation-only analysis |

## Driver role model

The driver role contract is locked to four values:

- `primary_driver`
- `secondary_driver`
- `supporting_context`
- `range_limitation`

### Role meanings

#### `primary_driver`

- The strongest explanatory signal behind the hero pattern.
- Explains what is driving the pattern.
- Must be present exactly once in `drivers`.

#### `secondary_driver`

- The reinforcing signal behind the hero pattern.
- Explains what is reinforcing the pattern.
- Must be present exactly once in `drivers`.

#### `supporting_context`

- A non-primary signal that adds shape, tone, pacing, or expression to the pattern.
- May be omitted when unnecessary.
- Must not be used to hide a materially underplayed weaker signal.

#### `range_limitation`

- A weaker or materially underplayed signal that narrows the pattern's range.
- Must be authored as a limitation of available range, not as neutral background context.
- Must be referenced in `limitation` when materially underplayed.
- Must influence `application` through at least one watchout or development item when materially underplayed.

## Weaker signal rule

Weaker signals are not neutral context in this framework.

If a weaker signal is materially underplayed, it must be modeled as
`range_limitation`.

That means:

- it cannot be written as flavor text in `hero`
- it cannot be buried as optional context in `drivers`
- it must be connected to the cost described in `limitation`
- it must show up in `application` as a watchout and/or development focus

## Section contracts

### `intro` contract

Required content:

- domain title or domain label reference
- explanation of what the domain measures
- interpretation guidance for how to read the chapter

Optional content:

- brief methodology or framing bridge

Forbidden content:

- signal ranking
- top-pair naming
- limitation language
- explicit development advice

### `hero` contract

Required content:

- defining pattern statement
- summary of how that pattern tends to show up
- a single dominant narrative throughline

Optional content:

- concise strength implication

Forbidden content:

- detailed primary/secondary driver mechanics
- weaker-signal explanation as neutral context
- pair-only interaction analysis
- action checklist

### `drivers` contract

Required content:

- one `primary_driver`
- one `secondary_driver`
- explanation of what each contributes

Optional content:

- zero or more `supporting_context` entries
- zero or more `range_limitation` entries

Forbidden content:

- hero duplication
- advice statements
- standalone blind-spot sectioning

### `pair` contract

Required content:

- the top-two tendency combination
- interaction description
- resulting combined pattern

Optional content:

- synergy or friction nuance between the top two tendencies

Forbidden content:

- domain definition
- weaker-signal ownership
- development checklist

### `limitation` contract

Required content:

- cost or narrowing statement tied to the main pattern
- linkage from that cost to at least one `range_limitation` when present

Optional content:

- contextual examples of the narrowing effect

Forbidden content:

- neutral restatement of weaker signals
- unlinked caution text
- application checklist

### `application` contract

Required content:

- one or more "rely on" guidance items
- one or more "notice" guidance items
- one or more development items

Additional required content when a materially underplayed weaker signal exists:

- at least one watchout or development item tied to the relevant `range_limitation`

Forbidden content:

- re-authoring the hero pattern
- ungrounded generic coaching advice

## Banned overlaps

The following overlaps are explicitly disallowed:

- `hero` and `pair` cannot author the same interaction claim in different wording
- `hero` cannot own detailed driver causality
- `drivers` cannot own the cost or blind-spot narrative
- `limitation` cannot introduce net-new dominant pattern framing
- `application` cannot become a second limitation section
- weaker-signal material cannot appear only in `drivers`; it must propagate to `limitation` and `application` when materially underplayed

## Pipe-delimited import schemas

Each section has one locked pipe-delimited schema.
Headers are ordered and exact.

### `intro`

Dataset key:

- `SINGLE_DOMAIN_INTRO`

Header:

```text
domain_key|section_key|domain_title|domain_definition|domain_scope|interpretation_guidance|intro_note
```

Column intent:

- `domain_key`: canonical domain identifier
- `section_key`: must be `intro`
- `domain_title`: display title for the chapter
- `domain_definition`: what this domain is about
- `domain_scope`: what this domain captures or evaluates
- `interpretation_guidance`: how to read the section
- `intro_note`: optional bridge or framing line

### `hero`

Dataset key:

- `SINGLE_DOMAIN_HERO`

Header:

```text
domain_key|section_key|pair_key|pattern_label|hero_statement|hero_expansion|hero_strength
```

Column intent:

- `pair_key`: canonical top-two pair key
- `pattern_label`: short name for the dominant pattern
- `hero_statement`: defining pattern sentence
- `hero_expansion`: how the pattern tends to show up
- `hero_strength`: concise strength implication anchored in the pattern

### `drivers`

Dataset key:

- `SINGLE_DOMAIN_DRIVERS`

Header:

```text
domain_key|section_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority
```

Column intent:

- one row per owned driver claim
- `driver_role`: one of `primary_driver|secondary_driver|supporting_context|range_limitation`
- `claim_type`: constrained by `driver_role`
- `claim_text`: authored driver explanation
- `materiality`: `core|supporting|material_underplay`
- `priority`: stable intra-section ordering integer

### `pair`

Dataset key:

- `SINGLE_DOMAIN_PAIR`

Header:

```text
domain_key|section_key|pair_key|pair_label|interaction_claim|synergy_claim|tension_claim|pair_outcome
```

Column intent:

- `interaction_claim`: how the top two tendencies combine
- `synergy_claim`: the value of the combination
- `tension_claim`: how the combination can pull against itself
- `pair_outcome`: resulting pattern statement

### `limitation`

Dataset key:

- `SINGLE_DOMAIN_LIMITATION`

Header:

```text
domain_key|section_key|pair_key|limitation_label|pattern_cost|range_narrowing|weaker_signal_key|weaker_signal_link
```

Column intent:

- `pattern_cost`: where the main pattern becomes costly
- `range_narrowing`: how available range or adaptability narrows
- `weaker_signal_key`: weaker signal linked to that cost when present
- `weaker_signal_link`: explicit sentence connecting the weaker signal to the limitation

### `application`

Dataset key:

- `SINGLE_DOMAIN_APPLICATION`

Header:

```text
domain_key|section_key|pair_key|focus_area|guidance_type|signal_key|guidance_text|linked_claim_type|priority
```

Column intent:

- one row per application item
- `focus_area`: `rely_on|notice|develop`
- `guidance_type`: `applied_strength|watchout|development_focus|range_recovery_action`
- `signal_key`: primary associated signal, including weaker signal when applicable
- `linked_claim_type`: upstream claim anchor from hero, drivers, pair, or limitation
- `priority`: stable intra-section ordering integer

## Type-level allowed values

### Section keys

- `intro`
- `hero`
- `drivers`
- `pair`
- `limitation`
- `application`

### Claim ownership

- `domain_definition`
- `domain_scope`
- `interpretation_guidance`
- `dominant_pattern`
- `pattern_identity`
- `pattern_strength`
- `driver_primary`
- `driver_secondary`
- `driver_supporting_context`
- `driver_range_limitation`
- `pair_interaction`
- `pair_synergy`
- `pair_tension`
- `pattern_cost`
- `range_narrowing`
- `weaker_signal_linkage`
- `blind_spot`
- `applied_strength`
- `watchout`
- `development_focus`
- `range_recovery_action`

## Validation rules

The framework validator must enforce the following rules.

### 1. Missing required sections

Fail when any of the six sections is absent for a authored single-domain report
definition or preview input.

### 2. Section role collisions

Fail when:

- more than one `primary_driver` exists
- more than one `secondary_driver` exists
- a claim type appears under a section that does not own it
- a section imports claims that belong to another section

### 3. Hero/pair duplication

Fail when the hero and pair sections resolve to the same owned interaction claim
or duplicate normalized narrative text for the same `pair_key`.

This validator should compare authored ownership and normalized text identity, not
just exact raw strings.

### 4. Weaker-signal coverage

Fail when a materially underplayed signal is present in ranked or preview input but:

- is not represented as a `range_limitation` in `drivers`
- or is only represented as `supporting_context`

### 5. Limitation linkage to weaker signals

Fail when at least one material `range_limitation` exists and `limitation` lacks:

- `weaker_signal_key`
- or `weaker_signal_link`

### 6. Application linkage to weaker signals

Fail when at least one material `range_limitation` exists and `application` lacks
at least one `watchout`, `development_focus`, or `range_recovery_action` tied to
that weaker signal.

### 7. Import header integrity

Fail when a dataset header:

- is missing required columns
- contains extra columns
- changes column order

## Preview contract

Composer preview and downstream composition should use a single preview input
shape containing:

- domain identity
- ordered top signals
- top pair key
- driver rows
- weaker-signal materiality flags
- authored section content

Preview must not invent a second narrative structure.

## Backward compatibility and migration assumptions

This framework is intended to replace overlapping legacy single-domain language
datasets over later tasks without changing the engine scoring contract.

Migration assumptions:

1. Existing single-domain datasets such as domain framing, hero pairs, balancing,
   pair summaries, signal chapters, and application statements may need to map
   into the six locked sections.
2. Legacy "underplayed" signal language should migrate to `range_limitation`
   semantics where the signal is materially weak.
3. Preview tooling may temporarily adapt older dataset shapes into this schema,
   but authored ownership must resolve to the new six-section model before
   publish.
4. Existing persisted result payloads are not rewritten by this task.
5. Later tasks may add adapters, builder enforcement, and import transforms, but
   they must not redefine section ownership.

## Final locked framework summary

- `intro` explains the domain
- `hero` states the defining pattern
- `drivers` explains what drives and reinforces the pattern
- `pair` explains how the top two tendencies combine
- `limitation` explains where the pattern becomes costly or narrow
- `application` explains what to rely on, notice, and develop

Weaker or materially underplayed signals are always modeled as range
limitations, not neutral background context.
