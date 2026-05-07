# Local Ranked-Pattern Fixture Database

This setup is for proving the Flow State ranked-pattern fixture against a disposable localhost database.

The proof harness writes imported assessment rows, result-language rows, a fixture user, a fixture attempt, responses, and a ready result. For that reason it refuses any `DATABASE_URL` whose host is not `localhost`, `127.0.0.1`, or `::1`.

Do not remove that guard. Do not run the fixture proof against hosted Supabase, production, staging, or any shared database.

## Local Database

The repository includes an optional local-only Postgres compose file:

```powershell
docker compose -f docker-compose.ranked-pattern-local.yml up -d
```

Equivalent npm shortcut:

```powershell
npm run db:local:ranked-pattern:up
```

It starts Postgres on port `54329` with this local-only connection string:

```text
postgresql://sonartra_local:sonartra_local@localhost:54329/sonartra_local
```

These credentials are intentionally low-value local development credentials. They are not production credentials.

## Environment Override

Do not edit or commit `.env.local` just to run this fixture if it points at hosted Supabase.

In PowerShell, override `DATABASE_URL` only for the current shell:

```powershell
$env:DATABASE_URL="postgresql://sonartra_local:sonartra_local@localhost:54329/sonartra_local"
```

The template [.env.ranked-pattern-local.example](../../.env.ranked-pattern-local.example) records the same local URL for reference.

## Run Migrations

With the local `DATABASE_URL` override active:

```powershell
npm run db:migrate
```

The migration runner can run against any Postgres URL, but local fixture proof requires the URL host to remain localhost.

## Run The Flow State Proof

With the same local `DATABASE_URL` override active:

```powershell
npm run prove:flow-state-ranked-pattern -- --local --allow-local-db-write
```

The script should print:

- assessment id
- assessment version id
- attempt id
- result id
- result URL, for example `/app/results/single-domain/<resultId>`
- score shape
- pattern key
- ranked signal percentages
- publish audit status

Flow State remains an example fixture. This command does not make it the canonical assessment and must not be used as a production seed path.

## Playwright Result Check

After the proof prints a result URL, run the generated-result Playwright smoke with an environment variable:

```powershell
$env:FLOW_STATE_RANKED_PATTERN_RESULT_URL="/app/results/single-domain/<resultId>"
npx playwright test e2e/flow-state-ranked-pattern-result.spec.ts --project=chromium
```

If the route requires an authenticated browser session that is not available locally, keep the Playwright spec skipped and use the proof harness output plus server-side read-model assertions as the evidence.

## Chrome MCP Review

Start the app normally with the same local database override if browser review needs the generated local result:

```powershell
$env:DATABASE_URL="postgresql://sonartra_local:sonartra_local@localhost:54329/sonartra_local"
npm run dev
```

Then review:

- the printed result URL
- `/app/results`
- `/app/workspace`

Use desktop `1440 x 1000`, tablet `768 x 1024`, and mobile `390 x 844`. Check that the result renders from the persisted payload, all ranked-pattern sections are present, there is no horizontal overflow, and no console errors appear beyond expected local auth warnings.

## Reset Or Tear Down

Stop the local database without deleting data:

```powershell
docker compose -f docker-compose.ranked-pattern-local.yml down
```

Equivalent npm shortcut:

```powershell
npm run db:local:ranked-pattern:down
```

Delete the local fixture database volume:

```powershell
docker compose -f docker-compose.ranked-pattern-local.yml down -v
```

Only use `down -v` for this local fixture database. Never run destructive cleanup commands against a hosted or shared database.
