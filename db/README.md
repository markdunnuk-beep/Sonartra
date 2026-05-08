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

## Legacy seed data

WPLP-80 structured seed files remain under `db/seed/wplp80/` for archived reference and legacy local QA only. They are not part of the active ranked-pattern assessment workflow.

For historical Admin Users QA, a dedicated completed-result fixture can be created after the archived WPLP seed path:

```bash
npm run archive:wplp80:seed
npm run seed:admin-users-fixture
```
