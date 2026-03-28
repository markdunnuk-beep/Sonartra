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

Final insight-lift pass for Behaviour / Conflict / Stress:

- Behaviour rules lifted for added social landing and overextension nuance:
  - `style_driver_influencer`: added how the pace can feel energising to others while still reading fast-moving.
  - `style_driver_analyst`: added the decisive-and-dependable perception without changing the core pattern.
  - `style_influencer_analyst`: added a light "engaging and thought-through" outcome when the blend is working well.
  - `style_operator_driver`: added how the same pattern can reassure in stable conditions and feel firmer under pressure.

- Conflict rules lifted for clearer interaction effect and misfire risk:
  - `conflict_compete_accommodate`: added future-working-contact nuance after direct challenge.
  - `conflict_collaborate_accommodate`: added the risk of softening stronger differences too far.
  - `conflict_accommodate_collaborate`: added the felt safety this pattern can create in disagreement.
  - `conflict_accommodate_compromise`: added meeting-level realism about restoring ease before the full issue is aired.
  - `conflict_avoid_compete`: added the felt "sharp turn" others may notice when delayed challenge finally appears.

- Stress rules lifted for clearer sequence, inner state, and outward effect:
  - `stress_control_avoidance`: added beneath-the-surface unresolved-pressure nuance.
  - `stress_control_criticality`: sharpened the narrowing effect as pressure persists.
  - `stress_scatter_criticality`: added how the pattern can change the feel of the room, not just the person's focus.
  - `stress_avoidance_criticality`: clarified the gap between outward calm and inner pressure.

Pass guard:

- No scoring changes
- No new rule paths
- No UI-side logic
- Copy lift only inside the existing deterministic pairwise rule set

Primary / secondary ranking integrity fix:

- Root cause:
  - `buildDomainInterpretation(...)` derived primary and secondary from its own sorted view of `domainSummary.signalScores`.
  - The canonical payload preserved `domainSummary.signalScores` in source order from normalization.
  - The result page renders the domain card labels and percentages from persisted `signalScores[0]` and `signalScores[1]`.
  - That split source allowed interpretation to say one signal was primary while the persisted domain list still placed another signal first.

- Fix:
  - Domain `signalScores` are now canonically sorted before persistence by domain percentage descending, then deterministic tie-breakers.
  - `rankedSignalIds` now come from that same sorted domain list.
  - Domain interpretation now uses the same domain-signal ordering helper as the persisted payload.
  - The result builder now asserts that persisted domain ordering and interpretation primary/secondary fields agree exactly, and that `primaryPercent >= secondaryPercent` whenever both exist.

- Scope guard:
  - No UI workaround
  - No alternate ranking path
  - No payload shape change

Final presentation polish pass:

- Leadership copy tightened on top of the latest local interpretation state:
  - `lead_results_vision`
  - `lead_results_people`
  - `lead_vision_results`
  - `lead_vision_people`
  - `lead_people_vision`
  - Goal: match the specificity and social realism already present in Behaviour, Conflict, and Stress without expanding the architecture.

- Signal card microcopy upgraded in the results page:
  - Primary cards now describe the signal as the strongest shaping influence in that area.
  - Secondary cards now describe the signal as a meaningful secondary pull instead of using mechanical placeholder language.
  - This remains presentation-only and still reads from the persisted payload.

- Action Focus label polish:
  - Strength and development titles now use cleaner user-facing labels where the raw signal title felt too internal.
  - Watchout labels now read as product-facing phrases such as over-reliance or limited use, while preserving traceability through `signalId`.

- Grammar / consistency:
  - Shared support copy now uses `remains close enough...` to avoid awkward agreement in cases like `Results`.
