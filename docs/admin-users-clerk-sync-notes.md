# Admin Users Clerk Sync Notes

## Sync Model

- Clerk webhooks are the canonical sync path
- `user.created` and `user.updated` upsert the internal `users` row by `clerk_user_id`
- `user.deleted` does not hard delete; it marks the internal user as `disabled`

## First-Request Repair

- authenticated server resolution uses `auth()` plus `currentUser()`
- if the Clerk user exists but the internal row is missing, the server creates it
- if the row exists, safe profile fields are repaired idempotently
- this is a repair path only, not a second identity system

## Clerk-Synced vs App-Owned Fields

Synced from Clerk:

- `clerk_user_id`
- `email`
- `name`

Owned by the app:

- `id`
- `role`
- `status`
- `organisation_id`

Webhook and repair sync do not overwrite `role`.
Webhook and repair sync do not reactivate `disabled` users.

## Deleted User Policy

- Clerk deletion marks the internal user as `disabled`
- internal rows are preserved to avoid breaking attempts, results, assignments, and audit history
- no hard delete path is introduced

## Admin Resolution

- admin access resolves from `users.role`
- authenticated Clerk sessions alone do not grant admin access
- later route protection can reuse `requireAdminUser()` without reintroducing email-based checks

## Route Protection Assumptions

- user-owned server reads should resolve through `requireCurrentUser()`
- admin server reads should resolve through `requireAdminUser()`
- disabled users should fail closed at the server helper layer
