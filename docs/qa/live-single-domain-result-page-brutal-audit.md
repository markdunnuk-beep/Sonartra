# Live Single-Domain Result Page Brutal Audit

## Result audited
- URL: `https://www.sonartra.com/app/results/single-domain/8590a274-7264-44e0-8f28-3cfe28fbad2f`
- result_id: `8590a274-7264-44e0-8f28-3cfe28fbad2f`
- assessment_key: `blueprint-understand-how-you-lead`
- date audited: `28 April 2026`

## Executive verdict
- Language source integrity: `PASS`
- UI/UX monetisation score: `6.5/10`
- Language/tone/flow monetisation score: `5.8/10`
- Overall commercial readiness: `6.1/10`

The good news is that the live page is rendering from the persisted single-domain payload, not inventing prose in the UI, and this specific result shows no evidence of fallback narrative, legacy `SIGNAL_CHAPTERS` prose, placeholder copy, or stale prior-build text. The bad news is that the page still does not fully feel like a premium paid behavioural report. The desktop experience is close. The tablet breakpoint is not. The prose is competent but still too often reads like clean internal assessment copy rather than expensive diagnostic writing.

## 1. Language source integrity audit

Audit basis:
- Live browser inspection in Chrome DevTools on the authenticated production route.
- Persisted payload inspection for result `8590a274-7264-44e0-8f28-3cfe28fbad2f`.
- Code trace through:
  - `app/(user)/app/results/single-domain/[resultId]/page.tsx`
  - `lib/server/result-read-model.ts`
  - `lib/server/single-domain-results-view-model.ts`
  - `lib/assessment-language/single-domain-composer.ts`
  - `components/results/single-domain-result-report.tsx`
  - `components/results/single-domain-result-section.tsx`
  - `lib/results/single-domain-reading-sections.ts`
- Data trace back to assessment-version language rows on version `4ac71eae-636e-4ef3-81f1-a1f1086cec3e`.

### Core finding

For this live result, the page renders from `detail.singleDomainResult` only:
- route loads result detail through `createResultReadModelService().getAssessmentResultDetail(...)`
- page hard-fails unless `detail.mode === 'single_domain'` and `detail.singleDomainResult` exists
- view-model and composer derive display structure from the persisted payload
- no client-side scoring, no runtime language-table reads, no UI-side narrative synthesis

The persisted payload matches the authored version rows for the active pair `results_vision` exactly:
- `hero.*` matches `assessment_version_single_domain_hero_pairs`
- `pairSummary.*` matches `assessment_version_single_domain_pair_summaries`
- `balancing.*` matches `assessment_version_single_domain_balancing_sections`
- driver prose matches exact `DRIVER_CLAIMS` rows
- application prose matches `assessment_version_single_domain_application_statements`

Diagnostics on the live payload only contain positive driver-claim source proofs:
- `single_domain_driver_claim_source: pair_key=results_vision; signal_key=results; role=primary_driver; source=driver_claims`
- `single_domain_driver_claim_source: pair_key=results_vision; signal_key=vision; role=secondary_driver; source=driver_claims`
- `single_domain_driver_claim_source: pair_key=results_vision; signal_key=people; role=supporting_context; source=driver_claims`
- `single_domain_driver_claim_source: pair_key=results_vision; signal_key=process; role=range_limitation; source=driver_claims`

That is the strongest available evidence that the visible driver language came from exact tuple-backed builder language, not legacy fallback.

### Visible section audit

| Visible text area | Source type | Source confirmed? | Issue |
| --- | --- | --- | --- |
| Opening eyebrow `Your leadership pattern` | hardcoded UI shell copy | Yes | none |
| Opening title `Results-led pattern, reinforced by Vision` | computed from persisted payload ranks and labels | Yes | acceptable UI-owned synthesis, not imported prose |
| Opening diagnosis `Together Results and Vision create...` | persisted payload from imported `PAIR_SUMMARIES.pair_opening_paragraph` | Yes | none |
| Opening implication `The cost appears when...` | persisted payload from imported `BALANCING_SECTIONS.current_pattern_paragraph` | Yes | none |
| Opening intro paragraphs | persisted payload from imported `DOMAIN_FRAMING.meaning_paragraph` and `bridge_to_signals` | Yes | none |
| Evidence panel labels and metadata labels | hardcoded UI shell copy | Yes | none |
| Evidence panel values and signal pattern sentence | computed from persisted payload only | Yes | slightly mechanical, but traceable |
| Hero section title `Results and Vision` | persisted payload from imported `HERO_PAIRS.hero_headline` | Yes | none |
| Hero section body | persisted payload from imported `HERO_PAIRS.hero_opening`, `hero_strength_paragraph`, `hero_tension_paragraph` | Yes | none |
| Drivers section meta labels `Main cause`, etc | hardcoded UI shell copy | Yes | none |
| Drivers section prose | persisted payload sourced from exact `DRIVER_CLAIMS` and application rows | Yes | none |
| Pair section title `Forward-driving ambition` | persisted payload from imported `PAIR_SUMMARIES.pair_headline` | Yes | none |
| Pair section body | persisted payload from imported `PAIR_SUMMARIES.*` | Yes | none |
| Limitation section title `When ambition outruns discipline` | persisted payload from imported `BALANCING_SECTIONS.balancing_section_title` | Yes | none |
| Limitation section body | persisted payload from imported `BALANCING_SECTIONS.*` | Yes | none |
| `Process: ...` weaker-range line | computed prefix plus persisted imported balancing text | Yes | slightly awkward visible duplication of `Process:` |
| Application section headings `Where to Lean In`, etc | hardcoded UI shell copy | Yes | none |
| Application body statements | persisted payload from imported `APPLICATION_STATEMENTS` | Yes | none |
| Reading rail labels and helper prompts | hardcoded UI shell copy | Yes | none |

### Section-by-section notes

- Opening sample: `Together Results and Vision create a pattern that makes the future feel urgent and consequential.`
  - Source classification: persisted payload
  - Source path: `payload.pairSummary.pair_opening_paragraph`
  - Builder origin: `assessment_version_single_domain_pair_summaries.pair_opening_paragraph`
  - Pass/fail: pass

- Hero sample: `You are likely to lead by turning a strong destination into visible pressure for movement.`
  - Source classification: persisted payload
  - Source path: `payload.hero.hero_opening`
  - Builder origin: `assessment_version_single_domain_hero_pairs.hero_opening`
  - Pass/fail: pass

- Drivers sample: `You are likely to lead by focusing on what must be achieved...`
  - Source classification: persisted payload
  - Source path: `payload.signals[results].chapter_intro`
  - Builder origin: `assessment_version_single_domain_driver_claims.claim_text` for `results_vision + results + primary_driver`
  - Pass/fail: pass

- Pair sample: `The advantage is directional momentum. Vision helps people see what the work is for...`
  - Source classification: persisted payload
  - Source path: `payload.pairSummary.pair_strength_paragraph`
  - Builder origin: `assessment_version_single_domain_pair_summaries.pair_strength_paragraph`
  - Pass/fail: pass

- Limitation sample: `In that pattern, execution risk is often discovered mid-flight...`
  - Source classification: persisted payload
  - Source path: `payload.balancing.practical_meaning_paragraph`
  - Builder origin: `assessment_version_single_domain_balancing_sections.practical_meaning_paragraph`
  - Pass/fail: pass

- Application sample: `You push work forward and make progress visible...`
  - Source classification: persisted payload
  - Source path: `payload.application.strengths[0].statement`
  - Builder origin: `assessment_version_single_domain_application_statements.strength_statement_1`
  - Pass/fail: pass

### Explicit integrity verdicts

- Fallback prose: `No evidence in this live result`
- Legacy `SIGNAL_CHAPTERS` prose: `No evidence in this live result`
- Hardcoded narrative: `No hardcoded body prose found on the page`
- Stale copy: `No evidence; live payload matches current version rows`
- Unknown-source copy: `None found`

### Important caveat

The codebase still contains stale documentation claiming fallback and legacy `SIGNAL_CHAPTERS` exposure in older single-domain paths. That is now a documentation risk, not a live-page integrity failure for this audited result.

## 2. UI / UX monetisation audit

### Score

`6.5/10`

### Brutal reasoning

The page is not cheap-looking. It is clearly above internal-dashboard quality. The typography is strong, the dark editorial shell is coherent, and the section cards feel intentional. But it still does not consistently feel like a report someone would happily pay premium money for.

The first fold is the strongest part and the weakest part at the same time:
- Strong: the headline lands fast, the palette is controlled, and the evidence panel gives the page weight.
- Weak: the layout still feels like an app screen with a report inside it. The persistent workspace sidebar steals authority from the report, and the right reading rail feels like an internal navigation widget rather than a crafted report companion.

Desktop at `1440px` is respectable.
- The report has presence.
- Section sequencing is clear.
- The application cards feel closest to premium.

Desktop at `1280px` is still fine, but tighter.
- The right rail starts to feel crowded.
- Intro and evidence compete for horizontal attention.

Tablet at `768px` is the biggest visual problem.
- The left workspace shell visibly intrudes into the report composition.
- The hero headline is clipped on the left in the captured state.
- That is not polish debt. That is a credibility hit.

Mobile at `390px` holds together better than tablet.
- The content stack is readable.
- The cards compress cleanly.
- But the opening section is too long before the reader reaches the first proper report section.

### Opening screen

Good:
- strong headline scale
- serious visual tone
- evidence panel adds substance

Bad:
- too much intro copy before the report properly starts
- workspace shell remains visually dominant enough to cheapen the report
- reading rail is useful but not elegant

### Hierarchy

Mostly good. Headings are clear, section order is obvious, and the application panels end strongly.

The weakness is rhythm:
- intro shell is oversized
- evidence block is dense
- hero starts too far down
- report energy dips between intro metadata and hero section

### Reading experience

Readable, but not yet luxurious.
- line lengths are mostly controlled
- contrast is acceptable, not excellent
- long body text still reads slightly grey and low-energy in places
- the reader gets too much framing and not enough insight too early

### Right-side rail

Useful, but commercially underpowered.
- it reads like product utility, not report craft
- labels are small and visually timid
- it does not earn the amount of horizontal space it consumes

### Desktop / tablet / mobile

- Desktop: good foundation, not fully premium
- Tablet: weak, borderline broken in the captured live state
- Mobile: solid structure, overlong top section, still credible

### Trust / premium feel

The page communicates seriousness, but not yet exclusivity. It feels like a very good internal premium app surface rather than a report someone would forward and say "this was worth paying for."

### Top 5 improvements

1. Make the result page feel report-first, not workspace-first. The left app shell is costing too much authority.
2. Fix the tablet breakpoint immediately. Clipped report content kills trust.
3. Shorten and tighten the opening section so the first proper report section lands sooner.
4. Rework the right reading rail so it feels editorial and premium, or reduce its visual dominance.
5. Increase text contrast and paragraph energy in long-form sections, especially mid-page body copy.

### Blockers, if any

- Blocking: tablet layout integrity is not good enough for a monetisable release if the live clipped state is reproducible.

## 3. Language / tone / flow audit

### Score

`5.8/10`

### Brutal reasoning

The language is competent, coherent, and structurally clean. It is not embarrassing. It is also not yet premium enough to carry commercial weight on its own.

The core problem is that too much of the prose sounds like careful assessment explanation rather than incisive behavioural diagnosis. It often says true things, but not memorable things. It is respectable. It is not sharp.

### Hero

Strengths:
- clear
- fast to parse
- signal pair is named correctly

Weaknesses:
- `Results and Vision` is cleaner than the older row, but still blunt
- the body repeats the same underlying idea twice
- `hero_strength_paragraph` and `hero_close_paragraph` are identical in source and feel like duplication, not progression

Weak dataset/field:
- `HERO_PAIRS.hero_strength_paragraph`
- `HERO_PAIRS.hero_close_paragraph`

### Drivers

Strengths:
- source integrity is strong
- exact tuple mapping works
- roles are easy to follow

Weaknesses:
- the prose is still generic signal description in several places
- the section explains the pattern, but does not feel especially diagnostic
- `Primary driver` and `Secondary driver` are serviceable, not revelatory

Weak dataset/field:
- `DRIVER_CLAIMS.claim_text` for `results_vision + results + primary_driver`
- `DRIVER_CLAIMS.claim_text` for `results_vision + vision + secondary_driver`

### Pair

This is one of the stronger imported sections.
- `Forward-driving ambition` is commercially stronger than most of the rest of the report
- it frames advantage and tension cleanly

But it still stops a step short of high-end.
- it is clear, but not especially distinctive
- it sounds edited, not authored

Weak dataset/field:
- `PAIR_SUMMARIES.pair_close_paragraph` is competent but soft

### Limitation

Structurally solid, commercially mixed.
- title is strong
- first paragraph is clear
- risk paragraph lands

But the `Process: Process is the missing range...` line is visibly clumsy.
- it reads like data assembly, not finished prose
- the repeated `Process:` prefix exposes the machinery

Weak dataset/field:
- `BALANCING_SECTIONS.rebalance_intro`
- `BALANCING_SECTIONS.rebalance_action_1`

### Application

Best section for commercial usefulness.
- practical
- scannable
- clear behavioural takeaways

But some lines are still too generic:
- `Make your process more flexible when needed.`
- `Hold direction steady once agreed.`

Those are fine advice lines. They are not premium behavioural coaching lines.

Weak dataset/field:
- `APPLICATION_STATEMENTS.development_statement_1` for `process`
- `APPLICATION_STATEMENTS.development_statement_2` for `vision`

### Narrative progression

The structure works:
- headline
- explanation
- drivers
- pair
- limitation
- application

The weakness is movement within sections.
- too many paragraphs restate instead of deepen
- the report explains the pattern more often than it sharpens it

### Repetition

Real problem.
- hero repeats
- opening and pair sections partially echo each other
- some application statements sound like lighter rephrases of driver logic

### Specificity

Mixed.
- limitation is fairly specific
- application is practical
- drivers and hero still drift toward broad signal-language territory

### Commercial value

The report would reassure a buyer that there is something real here. It would not yet make them feel they received unusually sharp insight.

### Top weak sections

1. Hero
2. Drivers
3. Limitation closing/range line

### Top rewrite priorities

1. Remove repetition between `hero_strength_paragraph` and `hero_close_paragraph`.
2. Rewrite top driver claims so they diagnose behavioural mechanism, not just describe the signal.
3. Rewrite limitation range text so it reads like authored consequence, not prefixed assembly.
4. Sharpen development statements so they sound situational and expensive, not generic coaching.

### Examples of weak vs stronger direction

- Weak: `This signal sharpens the pattern by expanding the scope of thinking...`
- Stronger direction: name what the person actually does in a room, what they over-trust, and what others experience because of it.

- Weak: `Make your process more flexible when needed.`
- Stronger direction: tell the reader what to stop doing, what cue to watch for, and what adjustment prevents the known failure pattern.

- Weak: `Hold direction steady once agreed.`
- Stronger direction: tie the advice to the specific cost of `Results + Vision` so it feels diagnostic rather than generic.

## 4. Priority fixes

### Must fix before monetisable release

- Fix the tablet breakpoint. The live captured state undermines trust.
- Remove visibly assembled prose such as `Process: Process is the missing range...`.
- Rewrite duplicated hero fields so the report deepens instead of repeating itself.
- Reduce the app-shell feel around the report, especially the left workspace chrome.

### Should fix soon

- Sharpen `DRIVER_CLAIMS` copy for the top pairs so the drivers section becomes more diagnostic.
- Tighten the opening section and move the reader into the report sooner.
- Upgrade development statements to situational, behaviourally specific coaching.
- Make the right reading rail feel more editorial and less utility-like.

### Polish later

- Improve contrast and visual energy in long-form body paragraphs.
- Refine metadata presentation so it feels less operational.
- Tune section helper copy so it feels less explanatory and more assured.

## 5. Recommended next Codex tasks

1. Audit and fix the tablet breakpoint and app-shell interference on `/app/results/single-domain/[resultId]` without changing payloads or report structure.
2. Rewrite the live `results_vision` imported language set for `HERO_PAIRS`, `DRIVER_CLAIMS`, `BALANCING_SECTIONS`, and `APPLICATION_STATEMENTS` to remove repetition and generic coaching.
3. Remove or redesign visibly mechanical assembled strings in the limitation/evidence path, especially weaker-range prefix handling.
4. Run a premium-report UI pass on the single-domain results shell to make it feel report-first rather than workspace-first.
