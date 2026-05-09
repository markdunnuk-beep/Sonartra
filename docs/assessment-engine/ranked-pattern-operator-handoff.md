# Ranked-Pattern Operator Handoff

This is the operator runbook for taking a ranked-pattern assessment from authoring files to a published production assessment and a verified persisted result.

## Active Model

The active Sonartra assessment model is single-domain ranked-pattern only.

- One assessment package has one active domain.
- One active domain has exactly four scored signals.
- The four signals produce exactly twenty-four ranked patterns.
- Four score shapes are supported: `concentrated`, `paired`, `graduated`, and `balanced`.
- Runtime scoring uses `option_signal_weights` only.
- The engine deterministically normalizes ranked signal percentages.
- The engine builds one `patternKey` from `rank_1` through `rank_4`.
- Completion persists one `canonical_result_payload`.
- Result retrieval, result pages, result lists, workspace, and dashboard summaries read the persisted payload only.

Do not add UI-side recomputation, workbook runtime reads, alternate payload shapes, WPLP, multi-domain, pair-oriented language, overlays, archetypes, thresholds, or sentence-library logic to this active path.

## Contract References

- `docs/assessment-engine/current-scope.md`
- `docs/assessment-engine/import-package-contract.md`
- `docs/assessment-engine/database-import-contract.md`
- `docs/assessment-engine/scoring-and-shape-contract.md`
- `docs/assessment-engine/publish-audit-contract.md`
- `docs/assessment-engine/result-payload-contract.md`
- `docs/assessment-engine/ranked-pattern-workbook-upload-storage.md`
- `content/assessment-packages/_template/sonartra_reader_first_import_schema_TEMPLATE.xlsx`
- `content/assessment-packages/flow-state/sonartra_reader_first_import_schema_FLOW_STATE_EXAMPLE.xlsx`

## Authoring Workflow

Authoring files live under:

```text
content/authoring/<assessment-key>/
content/authoring/generated/
```

The compiler reads the authoring config, generated PSV language files, and a template workbook, then creates a complete ranked-pattern import workbook covering sheets `00_Metadata` through `18_Lookups`.

Dry-run first:

```powershell
cmd /c npm run authoring:compile-package:dry-run -- --assessment-key leadership-approach --domain-key leadership_approach --authoring-dir content/authoring/leadership-approach --generated-dir content/authoring/generated --template-workbook content/assessment-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx --output-workbook tmp/compiled-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_COMPILED.xlsx
```

Write mode:

```powershell
cmd /c npm run authoring:compile-package -- --assessment-key leadership-approach --domain-key leadership_approach --authoring-dir content/authoring/leadership-approach --generated-dir content/authoring/generated --template-workbook content/assessment-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_TEST.xlsx --output-workbook tmp/compiled-packages/leadership-approach/sonartra_reader_first_import_schema_LEADERSHIP_APPROACH_COMPILED.xlsx --write --overwrite
```

Use `tmp/compiled-packages/...` for proof runs. Use `content/assessment-packages/<assessment-key>/...` only when intentionally adding or replacing a package workbook. The compiler refuses to overwrite an existing workbook unless `--overwrite` is supplied, and it must never overwrite the source template workbook.

Compiler validation checks:

- all required sheets `00` through `18` exist
- headers match the template/import contract exactly
- `00_Metadata` has exactly one row
- exactly four active scored signals exist
- questions, options, and option weights resolve consistently
- generated score-shape sections cover `24 patterns x 4 score shapes`
- signal roles cover `4 signals x 4 rank positions`
- strengths, narrowing, and application cover all twenty-four patterns
- unsupported score shapes fail
- duplicate lookup keys fail
- blank required text fields fail
- `pattern_key` matches `rank_1` through `rank_4`
- import summary row counts match the generated workbook rows

The compiler does not silently normalize `assessment_key`, `domain_key`, or signal keys. If a key is wrong, fix the source authoring config or generated rows explicitly.

## Package Workbook Workflow

Production operators use the package-first admin workflow:

```text
/admin/assessments/ranked-pattern/workflow
```

Primary path:

1. Upload workbook.
2. Check workbook.
3. Create draft.
4. Preview import.
5. Import to draft.
6. Check publish readiness.
7. Publish assessment.

The existing keyed route remains available after a compatible package exists:

```text
/admin/assessments/ranked-pattern/<assessment-key>/workflow
```

Legacy builder-created records must not be used as the active path. Incompatible legacy records should be archived or cleaned up through the guarded cleanup script.

## Production Upload Storage

Production workbook upload uses private Supabase Storage. The expected bucket is:

```text
assessment-import-packages
```

Bucket requirements:

- private only
- no public URLs
- no anonymous public read policy
- server-side service-role access only

Required Vercel environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RANKED_PATTERN_WORKBOOK_STORAGE_BUCKET
RANKED_PATTERN_WORKBOOK_MAX_BYTES
RANKED_PATTERN_WORKBOOK_STORAGE_TIMEOUT_MS
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-side only. Do not expose it to browser code, logs, screenshots, docs, or committed files.

Uploaded workbooks are admin/import artifacts. Runtime assessment completion and result rendering do not read workbook files after import.

## Safety Rules

- Checking a workbook does not publish.
- Preview import is non-mutating.
- Import writes to a draft version only.
- Publish is a separate explicit action.
- Publish affects new attempts only.
- Completed results remain tied to their original `assessment_version_id` and persisted `canonical_result_payload`.
- Workbooks are import/admin artifacts only.
- Runtime reads database rows only.
- UI reads persisted payload/read-model fields only.

`SCORE_SHAPE_RULES_NOT_SUPPLIED` is an acceptable non-blocking warning when the fixed platform score-shape policy is active and named. Do not add workbook score-shape rules just to remove that warning.

## Runtime Proof

After publishing, prove the runtime path by completing one controlled assessment through the real route for the intended user or a clearly identified test account.

Verify:

- one attempt is created
- expected response count is stored
- one result is created
- result status is ready
- `results.canonical_result_payload` is present
- ranked signals total 100 after normalization
- `scoreShape` is one of the four supported values
- `patternKey` resolves to one of the twenty-four ranked patterns
- all reader-first sections render from persisted payload
- result list and workspace summaries read persisted payload/read-model fields

Production route access can return 404 when the authenticated Clerk user does not own the result. Treat that as ownership enforcement, not a rendering failure.

## Cleanup

Use the guarded cleanup script for obsolete builder-created or disposable proof assessment records:

```powershell
cmd /c npx tsx scripts/database/remove-legacy-builder-assessments.ts --dry-run --target live --assessment-key <assessment-key>
```

Rules:

- dry-run first
- inspect resolved assessment/version/result IDs
- export affected rows before apply
- delete children before parents through the script transaction
- protect real package keys such as `leadership-approach`
- do not manually delete related rows
- do not use title matching as a delete criterion

Only run `--apply` after dry-run output has been reviewed and the target key is confirmed disposable.

## Proven Production Evidence

The ranked-pattern path has been proven end to end:

- `leadership-approach` was published live as a package-first ranked-pattern assessment.
- A live authenticated Leadership Approach result was completed successfully.
- The uploaded-workbook path was proven with a disposable package key.
- The disposable uploaded-package proof was cleaned up.
- Obsolete live records `sonartra-leadership-approach` and `test` were removed.
- Disposable key `upload-proof-leadership-approach` was cleaned up.

Do not recreate obsolete keys as active assessment records.

## Troubleshooting

- Valid upload fails with storage configuration errors: confirm Vercel env vars and redeploy.
- Valid upload fails after env config: confirm `assessment-import-packages` exists and is private.
- Invalid file type should fail inline; only `.xlsx` uploads are accepted.
- Manual package references are advanced/development fallback only, not the normal production upload path.
- Domain-key mismatch must be fixed explicitly in authoring config/generated rows. Do not rely on hyphen/underscore normalization.
- If `.next` grows large locally, it can be deleted and regenerated by `npm run build` or `npm run dev`.
- If a production result route returns 404 for a known result, confirm the authenticated Clerk user owns or can view that result.

## Final Verification Commands

Run the standard regression set before handing off changes:

```powershell
cmd /c npx tsx --test tests/authoring-package-compile-planner.test.ts
cmd /c npx tsx --test tests/ranked-pattern-admin-import-ui.test.tsx
cmd /c npx tsx --test tests/ranked-pattern-admin-import-workflow.test.ts
cmd /c npx tsx --test tests/ranked-pattern-admin-versioning.test.ts
cmd /c npx tsx --test tests/ranked-pattern-publish-audit.test.ts
cmd /c npx tsx --test tests/leadership-approach-ranked-pattern-package.test.ts
cmd /c npm run lint
cmd /c npm run build
```
