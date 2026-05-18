# Decision Style Section Label Map

## 1. Purpose

This document defines the Decision Style visible section labels and section-writing contract for future report-first canonical reports.

It sets the authoring contract for how section labels and titles are authored, carried through template payloads, and rendered for readers.

Key contract points:

- Labels are authoring/template content, not scoring or engine logic.
- Labels should flow from `06_Report_Templates.report_body_json` / imported template JSON into the persisted canonical result payload.
- The report-first renderer should display payload/template labels where present.
- Default report-first labels remain fallback behavior for older/current payloads that do not provide custom labels.

## 2. Current Renderer Capability

Based on RFA-07B behavior and tests, the report-first renderer currently supports payload-first section label resolution for report body navigation:

1. payload/template `label`
2. known default report-first fallback label
3. payload/template `title`
4. generic fallback

Current guardrails and limits:

- Default labels preserve current Leadership/default output behavior.
- Stable section ids/anchors remain separate from visible labels.
- Reading rail and mobile navigation should use resolved labels.
- Decision Style-style custom labels are already validated by tests.
- This should not be treated as a full typed canonical `sections[]` contract rollout; this document is an authoring contract for upcoming Decision Style reports.

## 3. Stable Section Ids and Decision Style Labels

Decision Style should keep existing stable ids/anchors used by the report-first renderer and section tracking.

### Decision Style section label map (stable ids preserved)

| Order | Stable section id | Decision Style visible label | Decision Style section title | Internal authoring purpose |
| --- | --- | --- | --- | --- |
| 04 | `key-insight` | Key insight | Your decision pattern in one line | Recognise the ranked decision pattern clearly and briefly |
| 05 | `value` | Decision value | The value your judgement pattern creates | Explain how the pattern improves workplace decision quality |
| 06 | `others` | Others’ experience | How others experience your judgement | Explain how the reader’s decision process lands with others |
| 07 | `decisions` | Decision mechanics | How you move from uncertainty to commitment | Explain the actual ranked decision sequence |
| 08 | `communication` | Explaining the decision | How you explain and socialise decisions | Explain how the reader communicates rationale and trade-offs |
| 09 | `pressure` | Judgement under pressure | How pressure changes your decision pattern | Explain what intensifies, narrows, or gets skipped under pressure |
| 10 | `strengths` | Decision strengths | What this pattern reliably gives you | Explain the useful strengths created by the ranked pattern |
| 11 | `tightening` | Decision tightening | Where this pattern can narrow | Explain overuse, late checks, and neglected perspectives |
| 12 | `rank-3-expansion` | Wider perspective | How other perspectives improve the decision | Explain how other people can widen the decision field |
| 13 | `rank-4-expansion` | Decision range | Where to use, stretch, or adapt this pattern | Explain contexts where the pattern works and where range is needed |
| 14 | `development-focus` | Development | How to mature your decision pattern | Give pattern-specific growth actions |
| 15 | `closing` | Closing | Your decision style in mature form | Integrate the pattern into a final usable standards |

### Renderer-id note

The current renderer/test contract uses `rank-3-expansion` and `rank-4-expansion` stable ids (not `people-expansion`) and `development-focus` (not `development`). Decision Style authoring should align to these stable ids until an explicit anchor migration task is approved.

## 4. Label Standardss

Decision Style labels should follow these standardss:

- Keep labels concise enough for premium reading rail/mobile nav.
- Keep labels decision-specific without gimmicky phrasing.
- Make labels describe the reader-facing value of each section.
- Avoid generic personality-test vocabulary.
- Avoid Leadership-specific wording unless it remains directly useful.
- Do not imply score, type, archetype, or threshold in public labels.
- Keep labels stable across all 24 reports unless a clear approved exception exists.
- Keep tone suitable for senior professional readers.

## 5. Public Label vs Section Title vs Internal Authoring Purpose

Use three distinct fields:

- `label`: short visible reading rail / section label.
- `title`: fuller section heading if supported by payload/template and presentation layout.
- `authoringPurpose`: writer-facing guidance; not required to render.

Example:

```json
{
  "id": "decisions",
  "order": 7,
  "label": "Decision mechanics",
  "title": "How you move from uncertainty to commitment",
  "authoringPurpose": "Explain the ranked signal sequence as a decision process."
}
```

Implementation must not depend on `authoringPurpose` being visible in the reader UI.

## 6. Expected `report_body_json` Shape

Decision Style sections should be authored/imported in a practical report-first shape compatible with existing payload-driven labeling.

```json
{
  "contract": "report_first_canonical_payload_v1",
  "sections": [
    {
      "id": "key-insight",
      "order": 4,
      "label": "Key insight",
      "title": "Your decision pattern in one line",
      "blocks": []
    },
    {
      "id": "value",
      "order": 5,
      "label": "Decision value",
      "title": "The value your judgement pattern creates",
      "blocks": []
    },
    {
      "id": "decisions",
      "order": 7,
      "label": "Decision mechanics",
      "title": "How you move from uncertainty to commitment",
      "blocks": []
    }
  ]
}
```

Contract note:

- This is the authoring/import target shape for Decision Style section metadata.
- Exact compiler/import mapping implementation can be handled in later tasks.
- Renderer should consume `label` (and fallback chain) from payload/template data where present.
- Old/current payloads remain protected by default fallback labels.

## 7. Section-by-Section Writing Contract

For each section: stable id, visible label, title, writer job, must include, must avoid, signal treatment, and repetition warning.

### 04 — Key insight

- **Stable id:** `key-insight`
- **Label:** Key insight
- **Title:** Your decision pattern in one line
- **Writer job:** Recognise the whole ranked pattern in one concise decision-sequence interpretation.
- **Must include:**
  - rank 1 trust point
  - rank 2 shaping move
  - one concise statement of how the reader moves from uncertainty to commitment
- **Must avoid:**
  - simply saying “you are evidence-led” (or equivalent)
  - generic decision-making advice
- **Signal treatment:** Name signals as a sequence with distinct roles, not as static traits.
- **Repetition warning:** Do not duplicate full mechanics content that belongs in Section 07.

### 05 — Decision value

- **Stable id:** `value`
- **Label:** Decision value
- **Title:** The value your judgement pattern creates
- **Writer job:** Explain the value created by this decision pattern at work.
- **Must include:**
  - decision quality
  - confidence
  - trust or speed where relevant
  - workplace usefulness
- **Must avoid:**
  - drifting into the future Value Creation assessment
  - broad claims about total organisational value
- **Signal treatment:** Tie value claims directly to ranked signal behavior.
- **Repetition warning:** Avoid repeating “key insight” language.

### 06 — Others’ experience

- **Stable id:** `others`
- **Label:** Others’ experience
- **Title:** How others experience your judgement
- **Writer job:** Explain how other people experience the reader’s judgement process.
- **Must include:**
  - what others trust
  - what others may find opaque, slow, rigid, or too quick
  - how the reader can make judgement easier to work with
- **Must avoid:**
  - turning into a general relationship section
  - duplicating Communication Style
- **Signal treatment:** Show observable interpersonal effects of decision sequencing.
- **Repetition warning:** Keep this distinct from Section 08 (communication moves).

### 07 — Decision mechanics

- **Stable id:** `decisions`
- **Label:** Decision mechanics
- **Title:** How you move from uncertainty to commitment
- **Writer job:** Explain the precise ranked decision sequence.
- **Must include:**
  - what rank 1 does first
  - what rank 2 adds
  - what rank 3 checks
  - what rank 4 may underuse or delay
  - how the reader moves toward commitment
- **Must avoid:**
  - repeating Section 04 wording
  - generic decision theory
- **Signal treatment:** Make sequence and handoffs explicit.
- **Repetition warning:** This is the detailed sequence section; keep other sections shorter.

### 08 — Explaining the decision

- **Stable id:** `communication`
- **Label:** Explaining the decision
- **Title:** How you explain and socialise decisions
- **Writer job:** Explain how the reader communicates rationale, trade-offs, and commitment around decisions.
- **Must include:**
  - how the reader explains “why this option”
  - how disagreement is handled
  - what needs to be made visible to others
- **Must avoid:**
  - becoming a full Communication Style report
- **Signal treatment:** Translate signal order into explanation style.
- **Repetition warning:** Don’t restate Section 06 social effects without communication mechanics.

### 09 — Judgement under pressure

- **Stable id:** `pressure`
- **Label:** Judgement under pressure
- **Title:** How pressure changes your decision pattern
- **Writer job:** Explain how pressure changes the reader’s decision pattern.
- **Must include:**
  - what intensifies
  - what gets skipped
  - where the pattern is useful
  - where it narrows
- **Must avoid:**
  - becoming a general stress/resilience report
  - duplicating Pressure Pattern
- **Signal treatment:** Describe pressure-shift in sequence, not personality diagnosis.
- **Repetition warning:** Keep pressure-specific material out of baseline sections.

### 10 — Decision strengths

- **Stable id:** `strengths`
- **Label:** Decision strengths
- **Title:** What this pattern reliably gives you
- **Writer job:** Name strengths created by this ranked decision pattern.
- **Must include:**
  - rank 1 strength
  - rank 2 supporting strength
  - rank 3 balancing strength
  - rank 4 latent/underused strength where relevant
- **Must avoid:**
  - generic praise
  - trait flattery
- **Signal treatment:** Frame strengths as process outcomes.
- **Repetition warning:** Avoid copy-pasting wording from Section 05.

### 11 — Decision tightening

- **Stable id:** `tightening`
- **Label:** Decision tightening
- **Title:** Where this pattern can narrow
- **Writer job:** Explain where the decision pattern can narrow.
- **Must include:**
  - overuse of rank 1
  - rank 2 distortion
  - late rank 3 check
  - underuse of rank 4
  - contexts where this matters
- **Must avoid:**
  - moralising
  - making Judgement sound irrational
  - making Standards sound superior or rigid by default
  - making Practicality sound shallow
  - making Evidence sound cold
- **Signal treatment:** Keep balanced, non-caricature language.
- **Repetition warning:** Keep this section distinct from Section 09 (pressure changes).

### 12 — Wider perspective

- **Stable id:** `rank-3-expansion`
- **Label:** Wider perspective
- **Title:** How other perspectives improve the decision
- **Writer job:** Explain how other perspectives can improve the decision field.
- **Must include:**
  - who/which perspective to invite
  - which lower-ranked signal others may supply
  - how wider input improves decision quality
- **Must avoid:**
  - Leadership-specific “people expansion” framing
  - generic collaboration advice
- **Signal treatment:** Link invited perspective to missing/lower-ranked signal coverage.
- **Repetition warning:** Avoid duplicating Section 13 adaptation contexts.

### 13 — Decision range

- **Stable id:** `rank-4-expansion`
- **Label:** Decision range
- **Title:** Where to use, stretch, or adapt this pattern
- **Writer job:** Explain where the pattern works best and where adaptation is needed.
- **Must include:**
  - high-data / low-data contexts
  - urgent / slow contexts
  - ethical / commercial contexts
  - reversible / irreversible decisions
  - when to borrow lower-ranked signals
- **Must avoid:**
  - generic flexibility advice
- **Signal treatment:** Define context-shifts and deliberate borrowing moves.
- **Repetition warning:** Keep this focused on context-range, not development plan.

### 14 — Development

- **Stable id:** `development-focus`
- **Label:** Development
- **Title:** How to mature your decision pattern
- **Writer job:** Give pattern-specific actions that mature decision style.
- **Must include:**
  - practical decision habits
  - review questions
  - signal-specific development actions
  - how to improve without becoming someone else
- **Must avoid:**
  - universal tips detached from the pattern
- **Signal treatment:** Convert ranked logic into concrete practices.
- **Repetition warning:** Keep this actionable, not another diagnostic section.

### 15 — Closing

- **Stable id:** `closing`
- **Label:** Closing
- **Title:** Your decision style in mature form
- **Writer job:** Integrate the pattern into a final usable decision standards.
- **Must include:**
  - mature form of the pattern
  - final synthesis
  - memorable closing line
- **Must avoid:**
  - repeating Section 04
  - vague motivational language
- **Signal treatment:** Synthesize all four rank roles into one practical standards.
- **Repetition warning:** Do not restate full sections; close with integration.

## 8. Assessment-Level Consistency Rules

Apply across all 24 Decision Style reports:

- Use the same section label map unless an explicit approved exception exists.
- Keep section order stable.
- Keep stable ids/anchors stable.
- Keep labels short and consistent.
- Report titles and section titles may vary by pattern where useful.
- Body content must remain pattern-specific.
- Avoid repeated section intros across all 24 reports.
- Preserve rank-role logic:
  - rank 1 = first trust point
  - rank 2 = shaping/stabilising/accelerating move
  - rank 3 = balancing check
  - rank 4 = underused perspective

## 9. Signal Language Rules By Section

Use concise, balanced signal language consistently:

- **Evidence:** groundedness, proof, observation, known reality — not cold rationality.
- **Judgement:** experienced judgement, pattern recognition, tacit synthesis — not impulsiveness.
- **Standards:** standards, obligations, defensibility, consistency — not moral superiority.
- **Practicality:** workability, momentum, constraint navigation, implementation fit — not shallow compromise.

Section-level guidance:

- In Section 07 (mechanics), name each signal’s process role in sequence.
- In Sections 10–11 (strengths/tightening), show overuse/underuse dynamics without caricature.
- In Sections 12–13 (wider perspective/range), describe when lower-ranked signals should be deliberately borrowed.
- In Section 14 (development), convert signal language into habits and review prompts.

## 10. Anti-Overlap Rules

Decision Style sections must avoid overlap with adjacent assessments/domains:

- **Leadership Approach:**
  - Decision Style covers judgement sequence quality.
  - It does not cover leadership mobilisation architecture.
- **Pressure Pattern:**
  - “Judgement under pressure” is decision behavior under load, not full pressure behavior profile.
- **Communication Style:**
  - “Explaining the decision” is decision rationale communication, not whole communication identity.
- **Value Creation:**
  - “Decision value” means value from better judgement, not total organisational contribution framing.
- **Performance Rhythm / Flow State:**
  - “Decision range” means context adaptation of judgement sequence, not broad performance energy/flexibility style.

## 11. Recommended Decision Style Section Label Map For Workbook/JSON Authoring

### Table (copy/paste reference)

| order | id | label | title |
| --- | --- | --- | --- |
| 4 | `key-insight` | Key insight | Your decision pattern in one line |
| 5 | `value` | Decision value | The value your judgement pattern creates |
| 6 | `others` | Others’ experience | How others experience your judgement |
| 7 | `decisions` | Decision mechanics | How you move from uncertainty to commitment |
| 8 | `communication` | Explaining the decision | How you explain and socialise decisions |
| 9 | `pressure` | Judgement under pressure | How pressure changes your decision pattern |
| 10 | `strengths` | Decision strengths | What this pattern reliably gives you |
| 11 | `tightening` | Decision tightening | Where this pattern can narrow |
| 12 | `rank-3-expansion` | Wider perspective | How other perspectives improve the decision |
| 13 | `rank-4-expansion` | Decision range | Where to use, stretch, or adapt this pattern |
| 14 | `development-focus` | Development | How to mature your decision pattern |
| 15 | `closing` | Closing | Your decision style in mature form |

### JSON (copy/paste reference)

```json
[
  {
    "order": 4,
    "id": "key-insight",
    "label": "Key insight",
    "title": "Your decision pattern in one line"
  },
  {
    "order": 5,
    "id": "value",
    "label": "Decision value",
    "title": "The value your judgement pattern creates"
  },
  {
    "order": 6,
    "id": "others",
    "label": "Others’ experience",
    "title": "How others experience your judgement"
  },
  {
    "order": 7,
    "id": "decisions",
    "label": "Decision mechanics",
    "title": "How you move from uncertainty to commitment"
  },
  {
    "order": 8,
    "id": "communication",
    "label": "Explaining the decision",
    "title": "How you explain and socialise decisions"
  },
  {
    "order": 9,
    "id": "pressure",
    "label": "Judgement under pressure",
    "title": "How pressure changes your decision pattern"
  },
  {
    "order": 10,
    "id": "strengths",
    "label": "Decision strengths",
    "title": "What this pattern reliably gives you"
  },
  {
    "order": 11,
    "id": "tightening",
    "label": "Decision tightening",
    "title": "Where this pattern can narrow"
  },
  {
    "order": 12,
    "id": "rank-3-expansion",
    "label": "Wider perspective",
    "title": "How other perspectives improve the decision"
  },
  {
    "order": 13,
    "id": "rank-4-expansion",
    "label": "Decision range",
    "title": "Where to use, stretch, or adapt this pattern"
  },
  {
    "order": 14,
    "id": "development-focus",
    "label": "Development",
    "title": "How to mature your decision pattern"
  },
  {
    "order": 15,
    "id": "closing",
    "label": "Closing",
    "title": "Your decision style in mature form"
  }
]
```

## 12. Implementation Notes For Future RFA Tasks

- RFA-08 / question-writing tasks should not change this section label map.
- Decision Style report drafting tasks should use this map across all 24 reports.
- The eventual Decision Style workbook should include these labels in `06_Report_Templates.report_body_json`.
- If helper columns are added later, they should compile into `report_body_json`.
- Renderer code should not hard-code Decision Style labels.
- Full canonical `sections[]` typing can be considered later and is out of scope for this task.

## 13. Open Questions

1. Should Decision Style use “Others’ experience” or “Stakeholder experience” as the public label for section 06?
2. Should “Wider perspective” fully replace prior people-expansion language for Decision Style only?
3. Should “Development” stay short or become “Decision development” for extra specificity?
4. Should public labels be identical across all 24 reports, or can rare pattern-level exceptions exist under governance?
5. Should section `title` fields be rendered visibly where current component usage is mainly label-first?
6. Should the eventual workbook keep labels only in `report_body_json`, or also maintain helper columns that compile into it?

## 14. Recommended Next Task

**RFA-08 — Create Decision Style question and scoring draft**

RFA-08 should create:

- 24 Decision Style questions
- A-D options (or equivalent)
- deterministic option-signal weights
- signal coverage checks
- initial QA cases
- package source files or draft workbook rows as appropriate

Do not write the 24 full reports until question/scoring architecture is validated.
