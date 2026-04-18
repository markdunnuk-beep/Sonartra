1. Route added
`/admin/users/[userId]` via `app/(admin)/admin/users/[userId]/page.tsx`.

2. Query/view-model approach
`lib/server/admin-user-detail.ts` loads one internal user plus assignment, attempt, assessment-version, and result joins, then maps that persisted data into a compact server view-model for the page.

3. Timeline ordering rule
Assignments render in ascending `order_index`. Ties fall back to assignment id for deterministic output.

4. How current assessment is derived
Current assessment is the lowest `order_index` assignment where `status != completed`.

5. How next assessment is derived
Next assessment is the first assignment after the current incomplete assignment in the same ordered sequence. If all assignments are completed, next assessment is `null`.

6. How result links are resolved
Result links come only from the canonical `assignment -> attempt -> result` path and are formatted with the existing assessment-mode result href helper.

7. Access control path used
The route sits under the existing `(admin)` layout, which already enforces the canonical `proxy.ts -> clerkMiddleware() -> request-user -> admin-access` runtime path.

8. What was intentionally deferred to Task 6+
Assignment mutations, sequencing controls, reassignment flows, and any write actions remain deferred. This page is read-only apart from canonical result links.
