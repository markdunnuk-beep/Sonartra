# Hero Exploration Summary

- Run mode: full_combinatorial
- Total profiles processed: 46656
- Refined fallback count: 16809
- Refined fallback share: 36.0%
- Worst collision count: 6

## Round 2 vs Round 3

| Metric | Round 2 | Round 3 |
| --- | ---: | ---: |
| total profiles processed | 46656 | 46656 |
| fallback count | 16881 (36.2%) | 16809 (36.0%) |
| zero-match count | 16881 | 16809 |
| single-match count | 16766 | 19973 |
| multi-match count | 13009 | 9874 |
| worst collision count | 6 | 6 |
| dead pattern count | 0 | 0 |

- Dead patterns in round 2: none
- Dead patterns in round 3: none

## Top Winners Round 2 vs Round 3

| Round 2 | Count | Share | Round 3 | Count | Share |
| --- | ---: | ---: | --- | ---: | ---: |
| balanced_operator | 16881 | 36.2% | balanced_operator | 16809 | 36.0% |
| flexible_mobiliser | 5117 | 11.0% | flexible_mobiliser | 5378 | 11.5% |
| relational_catalyst | 4220 | 9.0% | relational_catalyst | 4061 | 8.7% |
| delivery_commander | 3450 | 7.4% | steady_connector | 3359 | 7.2% |
| driving_integrator | 3405 | 7.3% | driving_integrator | 3145 | 6.7% |
| steady_connector | 3074 | 6.6% | delivery_commander | 3132 | 6.7% |
| structured_collaborator | 1919 | 4.1% | adaptive_catalyst | 1453 | 3.1% |
| adaptive_catalyst | 1854 | 4.0% | structured_collaborator | 1377 | 3.0% |
| deliberate_craftsperson | 1113 | 2.4% | adaptive_orchestrator | 1315 | 2.8% |
| diplomatic_stabiliser | 972 | 2.1% | deliberate_craftsperson | 1113 | 2.4% |

## Pattern Coverage

| Pattern | Match Count | Win Count | Win Rate | Example Profiles | Change Note |
| --- | ---: | ---: | ---: | --- | --- |
| balanced_operator | 0 | 16809 | 0.0% | generated_00130, generated_00146, generated_00147 | unchanged fallback retained as the final deterministic catch-all. |
| flexible_mobiliser | 8044 | 5378 | 66.9% | generated_01639, generated_01640, generated_01641 | narrowed with a higher pace exclusion so it captures lower-pace flexible social profiles while giving faster social profiles to pace-led neighbours. |
| relational_catalyst | 5098 | 4061 | 79.7% | generated_00343, generated_00344, generated_00345 | left active but excludes only the highest-flex and highest-pace cases so it reduces overlap without collapsing too much social-pace coverage. |
| steady_connector | 4968 | 3359 | 67.6% | generated_00032, generated_00140, generated_00176 | narrowed to the social-stable lane with a higher deliberate exclusion so grounded stewardship can keep its own lane. |
| driving_integrator | 3581 | 3145 | 87.8% | generated_00007, generated_00008, generated_00009 | kept active for high paced + people-led profiles, with only higher-flex and higher-structured exclusions to reduce the worst overlap families. |
| delivery_commander | 3558 | 3132 | 88.0% | generated_00229, generated_00230, generated_00231 | left in place as the task-led assertive lane; stable exclusion was removed after over-cutting strong delivery profiles. |
| adaptive_catalyst | 2297 | 1453 | 63.3% | generated_00256, generated_00280, generated_00652 | tightened with a small exclusion set against strongly social, structured, and highly assertive profiles so it keeps the adaptive-flex lane. |
| structured_collaborator | 1687 | 1377 | 81.6% | generated_00553, generated_00554, generated_00555 | narrowed with a higher adaptive exclusion so it keeps the structured-social lane without overlapping adaptive_orchestrator as often. |
| adaptive_orchestrator | 2006 | 1315 | 65.6% | generated_00544, generated_00545, generated_00568 | kept active as the adaptive-structured lane, but now excludes strongly social, strongly assertive, and strongly stable profiles to reduce deep overlap stacks. |
| deliberate_craftsperson | 1176 | 1113 | 94.6% | generated_03042, generated_03054, generated_03078 | left broadly available as the structured craft lane after stable exclusions proved too costly to coverage. |
| exacting_controller | 936 | 920 | 98.3% | generated_02595, generated_02601, generated_02607 | unchanged from round 2 because it was already clean, high-confidence, and low-collision. |
| grounded_planner | 1146 | 886 | 77.3% | generated_02628, generated_02664, generated_02700 | left active with only a stronger people-led exclusion after narrower variants over-cut grounded mid-range coverage. |
| diplomatic_stabiliser | 2195 | 789 | 35.9% | generated_00032, generated_00068, generated_00104 | kept in the receptive-stable lane, but narrowed away from connector, mediator, and grounded stewardship cases. |
| responsive_mediator | 1713 | 772 | 45.1% | generated_00188, generated_00192, generated_00200 | retained as the receptive+tolerant+people mediation lane, with only a higher-stability exclusion to stay out of connector territory. |
| steady_executor | 1382 | 679 | 49.1% | generated_00374, generated_00410, generated_01622 | still narrowed to the task-stable lane, but stable was lowered to 2 to capture more delivery-grounded mid-range profiles. |
| forceful_driver | 498 | 498 | 100.0% | generated_00001, generated_00002, generated_00003 | left broad so high paced + assertive profiles remain reachable even when they also carry moderate social range. |
| adaptive_challenger | 595 | 481 | 80.8% | generated_00001, generated_00005, generated_00025 | left active but lightly tightened against strongly social neighbours to keep the force/pace lane clear. |
| decisive_orchestrator | 372 | 366 | 98.4% | generated_01741, generated_01742, generated_01743 | broadened slightly by lowering structured to 3 so more mid-range execution-control profiles avoid fallback. |
| grounded_steward | 133 | 123 | 92.5% | generated_06836, generated_07160, generated_07268 | left active but excludes receptive-heavy cases so it stays distinct from diplomacy. |

## Collision Summary

- relational_catalyst > flexible_mobiliser: 1246
- driving_integrator > relational_catalyst: 802
- steady_connector > flexible_mobiliser: 725
- flexible_mobiliser > adaptive_catalyst: 663
- steady_connector > diplomatic_stabiliser: 591
- relational_catalyst > steady_connector: 452
- adaptive_catalyst > adaptive_orchestrator: 321
- delivery_commander > steady_executor: 286
- decisive_orchestrator > delivery_commander: 239
- flexible_mobiliser > responsive_mediator: 210

## Curated Comparison

- profile_006: forceful_driver -> forceful_driver. The refined model kept the same winner because the original pattern was already the clearest fit.
- profile_017: delivery_commander -> delivery_commander. The refined model kept the same winner because the original pattern was already the clearest fit.
- profile_018: steady_executor -> steady_executor. The refined model kept the same winner because the original pattern was already the clearest fit.
- profile_021: grounded_planner -> grounded_steward. The refined model prefers grounded_steward because its thresholds fit the trait totals more narrowly than grounded_planner.
- profile_002: delivery_commander -> delivery_commander. The refined model kept the same winner because the original pattern was already the clearest fit.
- profile_004: deliberate_craftsperson -> deliberate_craftsperson. The refined model kept the same winner because the original pattern was already the clearest fit.
- profile_015: forceful_driver -> forceful_driver. The refined model kept the same winner because the original pattern was already the clearest fit.
- profile_022: deliberate_craftsperson -> deliberate_craftsperson. The refined model kept the same winner because the original pattern was already the clearest fit.

## Change Log

Rule changes:
- adaptive_catalyst: tightened with a small exclusion set against strongly social, structured, and highly assertive profiles so it keeps the adaptive-flex lane.
- adaptive_challenger: left active but lightly tightened against strongly social neighbours to keep the force/pace lane clear.
- adaptive_orchestrator: kept active as the adaptive-structured lane, but now excludes strongly social, strongly assertive, and strongly stable profiles to reduce deep overlap stacks.
- balanced_operator: unchanged fallback retained as the final deterministic catch-all.
- calm_operator: retired from the active refined set; its space is covered by steady_executor and grounded_planner.
- decisive_orchestrator: broadened slightly by lowering structured to 3 so more mid-range execution-control profiles avoid fallback.
- deliberate_craftsperson: left broadly available as the structured craft lane after stable exclusions proved too costly to coverage.
- delivery_commander: left in place as the task-led assertive lane; stable exclusion was removed after over-cutting strong delivery profiles.
- diplomatic_stabiliser: kept in the receptive-stable lane, but narrowed away from connector, mediator, and grounded stewardship cases.
- driving_integrator: kept active for high paced + people-led profiles, with only higher-flex and higher-structured exclusions to reduce the worst overlap families.
- exacting_controller: unchanged from round 2 because it was already clean, high-confidence, and low-collision.
- flexible_mobiliser: narrowed with a higher pace exclusion so it captures lower-pace flexible social profiles while giving faster social profiles to pace-led neighbours.
- forceful_driver: left broad so high paced + assertive profiles remain reachable even when they also carry moderate social range.
- grounded_planner: left active with only a stronger people-led exclusion after narrower variants over-cut grounded mid-range coverage.
- grounded_steward: left active but excludes receptive-heavy cases so it stays distinct from diplomacy.
- relational_catalyst: left active but excludes only the highest-flex and highest-pace cases so it reduces overlap without collapsing too much social-pace coverage.
- responsive_mediator: retained as the receptive+tolerant+people mediation lane, with only a higher-stability exclusion to stay out of connector territory.
- steady_connector: narrowed to the social-stable lane with a higher deliberate exclusion so grounded stewardship can keep its own lane.
- steady_executor: still narrowed to the task-stable lane, but stable was lowered to 2 to capture more delivery-grounded mid-range profiles.
- structured_collaborator: narrowed with a higher adaptive exclusion so it keeps the structured-social lane without overlapping adaptive_orchestrator as often.

Pair-trait weight changes:
- No pair-trait weight mappings changed in round 3; refinement was achieved through rule separation, threshold tuning, and minimal exclusions.

Pattern set changes:
- added: none
- removed: none
- retained and redefined: adaptive_catalyst, adaptive_challenger, adaptive_orchestrator, decisive_orchestrator, deliberate_craftsperson, delivery_commander, diplomatic_stabiliser, driving_integrator, exacting_controller, flexible_mobiliser, forceful_driver, grounded_planner, grounded_steward, relational_catalyst, responsive_mediator, steady_connector, steady_executor, structured_collaborator

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

Winner: steady_connector

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

Winner: flexible_mobiliser

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

Winner: flexible_mobiliser

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

Winner: grounded_planner

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

