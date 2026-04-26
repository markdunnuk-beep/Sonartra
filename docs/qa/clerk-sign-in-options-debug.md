# Clerk Sign-In Options Debug

Date: 26 April 2026

Target route:

```text
https://www.sonartra.com/sign-in
```

Related verification:

- `docs/qa/production-auth-routing-verification.md`

## 1. Root Cause

The missing email, Google, and Apple sign-in options are not caused by Sonartra CSS hiding Clerk controls and not caused by Clerk rendering zero enabled strategies.

Root cause: Clerk JS does not load in production. The browser requests Clerk assets from:

```text
https://clerk.sonartra.com
```

and those requests fail with:

```text
net::ERR_NAME_NOT_RESOLVED
Clerk: Failed to load Clerk JS
```

Because Clerk JS never loads, the `<SignIn />` and `<SignUp />` components do not mount their internal UI. The DOM contains no Clerk strategy controls to style, hide, or reveal.

This is a production Clerk frontend host / custom-domain / DNS configuration issue. It is not a sign-in page shell defect.

## 2. DOM and CSS Findings

Production `/sign-in` DOM inspection:

| Finding | Result |
| --- | --- |
| Sonartra auth shell rendered | Yes |
| Clerk-rendered elements present | No |
| Email input in DOM | No |
| Password or code input in DOM | No |
| Google button in DOM | No |
| Apple button in DOM | No |
| Hidden Clerk controls found | No |
| Mobile horizontal overflow | No |

The only visible controls in the production DOM were Sonartra shell links:

- `Sonartra`
- `Create an account`

Production `/sign-up` showed the same pattern:

| Finding | Result |
| --- | --- |
| Sonartra auth shell rendered | Yes |
| Clerk-rendered elements present | No |
| Account creation input/button controls in DOM | No |
| Hidden Clerk controls found | No |

CSS review:

- `components/auth/auth-page-shell.tsx` does not target Clerk internals.
- App global CSS search did not find Clerk-specific hiding rules.
- The current Clerk `appearance.elements` config hides only Clerk shell chrome:
  - `headerTitle: 'hidden'`
  - `headerSubtitle: 'hidden'`
  - `footer: 'hidden'`
  - `footerAction: 'hidden'`
  - `formHeader: 'hidden'`
- It does not hide `socialButtonsBlockButton`, `formFieldInput`, `formButtonPrimary`, or other sign-in method controls.

Conclusion: there are no hidden auth methods to reveal. Clerk has not rendered them because its runtime script failed before mounting.

## 3. Network and Console Findings

Production `/sign-in` network failures:

```text
GET https://clerk.sonartra.com/npm/@clerk/clerk-js@6/dist/clerk.browser.js net::ERR_NAME_NOT_RESOLVED
GET https://clerk.sonartra.com/npm/@clerk/ui@1/dist/ui.browser.js net::ERR_NAME_NOT_RESOLVED
```

Production `/sign-up` network failures:

```text
GET https://clerk.sonartra.com/npm/@clerk/clerk-js@6/dist/clerk.browser.js net::ERR_NAME_NOT_RESOLVED
GET https://clerk.sonartra.com/npm/@clerk/ui@1/dist/ui.browser.js net::ERR_NAME_NOT_RESOLVED
```

Console errors:

```text
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
Clerk: Failed to load Clerk JS
```

Console warnings:

```text
The resource https://clerk.sonartra.com/npm/@clerk/ui@1/dist/ui.browser.js was preloaded using link preload but not used within a few seconds from the window's load event.
```

The preload warning is secondary. It occurs because the Clerk UI preload points at the same unresolved host and the UI never mounts.

## 4. App Integration Findings

Reviewed:

- `components/auth/auth-page-shell.tsx`
- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`
- `app/layout.tsx`
- `proxy.ts`
- `next.config.ts`
- `.env.example`
- relevant global CSS searches

Repo search found no code-side reference to:

```text
clerk.sonartra.com
CLERK_PROXY_URL
CLERK_DOMAIN
proxyUrl
frontendApi
publishableKey override
```

The root layout still uses the normal Clerk integration:

```tsx
<ClerkProvider>{children}</ClerkProvider>
```

The sign-in page still uses:

```tsx
<SignIn
  fallbackRedirectUrl="/app/workspace"
  path="/sign-in"
  routing="path"
  signUpUrl="/sign-up"
/>
```

The sign-up page still uses:

```tsx
<SignUp
  fallbackRedirectUrl="/app/workspace"
  path="/sign-up"
  routing="path"
  signInUrl="/sign-in"
/>
```

No route, middleware, redirect, assessment, result, database, scoring, or payload code was changed.

## 5. Files Changed

No application code was changed in this pass.

Created:

- `docs/qa/clerk-sign-in-options-debug.md`
- `docs/qa/screenshots/clerk-options-debug-sign-in-desktop.png`
- `docs/qa/screenshots/clerk-options-debug-sign-in-mobile.png`
- `docs/qa/screenshots/clerk-options-debug-sign-up-desktop.png`

## 6. Validation Results

| Check | Result |
| --- | --- |
| `/sign-in` Sonartra shell renders | Pass |
| `/sign-in` browser title | `Sign in | Sonartra` |
| `/sign-in` email/password or email-code option visible | Fail, Clerk JS did not load |
| `/sign-in` Google button visible | Fail, Clerk JS did not load |
| `/sign-in` Apple button visible | Fail, Clerk JS did not load |
| `/sign-up` Sonartra shell renders | Pass |
| `/sign-up` browser title | `Create account | Sonartra` |
| `/sign-up` account creation methods visible | Fail, Clerk JS did not load |
| Mobile layout | Pass for Sonartra shell, no horizontal overflow |
| Signed-out `/app/workspace` browser route | Lands on `/sign-in?redirect_url=https%3A%2F%2Fwww.sonartra.com%2Fapp%2Fworkspace` |
| Hydration/render errors from Sonartra shell | None observed |

## 7. Screenshots Captured

- `docs/qa/screenshots/clerk-options-debug-sign-in-desktop.png`
- `docs/qa/screenshots/clerk-options-debug-sign-in-mobile.png`
- `docs/qa/screenshots/clerk-options-debug-sign-up-desktop.png`

## 8. Remaining Issues

Production auth remains blocked until Clerk JS can load.

Required production configuration fix:

- If `clerk.sonartra.com` is intended as a Clerk custom frontend/API domain, add or repair the required DNS records and verify the domain in Clerk.
- If `clerk.sonartra.com` is not intended, remove the production Clerk custom-domain/proxy configuration so Clerk uses the correct production Clerk-hosted frontend API domain.
- After changing Clerk/DNS/Vercel configuration, redeploy or refresh production configuration and verify:
  - `/sign-in` renders email/password or email-code options.
  - `/sign-in` renders Google and Apple buttons if those strategies are enabled in Clerk.
  - `/sign-up` renders the expected account creation methods.
  - console no longer reports `failed_to_load_clerk_js`.

No code fix was applied because the confirmed defect is outside the repository-controlled app integration.
