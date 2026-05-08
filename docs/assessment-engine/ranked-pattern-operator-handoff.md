# Ranked-Pattern Operator Handoff

## Active Model

New active Sonartra assessment builds use the single-domain ranked-pattern model only.

- One published assessment version has exactly one active domain.
- One published assessment version has exactly four scored signals.
- One published assessment version has exactly twenty-four ranked signal patterns.
- Scores come from `option_signal_weights`.
- The engine normalizes signal percentages, classifies `scoreShape`, generates `patternKey` from ranks 1-4, and persists one `canonical_result_payload`.
- Result pages, dashboards, result lists, and workspace summaries read the persisted payload only.

Flow State is an example fixture and proof harness. It is not the canonical assessment.

WPLP, multi-domain, and older pair-oriented single-domain paths are archived or transitional only. Do not use them for new active builds.

## Contract Files

- `docs/assessment-engine/current-scope.md`
- `docs/assessment-engine/import-package-contract.md`
- `docs/assessment-engine/database-import-contract.md`
- `docs/assessment-engine/scoring-and-shape-contract.md`
- `docs/assessment-engine/publish-audit-contract.md`
- `docs/assessment-engine/result-payload-contract.md`
- `docs/assessment-engine/legacy-archive-note.md`
- `content/assessment-packages/_template/sonartra_reader_first_import_schema_TEMPLATE.xlsx`
- `content/assessment-packages/flow-state/sonartra_reader_first_import_schema_FLOW_STATE_EXAMPLE.xlsx`

## Create A Package

1. Copy the template workbook.
2. Populate `00_Metadata` through `18_Lookups`.
3. Keep question-scoped option keys stable.
4. Define exactly four scored signals.
5. Define exactly twenty-four ranked signal patterns.
6. Populate reader-first result sections `05_Context` through `14_Closing_Integration`.
7. Include preview cases and validation reference rows so audit can prove the package.

Do not make the workbook a runtime dependency. Import persists the database definition and result-language rows.

## Admin Workflow

1. Open the admin assessment dashboard.
2. Use an existing ranked-pattern assessment context, or create the required assessment shell only when there is no assessment to version.
3. In the single-domain review/import area, create a draft version for the next amendment label, such as `2.00`.
4. Run package audit against the workbook.
5. Run dry-run import against the draft version.
6. Apply import only to the draft version.
7. Run publish audit.
8. Resolve all blocking findings.
9. Explicitly publish only when publish audit returns `canPublish=true`.

Import does not publish. Publish audit does not publish. Publishing is a separate explicit action.

## Amendments

Example amendment flow:

1. Decision Style `1.00` is published.
2. Create draft `2.00`.
3. Import the amended package into draft `2.00`.
4. Run audit, dry-run, and apply.
5. Run publish audit.
6. Publish `2.00`.

New attempts use the newly published version according to the active-version selection rules. Completed results remain tied to their original `assessment_version_id` and persisted `canonical_result_payload`; they are not recomputed or mutated.

## Local Proof

Use the local proof harness only against a local database:

```powershell
docker compose -f docker-compose.ranked-pattern-local.yml down -v
npm run db:local:ranked-pattern:up
$env:DATABASE_URL="postgresql://sonartra_local:sonartra_local@127.0.0.1:54329/sonartra_local"
npm run db:migrate
npm run prove:flow-state-ranked-pattern -- --local --allow-local-db-write
```

Expected proof markers:

- publish audit reports `canPublish=true`
- result is `READY`
- result URL is printed
- canonical payload contains all ranked-pattern sections

Never point this proof at hosted, production, or shared Supabase.

## Playwright Checks

Run:

```powershell
cmd /c npx playwright test e2e/ranked-pattern-result.spec.ts --project=chromium
cmd /c npx playwright test e2e/ranked-pattern-result.spec.ts --project=firefox
cmd /c npx playwright test e2e/ranked-pattern-result.spec.ts --project=webkit
cmd /c npx playwright test e2e/draft-runner.spec.ts --project=chromium
cmd /c npx playwright test e2e/flow-state-ranked-pattern-result.spec.ts --project=chromium
cmd /c npx playwright test e2e/ranked-pattern-admin-import.spec.ts --project=chromium
```

The generated Flow State result spec may skip when `FLOW_STATE_RANKED_PATTERN_RESULT_URL` is unset. The admin import spec may skip when local admin auth is unavailable.

## Common Blockers

- Missing four signals: publish audit blocks because ranked-pattern runtime requires exactly four active scored signals.
- Missing twenty-four patterns: publish audit blocks because every rank tuple must have result-language coverage.
- Draft rows not publishable: apply import only to editable draft versions with `mode=single_domain` and `result_model_key=ranked_pattern`.
- Missing preview case: package audit blocks or warns because proof coverage is incomplete.
- Missing result-language coverage: publish audit reports the section and pattern/shape coverage gap.
- Question-scoped option keys: option keys must remain scoped and stable so weights map deterministically.
- Local DB or Docker unavailable: skip the proof harness and report the environment blocker.
- Blank Clerk test keys in CI: Playwright config must provide safe test defaults or repository secrets without committing real secrets.

## Archived Commands

The WPLP seed pipeline is archived. Historical local commands are quarantined as:

- `npm run archive:wplp80:convert`
- `npm run archive:wplp80:verify`
- `npm run archive:wplp80:seed`
- `npm run archive:wplp80:review-domain-language`

Do not use archived WPLP commands as active ranked-pattern workflow steps.
