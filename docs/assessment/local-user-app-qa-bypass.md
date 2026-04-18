# Local User-App QA Bypass

## Purpose

This bypass exists only to enable local visual QA of authenticated user-app routes such as:

- `/app/assessments/leadership`
- assessment runner routes under `/app/assessments/*`
- assessment flow API calls under `/api/assessments/*`

It is intended for local Chrome DevTools MCP inspection when a real Clerk login is not practical in the attached browser session.

## Env flag

Set:

```env
DEV_USER_BYPASS=true
```

## Activation rules

The bypass is active only when both conditions are true:

- `process.env.NODE_ENV !== 'production'`
- `process.env.DEV_USER_BYPASS === 'true'`

If either condition fails, the normal Clerk-backed user auth path stays in place.

## What it does

- skips Clerk protection for `/app/*` routes in local development when the flag is enabled
- skips Clerk protection for assessment flow API routes under `/api/assessments/*`
- resolves a deterministic local QA user through the existing internal user sync path
- preserves the normal assessment attempt, completion, result, and readiness logic

## What it does not do

- does not activate in production
- does not change admin-route auth rules
- does not bypass engine execution
- does not create fake attempts or fake results
- does not change the canonical result contract
- does not change readiness semantics

## Local usage

Run the app locally with the flag enabled, for example:

```powershell
$env:DEV_USER_BYPASS='true'
cmd /c npm run dev
```

Then open:

- `http://127.0.0.1:3000/app/assessments/leadership`

## QA identity

The bypass resolves a stable local QA user via the existing user sync path:

- Clerk id: `dev_user_app_bypass`
- Email: `qa-user@sonartra.local`
- Name: `QA User`

This keeps route access deterministic without introducing a second auth model.

## Safety warning

This bypass must never be enabled outside local development.

Do not set `DEV_USER_BYPASS=true` in preview or production environments.
