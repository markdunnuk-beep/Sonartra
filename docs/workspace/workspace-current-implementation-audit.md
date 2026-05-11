# Workspace Current Implementation Audit

## Executive Summary

The current authenticated Workspace is server-rendered at `/app/workspace` and is already backed by a retrieval/read-model path rather than UI-side scoring. It loads published assessment inventory, latest attempt lifecycle, and ready result summaries through server services, then renders a Workspace-local page made of a recommended action panel, a latest signal pattern section, and an assessment index table/card layout.

The implementation is close to the required publication-driven direction, but it is not yet the Personal Operating Profile model described in `docs/workspace/workspace-published-chapters-build-plan.md`. The main gaps are product structure and display contract, not scoring infrastructure:

- The Workspace is still framed as "Workspace" plus "Assessment index", not "Your Personal Operating Profile" with dynamic chapter progress.
- The page renders four signal columns for every assessment row and displays "Not available yet" placeholders where completed signal data is absent.
- Recommendation logic is duplicated in the page even though `createWorkspaceService()` also returns `recommendedAction`.
- Published assessment querying is global and not user/role-gated.
- Completed cards use persisted result read-model data, but some page-level fallback wording still assembles a lightweight result description from persisted signal labels when no persisted summary is available.
- `/app/assessments` and `/app/results` should remain as direct routes for now even if removed from the sidebar, because current CTAs, redirects, fallback links, and result reading chrome still depend on them.

No runtime changes were made for this audit.

## Current Implementation Map

### `/app/workspace` route

- Route file: `app/(user)/app/workspace/page.tsx`
- Component type: async server component.
- Authenticated shell: `app/(user)/app/layout.tsx` wraps all `/app/*` routes in `UserAppShell`.
- User identity: `getRequestUserId()` is called in the Workspace page.
- Data source: `createWorkspaceService({ db: getDbPool() }).getWorkspaceViewModel({ userId })`.
- UI components used:
  - `PageFrame`, `SurfaceCard`, `StatusPill`, `LabelPill`, `ButtonLink`, `EmptyState` from `components/shared/user-app-ui.tsx`
  - `AssessmentReadingCard` from `components/user/assessment-reading-card.tsx`
- Page-local helper logic:
  - `getNextAction()`
  - `getProgressCopy()`
  - `getLatestSignalAssessment()`
  - `getLatestSignalDescription()`
  - `getDominantSignalDescription()`
  - `SignalMeter`
  - `SignalCell`
  - `AssessmentIndexRow`

### Server/read-model path

- Workspace service: `lib/server/workspace-service.ts`
- Published inventory query: `lib/server/published-assessment-inventory.ts`
- Attempt lifecycle service: `lib/server/assessment-attempt-lifecycle.ts`
- Attempt lifecycle queries: `lib/server/assessment-attempt-lifecycle-queries.ts`
- Result read model: `lib/server/result-read-model.ts`
- Result read-model queries: `lib/server/result-read-model-queries.ts`
- Results list service: `lib/server/results-service.ts`
- Older dashboard/workspace projection: `lib/server/dashboard-workspace-view-model.ts`

### Current Workspace sections

- Header:
  - Title: `Workspace`
  - Description: "Your assessment home for continuing progress, revisiting reports, and keeping your current signal pattern in view."
- Recommended next action:
  - Page-local `getNextAction(viewModel.assessments)` picks the first state in this order:
    - `in_progress`
    - `results_ready`
    - `not_started`
    - `completed_processing`
    - `error`
    - empty inventory fallback
- Your current signal pattern:
  - Shows only when a `results_ready` assessment has `signalsForIndex`.
  - Uses persisted `resultSummary` when present.
  - Falls back to a page-generated sentence from persisted signal labels.
- Assessment index:
  - One row/card per `viewModel.assessments`.
  - Desktop layout renders fixed columns: Assessment, Status, Primary, Secondary, Third, Fourth, Action.
  - Mobile layout renders assessment metadata, status, action, signal meters when present, and optional reading card.

## Files, Components, and Routes Identified

### Workspace and shared user UI

- `app/(user)/app/workspace/page.tsx`
- `components/shared/user-app-ui.tsx`
- `components/user/assessment-reading-card.tsx`
- `lib/library/assessment-reading-links.ts`
- `lib/server/workspace-service.ts`
- `lib/server/published-assessment-inventory.ts`
- `lib/server/assessment-attempt-lifecycle.ts`
- `lib/server/assessment-attempt-lifecycle-queries.ts`
- `lib/server/result-read-model.ts`
- `lib/server/result-read-model-queries.ts`

### Authenticated shell/sidebar

- `app/(user)/app/layout.tsx`
- `components/user/user-app-shell.tsx`
- `components/user/app-shell-nav.ts`
- `lib/server/user-app-access.ts`
- `lib/server/request-user.ts`
- `lib/server/voice/voice-feature.ts`

### Assessment routes

- `/app/assessments`
  - `app/(user)/app/assessments/page.tsx`
- `/app/assessments/[assessmentKey]`
  - `app/(user)/app/assessments/[assessmentKey]/page.tsx`
- `/app/assessments/[assessmentKey]/start`
  - `app/(user)/app/assessments/[assessmentKey]/start/page.tsx`
- `/app/assessments/[assessmentKey]/attempts/[attemptId]`
  - `app/(user)/app/assessments/[assessmentKey]/attempts/[attemptId]/page.tsx`
  - `app/(user)/app/assessments/[assessmentKey]/attempts/[attemptId]/assessment-runner-client.tsx`

### Result routes

- `/app/results`
  - `app/(user)/app/results/page.tsx`
- `/app/results/[resultId]`
  - `app/(user)/app/results/[resultId]/page.tsx`
- `/app/results/single-domain/[resultId]`
  - `app/(user)/app/results/single-domain/[resultId]/page.tsx`
- `/app/dashboard`
  - `app/(user)/app/dashboard/page.tsx`, redirects to `/app/workspace`

## Existing Reusable Pieces

- `createWorkspaceService()` is the strongest current seam for the future publication-driven Workspace because it already combines published assessment inventory, attempt lifecycle, ready result summaries, result detail for completed single-domain cards, CTAs, and reading links.
- `listPublishedAssessmentInventory()` already filters to `assessment_versions.lifecycle_status = 'PUBLISHED'` and `assessments.is_active = TRUE`.
- `createAssessmentAttemptLifecycleService()` already maps raw attempt/result state into the needed lifecycle states.
- `createResultReadModelService()` already reads only READY results with non-null `results.canonical_result_payload`.
- `getAssessmentResultHref()` centralises mode-aware result links and keeps ranked-pattern single-domain results on `/app/results/single-domain/[resultId]`.
- `UserAppShell` already supports shared desktop/mobile navigation, mobile drawer semantics, route-specific low-chrome shells for runner and ranked-pattern result detail routes, and admin visibility through layout-provided booleans.
- `SurfaceCard`, `StatusPill`, `ButtonLink`, `EmptyState`, and `PageFrame` are reusable shell primitives for later Workspace UI work.
- Existing source-level tests already protect "no scoring imports" and persisted signal summary behaviour.

## Pieces to Replace or Refactor

- Replace the page-local `getNextAction()` with service-owned recommendation state or a single shared projection so recommendation priority is not duplicated.
- Replace the "Assessment index" model with "Available Chapters" and "Completed Reports" sections that are driven by published inventory and card state.
- Add dynamic profile progress in the read model: `completed available chapters / published available chapters`.
- Remove fixed four-column signal placeholders from incomplete rows. Incomplete cards should use published metadata only.
- Remove page-generated result-summary fallback wording where possible. Completed cards should prefer persisted `recognition`, `patternSynthesis`, `closingIntegration`, `topSignal`, `rankedSignals`, `normalizedScores`, and `scoreShape` data already surfaced by the read model.
- Avoid using the current `typeLabel: 'Individual'` as a long-term product label for chapters unless it is backed by published assessment metadata.
- Decide whether `AssessmentReadingCard` belongs in the first publication-driven Workspace implementation. It is useful, but it is not part of the core card requirements in the build plan.

## Sidebar Dependency Notes

### Current nav configuration

File: `components/user/app-shell-nav.ts`

Current primary entries:

- Workspace
  - `href: /app/workspace`
  - `match: /app/workspace`, `/app/dashboard`
- Assessments
  - `href: /app/assessments`
  - `match: /app/assessments`
- Voice Assessment
  - `href: /app/voice-assessments`
  - `match: /app/voice-assessments`
  - Included only when `canAccessVoice` is true.
- Results
  - `href: /app/results`
  - `match: /app/results`
- Settings
  - `href: /app/settings`
  - `match: /app/settings`
- Admin
  - `href: /admin`
  - `match: /admin`
  - Included only when `canAccessAdmin` is true.

### Admin visibility

`app/(user)/app/layout.tsx` calls `requireUserAppRequestUserContext()` and passes `requestUser.isAdmin` into `UserAppShell` as `canAccessAdmin`.

`UserAppShell` calls `getUserAppNavSections({ canAccessAdmin, canAccessVoice })`, so Admin visibility is controlled before nav rendering. This is display-level visibility; actual admin access remains separately guarded by admin routes.

### Voice visibility

`app/(user)/app/layout.tsx` passes `isVoiceAssessmentFeatureEnabled()` into `UserAppShell` as `canAccessVoice`.

### Shared mobile/desktop nav

Desktop, collapsed desktop, and mobile drawer all render the same `navSections` from `getUserAppNavSections()`. Later sidebar changes should update `components/user/app-shell-nav.ts` and `components/user/user-app-shell.tsx` together because icon support is currently a closed union:

```text
'workspace' | 'assessments' | 'voice' | 'results' | 'settings' | 'admin'
```

Adding Library and Support will require nav item configuration plus icons/rendering cases.

## Assessment/Result Route Dependency Notes

`/app/assessments` and `/app/results` should remain direct routes after removal from the sidebar unless a separate task proves they are unused and safe to remove.

Reasons:

- `/app/assessments` is still a full assessment inventory page using `createWorkspaceService()`.
- Current Workspace start/resume CTAs resolve to `/app/assessments/[assessmentKey]`.
- `createAssessmentRunnerService()` uses `/app/assessments#${assessmentKey}` as the workspace fallback for error and unresolved processing states.
- `/app/assessments/[assessmentKey]` resolves whether the user should see an introduction, resume runner, open a ready result, or return to workspace.
- `/app/assessments/[assessmentKey]/start` creates or resolves the in-progress attempt and redirects to the runner.
- Runner routes link back to Workspace and use `/app/results` as a fallback when a ready result id is missing.
- `/app/results` is still the result history page and is used by result empty states and result detail chrome.
- `/app/results/[resultId]` is the generic result route and redirects single-domain results to `/app/results/single-domain/[resultId]`.
- `/app/results/single-domain/[resultId]` is the canonical ranked-pattern/single-domain report route.
- `UserAppShell` low-chrome ranked-pattern result header currently has a "Back to results" link to `/app/results` plus an exit link to `/app/workspace`.

Removing Assessments and Results from the sidebar should therefore be a navigation change only, not a route deletion.

## Published Assessment Querying

Current query path:

- `createWorkspaceService()` calls `listPublishedAssessmentInventory(deps.db)`.
- `buildDashboardViewModel()` and `buildAssessmentWorkspaceViewModel()` also call `listPublishedAssessmentInventory(params.db)`.
- `/app/voice-assessments` also reads `listPublishedAssessmentInventory(getDbPool())`.

Current filtering:

- `assessment_versions.lifecycle_status = 'PUBLISHED'`
- `assessments.is_active = TRUE`

Current ordering:

- `ORDER BY a.title ASC, a.assessment_key ASC`

Current gaps:

- There is no user-specific or role-specific availability filter in `listPublishedAssessmentInventory()`.
- The query can return more than one published version per assessment if the database allows multiple published versions for the same assessment.
- `questionCount` counts all questions for the version; the inventory query does not filter question active/inactive status.
- The inventory does not expose product-facing chapter metadata beyond title and description.
- The inventory does not expose availability grouping, entitlement, audience, or assigned-user constraints.

## User Latest Attempt/Result State

Current attempt lookup path:

- `createWorkspaceService()` gets one lifecycle per published assessment by calling `getAssessmentAttemptLifecycle({ userId, assessmentKey })`.
- Lifecycle service loads the published assessment summary by key, then prefers latest in-progress attempt, otherwise latest attempt for that user and assessment.
- Progress uses `COUNT(DISTINCT question_id)` from `responses` and question count for the assessment version.

Current status values:

- Persisted attempt lifecycle:
  - `NOT_STARTED`
  - `IN_PROGRESS`
  - `SUBMITTED`
  - `SCORED`
  - `RESULT_READY`
  - `FAILED`
- Persisted result readiness:
  - `PROCESSING`
  - `READY`
  - `FAILED`
- Service lifecycle:
  - `not_started`
  - `in_progress`
  - `completed_processing`
  - `ready`
  - `error`
- Workspace status:
  - `not_started`
  - `in_progress`
  - `completed_processing`
  - `results_ready`
  - `error`

Mapping to the planned card states:

- `not_started`: no attempt exists.
- `in_progress`: latest in-progress attempt exists, or attempt has no completed timestamp.
- `completed_processing`: submitted/completed attempt exists but no listable READY result with canonical payload exists.
- `results_ready`: ready result exists in `listAssessmentResults()`.
- `error`: attempt failed, result readiness failed, or result pipeline failed.

Risk:

- `createWorkspaceService()` groups ready results by `assessmentKey`, while lifecycle is resolved against the currently published assessment. This intentionally keeps a historical ready result visible after a new version is published, but the future chapter model should explicitly decide how to display "completed report for prior version, new version available".
- The current ready-result map uses the first ready result per assessment key from a globally sorted result list. That is acceptable for latest-ready behaviour but should be kept explicit in tests.

## Canonical Payload Compliance Notes

Current canonical payload reads:

- `lib/server/result-read-model-queries.ts` selects `r.canonical_result_payload` only for `r.readiness_status = 'READY'` and non-null payloads.
- `lib/server/result-read-model.ts` parses persisted payloads and builds result list/detail view models.
- `lib/server/results-service.ts` maps result list items from the result read model.
- `lib/server/workspace-service.ts` maps completed Workspace cards from result list/detail view models.

Current Workspace compliance:

- The Workspace page does not import scoring, normalization, result-builder, option-weight, or engine-runtime code.
- `signalsForIndex`, `scoreShape`, `patternKey`, and `resultSummary` come from `createWorkspaceService()`, which gets them from `createResultReadModelService()`.
- For ranked-pattern payloads, the read model uses persisted `rankedSignals`, `normalizedScores`, `scoreShape`, `patternKey`, `recognition`, and `orientation` derived from `canonical_result_payload`.
- For legacy single-domain payloads, `workspace-service.ts` still has fallback support for `detail.singleDomainResult.signals`.

Current cautions:

- `result-read-model.ts` does adapter work over persisted payload data. It does not run scoring, but it does project fields into UI-facing shapes and includes compatibility fallbacks for legacy payloads.
- `getSingleDomainSummaryLine()` uses persisted `recognition` first and then persisted `orientation` as a fallback. That is acceptable as read-model projection, but future Workspace cards should be explicit about which persisted sections are allowed.
- `app/(user)/app/workspace/page.tsx` can generate fallback copy with `getDominantSignalDescription()` from persisted signal labels. This is not scoring, but it is new display language assembled in the page and should be removed or constrained for the publication-driven card contract.
- `SignalCell` displays "Not available yet" in fixed signal columns. This creates visible placeholders for incomplete or non-signal-ready cards and conflicts with the future rule that incomplete cards should not show signal placeholders.

Safe fields currently available for completed cards:

- `assessment`: available through `assessmentTitle`, `assessmentKey`, `description`, version fields, and read-model metadata.
- `topSignal`: available in `AssessmentResultListItem.topSignal`.
- `rankedSignals`: available in `AssessmentResultDetailViewModel.rankedSignals`.
- `normalizedScores`: available in `AssessmentResultDetailViewModel.normalizedScores`.
- `scoreShape`: available as `scoreShape`.
- `recognition`: available in the persisted single-domain ranked-pattern payload; currently summarized through read-model `summaryLine`.
- `patternSynthesis`: available in the persisted single-domain ranked-pattern payload when using `detail.singleDomainResult`.
- `closingIntegration`: available in the persisted single-domain ranked-pattern payload when using `detail.singleDomainResult`.

Gap:

- `WorkspaceAssessmentItem` does not currently expose `recognition`, `patternSynthesis`, or `closingIntegration` as structured fields. It exposes compact `resultSummary`, `scoreShape`, `patternKey`, and `signalsForIndex`.

## Existing Tests

Current useful Workspace tests:

- `tests/workspace-ui-import-guard.test.ts`
  - Guards Workspace UI from importing scoring/normalization/engine runtime code.
  - Guards accessible action/signal meter contract.
  - Guards removal of voice block and older Workspace copy.
- `tests/workspace-assessment-index-read-model.test.ts`
  - Tests `createWorkspaceService()`.
  - Covers not-started, in-progress, completed-processing, ready single-domain, ready ranked-pattern, malformed payload degradation, and multi-domain behaviour.
- `tests/user-app-brand-surface.test.ts`
  - Checks current Workspace headings/copy and absence of older labels.
- `tests/user-shell.test.ts`
  - Covers user shell sidebar/drawer behaviour and low-chrome runner/result shells.
- `tests/dashboard-workspace-view-model.test.ts`
  - Covers older dashboard/workspace projection, lifecycle CTA mapping, latest result visibility, malformed ready payload handling, schema fallback, and archived assessment filtering.
- `tests/ranked-pattern-result-read-model.test.ts`
  - Covers ranked-pattern read-model parsing.
- `tests/ranked-pattern-result-summary.test.ts`
  - Covers compact summary fields used by Workspace/dashboard/result cards.
- `tests/leadership-result-retrieval-regression.test.ts`, `tests/published-runtime-regression.test.ts`, `tests/qa-mini-runtime-smoke.test.ts`, and `tests/single-domain-completion.test.ts`
  - Include broader result retrieval and Workspace/dashboard proof around persisted results.

Tests likely to update later:

- `tests/workspace-ui-import-guard.test.ts`
- `tests/workspace-assessment-index-read-model.test.ts`
- `tests/user-shell.test.ts`
- `tests/user-app-brand-surface.test.ts`
- `tests/dashboard-workspace-view-model.test.ts`
- `tests/ranked-pattern-result-summary.test.ts`

Potential new tests later:

- Publication-driven Workspace progress denominator.
- No placeholders for unpublished future assessments.
- No signal placeholders on incomplete cards.
- Sidebar removes Assessments, Results, and Voice Assessment while keeping routes.
- Sidebar adds Library and Support.
- Completed cards only render from persisted canonical payload fields.

## Browser QA Requirements

Routes to inspect later:

- `http://localhost:3000/app/workspace`
- `http://localhost:3000/app/assessments`
- `http://localhost:3000/app/assessments/[assessmentKey]`
- `http://localhost:3000/app/assessments/[assessmentKey]/attempts/[attemptId]`
- `http://localhost:3000/app/results`
- `http://localhost:3000/app/results/[resultId]`
- `http://localhost:3000/app/results/single-domain/[resultId]`
- `http://localhost:3000/library`
- Future `/app/support` or equivalent scoped support route, once defined.

Useful later browser-flow checks:

- Desktop, tablet, and mobile Workspace layout.
- Sidebar expanded/collapsed desktop states.
- Mobile drawer open/close and focus semantics.
- Workspace start CTA to assessment intro/start route.
- Workspace continue CTA to active runner.
- Workspace view report CTA to canonical result route.
- Direct `/app/assessments` and `/app/results` route access after sidebar removal.
- Result detail low-chrome header after `/app/results` is removed from nav.
- No horizontal overflow in the chapter card grid.
- No visible unpublished/future assessment placeholders.

MCP note:

- Chrome DevTools MCP is useful for final visual inspection.
- Playwright MCP or existing Playwright tests are useful for route flows.
- This audit did not require browser inspection because the deliverable is dependency mapping.

## Data/Read-Model Gaps

- No explicit Workspace progress model exists yet.
- No explicit "chapter" read model exists yet; current naming is assessment/result-oriented.
- No structured user-accessibility or entitlement filter exists for published assessment inventory.
- No structured completed-card projection exists for the exact allowed fields in the Workspace plan.
- No explicit completed report collection exists; ready reports are inferred per assessment and latest result list.
- Current inventory ordering is title-based, not publish/order-index based.
- Current read model can show a historical ready result against a newly published version without explicit UX state.
- Current Workspace service exposes `recommendedAction`, but the page ignores it and recomputes recommendation locally.

## Recommended Next Implementation Task

Implement a Workspace read-model refactor before changing the visual page:

1. Add a publication-driven Workspace projection in `lib/server/workspace-service.ts` that returns:
   - `availableChapterCount`
   - `completedChapterCount`
   - one chapter card per published, user-accessible assessment
   - a single resolved card state per chapter
   - `recommendedNextChapter`
   - `completedReports`
2. Keep inventory sourced from published assessment versions and keep result details sourced from `results.canonical_result_payload`.
3. Preserve direct routes and CTAs:
   - start/continue via `/app/assessments/[assessmentKey]`
   - report viewing via `getAssessmentResultHref()`
4. Add or update service tests first, then update the page rendering and sidebar in later tasks.

## Risks and Cautions

- Do not remove `/app/assessments` or `/app/results` while current CTAs, redirects, fallback links, and result chrome still reference them.
- Do not add hardcoded six-assessment placeholders. Current inventory is already dynamic; preserve that behaviour.
- Do not let incomplete cards render fake signals or "Not available yet" signal columns.
- Do not compute progress against a static denominator.
- Do not recompute score shape, pattern key, rank order, normalized scores, or report language in the page.
- Be careful with legacy payload fallback logic. It may be necessary during transition, but the new Workspace contract should prefer the active ranked-pattern payload fields.
- Sidebar changes require both nav configuration and icon/rendering support.
- Admin visibility in the sidebar is not the admin access guard; preserve route-level admin protection.
- Browser QA should include runner and result low-chrome shells because they intentionally bypass the normal sidebar layout.
