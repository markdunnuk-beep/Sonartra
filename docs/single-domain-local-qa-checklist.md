# Single-Domain Local QA Checklist

Use this flow when verifying the single-domain narrative system locally.

## 1. Start the app

Run:

```powershell
$env:DEV_USER_BYPASS='true'; npm run dev
```

The local QA app user is `qa-user@sonartra.local`.

## 2. Seed a stable QA-owned single-domain result

Run:

```powershell
node --import tsx scripts/seed-single-domain-qa-result.ts
```

Expected stable result route:

```text
/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001
```

The script reuses or refreshes a QA-owned ready single-domain result so browser verification does not depend on another user owning the only ready row.

## 3. Admin route check

Open:

```text
/admin/assessments/single-domain/leadership/language
```

With `DEV_USER_BYPASS=true`, the deterministic QA user should still be able to reach admin routes in local development for verification.

## 4. Results route check

Open:

```text
/app/results/single-domain/f0df7bf7-4f14-4cb1-9f90-7cb6fa640001
```

Verify:

- six sections render in the locked order
- reading rail anchors are `intro`, `hero`, `drivers`, `pair`, `limitation`, `application`
- mobile/tablet reading progress fallback appears below desktop rail breakpoints
- no legacy repeated block structure reappears

## 5. Before DevTools / MCP checks

- warm the admin route manually first if you plan to inspect admin authoring
- warm the single-domain result route manually before attaching DevTools
- confirm the seeded result route returns `200` for the QA user
- if the route returns `404`, rerun `node --import tsx scripts/seed-single-domain-qa-result.ts`
