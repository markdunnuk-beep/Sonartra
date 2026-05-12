All support implementation tasks must read this document before making changes. If a task discovers a repo convention that conflicts with this plan, preserve the plan’s product intent but follow the repo’s established technical convention where safe. Do not expand v1 scope without explicit approval.

# Sonartra Support Module Build Plan

## Purpose

This document defines the v1 implementation plan for the authenticated `/app/support` experience and the admin support workflow. It is intended to be the reference plan for building Sonartra support cases after the current support shell.

The support build is native-first and integration-ready. Sonartra should own the v1 support experience and data model while preserving a clean path to a future Zendesk, Intercom, Freshdesk, or equivalent helpdesk integration.

## Engine Boundary

The support module is separate from the Sonartra ranked-pattern assessment engine.

Support tickets must not interact with assessment scoring, normalization, result payload generation, result retrieval, runner logic, import workflows, or assessment admin workflows. The active assessment engine remains single-domain ranked-pattern only, with one canonical persisted result payload. Support may reference a user account or, in a future explicitly scoped extension, a result or attempt identifier for context, but it must not compute from, mutate, or render assessment payloads.

## Recommended V1 Direction

Build native Sonartra support cases now.

Use Supabase/Postgres as the source of truth for v1 support data. The first functional version should include user support cases, threaded messages, an admin queue, a status lifecycle, and transactional email notifications.

Do not integrate Zendesk, Intercom, Freshdesk, MCP, live chat, reply-by-email, attachments, SLA automation, or macros in v1.

Preserve optionality for a future third-party helpdesk integration through nullable external-provider fields and a service layer that keeps the UI independent from storage/provider details.

## V1 Product Scope

### User Capabilities

- User can create a support request.
- User can choose a category.
- User can view their own support cases.
- User can open a case detail view.
- User can see the message thread.
- User can reply to an open case.
- User can see status, category, priority, reference, and date metadata.
- User receives relevant email notifications.

### Admin Capabilities

- Admin can view all support cases.
- Admin can filter cases by status, category, and priority.
- Admin can view case detail.
- Admin can reply to users.
- Admin can change status.
- Admin can change priority if implemented.
- Admin can add internal notes if supported cleanly and safely hidden from users.
- Admin receives relevant email notifications.

## Non-Goals

- No third-party helpdesk dependency.
- No Zendesk, Intercom, or Freshdesk integration.
- No MCP integration.
- No live chat.
- No reply-by-email.
- No attachments.
- No SLA engine.
- No automation macros.
- No complex assignment or workload management.
- No support analytics dashboard.
- No changes to assessment engine contracts.
- No support-side scoring, result-payload computation, runner mutation, or assessment import changes.

## Proposed Routes

- `/app/support`
- `/app/support/[caseReference]` or `/app/support/[caseId]`, depending on existing route conventions.
- `/app/admin/support`
- `/app/admin/support/[caseReference]` or `/app/admin/support/[caseId]`, depending on existing route conventions.

User-facing URLs should preferably expose stable public references such as `SUP-000001` rather than raw database IDs. Raw IDs may remain internal database identifiers.

## Data Model Proposal

### `support_cases`

- `id`
- `public_reference`, for example `SUP-000001`
- `user_id`
- `category`
- `subject`
- `description` or `initial_message_snapshot`
- `status`
- `priority`
- `assigned_admin_id` nullable
- `external_provider` nullable
- `external_ticket_id` nullable
- `external_customer_id` nullable
- `external_synced_at` nullable
- `created_at`
- `updated_at`
- `resolved_at` nullable
- `closed_at` nullable

### `support_messages`

- `id`
- `case_id`
- `author_user_id` nullable
- `author_type`: `user`, `admin`, or `system`
- `body`
- `is_internal_note` boolean default `false`
- `created_at`

### `support_case_events`

- `id`
- `case_id`
- `actor_user_id` nullable
- `event_type`
- `from_value` nullable
- `to_value` nullable
- `metadata` json/jsonb nullable
- `created_at`

### Optional Category Table

Add `support_categories` only if the repo already favours lookup tables for controlled product values. Otherwise, keep categories as controlled code values enforced in application code and database constraints.

## Controlled Values

### Categories

- `technical_issue`
- `account_support`
- `billing_access`
- `feedback`
- `general_question`

### Statuses

- `open`
- `waiting_on_sonartra`
- `waiting_on_user`
- `resolved`
- `closed`

### Priorities

- `low`
- `normal`
- `high`
- `urgent`

V1 can default priority to `normal` unless an admin changes it.

## Access Control And RLS Requirements

- Users can only read their own support cases.
- Users can only create cases for themselves.
- Users can only add public messages to their own non-closed cases.
- Users cannot view internal notes.
- Admins can view and manage all cases.
- Admins can add public replies and internal notes.
- Admins can change status and priority.
- Service-role operations should be limited to trusted server-side code.

RLS policies should treat user and admin access separately. Internal-note filtering must be enforced server-side and, where possible, at the database policy/query layer rather than relying on UI hiding alone.

## Service Layer Requirement

All support operations should go through a support service layer rather than coupling UI components directly to database queries.

Expected service functions:

- `listCurrentUserSupportCases`
- `getCurrentUserSupportCase`
- `createSupportCase`
- `addCurrentUserSupportMessage`
- `listAdminSupportCases`
- `getAdminSupportCase`
- `addAdminSupportReply`
- `addAdminInternalNote`, optional
- `updateAdminSupportCaseStatus`
- `updateAdminSupportCasePriority`, optional

This abstraction preserves the option to later swap or sync the backend with Zendesk, Intercom, Freshdesk, or another provider without rewriting user and admin route components around provider-specific APIs.

## User UI Plan

The `/app/support` experience should keep the current authenticated shell and visual direction where possible while becoming a real cases area.

V1 user UI should include:

- Empty state when no cases exist.
- Case list when cases exist.
- Create request form, modal, or page.
- Case detail view.
- Message thread.
- Reply composer.
- Status, category, priority, reference, and date metadata.
- Loading, error, empty, and success states.

The user-facing page should stay operational and calm. It should not read like a knowledge base, marketing page, assessment result, or admin console.

## Admin UI Plan

The `/app/admin/support` experience should be admin-only.

V1 admin UI should include:

- Case queue/table.
- Filters for status, category, and priority.
- Case detail view.
- Message thread.
- Admin reply composer.
- Status controls.
- Priority controls if implemented.
- Internal note support only if straightforward and safely hidden from users.

Admin support surfaces should remain separate from assessment admin workflows. Support case status must not be confused with assessment attempt status or result readiness.

## Email Notification Plan

V1 should use transactional emails for key support events.

### User Creates Case

- Email user confirmation.
- Email support/admin notification.

### Admin Replies

- Email user notification.

### User Replies

- Email support/admin notification.

### Case Resolved Or Closed

- Email user notification, optional but preferred.

Email notifications should use existing project email infrastructure if present. Reply-by-email is out of scope. Emails should direct users back to their support case in Sonartra.

## Future Third-Party Integration Posture

Native Sonartra support is the v1 source of truth.

Third-party helpdesk integration is a future adapter, not a v1 dependency. Nullable external fields should be included to make future integration easier:

- `external_provider`
- `external_ticket_id`
- `external_customer_id`
- `external_synced_at`

Future options could include:

- Zendesk as the full support backend.
- Zendesk as the admin backend with a Sonartra customer portal.
- Intercom, Freshdesk, or another provider behind the same service-layer contract.
- A simple portal/widget replacement if native support remains intentionally lightweight.

The support service layer should isolate UI routes from provider-specific implementation details. Provider sync should be additive and explicit, not a hidden replacement for v1 database state.

## Suggested Codex Task Sequence

### Task 01 — Support Data Model And RLS

- Add support tables for cases, messages, and events.
- Add controlled values for category, status, and priority.
- Add RLS policies for current-user and admin access.
- Include nullable external-provider fields for future integration.
- Non-goal: do not build UI, email, or third-party helpdesk sync.
- Non-goal: do not touch assessment engine, result payloads, runner logic, or imports.

### Task 02 — Support Server Service Layer

- Create server-side service functions for user and admin support operations.
- Keep database access out of route components where possible.
- Enforce access checks and internal-note visibility in the service layer.
- Return route-friendly view models without assessment scoring or result rendering logic.
- Non-goal: do not create UI beyond what is needed for compile-safe integration.
- Non-goal: do not add external provider API calls.

### Task 03 — User Support Case Creation

- Add the create-support-request flow for authenticated users.
- Capture category, subject, and description/opening message.
- Persist the case and initial message through the service layer.
- Show success and error states.
- Non-goal: do not add admin queue actions yet.
- Non-goal: do not add attachments, live chat, or reply-by-email.

### Task 04 — User Support Case List And Detail View

- Populate `/app/support` with the current user's cases.
- Add a user case detail route using stable public references where practical.
- Show status, category, priority, reference, created date, and updated date.
- Render the public message thread.
- Preserve loading, error, empty, and success states.
- Non-goal: do not show internal notes to users.

### Task 05 — User Support Message Replies

- Add a reply composer for open, non-closed user-owned cases.
- Persist user replies as public support messages.
- Prevent replies on closed cases.
- Update case status where the lifecycle requires it, for example to `waiting_on_sonartra`.
- Non-goal: do not implement reply-by-email.
- Non-goal: do not add support analytics or macros.

### Task 06 — Admin Support Queue

- Add `/app/admin/support` as an admin-only route.
- Show all support cases in a queue/table.
- Add filters for status, category, and priority.
- Keep admin support navigation separate from assessment admin workflows.
- Non-goal: do not add complex assignment or workload management.
- Non-goal: do not change assessment admin routes or imports.

### Task 07 — Admin Support Case Actions And Replies

- Add admin case detail route.
- Render full public thread and, if implemented, internal notes.
- Add admin public reply composer.
- Add status controls and priority controls if implemented.
- Add internal notes only if they can be safely hidden from users.
- Non-goal: do not add SLA automation, macros, or external-provider sync.

### Task 08 — Email Notifications And Final QA

- Send confirmation email when a user creates a case.
- Send support/admin notification when a user creates or replies to a case.
- Send user notification when an admin replies.
- Send resolved/closed user notification if included in v1.
- Verify emails link back to the Sonartra case detail route.
- Non-goal: do not implement reply-by-email or live chat.

### Optional Task 09 — Support Polish And Production Hardening

- Refine empty states, metadata density, responsive behavior, and admin queue scanning.
- Add focused production-readiness checks for RLS, internal-note visibility, and closed-case behavior.
- Review transactional email wording and failure handling.
- Consider minimal operational reporting only if directly needed.
- Non-goal: do not add a support analytics dashboard.
- Non-goal: do not introduce a third-party helpdesk dependency.

## Acceptance Criteria For This Documentation Task

This task is complete when:

- `docs/support/support-build-plan.md` exists.
- It clearly defines native-first, integration-ready v1.
- It separates support from the ranked-pattern assessment engine.
- It documents scope, non-goals, data model, routes, service layer, RLS, user UI, admin UI, email behaviour, and future integration posture.
- It includes the 8-task implementation sequence plus optional task 9.
- No implementation files are changed except the new markdown document and any required docs folder creation.

Validation for this task:

- Run `git diff` to confirm only `docs/support/support-build-plan.md` was added or changed.
- No lint/build is required for a markdown-only task.
- Run docs formatting only if the repo has a docs-specific formatting command.

## Assumptions

- `/app/support` already has an authenticated shell that should be retained where possible.
- The admin route convention will be confirmed during implementation before choosing reference-based or ID-based detail URLs.
- Existing project email infrastructure, if present, should be reused; if none exists, the email implementation task should choose the smallest project-consistent transactional email path.
- Support categories are controlled code values unless the implementation phase finds an existing repo preference for lookup tables.
