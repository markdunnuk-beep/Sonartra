# Results Language Refinement Notes

This pass stays inside the existing canonical engine path.

Extension points:

- `lib/engine/domain-interpretation.ts`
  - `PAIRWISE_RULES`: author premium summary rewrites for the highest-value core-domain combinations.
  - `buildSupportLine(...)`: keep the supporting line concise and domain-aware.
  - `buildTensionClause(...)`: inject deterministic trade-off language from the primary and secondary pattern without creating a second output path.
  - `buildDomainInterpretation(...)`: persist `summary`, `supportingLine`, and `tensionClause` into the canonical domain interpretation payload.

- `lib/engine/result-interpretation.ts`
  - `SIGNAL_TEMPLATES`: richest Action Focus copy lives here for strengths, watchouts, and development focus.
  - `PREFIX_TEMPLATES`: fallback Action Focus tone for unmapped signals.
  - `RULE_BASED_WATCHOUTS`: deterministic cross-signal watchout language.

- `app/(user)/app/results/[resultId]/page.tsx`
  - Hero chips are page-rendered. They should stay read-only and come from persisted domain results rather than mixed ad hoc labels.
  - Domain cards should render persisted `summary`, `supportingLine`, and `tensionClause` only.

Scope guard:

- No scoring changes
- No UI-side interpretation logic
- No new result format
- No non-deterministic copy generation

Conflict and Stress audit for the current pass:

- Conflict rules already at the newer premium standard:
  - `conflict_compete_collaborate`
  - `conflict_accommodate_compromise`

- Conflict rules still using the older assembled pattern before this pass:
  - `conflict_compete_compromise`
  - `conflict_compete_accommodate`
  - `conflict_compete_avoid`
  - `conflict_collaborate_compete`
  - `conflict_collaborate_compromise`
  - `conflict_collaborate_accommodate`
  - `conflict_collaborate_avoid`
  - `conflict_compromise_compete`
  - `conflict_compromise_collaborate`
  - `conflict_compromise_avoid`
  - `conflict_accommodate_compete`
  - `conflict_accommodate_collaborate`
  - `conflict_accommodate_avoid`
  - `conflict_avoid_compete`
  - `conflict_avoid_collaborate`
  - `conflict_avoid_compromise`
  - `conflict_avoid_accommodate`

- Stress rules already at the newer premium standard:
  - `stress_control_scatter`
  - `stress_scatter_avoidance`

- Stress rules still using the older assembled pattern before this pass:
  - `stress_control_avoidance`
  - `stress_control_criticality`
  - `stress_scatter_control`
  - `stress_scatter_criticality`
  - `stress_avoidance_control`
  - `stress_avoidance_scatter`
  - `stress_avoidance_criticality`
  - `stress_criticality_control`
  - `stress_criticality_scatter`
  - `stress_criticality_avoidance`

- Model note:
  - There is no separate `withdrawal` stress signal in the current seeded model.
  - The existing pressure-withdrawal behaviour is represented by `stress_avoidance`, so this pass upgrades those combinations rather than introducing new signal keys.
