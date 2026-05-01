# Workspace Assessment Index Data Contract Audit

Date: 2026-05-01

Scope: audit only. No Workspace UI, scoring, result generation, schema, sidebar, or navigation behaviour was changed.

## 1. Current Workspace Route And Component Map

Primary route:

- `app/(user)/app/workspace/page.tsx`
  - Server component.
  - Resolves the authenticated app user with `getRequestUserId()`.
  - Reads voice visibility with `isVoiceAssessmentFeatureEnabled()`.
  - Loads the Workspace view model through `createWorkspaceService({ db: getDbPool() }).getWorkspaceViewModel({ userId })`.
  - Renders three current page sections: recommended next action, available assessments, guided voice delivery, and latest result.

Shared UI components:

- `components/shared/user-app-ui.tsx`
  - Provides `PageFrame`, `PageHeader`, `SectionHeader`, `SurfaceCard`, `StatusPill`, `ButtonLink`, `MetaItem`, `EmptyState`, and `LabelPill`.
  - `StatusPill` currently accepts `WorkspaceAssessmentStatus | 'ready'`.

App shell and navigation:

- `app/(user)/app/layout.tsx`
  - Server layout.
  - Calls `requireUserAppRequestUserContext()`.
  - Passes `canAccessVoice={isVoiceAssessmentFeatureEnabled()}` into `UserAppShell`.
- `components/user/user-app-shell.tsx`
  - Shared authenticated app shell and responsive sidebar.
- `components/user/app-shell-nav.ts`
  - Adds `Voice Assessment` navigation only when `canAccessVoice` is true.

Related route using the same Workspace service:

- `app/(user)/app/assessments/page.tsx`
  - Server component.
  - Reuses `createWorkspaceService()` and the same `WorkspaceAssessmentItem` rows.

Older/richer Workspace-style projection still present:

- `lib/server/dashboard-workspace-view-model.ts`
  - Not used directly by `/app/workspace/page.tsx`.
  - Used by focused tests and dashboard-style projections.
  - Has richer lifecycle states: `not_started`, `in_progress`, `completed_processing`, `ready`, `error`.

## 2. Current Data Sources

Workspace service:

- `lib/server/workspace-service.ts`
  - Main loader for current `/app/workspace`.
  - Loads published assessment inventory and ready result list in parallel.
  - Loads one lifecycle state per published assessment.

Assessment list source:

- `lib/server/published-assessment-inventory.ts`
  - Queries `assessments`, `assessment_versions`, and `questions`.
  - Includes active assessments with a published version.
  - Returns assessment id/key/title/description/version/published date/question count.
  - Does not load assignments or per-user availability rules.

Attempt source:

- `lib/server/assessment-attempt-lifecycle.ts`
- `lib/server/assessment-attempt-lifecycle-queries.ts`
  - Looks up the latest in-progress attempt first, then latest attempt for the user and assessment.
  - Reads `attempts.lifecycle_status`, `started_at`, `submitted_at`, `completed_at`, timestamps, and linked version.

Response source:

- `lib/server/assessment-attempt-lifecycle-queries.ts`
  - `countAnsweredQuestionsForAttempt()` counts distinct `responses.question_id`.
  - Current `/app/workspace` does not display answered count, but lifecycle loading still executes the progress path.
  - Responses are used only for progress, not scoring.

Result source:

- `lib/server/result-read-model.ts`
- `lib/server/result-read-model-queries.ts`
  - Lists ready results from `results` joined to `attempts`, `assessments`, and `assessment_versions`.
  - Filters to `results.readiness_status = 'READY'` and `canonical_result_payload IS NOT NULL`.
  - Parses the persisted `results.canonical_result_payload`.
  - Skips malformed payloads in list views rather than crashing Workspace.

Assignment source:

- No assignment repository is used by the current Workspace route.
- The current inventory is published active assessments, not per-user assignment membership.

Voice visibility source:

- `lib/server/voice/voice-feature.ts`
  - Controls whether the voice nav item and Workspace voice CTA are visible/enabled.
  - The Workspace voice section is feature visibility only; it does not participate in scoring or result payload construction.

## 3. Current Status Logic

Current `/app/workspace` status type:

- Defined in `lib/server/workspace-service.ts` as:
  - `not_started`
  - `in_progress`
  - `results_ready`

Current Workspace status resolution:

- `results_ready`
  - Set when `createResultReadModelService().listAssessmentResults()` returns a valid latest ready result for the assessment key.
  - CTA links with `getAssessmentResultHref(resultId, mode)`.
- `in_progress`
  - Set when no valid ready result exists and the lifecycle service found any attempt id.
  - This means a completed/submitted attempt with no listable ready result can still appear as in progress in the current Workspace service.
- `not_started`
  - Set when no valid ready result exists and no attempt exists.

Richer status logic available in `dashboard-workspace-view-model.ts`:

- `not_started`
  - No attempt.
- `in_progress`
  - Latest attempt is still in progress or has no `completed_at`.
- `completed_processing`
  - Attempt is completed/submitted, but no valid ready result is listable.
- `ready`
  - Lifecycle says ready and a valid ready result list item exists.
- `error`
  - Attempt or result pipeline/readiness failed.

Recommended next action:

- Current Workspace priority is:
  1. First `in_progress` assessment.
  2. Latest ready result.
  3. First `not_started` assessment.
- The current service does not expose `completed_processing` or `error`, so Task 2 should prefer the richer lifecycle projection or fold equivalent states into the Workspace service.

## 4. Canonical Result Payload Availability

Where latest result payload is loaded:

- Current `/app/workspace` only calls `listAssessmentResults()`, which parses the persisted payload enough to create `AssessmentResultListItem`.
- Full payload-derived fields are available through `getAssessmentResultDetail()`.
- Both list and detail read from `results.canonical_result_payload`; neither recomputes from responses.

Result id and canonical route:

- Result ids come from `results.id`.
- Canonical route hrefs are resolved by `getAssessmentResultHref(resultId, mode)` in `lib/utils/assessment-mode.ts`.
- `single_domain` results route to `/app/results/single-domain/[resultId]`.
- `multi_domain` or unknown/missing modes route to `/app/results/[resultId]`.

Multi-domain persisted payload/read-model:

- Runtime type: `CanonicalResultPayload` in `lib/engine/types.ts`.
- Persisted fields include `metadata`, `intro`, `hero`, `domains`, `actions`, `application`, and `diagnostics`.
- The current canonical payload type does not store top-level `rankedSignals` or top-level `normalizedScores` arrays.
- The read model projects:
  - `rankedSignals` from `payload.domains[].signalBalance.items[]`.
  - `normalizedScores` from projected `domainSummaries[].signalScores`.
  - `topSignal` from `payload.hero.primaryPattern` plus the projected ranked signal entries.
  - `domainSummaries` from `payload.domains`.

Single-domain persisted payload/read-model:

- Runtime type: `SingleDomainResultPayload` in `lib/types/single-domain-result.ts`.
- Persisted fields include `metadata`, `intro`, `hero`, `signals`, `balancing`, `pairSummary`, `application`, and `diagnostics`.
- `signals[]` is already ordered by rank during completion and contains:
  - `signal_key`
  - `signal_label`
  - `rank`
  - `normalized_score`
  - `raw_score`
  - `position`
  - `position_label`
- The single-domain detail read model also exposes `singleDomainResult`, preserving the persisted payload.

Availability summary:

- `rankedSignals`
  - Multi-domain: available as a read-model projection from persisted `domains[].signalBalance.items[]`, not as a top-level stored array.
  - Single-domain: available directly as persisted `singleDomainResult.signals[]`.
- `normalizedScores`
  - Multi-domain: available as a read-model projection from persisted domain signal balances.
  - Single-domain: available directly as `signals[].normalized_score`.
- `topSignal`
  - Multi-domain: available as read-model projection.
  - Single-domain: available from first ranked persisted signal.
- Domain summaries
  - Multi-domain: available from persisted `domains[]`.
  - Single-domain: the payload is one-domain specific; use `metadata.domainKey` plus `signals[]`, not generic multi-domain domain summaries.

## 5. Four-Signal Workspace Feasibility

The future Assessment Index can display all four signal columns from persisted payload data only for completed single-domain results.

For single-domain completed results:

- Signal key: `singleDomainResult.signals[].signal_key`.
- Signal label: `singleDomainResult.signals[].signal_label`.
- Normalized percentage: `singleDomainResult.signals[].normalized_score`.
- Rank: `singleDomainResult.signals[].rank`.
- Existing persisted role label: `singleDomainResult.signals[].position_label`.
- Existing persisted positions are `Primary`, `Secondary`, `Supporting`, and `Underplayed`.

For the requested role labels:

- `Primary`, `Secondary`, `Third`, and `Fourth` can be assigned from persisted rank only:
  - rank 1 -> Primary
  - rank 2 -> Secondary
  - rank 3 -> Third
  - rank 4 -> Fourth
- This is display labelling from persisted rank, not score recomputation.
- If preserving authored result semantics matters, note that the persisted single-domain labels are more interpretive than ordinal: `Supporting` and `Underplayed`.

For multi-domain completed results:

- The read model can expose signal key/label/percentage/rank from persisted domain signal balances.
- It is not safe to force a universal four-column index without an assessment-specific policy, because generic multi-domain results may contain more than four signals and ranks are domain-local in the current projection.

Recommended read-model shape for Task 2:

- Add a Workspace-specific result summary projection in the server read-model layer, not in UI components.
- For each completed assessment row, expose a nullable `signalsForIndex` array built only from persisted payload data.
- For single-domain results, use `singleDomainResult.signals` sorted by `rank`.
- For multi-domain results, either leave `signalsForIndex` null initially or expose only an explicitly scoped assessment-compatible set after product rules define comparability.

## 6. Gaps And Risks

Missing fields in current Workspace service:

- No all-signal result array is exposed by `WorkspaceAssessmentItem`.
- No `attemptId`, answered count, total count, completion percentage, processing state, or error state is exposed by the current Workspace service.
- `estimatedTimeMinutes` is hardcoded to `null` in `workspace-service.ts`; display duration is inferred elsewhere by `formatAssessmentEstimatedDuration()`.
- No assignment data is represented.

Malformed legacy payload risk:

- `listAssessmentResults()` silently skips malformed ready payloads.
- In the richer dashboard projection, a completed attempt with a malformed ready payload becomes `completed_processing`.
- In the current Workspace service, any attempt without a listable ready result becomes `in_progress`, which can understate completed-but-unreadable result states.

Multi-domain vs single-domain differences:

- Single-domain payloads store the exact ranked signal list needed for a four-signal row.
- Multi-domain canonical payloads store domain chapters and signal balance items, not a single four-signal contract.
- Generic read-model projections are useful for result detail rendering, but they should not be treated as a universal four-signal assessment index without assessment-level compatibility rules.

Risk of over-comparing unrelated assessment signals:

- The future index should avoid comparing percentages across assessments unless the assessment mode, signal taxonomy, and normalization basis are compatible.
- A four-column snapshot is safest when shown as "this assessment's completed signal pattern", not as a cross-assessment leaderboard.

Responsive/layout concerns observed:

- Current desktop layout is card-based and readable.
- Mobile renders the same sections in a single column with the mobile shell controls visible.
- The future four-signal table/index will need a mobile-specific stacked row or horizontally constrained columns; four score columns plus status/CTA will be tight in the current card layout.
- The current page includes a separate Voice Assessment section between assessment overview and latest result, while the target structure removes or relocates that emphasis.

## 7. Recommended Implementation Path For Tasks 2-5

Read model recommendation:

- Extend the server-side Workspace read model first.
- Prefer a single Workspace projection that combines:
  - published inventory,
  - lifecycle state,
  - latest attempt/progress,
  - latest valid ready result,
  - canonical result href,
  - and optional persisted signal snapshot.
- Use persisted payloads only. Do not read `responses` for scores.
- Consider replacing the current simplified status logic with the richer `completed_processing` and `error` handling already proven in `dashboard-workspace-view-model.ts`.

UI recommendation:

- Keep `/app/workspace/page.tsx` as a server component.
- Render the target order:
  1. Recommended next action.
  2. Signal Snapshot.
  3. Assessment Index.
- For completed single-domain rows, show the four persisted ranked signals.
- For incomplete rows, show only safe inventory/lifecycle fields: title, status, progress if exposed, and CTA.
- Do not show placeholder scores for incomplete assessments.

Testing recommendation:

- Add focused tests around the Workspace service/projection before visual work.
- Cover:
  - not started,
  - in progress,
  - completed processing/no valid payload,
  - ready single-domain with four signals,
  - malformed ready payload skipped safely,
  - canonical href for single-domain and multi-domain,
  - voice nav/section visibility remains controlled by the feature flag.
- Existing focused tests to keep running:
  - `npm exec -- node --test tests/dashboard-workspace-view-model.test.ts`
  - `npm exec -- node --test tests/result-read-model.test.ts`
  - Single-domain result/read-model tests when signal snapshot mapping changes.

Schema recommendation:

- No schema change is required for Task 2.
- Required completed-result data already exists in `results.canonical_result_payload`.
- The work should be a read-model/UI projection change only.

## 8. Chrome MCP DevTools Verification

URL inspected:

- `http://localhost:3000/app/workspace`

Viewport checked:

- Desktop: 1440 x 1000.
- Mobile: 390 x 844.

Access:

- Access was not blocked by auth.
- The rendered session showed `qa-user@sonartra.local`.
- Document request returned `GET /app/workspace [200]`.

Current visible page sections:

- Sidebar/nav: Workspace, Assessments, Voice Assessment, Results, Settings.
- Header: Workspace.
- Recommended Next Action: "Your results are ready".
- Assessment Overview: "Available assessments".
- Guided voice delivery.
- Latest Result: "Most recent completed result".

Current visible data:

- Assessment: `Sonartra Leadership Approach`.
- Status: `Results ready`.
- Result links use canonical single-domain href:
  - `/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`
- Latest result completed date: `30 Apr 2026`.
- Voice feature is visible and marked `Available in limited voice shell`.

Console/network notes:

- One Clerk development-key warning was present.
- Clerk client/environment requests were pending to the Clerk dev host.
- No Workspace route error was observed.

UI constraints observed:

- Current page still has the older section model, not the target `Recommended next action -> Signal Snapshot -> Assessment Index`.
- Assessment cards currently show status and metadata only, not result signal columns.
- Mobile layout is readable, but the future assessment index needs a deliberate compact/stacked design for four signal scores plus CTA.

## Validation

Commands run after creating this audit:

- `npm exec -- node --test tests/dashboard-workspace-view-model.test.ts`
  - Failed before running tests because npm attempted to fetch `node` from `https://registry.npmjs.org/node` and hit restricted cache/network access (`EACCES`).
- `npm exec -- node --test tests/result-read-model.test.ts`
  - Failed for the same npm fetch/cache reason.
- `node --import tsx --test tests/dashboard-workspace-view-model.test.ts`
  - Initial sandboxed run failed with Node test-runner `spawn EPERM`.
  - Escalated run passed: 8 tests passed, 0 failed.
- `node --import tsx --test tests/result-read-model.test.ts`
  - Initial sandboxed run failed with Node test-runner `spawn EPERM`.
  - Escalated run passed: 10 tests passed, 0 failed.
- `npm run lint`
  - Failed on pre-existing unrelated lint in `app/(admin)/admin/diagnostics/single-domain-language/[assessmentKey]/page.tsx`: `react-hooks/error-boundaries` reports JSX constructed inside `try/catch`.
  - Also reported one unrelated warning in `scripts/audit-single-domain-pair-coverage.ts` for an unused eslint-disable directive.
  - No lint issue was reported for `docs/qa/workspace-assessment-index-audit.md`.
- `npm run build`
  - Passed. Next.js production build completed successfully.

Git status after validation:

- Added: `docs/qa/workspace-assessment-index-audit.md`
- No functional app files changed by this audit.

## Task 2 Read-Model Implementation Note

Date: 2026-05-01

Files changed:

- `lib/server/workspace-service.ts`
- `lib/server/assessment-attempt-lifecycle.ts`
- `lib/server/assessment-attempt-lifecycle-types.ts`
- `tests/dashboard-workspace-view-model.test.ts`
- `tests/workspace-assessment-index-read-model.test.ts`
- `docs/qa/workspace-assessment-index-audit.md`

New read-model shape:

- `WorkspaceAssessmentItem` now keeps the existing UI compatibility fields (`title`, `description`, `ctaLabel`, `href`) and also exposes Assessment Index fields:
  - identity/version fields: `assessmentTitle`, `assessmentDescription`, `assessmentMode`, `publishedVersionId`, `publishedVersionKey`, `publishedVersionNumber`
  - lifecycle fields: `attemptId`, `resultId`, `resultHref`, `startedAt`, `submittedAt`, `completedAt`, `answeredCount`, `totalQuestionCount`, `progressPercentage`
  - action fields: `actionLabel`, `actionHref`, `actionDisabled`
  - result signal field: `signalsForIndex`
- `AssessmentAttemptLifecycleViewModel` now exposes `submittedAt`, which was already loaded from `attempts.submitted_at`.

Status handling decision:

- Workspace status now uses the stable enum:
  - `not_started`
  - `in_progress`
  - `completed_processing`
  - `results_ready`
  - `error`
- A lifecycle `ready` state without a valid listable result is projected as `completed_processing` instead of `in_progress`.
- `completed_processing` exposes a disabled action in the read model; the current UI still renders its existing compatibility link until the UI redesign consumes `actionDisabled`.

Signal projection decision:

- Completed single-domain rows load result detail through the existing result read model, then project only persisted `singleDomainResult.signals[]`.
- `signalsForIndex` is sorted by persisted `rank`, filtered defensively to readable persisted fields, and capped to four items.
- `normalizedPercentage` comes directly from persisted `normalized_score`.
- `displayRole` is derived only from persisted rank:
  - `1 -> Primary`
  - `2 -> Secondary`
  - `3 -> Third`
  - `4 -> Fourth`
- Incomplete rows expose `signalsForIndex: null`.
- Malformed/unlistable ready payloads degrade to `completed_processing`; no missing scores are synthesized.

Multi-domain handling decision:

- Multi-domain ready results keep result identity and canonical result href.
- `signalsForIndex` remains `null` for multi-domain rows because there is no universal persisted four-signal Workspace contract for cross-assessment comparison yet.

Validation results:

- `node --import tsx --test tests/workspace-assessment-index-read-model.test.ts`
  - Initial sandboxed run failed with Node test-runner `spawn EPERM`.
  - Escalated run passed: 7 tests passed, 0 failed.
- `node --import tsx --test tests/dashboard-workspace-view-model.test.ts`
  - Passed: 8 tests passed, 0 failed.
- `node --import tsx --test tests/result-read-model.test.ts`
  - Passed: 10 tests passed, 0 failed.
- `npm run build`
  - Passed. Next.js production build completed successfully.
- `npm run lint`
  - Failed on the known unrelated lint issue in `app/(admin)/admin/diagnostics/single-domain-language/[assessmentKey]/page.tsx` (`react-hooks/error-boundaries` for JSX inside `try/catch`) and one unrelated warning in `scripts/audit-single-domain-pair-coverage.ts`.
- Changed-file lint:
  - `node_modules\.bin\eslint.cmd lib/server/workspace-service.ts lib/server/assessment-attempt-lifecycle.ts lib/server/assessment-attempt-lifecycle-types.ts tests/dashboard-workspace-view-model.test.ts tests/workspace-assessment-index-read-model.test.ts --max-warnings=0`
  - Passed.

Chrome MCP result:

- URL checked: `http://localhost:3000/app/workspace`
- Result: `GET /app/workspace [200]`
- Existing sections still rendered:
  - Workspace header
  - Recommended Next Action
  - Assessment Overview
  - Guided voice delivery
  - Latest Result
- Existing canonical result links remained visible:
  - `/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001`
- Console showed only the Clerk development-key warning.

Product boundary:

- No scoring logic was added.
- No normalization logic was added.
- No response parsing was used to derive scores.
- No result generation code was changed.
- No schema migration was added.
- Existing Workspace UI layout was not redesigned.
