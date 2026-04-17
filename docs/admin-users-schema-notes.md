# Admin Users Schema Notes

## What Was Added

- added a canonical `users` table for internal app identity
- added explicit constrained `role` and `status` fields on `users`
- added `user_assessment_assignments` for deterministic linear sequencing
- migrated `attempts.user_id` from free-text identity to internal `users.id`
- tightened assessment version linkage so assignment and attempt rows cannot point at mismatched assessment/version pairs

## Constrained Values

`users.role`

- `admin`
- `user`

`users.status`

- `active`
- `invited`
- `disabled`

`user_assessment_assignments.status`

- `not_assigned`
- `assigned`
- `in_progress`
- `completed`

## Why Assignment -> Attempt -> Result Was Preserved

- the canonical execution path already runs through `attempts`
- `results` already enforce one row per `attempt_id`
- adding result storage to assignments would duplicate the canonical persisted result path
- the new schema therefore links an assignment to at most one attempt, and result discovery continues through `assignment -> attempt -> result`

## Task 1 Clarifications Now Supported

- `assigned -> in_progress` is anchored to a linked attempt plus `started_at`; the migration notes that the first persisted response is the service-layer trigger for the transition
- an `assigned` row may already carry `attempt_id`; the state does not become `in_progress` until the first persisted response is recorded
- current assessment remains deterministic because no separate current-state flag was added; it is derived from the lowest `order_index` where status is not `completed`
- the locking rule is supported by the sequencing model because assignments are unique per `user_id + order_index` and remain linear
- admin access is runtime-resolvable because `users.role` is now explicit and constrained
- result linkage is deterministic because `user_assessment_assignments.attempt_id` is unique and results stay attached to attempts only

## DB vs Service Layer

Database-enforced:

- one-to-one `clerk_user_id` mapping inside `users`
- explicit allowed `role`, `status`, and assignment status values
- unique assignment ordering per user
- one assignment to at most one attempt
- assignment attempt linkage must match the same user, assessment, and assessment version
- timestamp/state integrity for assignment lifecycle rows

Service-layer enforced:

- creating or resolving the internal user from Clerk
- transitioning `assigned` to `in_progress` when the first response is recorded
- applying the lock rule that only the first incomplete assignment is available
- reading the current assignment from `order_index` rather than storing a mutable flag
