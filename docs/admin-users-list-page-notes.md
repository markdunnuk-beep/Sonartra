# Admin Users List Page Notes

1. Route added
- canonical admin users registry route:
  - [`/admin/users`](/C:/Projects/sonartra-build/Sonartra/app/(admin)/admin/users/page.tsx)

2. Query/view-model approach
- one server-side view-model builder:
  - [`lib/server/admin-users-list.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/admin-users-list.ts)
- page renders the view-model only through:
  - [`components/admin/admin-users-registry.tsx`](/C:/Projects/sonartra-build/Sonartra/components/admin/admin-users-registry.tsx)

3. How current assessment is derived
- current assessment = the lowest `order_index` assignment where `status != completed`
- if no assignments exist, current assessment is `null`
- if all assignments are completed, current assessment is `null`

4. How next assessment is derived
- next assessment = the first assignment after the current incomplete assignment by `order_index`
- if there is no current incomplete assignment, next assessment is `null`

5. Supported search/filter params
- `q`
  - case-insensitive search across name and email
- `status`
  - `active`
  - `invited`
  - `disabled`
- `progress`
  - `not_started`
  - `in_progress`
  - `completed`
- invalid params fall back safely to `all`

6. Access control path used
- the page stays under the canonical admin route group and reuses:
  - `proxy.ts` + `clerkMiddleware()`
  - [`lib/server/request-user.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/request-user.ts)
  - [`lib/server/admin-access.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/admin-access.ts)
  - [`app/(admin)/layout.tsx`](/C:/Projects/sonartra-build/Sonartra/app/(admin)/layout.tsx)

7. How this task reuses the existing middleware/request-user/admin-access foundation
- no Clerk calls were added to the users list page rendering path
- no parallel auth path was introduced
- the page reads internal persisted data only
- admin protection remains enforced by the shared admin shell/layout path

8. What was intentionally deferred to Task 5+
- individual user detail page implementation
- assignment editing controls
- bulk assignment / invitations
- organisation tooling beyond the current nullable field
