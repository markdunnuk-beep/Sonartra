# Decision Style Question and Scoring Draft

## 1. Purpose
Create a clean, package-ready draft of Decision Style question and scoring inputs for report-first fully authored delivery.

## 2. Assessment Identity
- assessment_key: `decision-style`
- assessment_title: `Decision Style`
- domain_key: `decision_style`
- model_key: `report_first_fully_authored_ranked_pattern_v1`
- report_contract: `report_first_canonical_payload_v1`
- status: `draft`

## 3. Signal Model
Signals are evidence, instinct, principle, and pragmatism. Distinction rule: known facts, experienced judgement, standards/obligations, and workable execution respectively.

## 4. Question Design Strategy
RFA-09 updated the 24 questions to role-neutral workplace prompts so the draft resonates across roles, functions, seniority levels, and industries while preserving one option per signal per question.

## 5. Option Design Rules
Options were revised in RFA-09 to role-neutral A–D responses, remain behaviour-first, and are balanced for maturity to reduce social desirability bias without changing the scoring model.

## 6. Scoring Model
Deterministic primary mapping: each selected option contributes `1` to one primary signal via `04-option-weights.psv`; no thresholds, archetypes, overlays, or variant dimensions are introduced.

## 7. Signal Coverage Summary
Each signal appears exactly once per question and 24 times overall across the 96 options, producing equal scoring opportunity.

## 8. Option Letter Rotation Summary
Letter-to-signal mapping rotates in a 4-question cycle (E-I-P-Pg, I-P-Pg-E, P-Pg-E-I, Pg-E-I-P) repeated across q01–q24 to avoid positional advantage.

## 9. Ranked Pattern Coverage
All 24 permutations of the four signals are present in `05-ranked-patterns.psv` with deterministic `pattern_key` formatting.

## 10. QA Cases
Eight QA cases are included (two led by each signal) with plausible normalized preview values and explicit note that values are not thresholds.

## 11. Quality Risks and Mitigations
- Risk: subtle option wording may still cue signal. Mitigation: editorial blind review in RFA-09.
- Risk: repeated phrasing drift. Mitigation: line edit pass for lexical variety while retaining behavioural clarity.
- Risk: overfitting to draft wording. Mitigation: pilot read-through before workbook generation/import.

## 12. Open Questions
- Should draft status remain through initial workbook QA import, or shift selected rows to active in a staged publish checklist?
- Should helper_text vary by question theme or remain constant for response consistency?

## 13. Recommended Next Task
RFA-10 — Generate clean Decision Style workbook draft.
