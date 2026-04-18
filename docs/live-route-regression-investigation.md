# Live Route Regression Investigation

## 1. Symptom Summary

- Affected routes:
  - `https://www.sonartra.com/app/workspace`
  - `https://www.sonartra.com/admin`
- Observed live-domain behaviour during investigation:
  - in a fresh browser context, both routes did not reach their protected pages
  - they resolved away from the intended protected flow instead of producing a clean sign-in handoff
- Local reproducibility:
  - not reproducible as a local build/runtime crash
  - reproducible as a code-path issue: protected routes were not being explicitly protected in `proxy.ts`, so unauthenticated requests fell through into app/admin layout guards
- Production-domain specificity:
  - the issue was most visible after the custom-domain switch because the live domain exposed the unauthenticated/no-session path more clearly than the previously warm preview session path

## 2. Root Cause

- Exact root cause:
  - [`proxy.ts`](/C:/Projects/sonartra-build/Sonartra/proxy.ts) installed `clerkMiddleware()` but did not actually protect `/app/:path*` or `/admin/:path*`
  - unauthenticated requests therefore reached shared layout/access code instead of being intercepted by Clerk’s sign-in flow
  - the shared guards then redirected away on missing auth rather than producing the intended protected-route handoff
- Exact files and flow involved:
  - [`proxy.ts`](/C:/Projects/sonartra-build/Sonartra/proxy.ts)
    - missing route-specific protection before the fix
  - [`app/(user)/app/layout.tsx`](/C:/Projects/sonartra-build/Sonartra/app/(user)/app/layout.tsx)
  - [`app/(admin)/layout.tsx`](/C:/Projects/sonartra-build/Sonartra/app/(admin)/layout.tsx)
  - [`lib/server/user-app-access.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/user-app-access.ts)
  - [`lib/server/admin-access.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/admin-access.ts)
- Runtime assumption involved:
  - the app relied on layout-level access guards to handle missing auth
  - for the live domain, that is too late for a clean Clerk handoff; the proxy must explicitly protect the route families first

## 3. Scope Assessment

- Affects all protected user routes: yes, all `/app/*` routes shared the same missing proxy protection semantics
- Affects all admin routes: yes, all `/admin/*` routes shared the same missing proxy protection semantics
- Only `/app/workspace`: no
- Only `/admin`: no
- Only live domain after custom-domain switch: primarily exposed there, but the root cause was repo-side and shared
- Sign-in / redirect return paths affected: yes
  - the protected-route handoff was not being initiated at the proxy layer
- Middleware coverage affected: yes
  - matcher coverage existed
  - route protection logic for `/app` and `/admin` did not

## 4. Fix Summary

- Updated [`proxy.ts`](/C:/Projects/sonartra-build/Sonartra/proxy.ts) to:
  - use `createRouteMatcher(['/app(.*)'])`
  - use `createRouteMatcher(['/admin(.*)'])`
  - call `await auth.protect()` for those route families
- Why the fix is safe:
  - does not weaken auth
  - does not bypass Clerk middleware
  - does not bypass internal user resolution
  - keeps admin role enforcement in the app layer
  - ensures unauthenticated requests are handled intentionally by Clerk before layout/server rendering
- External config note:
  - if Clerk’s production-domain cookie/origin configuration is stale, that can still affect whether a user arrives with a valid live-domain session
  - this patch makes the repo-side behaviour robust either way by ensuring unauthenticated live-domain requests are handed to Clerk sign-in instead of falling into ambiguous route behaviour

## 5. Regression Coverage Added

- Added/updated tests:
  - [`tests/clerk-middleware-contract.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/clerk-middleware-contract.test.ts)
    - proxy imports `createRouteMatcher`
    - `/app(.*)` is explicitly protected
    - `/admin(.*)` is explicitly protected
    - `auth.protect()` is invoked
    - no preview-domain URL is hard-coded
  - existing focused auth/access/runtime tests re-run and stayed green:
    - [`tests/request-user.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/request-user.test.ts)
    - [`tests/user-app-access.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/user-app-access.test.ts)
    - [`tests/admin-access.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/admin-access.test.ts)
    - [`tests/internal-user-sync.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/internal-user-sync.test.ts)
    - [`tests/dashboard-workspace-view-model.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/dashboard-workspace-view-model.test.ts)
    - [`tests/clerk-dependency-contract.test.ts`](/C:/Projects/sonartra-build/Sonartra/tests/clerk-dependency-contract.test.ts)

### Scenarios covered

- proxy matcher includes intended protected route families
- unauthenticated `/app/workspace` path is handled intentionally at the Clerk proxy layer
- unauthenticated `/admin` path is handled intentionally at the Clerk proxy layer
- authenticated active user path remains compatible with workspace rendering
- authenticated non-admin admin path still fails closed through app-side role enforcement
- disabled / repair-path / no-session cases remain fail-closed cleanly
- repo-side route assumptions are not hard-coded to preview URLs
