# Live Blueprint Corrected Driver Claim Completion Rerun

Date: 2026-04-28

## Scope

Create a fresh attempt against the published single-domain version `305cedaf-7431-4efe-a4e2-11127c08a318`, answer all questions deterministically, submit through the existing runtime path, and prove whether the repaired `DRIVER_CLAIMS` dataset now reaches `READY`.

## Final Proof After Contract Alignment

After aligning the single-domain runtime contract to exact rank-dependent tuples, the published version was repaired in place to match that contract:

- `DRIVER_CLAIMS` expanded from `24` rows to `48` exact tuples
- `HERO_PAIRS` visible text was adjusted so each row explicitly references its active pair signals

Fresh successful proof:

- attempt_id: `4d0d4125-af27-451c-9339-4fdf01d9df83`
- result_id: `221b5880-ca28-4c86-8f45-265cd34b4a37`
- published version id: `305cedaf-7431-4efe-a4e2-11127c08a318`
- readiness_status: `READY`
- pipeline_status: `COMPLETED`
- route checked: `/app/results/single-domain/221b5880-ca28-4c86-8f45-265cd34b4a37`

Verified result surfaces:

- workspace/dashboard: `READY`
- results list: includes `221b5880-ca28-4c86-8f45-265cd34b4a37`
- canonical single-domain result route: resolved through the persisted single-domain payload

Verified exact tuple sourcing on the fresh ready result:

- `process_people + people + primary_driver`
- `process_people + process + secondary_driver`
- `process_people + results + supporting_context`
- `process_people + vision + range_limitation`

The persisted payload diagnostics recorded four `single_domain_driver_claim_source` entries and zero `single_domain_pair_driver_claim_missing` warnings.

## Published Assessment

- assessment: `Blueprint - Understand how you lead TEST`
- assessment_key: `blueprint-understand-how-you-lead-test`
- published version id: `305cedaf-7431-4efe-a4e2-11127c08a318`
- lifecycle_status: `PUBLISHED`

## Fresh Proof Attempts

The live proof was run against user:

- user_id: `18d6e6a0-c618-480f-a744-5b3e4b34320d`
- email: `mark.dunn.uk@gmail.com`

Fresh attempts created during this verification:

1. attempt_id: `60e054fd-0d59-4e97-af65-cac1ec193b43`
   result_id: `5f070a98-ab3a-47f5-a001-3feb011f8e8f`
   outcome: `FAILED`
   failure_reason: `DRIVER_CLAIMS rows must match the exact runtime lookup tuple domain_key + pair_key + signal_key + driver_role.`

2. attempt_id: `02499886-41bd-4385-a5ad-9dc0f7d86b57`
   result_id: `a7902774-fcbf-4417-bd38-9a32a01c37f8`
   deterministic response pattern: all option index `0`
   outcome: `FAILED`
   failure_reason: `Missing DRIVER_CLAIMS row for pair "process_people", signal "people", and role "primary_driver".`

3. attempt_id: `bbc9eecb-8aba-4ad6-b8f5-85e634e2abb3`
   result_id: `ec06d924-ea0f-4d9a-ae78-e7a2745903d1`
   deterministic response pattern: all option index `2`
   outcome: `FAILED`
   failure_reason: `Missing canonical HERO_PAIRS row for pair "results_people" (row missing or references non-active pair language).`

4. attempt_id: `4d0d4125-af27-451c-9339-4fdf01d9df83`
   result_id: `221b5880-ca28-4c86-8f45-265cd34b4a37`
   deterministic response pattern: all option index `0`
   outcome: `READY`
   failure_reason: none

## What Was Verified

The published authored language was rechecked against the runtime context:

- domain_key: `leadership-approach`
- signal order: `process`, `results`, `vision`, `people`
- canonical pair keys: `results_process`, `results_vision`, `results_people`, `process_vision`, `process_people`, `vision_people`
- final persisted `DRIVER_CLAIMS` row count: `48`

After the final repair, the published version matched the runtime-definition tuple set exactly for:

- `domain_key + pair_key + signal_key + driver_role`

The earlier live blockers were confirmed and then repaired in place:

- `DRIVER_CLAIMS` needed the full `48`-row rank-dependent matrix, not the older fixed `24`-row matrix
- `HERO_PAIRS` rows needed visible text that explicitly referenced the active pair signals

## READY Status

- ready_status: `ACHIEVED`
- latest fresh attempt: `4d0d4125-af27-451c-9339-4fdf01d9df83`
- latest fresh result row: `221b5880-ca28-4c86-8f45-265cd34b4a37`
- latest result readiness_status: `READY`
- latest result pipeline_status: `COMPLETED`

## Route Check

The fresh ready result was verified through the canonical single-domain route and read-model-backed listings:

- workspace/dashboard: latest ready result id is `221b5880-ca28-4c86-8f45-265cd34b4a37`
- results list: contains `221b5880-ca28-4c86-8f45-265cd34b4a37`
- canonical single-domain result route: `/app/results/single-domain/221b5880-ca28-4c86-8f45-265cd34b4a37`

## Validation Commands Run

- `npm run build`
- `npx tsx --test tests/single-domain-completion.test.ts`
- `npx tsx --test tests/assessment-completion-service.test.ts`
- `npx tsx --test tests/admin-single-domain-language-import.test.ts`
- `npx tsx --test tests/single-domain-import-validators.test.ts`
- `npx tsx --test tests/single-domain-runtime-definition.test.ts`
- `npx tsx --test tests/single-domain-structural-validation.test.ts`
- `npx tsx .codex-temp/inspect-blueprint-patterns.ts`
- `npx tsx .codex-temp/find-completable-blueprint-pattern.ts`
- `npx tsx .codex-temp/live-corrected-driver-proof.ts`
- `npx tsx .codex-temp/live-single-domain-contract-proof.ts`
- `npx tsx .codex-temp/repair-and-prove-live-single-domain.ts`

## Conclusion

The published version now supports end-to-end completion through the existing runtime path. The original `results_vision + results + primary_driver` gap is gone, the published version now carries the full `48` exact `DRIVER_CLAIMS` tuples required by the aligned runtime contract, `HERO_PAIRS` strict validation passes, and a fresh live attempt completes to a persisted `READY` single-domain result that appears in workspace, dashboard, results list, and the canonical result route.
