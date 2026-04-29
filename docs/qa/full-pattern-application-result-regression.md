# Full-Pattern Application Result Regression

## Scope

This QA note covers the final regression pass for the 144-row full-pattern
`single_domain_application` model.

Tasks 1 to 4 established:

- Import validation for the 11-column Application header.
- Persistence in `assessment_version_single_domain_application_statements`.
- Result composition by `pattern_key = primary_secondary_supporting_limitation`.
- Admin import guidance for 144 Application rows.

Task 5 verifies that completed single-domain results render Application output
from the persisted canonical result payload only.

## Expected Model

Application language is deterministic:

- 6 top pairs.
- 2 lower-signal permutations per pair.
- 3 focus areas.
- 4 ranked driver roles.
- 144 rows total.

Each full pattern has 12 rows:

- `rely_on` / `applied_strength` x 4 driver roles.
- `notice` / `watchout` x 4 driver roles.
- `develop` / `development_focus` x 4 driver roles.

For ranked signals:

1. `results`
2. `vision`
3. `people`
4. `process`

Expected keys:

- `pattern_key`: `results_vision_people_process`
- `pair_key`: `results_vision`

The lower-order variant `results_vision_process_people` must remain distinct and
must not be used as a fallback.

## Regression Checks

Repository tests verify:

- The exact target pattern and pair key construction.
- Lower-signal order distinction.
- Completion payloads include `application.patternKey`, `application.pairKey`,
  and structured `application.sections`.
- Existing UI-facing arrays remain populated from full-pattern Application rows.
- The single-domain result report renders all 12 Application strings for the
  selected pattern.
- The report does not render alternate-pattern text or legacy fallback copy.
- The result page keeps one main landmark and unique IDs.

The user result page remains display-only: it renders the persisted canonical
payload and does not query Application language rows or recompute the pattern in
the browser.

## Browser QA

Chrome MCP checks should cover:

- User dashboard or app entry route.
- Workspace or assessments route.
- Results list route.
- A single-domain result detail route with a full-pattern payload, if local data
  contains one.
- Desktop and mobile viewport sanity checks.
- Console runtime errors.

If local data does not contain a completed full-pattern result, deterministic
repository tests are the source of truth for this regression pass and the route
blocker should be recorded in the task summary.

## Known Unrelated Lint Blockers

Full repo lint may remain blocked by existing unrelated issues:

- `app/(admin)/admin/diagnostics/single-domain-language/[assessmentKey]/page.tsx`
  React hooks error-boundary diagnostics around JSX inside `try` / `catch`.
- `scripts/audit-single-domain-pair-coverage.ts:204` unused
  `eslint-disable` warning.
