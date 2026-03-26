# Folder Structure (Task 1 Foundation)

- `app/`
  - `(public)/` marketing/public pages
  - `(user)/app/` authenticated user application shell and routes
  - `(admin)/admin/` admin application shell and routes
  - `api/` server route handlers
- `components/`
  - `public/`, `user/`, `admin/`, `shared/`
- `lib/`
  - `engine/` canonical engine runtime (future implementation)
  - `server/` application services and orchestration
  - `db/` data access and repositories
  - `utils/` shared utility helpers
  - `validations/` shared validation modules
- `types/` shared TypeScript contracts
- `config/` centralized app configuration
- `docs/` architecture and engineering references
- `db/seed/wplp80/` flagship assessment source seed set

This structure enforces clear separation between public UI, user app, admin app, and engine/server/data concerns.
