# Hero Exploration Summary

- Run mode: full_combinatorial
- Total profiles processed: 46656
- Final fallback count: 12062
- Final fallback share: 25.9%
- Final worst collision count: 5
- Implementation-ready: no

## Final 12 Active Patterns

- forceful_driver
- adaptive_challenger
- exacting_controller
- decisive_orchestrator
- delivery_commander
- deliberate_craftsperson
- grounded_planner
- steady_executor
- structured_collaborator
- relational_catalyst
- adaptive_mobiliser
- steady_steward

## Consolidation Map

- forceful_driver: forceful_driver
- adaptive_challenger: adaptive_challenger
- exacting_controller: exacting_controller
- decisive_orchestrator: decisive_orchestrator
- delivery_commander: delivery_commander
- deliberate_craftsperson: deliberate_craftsperson
- grounded_planner: grounded_planner
- steady_executor: steady_executor
- structured_collaborator: structured_collaborator
- relational_catalyst: relational_catalyst, driving_integrator
- adaptive_mobiliser: flexible_mobiliser, adaptive_catalyst, adaptive_orchestrator
- steady_steward: steady_connector, diplomatic_stabiliser, responsive_mediator, grounded_steward

## Round 2 vs Round 3 vs Final

| Metric | Round 2 | Round 3 | Final |
| --- | ---: | ---: | ---: |
| total profiles processed | 46656 | 46656 | 46656 |
| fallback count | 16881 (36.2%) | 17432 (37.4%) | 12062 (25.9%) |
| zero-match count | 16881 | 17432 | 12062 |
| single-match count | 16766 | 19626 | 30624 |
| multi-match count | 13009 | 9598 | 3970 |
| worst collision count | 6 | 6 | 5 |
| dead pattern count | 0 | 0 | 0 |

- Dead patterns in round 2: none
- Dead patterns in round 3: none
- Dead patterns in final model: none

## Top Winners by Round

| Round 2 | Count | Share | Round 3 | Count | Share | Final | Count | Share |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |
| balanced_operator | 16881 | 36.2% | balanced_operator | 17432 | 37.4% | balanced_operator | 12062 | 25.9% |
| flexible_mobiliser | 5117 | 11.0% | flexible_mobiliser | 5410 | 11.6% | relational_catalyst | 11636 | 24.9% |
| relational_catalyst | 4220 | 9.0% | relational_catalyst | 4061 | 8.7% | steady_steward | 8944 | 19.2% |
| delivery_commander | 3450 | 7.4% | steady_connector | 3359 | 7.2% | adaptive_mobiliser | 4080 | 8.7% |
| driving_integrator | 3405 | 7.3% | driving_integrator | 3145 | 6.7% | delivery_commander | 3132 | 6.7% |
| steady_connector | 3074 | 6.6% | delivery_commander | 3132 | 6.7% | grounded_planner | 1633 | 3.5% |
| structured_collaborator | 1919 | 4.1% | adaptive_catalyst | 1453 | 3.1% | structured_collaborator | 1158 | 2.5% |
| adaptive_catalyst | 1854 | 4.0% | structured_collaborator | 1377 | 3.0% | deliberate_craftsperson | 1113 | 2.4% |
| deliberate_craftsperson | 1113 | 2.4% | adaptive_orchestrator | 1336 | 2.9% | exacting_controller | 920 | 2.0% |
| diplomatic_stabiliser | 972 | 2.1% | deliberate_craftsperson | 1113 | 2.4% | steady_executor | 575 | 1.2% |

## Final Pattern Coverage

| Pattern | Match Count | Win Count | Win Rate | Example Profiles | Change Note |
| --- | ---: | ---: | ---: | --- | --- |
| balanced_operator | 0 | 12062 | 0.0% | generated_00110, generated_00111, generated_00113 | unchanged fallback retained as the final deterministic catch-all. |
| relational_catalyst | 12162 | 11636 | 95.7% | generated_00115, generated_00117, generated_00118 | tightened so moderately stable social profiles now resolve to steady_steward instead of the broader relational lane. |
| steady_steward | 10334 | 8944 | 86.5% | generated_01424, generated_01435, generated_01436 | new consolidated stable social identity merging connector, mediator, diplomat, and grounded stewardship into one broader but clearer people-stability lane, keeping the calmer relational profiles that no longer belong in relational_catalyst. |
| adaptive_mobiliser | 4671 | 4080 | 87.3% | generated_00112, generated_00136, generated_00148 | new consolidated adaptive identity merging flexible_mobiliser, adaptive_catalyst, and adaptive_orchestrator into one mobile change-oriented lane, with a broader adaptive threshold to reduce underfit mid-range profiles. |
| delivery_commander | 3558 | 3132 | 88.0% | generated_00229, generated_00230, generated_00231 | retained as the direct delivery lane because it remains one of the clearest execution identities. |
| grounded_planner | 2031 | 1633 | 80.4% | generated_00072, generated_00108, generated_00216 | retained as the stable deliberate planning identity, but now yields the more overtly relational middle to steady_steward instead of colliding there. |
| structured_collaborator | 1443 | 1158 | 80.2% | generated_00553, generated_00554, generated_00555 | retained as the organised people-aware lane, but still requires stronger structure so it does not reopen the broad social overlap families. |
| deliberate_craftsperson | 1176 | 1113 | 94.6% | generated_03042, generated_03054, generated_03078 | retained as the quality-and-method identity because it stayed clean and editorially strong. |
| exacting_controller | 936 | 920 | 98.3% | generated_02595, generated_02601, generated_02607 | retained unchanged because it was already highly specific, low-collision, and implementation-ready. |
| steady_executor | 1382 | 575 | 41.6% | generated_00374, generated_00410, generated_01622 | retained as the dependable task-and-stability lane, distinct from the more forceful delivery patterns. |
| adaptive_challenger | 656 | 539 | 82.2% | generated_00001, generated_00005, generated_00025 | retained as the adaptive force lane because it stayed behaviourally distinct after simplification. |
| forceful_driver | 498 | 498 | 100.0% | generated_00001, generated_00002, generated_00003 | retained unchanged as the clearest high-pace high-assertive Hero lane. |
| decisive_orchestrator | 372 | 366 | 98.4% | generated_01741, generated_01742, generated_01743 | retained as the structured control lane with a lower structured threshold to protect mid-range execution profiles from fallback. |

## Final Collision Summary

- delivery_commander > steady_steward: 360
- delivery_commander > relational_catalyst: 339
- steady_executor > steady_steward: 264
- delivery_commander > steady_executor: 260
- decisive_orchestrator > delivery_commander: 252
- delivery_commander > steady_executor > steady_steward: 221
- adaptive_mobiliser > steady_steward: 187
- deliberate_craftsperson > structured_collaborator: 183
- delivery_commander > adaptive_mobiliser: 171
- deliberate_craftsperson > grounded_planner: 166

## Curated Comparison

- profile_006: forceful_driver -> forceful_driver. Equally good. The final 12-pattern model kept the same identity because the round-3 winner was already a clean Hero lane.
- profile_017: delivery_commander -> delivery_commander. Equally good. The final 12-pattern model kept the same identity because the round-3 winner was already a clean Hero lane.
- profile_018: steady_executor -> grounded_planner. Better. The final model prefers grounded_planner because the consolidated taxonomy treats that behaviour as the stronger identity-level pattern.
- profile_021: grounded_steward -> steady_steward. Better. The final model folds grounded_steward into the broader steady_steward lane, which is cleaner at Hero level without losing the behavioural signal.
- profile_003: steady_connector -> steady_steward. Better. The final model folds steady_connector into the broader steady_steward lane, which is cleaner at Hero level without losing the behavioural signal.
- profile_005: flexible_mobiliser -> relational_catalyst. Better. The final model prefers relational_catalyst because the consolidated taxonomy treats that behaviour as the stronger identity-level pattern.
- profile_010: relational_catalyst -> relational_catalyst. Equally good. The final 12-pattern model kept the same identity because the round-3 winner was already a clean Hero lane.
- profile_012: relational_catalyst -> relational_catalyst. Equally good. The final 12-pattern model kept the same identity because the round-3 winner was already a clean Hero lane.
- profile_014: relational_catalyst -> steady_steward. Better. The final model prefers steady_steward because the consolidated taxonomy treats that behaviour as the stronger identity-level pattern.
- profile_020: flexible_mobiliser -> relational_catalyst. Better. The final model prefers relational_catalyst because the consolidated taxonomy treats that behaviour as the stronger identity-level pattern.

## Narrative Judgement

- Overall judgement: The final 12-pattern model is cleaner editorially, but it is still not implementation-ready because fallback and collision depth remain above the target thresholds.
- Strongest editorial patterns: forceful_driver, delivery_commander, exacting_controller, deliberate_craftsperson, relational_catalyst, steady_steward
- Fallback-heavy regions: mid-range mixed profiles that spread across task, social, and adaptive traits without a dominant lane; moderate structured + social profiles that miss structured_collaborator by one threshold; balanced adaptive profiles that are not social enough for relational_catalyst and not flexible enough for adaptive_mobiliser
- Remaining weak spots: balanced_operator still covers too much of the combinatorial space; relational_catalyst and steady_steward still overlap on people-led profiles with moderate pace and stability; adaptive_mobiliser can still brush against structured_collaborator and relational_catalyst in mixed adaptive-social cases

## Change Log

Rule and pattern changes:
- adaptive_catalyst: retired into adaptive_mobiliser for the final consolidation.
- adaptive_challenger: retained as the adaptive force lane because it stayed behaviourally distinct after simplification.
- adaptive_mobiliser: new consolidated adaptive identity merging flexible_mobiliser, adaptive_catalyst, and adaptive_orchestrator into one mobile change-oriented lane, with a broader adaptive threshold to reduce underfit mid-range profiles.
- adaptive_orchestrator: retired into adaptive_mobiliser for the final consolidation.
- balanced_operator: unchanged fallback retained as the final deterministic catch-all.
- calm_operator: legacy baseline pattern retained only for historical comparison.
- decisive_orchestrator: retained as the structured control lane with a lower structured threshold to protect mid-range execution profiles from fallback.
- deliberate_craftsperson: retained as the quality-and-method identity because it stayed clean and editorially strong.
- delivery_commander: retained as the direct delivery lane because it remains one of the clearest execution identities.
- diplomatic_stabiliser: retired into steady_steward for the final consolidation.
- driving_integrator: merged into relational_catalyst to remove a near-neighbour social pace distinction that belonged more in domain chapters than Hero identity.
- exacting_controller: retained unchanged because it was already highly specific, low-collision, and implementation-ready.
- flexible_mobiliser: retired into adaptive_mobiliser for the final consolidation.
- forceful_driver: retained unchanged as the clearest high-pace high-assertive Hero lane.
- grounded_planner: retained as the stable deliberate planning identity, but now yields the more overtly relational middle to steady_steward instead of colliding there.
- grounded_steward: retired into steady_steward for the final consolidation.
- relational_catalyst: tightened so moderately stable social profiles now resolve to steady_steward instead of the broader relational lane.
- responsive_mediator: retired into steady_steward for the final consolidation.
- steady_connector: retired into steady_steward for the final consolidation.
- steady_executor: retained as the dependable task-and-stability lane, distinct from the more forceful delivery patterns.
- steady_steward: new consolidated stable social identity merging connector, mediator, diplomat, and grounded stewardship into one broader but clearer people-stability lane, keeping the calmer relational profiles that no longer belong in relational_catalyst.
- structured_collaborator: retained as the organised people-aware lane, but still requires stronger structure so it does not reopen the broad social overlap families.

Pair-trait weight changes:
- No pair-trait weight mappings changed in the final 12-pattern consolidation.

Pattern inventory changes:
- final active patterns: forceful_driver, adaptive_challenger, exacting_controller, decisive_orchestrator, delivery_commander, deliberate_craftsperson, grounded_planner, steady_executor, structured_collaborator, relational_catalyst, adaptive_mobiliser, steady_steward
- added in final consolidation: adaptive_mobiliser, steady_steward
- retired from round 3: adaptive_catalyst, adaptive_orchestrator, diplomatic_stabiliser, driving_integrator, flexible_mobiliser, grounded_steward, responsive_mediator, steady_connector
- retained into final system: adaptive_challenger, decisive_orchestrator, deliberate_craftsperson, delivery_commander, exacting_controller, forceful_driver, grounded_planner, relational_catalyst, steady_executor, structured_collaborator

## Detailed Worked Examples

### profile_001

Domain pairs:
- operatingStyle: driver_analyst
- coreDrivers: achievement_mastery
- leadershipApproach: results_process
- tensionResponse: compete_collaborate
- environmentFit: market_hierarchy
- pressureResponse: control_critical

Trait totals:
- assertive: 4
- exacting: 4
- structured: 4
- paced: 2
- task_led: 2
- deliberate: 1
- people_led: 1

Winner: exacting_controller

### profile_002

Domain pairs:
- operatingStyle: driver_operator
- coreDrivers: achievement_stability
- leadershipApproach: results_vision
- tensionResponse: compete_compromise
- environmentFit: market_hierarchy
- pressureResponse: control_critical

Trait totals:
- task_led: 6
- assertive: 5
- exacting: 2
- stable: 2
- adaptive: 1
- paced: 1
- structured: 1

Winner: delivery_commander

### profile_003

Domain pairs:
- operatingStyle: influencer_operator
- coreDrivers: influence_stability
- leadershipApproach: people_process
- tensionResponse: collaborate_accommodate
- environmentFit: clan_hierarchy
- pressureResponse: control_avoidance

Trait totals:
- people_led: 8
- stable: 5
- receptive: 3
- flexible: 1
- structured: 1

Winner: steady_steward

### profile_004

Domain pairs:
- operatingStyle: operator_analyst
- coreDrivers: stability_mastery
- leadershipApproach: results_process
- tensionResponse: compromise_accommodate
- environmentFit: market_hierarchy
- pressureResponse: avoidance_critical

Trait totals:
- deliberate: 6
- structured: 4
- task_led: 2
- tolerant: 2
- assertive: 1
- exacting: 1
- flexible: 1
- receptive: 1

Winner: deliberate_craftsperson

### profile_005

Domain pairs:
- operatingStyle: influencer_analyst
- coreDrivers: influence_mastery
- leadershipApproach: vision_people
- tensionResponse: collaborate_compromise
- environmentFit: adhocracy_clan
- pressureResponse: scatter_avoidance

Trait totals:
- people_led: 8
- adaptive: 5
- flexible: 4
- tolerant: 1

Winner: relational_catalyst

### profile_006

Domain pairs:
- operatingStyle: driver_influencer
- coreDrivers: achievement_influence
- leadershipApproach: results_vision
- tensionResponse: compete_collaborate
- environmentFit: market_clan
- pressureResponse: control_scatter

Trait totals:
- paced: 7
- assertive: 6
- people_led: 3
- adaptive: 2

Winner: forceful_driver

### profile_007

Domain pairs:
- operatingStyle: influencer_operator
- coreDrivers: influence_stability
- leadershipApproach: vision_people
- tensionResponse: collaborate_compromise
- environmentFit: adhocracy_clan
- pressureResponse: scatter_avoidance

Trait totals:
- people_led: 9
- flexible: 5
- adaptive: 2
- stable: 1
- tolerant: 1

Winner: relational_catalyst

### profile_008

Domain pairs:
- operatingStyle: operator_analyst
- coreDrivers: stability_mastery
- leadershipApproach: people_process
- tensionResponse: compromise_accommodate
- environmentFit: clan_hierarchy
- pressureResponse: control_avoidance

Trait totals:
- deliberate: 4
- stable: 4
- people_led: 3
- structured: 2
- tolerant: 2
- exacting: 1
- flexible: 1
- receptive: 1

Winner: steady_steward

### profile_009

Domain pairs:
- operatingStyle: driver_analyst
- coreDrivers: achievement_stability
- leadershipApproach: results_people
- tensionResponse: compete_compromise
- environmentFit: market_hierarchy
- pressureResponse: control_scatter

Trait totals:
- task_led: 6
- adaptive: 3
- assertive: 3
- paced: 2
- structured: 2
- people_led: 1
- stable: 1

Winner: delivery_commander

### profile_010

Domain pairs:
- operatingStyle: influencer_analyst
- coreDrivers: achievement_influence
- leadershipApproach: vision_process
- tensionResponse: collaborate_compromise
- environmentFit: market_adhocracy
- pressureResponse: scatter_critical

Trait totals:
- adaptive: 5
- people_led: 5
- paced: 3
- flexible: 2
- exacting: 1
- structured: 1
- tolerant: 1

Winner: relational_catalyst

