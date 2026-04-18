# Leadership Introduction Flow Restoration

## Summary

The Leadership start-flow regression was caused by the entry route creating an attempt immediately for `not_started` users. That collapsed the intended pacing and sent the user straight from the assessments card into the starting loader and runner.

The flow is now restored to:

`assessments card -> /app/assessments/leadership -> introduction -> continue -> /app/assessments/leadership/start -> starting loader -> runner`

## Root Cause

- `/app/assessments/[assessmentKey]/page.tsx` resolved through `resolveAssessmentEntry()`
- `resolveAssessmentEntry()` starts an attempt for `not_started` users
- the route therefore redirected directly into the runner handoff instead of rendering an introduction state first
- the runner client also still contained an internal intro gate, which would have created a duplicate intro after continue if the landing page had been restored without removing that extra gate

## Restoration

- added a dedicated landing resolution for `not_started` users with published intro content
- restored the introduction page on `/app/assessments/[assessmentKey]`
- moved explicit attempt creation and starting-loader timing to `/app/assessments/[assessmentKey]/start`
- removed the runner-side intro gate so the introduction exists only once, before attempt creation
- kept in-progress resume and ready-result re-entry on their existing direct routes

## Lifecycle Intent

- `not_started`: show introduction first, create attempt only after explicit continue
- `in_progress`: resume directly into the active runner attempt
- `completed_processing`: return to the processing/runner handoff
- `ready`: resolve to the completed result route

## Automated Coverage

- `tests/assessment-runner-service.test.ts`
  - landing resolution returns introduction without creating an attempt
- `tests/leadership-flow-regression.test.ts`
  - not-started users land on introduction first
  - repeated landing visits do not create duplicate attempts
  - repeated `/start` entry reuses the same in-progress attempt
  - in-progress and ready states bypass introduction correctly
  - starting loader and processing handoffs remain explicit
- `tests/assessment-runner-ux.test.ts`
  - runner assertions now reflect the restored single-intro flow

## Manual QA Follow-up

1. Assessments page shows `Start`
2. `Start` opens the Leadership introduction page
3. Introduction page feels intentional and stable
4. `Continue to Assessment` enters the starting loader cleanly
5. Loader to runner continuity remains smooth
6. Resume state still works
7. Completed re-entry still works

## Remaining Risk

- This restoration protects route and lifecycle correctness. Visual pacing, motion tone, and first-paint quality of the introduction page still need live QA confirmation.
