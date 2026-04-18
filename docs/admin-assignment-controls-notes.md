# Admin Assignment Controls Notes

1. Controls added
- `/admin/users/[userId]` now includes a live assignment controls surface with:
- add assignment from published assessment versions
- deterministic position selection
- move earlier / move later controls
- safe removal for editable records only

2. Mutation rule set chosen
- only `user_assessment_assignments` are mutated
- only untouched `assigned` rows in the editable suffix can move or be removed
- started and completed rows remain fixed
- new assignments can only be inserted inside that editable suffix
- exact duplicate `assessment_version_id` assignments for one user are rejected

3. What can and cannot be reordered
- reorder is allowed only among adjacent untouched `assigned` rows after the last historical record
- reorder is blocked for rows with an `attempt_id`, `started_at`, `completed_at`, or canonical result history
- reorder is also blocked if the move would cross the fixed historical prefix

4. What can and cannot be removed
- removal is allowed only for untouched `assigned` rows with no attempt linkage and no result history
- started and completed assignments cannot be removed from this surface

5. How transactional order consistency is preserved
- create, reorder, and remove run inside one database transaction
- affected rows are moved into a temporary high order range first
- final `order_index` values are then rewritten contiguously so the user sequence stays deterministic with no gaps or duplicates

6. How result and attempt integrity is preserved
- attempts and results are never mutated or deleted here
- historical rows stay fixed so canonical `assignment -> attempt -> result` resolution remains intact
- the detail page re-renders from the standard persisted view-model after mutation

7. Intentionally deferred
- bulk assignment
- archive/disable lifecycle variants
- editing started or completed assignment history
- any mutation of attempts, responses, results, or derived current-state fields
