# Database

## Migrations

Canonical schema migrations live in `db/migrations/`.

Current migrations:

- `202603260001_mvp_canonical_schema.sql`
- `202603290001_option_version_key_scope.sql`
- `202604010001_assessment_version_language_tables.sql`

Apply them before running seed inserts or admin authoring writes:

```bash
npm run db:migrate
```

## Seed data

WPLP-80 structured seed files remain under `db/seed/wplp80/`.

Task 4 introduces schema only; WPLP-80 inserts come in Task 5.
