# MVP Runtime Verification Checklist

## 1. Purpose

This checklist validates the canonical Sonartra MVP path from admin publish through user completion and persisted result retrieval.

- `wplp80` is the flagship acceptance run and the primary end-to-end proof path.
- `qa-mini` is the compact smoke and debugging path for the same shared runtime chain.
- Dashboard, results list, and result detail must read the persisted canonical result payload only. They must not recompute scoring at retrieval time.

## 2. Preconditions

Confirm all of the following before QA starts.

- [ ] App builds and runs successfully in the target environment.
- [ ] Database migrations are applied.
- [ ] Seed data is available.
- [ ] Admin access is available.
- [ ] Test user access is available.
- [ ] Dashboard, results list, and result detail surfaces are reachable.
- [ ] A published `wplp80` assessment version exists.
- [ ] A published `qa-mini` assessment version exists.
- [ ] Published versions are intended to be used for runtime verification, not draft-only versions.

## 3. Environment / Setup Assumptions

- Use one known admin account and one known user account.
- Local, preview, or staging are all acceptable if publish, start, complete, and retrieval all hit the same database.
- A clean database is helpful but not required. Existing historical attempts/results are acceptable if the tester can clearly identify the new run.
- Prefer a fresh attempt for each QA pass.
- For `qa-mini`, use a deterministic answer pattern so the expected top signal and ranking are known in advance.
- Record the assessment key, version tag, attempt ID, and result ID when they become visible. These identifiers make failure isolation much faster.

## 4. QA Path A - WPLP-80 Flagship Acceptance Run

### A1. Admin Verification

- [ ] Action: Open admin assessment management and locate `wplp80`.
  Expected: `wplp80` exists and is visible to admin.
- [ ] Action: Inspect version state for `wplp80`.
  Expected: One intended published version is clearly marked as published.
- [ ] Action: Confirm draft/published state is sensible.
  Expected: The version intended for runtime use is published, and any draft version is not the active runtime target.

### A2. User Start Flow

- [ ] Action: Sign in as the test user and start `wplp80`.
  Expected: A new or reusable in-progress attempt is created successfully.
- [ ] Action: Confirm the runner opens after start.
  Expected: The first question loads without error.
- [ ] Action: Capture the attempt identifier if surfaced.
  Expected: The run can be tied to one concrete attempt.

### A3. Question Delivery

- [ ] Action: Review the opening questions in the runner.
  Expected: Questions render in a stable ordered sequence and match `wplp80` content.
- [ ] Action: Inspect options on several questions, including the first and last sections visited.
  Expected: Options render correctly for each question, with no missing or duplicated choices.
- [ ] Action: Move forward/back through the runner.
  Expected: Navigation behaves correctly and does not jump to an unexpected question set.

### A4. Response Persistence

- [ ] Action: Answer questions across the assessment, including revisiting at least one earlier question.
  Expected: Answers save successfully and edited answers overwrite the previous selection for that question.
- [ ] Action: Progress through the full assessment until the final question.
  Expected: Progress remains consistent and no responses are lost while moving through the runner.
- [ ] Action: Save the final answer before submission.
  Expected: The last answer persists successfully and completion remains available.

### A5. Completion

- [ ] Action: Submit the completed `wplp80` attempt.
  Expected: Submission succeeds and the attempt exits the in-progress state.
- [ ] Action: Observe the immediate completion outcome.
  Expected: No incorrect failure or stuck-processing state is surfaced during a successful run.

### A6. Result Readiness

- [ ] Action: Wait for result generation to finish.
  Expected: One result is generated for the completed attempt.
- [ ] Action: Confirm final result status.
  Expected: The result reaches `READY`.

### A7. Retrieval Surfaces

- [ ] Action: Open the dashboard or latest-result surface.
  Expected: The new `wplp80` result is visible as the latest ready result.
- [ ] Action: Open the results list.
  Expected: The new result appears in the list and is associated with the completed run.
- [ ] Action: Open result detail for that result.
  Expected: Result detail loads successfully and shows a stable persisted result view.

### A8. Persisted Payload Expectation

- [ ] Action: Refresh dashboard, results list, and result detail after the result is ready.
  Expected: The same result remains visible and stable across retrieval surfaces.
- [ ] Action: Re-open the same result detail again without creating a new attempt.
  Expected: Content does not change between reads unless a separate new attempt/result has been generated.
- [ ] Action: Compare dashboard/list/detail at a high level.
  Expected: All retrieval surfaces agree on the same completed result and do not show evidence of recomputation drift.

## 5. QA Path B - qa-mini Clean-Room Validation Run

`qa-mini` is the fast path for smoke tests, debugging, and compact regression confirmation. It validates the same published runtime chain as `wplp80`, but with a smaller deterministic fixture.

### B1. Start qa-mini

- [ ] Action: Start `qa-mini` as the test user.
  Expected: The assessment starts successfully and opens the runner for the published version.

### B2. Answer With Known Deterministic Pattern

- [ ] Action: Use the deterministic pattern `A, A, A, A` for the four questions.
  Expected: All four responses save successfully.
- [ ] Action: Do not vary the pattern during this smoke run.
  Expected: The run remains easy to compare against the fixture expectation.

### B3. Complete Assessment

- [ ] Action: Submit the completed `qa-mini` run.
  Expected: Completion succeeds without an incorrect failure state.

### B4. Confirm READY Result

- [ ] Action: Wait for result generation to finish.
  Expected: One result is generated and reaches `READY`.

### B5. Confirm Fixture Expectation

- [ ] Action: Inspect the stored result presentation.
  Expected: Top signal matches `style_driver`.
- [ ] Action: Inspect the ranked signal order.
  Expected: Ranked signals follow `style_driver`, `mot_achievement`, `style_operator`, `mot_stability`.

### B6. Confirm Retrieval Works

- [ ] Action: Check dashboard visibility for the new `qa-mini` result.
  Expected: Dashboard shows the latest ready result from this run.
- [ ] Action: Check results list visibility for the same result.
  Expected: Results list includes the same ready result.
- [ ] Action: Open result detail for that result.
  Expected: Detail loads successfully and remains stable on repeat reads.

## 6. Failure / Regression Checks

Use this section to isolate the break point quickly.

If the assessment cannot be started:

- Check published version resolution for the assessment key.
- Check attempt creation or attempt reuse behavior.
- Check that the intended version is published, not draft-only.

If questions do not match the expected version:

- Check attempt linkage to `assessmentVersionId`.
- Check runner question scoping to the attempt's linked published version.
- Check that draft data is not leaking into runtime delivery.

If answers do not persist correctly:

- Check response save behavior for the current attempt.
- Check overwrite behavior for changed answers.
- Check that the final answer persists before completion.

If completion fails:

- Check persisted response coverage for the attempt.
- Check completion service resolution by `assessmentVersionId`.
- Check whether the attempt moved to an incorrect failed or stuck-processing state.

If a result is not `READY`:

- Check result pipeline status and readiness status.
- Check canonical payload creation and persistence.
- Check whether the run is incomplete or failed rather than ready.

If dashboard, list, and detail disagree:

- Check result read-model projection.
- Check that retrieval is reading the persisted payload only.
- Check that no recomputation path has been introduced.

If repeated reads show changing result content:

- Check whether a new attempt/result was created.
- Check for accidental runtime recomputation during retrieval.

## 7. Pass / Fail Summary

- [ ] `wplp80` flagship run passed end to end.
- [ ] `qa-mini` clean-room run passed end to end.
- [ ] Dashboard retrieval passed.
- [ ] Results list retrieval passed.
- [ ] Result detail retrieval passed.
- [ ] No incorrect `READY` state was observed.
- [ ] No runtime bridge issue was observed.
- [ ] Retrieval stayed stable from persisted payloads.

## 8. Notes / Known Risks

- `wplp80` remains the flagship acceptance path and the main release sign-off run.
- `qa-mini` complements `wplp80` for smoke testing and debugging, but does not replace it.
- The most important regression risk in this phase is version drift between publish, attempt creation, runner delivery, completion, and retrieval.
- A result should only appear user-visible when it is truly `READY` and backed by a persisted canonical payload.
