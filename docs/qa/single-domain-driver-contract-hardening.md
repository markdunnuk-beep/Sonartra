# Single-Domain Driver Contract Hardening

Date: 25 April 2026

Target records:

- `assessment_version_id`: `1f1e673d-1c80-4142-ab97-8d8126119dfb`
- `attempt_id`: `78fd04b9-48f1-451a-b568-db66e8c4ab6e`
- `result_id`: `7caefdbf-ee98-47c7-bd21-33484e1cec48`

## Summary Of Root Cause

The semantic trace and import completeness audit showed that the report contradictions were already present in the persisted canonical payload. The UI rendered the payload faithfully.

The immediate cause was completion fallback behaviour:

- Some role-specific driver fields were blank in `assessment_version_single_domain_signal_chapters`.
- Generic legacy fields contained role-specific language such as "main driver" and "weaker range".
- Completion used those generic fields as unrestricted fallbacks.
- The target result therefore persisted secondary/supporting/range text that contradicted the signal hierarchy.
- The coherent `process_results` balancing row existed, but the previous balancing specificity guard rejected it and forced generated fallback limitation copy.

## Rules Introduced

Completion now checks semantic compatibility before using fallback signal text:

- `secondary_driver` must not use text containing "main driver".
- `supporting_context` must not use text containing "main driver".
- `range_limitation` / underplayed must not use text containing "main driver".
- Primary, secondary, and supporting roles must not use "weaker range" / "underplayed" language.
- Primary-signal limitation fallback must not use text saying the primary signal is weaker or underplayed.

When no compatible text exists, completion generates deterministic neutral fallback wording from the signal label and role. It does not persist blanks or contradictory text.

Fallback use is surfaced through payload diagnostics warnings in this form:

```text
single_domain_driver_language_fallback: signal_key=<key>; missing_role=<role>; fallback_source=<source>; generated=<true|false>
```

Warnings are deduplicated before being added to `diagnostics.warnings`.

## Files Changed

- `lib/server/single-domain-completion.ts`
- `tests/single-domain-completion.test.ts`
- `docs/qa/single-domain-driver-contract-hardening.md`

Related audit docs currently present in the worktree:

- `docs/qa/single-domain-language-semantic-trace.md`
- `docs/qa/single-domain-drivers-import-completeness-audit.md`

## Tests Added

Added a focused completion regression in `tests/single-domain-completion.test.ts` that models the live Blueprint ranking:

- Results = primary
- Process = secondary
- People = supporting
- Vision = underplayed
- Pair = `process_results`

The test asserts:

- Process secondary copy does not contain "main driver".
- People supporting copy does not contain "main driver".
- Vision range-limitation copy does not contain "main driver".
- Results primary copy does not contain "weaker range".
- Limitation does not say "Results is the weaker range".
- The `process_results` balancing row is accepted.
- The generated payload passes `isSingleDomainResultPayload`.
- Fallback warnings are emitted for missing role coverage.

## Regeneration Simulation Result

A temporary read-only simulation script was run against `attempt_id = 78fd04b9-48f1-451a-b568-db66e8c4ab6e` and then removed.

Simulation result:

- Payload valid: yes.
- `topPair`: `process_results`.
- Required signal/balancing blank fields: none.
- Contradiction checks found: none.
- `process_results` balancing row used: yes.
- The limitation title was `When structure outruns commitment`, confirming the imported pair-owned row was selected instead of generated fallback copy.
- Fallback warnings were emitted for missing role coverage, including Results primary, Process secondary, People supporting, and Vision range limitation.

## Whether Contradictions Are Resolved In Simulated Payload

Yes. The simulated payload no longer contained the target contradiction patterns:

- `Process is the main driver`
- `People is the main driver`
- `Vision is the main driver`
- `Results is the weaker range`

The simulated payload also avoided blank required signal and balancing fields and passed `isSingleDomainResultPayload`.

## Whether Live Result Still Needs Regeneration

Yes. This task changed the completion path only. It did not mutate the existing production result.

The existing `result_id = 7caefdbf-ee98-47c7-bd21-33484e1cec48` still needs regeneration through the approved completion/regeneration path after this code is deployed.

## Validation Results

Commands run:

```text
cmd /c node --test -r tsx tests/single-domain-completion.test.ts
```

Result: passed, 11/11 tests.

```text
cmd /c npm run lint
```

Result: passed.

```text
cmd /c node --test -r tsx tests/single-domain-results-report.test.tsx
cmd /c node --test -r tsx tests/single-domain-results-smoke.test.tsx
```

Initial sandbox run hit `spawn EPERM`; both were rerun outside the sandbox and passed.

```text
cmd /c npm run build
```

Result: passed.

## Remaining Risks

- This hardening prevents contradictory persistence, but it does not fill the underlying 16-cell driver role matrix. Missing coverage should still be addressed in the language contract.
- Neutral fallback copy is deliberately conservative. It is safer than contradictory copy but not a substitute for authored role-specific language.
- Pair-specific balancing rows are now accepted when required fields are populated for the resolved pair. Hero and pair-summary guards remain stricter.

## Recommended Next Task

Deploy this completion hardening, then regenerate `result_id = 7caefdbf-ee98-47c7-bd21-33484e1cec48` from the existing completed attempt through the approved regeneration/completion path.

After regeneration, verify:

- `isSingleDomainResultPayload` passes.
- Drivers and Limitation contain no contradictory role language.
- Workspace status remains `RESULTS READY`.
- The single-domain result route renders without a 500.
