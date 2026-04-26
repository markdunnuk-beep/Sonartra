# Sign-In Page Polish Pass

Date: 26 April 2026

Target route:

```text
https://www.sonartra.com/sign-in
```

Local validation route:

```text
http://localhost:3000/sign-in
```

## 1. Summary of Changes

The app-hosted Sonartra sign-in page was redesigned as a production auth entry point instead of a technical handoff screen.

Changes were limited to presentation, copy, metadata, and Clerk component appearance. No Clerk auth logic, middleware, redirects, routes, assessment logic, scoring, payloads, or database code was changed.

## 2. Before vs After Copy Changes

| Area | Before | After |
| --- | --- | --- |
| Sign-in title | `Access the Sonartra workspace` | `Access your Sonartra workspace` |
| Sign-in description | `Sign in to continue into the Sonartra workspace. Protected route handoff is preserved when Clerk sends a return path.` | `Continue to your assessments, results, and development insights.` |
| Trust panel heading | `Deterministic engine` / `Protected surfaces` | `Your assessment data remains protected.` |
| Trust panel support copy | `Authentication returns directly into the persisted Sonartra app flow.` | `Return to your workspace automatically after sign-in.` |
| Route language | `Clerk sends a protected return path`, `hosted portal defaults` | Removed from user-facing auth UI |
| Sign-up description | `Create a Sonartra account and land directly in the application...` | `Create your account and continue to your Sonartra workspace.` |

The page now avoids internal/dev-facing phrases including:

- `Protected route handoff`
- `Clerk sends a return path`
- `hosted portal defaults`
- `deterministic engine`
- `persisted Sonartra app flow`

## 3. Visual and Design Changes

- Reworked the shared auth shell into a premium dark Sonartra layout with restrained radial lighting, bordered panels, and stronger typography.
- Kept the desktop layout as two balanced columns: workspace/trust content and the Clerk form panel.
- Added purposeful trust content for assessments, results, and development insights.
- Moved away from technical cards and replaced them with concise user-facing value and trust language.
- Added page-level metadata for `Sign in | Sonartra` and `Create account | Sonartra`.
- Preserved the existing Sonartra dark visual system and avoided MVP/dev labels.

## 4. Clerk Integration Notes

The Clerk `SignIn` and `SignUp` components remain the same hosted Clerk components using the same routing props:

- `routing="path"`
- `path="/sign-in"` or `path="/sign-up"`
- `fallbackRedirectUrl="/app/workspace"`
- reciprocal `signUpUrl` / `signInUrl`

Presentation changes were made through Clerk `appearance.elements` only:

- transparent Clerk card inside the Sonartra panel
- dark input styling
- stronger primary button styling
- dark social buttons
- hidden Clerk header/footer where the app shell provides the surrounding context
- improved spacing around the embedded form

No authentication state, middleware, route protection, or environment variable logic was changed.

## 5. Mobile Validation

Chrome MCP validation at a mobile-sized viewport showed:

| Check | Result |
| --- | --- |
| Page title | `Sign in | Sonartra` |
| Sign-in form appears early | Yes; the Clerk form appears at the top of the mobile layout |
| Horizontal overflow | No |
| Copy readability | Passed |
| Clerk form spacing | Passed |
| Sign-up link present | Yes |

The local dev tools launcher appears in local screenshots only and is not part of the application UI.

## 6. Redirect and Auth Validation

Validated:

- `/sign-in` renders the polished page locally.
- `/sign-in?redirect_url=.../app/workspace` renders without breaking layout or dropping the route query.
- The visible `Create an account` link navigates to `/sign-up`.
- `/sign-up` renders through the same polished shell with account-appropriate copy.
- The Clerk component props that control fallback redirect and reciprocal auth links were preserved.

Not fully exercised:

- Credential-based successful sign-in was not submitted during this pass.
- Local unauthenticated `/app/workspace` redirect could not be validated because the local environment is using the user-app dev bypass and renders a QA workspace session.

Production unauthenticated HTTP check:

```text
GET/HEAD https://www.sonartra.com/app/workspace
```

returned:

```text
404 Not Found
X-Clerk-Auth-Status: signed-out
X-Clerk-Auth-Reason: protect-rewrite, session-token-and-uat-missing
X-Matched-Path: /404
```

That redirect/protection behaviour was not changed because middleware and redirect logic are explicitly out of scope for this UI pass. It remains a separate auth-routing weakness to review if browser unauthenticated access is expected to land on `/sign-in` with a preserved return path.

## 7. Console and Runtime Validation

Chrome MCP local sign-in validation showed no hydration or render errors from this UI change.

Observed local-only warnings:

- Clerk development-key warning from the local Clerk environment.
- Next.js/React development tooling messages.
- A browser autocomplete suggestion for Clerk password input.

These were not caused by the sign-in UI shell change.

## 8. Screenshots Captured

- `docs/qa/screenshots/sign-in-polish-desktop.png`
- `docs/qa/screenshots/sign-in-polish-mobile.png`

## 9. Remaining Weaknesses

- Production Clerk is still using the development Clerk domain/key set until the environment-side fix from `docs/qa/production-maturity-leaks-pass.md` is completed.
- Production unauthenticated `/app/workspace` currently rewrites to `/404` with Clerk signed-out headers in direct HTTP checks; this should be reviewed separately if the intended behaviour is a visible `/sign-in` redirect with return path preservation.
- Successful credential sign-in was not exercised in this pass.
