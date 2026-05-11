# Workspace Published Chapters Build Plan

## 1. Purpose

The authenticated `/workspace` page will be rebuilt as a premium, publication-driven Personal Operating Profile. It should act as the user's index for available assessment chapters and completed reports, not as a static suite page or combined scoring surface.

The Workspace displays currently published, user-accessible assessment chapters and the current user's state for each one. It must stay flexible as assessments are added, removed, published, unpublished, or made available to different user groups.

This plan is documentation only. It does not implement UI, routes, data fetching, sidebar changes, tests, migrations, importer logic, scoring logic, or result rendering changes.

## 2. Product Model

- Published assessment = available profile chapter.
- Completed result = completed chapter/report.
- Workspace = premium index of available chapters and completed reports.

User-facing language:

- `chapter`: an available assessment experience within the Personal Operating Profile.
- `report`: the completed chapter output available after a READY result exists.
- `profile progress`: the user's completion progress across currently available chapters.
- `Personal Operating Profile`: the overall workspace frame for available chapters and completed reports.

Internal model language remains:

- `assessment`
- `assessment version`
- `attempt`
- `result`
- `canonical_result_payload`

## 3. Core Rules

- The Workspace must be publication-driven.
- Only published, user-accessible assessments should appear.
- Do not render placeholders for unpublished future assessments.
- Do not hardcode the planned six-assessment suite.
- Do not create a combined profile summary.
- Do not calculate a global score, meta-type, or cross-assessment profile.
- Do not recompute scores, ranks, score shape, pattern key, or result language in the Workspace.
- Completed cards must render from persisted results.canonical_result_payload only.
- Incomplete cards may render from published assessment metadata only.
- Existing direct routes may remain available even if removed from the sidebar.

## 4. Workspace Card States

Each published assessment chapter should resolve to exactly one card state for the current user:

- `not_started`: the chapter is published and available, but the current user has no active attempt or completed result.
- `in_progress`: the current user has an active resumable attempt.
- `completed_processing`: the current user submitted the chapter, but the result is not READY yet.
- `results_ready`: a READY result exists and can be opened.
- `error`: the chapter or result cannot be displayed because of a known failed or invalid state.

## 5. Workspace Progress

Workspace progress is:

```text
completed available chapters / published available chapters
```

Examples:

- 2 of 2 available chapters complete
- 4 of 6 available chapters complete
- 6 of 8 available chapters complete

The denominator is dynamic. It must come from published, user-accessible assessments. It must not be a hardcoded target.

## 6. Page Structure

Intended page sections:

- Hero
  - "Your Personal Operating Profile"
  - "X of Y available chapters complete"
  - Concise explanatory copy
- Profile Progress
  - Dynamic chapter map based on published assessment versions
- Available Chapters
  - One card per published, user-accessible assessment
- Recommended Next Chapter
  - Start or continue the most relevant incomplete assessment
- Completed Reports
  - Direct access to ready reports, if useful

Explicitly excluded:

- Combined operating profile
- Integrated profile summary
- Cross-assessment synthesis
- Global Sonartra type

## 7. Completed Card Requirements

For `results_ready` cards, the card may show:

- assessment title
- top signal
- ranked signal stack
- optional score shape badge
- concise persisted takeaway if available
- View report CTA

Allowed persisted payload fields:

- `assessment`
- `topSignal`
- `rankedSignals`
- `normalizedScores`
- `scoreShape`
- `recognition`
- `patternSynthesis`
- `closingIntegration`

The Workspace may display these fields only after they already exist in `results.canonical_result_payload`.

## 8. Incomplete Card Requirements

For `not_started` and `in_progress` cards, the card may show:

- assessment title
- short published metadata description
- status
- Start chapter or Continue chapter CTA

Do not show fake ranked signals. Do not show signal placeholders. Do not infer likely future result content.

## 9. Sidebar Changes

Intended later sidebar changes:

Keep:

- Workspace
- Settings
- Admin, where authorised

Remove from sidebar:

- Assessments
- Results
- Voice Assessment

Add:

- Library
- Support

Assessment start/resume and report viewing should be accessed from Workspace cards. Do not delete underlying routes unless a separate task confirms they are unused and safe to remove.

## 10. Library Scope

Future route shell scope only:

- Premium reading area for assessment-related content.

Example categories:

- Flow State
- Leadership
- Decision Making
- Communication
- Work Energy
- Conflict
- Case studies
- Guides

Do not build CMS, recommendations, or personalised content logic in the first Library task.

## 11. Support Scope

Future route shell scope only:

- Premium support area for technical issues.
- Premium support area for account support.
- Premium support area for billing/general support.
- Premium support area for general help.

Do not build a full support ticket system unless separately scoped.

## 12. Architecture Boundary

The Workspace is a retrieval/display layer.

It must not:

- run scoring
- classify score shape
- generate pattern keys
- perform result-language lookup
- assemble new result meaning
- generate cross-assessment interpretation

Active ranked-pattern engine boundaries:

- one active domain per assessment version
- exactly four scored signals
- deterministic option-to-signal scoring
- normalized ranked signal percentages
- score_shape classification
- one generated pattern_key
- one persisted canonical_result_payload

## 13. Visual Direction

The intended style is:

- premium
- dark editorial
- calm
- concise
- clear hierarchy
- restrained gamification
- signal-teal accent usage where consistent with the existing brand system
- responsive card grid
- no cartoon game mechanics
- no confetti, trophies, leaderboards, or noisy badges

## 14. QA Requirements

Later implementation tasks should verify:

- published assessments appear dynamically
- unpublished assessments do not appear
- progress denominator is dynamic
- completed cards render from `canonical_result_payload`
- incomplete cards render from metadata only
- no combined profile summary appears
- sidebar removes Assessments, Results, and Voice Assessment
- sidebar includes Library and Support
- direct result links still work
- start/continue CTAs still work
- responsive layout works on desktop, tablet, and mobile
- no runtime scoring or result recomputation is introduced

## 15. MCP / Browser QA Note

Use Chrome DevTools MCP for visual inspection where relevant. Use Playwright MCP where useful for browser-flow checks.

For this documentation-only task, MCP usage is optional and likely not required.
