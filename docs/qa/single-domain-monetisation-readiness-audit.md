# Single-Domain Monetisation Readiness Audit

Date: 2026-04-29

Audit target: `http://localhost:3000/app/results/single-domain/288cc68e-eba7-4933-82f0-0bcafb146fbb#application`

Context: this is a re-audit after the completion blocker was fixed locally. The result now has `resultStatus: ready`, appears in `/app/results`, and the completed local attempt redirects to the result detail page.

Auditor stance: paid behavioural assessment standard, not hobby-app standard.

## 1. Executive Verdict

Overall score: **7.4 / 10**

Monetisation readiness: **NEARLY READY**

No-BS summary: the P0 completion failure is fixed and the module now reaches the point that matters: a READY persisted result with a complete, structured Application section. The result page is credible, calm, and materially above prototype quality. It is not yet strong enough for an unassisted public paid launch. The runner language still makes the signal model too obvious, the runner presentation still feels more operational than premium, and the result report sometimes asks the reader to work too hard before the value lands. This is credible for a controlled beta or sales-led pilot. It is not yet a polished self-serve paid product.

## 2. Scorecard

| Area | Score | Verdict |
| --- | ---: | --- |
| Runner UI | 7.2 | Clear and calm, but still closer to an app workflow than a premium assessment experience. |
| Runner UX | 7.3 | Autosave, progress, review, and post-completion redirect are now credible; route handling for completed attempts is good locally. |
| Runner language | 6.2 | Accessible, but too many answer options expose the underlying Results / Vision / People / Process signal mapping. |
| Results UI | 8.0 | Editorial report shell is strong, with good hierarchy, no horizontal overflow, and a useful desktop reading rail. |
| Results UX | 7.6 | Sections are complete and navigable; the report is dense and mobile loses quick section navigation. |
| Results language | 7.3 | Specific and commercially credible overall, but some phrasing is heavy, repetitive, or slightly too absolute. |
| Application usefulness | 8.0 | Full-pattern Application output renders all 12 rows and is the most practical part of the result. |
| Trust / credibility | 7.4 | READY result, persisted payload, and no internal diagnostic leakage restore trust; runner option transparency still weakens perceived validity. |
| Technical reliability | 8.4 | Local routes, tests, reference validation, build, and changed-file lint passed; full lint remains blocked by known unrelated issues. |
| Overall monetisation readiness | 7.4 | Suitable for controlled beta or guided pilot; not ready for public self-serve paid launch. |

## 3. Assessment Runner Audit

### Strengths

- The previous P0 completion failure is fixed locally. The completed local attempt `e7ef1ecc-a1e7-42a1-8c0b-dc78c8f044a5` redirects to `http://localhost:3000/app/results/single-domain/288cc68e-eba7-4933-82f0-0bcafb146fbb`.
- The runner model remains commercially sensible: 24 questions, autosave, clear progress, review before completion, and a processing state.
- User-safe completion error copy is now covered by tests, so internal composer diagnostics should not leak to end users.

### Weaknesses

| Severity | Evidence | Why it matters commercially | Recommended fix |
| --- | --- | --- | --- |
| P1 | Prior runner audit observed duplicated prompt presentation, for example `When leading a team, what do you focus on most?` appearing as both heading and body copy. No runner UI code was changed in this audit cycle. | Duplicate prompt treatment makes the experience feel generated or unfinished. | Remove repeated prompt text unless the second line adds distinct guidance. |
| P1 | Option examples such as `Clarify what needs to be delivered`, `Clarify where the work is heading`, `Set out how the work should run`, and `Check what people need to contribute` map too visibly to Results / Vision / Process / People. | A paying user can infer the scoring model, reducing perceived assessment validity. | Rewrite options as equally attractive behavioural trade-offs rather than signal labels. |
| P1 | The runner still appears to emphasise operational completion mechanics over premium assessment framing. | A business buyer may accept it, but self-serve paid users need stronger trust and perceived expertise before answering. | Add a stronger opening rationale and reduce mechanical chrome around the question card. |
| P2 | The production attempt id from the earlier audit returned 404 locally, while the local completed attempt redirected correctly. | Not a product blocker, but QA handoff is less clear when production and local attempt ids diverge. | Keep QA notes tied to local result id and local attempt id separately. |

## 4. Completion Flow Audit

Completion now works locally for the repaired flow.

- Local completed attempt route checked: `http://localhost:3000/app/assessments/sonartra-leadership-approach/attempts/e7ef1ecc-a1e7-42a1-8c0b-dc78c8f044a5`.
- Observed behaviour: redirected to `http://localhost:3000/app/results/single-domain/288cc68e-eba7-4933-82f0-0bcafb146fbb`.
- Result readiness from persisted payload inspection: `READY`.
- Results list route `http://localhost:3000/app/results` shows `Sonartra Leadership Approach`, `Completed 29 Apr 2026`, and `View Result`.
- Workspace route `http://localhost:3000/app/workspace` shows `Your results are ready` and `RESULTS READY`.
- Dashboard route `http://localhost:3000/app/dashboard` resolves to the workspace shell locally.

Remaining issue: this audit did not create a fresh new attempt end to end because the user supplied a completed READY result. The prior completion path is covered by focused tests and by the completed local attempt redirect.

## 5. Results Page Audit

### First impression

The result page now clears the most important commercial threshold: it produces a complete report, not a blank state or technical failure. The top result is immediately understandable:

- H1: `Results-led pattern, reinforced by Vision`
- Leading pair: `Results and Vision`
- Scores shown: Results 42%, Vision 25%, People 21%, Process 12%
- Opening claim: `You move from defining the end point to acting on it with little space for challenge, treating early clarity as sufficient proof to proceed.`

That is specific enough to feel like an assessment result rather than a generic productivity article. The weakness is density: the first screen contains the pattern title, score evidence, pair claim, response count, and multiple explanatory layers. The value is there, but the reader has to process a lot before the insight settles.

### Report structure

All required sections are present in the locked single-domain order:

1. Intro
2. Hero
3. Drivers
4. Pair
5. Limitation
6. Application

Headings observed on the result detail route include:

- `Driving towards a clear end state`
- `What is creating this pattern`
- `Direction that converts quickly into action`
- `When agreement is assumed too early`
- `What to rely on, notice, and develop`

This structure is commercially coherent. It moves from identity, to evidence, to interaction, to risk, to practical application. The Application section lands as a useful payoff rather than a detached appendix.

### Reading rail

Desktop viewport `1440x1000`: the reading rail is visible and section anchors work. Loading the target URL with `#application` lands on the Application section, with the section near the top of the viewport.

Tablet viewport `768x1024` and mobile viewport `390x844`: the reading rail is hidden, which is reasonable for layout space. The trade-off is that mobile users lose fast in-report navigation, so dense sections become more scroll-heavy.

### Mobile layout

Mobile did not show horizontal overflow. The Application anchor worked and the content remained readable. The shell text extraction showed repeated app navigation labels in the DOM, which should be checked for screen-reader noise, but there was no visible mobile layout break in the inspected state.

### Accessibility basics

- One `main` landmark was present.
- No duplicate IDs were detected in the inspected result page.
- Application anchor landed correctly.
- No runtime or hydration errors were observed in the browser console.

## 6. Results Language Audit

### Strongest sections

The strongest result language is specific, behavioural, and commercially credible:

- `The cost appears when quick agreement is treated as evidence that the direction is right.`
- `Direction that converts quickly into action`
- `When agreement is assumed too early`
- `Do not assume direction will organise itself.`

These lines sound like a real leadership report. They identify a behavioural pattern and a cost, rather than flattering the user with generic strengths.

### Weak or risky language

| Severity | Evidence | Issue | Recommended fix |
| --- | --- | --- | --- |
| P1 | `You move from defining the end point to acting on it with little space for challenge...` | Insightful, but slightly too absolute. Some users may read it as a judgement rather than a pattern. | Keep the edge, but calibrate with conditional phrasing: `You can move...` or `Under pressure, you may move...`. |
| P1 | The result repeats a similar direction/action/agreement theme across opening, pair, limitation, and Application. | The consistency is good, but repetition reduces perceived depth. | Give each section a sharper job: hero for identity, pair for mechanism, limitation for failure mode, Application for behaviours. |
| P2 | Some sections are long enough that the premium editorial feel competes with cognitive load. | Paid reports need depth, but users also need scan-friendly payoff. | Add tighter summary lines or clearer "what this means" statements without changing the canonical payload model. |

### Premium quality assessment

The report is now credible. It does not feel like a toy quiz. It still does not fully feel like a paid benchmark product because some language is too close to a deterministic template and the runner option wording makes the model easy to reverse-engineer. The result language is strong enough for a closed beta, not yet strong enough to carry public paid acquisition without a human framing layer.

## 7. Application Full-Pattern Audit

Persisted payload inspection confirmed:

- `application.patternKey`: `results_vision_people_process`
- `application.pairKey`: `results_vision`
- Application legacy arrays populated: strengths 4, watchouts 4, developmentFocus 4.
- Application structured sections populated: `relyOn`, `notice`, `develop`.
- Driver roles preserved: `primary_driver`, `secondary_driver`, `supporting_context`, `range_limitation`.
- Signal order preserved: results, vision, people, process.

Visible Application sections:

- `Where to Lean In`
- `Where to Stay Alert`
- `Where to Grow`

The page renders 12 Application items: 4 roles per focus area across rely_on / notice / develop. This is the clearest evidence that the full-pattern model is visible to the user and not merely stored.

Useful examples:

- Results / primary driver: `Rely on your ability to turn ambition into visible movement...`
- Vision / secondary driver: `Rely on your instinct for giving work a larger direction...`
- People / supporting context: `Use people awareness deliberately when the vision needs ownership...`
- Process / range limitation: `Do not assume direction will organise itself...`

Usefulness score: **8.0 / 10**.

The Application section is practical and probably the most monetisable part of the report. It shows how the ranked pattern changes guidance across roles. The remaining gap is presentation: the UI exposes the four-role nuance, but the section could do more to explain why those roles matter to the reader.

Fallback check: no fallback copy, missing rows, blank subsections, or internal diagnostics were visible. Persisted diagnostics include `single_domain_application_full_pattern_source: pattern_key=results_vision_people_process: pair_key=results_vision`, which supports full-pattern selection.

## 8. Technical Reliability Audit

### Browser and route checks

| Route | Result |
| --- | --- |
| `http://localhost:3000/app/results/single-domain/288cc68e-eba7-4933-82f0-0bcafb146fbb#application` | Loaded READY result; Application anchor worked. |
| `http://localhost:3000/app/results` | Loaded; completed result appears. |
| `http://localhost:3000/app/workspace` | Loaded; latest result shown as ready. |
| `http://localhost:3000/app/dashboard` | Resolved to workspace shell locally. |
| `http://localhost:3000/app/assessments/sonartra-leadership-approach/attempts/f9292bdd-2f5c-430f-814d-854e272c83e5` | 404 locally because this is the production attempt id. |
| `http://localhost:3000/app/assessments/sonartra-leadership-approach/attempts/e7ef1ecc-a1e7-42a1-8c0b-dc78c8f044a5` | Redirected to the completed result detail page. |

### Console and network

No app runtime errors, hydration errors, or failed app network requests were observed on the result page. Console output was limited to development messages, HMR logs, React DevTools guidance, and the Clerk development-key warning.

### Source-of-truth check

Repository inspection supports the required architecture:

- `app/(user)/app/results/single-domain/[resultId]/page.tsx` loads result detail through the result read model.
- `components/results/single-domain-result-report.tsx` renders from the result view model.
- `lib/server/single-domain-results-view-model.ts` maps the persisted single-domain result payload into presentation sections.
- `lib/types/single-domain-result.ts` includes `application.patternKey`, `application.pairKey`, structured `application.sections`, and existing arrays.

No evidence was found of UI-side scoring, UI-side pattern recomputation, or browser-side language lookup.

### Validation commands

| Command | Result |
| --- | --- |
| `cmd /c node --import tsx --test tests/single-domain-completion.test.ts tests/assessment-completion-error-copy.test.ts` | PASS, 20/20 tests. |
| `cmd /c node --import tsx --test tests/single-domain-runtime-definition.test.ts tests/single-domain-results-report.test.tsx` | PASS, 26/26 tests. |
| `cmd /c node --import tsx --test tests/single-domain-results-smoke.test.tsx tests/result-read-model.test.ts` | PASS, 11/11 tests. |
| `cmd /c node --import tsx --test tests/single-domain-application-pattern.test.ts tests/single-domain-import-parsers.test.ts tests/single-domain-import-validators.test.ts` | PASS, 31/31 tests. |
| `cmd /c node --import tsx scripts/validate-single-domain-reference-row-counts.ts` | PASS: intro 1, hero 6, drivers 48, pair 6, limitations 6, application 144. |
| `cmd /c npm run build` | PASS. |
| `cmd /c npx eslint "app/(user)/app/results/single-domain/[resultId]/page.tsx" components/results/single-domain-result-report.tsx lib/server/single-domain-results-view-model.ts lib/types/single-domain-result.ts --max-warnings=0` | PASS. |
| `cmd /c npm run lint` | FAIL on known unrelated blockers only. |

Known unrelated full-lint blockers:

- `app/(admin)/admin/diagnostics/single-domain-language/[assessmentKey]/page.tsx`: `react-hooks/error-boundaries` for JSX inside `try/catch`.
- `scripts/audit-single-domain-pair-coverage.ts:204`: unused eslint-disable warning.

## 9. Monetisation Blockers

### P0

No current P0 blockers were found in the completed local result path. Completion, result retrieval, result list visibility, workspace visibility, and Application rendering all work locally.

### P1

| Blocker | Evidence | Required fix before public paid launch |
| --- | --- | --- |
| Runner answer options are too signal-obvious. | Options such as `Clarify what needs to be delivered` and `Clarify where the work is heading` reveal the model. | Rewrite answer options into less transparent behavioural trade-offs. |
| Runner presentation feels operational rather than premium. | The flow is clear, but progress mechanics and repeated prompt treatment dominate the experience. | Give the question card stronger editorial hierarchy and remove prompt duplication. |
| Result opening is dense. | First screen includes title, pair, scores, response count, evidence, and explanatory copy. | Add a sharper one-sentence payoff before evidence density. |
| Result language sometimes overstates the pattern. | `...with little space for challenge...` is useful but harsh. | Calibrate high-impact statements without making them bland. |
| Mobile navigation lacks quick section movement. | Reading rail is hidden on tablet/mobile. | Add a compact mobile section nav or sticky jump control if user testing shows scroll fatigue. |

### P2

- Check screen-reader noise from duplicated shell navigation labels in responsive markup.
- Add more explicit explanation of the four Application roles so the full-pattern sophistication is obvious to users.
- Consider lighter summary cards for dense report sections.

## 10. Priority Fix Plan

### Must-fix before paid beta

1. Remove duplicated runner prompt presentation.
2. Rewrite the most transparent answer options so signal mapping is not obvious.
3. Run a fresh attempt end-to-end in the same environment used for beta users, not just an already completed result.
4. Confirm production deployment has the completion fix and no internal diagnostic leakage.

### Should-fix before public launch

1. Tighten the first result screen so the main insight lands faster.
2. Calibrate harsh or absolute result claims while preserving behavioural specificity.
3. Add a mobile-friendly report navigation affordance.
4. Improve Application role explanation so the 12-row full-pattern model feels intentionally valuable.
5. Clean the known unrelated lint blockers so full lint is green before public launch.

### Later enhancements

1. Add richer benchmark framing once enough data exists.
2. Add optional manager/team interpretation guidance.
3. Add export/share affordances only after the core report is commercially strong.

## 11. Final Recommendation

Charge now: **No for public self-serve.**

Closed beta: **Yes, if positioned as a controlled pilot and supported by direct feedback collection.**

Public launch: **Hold.**

Next audit condition: rerun after runner option language is rewritten, prompt duplication is removed, production completion is verified after deployment, and a fresh attempt completes end-to-end into a READY result without manual intervention.

