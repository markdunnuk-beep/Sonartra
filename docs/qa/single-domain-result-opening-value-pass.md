# Single-Domain Result Opening Value Pass

Date: 26 April 2026

Route checked:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48?opening-check=c37e1a8
```

## 1. Summary of Changes

- Replaced the procedural first-screen emphasis with an insight-first opening summary.
- Added a deterministic `openingSummary` in the single-domain results view model.
- Added a compact evidence panel labelled `Why this result was generated`.
- Moved completion/date/version metadata below the primary insight and evidence panel.
- Kept the existing report sequence intact: Intro, Hero, Drivers, Pair, Limitation, Application.
- Did not change scoring, result generation, payload shape, routes, database schema, `DRIVER_CLAIMS`, or authoring/import schemas.

## 2. Before vs After First Impression

Before:

- The first screen led with assessment metadata and the generic title `Understand how you lead`.
- The first meaningful body copy explained what leadership means in the report.
- The user had to continue into Hero/Drivers before the personalised pattern was obvious.

After:

- The first visible result identity is `Your leadership pattern`.
- The H1 is now `Results-led pattern, reinforced by Process`.
- The first paragraph says what the result means behaviourally: the user pushes for progress and defines how work should run.
- The evidence panel immediately explains the basis: leading pair, signal pattern, missing range, and completed response count.

Assessment: materially better above the fold. The page now answers "what does this say about me?" within the first viewport.

## 3. Persisted Fields Used

The opening uses existing persisted result payload/read-model fields only:

- `payload.signals[].rank`
- `payload.signals[].position`
- `payload.signals[].signal_label`
- `payload.hero.pair_key`
- `payload.hero.hero_opening`
- `payload.pairSummary.pair_opening_paragraph`
- `payload.balancing.current_pattern_paragraph`
- `payload.balancing.balancing_section_title`
- `payload.diagnostics.answeredQuestionCount`
- existing metadata fields: completed date/time, assessment title, version

No UI-side scoring or recalculation was introduced. The view model sorts already persisted ranked signals and formats display labels for presentation.

## 4. Evidence Panel Details

Evidence panel items now shown:

| Item | Live value checked |
| --- | --- |
| Leading pair | `Process and Results` |
| Signal pattern | `Results appears strongest, Process reinforces it, and Vision is the least available range.` |
| Response basis | `Ranked from 24 completed responses.` |
| Missing range | `Vision: When structure outruns commitment` |

This gives the result a visible basis without exposing raw implementation detail or implying statistical certainty.

## 5. Metadata Changes

- Metadata remains visible.
- Metadata now appears below the opening summary and evidence panel.
- Metadata typography was reduced in weight and contrast.
- It no longer dominates the first viewport as an internal completion receipt.

## 6. Repetition Reduced Between Opening/Hero/Drivers

The opening now answers: what is my pattern?

Drivers still answer: why does it happen?

The opening uses the pair summary and balancing summary rather than duplicating the full primary/secondary driver claims. The Hero and Drivers sections still share some copy below the opening, but that is outside this task's allowed scope because it would require deeper editorial/source-language changes or section restructuring.

## 7. Language System Gaps Found

No hard language blocker was found for this pass. Existing fields were sufficient to form a credible opening.

Remaining gap:

- Affected sections: Opening/Hero/Drivers.
- Fields inspected: `hero.hero_opening`, `pairSummary.pair_opening_paragraph`, `balancing.current_pattern_paragraph`, `signals[].signal_label`, `signals[].rank`, `signals[].position`, driver claim text.
- Weakness: `hero.hero_opening` is still a factual bridge line, not premium summary language: `This result is led by results, with process providing the strongest secondary signal.`
- What stronger authored language would provide: a dedicated short first-screen diagnosis candidate inside existing authored narrative fields, with less overlap between Hero and Drivers.
- Recommendation: improve authored `pair_opening_paragraph` and Hero summary copy in the source language so the presentation layer has stronger first-screen material without adding schema.

## 8. Validation Results

Automated validation:

- `cmd /c node --test -r tsx tests/single-domain-results-report.test.tsx` passed, 7/7.
- `cmd /c npm run lint` passed.
- `cmd /c npm run build` passed.

Chrome MCP DevTools live validation:

- Live route opened successfully.
- Desktop viewport checked at `1440 x 1000`.
- Mobile viewport checked at `430 x 900`.
- Opening renders with `Your leadership pattern`.
- H1 renders as `Results-led pattern, reinforced by Process`.
- Evidence panel renders correctly.
- Metadata remains visible but secondary.
- Hero, Drivers, Pair, Limitation, and Application still render.
- Mobile progress remains visible and reports `Intro` with `Hero` next.
- No failed result/RSC requests were observed.

## 9. Screenshots Captured

- `docs/qa/screenshots/single-domain-result-opening-desktop.png`
- `docs/qa/screenshots/single-domain-result-opening-mobile.png`

## 10. Remaining Weaknesses

- Hero heading remains lower-case `results and process`; this pre-existing editorial polish issue is now more visible because the opening is stronger.
- Hero and Drivers still repeat primary/secondary driver language below the opening.
- The Application section remains generic compared with the strongest report sections, but that was explicitly out of scope for this task.
- Clerk production still emits the development-key warning; no render or hydration errors were observed.
