# Hero Exploration Summary

- Run mode: full_combinatorial
- Total profiles processed: 46656
- Refined fallback count: 16519
- Refined fallback share: 35.4%
- Worst collision count: 6

## Before / After

| Metric | Baseline | Refined |
| --- | ---: | ---: |
| total profiles processed | 46656 | 46656 |
| fallback count | 35422 (75.9%) | 16519 (35.4%) |
| zero-match count | 35422 | 16519 |
| single-match count | 10638 | 16926 |
| multi-match count | 596 | 13211 |
| worst collision count | 2 | 6 |
| dead pattern count | 2 | 0 |

- Dead patterns before: forceful_driver, responsive_mediator
- Dead patterns after: none

## Top Winners Before / After

| Before | Count | Share | After | Count | Share |
| --- | ---: | ---: | --- | ---: | ---: |
| balanced_operator | 35422 | 75.9% | balanced_operator | 16519 | 35.4% |
| relational_catalyst | 5456 | 11.7% | flexible_mobiliser | 5117 | 11.0% |
| flexible_mobiliser | 2157 | 4.6% | relational_catalyst | 4220 | 9.0% |
| adaptive_catalyst | 1399 | 3.0% | delivery_commander | 3450 | 7.4% |
| exacting_controller | 720 | 1.5% | driving_integrator | 3405 | 7.3% |
| diplomatic_stabiliser | 644 | 1.4% | steady_connector | 3074 | 6.6% |
| deliberate_craftsperson | 427 | 0.9% | structured_collaborator | 1919 | 4.1% |
| decisive_orchestrator | 243 | 0.5% | adaptive_catalyst | 1854 | 4.0% |
| calm_operator | 164 | 0.4% | responsive_mediator | 1164 | 2.5% |
| structured_collaborator | 24 | 0.1% | deliberate_craftsperson | 1113 | 2.4% |

## Pattern Coverage

| Pattern | Match Count | Win Count | Win Rate | Example Profiles | Change Note |
| --- | ---: | ---: | ---: | --- | --- |
| balanced_operator | 0 | 16519 | 0.0% | generated_00146, generated_00147, generated_00148 | unchanged fallback retained as the final deterministic catch-all. |
| flexible_mobiliser | 8777 | 5117 | 58.3% | generated_00118, generated_00127, generated_00128 | broadened slightly but reprioritised below more specific social-pace patterns. |
| relational_catalyst | 5532 | 4220 | 76.3% | generated_00331, generated_00332, generated_00333 | re-broadened slightly so clearly social fast-moving profiles do not fall back unnecessarily. |
| delivery_commander | 3558 | 3450 | 97.0% | generated_00229, generated_00230, generated_00231 | new pattern added for high task_led + assertive profiles, with the task threshold lowered to capture stronger mid-range execution-drive shapes. |
| driving_integrator | 3912 | 3405 | 87.0% | generated_00007, generated_00008, generated_00009 | new pattern added for high paced + people-led profiles. |
| steady_connector | 5094 | 3074 | 60.3% | generated_00032, generated_00140, generated_00176 | new pattern added for people-led + stable mid-range profiles, with lower people-led thresholds for broader coverage. |
| structured_collaborator | 2256 | 1919 | 85.1% | generated_00553, generated_00554, generated_00555 | broadened by lowering the structured threshold from 4 to 3 and the people-led threshold from 4 to 3. |
| adaptive_catalyst | 3911 | 1854 | 47.4% | generated_00040, generated_00064, generated_00256 | unchanged rule thresholds, but reprioritised later to reduce avoidable collisions with more specific patterns. |
| responsive_mediator | 2592 | 1164 | 44.9% | generated_00182, generated_00186, generated_00188 | broadened into a reachable receptive + tolerant pattern by lowering receptive to 1. |
| deliberate_craftsperson | 1176 | 1113 | 94.6% | generated_03042, generated_03054, generated_03078 | broadened by removing the exacting requirement and lowering deliberate to 3; it now focuses on deliberate + structured profiles. |
| diplomatic_stabiliser | 5520 | 972 | 17.6% | generated_00032, generated_00068, generated_00104 | broadened into a clearer receptive + stable pattern so it covers mid-range steady diplomatic profiles and remains reachable under the current weight table. |
| exacting_controller | 936 | 920 | 98.3% | generated_02595, generated_02601, generated_02607 | broadened slightly by removing the structured requirement. |
| adaptive_orchestrator | 2333 | 879 | 37.7% | generated_00457, generated_00460, generated_00461 | new pattern added for adaptive + structured profiles; the assertive requirement was removed to improve coverage of organised but less overtly forceful profiles. |
| steady_executor | 1386 | 615 | 44.4% | generated_01310, generated_01346, generated_01382 | new pattern added for high task_led + stable profiles, with the task threshold lowered to catch stronger mid-range delivery shapes. |
| adaptive_challenger | 668 | 551 | 82.5% | generated_00001, generated_00005, generated_00025 | new pattern added for high adaptive + assertive + paced profiles that previously collapsed to fallback. |
| forceful_driver | 498 | 498 | 100.0% | generated_00001, generated_00002, generated_00003 | broadened by removing the task_led requirement so high paced + assertive profiles become reachable. |
| grounded_planner | 216 | 174 | 80.6% | generated_10404, generated_10440, generated_10476 | new pattern added for deliberate + stable profiles, with both thresholds lowered to improve mid-range coverage. |
| grounded_steward | 193 | 164 | 85.0% | generated_06836, generated_07160, generated_07268 | new pattern added for people-led + stable + deliberate stewardship profiles, with thresholds lowered to keep the pattern viable. |
| decisive_orchestrator | 48 | 48 | 100.0% | generated_17293, generated_17294, generated_17295 | broadened and tightened around structured task leadership so it catches clearer execution-control profiles. |

## Collision Summary

- steady_connector > diplomatic_stabiliser: 1488
- flexible_mobiliser > adaptive_catalyst: 1356
- relational_catalyst > flexible_mobiliser: 1260
- driving_integrator > relational_catalyst: 713
- structured_collaborator > adaptive_orchestrator: 550
- steady_connector > flexible_mobiliser > diplomatic_stabiliser: 417
- driving_integrator > flexible_mobiliser: 353
- delivery_commander > steady_executor > diplomatic_stabiliser: 341
- relational_catalyst > steady_connector > diplomatic_stabiliser: 330
- driving_integrator > relational_catalyst > flexible_mobiliser: 288

## Curated Comparison

- profile_006: balanced_operator -> forceful_driver. The refined model replaces fallback with forceful_driver, which matches the visible trait shape more specifically.
- profile_017: balanced_operator -> delivery_commander. The refined model replaces fallback with delivery_commander, which matches the visible trait shape more specifically.
- profile_018: balanced_operator -> steady_executor. The refined model replaces fallback with steady_executor, which matches the visible trait shape more specifically.
- profile_021: balanced_operator -> grounded_planner. The refined model replaces fallback with grounded_planner, which matches the visible trait shape more specifically.
- profile_002: balanced_operator -> delivery_commander. The refined model replaces fallback with delivery_commander, which matches the visible trait shape more specifically.
- profile_004: balanced_operator -> deliberate_craftsperson. The refined model replaces fallback with deliberate_craftsperson, which matches the visible trait shape more specifically.
- profile_015: balanced_operator -> forceful_driver. The refined model replaces fallback with forceful_driver, which matches the visible trait shape more specifically.
- profile_022: balanced_operator -> deliberate_craftsperson. The refined model replaces fallback with deliberate_craftsperson, which matches the visible trait shape more specifically.

## Change Log

Rule changes:
- adaptive_catalyst: unchanged rule thresholds, but reprioritised later to reduce avoidable collisions with more specific patterns.
- adaptive_challenger: new pattern added for high adaptive + assertive + paced profiles that previously collapsed to fallback.
- adaptive_orchestrator: new pattern added for adaptive + structured profiles; the assertive requirement was removed to improve coverage of organised but less overtly forceful profiles.
- balanced_operator: unchanged fallback retained as the final deterministic catch-all.
- calm_operator: removed and replaced by more specific steady_executor and grounded_planner patterns.
- decisive_orchestrator: broadened and tightened around structured task leadership so it catches clearer execution-control profiles.
- deliberate_craftsperson: broadened by removing the exacting requirement and lowering deliberate to 3; it now focuses on deliberate + structured profiles.
- delivery_commander: new pattern added for high task_led + assertive profiles, with the task threshold lowered to capture stronger mid-range execution-drive shapes.
- diplomatic_stabiliser: broadened into a clearer receptive + stable pattern so it covers mid-range steady diplomatic profiles and remains reachable under the current weight table.
- driving_integrator: new pattern added for high paced + people-led profiles.
- exacting_controller: broadened slightly by removing the structured requirement.
- flexible_mobiliser: broadened slightly but reprioritised below more specific social-pace patterns.
- forceful_driver: broadened by removing the task_led requirement so high paced + assertive profiles become reachable.
- grounded_planner: new pattern added for deliberate + stable profiles, with both thresholds lowered to improve mid-range coverage.
- grounded_steward: new pattern added for people-led + stable + deliberate stewardship profiles, with thresholds lowered to keep the pattern viable.
- relational_catalyst: re-broadened slightly so clearly social fast-moving profiles do not fall back unnecessarily.
- responsive_mediator: broadened into a reachable receptive + tolerant pattern by lowering receptive to 1.
- steady_connector: new pattern added for people-led + stable mid-range profiles, with lower people-led thresholds for broader coverage.
- steady_executor: new pattern added for high task_led + stable profiles, with the task threshold lowered to catch stronger mid-range delivery shapes.
- structured_collaborator: broadened by lowering the structured threshold from 4 to 3 and the people-led threshold from 4 to 3.

Pair-trait weight changes:
- No pair-trait weight mappings changed in round 2; refinement was achieved through rule-set expansion and threshold redesign.

Pattern set changes:
- added: adaptive_challenger, adaptive_orchestrator, delivery_commander, driving_integrator, grounded_planner, grounded_steward, steady_connector, steady_executor
- removed: calm_operator
- retained and redefined: adaptive_catalyst, decisive_orchestrator, deliberate_craftsperson, diplomatic_stabiliser, exacting_controller, flexible_mobiliser, forceful_driver, relational_catalyst, responsive_mediator, structured_collaborator

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

