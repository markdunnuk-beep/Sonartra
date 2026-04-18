# Leadership Assessment Full Live MCP Audit

## 1. Executive verdict

Pass with minor issues

## 2. Audit context

- Date: 18 April 2026
- Environment: live production
- Tested route: `https://www.sonartra.com/app/assessments/leadership`
- Authenticated identity confirmed: `mark.dunn.uk@gmail.com`
- Starting account state: not-started

## 3. Flow coverage

- Route entry: fully tested
- Start/resume: partially tested
  Start from not-started was tested fully. In-progress resume was not available in this run. Completed-state re-entry was tested.
- Starting loader: fully tested
- Runner: fully tested
- Submit: fully tested
- Processing: fully tested
- Results handoff: fully tested
- Results first-read quality: fully tested
- Revisit behaviour: fully tested

## 4. What is strong

- The browser session was valid and stable throughout the audit, and the route clearly reflected the account state at each step.
- Clean entry was correct from a not-started state. The Leadership card in `/app/assessments` showed one obvious `Start` action with no stale resume leakage.
- Clicking `Start` routed immediately to `/app/assessments/leadership`, and the `Preparing your assessment` loader appeared without an empty frame.
- Loader to runner continuity was coherent. The user landed on question 1 with a stable shell, visible progress, autosave messaging, and a separate navigator rail.
- The runner remained readable and structurally clear through completion. Review mode and the completion checkpoint felt intentional rather than improvised.
- Submit handed off cleanly into the processing state. The processing loader appeared immediately with coherent copy and then resolved into the results route without sending the user back into runner state.
- Results landing was stable and credible. The first visible screen read as a completed destination, not a shell reset.
- Revisit behaviour was correct. Refreshing the result kept the page stable, and reopening `/app/assessments/leadership` resolved directly back to the completed result route.

## 5. What feels off or unfinished

- The first result screen lands with a large amount of text very early, so the opening impression is strong editorially but slightly heavy on first read.
- Runtime activity around the flow is noisier than the visible UX suggests, with multiple unrelated route fetches and frequent Clerk token requests in the background.
- The product is still emitting a production-console warning that Clerk is loaded with development keys, which weakens confidence even though the visible flow worked.

## 6. Relevant runtime findings

- Console warning observed:
  `Clerk: Clerk has been loaded with development keys. Development instances have strict usage limits and should not be used when deploying your application to production.`
- During the assessment flow, the app triggered unrelated authenticated `_rsc` fetches for routes including `/admin`, `/app/settings`, `/app/results`, and `/app/workspace`.
- The flow also generated frequent Clerk session token requests in the background.
- No blocking route errors, hydration failures, failed completion requests, or broken result requests were observed in this run.

## 7. Issues found

### Issue 1

- Title: Production session emits Clerk development-key warning
- Severity: critical
- Exact location in flow: global runtime / authenticated app shell before and during the Leadership flow
- Observed behaviour: the browser console reported that Clerk was loaded with development keys while the audit was running on `www.sonartra.com`
- Expected behaviour: production should run without a development-key warning in the auth layer
- Recommended fix: switch the live deployment to the correct production Clerk configuration and verify the warning disappears in the authenticated shell

### Issue 2

- Title: Results first screen is text-dense on initial landing
- Severity: minor
- Exact location in flow: results landing and first-read state on `/app/results/single-domain/<resultId>`
- Observed behaviour: the page opens into a strong editorial report, but the intro and early sections present a high volume of copy before the user has much breathing room
- Expected behaviour: the first screen should preserve the premium editorial tone while giving the opening scan a little more pace and separation
- Recommended fix: reduce first-screen density slightly through spacing, copy compression, or stronger early hierarchy cues rather than structural redesign

### Issue 3

- Title: Background route and auth traffic is noisier than the flow needs
- Severity: minor
- Exact location in flow: start, completion, and results retrieval
- Observed behaviour: unrelated `_rsc` requests and frequent Clerk token calls ran during the audited path
- Expected behaviour: the Leadership flow should avoid as much unrelated background traffic as possible so the runtime profile matches the simplicity of the visible path
- Recommended fix: review route prefetching and auth token refresh behaviour around the user app shell to trim unnecessary background work

## 8. Interpretation

The Leadership live flow feels production-credible. The core product path from clean entry to completed result behaved coherently and without structural blockers. The state model also matched the likely intended product logic:

- not-started state showed a clear entry action
- start routed into a visible starting handoff
- runner stayed stable through review and submit
- completion moved into processing
- completed re-entry resolved to the result rather than reopening the runner

The issues found are not product-path failures inside Leadership itself. One is structural at the deployment/auth configuration layer, while the others are polish/runtime efficiency concerns.

## 9. Final recommendation

Ready with targeted micro-adjustments

## 10. Anything not testable in this run

- In-progress resume behaviour was not directly testable because the account started clean and then moved all the way through completion in one run.
- Fine-grained motion timing and subtle animation quality can only be judged partially through MCP snapshots; the structural handoffs were observable, but motion nuance remains partially limited by the tool.
