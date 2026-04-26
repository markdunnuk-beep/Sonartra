# Production Maturity Leaks Pass

Date: 26 April 2026

Production route checked:

```text
https://www.sonartra.com/app/results/single-domain/7caefdbf-ee98-47c7-bd21-33484e1cec48
```

Reference:

- `docs/qa/single-domain-navigation-production-verification.md`

## 1. Executive Finding

The production app had two confirmed maturity leaks:

- Code-side metadata still rendered `Sonartra MVP` as the browser title and `Engine-first assessment platform foundation` as the meta description.
- Production loaded Clerk resources from a development Clerk domain.

The app metadata and visible app-copy leaks are fixed in code. The Clerk finding is environment-side: the repo uses Clerk through `ClerkProvider` and `clerkMiddleware` without a hardcoded publishable key or Clerk domain, so production must be moved to a production Clerk instance/key set in deployment configuration.

## 2. Files Inspected

| File | Reason inspected | Finding |
| --- | --- | --- |
| `docs/qa/single-domain-navigation-production-verification.md` | Source reference for residual production notes | Confirmed prior title and Clerk maturity concerns |
| `app/layout.tsx` | Root metadata and Clerk provider | Browser title and description were MVP/foundation copy; Clerk provider is env-driven |
| `proxy.ts` | Clerk middleware configuration | No hardcoded Clerk key or domain |
| `app/(public)/layout.tsx` | Public shell brand label | Visible `SONARTRA MVP` label |
| `app/(public)/page.tsx` | Public homepage copy | Visible `Sonartra MVP Engine App` and scaffold copy |
| `app/(user)/app/workspace/page.tsx` | Authenticated workspace voice entry | Visible `MVP shell` copy |
| `app/(user)/app/voice-assessments/page.tsx` | Voice assessment inventory copy | Visible `MVP voice shell` copy |
| `components/voice/voice-assessment-shell.tsx` | Voice status copy | Visible `voice MVP surface` and `Unsupported for voice MVP` copy |
| `lib/server/voice/voice-attempt-orchestrator.ts` | Voice preparation error text | Inspectable API/server error used `voice MVP` |
| `package.json` | App package metadata | Package description included `MVP Engine App foundation` |
| `.env.example` | Expected Clerk env variables | Env var names are appropriate; no production values are stored here |

## 3. Fixes Applied

| Area | Before | After |
| --- | --- | --- |
| Browser title | `Sonartra MVP` | `Sonartra` |
| App meta description | `Engine-first assessment platform foundation` | `Assessment intelligence for behavioural insight and applied development.` |
| Metadata application name | Not set | `Sonartra` |
| Package description | `Sonartra MVP Engine App foundation` | `Sonartra assessment intelligence platform` |
| Public shell brand | `SONARTRA MVP` | `SONARTRA` |
| Public homepage H1 | `Sonartra MVP Engine App` | `Sonartra` |
| Voice unsupported copy | `voice MVP surface` | `voice delivery` |
| Voice status label | `Unsupported for voice MVP` | `Unsupported for voice delivery` |
| Workspace voice copy | `controlled MVP shell` | `controlled voice shell` |
| Voice inventory copy | `MVP voice shell` | `voice delivery shell` |
| Voice preparation error | `not supported for voice MVP` | `not supported for voice delivery` |

## 4. App Metadata Audit

Current code-side metadata is production-ready:

```ts
export const metadata: Metadata = {
  applicationName: 'Sonartra',
  title: 'Sonartra',
  description: 'Assessment intelligence for behavioural insight and applied development.',
};
```

The production route still showed the old title and meta description before deployment of this change:

| Live production check | Observed value before this fix |
| --- | --- |
| `document.title` | `Sonartra MVP` |
| `meta[name="description"]` | `Engine-first assessment platform foundation` |

Expected behaviour after deployment: the browser title renders as `Sonartra`, and the app metadata no longer exposes MVP/foundation wording.

## 5. Clerk Configuration Audit

Production currently loads Clerk resources from a development Clerk domain:

```text
integral-garfish-36.clerk.accounts.dev
```

No code-side hardcoded Clerk domain or key was found in:

- `app/layout.tsx`
- `proxy.ts`
- `next.config.ts`
- app/component/server files searched for Clerk env references

The code uses:

- `ClerkProvider` from `@clerk/nextjs`
- `clerkMiddleware` from `@clerk/nextjs/server`
- environment variables documented in `.env.example`

This means the Clerk maturity leak is deployment/configuration-side, not a repo-side hardcoded-domain defect.

## 6. Required Environment Fix

Update the Vercel Production environment variables to use the production Clerk instance:

| Setting | Required action |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Set to the production Clerk publishable key (`pk_live_...`) |
| `CLERK_SECRET_KEY` | Set to the production Clerk secret key (`sk_live_...`) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Set to the signing secret for the production Clerk webhook endpoint, if webhook sync is enabled |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Keep production route value, currently expected as `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Keep production route value, currently expected as `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Keep production route value, currently expected as `/app/workspace` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Keep production route value, currently expected as `/app/workspace` |

Also confirm in Clerk:

- The production Clerk application/instance is selected.
- The production domain is configured for `sonartra.com` / `www.sonartra.com`.
- OAuth, redirect, and webhook URLs point at production Sonartra URLs.
- The deployed app no longer requests assets from the development Clerk domain.

No Supabase configuration change is required for the Clerk browser-domain leak identified here.

## 7. Validation

Live production browser check before deployment of this code change:

| Check | Result |
| --- | --- |
| Target route loaded | Yes |
| `document.title` | `Sonartra MVP` |
| Meta description | `Engine-first assessment platform foundation` |
| Clerk development domain present | Yes |
| Console messages | None reported by Chrome MCP |

Repo search after code edits found no remaining `MVP`, `Sonartra MVP`, or `clerk.accounts.dev` references in production app source paths searched:

```text
app
components
lib
package.json
next.config.ts
proxy.ts
.env.example
```

Remaining `DEV_*` identifiers are internal local-bypass implementation names, not visible production copy.

## 8. Remaining Risk

The code-side maturity leaks are removed by this pass, but production will continue to show the old title/metadata until the deployment containing this commit is live.

The Clerk leak will remain until Vercel Production is pointed at the production Clerk instance and the app is redeployed.

## 9. Recommendation

Deploy this code change, then update the Vercel Production Clerk variables to the production Clerk key set and redeploy. After deployment, run a browser verification that checks:

- `document.title === 'Sonartra'`
- `meta[name="description"]` matches the new production metadata
- no production resource URL includes the development Clerk domain
- no Clerk development warning appears in the console
