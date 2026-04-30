# Result Page UI/UX Audit

Date: 2026-04-30

Audit target: `https://www.sonartra.com/app/results/single-domain/940105b2-122c-49c6-b36b-14ad5a806f38`

Auditor stance: paid behavioural assessment report standard, not generic app-page standard.

## 1. Executive Verdict

Score: **8.1 / 10**

Readiness: **NEARLY READY**

No-BS summary: the live single-domain result page is credible, calm, complete, and materially above prototype quality. It reads from a READY persisted result, preserves the locked six-section structure, exposes no internal diagnostics, and delivers useful practical guidance. It is close to monetisable for controlled beta. It is not yet strong enough for a polished self-serve paid launch because the first viewport is too evidence-heavy, mobile lacks real section navigation, and some labels still sound like report machinery rather than premium interpretation.

The page feels like a serious behavioural report more than a dashboard. The remaining work is not fundamental architecture; it is hierarchy, density, and mobile navigation polish.

## 2. Scorecard

| Area | Score | Verdict |
| --- | ---: | --- |
| First impression | 8.0 | Strong title and immediate pattern, but too much evidence appears before the insight has room to land. |
| Visual hierarchy | 8.0 | Premium shell and restrained typography; evidence and metadata density still compete with the opening narrative. |
| Report structure | 8.6 | The locked six-section flow is coherent and commercially defensible. |
| Reading experience | 7.8 | Good on desktop; long on mobile without enough jump navigation. |
| Results language presentation | 8.0 | The UI presents authored language cleanly, though some UI labels make the model feel more exposed than necessary. |
| Application usefulness | 8.5 | Strong practical payoff; all rely / notice / develop rows render and are specific. |
| Desktop UX | 8.6 | Reading rail, anchors, and layout work well at 1440px. |
| Mobile UX | 7.2 | Readable and stable, but too linear for a long paid report. |
| Accessibility basics | 8.1 | Single main landmark, sane heading order, no duplicate IDs, `aria-current` on rail; mobile navigation is the main gap. |
| Technical reliability | 8.8 | Live route loads cleanly with no runtime errors and no failed data requests. |
| Overall result-page readiness | 8.1 | Nearly ready; suitable for controlled beta, not yet ideal for public self-serve paid use. |

## 3. Chrome MCP Evidence

Routes checked:

- `https://www.sonartra.com/app/results/single-domain/940105b2-122c-49c6-b36b-14ad5a806f38`
- `https://www.sonartra.com/app/results/single-domain/940105b2-122c-49c6-b36b-14ad5a806f38#intro`
- `#hero`
- `#drivers`
- `#pair`
- `#limitation`
- `#application`
- `https://www.sonartra.com/app/results`

Viewport checks:

- Desktop `1440x1000`: pass. Reading rail visible, no horizontal overflow, Application rail click lands with `#application`, Application top at about `96px`, rail `aria-current` moves to `Putting This Into Practice`.
- Tablet `768x1024`: pass for layout stability. Reading rail hidden, progress indicator visible, no horizontal overflow. Navigation becomes passive.
- Mobile `390x844`: pass for layout stability and readability. Reading rail hidden, progress indicator visible but not sticky once deep in the report. No horizontal overflow.

Visible page state:

- Final live result URL loaded directly with `200`.
- Authenticated as `mark.dunn.uk@gmail.com`.
- Result title: `Results-led pattern, reinforced by Vision`.
- Leading pair: `Results and Vision`.
- Completed date visible: `30 Apr 2026`.
- Result list route shows `Sonartra Leadership Approach`, `Completed 30 Apr 2026`, and a `View Result` link back to the audited result.

Console and network:

- Fresh live result load showed no console messages.
- Preserved messages included a Clerk development-key warning; no hydration or runtime crash was observed.
- Network requests for the result route and assets returned `200` or cache `304`.
- No failed data requests were observed during direct load, scrolling, or anchor checks.

Payload / READY evidence:

- The route renders through `app/(user)/app/results/single-domain/[resultId]/page.tsx`, which calls the result read model and requires `detail.mode === 'single_domain'` plus `detail.singleDomainResult`.
- The visible result list states completed results use the persisted canonical result payload.
- The live page shows a completed result, full six-section report, 24/24 response evidence, and no fallback or diagnostic copy.

## 4. First-Screen Audit

What lands well:

- The H1 is clear and commercially meaningful: `Results-led pattern, reinforced by Vision`.
- The opening diagnosis is specific: `Here, immediate progress is tied to a larger sense of direction.`
- The trust framing is useful: `The result is not a personality diagnosis or proof of leadership capability.`
- The score evidence is transparent enough to build confidence that the result came from completed responses.

What is dense or delayed:

- The first viewport asks the user to process the H1, two substantial opening paragraphs, a trust disclaimer, a reading instruction, four scored signal rows, response base, leading pair, signal pattern, missing range, and metadata.
- Percentages are useful for auditability but visually pull attention away from the interpretive result. `42%`, `25%`, `21%`, and `12%` make the first screen feel more quantified than premium.
- The evidence panel label `Why this result was generated` is accurate but mechanical. It sounds like system justification, not report confidence.

Exact recommended fixes:

- Reduce the first-screen evidence treatment from a large proof panel to a quieter confidence strip or expandable evidence module.
- Keep primary and reinforcing signals visible, but push lower-ranking detail below the fold or into a compact `Evidence behind this result` disclosure.
- Rename `Why this result was generated` to something quieter such as `Result basis` or `How to read this pattern`.
- Keep the result title and opening diagnosis dominant. The first screen should make the user feel seen before it explains the machinery.

## 5. Section-By-Section Audit

### Intro

Strengths:

- Strong title and no generic result-page hero fluff.
- The intro correctly avoids overclaiming with `not a personality diagnosis`.
- The opening frame positions the report as a practical map.

Weaknesses:

- The intro is doing too many jobs: interpretation, trust disclaimer, usage guidance, evidence, score transparency, and metadata.
- Metadata such as `VERSION 1.0.0` is not first-screen user value and makes the surface feel more internal.

Severity: **P1** for first-screen density.

### Hero

Strengths:

- `Making the future practical` is a strong section title.
- The prose has a clear leadership insight: action plus direction.
- The section feels editorial and readable.

Weaknesses:

- The section arrives after a very large intro/evidence block. The page would feel more premium if this value appeared faster.

Severity: **P2**.

### Drivers

Strengths:

- The four-part driver presentation is clear and complete.
- `Progress leads this pattern` is concrete and readable.
- The missing range is named without feeling like a failure state.

Weaknesses:

- Labels such as `MAIN CAUSE`, `REINFORCING CAUSE`, `SUPPORTING LAYER`, and `MISSING RANGE` are understandable, but they expose the model in a slightly procedural way.
- Headings like `Primary driver`, `Secondary driver`, and `Supporting context` are useful internally but not emotionally resonant to a paid user.

Severity: **P2**.

### Pair

Strengths:

- The pair section has the cleanest narrative arc: current dynamic, strength, tension, best-use case.
- `This creates purposeful momentum` is one of the strongest phrases on the page.

Weaknesses:

- Some content overlaps conceptually with the opening diagnosis and hero. This is not broken, but the report would feel sharper if the pair section added more contrast or situational examples.

Severity: **P3**.

### Limitation

Strengths:

- `When ambition outruns the route` is clear and commercially useful.
- The limitation is framed as range to add, not a flaw.

Weaknesses:

- The sentence beginning `Process: Bringing Process in earlier...` is accurate but clunky. The repeated `Process` label makes the line feel generated.
- This section could benefit from stronger visual emphasis on the practical cost of the limitation.

Severity: **P2**.

### Application

Strengths:

- Application renders fully.
- `Where to Lean In`, `Where to Stay Alert`, and `Where to Grow` all appear.
- Each subsection has four rows, covering primary, secondary, supporting, and limitation roles.
- The practical advice is specific and useful:
  - `translate the goal into one visible move`
  - `ask whether people feel able to understand and carry the move`
  - `Name the sequence, the owner, and the review point`

Weaknesses:

- Role logic is useful but not made explicit to the user in a premium way. The reader sees four points per subsection, but not why there are four or how they map to the full pattern.
- On mobile, Application is a long payoff buried more than 6000px down the page with no jump control.

Severity: **P1** for mobile discoverability; **P2** for role clarity.

## 6. Reading Rail / Navigation Audit

Desktop:

- Reading rail is visible at `1440x1000`.
- It includes all six sections in the locked order.
- `aria-current` updates as expected on direct anchor load and rail click.
- Clicking `Putting This Into Practice` updates the hash to `#application`, scrolls the Application section near the top, and does not create overflow.
- The rail does not overlap report content.

Tablet and mobile:

- Reading rail is hidden.
- Replacement `Report reading progress` is visible but passive. It tells the user where they are; it does not let them jump.
- The progress element is not sticky. At the Application section on mobile, its rectangle is far above the viewport, so it is not available when the user needs orientation.

Recommendation:

- Add a compact mobile/tablet section navigator: either a sticky low-noise segmented menu or a `Jump to section` disclosure with the six locked sections.
- Keep the current desktop rail; it is working.

## 7. Mobile Audit

What works:

- No horizontal overflow at `390x844`.
- H1 wraps acceptably.
- Content remains readable.
- Application rows render without clipping.
- Touch targets in the app shell and result list are available.

What does not work well enough for paid self-serve:

- The report becomes a long linear article with no active jump navigation.
- Application, the most practical payoff, is too easy to miss.
- The first screen still carries too much evidence before emotional value.
- The app sidebar remains present in the accessibility tree on mobile even when visually not central, adding noise to snapshots.

Recommendation:

- Add mobile jump navigation near the top and make it available deep in the report.
- Consider a top-of-report `Go to practical guidance` link or a quiet sticky `Sections` control.
- Reduce intro/evidence density so mobile users reach the Hero and Drivers faster.

## 8. Accessibility Audit

Passes:

- One `main` landmark.
- One H1.
- Heading order is coherent: H1, H2 sections, H3 subsections.
- No duplicate IDs found in the live DOM.
- Desktop rail is a `nav` with a clear aria label.
- Desktop rail uses `aria-current`.
- The mobile progress region has live text.
- Direct anchor loads land sections near the top with stable hashes.

Needs checking or fixing:

- Mobile/tablet users do not get an equivalent navigational control to the desktop rail.
- The rail logo has alt text `Sonartra`; acceptable, but it may be decorative inside a reading nav.
- Focus-state visual quality for rail anchors looked structurally present in code but was not exhaustively keyboard-tested in this pass.
- Reduced-motion behaviour was not exhaustively verified in the browser.

## 9. Technical Reliability Audit

Observed:

- Direct live route loaded with `200`.
- Result list route links back to the audited result.
- No blank sections.
- No visible internal diagnostics.
- No fallback warnings visible to the user.
- No hydration errors observed.
- No failed network requests observed on the result route.
- Six sections render in locked order: Intro, Hero, Drivers, Pair, Limitation, Application.
- Application full-pattern output renders all 12 visible rows across rely, notice, and develop.

Repository inspection:

- `app/(user)/app/results/single-domain/[resultId]/page.tsx` reads through the result read model and hands `detail.singleDomainResult` to `createSingleDomainResultsViewModel`.
- The report component consumes the view model and renders presentation structure.
- No UI-side scoring, normalization, ranking, or result recomputation was identified in the inspected result page files.

Validation commands:

- `cmd /c node --import tsx --test tests/single-domain-results-report.test.tsx tests/single-domain-results-smoke.test.tsx tests/result-read-model.test.ts`
  - Initial sandbox run hit Windows `spawn EPERM`.
  - Escalated rerun passed: 21/21.
- `cmd /c node --import tsx --test tests/single-domain-completion.test.ts tests/assessment-completion-error-copy.test.ts`
  - Passed: 20/20.
- `cmd /c node --import tsx scripts/validate-single-domain-reference-row-counts.ts`
  - Passed all expected row-count contracts: intro 1, hero 6, drivers 48, pair 6, limitations 6, application 144.
- `cmd /c npm run build`
  - Passed.
- `cmd /c npm run lint`
  - Blocked by known unrelated full-lint issues:
    - `app/(admin)/admin/diagnostics/single-domain-language/[assessmentKey]/page.tsx`: JSX inside try/catch reported by `react-hooks/error-boundaries`.
    - `scripts/audit-single-domain-pair-coverage.ts:204`: unused eslint-disable warning.
- Changed-file lint was not applicable because this audit created a Markdown document only and made no product code changes.

## 10. Monetisation Blockers

| Severity | Issue | Evidence | Recommended fix |
| --- | --- | --- | --- |
| P0 | None observed. | Live result loads, sections render, anchors work, no runtime failures. | No P0 action required. |
| P1 | First viewport is too dense and evidence-heavy. | User sees scores, proof rows, response base, metadata, and result explanation before the report has fully landed. | Quiet the evidence panel and move some proof detail below the first fold or behind disclosure. |
| P1 | Mobile lacks actionable section navigation. | Reading rail hidden; progress indicator is passive and non-sticky; Application sits deep in the page. | Add mobile/tablet section jump control. |
| P2 | Some UI labels feel procedural. | `Why this result was generated`, `Primary driver`, `Secondary driver`, `Range limitation`, `VERSION 1.0.0`. | Reframe labels for user value and move technical metadata lower. |
| P2 | Limitation text has a generated-feeling prefix. | `Process: Bringing Process in earlier...` | Adjust UI label/prefix handling if this is presentation-owned; do not alter imported language without a language task. |
| P3 | Pair section overlaps conceptually with earlier content. | Opening, Hero, and Pair all explain Results + Vision momentum. | Add more situational distinction in a future language pass. |

## 11. Priority Fix Plan

Immediate fixes:

- Reduce first-screen evidence density.
- Move or de-emphasise `VERSION 1.0.0`.
- Rename `Why this result was generated` to a quieter user-facing label.
- Add a mobile/tablet section jump affordance.

Before paid beta:

- Polish driver labels so the model feels interpreted, not exposed.
- Make Application easier to reach from the top of the report.
- Improve the limitation prefix treatment so `Process: Bringing Process...` does not read as generated.
- Keyboard-test rail anchors and mobile section navigation after any nav changes.

Before public launch:

- Add print/export/share consideration if this is intended to be a paid report artefact.
- Test with at least three different single-domain patterns to ensure density, line lengths, and Application rendering hold across longer copy.
- Re-audit contrast and reduced-motion behaviour systematically.

## 12. Final Recommendation

Suitable for internal QA: **Yes.**

Suitable for controlled beta: **Yes, with caveats.** The report is credible enough for guided users or sales-led pilots.

Suitable for paid public launch: **Not yet.** The page is close, but public paid self-serve needs a calmer first viewport and real mobile navigation so the report feels easier to consume and more intentionally packaged.

Recommended next task:

**Simplify result first-screen evidence and add mobile section navigation.** Keep it UI-only, preserve the persisted payload contract, and do not change scoring, composer logic, or assessment language data.
