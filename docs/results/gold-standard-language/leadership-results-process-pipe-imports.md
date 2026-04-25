# Leadership Results Process Pipe Imports

## 1. Purpose

This file converts the gold-standard Leadership `results_process` draft into section-first pipe-delimited import rows for the six single-domain language imports.

This is documentation and import preparation only. It does not change app report language, builder-linked language, database rows, seed data, engine logic, composer logic, scoring, persistence, result payloads, or UI components.

## 2. Schema confirmation

Accepted section-first dataset names:

- `SINGLE_DOMAIN_INTRO`
- `SINGLE_DOMAIN_HERO`
- `SINGLE_DOMAIN_DRIVERS`
- `SINGLE_DOMAIN_PAIR`
- `SINGLE_DOMAIN_LIMITATION`
- `SINGLE_DOMAIN_APPLICATION`

Exact headers:

- `SINGLE_DOMAIN_INTRO`: `domain_key|section_key|domain_title|domain_definition|domain_scope|interpretation_guidance|intro_note`
- `SINGLE_DOMAIN_HERO`: `domain_key|section_key|pair_key|pattern_label|hero_statement|hero_expansion|hero_strength`
- `SINGLE_DOMAIN_DRIVERS`: `domain_key|section_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority`
- `SINGLE_DOMAIN_PAIR`: `domain_key|section_key|pair_key|pair_label|interaction_claim|synergy_claim|tension_claim|pair_outcome`
- `SINGLE_DOMAIN_LIMITATION`: `domain_key|section_key|pair_key|limitation_label|pattern_cost|range_narrowing|weaker_signal_key|weaker_signal_link`
- `SINGLE_DOMAIN_APPLICATION`: `domain_key|section_key|pair_key|focus_area|guidance_type|signal_key|guidance_text|linked_claim_type|priority`

Accepted section keys used:

- `intro`
- `hero`
- `drivers`
- `pair`
- `limitation`
- `application`

Accepted driver roles used:

- `primary_driver`
- `secondary_driver`
- `supporting_context`
- `range_limitation`

Accepted driver claim types used:

- `driver_primary`
- `driver_secondary`
- `driver_supporting_context`
- `driver_range_limitation`

Accepted materiality values used:

- `core`
- `supporting`
- `material_underplay`

Accepted application focus areas used:

- `rely_on`
- `notice`
- `develop`

Accepted application guidance types used:

- `applied_strength`
- `watchout`
- `development_focus`

Accepted linked claim types used:

- `applied_strength`
- `watchout`
- `development_focus`

Key values:

- `domain_key`: `leadership-approach`
- Seeded result `pair_key`: `results_process`
- Primary signal: `process`
- Secondary signal: `results`
- Supporting signal: `vision`
- Weaker signal: `people`

Validator note:

The seeded result trace and requested task use `results_process`. The single-domain import path now treats authored/runtime signal order as canonical and accepts the reversed `process_results` form as a compatibility alias.

## 3. Pipe-delimited imports

### A. `SINGLE_DOMAIN_INTRO`

```text
domain_key|section_key|domain_title|domain_definition|domain_scope|interpretation_guidance|intro_note
leadership-approach|intro|Understand how you lead|Leadership, in this report, describes how you create direction, hold standards, and move a group from intent to outcome. It is not a measure of charisma or seniority. It is a reading of the leadership pattern most available to you when there is work to be clarified, decisions to be made, and progress to be protected.|Your result points to a leadership style built around disciplined execution. You are likely to make sense of leadership by asking what must be organised, what must be delivered, and what structure will make the work dependable. That gives your leadership a practical authority. It also means the human conditions around the work need deliberate attention, because they may not always present themselves as the first problem to solve.|The sections that follow read the pattern in sequence. First, they name the core leadership identity. Then they explain the signals driving it, the way the two strongest signals combine, the cost of over-relying on that combination, and the practical adjustments that would make the pattern more complete.|Read this result as a sequence from orientation, to identity, to cause, to synthesis, to cost, then to applied action.
```

### B. `SINGLE_DOMAIN_HERO`

```text
domain_key|section_key|pair_key|pattern_label|hero_statement|hero_expansion|hero_strength
leadership-approach|hero|results_process|Disciplined delivery|Your leadership is strongest when direction needs to become a disciplined system of delivery.|You tend to create value by making work more ordered, more trackable, and more capable of surviving pressure. Where others may stay in discussion, you are more likely to look for the operating shape: the sequence, the decision point, the owner, the dependency, and the standard that will show whether progress is real. This gives your leadership credibility in environments where ambition has to be converted into reliable movement. You can reduce ambiguity, create a clearer route through complexity, and help a group understand what needs to happen next.|The trade-off is that leadership can start to favour what can be structured, evidenced, and completed. When that happens, the emotional and relational conditions that make execution sustainable can be under-read. People may experience the clarity of the system before they feel the intent behind it.
```

### C. `SINGLE_DOMAIN_DRIVERS`

```text
domain_key|section_key|pair_key|signal_key|driver_role|claim_type|claim_text|materiality|priority
leadership-approach|drivers|results_process|process|primary_driver|driver_primary|Process is the main cause of this pattern. It suggests that you instinctively look for the operating logic behind effective leadership. You are likely to notice where work lacks sequence, where responsibilities are blurred, where standards are inconsistent, or where a good intention has not yet become a repeatable way of working. This gives you a stabilising influence. It also means your attention can move quickly towards order, sometimes before enough has been learned about how people are experiencing the change.|core|1
leadership-approach|drivers|results_process|results|secondary_driver|driver_secondary|Results reinforces the pattern by adding urgency and commercial seriousness. You are not likely to value process for its own sake. You are more likely to value it when it protects delivery, reduces waste, clarifies accountability, and makes progress measurable. This combination can make you decisive and useful in performance-critical settings. The risk is that the pressure to produce visible progress can shorten the time available for listening, alignment, and repair.|core|2
leadership-approach|drivers|results_process|vision|supporting_context|driver_supporting_context|Vision sits behind the pattern as a supporting layer. It gives the work a reason to matter beyond immediate control. At its best, this means you can connect disciplined execution to a wider destination, helping others see that structure is not bureaucracy but a route towards something more valuable. If Vision remains only lightly expressed, however, people may understand the plan without fully understanding the purpose it serves.|supporting|3
leadership-approach|drivers|results_process|people|range_limitation|driver_range_limitation|People is the weaker range in this result. That does not mean people are unimportant to you. It means the relational signal is less likely to lead the pattern when pressure rises. You may notice commitment, confidence, resistance, fatigue, or trust after the work system has already been defined. The practical consequence is that human readiness may need to be brought into the process earlier, not treated as a later communication task.|material_underplay|4
```

### D. `SINGLE_DOMAIN_PAIR`

```text
domain_key|section_key|pair_key|pair_label|interaction_claim|synergy_claim|tension_claim|pair_outcome
leadership-approach|pair|results_process|Results and Process|The Results and Process pairing creates a leadership pattern centred on disciplined delivery. Process gives the pattern its architecture. Results gives it its demand for progress. Together, they can create a leader who brings seriousness, structure, and follow-through to work that might otherwise remain vague. You are likely to be useful when a group needs a plan that can be executed, a standard that can be defended, and a route from intention to measurable outcome.|The strength of this pairing is that it can convert complexity into movement without losing control of the details. It helps teams know what matters, what is expected, and what must happen next. In commercial or operational settings, that can be a substantial advantage.|The tension is that the same pairing can make leadership feel narrower than the situation requires. Results can press for closure while Process presses for control. If People is not deliberately included, the pattern may produce compliance before commitment, or agreement before genuine ownership. The work may move forward, but the level of trust behind that movement may vary.|The most complete version of this pairing uses structure to create confidence, not simply to govern activity. It treats relational understanding as part of execution quality, because a plan that people do not trust will eventually create its own friction.
```

### E. `SINGLE_DOMAIN_LIMITATION`

```text
domain_key|section_key|pair_key|limitation_label|pattern_cost|range_narrowing|weaker_signal_key|weaker_signal_link
leadership-approach|limitation|results_process|When structure outruns commitment|The cost of this pattern is not a lack of ambition or discipline. The cost is a possible narrowing of the leadership field. When Process and Results dominate, the work can become the clearest object of attention. Plans, standards, timelines, risks, and outcomes may receive more leadership energy than the signals coming from the people who must carry the work. This can make the pattern highly effective in the short term, especially when the route is clear and the team already has confidence in the direction.|The limitation appears when the situation requires emotional calibration, relational repair, or a more patient reading of stakeholder appetite. In those moments, a stronger operating system will not always solve the underlying leadership problem. It may even increase resistance if people feel the system is being tightened before their concerns have been understood.|people|The People signal is therefore the missing range to develop around this result. The practical question is not whether to become less structured or less outcome-focused. It is whether your structure is carrying enough human intelligence. A stronger range would ask: who needs to be heard before the plan hardens, where confidence is thin, what informal resistance is forming, and what would make ownership feel real rather than merely assigned.
```

### F. `SINGLE_DOMAIN_APPLICATION`

These rows are slot-safe for the seeded runtime selection. Runtime selection uses statement slot 1 for the first selected signal in each application group and statement slot 2 for later selected signals. For that reason, `results`, `vision`, and `people` include second-slot rows where the seeded result is expected to read the second statement.

```text
domain_key|section_key|pair_key|focus_area|guidance_type|signal_key|guidance_text|linked_claim_type|priority
leadership-approach|application|results_process|rely_on|applied_strength|process|Rely on your ability to turn uncertainty into a workable operating path. Use process to make standards visible, responsibilities explicit, and progress easier to inspect. This is a genuine leadership asset when people need clarity and the work needs discipline.|applied_strength|1
leadership-approach|application|results_process|rely_on|applied_strength|results|Use your results orientation to define what progress needs to prove, but avoid turning every conversation into a delivery test.|applied_strength|1
leadership-approach|application|results_process|rely_on|applied_strength|results|Also rely on your results orientation, but apply it with judgement. Let the demand for progress sharpen priorities without allowing it to compress every conversation into an execution question. Some delays are performance problems. Others are information about confidence, trust, or readiness.|applied_strength|2
leadership-approach|application|results_process|rely_on|applied_strength|vision|Use Vision to keep disciplined work connected to a wider destination, especially when the operating detail could otherwise dominate the room.|applied_strength|1
leadership-approach|application|results_process|rely_on|applied_strength|vision|Use Vision more deliberately as the bridge between discipline and meaning. When people understand why the structure matters, they are more likely to experience it as enabling rather than controlling. Make the destination clear enough that the process feels connected to purpose, not only to compliance.|applied_strength|2
leadership-approach|application|results_process|notice|watchout|process|Notice when the system is becoming clearer faster than people are becoming ready. Strong process is most useful when it includes the human conditions that will carry it.|watchout|1
leadership-approach|application|results_process|notice|watchout|results|Notice when the pressure for visible progress starts narrowing the questions being asked. Useful delay may be telling you something about confidence, trust, or readiness.|watchout|1
leadership-approach|application|results_process|notice|watchout|results|Notice when results pressure is compressing the conversation too early. The work may be moving, but the level of ownership behind that movement may still be thin.|watchout|2
leadership-approach|application|results_process|notice|watchout|people|Notice weak commitment signals before they become execution friction. Low energy, formal agreement, or quiet compliance may mean the missing work is relational rather than procedural.|watchout|1
leadership-approach|application|results_process|notice|watchout|people|Notice the moments when People is being treated as a downstream concern. If the plan is clear but energy is low, if agreement sounds formal but not owned, or if stakeholders comply without contributing, the missing work is probably relational rather than procedural.|watchout|2
leadership-approach|application|results_process|develop|development_focus|people|Develop the habit of bringing human readiness into the first version of the plan. Before locking the route, ask who is carrying the cost, who has not yet trusted the direction, and what conversations would make execution more durable. This does not weaken your Process and Results pattern. It makes it more commercially reliable, because leadership that earns commitment usually travels further than leadership that only secures completion.|development_focus|1
leadership-approach|application|results_process|develop|development_focus|vision|Develop the discipline of stating the purpose behind the process before people start debating the process itself.|development_focus|1
leadership-approach|application|results_process|develop|development_focus|vision|Develop Vision as an active communication bridge. Use it to show why the structure matters, what it enables, and how the immediate work connects to a broader leadership intent.|development_focus|2
leadership-approach|application|results_process|develop|development_focus|results|Develop a sharper distinction between urgency that helps and urgency that narrows the room. The strongest result focus still leaves space for the information that protects long-term delivery.|development_focus|1
leadership-approach|application|results_process|develop|development_focus|results|Develop your ability to hold outcome pressure while still testing commitment. Before escalating pace, ask whether the team understands the goal, trusts the route, and has the conditions needed to own the work.|development_focus|2
```

## 4. Import order

Recommended import order:

1. Intro
2. Hero
3. Drivers
4. Pair
5. Limitation
6. Application

## 5. Validation plan

1. Open the admin single-domain language builder for the Leadership assessment version.
2. Confirm the current authored domain key is `leadership-approach` and that the current signals include `process`, `results`, `vision`, and `people`.
3. Paste each code block into its matching section import panel, including the header row.
4. Import in the order listed above so the domain frame, pair-owned sections, signal drivers, and application rows become available for the preview.
5. Review the builder preview for the locked section order: intro, hero, drivers, pair, limitation, application.
6. Check that the weaker People thread appears in Drivers, Limitation, and Application without repeating the same wording.
7. Confirm the preview preserves the `results_process` pair-owned sections without reporting pair-key order errors.

Local validation commands:

```powershell
npm run lint
node --test -r tsx tests/single-domain-import-parsers.test.ts tests/single-domain-import-validators.test.ts
```

Generated-row validation outcome:

- All six generated code blocks parse successfully with `parseSingleDomainImportInput`.
- All six generated code blocks validate successfully when checked against the seeded Leadership context: domain `leadership-approach`, signals `results`, `process`, `vision`, and `people`.
- Pair-owned datasets no longer fail because of `results_process` pair-key order.

## 6. Risks / assumptions

- `domain_key` is taken from the seeded result trace as `leadership-approach`.
- `results_process` is preserved because it is the seeded result pair key and the requested target pair key.
- `process_results` is a compatibility alias for validation/import, but the single-domain import path normalises aliases to the runtime-derived key before storage.
- Application uses 15 rows rather than only 9 visible selection targets so later-selected signals have populated second statement slots.
- The application row priorities are positive integer strings and are scoped per signal/focus/guidance grouping.
- The rows avoid pipe characters inside cell text because the parser splits only on `|`.
- These rows prepare import content only. They do not guarantee runtime rendering until imported into the correct assessment version and used to complete or rebuild a result.

## 7. No-change confirmation

This file does not change:

- App report language.
- Builder-linked language.
- Database rows.
- Seed data.
- Engine logic.
- Composer logic.
- Scoring.
- Persistence.
- Result payload.
- UI components.
