# Production Auth Routing Verification

Date: 26 April 2026

Routes checked:

```text
https://www.sonartra.com/sign-in
https://www.sonartra.com/sign-up
https://www.sonartra.com/app/workspace
```

Reference:

- `docs/qa/sign-in-page-polish-pass.md`

## 1. Summary

The polished production sign-in and sign-up shells are deployed and render the new Sonartra copy, layout, and production-ready browser titles.

However, the embedded Clerk auth form does not currently render in production because Clerk JS is being requested from:

```text
https://clerk.sonartra.com
```

and that host fails DNS resolution in the browser:

```text
net::ERR_NAME_NOT_RESOLVED
Clerk: Failed to load Clerk JS
```

No repo-side hardcoded `clerk.sonartra.com`, `CLERK_PROXY_URL`, or Clerk domain setting was found in app source/config searched. This is therefore a production Clerk custom-domain/DNS configuration defect, not a sign-in page UI code defect.

## 2. Sign-In Result

Production route:

```text
https://www.sonartra.com/sign-in
```

Result: partially passed.

| Check | Result |
| --- | --- |
| Route loads | Yes, `200` |
| Browser title | `Sign in | Sonartra` |
| Meta description | `Access your Sonartra workspace.` |
| Polished shell renders | Yes |
| Mobile layout renders | Yes |
| Horizontal overflow | No |
| MVP/dev/internal wording in app shell | None observed |
| Clerk form renders | No |

Observed production copy:

- `Access your Sonartra workspace`
- `Continue to your assessments, results, and development insights.`
- `Your assessment data remains protected.`
- `Return to your workspace automatically after sign-in.`
- `Assessments`
- `Results`
- `Development`

The production page no longer shows the previous internal copy such as `Protected route handoff`, `Clerk sends a return path`, `hosted portal defaults`, `deterministic engine`, or `persisted Sonartra app flow`.

## 3. Sign-Up Result

Production route:

```text
https://www.sonartra.com/sign-up
```

Result: partially passed.

| Check | Result |
| --- | --- |
| Route loads | Yes, `200` |
| Browser title | `Create account | Sonartra` |
| Meta description | `Create your Sonartra account.` |
| Polished shell renders | Yes |
| MVP/dev/internal wording in app shell | None observed |
| Clerk form renders | No |

Observed production copy:

- `Create your Sonartra account`
- `Create your account and continue to your Sonartra workspace.`
- `Return to your workspace automatically after account setup.`
- `Create account`
- `Set up your Sonartra account to continue.`

## 4. Workspace Signed-Out Routing Result

Browser navigation to:

```text
https://www.sonartra.com/app/workspace
```

landed on:

```text
https://www.sonartra.com/sign-in?redirect_url=https%3A%2F%2Fwww.sonartra.com%2Fapp%2Fworkspace
```

Result: the visible browser flow preserves the return path and lands on the polished sign-in route.

Separate cookie-free HTTP check:

```text
curl -I -L --max-redirs 0 https://www.sonartra.com/app/workspace
```

returned:

```text
HTTP/1.1 404 Not Found
X-Clerk-Auth-Status: signed-out
X-Clerk-Auth-Reason: protect-rewrite, session-token-and-uat-missing
X-Matched-Path: /404
```

Interpretation:

- The visible browser navigation path is acceptable for a signed-out user because it reaches `/sign-in` with the return path preserved.
- Direct cookie-free HEAD/HTTP checks still expose Clerk's protect rewrite to `/404`. That is a lower-level routing behaviour to review separately if non-browser probes are expected to return a redirect response rather than a protected rewrite.
- The blocking production issue is the missing Clerk JS form caused by unresolved `clerk.sonartra.com`.

## 5. Console and Network

Console errors observed on sign-in/sign-up:

```text
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
Clerk: Failed to load Clerk JS
```

Network failures observed:

```text
GET https://clerk.sonartra.com/npm/@clerk/clerk-js@6/dist/clerk.browser.js net::ERR_NAME_NOT_RESOLVED
GET https://clerk.sonartra.com/npm/@clerk/ui@1/dist/ui.browser.js net::ERR_NAME_NOT_RESOLVED
```

Warnings observed:

```text
The resource https://clerk.sonartra.com/npm/@clerk/ui@1/dist/ui.browser.js was preloaded using link preload but not used within a few seconds from the window's load event.
```

No hydration error from the Sonartra auth shell was observed.

## 6. Code/Config Check

Searched app source/config for:

```text
CLERK_PROXY_URL
clerk.sonartra
CLERK_DOMAIN
proxyUrl
```

No repo-side match was found in:

```text
app
components
lib
next.config.ts
proxy.ts
.env.example
```

This supports the conclusion that the broken Clerk host is coming from production environment or Clerk dashboard configuration.

## 7. Screenshots Captured

- `docs/qa/screenshots/production-auth-sign-in-desktop.png`
- `docs/qa/screenshots/production-auth-sign-in-mobile.png`
- `docs/qa/screenshots/production-auth-sign-up-desktop.png`
- `docs/qa/screenshots/production-auth-workspace-redirect.png`

## 8. Whether a Fix Is Required

Yes, but the required fix is not a Sonartra page-code change.

Production auth cannot complete while Clerk JS fails to load. Fix production Clerk custom-domain/DNS configuration:

- If `clerk.sonartra.com` is intended: add/repair the required DNS record for Clerk's custom domain and verify it in Clerk.
- If a Clerk custom domain is not intended: remove the production Clerk proxy/custom-domain setting and use the correct production Clerk frontend API/domain for the live instance.
- After the environment/DNS fix, redeploy or refresh production configuration and re-run this verification.

No code change was made in this pass because the defect is environment-side and the UI/routes deployed as expected.
