# Admin UI Audit Bypass Notes

## Where the bypass lives

- [`lib/server/dev-admin-bypass.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/dev-admin-bypass.ts)
  - canonical env gate and deterministic mock admin context
- [`lib/server/admin-access.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/admin-access.ts)
  - returns the mock admin request context for admin routes when the gate is active
- [`proxy.ts`](/C:/Projects/sonartra-build/Sonartra/proxy.ts)
  - skips Clerk protection for `/admin/*` only when the same gate is active

## Exact activation conditions

The bypass is active only when both conditions are true:

- `process.env.NODE_ENV !== 'production'`
- `process.env.DEV_ADMIN_BYPASS === 'true'`

If either condition fails, the existing Clerk-backed auth path stays in place.

## Why it is safe

- production cannot activate it because `NODE_ENV='production'` disables the gate
- it requires an explicit opt-in flag
- it only changes the admin-route access path
- it does not alter the admin users data queries or the assessment/result pipeline
- it reuses the existing `proxy.ts -> admin-access` runtime foundation instead of adding a second auth system

## How to turn it on locally

Add this to the local env file used by the Next app:

```env
DEV_ADMIN_BYPASS=true
```

Then run the app in local development mode and open:

- `/admin/users`
- `/admin/users/[userId]`

## How to turn it off

Remove `DEV_ADMIN_BYPASS` or set it to any value other than `true`, then restart the local app.

## What to remove or disable after audit

- remove the `DEV_ADMIN_BYPASS` local env entry
- if the bypass is no longer needed, delete the helper in [`lib/server/dev-admin-bypass.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/dev-admin-bypass.ts) and its gated usage in [`lib/server/admin-access.ts`](/C:/Projects/sonartra-build/Sonartra/lib/server/admin-access.ts) and [`proxy.ts`](/C:/Projects/sonartra-build/Sonartra/proxy.ts)
