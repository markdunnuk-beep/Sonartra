# Decision Style Evidence-Led Batch Audit

## 1. Purpose

This audit reviews the Evidence-led Decision Style report family after RFA-17A and before moving to Judgement-led drafting.

This is audit-only. It does not edit reports, approve workbook compilation, populate `06_Report_Templates.report_body_json`, or change renderer, runtime, importer, compiler, scoring, database, or production data.

The aim is to decide whether the Evidence-led batch is strong enough to proceed to RFA-17B and what should be learned before drafting the next signal-led family.

## 2. Reports Audited

| pattern_key | title | rank order | source file | word count | status |
| --- | --- | --- | --- | ---: | --- |
| `evidence_judgement_standards_practicality` | The Evidence-and-Experience Decision Maker | Evidence > Judgement > Standards > Practicality | `content/authoring/decision-style/report-first/evidence_judgement_standards_practicality.md` | 2152 | canonical_draft |
| `evidence_judgement_practicality_standards` | The Evidence-and-Read Decision Maker | Evidence > Judgement > Practicality > Standards | `content/authoring/decision-style/report-first/evidence_judgement_practicality_standards.md` | 2102 | canonical_draft |
| `evidence_standards_judgement_practicality` | The Responsible Evidence Decision Maker | Evidence > Standards > Judgement > Practicality | `content/authoring/decision-style/report-first/evidence_standards_judgement_practicality.md` | 2046 | canonical_draft |
| `evidence_standards_practicality_judgement` | The Evidence-and-Responsibility Decider | Evidence > Standards > Practicality > Judgement | `content/authoring/decision-style/report-first/evidence_standards_practicality_judgement.md` | 2079 | canonical_draft |
| `evidence_practicality_judgement_standards` | The Practical Evidence Decision Maker | Evidence > Practicality > Judgement > Standards | `content/authoring/decision-style/report-first/evidence_practicality_judgement_standards.md` | 2072 | canonical_draft |
| `evidence_practicality_standards_judgement` | The Evidence-First Decision Maker | Evidence > Practicality > Standards > Judgement | `content/authoring/decision-style/report-first/evidence_practicality_standards_judgement.md` | 2537 | benchmark_draft |

## 3. Executive Verdict

- overall Evidence-led batch score: 8.8/10
- plain-language consistency score: 9.1/10
- pattern differentiation score: 8.6/10
- title system score: 8.1/10
- readiness to proceed to Judgement-led batch: proceed
- Evidence-led polish required before RFA-17B: no

Verdict: strong batch, minor polish recommended later.

The Evidence-led family is ready to use as the working model for RFA-17B. The batch preserves the approved plain-language style, keeps the Evidence-led psychology clear, and differentiates the six rank sequences well enough to proceed.

The main improvement area is not structural. It is title system refinement and selective prose polish after more families exist. The batch should not be polished before Judgement-led drafting unless the product owner wants title finalisation now.

## 4. Batch-Level Strengths

Plain-language readability is the strongest batch-level asset. The reports are direct, practical, and reader-facing. They avoid the older over-authored style and do not rely on abstract phrases to sound premium.

The shared Evidence-led psychology is consistent. All six reports make clear that the reader starts by asking what is known, what can be checked, and what the facts support.

The role-neutral examples work. They use broad workplace situations such as service problems, process changes, policy changes, deadlines, and new processes. They are not tied to sales, product, board-level, or senior-only contexts.

Section structure is preserved. The reports use the same section headings and stable IDs, and the batch test confirms the required metadata and sections.

Development actions are practical. They tend to give clear review questions and simple behaviour changes rather than generic self-improvement advice.

The batch avoids most abstract authoring language. The reports generally use plain terms such as facts, experience, responsibility, practical option, what can be done, and what people need to understand.

## 5. Batch-Level Risks

The biggest risk is similarity. Evidence-led reports naturally start from the same place, and several sections open with variations of "You usually start with facts." This is accurate, but future polish should vary the first paragraphs more.

Title duplication or near-duplication is the clearest batch issue. "The Responsible Evidence Decision Maker" and "The Practical Evidence Decision Maker" are clear but close to other current or future titles. "The Evidence-and-Read Decision Maker" is understandable in context but weaker than the others.

Rank 4 is mostly framed as quieter rather than missing. That is good. A few passages still lean toward "late" framing and should be balanced later with the active usefulness of the rank 4 signal.

Examples are useful but could become formulaic if repeated across future batches. Most examples use the pattern "a team needs to..." and then walk through the signals. This is acceptable here, but RFA-17B should vary example shape.

Section 10 Strengths is the section most likely to become generic across reports. The current sections are serviceable, but future batches should make each strength more specific to rank order.

Section 15 Closing is clear but somewhat similar across the five new reports. This can wait until the all-report audit.

Evidence-led reports do not become too cold or analytical. The batch consistently brings in experience, responsibility, or action according to rank order.

Practicality, Standards, and Judgement generally receive distinct treatment. The strongest distinctions appear in the mechanics, pressure, and development sections. The weakest distinctions appear in titles and closing lines.

## 6. Individual Report Audits

### evidence_judgement_standards_practicality — The Evidence-and-Experience Decision Maker

- rank_order: Evidence > Judgement > Standards > Practicality
- source_file: `content/authoring/decision-style/report-first/evidence_judgement_standards_practicality.md`
- overall_score: 8.9/10
- pattern_accuracy_score: 9.1/10
- plain_language_score: 9.0/10
- differentiation_score: 8.8/10
- title_score: 8.8/10
- strongest_sections: Key insight, Decision mechanics, Judgement under pressure, Development
- weakest_sections: Closing, Decision strengths
- what_works: The report clearly shows Evidence first, Judgement second, Standards third, and Practicality fourth. It makes the reader feel thoughtful rather than slow. The practical next-step risk is visible without making Practicality sound like a defect.
- what_needs_attention: Practicality could have slightly more positive energy in a later polish pass. The report sometimes frames action mainly as what arrives late rather than as the signal that makes careful thinking usable.
- title_verdict: Strong provisional title. It is clear, reader-facing, and not too abstract.
- example_quality: Good. The service-problem example demonstrates facts, similar situations, fairness, and operational next step in the right order.
- recommendation: approve with minor polish later

### evidence_judgement_practicality_standards — The Evidence-and-Read Decision Maker

- rank_order: Evidence > Judgement > Practicality > Standards
- source_file: `content/authoring/decision-style/report-first/evidence_judgement_practicality_standards.md`
- overall_score: 8.6/10
- pattern_accuracy_score: 8.9/10
- plain_language_score: 9.0/10
- differentiation_score: 8.5/10
- title_score: 7.6/10
- strongest_sections: Key insight, Explaining the decision, Decision tightening, Development
- weakest_sections: Title, Closing
- what_works: Standards comes through clearly as rank 4, especially in the tightening and development sections. The report stays distinct from `evidence_judgement_standards_practicality` by moving from Judgement into Practicality before responsibility is fully checked.
- what_needs_attention: "Read" is understandable inside the report but weaker as a standalone title term. It may not be clear enough in a card, dashboard, or report selector. Consider a title that says experience more plainly.
- title_verdict: Provisional only. Recommended alternatives: "The Evidence-and-Experience Practicalist" or "The Evidence-to-Action Reader." The latter still has "reader" ambiguity, so the first is clearer if acceptable.
- example_quality: Good. The process-change example shows mixed feedback, similar changes, practical adjustment, and then fairness.
- recommendation: approve with minor polish later

### evidence_standards_judgement_practicality — The Responsible Evidence Decision Maker

- rank_order: Evidence > Standards > Judgement > Practicality
- source_file: `content/authoring/decision-style/report-first/evidence_standards_judgement_practicality.md`
- overall_score: 8.5/10
- pattern_accuracy_score: 8.9/10
- plain_language_score: 8.8/10
- differentiation_score: 8.4/10
- title_score: 7.9/10
- strongest_sections: Decision value, Explaining the decision, Decision tightening, Decision range
- weakest_sections: Title, Opening
- what_works: Standards clearly comes second. Judgement also comes before Practicality, and the report repeatedly names the risk that action arrives late. Responsibility is framed as trust, consistency, and what can be stood behind rather than bureaucracy.
- what_needs_attention: The title is clear but may blur with future Standards-led titles and with `standards_evidence_practicality_judgement`. The report could also use slightly more energy around the value of Judgement as the third signal.
- title_verdict: Needs review before final 24-report title lock. It is acceptable for draft, but likely not final.
- example_quality: Good. The policy-change example fits the rank sequence and stays role-neutral.
- recommendation: approve with minor polish later

### evidence_standards_practicality_judgement — The Evidence-and-Responsibility Decider

- rank_order: Evidence > Standards > Practicality > Judgement
- source_file: `content/authoring/decision-style/report-first/evidence_standards_practicality_judgement.md`
- overall_score: 8.8/10
- pattern_accuracy_score: 9.1/10
- plain_language_score: 9.0/10
- differentiation_score: 8.7/10
- title_score: 8.4/10
- strongest_sections: Key insight, Others' experience, Explaining the decision, Wider perspective
- weakest_sections: Closing
- what_works: Practicality clearly comes before Judgement. The report stays distinct from `evidence_standards_judgement_practicality` because it shows action emerging after the responsibility check, with experience as the later signal. Judgement feels useful even as rank 4.
- what_needs_attention: The title is clear but uses "Decider" while most others use "Decision Maker." Normalise later if the title system moves to one convention.
- title_verdict: Good provisional title. Keep unless title-system normalisation requires "Decision Maker."
- example_quality: Strong. The deadline-change example makes the Standards > Practicality > Judgement difference easy to see.
- recommendation: approve as-is

### evidence_practicality_judgement_standards — The Practical Evidence Decision Maker

- rank_order: Evidence > Practicality > Judgement > Standards
- source_file: `content/authoring/decision-style/report-first/evidence_practicality_judgement_standards.md`
- overall_score: 8.7/10
- pattern_accuracy_score: 9.0/10
- plain_language_score: 8.9/10
- differentiation_score: 8.5/10
- title_score: 8.2/10
- strongest_sections: Decision value, Decision mechanics, Judgement under pressure, Decision tightening
- weakest_sections: Title, Closing
- what_works: The report stays distinct from the benchmark by making Judgement the third signal before Standards. It shows that after a practical option appears, the reader tests likely effect through experience before checking responsibility.
- what_needs_attention: Because this is closest to the benchmark, the full report may need a later differentiation polish. Standards is present and accurately rank 4, but it should remain strong enough that the report does not imply fairness is an afterthought.
- title_verdict: Clear but close to the benchmark and to future Practicality-led titles. Accept for draft; review in title lock.
- example_quality: Good. The new-process example is broad and shows facts, option, response, and fairness.
- recommendation: approve with minor polish later

### evidence_practicality_standards_judgement — The Evidence-First Decision Maker

- rank_order: Evidence > Practicality > Standards > Judgement
- source_file: `content/authoring/decision-style/report-first/evidence_practicality_standards_judgement.md`
- overall_score: 9.2/10
- pattern_accuracy_score: 9.2/10
- plain_language_score: 9.4/10
- differentiation_score: 9.0/10
- title_score: 9.2/10
- strongest_sections: Opening, Decision value, Decision mechanics, Explaining the decision, Development
- weakest_sections: Closing is effective but not the most distinctive section
- what_works: It still holds as the strongest anchor after seeing the full Evidence-led family. The title is plain and clear. The role-neutral priority example remains the strongest example model.
- what_needs_attention: No required polish before proceeding. After all 24 reports exist, it may need only title/status alignment and very light closing review.
- title_verdict: Keep. It remains the right benchmark title.
- example_quality: Excellent. The two-priority example should remain the model for future role-neutral examples.
- recommendation: approve as-is

## 7. Title System Audit

Titles reviewed:

- The Evidence-and-Experience Decision Maker
- The Evidence-and-Read Decision Maker
- The Responsible Evidence Decision Maker
- The Evidence-and-Responsibility Decider
- The Practical Evidence Decision Maker
- The Evidence-First Decision Maker

Findings:

- The titles are generally clear, decision-specific, and plain.
- "The Evidence-First Decision Maker" remains the strongest title.
- "The Evidence-and-Experience Decision Maker" is clear and useful.
- "The Evidence-and-Read Decision Maker" is the weakest title because "Read" may be less understandable outside the report body.
- "The Responsible Evidence Decision Maker" is clear but likely to blur with Standards-led titles.
- "The Evidence-and-Responsibility Decider" is clear, but "Decider" creates convention inconsistency.
- "The Practical Evidence Decision Maker" is clear but may blur with Practicality-led titles later.

Recommended provisional title changes:

- `evidence_judgement_practicality_standards`: consider replacing "The Evidence-and-Read Decision Maker" with "The Evidence-and-Experience Practicalist" or another clearer title that preserves Evidence > Judgement > Practicality.
- `evidence_standards_judgement_practicality`: review "The Responsible Evidence Decision Maker" during title lock to avoid overlap with Standards-led reports.
- Decide later whether title endings should standardise on "Decision Maker" or allow "Decider."

Do not rename files or edit reports in this task.

## 8. Pattern Differentiation Matrix

| pattern_key | rank_2_focus | rank_3_focus | rank_4_risk | one-line distinction | likely confusion risk |
| --- | --- | --- | --- | --- | --- |
| `evidence_judgement_standards_practicality` | Experience interprets facts | Responsibility tests the experienced read | Practical next step arrives late | Facts are interpreted through experience before responsibility and action | May blur with `evidence_judgement_practicality_standards` |
| `evidence_judgement_practicality_standards` | Experience interprets facts | Action follows the experienced read | Responsibility arrives late | Facts and experience move into action before Standards fully checks the choice | May blur with `evidence_judgement_standards_practicality` and `evidence_practicality_judgement_standards` |
| `evidence_standards_judgement_practicality` | Responsibility checks facts | Experience reads consequences | Practicality arrives late | Facts are checked by responsibility before experience and action | May blur with `evidence_standards_practicality_judgement` |
| `evidence_standards_practicality_judgement` | Responsibility checks facts | Action follows the responsibility check | Experience stays quiet late | Facts and responsibility lead to a practical answer before professional read is named | May blur with benchmark and with `evidence_standards_judgement_practicality` |
| `evidence_practicality_judgement_standards` | Action follows facts | Experience tests the practical answer | Responsibility arrives late | Facts become action, then experience tests likely effect before Standards | Highest blur risk with benchmark |
| `evidence_practicality_standards_judgement` | Action follows facts | Responsibility checks the practical answer | Experience stays quiet late | Facts become action, then Standards checks whether the action is responsible | Benchmark anchor; may blur with `evidence_practicality_judgement_standards` |

Pair-specific notes:

- `evidence_judgement_standards_practicality` vs `evidence_judgement_practicality_standards`: the distinction is clear in mechanics; preserve it by keeping Standards-before-action vs action-before-Standards explicit.
- `evidence_standards_judgement_practicality` vs `evidence_standards_practicality_judgement`: clear enough; future polish should make Judgement-before-action vs action-before-Judgement sharper in titles/subtitles.
- `evidence_practicality_judgement_standards` vs `evidence_practicality_standards_judgement`: strongest blur risk; keep "experience tests likely effect" vs "responsibility checks the action" explicit.
- `evidence_standards_practicality_judgement` vs `evidence_practicality_standards_judgement`: distinguish whether responsibility shapes action before the practical option, or checks the practical option after it appears.
- `evidence_judgement_practicality_standards` vs `evidence_practicality_judgement_standards`: distinguish whether experience interprets facts before action, or tests a practical answer after action appears.

## 9. Section Consistency Audit

The Evidence-led batch preserves:

- frontmatter metadata
- correct `pattern_key`
- correct rank keys and labels
- `report_contract: report_first_canonical_payload_v1`
- `status: canonical_draft` for the five new reports
- `status: benchmark_draft` for the approved benchmark report
- all required section headings
- all required section IDs
- Decision Style section label map
- plain-language opening
- at least one role-neutral workplace example per report
- development actions
- no `score_shape` language
- no old signal names as active terms: `instinct`, `principle`, `pragmatism`

The focused test `tests/decision-style-evidence-led-reports.test.ts` covers the five new reports structurally. The benchmark report is separately validated by prior RFA-15 approval and used here as the style anchor.

## 10. Plain-Language Benchmark Compliance

The batch follows the approved plain-language benchmark well.

The reports are readable at the intended level. They use direct sentences, practical workplace terms, and clear cause-and-effect language. They do not sound like theory.

"Decision style" is used as the reader-facing frame more than "pattern." Signal language is present but generally translated into plain meanings: facts, experience, responsibility, and what can be done.

The workplace examples are easy to understand and broad enough for different roles. Development actions are usable and framed as questions the reader could actually ask.

The main compliance watchout is repetition. Future batches should keep the plain style but vary opening rhythms, examples, and closing shapes.

## 11. Evidence-Led Family Rules Extracted

1. Evidence-led openings should not all start the same way. Keep the facts-first idea, but vary the second sentence around the rank 2 signal.
2. Rank 2 must be the differentiator. Judgement-led-second reports should interpret facts; Standards-led-second reports should test responsibility; Practicality-led-second reports should move toward action.
3. Evidence should sound careful and useful, not cold or slow.
4. Rank 4 should be quieter, not defective. Show what the signal adds when brought forward.
5. Examples should be role-neutral but concrete. Use different workplace situations across nearby patterns.
6. Titles should be clear before they are clever. Avoid title terms that need the report body to explain them.
7. Strengths sections need rank-specific capacities, not generic praise.
8. Closings should integrate the specific rank order, not repeat a family-wide Evidence-led summary.
9. Practicality should not be reduced to speed. Standards should not be reduced to caution. Judgement should not be treated as guesswork.
10. The closest pattern pairs need explicit contrast in mechanics, tightening, and development.

## 12. Required Fix List

### Must fix before RFA-17B

No blockers.

### Should fix before full 24-report compilation

- Review the title "The Evidence-and-Read Decision Maker."
- Review "The Responsible Evidence Decision Maker" for possible overlap with Standards-led titles.
- Decide whether to normalise "Decision Maker" vs "Decider."
- Strengthen title differentiation for `evidence_practicality_judgement_standards` vs the benchmark.
- Add light polish to Section 10 Strengths where sections feel generic.
- Add light polish to Section 15 Closing where endings feel too similar.

### Can wait until all-report audit

- Minor opening variation across all Evidence-led reports.
- Fine-tuning role-neutral examples to avoid repeated "team needs to..." patterns.
- Final status alignment for the benchmark once the 24-report set is ready.
- Very light word-count balancing if future batches are materially longer or deeper.

## 13. Final Recommendation

Proceed to RFA-17B, but schedule Evidence-led polish later.

The Evidence-led reports are strong enough to serve as the first completed family. They do not need to be polished before Judgement-led drafting. The next batch should use the same plain-language standard while applying the lessons from this audit: vary openings, keep rank 2 distinct, watch title clarity, and avoid formulaic examples.

## 14. Recommended Next Task

RFA-17B — Draft Judgement-led Decision Style reports

RFA-17B should:

- draft the six Judgement-led canonical reports
- use the approved benchmark style
- learn from Evidence-led batch risks
- preserve section labels and IDs
- not update the workbook yet
- not modify renderer, runtime, importer, or scoring
