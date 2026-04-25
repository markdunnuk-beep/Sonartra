# Single-Domain Pair-Key Canonicalisation

## Current mismatch

The seeded Leadership single-domain result and gold-standard import draft use `results_process` for the Results and Process pair. The admin section-first validator previously reused the generic pair-key canonicaliser from older hero-language imports, which sorts the two signal keys alphabetically and therefore expected `process_results`.

That made valid seeded/runtime language rows fail admin validation even though the runtime result and language audit already used `results_process`.

## Chosen canonical convention

Single-domain pair keys are canonical in authored/runtime signal order, not alphabetical order.

The runtime definition derives pairs by walking the authored signal list in order and joining the two signal keys as `left_right`. Completion then derives the top pair from the top two scored signals by resolving them against that runtime-derived pair list.

For the seeded Leadership context, the existing runtime/authored convention remains `results_process`.

## Compatibility behaviour

Section-first admin validation now accepts either ordering when both signal keys belong to a valid runtime-derived pair.

- `results_process` is accepted when it is the runtime-derived pair key.
- `process_results` is also accepted as an alias for the same two-signal pair.
- Section-first admin imports normalise reversed aliases to the runtime-derived key before mapping into legacy storage.
- Runtime readiness accepts reversed pair-language rows as resolvable aliases.
- Runtime completion resolves pair-language lookup through the runtime-derived key and persists the runtime key in the result payload.

This preserves existing seeded result payload expectations and avoids changing the payload structure or result contract.

## Files changed

- `lib/assessment-language/single-domain-pair-keys.ts`
- `lib/assessment-language/single-domain-import-validators.ts`
- `lib/assessment-language/single-domain-composer.ts`
- `lib/server/admin-single-domain-narrative-import.ts`
- `lib/server/single-domain-runtime-definition.ts`
- `lib/server/single-domain-completion.ts`
- `tests/single-domain-import-validators.test.ts`
- `tests/single-domain-runtime-definition.test.ts`
- `tests/single-domain-completion.test.ts`
- `docs/results/gold-standard-language/leadership-results-process-pipe-imports.md`

## Regression tests added

- `results_process` validates for the Leadership-style single-domain signal set.
- Reversed `process_results` validates and normalises to runtime-order `results_process`.
- Pair-owned section-first imports no longer fail solely because they use runtime-first pair ordering.
- Runtime readiness accepts reversed pair-language aliases.
- Runtime completion resolves reversed pair-language rows while persisting the runtime-derived pair key.

## Non-goals

This change does not alter report language, scoring, seed content, result payload shape, UI layout, or UI-side computation.
