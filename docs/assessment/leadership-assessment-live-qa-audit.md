# Leadership Assessment Live QA Audit

## 1. Audit context

- Date: 2026-04-18
- Environment: live production (`https://www.sonartra.com`)
- Route tested: `https://www.sonartra.com/app/assessments/leadership`
- Authenticated session confirmed: yes
- Authenticated identity confirmed in UI: `mark.dunn.uk@gmail.com`

Observed facts:

- The attached Chrome DevTools MCP session was already authenticated and loaded the Sonartra workspace normally.
- Navigating to `/app/assessments/leadership` did not present a fresh entry page. It resolved immediately into an existing in-progress Leadership attempt:
  `/app/assessments/leadership/attempts/e74711b7-a821-406a-9ec5-571fb77de05b`

## 2. Flows executed

Fully tested:

- Flow C: Immediate runner state
- Flow D: Submit -> processing loader -> results handoff -> first visible results screen

Partially tested:

- Flow A: route entry was tested only as a resume path into an existing in-progress attempt

Not tested:

- Fresh entry page presentation
- Start assessment CTA interaction
- STARTING loader
- Entry -> loader -> runner continuity from a clean not-started state
- Flow E edge/failure states
- Intro motion timing beyond what could be inferred from the MCP transition snapshots

## 3. What is visually strong

Observed facts:

- The authenticated route loaded directly into the runner without a visible auth interruption or session jitter.
- The runner shell felt structurally stable in snapshot review: left rail, main question card, and question navigator remained consistent and orderly.
- The first visible runner state was readable and composed. The question, options, progress, and navigator were clearly separated.
- When the final submit action was triggered, the processing state appeared immediately as a focused single-message screen:
  `Analysing your response patterns / Building your behavioural profile`
- No blank frame or white flash was captured between submit and processing loader.
- The results handoff landed cleanly on a stable editorial-style screen with strong sectioning:
  intro, behaviour pattern, signal chapters, balancing, pair summary, and application.
- The first results screen carried a premium editorial tone more than a dashboard tone, which suits the product.

## 4. What feels off or unfinished

Observed facts:

- The clean entry page and Start CTA were not available because the account already had an in-progress attempt. That means the production route currently resumes rather than exposing the intended entry/start surface for this user state.
- Because of that resume behavior, the STARTING loader could not be audited in this run.
- The runner review state introduces a large completion checkpoint block above the question content. It is clear, but it increases vertical density noticeably at the end of the flow.
- The first visible results screen is text-heavy very early. The editorial quality is strong, but the opening section lands with a lot of copy before any lighter visual break.

## 5. Relevant runtime findings

Observed facts:

- The only console warning directly visible during the audited flow was Clerk running with development keys on the live site.
- Network activity for the authenticated route included several parallel `_rsc` requests to unrelated app destinations such as `/admin`, `/app/settings`, `/app/results`, `/app/assessments`, and `/app/workspace`.
- Completion itself looked technically clean:
  `POST /api/assessments/complete` returned `200`, followed by successful result-page requests.
- Response-saving calls were numerous during runner progression, but no failed save requests were observed.

## 6. Interpretation

Interpretation:

- The live product experience from runner -> processing -> results is strong enough to feel coherent and production-credible.
- The most important missing piece from this run is the clean entry/start path. Because resume logic short-circuited directly into an in-progress attempt, the audit cannot make a full judgment on first-touch assessment entry quality for a not-started user.
- The processing handoff appears well controlled. It reads as intentional rather than fake, and the first results landing feels continuous rather than reset-heavy.
- The results page is visually mature, but the opening read is dense enough that a little more breathing room or pacing could improve the first-impression scan.

## 7. Priority classification

Must fix:

- None confirmed from the surfaces actually reached in this run.

Should fix soon:

- Add an explicit QA path for auditing the clean not-started entry state, or make it easier to reset a QA assessment safely so the entry page and STARTING loader can be reviewed reliably.
- Review whether the unrelated live `_rsc` fetches are necessary on this route, because they may add avoidable background work around a high-focus flow.
- Recheck results-page opening density and pacing, especially in the first chapter.

Acceptable for now:

- Runner composition
- Submit -> processing continuity
- Results landing stability

## 8. Recommended next actions

Recommendations:

- Run one follow-up live audit with a clean not-started Leadership state for the same account or a separate resettable QA account. That is the missing piece for a complete production UX judgment.
- Keep the current processing loader structure. It is concise and reads as purposeful.
- Consider a light reduction in first-screen results density, not by removing substance, but by improving early visual pacing.
- Review the route-level prefetch/request pattern to confirm that unrelated authenticated destinations are not adding unnecessary background overhead.

## 9. Anything not testable in this run

- Fresh entry page quality from a not-started state
- Start assessment CTA interaction
- STARTING loader timing and continuity
- Intro motion duration/re-trigger quality at frame-by-frame fidelity
- Failure and edge-state handling inside this live flow

## 10. Clean Entry Flow Audit (Follow-up)

### 1. Verdict

Pass with minor issues

### 2. Confirmed precondition

Observed facts:

- The live assessments inventory showed Leadership as `NOT STARTED`.
- The visible action for Leadership was a single `Start` CTA.
- No stale resume action or in-progress state was shown before the new attempt began.

Interpretation:

- The reset was effective for this user, and the follow-up run started from a true clean not-started state.

### 3. Entry page findings

Observed facts:

- The clean pre-start state was visible on the live assessments page rather than as a separate standalone Leadership landing page.
- Leadership appeared as a clear inventory card with one primary `Start` action and no duplicated competing controls.
- The card state was uncluttered and businesslike, with the assessment title, status, and estimated time all readable at a glance.

Interpretation:

- The product currently treats the assessments inventory as the effective clean entry surface for Leadership.
- That works functionally, though it is a lighter framing moment than a dedicated assessment intro page would be.

### 4. Start CTA findings

Observed facts:

- Clicking `Start` responded immediately.
- No dead click or visible hesitation was observed.
- The route changed directly to `/app/assessments/leadership`, and the user was moved straight into the starting state.

Interpretation:

- The CTA interaction feels responsive and production-safe.

### 5. STARTING loader findings

Observed facts:

- A dedicated full-screen loading state appeared immediately after the `Start` click.
- The loader copy was:
  `Preparing your assessment`
- No blank frame, white flash, or shell jump was captured before the loader appeared.
- The state was singular and stable. No double loader, flicker, or visible remount artefact was captured.

Interpretation:

- The starting state reads as intentional and premium enough for this flow, even though the copy currently says `Preparing your assessment` rather than `STARTING`.

### 6. Loader -> runner transition findings

Observed facts:

- The handoff from loader to runner landed directly on question 1 of 15.
- The workspace shell remained stable through the transition.
- The first question arrived with the runner header, question card, options, progress, and navigator already composed.
- No blank frame or white flash was captured between the loader and the first runner frame.

Interpretation:

- Entry -> loader -> runner continuity is now verified and is coherent.
- The transition feels controlled rather than abrupt.

### 7. Reconfirmation of downstream flow

Observed facts:

- The fresh runner remained stable through completion.
- Submitting the completed assessment immediately produced the processing state:
  `Analysing your response patterns / Building your behavioural profile`
- No false-ready or broken intermediate state was observed.
- Results landed directly on a stable editorial-style Leadership results page.
- The results handoff again avoided a blank frame or visible white flash.

Interpretation:

- The full live path now holds end-to-end:
  clean entry -> start -> loader -> runner -> processing -> results

### 8. Any new issues found

#### Issue 1

- Title: No dedicated standalone Leadership entry page on the route
- Severity: minor
- Exact location: clean not-started state before `/app/assessments/leadership` begins the attempt
- Observed behaviour: the effective clean entry surface is the assessments inventory card, and the route itself moves straight into the start loader rather than presenting a richer assessment-specific intro page
- Expected behaviour: if the intended design is a dedicated first-touch assessment entry screen, the route should expose that layer clearly before creating the attempt
- Recommended fix: either keep the inventory card as the intentional entry surface and document that behavior, or add a lightweight dedicated Leadership intro page before attempt creation

#### Issue 2

- Title: Starting copy does not match the named audit state
- Severity: minor
- Exact location: full-screen start loader after clicking `Start`
- Observed behaviour: the loader appears immediately and behaves well, but the visible copy is `Preparing your assessment`
- Expected behaviour: the copy should align with the intended named transition state if `STARTING loader` is the product language used in QA and design review
- Recommended fix: decide whether `Preparing your assessment` is the canonical label; if not, align QA language and product copy to one term

#### Issue 3

- Title: Results page still opens with heavy early text density
- Severity: minor
- Exact location: first visible Leadership results screen, intro and opening chapters
- Observed behaviour: the page is stable and editorial, but the opening read lands with dense copy quickly
- Expected behaviour: the first results screen should preserve the editorial depth while giving slightly more visual breathing room in the opening scan
- Recommended fix: soften the top-of-report density through spacing, pacing, or lighter early section compression rather than removing content

### 9. Final recommendation

Observed facts:

- The clean not-started state was visible.
- The `Start` CTA was responsive.
- The start loader was immediate and stable.
- Loader -> runner continuity held.
- Runner -> processing -> results continuity also held.

Interpretation:

- The Leadership assessment flow can now be treated as fully audited end-to-end on live production for this account state.

Recommendation:

- Ready to move to Task 11 testing and regression coverage.
- Only targeted micro-adjustments are worth considering, not structural flow changes.
