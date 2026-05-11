# Support Ticket System Direction Audit

## Executive Summary

The authenticated `/app/support` route is currently a premium static support shell. It introduces support categories and sets the expectation that a support desk is coming, but it does not yet behave like a case or ticket system.

The Vercel support cases reference is useful as a structural UX benchmark: a support area can lead with a concise cases index, a clear create-case entry point, lightweight search/filter controls, and an empty state that explains what to do next. Sonartra should use those patterns only as product-structure inspiration, not as copied branding, copy, terminology, or visual treatment.

Recommended next implementation task: build a UI-only ticket-based Support page with a cases list shell, empty state, category entry points, and create-support-request modal or page shell. Do not add persistence, database migrations, email, admin queues, or external support integrations in that first refactor.

## Current Sonartra Support Page Map

Current route:

- `/app/support`
- File: `app/(user)/app/support/page.tsx`
- Shell: authenticated user app shell through `app/(user)/app/layout.tsx` and `components/user/user-app-shell.tsx`
- Navigation entry: `components/user/app-shell-nav.ts`

Current page structure:

- Hero card using `SurfaceCard accent`
  - Eyebrow: `Help desk`
  - Heading: `Support`
  - Supporting copy for technical issues, account questions, billing, and general Sonartra support
  - Right-side supporting panel labelled `Support shell`
- Support options section
  - Section header: `Support options` / `How we can help`
  - Four static support option cards
- Empty state
  - Title: `The support desk is being prepared`
  - Copy clarifies that no support records are created and assessment data is not changed

Current cards/options:

- Technical issue
- Account support
- Billing or access
- General question

Current CTA behaviour:

- There is no actionable CTA in the page content.
- Cards are non-functional static cards.
- There is no create-ticket form, modal, link, button, or case detail route.

Current styling conventions:

- Uses the shared authenticated app primitives: `PageFrame`, `SurfaceCard`, `SectionHeader`, `LabelPill`, and `EmptyState`.
- Matches the current premium dark editorial app style.
- Uses restrained signal-teal accents.
- Uses a responsive card grid: four columns at wide desktop, two columns at medium widths, single-column on mobile.
- Keeps copy calm and non-alarming.

Current route shell limitations:

- It does not show existing cases or a case history area.
- It does not communicate a support-case lifecycle.
- It does not provide a primary create-support-request entry point.
- It does not show status, severity, category, timestamps, or ownership metadata.
- It does not distinguish between help content and case management.
- It has no persistence, backend service, admin handling model, or message thread.

What should be retained:

- The premium dark authenticated app shell.
- The four broad support categories as a useful starting taxonomy.
- The explicit guardrail that the shell does not create records or change assessment data.
- The calm tone and concise page hierarchy.
- Responsive card behaviour and shared user-app primitives.

What should be replaced for a ticket-based system:

- Replace the static "support desk being prepared" repeated card footer with real case-status affordances once the UI shell is ready.
- Replace the purely category-card page structure with a cases-first page structure.
- Add a primary "Create support request" CTA.
- Add a cases list/table shell with empty state.
- Add visible lifecycle labels such as Open, Waiting on Sonartra, Waiting on you, and Resolved.
- Add a clear separation between "create a request" and "review existing cases".

## Vercel Reference UX Observations

Chrome DevTools MCP inspected the locally opened Vercel support cases page. This audit intentionally omits account names, project names, private identifiers, and any possible support-case content.

Observed page layout structure:

- A product/account shell surrounds the support area.
- The support area has a compact page header/breadcrumb hierarchy.
- The active view is a `Cases` index.
- The case-management controls are placed near the page header rather than buried below explanatory content.
- A primary `New Case` action is visible near the top of the cases view.

Support/case list structure:

- The page is structured as a cases index even when there are no cases.
- A search input is present in the case-list control row.
- Status and severity filters are present as dropdown-style controls.
- The empty state occupies the list area.
- The empty state includes a second create-case action.

Empty-state handling:

- The empty state is brief and directly tied to the case action.
- The page still shows the future list controls even when the list is empty.
- Empty state does not replace the whole page; it sits inside the cases surface.

Primary CTA placement:

- A primary create-case CTA appears in the top control row.
- The same action is repeated in the empty state for discoverability.
- The create flow appears to route to a help/case creation entry point.

Filtering/search/sorting patterns:

- Search is visible in the cases control row.
- Status filter is visible.
- Severity filter is visible.
- In the inspected empty state, some controls were disabled, which implies the controls become useful when cases exist.
- No sorting pattern was clearly visible in the empty state.

Status labels or case metadata patterns:

- No actual case rows were visible in the inspected state.
- The visible controls imply future case metadata by status and severity.
- A Sonartra implementation should add its own metadata model rather than copying terminology wholesale.

Navigation hierarchy:

- Support is one area within a larger app shell.
- Cases are a sub-view within Support.
- The page keeps global navigation separate from case controls.

Page density and spacing:

- The page is compact and operational.
- It avoids a large marketing-style hero.
- It prioritises the user's next action and case list area.

Responsive behaviour:

- At mobile width, the page reduces to a compact cases view.
- The primary create action remains visible.
- Search/filter controls remain present, with compact layout.
- No horizontal overflow was observed during the browser pass.

Interaction model:

- Open Support > view cases index > create a new case or filter/search existing cases.
- Empty list state still teaches the workflow.
- The case creation action is a route/flow entry point, not a passive category card.

## Recommended Sonartra Support Direction

Sonartra should evolve `/app/support` from a category shell into a case-oriented support area. The first version should remain UI-only unless persistence is separately scoped.

Recommended support model:

- Support landing page doubles as the cases index.
- Primary action: `Create support request`.
- Secondary structure: category cards for common request types.
- Main operational surface: `Your support cases`.
- Empty state: no support requests yet, with a create-support-request CTA.
- Case states:
  - Open
  - Waiting on Sonartra
  - Waiting on you
  - Resolved
- Case metadata in the UI shell:
  - Category
  - Subject
  - Status
  - Priority/severity
  - Updated date
  - Optional related assessment/report context

Recommended copy direction:

- Use Sonartra language: `support request`, `support case`, `case`, or `request`.
- Avoid implying a live SLA, email workflow, or staff response until those systems exist.
- Keep wording calm, precise, and operational.
- Do not present support requests as assessment results or profile content.

Recommended CTAs:

- Primary: `Create support request`
- Empty state: `Create your first support request`
- Category cards may say `Prepare request` or remain non-functional in the UI-only phase.

Recommended responsive behaviour:

- Desktop: two-column top band or compact header, followed by cases list/table and category cards.
- Tablet: cases list becomes stacked rows, category cards become two columns.
- Mobile: primary CTA remains near the top; cases become stacked cards; filters collapse into a compact control row or drawer.

What to avoid:

- Do not build a full ticket backend in the first refactor.
- Do not invent a fake support email or external destination.
- Do not expose admin support views to normal users.
- Do not mix support-case status with assessment attempt/result status.
- Do not create noisy badges, gamified status, or marketing-style hero content.

## Proposed Phased Implementation Plan

### Phase 1: UI-Only Ticket Shell

Scope:

- Rebuild `/app/support` as a ticket/case-oriented page.
- Add a clear page header and `Create support request` CTA.
- Add category cards for Technical issue, Account support, Billing or access, and General question.
- Add `Your support cases` list/table shell.
- Add empty state for no support cases.
- Add non-persistent status labels for the visual model:
  - Open
  - Waiting on Sonartra
  - Waiting on you
  - Resolved
- Add source-level tests guarding that no persistence or backend support infrastructure is imported.

Out of scope:

- Database tables.
- Migrations.
- Server actions.
- Ticket persistence.
- Email notifications.
- Admin queues.
- Third-party support integrations.

### Phase 2: Functional Ticket Submission

Scope:

- Authenticated create-ticket form.
- Fields:
  - Category
  - Subject
  - Description
  - Severity
  - Optional related assessment/report/attempt context
- Persisted `support_cases` table.
- Persisted `support_case_messages` table or equivalent.
- User-facing support case detail page.
- Basic lifecycle:
  - Open
  - Waiting on Sonartra
  - Waiting on you
  - Resolved
- Basic read permissions so users only see their own cases.

Out of scope unless separately scoped:

- Admin assignment workflow.
- Email notifications.
- Attachments.
- SLA reporting.
- External helpdesk integration.

### Phase 3: Admin Support Handling

Scope:

- Admin support queue.
- Case assignment.
- Internal notes.
- Staff/user response thread.
- Status changes and audit events.
- Email notifications.
- SLA/status reporting.
- Attachment handling if required.

Access boundary:

- Admin support functions must remain admin-only.
- Normal users must not see internal notes, assignment metadata, or admin queues.

## Suggested UI-Only Next Task

Recommended next implementation task:

Build a UI-only ticket-based `/app/support` page with a cases shell and create-request entry point, without persistence.

Suggested acceptance criteria:

- `/app/support` keeps authenticated app shell.
- Page heading remains `Support`.
- Page has a primary `Create support request` CTA.
- Page includes `Your support cases`.
- Page includes a no-cases empty state.
- Page includes category cards.
- Page includes visual-only status labels for the future status model.
- Page has no database imports, server actions, migrations, email integrations, or ticket persistence.
- Existing Support nav entry continues to work.
- Browser QA covers desktop and mobile.

## Future Data Model Considerations

Potential future concepts:

- `support_cases`
- `support_case_messages`
- `support_case_attachments`
- `support_case_events`
- `support_case_status`
- `support_case_category`
- `support_case_priority`

Likely `support_cases` fields:

- id
- user id
- organisation/account id if applicable
- category
- subject
- description or opening message
- status
- priority/severity
- created timestamp
- updated timestamp
- resolved timestamp
- assigned admin id, in Phase 3 only

Likely relationships:

- Authenticated user: required owner of each case.
- Assessment key/version: optional context for chapter-related support.
- Result id: optional context for report-related support.
- Attempt id: optional context for runner/completion issues.
- Account/billing issue: optional category/context rather than an assessment relationship.

Important modelling caution:

- Support status must remain separate from assessment attempt status and result readiness status.
- Support cases must not read, compute, mutate, or reinterpret `results.canonical_result_payload`.
- Support cases should only link to assessment/result context by identifier when explicitly provided or selected.

## Risks and Cautions

- Do not build support ticket persistence until separately scoped.
- Do not add database migrations in the first UI refactor.
- Do not connect to email or support tools yet.
- Do not expose admin support functions to normal users.
- Do not add combined assessment/result logic.
- Do not touch scoring, normalization, import, result assembly, result payload generation, or Workspace read models.
- Do not copy Vercel branding, exact copy, proprietary UI, or product-specific terminology.
- Do not include private account, project, or case data from reference pages in Sonartra docs.
- Do not let the Support page become a knowledge-base or Library replacement.
- Do not use Support categories as a hidden routing layer until a real support flow is scoped.

## Chrome DevTools MCP Observations

Current Sonartra `/app/support`:

- Desktop around 1440px:
  - Authenticated app shell rendered.
  - Sidebar included Workspace, Library, Support, and Settings.
  - Support page displayed hero, four support option cards, and one empty state.
  - No in-page links or active CTAs were present.
  - No horizontal overflow was detected.
- Mobile around 390px:
  - Mobile app top bar rendered.
  - Support content collapsed to stacked cards.
  - No horizontal overflow was detected.

Vercel support cases reference:

- Desktop around 1440px:
  - Cases index was visible inside a broader app shell.
  - A create-case action appeared in the top control row.
  - Search and filter controls were visible.
  - Empty state was shown inside the cases area.
  - A second create-case action appeared in the empty state.
  - No horizontal overflow was detected.
- Mobile around 390px:
  - Cases view remained compact.
  - Create action and filters remained visible.
  - Empty state remained concise.
  - No horizontal overflow was detected.

Privacy note:

- The Vercel page contained account/project chrome. This audit records only generic UX patterns and omits private identifiers and content.

## Final Recommendation

Move next to a UI-only Sonartra support cases shell. Keep the current premium visual language, but restructure `/app/support` around a primary create-support-request action and a cases index empty state. Do not implement persistence, migrations, email, admin queues, or external support integrations until a separate backend support task is explicitly scoped.
