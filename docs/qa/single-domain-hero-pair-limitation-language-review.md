# Single-Domain Hero, Pair, And Limitation Language Review

## 1. What Changed

- Rewrote all six Hero pair rows in `single_domain_hero_pairs.csv`.
- Rewrote all six Pair summary rows in `single_domain_pair_summaries.csv`.
- Rewrote all six Limitation rows in `single_domain_limitations.csv`.
- Filled the five previously blank non-`results_process` pair rows in each dataset.
- Tightened the existing `results_process` copy to match the editorial style guide more closely.

## 2. What Was Preserved

- All structural keys and enum-like fields remained unchanged.
- The current section-first import contract remained unchanged.
- No scoring, completion, payload, rendering, UI, or fallback code changed.
- The importer mapping from section-first authoring fields to persisted runtime fields remained unchanged.

## 3. How The Rewrite Follows The Editorial Style Guide

- Hero language now names a clear operating pattern and stance without drifting into personality-label language.
- Pair language now explains the interaction between the two strongest signals, the advantage it creates, the tension it introduces, and the best deliberate use of that combination.
- Limitation language is candid about narrowing effects, but it stays constructive and points towards the missing range rather than sounding punitive.
- Across all three datasets, the copy avoids absolutes, filler, therapy language, and generic motivational phrasing.

## 4. Checks For Duplication Between Hero And Pair

- Hero rows focus on the overall operating stance of the pattern.
- Pair rows focus on the interaction between the two dominant signals.
- Repeated terms such as `momentum`, `structure`, or `commitment` still appear where they are conceptually necessary, but the section jobs remain distinct.
- No Hero row simply restates its matching Pair opening line.

## 5. Checks For Limitation Tone

- Limitation rows describe cost and narrowing without labelling the user as deficient.
- The weaker-range paragraph in each row points to what must be read, clarified, or strengthened.
- The tone stays operational rather than moralising.

## 6. Remaining Risks

- The current authoring CSVs still use the section-first schema, while some older docs describe the persisted runtime field names. That distinction is real and should stay explicit during import.
- The Hero mapper currently reuses section-first fields across several persisted hero fields, including `hero_subheadline`, `hero_tension_paragraph`, and `hero_close_paragraph`. This task did not change that mapping.
- Because import and regeneration were not run here, live rendered verification of the new prose is still pending.

## 7. Validation Results

- `cmd /c npm run lint`: passed
- `cmd /c npm run build`: passed
- `cmd /c node --test -r tsx tests/single-domain-results-report.test.tsx tests/single-domain-reading-sections-contract.test.ts tests/single-domain-results-view-model.test.ts tests/single-domain-completion.test.ts`: passed after rerun outside the sandbox because the first sandboxed attempt failed with `spawn EPERM`
- Import: not run in this task
- Regeneration: not run in this task
- Browser QA: deferred until import and regeneration are performed
