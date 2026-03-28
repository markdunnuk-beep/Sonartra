# Engine Domain Interpretation Audit

## Current pipeline

The active WPLP-80 result path remains:

1. `lib/engine/scoring.ts`
   - aggregates raw signal totals from `option_signal_weights`
   - produces `ScoreResult.domainSummaries`
2. `lib/engine/normalization.ts`
   - normalizes raw scores and ranks signals
   - produces `NormalizedResult.domainSummaries`
3. `lib/engine/result-builder-helpers.ts`
   - projects normalized data into the canonical payload
   - currently builds:
     - `domainSummaries` as a direct normalized projection
     - `overviewSummary`, `strengths`, `watchouts`, `developmentFocus` via `lib/engine/result-interpretation.ts`
4. `lib/server/result-read-model.ts`
   - reads the persisted canonical payload only
5. `app/(user)/app/results/[resultId]/page.tsx`
   - currently adds six-card domain interpretation in React with `getDomainInterpretation(...)`

## Current interpretation status

- `overviewSummary`
  - deterministic
  - built in `lib/engine/result-interpretation.ts`
  - signal-template driven
- `strengths`
  - deterministic
  - built in `lib/engine/result-interpretation.ts`
  - template driven from top-ranked signals
- `watchouts`
  - deterministic
  - built in `lib/engine/result-interpretation.ts`
  - mix of top-signal template + a small explicit rule list + low-signal fallback
- `developmentFocus`
  - deterministic
  - built in `lib/engine/result-interpretation.ts`
  - low-signal template driven
- `domain summaries`
  - persisted payload currently contains normalized score projections only
  - richer six-domain interpretation is currently partly hardcoded in React
  - sentence-library seed rows are not yet part of the live runtime execution path

## Exact extension points

1. Sentence library expansion
   - add typed fragment inventory in an engine-side interpretation module first
   - future DB lift should connect seeded `sentenceLibrary` rows into the runtime definition and replace matching static fragments
2. Pairwise rules
   - add them inside the result-builder path, after normalization and before payload persistence
   - attach output to canonical `domainSummaries[*].interpretation`
3. Intensity modifiers
   - resolve from normalized domain percentages inside the same builder-stage interpretation module
4. Domain summary generation
   - integrate in `buildDomainSummaries(...)` inside `lib/engine/result-builder-helpers.ts`
   - remove React-side summary generation from `app/(user)/app/results/[resultId]/page.tsx`

## Refactor boundary

- Do not change scoring
- Do not change normalization
- Do not add a second payload
- Do not compute interpretation in React
- Keep the extension additive by enriching canonical `domainSummaries`, not replacing them
