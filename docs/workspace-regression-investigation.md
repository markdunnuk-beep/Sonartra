# Workspace Regression Investigation

## 1. Symptom Summary

- Runtime failure: `/app/workspace` could crash in production with a route-level error page instead of failing closed.
- Vercel build failure: commit `11f69ef` failed because `lib/server/request-user.ts` and `app/api/webhooks/clerk/route.ts` imported `@clerk/nextjs/server` and `@clerk/nextjs/webhooks`, but `@clerk/nextjs` was not committed in `package.json` or `package-lock.json`.
- Relationship: the failures were linked by the same auth change set, but they were not the same bug.
  - Build break: dependency manifest drift.
  - Runtime break: uncaught request-user/auth-sync errors in the shared user app shell.

## 2. Root Cause

### Build failure

- Exact cause: commit `11f69ef` added Clerk imports without committing the Clerk dependency.
- Files/code paths:
  - [`lib/server/request-user.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/request-user.ts)
  - [`app/api/webhooks/clerk/route.ts`](/C:/Projects/sonartra-build/Sonartra/app/api/webhooks/clerk/route.ts)
  - [`package.json`](/C:/Projects/sonartra-build/Sonartra/package.json)
  - [`package-lock.json`](/C:/Projects/sonartra-build/Sonartra/package-lock.json)
- Version compatibility:
  - Installed locally: `@clerk/nextjs@7.2.3`
  - That version does export both `./server` and `./webhooks`.
  - The import paths were valid for the installed version; the problem was that Vercel never received the dependency declaration.
- Local/Vercel divergence:
  - Local `node_modules` already contained Clerk, so local builds could pass.
  - Vercel installs from committed manifest/lockfile only, so it failed deterministically.

### Runtime failure

- Exact cause: the shared authenticated user layout called `getRequestUserContext()` directly and did not handle request-user access failures.
- Files/code paths:
  - [`app/(user)/app/layout.tsx`](/C:/Projects/sonartra-build/Sonartra/app/(user)/app/layout.tsx)
  - [`lib/server/request-user.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/request-user.ts)
  - [`lib/server/internal-user-sync.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/internal-user-sync.ts)
- Failure mode:
  - `AuthenticatedUserRequiredError`
  - `ClerkUserProfileRequiredError`
  - `DisabledUserAccessError`
  - Any of those could bubble out of the shared layout and render a page error for `/app/workspace` and other app-shell routes.
- The most likely production trigger was authenticated route access hitting the new Clerk-backed internal-user resolution path without a guarded redirect path in the layout. This conclusion is from code-path analysis plus targeted regression tests.

## 3. Scope Assessment

- Isolated to `/app/workspace`: no.
- Affected surfaces before the fix:
  - `/app/workspace`
  - `/app/results`
  - `/app/assessments`
  - shared user shell/layout routes generally under `app/(user)/app/*`
  - admin-protected routes had the same uncaught `ClerkUserProfileRequiredError` risk through admin access resolution
  - API routes importing `requireCurrentUser()` could return generic `500` on Clerk profile resolution failure
  - webhook route was build-blocked when Clerk was absent from the committed dependency state
  - any route importing `request-user.ts` depended on the Clerk package being present
- Not affected by import-path incompatibility:
  - the Clerk subpath imports themselves were valid for `@clerk/nextjs@7.2.3`

## 4. Fix Summary

- Committed the actual Clerk dependency state in `package.json` and `package-lock.json`.
- Added a shared user-app access guard:
  - [`lib/server/user-app-access.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/user-app-access.ts)
  - used by [`app/(user)/app/layout.tsx`](/C:/Projects/sonartra-build/Sonartra/app/(user)/app/layout.tsx)
- Expanded request-user error classification so `ClerkUserProfileRequiredError` is treated as a fail-closed auth error:
  - [`lib/server/request-user.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/request-user.ts)
  - [`lib/server/admin-access.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/admin-access.ts)
  - [`app/api/assessments/complete/route.ts`](/C:/Projects/sonartra-build/Sonartra/app/api/assessments/complete/route.ts)
  - [`app/api/assessments/attempts/[attemptId]/responses/route.ts`](/C:/Projects/sonartra-build/Sonartra/app/api/assessments/attempts/[attemptId]/responses/route.ts)
- Why safe:
  - does not bypass Clerk auth
  - does not remove internal user sync
  - does not trust headers
  - does not weaken admin/user role checks
  - converts auth/profile-resolution failures into controlled redirects or `401` responses instead of route crashes or generic `500`s
- Vercel compatibility restored by making the committed dependency state match the code that imports Clerk.

## 5. Regression Coverage Added

- Added/updated tests:
  - [`tests/request-user.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/request-user.test.ts)
    - authenticated active user with internal row
    - missing Clerk profile fails closed
    - disabled user fails closed
  - [`tests/user-app-access.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/user-app-access.test.ts)
    - shared user app shell redirects instead of crashing
  - [`tests/admin-access.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/admin-access.test.ts)
    - admin routes also redirect on Clerk profile resolution failure
  - [`tests/internal-user-sync.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/internal-user-sync.test.ts)
    - repair/upsert path preserves app-owned role/status
  - [`tests/dashboard-workspace-view-model.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/dashboard-workspace-view-model.test.ts)
    - empty workspace state and resilient workspace/dashboard projection
  - [`tests/clerk-dependency-contract.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/clerk-dependency-contract.test.ts)
    - committed manifest/lockfile include Clerk
    - installed Clerk package exports `./server` and `./webhooks`

### Verified locally

- `npm install`
- focused regression tests for auth/workspace/Clerk dependency contract
- `npm run lint`
- `npm run build`

### Inferred from code path and validated with targeted tests

- The live `/app/workspace` error and related auth-protected route risk came from uncaught request-user/auth-sync exceptions in the shared layout rather than the workspace view-model itself.
