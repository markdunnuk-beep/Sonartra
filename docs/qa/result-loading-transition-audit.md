# Result Loading Transition Audit

## 1. Executive Verdict

Score: 8.3 / 10 after polish.

Verdict: needs data-path verification before calling the full transition ready.

No-BS summary: the transition UI is now calmer and more premium than the previous blocky loader. It creates a clearer break between answering and reporting, avoids fake progress semantics, and uses restrained result-preparation language. The local completion path could not be fully verified through to a result page because completion failed on missing single-domain application language rows for the computed pattern. That is not a loading-screen defect, but it blocks end-to-end confidence for this exact local dataset.

## 2. Current Behaviour

Routes tested:
- Local supplied attempt: `http://localhost:3000/app/assessments/sonartra-leadership-approach/attempts/9bb5b39a-768b-4f8c-8239-4d2459d65a5c`
- Local desktop QA attempt: `http://localhost:3000/app/assessments/sonartra-leadership-approach/attempts/4430b512-961c-4b20-a988-1aed64212150`
- Local mobile QA attempt: `http://localhost:3000/app/assessments/sonartra-leadership-approach/attempts/a3641ed4-9ff5-4cb6-aecc-50b5fcb192a6`
- Production read-only attempt: `https://www.sonartra.com/app/assessments/sonartra-leadership-approach/attempts/2aeb545c-190a-4155-afd6-fe7981968334`

Viewports tested:
- Desktop: 1440x900
- Mobile: 390x844

Observed loading copy after polish:
- Result preparation
- Submitting your responses
- Your answers are saved. Sonartra is moving them into result preparation.
- Analysing response pattern
- Building your leadership profile
- Preparing your result
- This usually takes a few seconds.

Observed duration:
- Local processing screen appeared for roughly 0.5 seconds before the local completion failure state.
- The measured browser event timestamps include DevTools/tool overhead before the first UI mutation, so the reliable observation is the visible transition segment, not the total click-to-mutation number.
- Existing minimum visible duration for a successful processing redirect remains 1200ms plus 260ms settle time.

Redirect behaviour:
- Local completion did not redirect to a result page because `/api/assessments/complete` returned 500 with safe user-facing copy.
- Production was not submitted.

Console/network:
- Local: no console errors. Completion POST returned 500 due a result-generation data gap.
- Production: no console errors. Initial live route loaded 200 and showed the ready review state.

## 3. Visual/UI Assessment

What works:
- The transition now feels like a deliberate report handoff rather than a dashboard loading card.
- The centered composition is spacious and quiet.
- The status mark is subtle and does not imply precise progress.
- Typography is restrained and consistent with the premium runner/report direction.

What felt basic before:
- The previous loader used a heavy rounded card and a simulated progress bar.
- The copy was serviceable but generic: "Analysing your response patterns / Building your behavioural profile".
- The progress bar could be read as fake precision even though it was hidden from assistive tech.

Desktop notes:
- The polished transition reads cleanly at 1440x900.
- No horizontal overflow.
- No visible double animation beyond the runner-to-transition-to-error sequence caused by the completion failure.

Mobile notes:
- The transition remains centred and readable at 390x844.
- No horizontal overflow after the runner-shell containment fix from the prior runner pass.
- The three status phrases stack cleanly enough for mobile.

## 4. UX Assessment

Clean break quality:
- Improved. The user leaves the question UI and enters a result-preparation state with distinct copy and layout.

Timing quality:
- The intended successful timing policy is appropriate: a minimum of about 1.46 seconds including settle, without forcing a long fake wait.
- The local failed path makes the transition brief because generation fails quickly. That is acceptable; a longer artificial hold on a known failure would be misleading.

User confidence:
- Better than before. The screen now says responses are saved and result preparation is underway.
- The local failure after submission is still confidence-damaging, but it is a data/readiness issue outside the loading screen.

Perceived premium value:
- Improved. The transition now feels editorial and restrained, not gamified and not fake-AI.

## 5. Accessibility Assessment

Status semantics:
- The normal transition uses `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, and `aria-busy`.
- Failure states continue to use `role="alert"` and assertive live announcements.

Reduced motion:
- Motion uses `motion-safe`, and the global reduced-motion rule remains in place.

Screen reader considerations:
- The visual status mark is `aria-hidden`.
- No fake progressbar is exposed.
- The phrase cards are plain text, not represented as a determinate sequence.

Fake progress concerns:
- Removed from the processing transition. There is no determinate progressbar or fake percentage in the result-loading state.

## 6. Changes Made

Files changed for this audit/polish:
- `components/assessment/assessment-processing-state.tsx`
- `tests/assessment-processing-state.test.tsx`
- `docs/qa/result-loading-transition-audit.md`

Copy changed:
- Replaced generic loader copy with result-preparation copy.
- Added clear stage copy for submitting, preparing, and opening report states.
- Kept long-wait copy truthful and status-based.

Styling changed:
- Replaced the processing loader's simulated progress card with a quieter centred transition shell.
- Added a subtle status mark and three restrained status phrases.

Timing changed:
- No timing constants changed.
- Existing processing minimum visible timing remains in place.

## 7. Before/After Chrome MCP Notes

Before:
- The supplied local attempt reached Review Mode and then displayed the old processing loader briefly.
- The old visible copy was "Analysing your response patterns" and "Building your behavioural profile".
- The old loader included a simulated visual progress bar.
- Completion failed locally with safe error copy because result generation hit missing single-domain application language rows.

After:
- Desktop local QA attempt displayed the new transition copy before the same local data failure.
- Mobile local QA attempt displayed the new transition copy with no horizontal overflow.
- Production route was ready to complete for `mark.dunn.uk@gmail.com`; production completion was not triggered.

## 8. Tests, Build, And Lint

Passed:
- `cmd /c node --import tsx --test tests/assessment-processing-state.test.tsx`
- `cmd /c node --import tsx --test tests/assessment-runner-ux.test.ts`
- `cmd /c node --import tsx --test tests/single-domain-completion.test.ts tests/assessment-completion-error-copy.test.ts`
- `cmd /c npm run build`
- `cmd /c npx eslint "app/(user)/app/assessments/[assessmentKey]/attempts/[attemptId]/assessment-runner-client.tsx" components/user/user-app-shell.tsx components/assessment/assessment-processing-state.tsx tests/assessment-runner-ux.test.ts tests/user-shell.test.ts tests/assessment-processing-state.test.tsx --max-warnings=0`

Full lint:
- `cmd /c npm run lint` still fails only on known unrelated blockers:
- `app/(admin)/admin/diagnostics/single-domain-language/[assessmentKey]/page.tsx` JSX inside try/catch.
- `scripts/audit-single-domain-pair-coverage.ts:204` unused eslint-disable warning.

## 9. Remaining Recommendations

P0:
- Fix the single-domain application language gap for `people_process_results_vision`; it blocks successful result generation for the local QA attempts used here.

P1:
- Re-test the full successful route once result generation reaches READY: submit, processing transition, redirect, first result-page paint.

P2:
- Consider using the same calmer transition shell for the failed completed-attempt page, which still uses the older heavier completion-status panel.

P3:
- If successful generation ever takes more than a few seconds, add a second calm phrase after several seconds while keeping the existing 15-second long-wait explanation.
