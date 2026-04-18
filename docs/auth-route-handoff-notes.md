# Auth Route Handoff Notes

1. Routes added
- `/sign-in`
- `/sign-up`
- implemented as App Router Clerk catch-all routes:
  - [`app/sign-in/[[...sign-in]]/page.tsx`](/C:/Projects/sonartra-build/Sonartra/app/sign-in/[[...sign-in]]/page.tsx)
  - [`app/sign-up/[[...sign-up]]/page.tsx`](/C:/Projects/sonartra-build/Sonartra/app/sign-up/[[...sign-up]]/page.tsx)

2. Redirect strategy chosen
- used Clerk fallback redirects to `/app/workspace`
- kept path routing and Sonartra-owned auth URLs:
  - sign-in path `/sign-in`
  - sign-up path `/sign-up`

3. Fallback vs force redirect reasoning
- fallback redirect was chosen instead of force redirect
- this preserves protected-route handoff when Clerk includes a `redirect_url` / return path from `/app/*` or `/admin/*`
- when no return path is present, the default landing is `/app/workspace`

4. Required environment variables
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app/workspace`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app/workspace`

5. How this avoids Clerk’s generic welcome page
- Clerk now renders inside Sonartra-owned routes
- both auth pages set Sonartra-relative fallback redirects to `/app/workspace`
- no repo-side redirect path points to a Clerk-hosted welcome destination

6. What remains external to the repo
- Clerk dashboard/domain configuration must allow the production domain and auth return flow
- production environment variables must be set consistently for the same auth URLs and fallback redirects
