# Admin Users Domain Contract

## 1. Purpose

The Admin Users page is responsible for:

- presenting the canonical admin view of app users
- resolving user identity through the internal user record
- showing deterministic assessment assignment state for each user
- showing the ordered assessment timeline for each user
- linking administrators to persisted attempts and persisted results
- supporting enforceable access control boundaries for admin and user routes

The Admin Users page is not responsible for:

- computing scores
- generating or recalculating results
- changing engine behaviour
- introducing parallel workflow logic
- acting as a CRM
- acting as an analytics engine
- performing organisation orchestration
- performing bulk assignment automation

## 2. Core Concept

The canonical definition of a user in this domain is:

> A timeline of assessment execution governed by deterministic assignment state.

This definition is mandatory for MVP.

The Admin Users domain does not treat a user as:

- a marketing contact
- a lead record
- a loose identity record without assignment history
- an analytics aggregate

The canonical admin view of a user is the combination of:

- one internal user identity
- one external Clerk identity
- zero or more ordered assessment assignments
- zero or more persisted attempts
- zero or more persisted results

## 3. User Identity Model

### Canonical entities

`internal user`

- the application-owned user record
- the canonical subject for assignments, attempts, results, and access control
- all runtime relationships must resolve through `user.id`

`clerk_user_id`

- the external identity key issued by Clerk
- the source of truth for authenticated identity
- used only to resolve the internal user record

### Mapping rules

The mapping between `internal user` and `clerk_user_id` is mandatory and unambiguous.

- one internal user maps to exactly one `clerk_user_id`
- one `clerk_user_id` maps to exactly one internal user
- no orphan internal users are permitted
- no runtime ambiguity is permitted
- no authenticated request may proceed without resolving `clerk_user_id` to one internal `user.id`
- email and name are descriptive fields, not identity keys

### Required fields

The canonical user record must expose these fields:

- `id` (`uuid`)
- `clerk_user_id` (`string`)
- `email`
- `name`
- `organisation_id` (`nullable`)
- `created_at`
- `updated_at`

### Field rules

- `id` is the internal primary identifier for all app-level relations
- `clerk_user_id` is required for all active authenticated users
- `email` is required for display and administration, but must not be used as the primary identity join
- `name` is required for display and administration
- `organisation_id` may be `null` in MVP and does not change user identity rules
- `created_at` and `updated_at` are required audit fields

## 4. User State Model

### Canonical user status

The Admin Users domain defines these canonical user status values:

- `active`
- `invited`
- `disabled`

Rules:

- `active` is the default operational state for a user who can access the application
- `invited` is defined now for contract completeness, even if invitation flow is not implemented yet
- `disabled` is defined now for contract completeness, even if disable flow is not implemented yet
- no additional user status values are permitted without updating this contract

### Canonical assessment state

The assignment-level assessment state is a strict enum.

Allowed values:

- `not_assigned`
- `assigned`
- `in_progress`
- `completed`

Rules:

- this enum is closed
- no additional states are allowed
- these values define the admin assignment view only
- result readiness remains part of the result pipeline and must not be duplicated here

## 5. User Assessment Timeline Model

### Canonical structure

`UserAssessmentAssignment`

- `id`
- `user_id`
- `assessment_id`
- `assessment_version_id`
- `status`
- `order_index`
- `assigned_at`
- `started_at`
- `completed_at`

### Structural rules

- one user can have multiple assignments
- each assignment belongs to exactly one user
- each assignment targets exactly one assessment and one assessment version
- `order_index` is required and defines deterministic sequence
- `order_index` must be an integer
- assignment ordering must be stable and explicit

### State transition rules

- `not_assigned` means no assignment exists for that assessment position in the user timeline
- `assigned` means the assignment exists but work has not started
- `in_progress` means execution has started but is not complete
- `completed` means the assigned assessment has been completed in the timeline

### Timeline rules

- one user can have multiple assignments across time
- assignment history must remain ordered by `order_index`
- no branching logic is permitted in MVP
- no parallel conflicting assignments are permitted
- the timeline is the only canonical sequencing model for user assessment progression

## 6. Sequencing Rules (MVP)

Sequencing is linear and deterministic.

### Canonical progression rule

The next assessment is determined by:

- the lowest `order_index` where `status != completed`

This rule is mandatory.

### MVP sequencing constraints

- linear progression only
- one canonical next assignment at any time
- no ambiguity in progression order
- no parallel conflicting assignments

### Optional lock rule

The system may lock the next assignment until the previous assignment is completed.

If this rule is used:

- only the first incomplete assignment in sequence is actionable
- later assignments may be visible but must not become active

If this rule is not used:

- sequence order still remains canonical
- the next assignment is still resolved by lowest incomplete `order_index`

### Explicit prohibitions

The MVP must not introduce:

- conditional branching
- signal-based routing
- AI recommendation
- admin-defined dynamic branching
- alternate progression rules outside the ordered assignment timeline

## 7. Clerk Integration Contract

`clerk_user_id` is the source of truth for authenticated identity.

### Canonical resolution rule

Every authenticated app request must resolve identity through:

- `clerk_user_id -> user.id`

All user-owned queries and mutations must operate on the resolved internal `user.id`.

### Internal user creation and resolution

The internal user record must be created or resolved using one of these two supported options:

1. First authenticated request
- on the first valid authenticated request, the system resolves `clerk_user_id`
- if no internal user exists, the system creates it
- subsequent requests reuse the existing internal user

2. Clerk webhook
- on the relevant Clerk user lifecycle webhook, the system creates or updates the internal user
- authenticated requests then resolve the existing internal user by `clerk_user_id`

Both options are valid for MVP.

### Mandatory rules

- no access to app routes without a valid `clerk_user_id`
- no user data query may rely on raw session data alone
- no user-owned query may bypass internal user resolution
- all user data queries must resolve via `clerk_user_id -> user.id`
- the mapping must remain one-to-one
- runtime fallback matching on email is prohibited

## 8. Access Control Rules

Access control has two layers: `ADMIN` and `USER`.

### ADMIN

Only admin users can access `/admin/users`.

The admin role model must be explicit.

MVP placeholder role model:

- `role = admin`
- `role = user`

Rules:

- admin access must be granted by explicit role assignment
- admin access must not be inferred from email domain, organisation, or UI route
- admin reads must use the canonical internal user model

### USER

A user route requires an authenticated Clerk session.

An authenticated user can access only:

- their own results
- their own assignments

Rules:

- the resolved `user.id` must match the `clerk_user_id` mapping for the current session
- user-owned queries must be filtered by the resolved internal `user.id`
- no cross-user access is permitted
- missing ownership and missing records should be treated as the same access outcome where appropriate

### Explicit ownership rule

`user_id` access must always be enforced through the resolved `clerk_user_id` mapping.

No route, query, or action may accept cross-user access based on:

- email
- name
- organisation membership alone
- client-supplied user identifiers without server-side ownership checks

## 9. Result Integration

The Admin Users page does not compute results.

It may reference only:

- attempts
- results

Result rules:

- attempts are execution records, not result records
- results are persisted canonical payloads
- the Admin Users page may display result availability and link to stored results
- the Admin Users page must not recalculate scores, summaries, or rankings
- UI must consume persisted result only

This preserves one engine path and one result contract.

## 10. Non-goals

The Admin Users domain must not expand into these concerns:

- no CRM functionality
- no analytics engine
- no workflow automation
- no org-level orchestration
- no bulk assignment logic

These concerns are out of scope for MVP and must not be implied by this contract.

## 11. Future Extensions (Non-MVP, Not Implemented)

The following may be added later, but are not part of MVP:

- org-level sequencing
- cohort assignment
- automated journeys
- analytics layer

## Validation Checklist

This document is valid only if these conditions hold:

- all enums are explicitly defined
- no conflicting definitions exist between identity, assignment state, and result state
- sequencing rules are deterministic
- Clerk mapping rules are unambiguous
- access control rules are enforceable
- no UI logic is included
- no database migrations are included
- no alternate engine or result path is introduced
