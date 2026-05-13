# Premium Field Contract

This contract defines how approved Pattern Dossiers map into Leadership Approach PSV result fields.

Pattern Dossiers are the editorial source of truth. PSV copy is produced only after each field has a reviewed Field Mapping Matrix entry with a `source_anchor`, `source_excerpt`, `transformation_rule`, `drift_check`, `final_text`, and `status`.

## Global Rules

- Sections `06_Orientation`, `07_Recognition`, `09_Pattern_Mechanics`, `10_Pattern_Synthesis`, and `14_Closing_Integration` are score-shape-dependent. Score shape affects interpretation only; it must not change scoring, rank order, or `pattern_key`.
- Sections `11_Strengths`, `12_Narrowing`, and `13_Application` are pattern-level list sections unless a later schema explicitly requires score-shape variants.
- `08_Signal_Roles` is reusable signal/rank language. It is not part of this first premium Pattern Dossier workflow unless explicitly extended later.
- Field copy must explain the reader's leadership pattern, not merely define the signals.
- Lower-ranked signals must be framed as range, extension, or deliberate broadening, not deficiency.
- Do not reintroduce WPLP, multi-domain authoring, question-section domains, signal-group domains, overlay dimensions, archetypes, thresholds as authoring logic, sentence-library rule engines, the old pair-oriented single-domain model, or multiple result paths.

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

## Field Rules

| section_key | field_key | reader-facing job | required dossier source anchor | transformation rule | length guidance | drift audit check | prohibited failure modes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 06_Orientation | orientation_title | Name the ranked leadership route in plain reader language. | `pattern_identity` | Convert rank order and score shape into a concise title without inventing a type label. | 4-10 words. | Confirms rank order and score shape are visible without redefining scoring. | Archetype naming; slogan; raw `pattern_key`; old pair-model naming. |
| 06_Orientation | rank_1_phrase | Explain the first leadership route the reader likely trusts. | `pattern_identity`; `attention_pattern` | Turn rank 1 into a behavioural leadership starting point. | 8-18 words. | Reads as leadership behaviour, not a signal definition. | "Primary trait"; capability score; dominance language. |
| 06_Orientation | rank_2_phrase | Explain how the second signal shapes the first. | `pattern_identity`; `core_leadership_thesis` | Show rank 2 as shaping influence, with paired profiles treating rank 1 and rank 2 as close partners. | 8-18 words. | Does not reduce rank 2 to a weak support role. | Rank-1-only interpretation; hierarchy language; generic balancing copy. |
| 06_Orientation | rank_3_phrase | Explain the third signal as useful range. | `rank_3_extension`; `development_moves` | Frame rank 3 as practical extension that broadens the main route. | 8-18 words. | Presents range, not deficiency. | "Less developed"; absent/weak framing; generic add-on. |
| 06_Orientation | rank_4_phrase | Explain the fourth signal as deliberate range to bring in. | `rank_4_extension`; `development_moves` | Frame rank 4 as a leadership extension to add intentionally when the pattern narrows. | 8-18 words. | Avoids deficit language and keeps the fourth signal meaningful. | "Lowest"; "lacks"; corrective shame language. |
| 06_Orientation | orientation_summary | Give fast recognition of the full ranked pattern. | `pattern_identity`; `core_leadership_thesis` | Condense the dossier thesis into the opening pattern explanation. | 45-80 words. | Includes rank order, leadership context, and score-shape meaning. | Signal glossary; generic summary; new scoring claims. |
| 06_Orientation | score_shape_summary | Explain how score shape affects interpretation. | `pattern_identity`; score-shape notes | Describe concentrated, paired, graduated, or balanced shape as interpretive emphasis only. | 30-60 words. | Does not alter rank order, scoring, or `pattern_key`. | Treating score shape as a separate type; runtime logic claims; thresholds. |
| 07_Recognition | headline | Give the reader a quick "this sounds like me at work" entry point. | `felt_experience`; `attention_pattern` | Use an observable leadership pattern, preferably with a work context. | 5-12 words. | Specific enough to identify behaviour, not flattery. | Motivational slogan; abstract identity label; section repetition. |
| 07_Recognition | recognition_statement | State how the pattern commonly shows up in real leadership. | `attention_pattern`; `decision_behaviour`; `communication_behaviour` | Translate dossier observation into second-person behavioural recognition. | 25-45 words. | Mentions what the reader notices, protects, starts, delays, or asks for. | Generic leadership praise; signal definitions; moral judgement. |
| 07_Recognition | recognition_expansion | Expand recognition with consequences for work or people. | `felt_experience`; `value_creation`; `pressure_behaviour` | Show how others or the team may experience the pattern. | 45-85 words. | Connects behaviour to team, decision, pressure, or communication impact. | Overclaiming; therapy language; unsupported criticism. |
| 09_Pattern_Mechanics | mechanics_title | Name the mechanism that makes the pattern operate. | `core_leadership_thesis`; `protective_function` | Write a concise cause-and-effect title. | 4-10 words. | Describes the pattern in motion, not a strength. | Static trait label; old pair summary; generic "how it works". |
| 09_Pattern_Mechanics | core_mechanism | Explain what starts and sustains the pattern. | `core_leadership_thesis`; `attention_pattern` | Describe the behavioural sequence behind the ranked pattern. | 45-85 words. | Shows rank interaction and score-shape emphasis without recomputation. | Pure signal glossary; unsupported thresholds; alternate payload logic. |
| 09_Pattern_Mechanics | why_it_shows_up | Explain the leadership problem this pattern is trying to solve. | `attention_pattern`; `pressure_behaviour`; `hidden_cost` | Connect the mechanism to context, uncertainty, pressure, or team need. | 35-70 words. | Names the trigger without pathologising the reader. | Personality diagnosis; blame; vague work context. |
| 09_Pattern_Mechanics | what_it_protects | Explain what the pattern protects from. | `protective_function` | Translate the dossier's protective function into practical leadership protection. | 30-65 words. | Protection is useful but not unlimited. | Framing protection as fear only; making lower ranks failures. |
| 10_Pattern_Synthesis | synthesis_title | State the central meaning of the pattern. | `integrated_closing`; `core_leadership_thesis` | Compress the whole-pattern interpretation into one title. | 4-10 words. | Feels specific to this rank order and score shape. | Slogan; archetype; interchangeable title. |
| 10_Pattern_Synthesis | gift | Name the pattern's practical gift. | `value_creation`; `integrated_closing` | Express the gift as leadership value in work, teams, decisions, or communication. | 18-35 words. | Gift is behaviourally specific, not personality praise. | Flattery; capability score; generic "strong leader" copy. |
| 10_Pattern_Synthesis | trap | Name the overuse risk. | `hidden_cost`; `narrowing_pattern`; `pressure_behaviour` | Frame as narrowing under conditions, not a flaw. | 18-35 words. | Lower-ranked signals are range to add, not missing ability. | Deficiency language; moral judgement; "weakness" framing. |
| 10_Pattern_Synthesis | takeaway | Give the reader one practical interpretive takeaway. | `development_moves`; `integrated_closing` | Turn the pattern into a concise leadership move. | 18-35 words. | Action follows from the dossier, not generic coaching. | Advice detached from pattern; motivational slogan. |
| 10_Pattern_Synthesis | synthesis_text | Integrate gift, trap, rank order, and score-shape meaning. | `core_leadership_thesis`; `hidden_cost`; `development_moves` | Write a compact whole-pattern synthesis. | 70-120 words. | Coherent with Orientation, Recognition, and Mechanics without repeating them. | Modular fragments; AI-generated feel; contradictory interpretation. |
| 11_Strengths | strength_title | Label one practical strength of the pattern. | `value_creation`; `integrated_closing` | Title a specific leadership contribution. | 3-8 words. | Tied to rank order or ranked interaction. | Generic virtue; signal name only; praise without consequence. |
| 11_Strengths | strength_text | Explain the strength in work-facing terms. | `value_creation`; `felt_experience`; `decision_behaviour`; `communication_behaviour` | Describe what becomes easier, clearer, safer, or more effective when the pattern works well. | 35-70 words. | Shows practical consequence for team, decision, pressure, or communication. | Generic praise; copied dossier paragraph; no leadership application. |
| 11_Strengths | linked_signal_key | Identify the signal most responsible for the strength. | `pattern_identity`; relevant strength anchor | Use one of `results`, `process`, `vision`, `people`; link to rank influence, not scoring logic. | Exact signal key. | Signal key matches the strength's meaning and the pattern rank. | Non-canonical key; overlay/domain key; score calculation. |
| 12_Narrowing | narrowing_title | Label where the pattern can narrow. | `narrowing_pattern`; `hidden_cost` | Title the overuse or omission risk without using deficiency language. | 3-8 words. | Reads as contextual narrowing, not character flaw. | "Weakness"; shame language; rank 4 deficit. |
| 12_Narrowing | narrowing_text | Explain the narrowing risk and practical consequence. | `narrowing_pattern`; `pressure_behaviour`; `hidden_cost` | Show what may happen when the main route overextends or range is delayed. | 40-80 words. | The consequence is behavioural and observable. | Diagnosing motives; overstating harm; unsupported criticism. |
| 12_Narrowing | missing_range_signal_key | Identify the signal that would add useful range. | `rank_3_extension`; `rank_4_extension`; `development_moves` | Use the signal key that represents range to invite earlier. | Exact signal key. | Must frame the signal as range/extension. | "Missing", "low", or "weak" semantics in final copy; non-canonical key. |
| 13_Application | application_title | Label one practical leadership move. | `development_moves` | Turn the development move into a direct, usable title. | 3-8 words. | Specific to the pattern and work context. | Generic coaching; slogan; unrelated advice. |
| 13_Application | application_text | Give a practical action the reader can use. | `development_moves`; `decision_behaviour`; `communication_behaviour`; `pressure_behaviour` | Translate dossier guidance into same-day leadership behaviour. | 40-85 words. | Action clearly broadens the pattern without changing identity. | Advice that contradicts rank order; therapy tone; vague reflection. |
| 13_Application | linked_signal_key | Identify the signal the application move activates. | `development_moves`; relevant extension anchor | Use one of the four canonical signal keys. | Exact signal key. | Signal key matches the leadership move being practised. | Overlay/domain key; multi-domain logic; invented signal. |
| 14_Closing_Integration | closing_summary | Close the report with the integrated leadership meaning. | `integrated_closing` | Summarise the pattern's value, risk, and growth direction. | 80-130 words. | Integrates rank order and score shape without repeating earlier sections too closely. | New claims; generic conclusion; runtime/source leakage. |
| 14_Closing_Integration | core_gift | State the core gift in a memorable but grounded way. | `value_creation`; `integrated_closing` | Extract the pattern's strongest contribution. | 15-30 words. | Behaviourally specific and commercially credible. | Flattery; slogan; vague excellence. |
| 14_Closing_Integration | core_trap | State the main narrowing risk. | `hidden_cost`; `narrowing_pattern` | Name the trap as overuse, delay, or narrowed range. | 15-30 words. | Avoids deficiency language and preserves ranked-pattern meaning. | Character flaw; "low signal" wording; overclaiming. |
| 14_Closing_Integration | development_edge | State the clearest growth edge. | `development_moves`; `rank_3_extension`; `rank_4_extension` | Convert development guidance into one practical edge. | 20-40 words. | Helps the reader broaden the pattern without becoming a different leader. | Generic self-improvement; contradicting the dossier. |
| 14_Closing_Integration | memorable_line | Leave one final reader-facing line. | `memorable_line`; `integrated_closing` | Use or lightly derive a polished final line from the dossier. | 12-28 words. | Memorable but not slogan-like; specific to pattern and score shape. | Motivational quote; invented archetype; generic brand line. |

