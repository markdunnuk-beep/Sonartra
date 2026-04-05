# Hero Exploration Summary

- Run mode: full_combinatorial
- Total profiles processed: 46656
- Final fallback count: 9215
- Final fallback share: 19.8%
- Final worst collision count: 3
- Implementation-ready: yes

## Final 12 Active Patterns

- forceful_driver
- exacting_controller
- delivery_commander
- deliberate_craftsperson
- grounded_planner
- relational_catalyst
- adaptive_mobiliser
- steady_steward

## Consolidation Map

- forceful_driver: forceful_driver, adaptive_challenger
- exacting_controller: exacting_controller
- delivery_commander: delivery_commander, decisive_orchestrator, steady_executor
- deliberate_craftsperson: deliberate_craftsperson
- grounded_planner: grounded_planner
- relational_catalyst: relational_catalyst, driving_integrator
- adaptive_mobiliser: flexible_mobiliser, adaptive_catalyst, adaptive_orchestrator
- steady_steward: steady_steward, steady_connector, diplomatic_stabiliser, responsive_mediator, grounded_steward, structured_collaborator

## Round 2 vs Round 3 vs Final

| Metric | Round 2 | Round 3 | Final |
| --- | ---: | ---: | ---: |
| total profiles processed | 46656 | 46656 | 46656 |
| fallback count | 16881 (36.2%) | 17432 (37.4%) | 9215 (19.8%) |
| zero-match count | 16881 | 17432 | 9215 |
| single-match count | 16766 | 19626 | 33464 |
| multi-match count | 13009 | 9598 | 3977 |
| worst collision count | 6 | 6 | 3 |
| dead pattern count | 0 | 0 | 0 |

- Dead patterns in round 2: none
- Dead patterns in round 3: none
- Dead patterns in final model: none

## Top Winners by Round

| Round 2 | Count | Share | Round 3 | Count | Share | Final | Count | Share |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |
| balanced_operator | 16881 | 36.2% | balanced_operator | 17432 | 37.4% | relational_catalyst | 12098 | 25.9% |
| flexible_mobiliser | 5117 | 11.0% | flexible_mobiliser | 5410 | 11.6% | balanced_operator | 9215 | 19.8% |
| relational_catalyst | 4220 | 9.0% | relational_catalyst | 4061 | 8.7% | steady_steward | 8969 | 19.2% |
| delivery_commander | 3450 | 7.4% | steady_connector | 3359 | 7.2% | adaptive_mobiliser | 6400 | 13.7% |
| driving_integrator | 3405 | 7.3% | driving_integrator | 3145 | 6.7% | delivery_commander | 3405 | 7.3% |
| steady_connector | 3074 | 6.6% | delivery_commander | 3132 | 6.7% | forceful_driver | 3120 | 6.7% |
| structured_collaborator | 1919 | 4.1% | adaptive_catalyst | 1453 | 3.1% | grounded_planner | 1502 | 3.2% |
| adaptive_catalyst | 1854 | 4.0% | structured_collaborator | 1377 | 3.0% | deliberate_craftsperson | 1113 | 2.4% |
| deliberate_craftsperson | 1113 | 2.4% | adaptive_orchestrator | 1336 | 2.9% | exacting_controller | 834 | 1.8% |
| diplomatic_stabiliser | 972 | 2.1% | deliberate_craftsperson | 1113 | 2.4% | - | - | - |

## Final Pattern Coverage

| Pattern | Match Count | Win Count | Win Rate | Example Profiles | Change Note |
| --- | ---: | ---: | ---: | --- | --- |
| relational_catalyst | 12922 | 12098 | 93.6% | generated_00115, generated_00117, generated_00118 | retained as the activating social lane, now broad enough to absorb socially energising profiles even when the pace signal is carried more by people energy than by raw pace points. |
| balanced_operator | 0 | 9215 | 0.0% | generated_00110, generated_00114, generated_00116 | unchanged fallback retained as the final deterministic catch-all. |
| steady_steward | 10334 | 8969 | 86.8% | generated_01424, generated_01435, generated_01436 | retained as the broad calm relational lane for the MVP, absorbing connector, mediator, grounded stewardship, and structured collaborator territory. |
| adaptive_mobiliser | 7430 | 6400 | 86.1% | generated_00112, generated_00113, generated_00136 | new consolidated adaptive identity merging flexible_mobiliser, adaptive_catalyst, and adaptive_orchestrator into one mobile change-oriented lane, with a broader adaptive threshold to reduce underfit mid-range profiles. |
| delivery_commander | 3558 | 3405 | 95.7% | generated_00229, generated_00230, generated_00231 | retained as the direct execution lane, now absorbing decisive_orchestrator and steady_executor for the MVP taxonomy. |
| forceful_driver | 3120 | 3120 | 100.0% | generated_00001, generated_00002, generated_00003 | retained as the clearest high-pace high-assertive Hero lane, now also covering the adaptive challenger edge for MVP. |
| grounded_planner | 2031 | 1502 | 74.0% | generated_00072, generated_00108, generated_00216 | retained as the quiet grounded planning identity for the MVP, holding the deliberate-stable middle that does not need its own delivery or social variant. |
| deliberate_craftsperson | 1176 | 1113 | 94.6% | generated_03042, generated_03054, generated_03078 | retained as the quality-and-method identity because it stayed clean and editorially strong. |
| exacting_controller | 936 | 834 | 89.1% | generated_02595, generated_02601, generated_02607 | retained unchanged because it was already highly specific, low-collision, and implementation-ready. |

## Final Collision Summary

- delivery_commander > adaptive_mobiliser: 593
- delivery_commander > steady_steward: 561
- adaptive_mobiliser > steady_steward: 422
- delivery_commander > relational_catalyst: 343
- forceful_driver > relational_catalyst: 262
- deliberate_craftsperson > adaptive_mobiliser: 209
- forceful_driver > steady_steward: 197
- delivery_commander > grounded_planner: 191
- deliberate_craftsperson > grounded_planner: 157
- grounded_planner > adaptive_mobiliser: 154

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

- Overall judgement: The final 12-pattern model is clean enough to move into engine and builder implementation.
- Strongest editorial patterns: forceful_driver, delivery_commander, exacting_controller, deliberate_craftsperson, relational_catalyst, steady_steward
- Fallback-heavy regions: mid-range mixed profiles that spread across task, social, and adaptive traits without a dominant lane; moderate structured + social profiles that miss structured_collaborator by one threshold; balanced adaptive profiles that are not social enough for relational_catalyst and not flexible enough for adaptive_mobiliser
- Remaining weak spots: balanced_operator still covers too much of the combinatorial space; relational_catalyst and steady_steward still overlap on people-led profiles with moderate pace and stability; adaptive_mobiliser can still brush against structured_collaborator and relational_catalyst in mixed adaptive-social cases

## Change Log

Rule and pattern changes:
- adaptive_catalyst: retired into adaptive_mobiliser for the final consolidation.
- adaptive_challenger: retired into forceful_driver for the 8-pattern MVP so the fast assertive pole remains one clearer Hero lane.
- adaptive_mobiliser: new consolidated adaptive identity merging flexible_mobiliser, adaptive_catalyst, and adaptive_orchestrator into one mobile change-oriented lane, with a broader adaptive threshold to reduce underfit mid-range profiles.
- adaptive_orchestrator: retired into adaptive_mobiliser for the final consolidation.
- balanced_operator: unchanged fallback retained as the final deterministic catch-all.
- calm_operator: legacy baseline pattern retained only for historical comparison.
- decisive_orchestrator: retired into delivery_commander for the 8-pattern MVP so execution control and delivery pressure live in one lane.
- deliberate_craftsperson: retained as the quality-and-method identity because it stayed clean and editorially strong.
- delivery_commander: retained as the direct execution lane, now absorbing decisive_orchestrator and steady_executor for the MVP taxonomy.
- diplomatic_stabiliser: retired into steady_steward for the final consolidation.
- driving_integrator: merged into relational_catalyst to remove a near-neighbour social pace distinction that belonged more in domain chapters than Hero identity.
- exacting_controller: retained unchanged because it was already highly specific, low-collision, and implementation-ready.
- flexible_mobiliser: retired into adaptive_mobiliser for the final consolidation.
- forceful_driver: retained as the clearest high-pace high-assertive Hero lane, now also covering the adaptive challenger edge for MVP.
- grounded_planner: retained as the quiet grounded planning identity for the MVP, holding the deliberate-stable middle that does not need its own delivery or social variant.
- grounded_steward: retired into steady_steward for the final consolidation.
- relational_catalyst: retained as the activating social lane, now broad enough to absorb socially energising profiles even when the pace signal is carried more by people energy than by raw pace points.
- responsive_mediator: retired into steady_steward for the final consolidation.
- steady_connector: retired into steady_steward for the final consolidation.
- steady_executor: retired into delivery_commander for the 8-pattern MVP so execution reliability is handled in one broader delivery lane.
- steady_steward: retained as the broad calm relational lane for the MVP, absorbing connector, mediator, grounded stewardship, and structured collaborator territory.
- structured_collaborator: retired into steady_steward for the 8-pattern MVP so the structured social middle does not compete for its own narrow Hero lane.

Pair-trait weight changes:
- No pair-trait weight mappings changed in the final 12-pattern consolidation.

Pattern inventory changes:
- final active patterns: forceful_driver, exacting_controller, delivery_commander, deliberate_craftsperson, grounded_planner, relational_catalyst, adaptive_mobiliser, steady_steward
- added in final consolidation: adaptive_mobiliser, steady_steward
- retired from round 3: adaptive_catalyst, adaptive_challenger, adaptive_orchestrator, decisive_orchestrator, diplomatic_stabiliser, driving_integrator, flexible_mobiliser, grounded_steward, responsive_mediator, steady_connector, steady_executor, structured_collaborator
- retained into final system: deliberate_craftsperson, delivery_commander, exacting_controller, forceful_driver, grounded_planner, relational_catalyst

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

