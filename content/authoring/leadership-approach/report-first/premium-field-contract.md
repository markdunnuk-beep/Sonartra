# Premium Field Contract

This contract defines how approved Pattern Dossiers map into Leadership Approach result fields and, where still used, PSV result fields.

## Global Rules

- Pattern Dossiers are the editorial source of truth.
- Field copy must explain the reader's leadership pattern, not merely define signals.
- Lower-ranked signals must be framed as range, extension, or deliberate broadening, not deficiency.
- Score shape may affect interpretation only; it must not change scoring, rank order, or `pattern_key`.
- Do not reintroduce WPLP, multi-domain authoring, overlays, archetypes, thresholds as authoring logic, sentence-library rule engines, old pair-oriented result models, or multiple result paths.

## Dossier Source Anchors

Use these anchors when mapping from a Pattern Dossier:

- `pattern_identity`
- `core_leadership_thesis`
- `attention_pattern`
- `value_creation`
- `felt_experience`
- `decision_behaviour`
- `communication_behaviour`
- `pressure_behaviour`
- `protective_function`
- `hidden_cost`
- `narrowing_pattern`
- `rank_3_extension`
- `rank_4_extension`
- `development_moves`
- `integrated_closing`
- `memorable_line`

## Section Rules

### 06_Orientation

| field_key | reader-facing job | source anchor | rule |
|---|---|---|---|
| `orientation_title` | Name the ranked leadership route in plain reader language. | `pattern_identity` | Concise, premium, no raw pattern key or archetype label. |
| `rank_1_phrase` | Explain the first leadership route the reader likely trusts. | `pattern_identity`, `attention_pattern` | Behavioural, not a signal definition. |
| `rank_2_phrase` | Explain how the second signal shapes the first. | `pattern_identity`, `core_leadership_thesis` | For paired profiles, rank 1 and rank 2 should read as close partners. |
| `rank_3_phrase` | Explain the third signal as useful range. | `rank_3_extension`, `development_moves` | Frame as practical extension, not deficiency. |
| `rank_4_phrase` | Explain the fourth signal as deliberate range. | `rank_4_extension`, `development_moves` | Avoid lowest, weak, lacking, or corrective language. |
| `orientation_summary` | Give fast recognition of the full ranked pattern. | `pattern_identity`, `core_leadership_thesis` | Include rank order, leadership context, and shape meaning where relevant. |
| `score_shape_summary` | Explain how score shape affects interpretation. | `pattern_identity`, score-shape notes | Interpretive emphasis only; no scoring or threshold claims. |

### 07_Recognition

| field_key | reader-facing job | source anchor | rule |
|---|---|---|---|
| `headline` | Create a quick "this sounds like me" entry point. | `felt_experience`, `attention_pattern` | Observable and specific, not flattering. |
| `recognition_statement` | State how the pattern shows up in real leadership. | `attention_pattern`, `decision_behaviour`, `communication_behaviour` | Name what the reader notices, protects, closes, delays, or asks for. |
| `recognition_expansion` | Expand recognition with consequences for work or people. | `felt_experience`, `value_creation`, `pressure_behaviour` | Connect behaviour to team, decision, pressure, or communication impact. |

### 09_Pattern_Mechanics

| field_key | reader-facing job | source anchor | rule |
|---|---|---|---|
| `mechanics_title` | Name the mechanism that makes the pattern operate. | `core_leadership_thesis`, `protective_function` | Cause-and-effect title, not a trait label. |
| `core_mechanism` | Explain what starts and sustains the pattern. | `core_leadership_thesis`, `attention_pattern` | Show rank interaction and score-shape emphasis without recomputation. |
| `why_it_shows_up` | Explain the leadership problem the pattern solves. | `attention_pattern`, `pressure_behaviour`, `hidden_cost` | Name trigger without pathologising the reader. |
| `what_it_protects` | Explain what the pattern protects from. | `protective_function` | Protection is useful but not unlimited. |

### 10_Pattern_Synthesis

| field_key | reader-facing job | source anchor | rule |
|---|---|---|---|
| `synthesis_title` | State the central meaning of the pattern. | `integrated_closing`, `core_leadership_thesis` | Specific to rank order and score shape where relevant. |
| `gift` | Name the pattern's practical gift. | `value_creation`, `integrated_closing` | Behaviourally specific, not personality praise. |
| `trap` | Name the overuse risk. | `hidden_cost`, `narrowing_pattern`, `pressure_behaviour` | Frame as narrowing, not flaw. |
| `takeaway` | Give one practical interpretive takeaway. | `development_moves`, `integrated_closing` | Action follows from the pattern. |
| `synthesis_text` | Integrate gift, trap, rank order, and shape meaning. | `core_leadership_thesis`, `hidden_cost`, `development_moves` | Coherent, not modular fragments. |

### 11_Strengths

| field_key | reader-facing job | source anchor | rule |
|---|---|---|---|
| `strength_title` | Label one practical strength. | `value_creation`, `integrated_closing` | Specific contribution, not generic virtue. |
| `strength_text` | Explain the strength in work-facing terms. | `value_creation`, `felt_experience`, `decision_behaviour`, `communication_behaviour` | Show practical consequence for team, decision, pressure, or communication. |
| `linked_signal_key` | Identify the signal most responsible. | `pattern_identity` | Use canonical signal key only. |

### 12_Narrowing

| field_key | reader-facing job | source anchor | rule |
|---|---|---|---|
| `narrowing_title` | Label where the pattern can narrow. | `narrowing_pattern`, `hidden_cost` | Overuse language, not weakness language. |
| `narrowing_text` | Explain narrowing and consequence. | `narrowing_pattern`, `pressure_behaviour`, `hidden_cost` | Behavioural and observable. |
| `missing_range_signal_key` | Identify the signal that adds range. | `rank_3_extension`, `rank_4_extension`, `development_moves` | The signal is range/extension, not missing ability. |

### 13_Application

| field_key | reader-facing job | source anchor | rule |
|---|---|---|---|
| `application_title` | Label one practical leadership move. | `development_moves` | Specific and usable. |
| `application_text` | Give a practical action the reader can use. | `development_moves`, `decision_behaviour`, `communication_behaviour`, `pressure_behaviour` | Broadens the pattern without changing identity. |
| `linked_signal_key` | Identify the signal activated by the move. | `development_moves` | Must match the move. |

### 14_Closing_Integration

| field_key | reader-facing job | source anchor | rule |
|---|---|---|---|
| `closing_summary` | Close with integrated leadership meaning. | `integrated_closing` | Value, risk, and growth direction. |
| `core_gift` | State the core gift. | `value_creation`, `integrated_closing` | Grounded and memorable. |
| `core_trap` | State the main narrowing risk. | `hidden_cost`, `narrowing_pattern` | Overuse, delay, or narrowed range. |
| `development_edge` | State the clearest growth edge. | `development_moves`, `rank_3_extension`, `rank_4_extension` | Helps the reader broaden without becoming a different leader. |
| `memorable_line` | Leave one final reader-facing line. | `memorable_line`, `integrated_closing` | Specific and not slogan-like. |

## Prohibited Failure Modes

- Raw internal keys in reader copy.
- Lower-ranked signals described as weak, low, missing, lacking, deficient, or absent.
- Signal glossary language instead of behaviour.
- Generic leadership praise.
- Therapy tone, motivational slogans, or corporate training filler.
- Score-shape language that implies thresholds, recomputation, or changed scoring.
