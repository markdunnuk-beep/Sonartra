# Database

## Migrations

Canonical schema migrations live in `db/migrations/`.

Current baseline migration:

- `202603260001_mvp_canonical_schema.sql`

Apply it with your Postgres migration workflow (for example, `psql` or your migration runner) before running Task 5 seed inserts.

## Seed data

WPLP-80 structured seed files remain under `db/seed/wplp80/`.

Task 4 introduces schema only; WPLP-80 inserts come in Task 5.
