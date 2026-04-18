# Preview Route Regression Investigation

## 1. Symptom Summary

- Failing routes:
  - `https://sonartra.vercel.app/app/workspace`
  - `https://sonartra.vercel.app/admin`
- Observed behaviour:
  - in an isolated browser context with no persisted session state, both routes returned the Next.js server error page: `This page couldn’t load` / `A server error occurred. Reload to try again.`
  - in a session that already had valid auth state, the same routes could render successfully
- Reproducibility:
  - reproducible against the deployed preview/runtime in an isolated browser context
  - not reproducible as a plain local `npm run build` failure
  - locally, the shared failure was identifiable from code path analysis: authenticated route helpers called Clerk `auth()`/`currentUser()` without any Clerk middleware/proxy in the repo

## 2. Root Cause

- Exact root cause:
  - the repo used Clerk server helpers in shared authenticated route code, but had no Clerk `middleware.ts` / `proxy.ts` file
  - on preview requests without existing auth context, Clerk `auth()` could throw before Sonartra’s own access guards ran
- Exact files and code paths:
  - [`lib/server/request-user.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/request-user.ts)
    - imports and calls `auth()` / `currentUser()` from `@clerk/nextjs/server`
  - [`lib/server/user-app-access.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/user-app-access.ts)
    - expects `getRequestUserContext()` to return or throw Sonartra-owned access errors
  - [`lib/server/admin-access.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/admin-access.ts)
    - same expectation for admin routes
  - [`app/(user)/app/layout.tsx`](/C:/Projects/sonartra-build/Sonartra/app/(user)/app/layout.tsx)
    - shared user app layout that resolves request user context before rendering
  - [`app/(admin)/layout.tsx`](/C:/Projects/sonartra-build/Sonartra/app/(admin)/layout.tsx)
    - shared admin layout that resolves admin request context before rendering
  - missing shared runtime file before the fix:
    - no Clerk proxy/middleware file existed, so the auth header/status context required by Clerk server helpers was absent
- Why this produced preview 500s:
  - `/app/workspace` and `/admin` both pass through shared layouts that resolve request-user state immediately
  - without Clerk proxy/middleware, those Clerk calls can throw configuration/runtime errors outside Sonartra’s fail-closed auth branches
  - that escapes as a raw server component failure and renders a 500 page

## 3. Scope Assessment

- Affected route families:
  - all authenticated user app routes under `app/(user)/app/*`
  - all admin routes under `app/(admin)/*`
- Shared surfaces affected:
  - shared user app layout
  - shared admin layout
  - request-user access resolution
  - any API route using `requireCurrentUser()` depended on the same Clerk runtime path
- Not a workspace-specific data crash:
  - existing workspace/dashboard tests already showed empty results, malformed ready payloads, and missing optional data were handled safely
  - the common failing path was earlier, during auth resolution
- Not an admin-page-specific view-model crash:
  - `/admin` landing page is mostly static once access is granted
  - the failure sat in the admin layout/access path, before page content

## 4. Fix Summary

- Added shared Clerk proxy wiring in [`proxy.ts`](/C:/Projects/sonartra-build/Sonartra/proxy.ts) using `clerkMiddleware()`.
- Configured the matcher to cover dynamic app/admin route requests and API requests while excluding static assets.
- Kept existing Sonartra access-control behaviour intact:
  - user routes still resolve through internal-user sync and redirect/fail closed intentionally
  - admin routes still require persisted admin role and redirect/fail closed intentionally
- Why the fix is safe:
  - does not bypass auth
  - does not weaken admin enforcement
  - does not remove internal-user repair/sync
  - patches the shared Clerk runtime precondition that both route families rely on
  - aligns with the actual deployed request path used by Vercel preview

## 5. Regression Coverage Added

- Added/updated tests:
  - [`tests/clerk-middleware-contract.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/clerk-middleware-contract.test.ts)
    - verifies the repo defines Clerk proxy/middleware coverage for authenticated route requests
  - [`tests/user-app-access.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/user-app-access.test.ts)
    - added no-session redirect coverage for shared user app access
  - existing focused tests re-run and kept green:
    - [`tests/request-user.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/request-user.test.ts)
    - [`tests/admin-access.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/admin-access.test.ts)
    - [`tests/internal-user-sync.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/internal-user-sync.test.ts)
    - [`tests/dashboard-workspace-view-model.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/dashboard-workspace-view-model.test.ts)
    - [`tests/clerk-dependency-contract.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/clerk-dependency-contract.test.ts)

### Runtime scenarios covered

- authenticated active internal user path resolves safely
- authenticated user requiring internal-user repair path resolves through sync logic
- disabled user fails closed intentionally
- non-admin user hitting admin path is denied intentionally
- admin user path remains valid
- empty workspace/result states do not crash
- no-session user app path redirects intentionally instead of 500ing
- shared route families now have the Clerk proxy/middleware layer required by the deployed runtime
