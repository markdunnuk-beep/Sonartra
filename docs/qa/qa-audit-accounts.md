# Sonartra QA Audit Accounts

Date: 2026-04-18

## Purpose

This setup creates stable QA identities for Sonartra live testing using the supported architecture:

- Clerk is the authentication source of truth.
- Sonartra internal users are synchronised into `public.users` through the same profile mapping used by the app.
- No auth identities are created directly with SQL.
- No passwords are stored in the application database or committed to the repository.

## Current QA identities

Created:

- `qa.user.audit+sonartra@example.com`
  Intended use: standard user-flow audits, assessment runner checks, results checks, Chrome DevTools MCP visual audits.

Not created:

- No separate admin QA account was created in this pass.
  Reason: the current requirement is live user-flow auditing, and the minimal safe setup is a standard user only.

## Provisioning path used

Script:

- `scripts/setup-qa-audit-account.ts`

What it does:

1. Creates or reuses the Clerk user through Clerk's backend API surface.
2. Verifies the password when a password is supplied for provisioning or rotation.
3. Synchronises the Clerk profile into Sonartra `users`.
4. Applies the requested internal role (`user` by default).
5. Verifies that the Leadership assessment route is available in the workspace model for the synced user.

## Sync behaviour

- Internal sync succeeded for `qa.user.audit+sonartra@example.com`.
- Internal user row exists in `users`.
- Internal role: `user`
- Internal status: `active`
- Organisation assignment: none

First login requirement:

- First Clerk login is still required to create a browser session.
- First login is **not** required to create the internal `users` row in this setup, because the provisioning script performs the same sync safely on the server after Clerk user creation.

## Route validation

Validated:

- Leadership audit route is usable for the QA user context.
- Verified route: `/app/assessments/leadership`

Current audit state:

- Clean standard-user account
- No admin privileges
- No organisation membership
- No customer data
- No extra seeded attempts or completed results were added in this pass

This keeps the account suitable for clean-entry user-flow audits.

## Password handling

- The QA user's password was generated at provisioning time.
- It was stored outside the repository in Windows Credential Manager.
- Credential target:
  `Sonartra/qa-audit/qa.user.audit+sonartra@example.com`

Do not copy credentials into repo files, SQL seed files, or committed docs.

## Rotation

To rotate the QA user password safely:

1. Generate a new password locally.
2. Update the Windows Credential Manager entry for the same target.
3. Re-run the setup script with `QA_AUDIT_PASSWORD` set to the new value.

Example command pattern:

```powershell
$env:QA_AUDIT_PASSWORD = '<new-password>'
cmd /c node --import tsx scripts/setup-qa-audit-account.ts --email qa.user.audit+sonartra@example.com --first-name QA --last-name "Audit User" --assessment-key leadership
```

## Disable or retire later

To disable the QA user later:

```powershell
cmd /c node --import tsx scripts/setup-qa-audit-account.ts --disable --email qa.user.audit+sonartra@example.com
cmdkey /delete:Sonartra/qa-audit/qa.user.audit+sonartra@example.com
```

Disable behaviour:

- Clerk user is locked.
- Internal Sonartra user status is set to `disabled`.

## Warnings

- Use QA identities only for non-customer testing.
- Do not attach customer data, customer emails, or production credentials to these accounts.
- Keep audit attempts and results limited to safe test data only.
