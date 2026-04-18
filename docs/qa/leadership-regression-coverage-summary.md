# Leadership Regression Coverage Summary

## Automated coverage added

- `tests/leadership-flow-regression.test.ts`
  - clean entry projects a single `Start` CTA for Leadership
  - landing resolution holds a not-started user on the restored introduction state without creating an attempt
  - repeated `/start` resolution reuses the same in-progress attempt
  - the restored landing/start split still enforces the 800 ms starting handoff and `Preparing your assessment` loader copy
  - in-progress and ready states bypass the introduction correctly
  - submit-to-processing returns the runner processing handoff and refresh keeps the same attempt
  - invalid or foreign runner routes fail cleanly

## Existing automated coverage this builds on

- `tests/assessment-attempt-lifecycle.test.ts`
  - lifecycle state transitions
  - attempt reuse versus new attempt creation
- `tests/assessment-runner-service.test.ts`
  - runner resolution, question rendering, answer persistence, and ready-result handoff
- `tests/assessment-completion-service.test.ts`
  - completion success, already-completed behaviour, incomplete submission rejection, and failure handling
- `tests/single-domain-completion.test.ts`
  - persisted result retrieval and end-to-end single-domain completion flow
- `tests/published-runtime-regression.test.ts`
  - published runtime regression and persisted result stability
- `tests/dashboard-workspace-view-model.test.ts`
  - workspace CTA and readiness projection

## Manual-only checks

These still need live or browser-based QA because they are visual and timing-sensitive:

- perceived calmness and premium feel of the entry page
- flicker or white-flash checks during the starting and processing loaders
- motion subtlety, intro timing, and editorial quality of the results arrival

## Known gaps

- There is still no browser-automation assertion for animation tone or first-paint composition.
- The new regression file protects route and lifecycle seams, not pixel output.
- Full live auth/session verification remains a manual QA responsibility.
- The restored introduction page itself still needs live visual QA for pacing and composition.
