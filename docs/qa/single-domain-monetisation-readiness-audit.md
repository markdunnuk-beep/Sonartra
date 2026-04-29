# Single-Domain Monetisation Readiness Audit

Date: 2026-04-29

Audit target: `https://www.sonartra.com/app/assessments/sonartra-leadership-approach/attempts/f9292bdd-2f5c-430f-814d-854e272c83e5`

Auditor stance: paid behavioural assessment standard, not hobby-app standard.

## 1. Executive Verdict

Overall score: **4.2 / 10**

Monetisation readiness: **NOT READY**

No-BS summary: the runner is substantially better than a prototype and has a calm, credible operating model, but the live paid journey fails at the most important point: completion. The production attempt accepted all 24 answers, entered the processing state, then failed with an internal language-composer error: `Missing canonical HERO PAIRS row for pair "process vision" (row missing or references non-active pair language).` That is a hard P0. A user cannot get the paid output, and the error exposes implementation language. Until a completed live single-domain attempt reliably produces a READY persisted result and a readable report, this module cannot be charged for.

## 2. Scorecard

| Area | Score | Verdict |
| --- | ---: | --- |
| Runner UI | 7.2 | Calm, legible, professional enough, but still too app-dashboard-like for a premium assessment. |
| Runner UX | 7.0 | Autosave, review mode, and progress are good; completion failure destroys trust. |
| Runner language | 6.2 | Clear and accessible, but many options make the signal mapping too obvious. |
| Results UI | 3.0 | Not reachable from the audited live attempt; repository tests suggest a structured report exists, but live proof failed. |
| Results UX | 2.0 | The user journey ends in failure, then the Results list says `No results yet`. |
| Results language | 3.5 | Cannot be validated live; component tests pass, but monetisation requires live output proof. |
| Application usefulness | 2.0 | Full-pattern Application rows are validated by tests, but no live result was generated to verify usefulness. |
| Trust / credibility | 3.0 | Strong runner trust cues are outweighed by internal error leakage at completion. |
| Technical reliability | 3.5 | Tests/build pass, but live completion returns 500. |
| Overall monetisation readiness | 4.2 | Not chargeable. Closed internal QA only. |

## 3. Assessment Runner Audit

### Strengths

- Route: live attempt URL, desktop 1440px. Authentication was valid as `mark.dunn.uk@gmail.com`, and the initial page loaded directly into the runner without auth confusion.
- The first screen is understandable: heading `Sonartra Leadership Approach`, instruction `Work through each question in order. Responses save automatically as you go.`, and a visible `Question 1 of 24` state.
- Autosave gives clear feedback. Selecting an option changed status from `Saving response` to `Responses saved`, and progress moved from `0%` to `4%`.
- The 24-question navigator is useful on desktop. It clearly distinguishes current, complete, and incomplete states.
- Review mode is conceptually good. At 24/24, the runner showed `Ready to complete`, `All questions answered`, `Response set complete`, and `Assessment ready to complete`.

### Weaknesses

| Severity | Evidence | Why it matters commercially | Recommended fix |
| --- | --- | --- | --- |
| P0 | Completion ended with `We couldn't complete your result` after `/api/assessments/complete` returned 500. | A paid assessment that cannot produce a result is not monetisable. | Fix composer/runtime Hero/Pair row lookup before any paid launch. |
| P1 | Error text shown to the user: `Missing canonical HERO PAIRS row for pair "process vision" (row missing or references non-active pair language).` | This exposes database/import/composer concepts and makes the product look unfinished. | Replace user-facing failure with calm support-safe wording, and log internal diagnostics server-side only. |
| P1 | The question prompt is duplicated in the runner body. Example on Q1: `When leading a team, what do you focus on most?` appears as both heading and repeated body text. | Repetition makes the runner feel generated rather than editorially designed. | Remove the duplicate prompt line below the heading unless it carries different explanatory value. |
| P1 | Many options expose the scored signal directly: `Clarify what needs to be delivered`, `Clarify where the work is heading`, `Set out how the work should run`, `Check what people need to contribute`. | Users can infer Results / Vision / Process / People too easily, which weakens perceived validity. | Rewrite options as equally attractive behavioural trade-offs rather than transparent signal labels. |
| P2 | Desktop runner still feels like an app workflow rather than a premium assessment experience: sidebar, question navigator grid, and administrative precision dominate. | Business buyers can accept operational clarity, but paid consumer-grade assessment UX needs more focus and less machinery. | Keep the navigator, but reduce chrome and give the question card more editorial presence. |

## 4. Assessment Language Audit

### Question quality

The questions are clear, simple, and accessible. Examples observed:

- `When leading a team, what do you focus on most?`
- `How do you define success for your team?`
- `When priorities compete, what matters most to you?`
- `When your plan is challenged, what is your instinct?`
- `When work is going well, what do you reinforce?`

This is understandable from teacher to CEO. The language avoids gimmicks and mostly avoids jargon.

### Answer option balance

The options are too semantically transparent. Examples:

- `Effort leads to clear outcomes`
- `Work moves in the right direction`
- `Work runs in a consistent way`
- `People grow and stay engaged`

These are balanced in length and tone, but they map almost one-to-one to Results, Vision, Process, and People. That makes the assessment feel easier to game and more like a preference quiz than a serious behavioural instrument.

### Signal obviousness

Signal obviousness is the biggest language weakness in the runner. The model may be deterministic and valid internally, but the surfaced choices need to feel situational. Paid users should feel they are making real behavioural judgements, not choosing the label they want.

### Weak / leading / repetitive copy

- `Answer the current question to keep moving through the assessment.` appears throughout the runner. It is functional, but it feels like system guidance, not premium assessment guidance.
- `Work through each question in order. Responses save automatically as you go.` is clear, but it undersells the purpose. It explains the mechanics, not why the assessment matters.

## 5. Completion Flow Audit

### Submit

The submit checkpoint is well designed in isolation. It gives the user confidence that all answers are complete and that they can still review before submission.

### Processing state

The processing state is strong for a short wait:

- `Analysing your response patterns`
- `Building your behavioural profile`

This is credible and restrained. It avoids fake AI drama.

### Redirect / readiness

This is the hard failure. The live attempt stayed on the attempt route and displayed:

`We couldn't complete your result`

Network evidence:

- `POST https://www.sonartra.com/api/assessments/complete [500]`
- Response route remained `https://www.sonartra.com/app/assessments/sonartra-leadership-approach/attempts/f9292bdd-2f5c-430f-814d-854e272c83e5`

The Results page after failure showed:

- `No results yet`
- `Complete an assessment to see your results here.`

This is commercially fatal because the user has completed the assessment and is then told they have no result.

## 6. Results Page Audit

### First impression

Not fully auditable on the live target because completion failed. The only reachable production results surface for the authenticated user was the empty list state:

- Route: `https://www.sonartra.com/app/results`
- Visible state: `No results yet`

That empty state is acceptable for a new user, but unacceptable immediately after a failed completion. It creates a contradiction: the user just completed an assessment, but the product says there are no results.

### Information architecture

Repository inspection confirms the intended single-domain route is payload-driven:

- `app/(user)/app/results/single-domain/[resultId]/page.tsx` loads result detail through `getAssessmentResultDetail`.
- It renders `SingleDomainResultReport` with `createSingleDomainResultsViewModel(detail.singleDomainResult)`.
- `components/results/single-domain-result-report.tsx` renders intro, hero, remaining sections, reading rail, and reading progress.

This matches the one-result-contract principle, but it was not reachable from the audited live attempt.

### Visual design

Live result design could not be judged from a generated production result. Component tests indicate the report shell covers the locked six-section flow and reading rail, but paid readiness requires a live READY result inspection.

### Reading rail

Not verified live because no result route was produced. Existing tests cover reading rail anchors, but that is not a substitute for production UX proof.

### Mobile layout

Mobile runner at 390px was usable. It switches to a compact `ASSESSMENT FOCUS 12/24` state with an `Open question navigator` control. This is a good mobile pattern.

Mobile results page was not tested because no live result existed.

### Accessibility basics

Runner positives:

- Uses radio controls for options.
- Autosave status uses live-region semantics.
- Processing state exposes status semantics.
- Buttons have descriptive accessible labels such as `Complete the assessment and submit your responses`.

Runner issues:

- First click on the radio control itself timed out via Chrome MCP; clicking the visible label worked. This may be a tooling artefact, but it is worth checking hit target layering manually.
- The duplicate prompt creates unnecessary screen-reader repetition.

## 7. Results Language Audit

Live generated result language could not be audited because the live attempt failed before result creation.

Based on repository tests only, the intended result structure is:

- intro
- hero
- drivers
- pair
- limitation
- application

The results report test suite says it renders persisted full-pattern Application output without lower-order fallback. That is encouraging, but it is not enough for monetisation readiness. A paid product needs proof that the real production data and composer can generate a coherent report for real attempts.

## 8. Application Full-Pattern Audit

Live full-pattern Application output: **not verified**.

Reason: completion failed before a result was created.

Expected checks that could not be completed live:

- generated `patternKey`
- generated `pairKey`
- 12 selected Application rows
- `rely_on`, `notice`, `develop`
- primary, secondary, supporting, and range-limitation roles
- absence of fallback copy

Repository/test evidence:

- `tests/single-domain-completion.test.ts` passed full-pattern Application selection tests.
- `tests/single-domain-results-report.test.tsx` passed persisted full-pattern Application rendering tests.
- `scripts/validate-single-domain-reference-row-counts.ts` passed `application: 144`.

Technical risk: the Application model may be correct, but the user never reaches it while the Hero/Pair composer guard blocks completion.

## 9. Technical Reliability Audit

### Browser / network

Live attempt initial load:

- Route: production attempt URL.
- HTTP document: 200.
- Console errors: none.
- Authentication: `mark.dunn.uk@gmail.com`.

Runner response saves:

- 24 response POSTs to `/api/assessments/attempts/.../responses`.
- All observed response saves returned 200.

Completion:

- `POST https://www.sonartra.com/api/assessments/complete [500]`.
- User-facing error: `Missing canonical HERO PAIRS row for pair "process vision" (row missing or references non-active pair language).`

Local comparison:

- Local attempt also failed at completion with the same class of message: `Missing canonical HERO_PAIRS row for pair "results_vision" (row missing or references non-active pair language).`

### Code evidence

Relevant source:

- `lib/server/single-domain-completion.ts:513` defines `pairLanguageReferencesSignals`.
- `lib/server/single-domain-completion.ts:610` uses that check in `getSpecificHeroRow`.
- `lib/server/single-domain-completion.ts:670` uses that check in `getSpecificPairSummaryRow`.
- `lib/server/single-domain-completion.ts:1032` and `1051` pass diagnostic reason `row missing or references non-active pair language`.

Problem: completion still treats editorial Hero/Pair copy as invalid unless visible text contains the active signal labels or pair key. That is not a reliable language ownership rule. It creates false negatives for valid authored copy and blocks paid completion.

### Tests and build

Commands run:

- `cmd /c node --import tsx --test tests/single-domain-runtime-definition.test.ts tests/single-domain-completion.test.ts tests/single-domain-results-report.test.tsx` - PASS, 41/41.
- `cmd /c node --import tsx --test tests/single-domain-results-smoke.test.tsx tests/result-read-model.test.ts` - initial sandbox `spawn EPERM`, rerun outside sandbox PASS, 11/11.
- `cmd /c node --import tsx --test tests/single-domain-application-pattern.test.ts tests/single-domain-import-parsers.test.ts tests/single-domain-import-validators.test.ts` - initial sandbox `spawn EPERM`, rerun outside sandbox PASS, 31/31.
- `cmd /c node --import tsx scripts/validate-single-domain-reference-row-counts.ts` - PASS.
- `cmd /c npm run build` - PASS.
- `cmd /c npm run lint` - FAIL on known unrelated blockers:
  - `app/(admin)/admin/diagnostics/single-domain-language/[assessmentKey]/page.tsx`: `react-hooks/error-boundaries`, JSX inside try/catch.
  - `scripts/audit-single-domain-pair-coverage.ts:204`: unused eslint-disable warning.

## 10. Monetisation Blockers

### P0 blockers

1. Completion fails on production after all 24 answers.
   - Route: audited live attempt.
   - Evidence: `/api/assessments/complete [500]`.
   - Fix: remove the Hero/Pair visible-text ownership heuristic from completion and rely on canonical pair-key row ownership plus import validation.

2. User-facing failure exposes internal implementation language.
   - Evidence: `Missing canonical HERO PAIRS row for pair "process vision"`.
   - Fix: replace with user-safe language and log internal details server-side.

3. Results page cannot be reached from the paid journey.
   - Evidence: after failure, `/app/results` shows `No results yet`.
   - Fix: completion must persist a READY result or fail before final submission with a recoverable state.

### P1 serious issues

1. Runner option language is too signal-obvious.
   - Evidence: `Effort leads to clear outcomes`, `Work moves in the right direction`, `Work runs in a consistent way`, `People grow and stay engaged`.
   - Fix: rewrite as situational trade-offs.

2. Runner copy repeats the question prompt.
   - Evidence: Q1 displays `When leading a team, what do you focus on most?` twice.
   - Fix: remove duplicate prompt body.

3. Results language cannot be production-verified.
   - Evidence: no READY result from live target.
   - Fix: create a live seeded QA result and verify the complete persisted report.

### P2 polish issues

1. Runner feels operationally clear but not yet premium enough for a paid behavioural product.
2. `Answer the current question to keep moving through the assessment.` is useful but mechanical.
3. Sidebar and navigator chrome compete with assessment focus on desktop.

## 11. Priority Fix Plan

### 1-day fixes

- Fix `single-domain-completion.ts` so Hero/Pair selection does not require literal signal labels in visible copy.
- Replace internal completion error copy with user-safe messaging.
- Re-run the exact live attempt or a fresh production QA attempt and confirm READY result creation.
- Remove duplicate question prompt rendering in the runner.

### 1-week fixes

- Rewrite runner answer options into less obvious behavioural trade-offs.
- Run a fresh live result-page audit at desktop, tablet, and mobile once completion is fixed.
- Add a regression test for editorial Hero/Pair copy that has valid `pair_key` ownership but does not contain literal signal names.
- Add production QA seed/checklist for one known single-domain attempt and result.

### Later enhancements

- Reduce desktop runner chrome so the question experience feels more premium and less admin-like.
- Add a concise “why this matters” line at the start of the runner.
- Add post-completion recovery affordance if result generation fails: retry, support code, and preserved response set.

## 12. Final Recommendation

Do **not** charge users for this module now.

Do **not** run a public paid launch.

Use closed internal QA only until the P0 completion blocker is fixed and a live production attempt produces a READY persisted result with the full report visible. After that, run a second monetisation audit focused on the Results page, because the most valuable paid surface was not reachable in this audit.

The runner is promising. The product journey is not monetisable until the completion and result delivery path is reliable.

