# Hero Exploration Summary

- Run mode: full_combinatorial
- Total profiles processed: 46656
- Profiles with 1 match: 10638
- Profiles with 2+ matches: 596
- Profiles with 0 matches: 35422
- Worst collision count: 2

## Coverage

| Pattern | Match Count | Win Count | Win Rate | Example Profiles |
| --- | ---: | ---: | ---: | --- |
| balanced_operator | 0 | 35422 | 0.0% | generated_00001, generated_00002, generated_00003 |
| relational_catalyst | 5532 | 5456 | 98.6% | generated_00331, generated_00332, generated_00333 |
| flexible_mobiliser | 2541 | 2157 | 84.9% | generated_00022, generated_00130, generated_00166 |
| adaptive_catalyst | 1399 | 1399 | 100.0% | generated_00688, generated_00712, generated_00901 |
| exacting_controller | 720 | 720 | 100.0% | generated_02607, generated_02619, generated_02643 |
| diplomatic_stabiliser | 738 | 644 | 87.3% | generated_00176, generated_00392, generated_00608 |
| deliberate_craftsperson | 432 | 427 | 98.8% | generated_41490, generated_41502, generated_41526 |
| decisive_orchestrator | 246 | 243 | 98.8% | generated_01741, generated_01742, generated_01743 |
| calm_operator | 198 | 164 | 82.8% | generated_06728, generated_06764, generated_06800 |
| structured_collaborator | 24 | 24 | 100.0% | generated_19993, generated_19994, generated_19995 |
| forceful_driver | 0 | 0 | 0.0% | - |
| responsive_mediator | 0 | 0 | 0.0% | - |

## Collision Sets

- relational_catalyst > flexible_mobiliser: 278
- relational_catalyst > diplomatic_stabiliser: 94
- adaptive_catalyst > flexible_mobiliser: 85
- adaptive_catalyst > relational_catalyst: 65
- diplomatic_stabiliser > calm_operator: 33
- exacting_controller > relational_catalyst: 11
- diplomatic_stabiliser > flexible_mobiliser: 10
- exacting_controller > flexible_mobiliser: 8
- deliberate_craftsperson > flexible_mobiliser: 3
- exacting_controller > decisive_orchestrator: 3

## Dead Patterns

- Never selected as winner: forceful_driver, responsive_mediator
- Never matched: balanced_operator, forceful_driver, responsive_mediator
- Matched but never win: none

## Curated Worked Examples

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

Winner: balanced_operator

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

Winner: diplomatic_stabiliser

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

Winner: balanced_operator

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

Winner: adaptive_catalyst

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

Winner: balanced_operator

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

Winner: balanced_operator

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

Winner: balanced_operator

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

Winner: adaptive_catalyst

### profile_011

Domain pairs:
- operatingStyle: driver_operator
- coreDrivers: achievement_mastery
- leadershipApproach: results_process
- tensionResponse: compete_accommodate
- environmentFit: market_hierarchy
- pressureResponse: control_critical

Trait totals:
- assertive: 4
- exacting: 4
- task_led: 4
- structured: 3
- deliberate: 1
- receptive: 1
- stable: 1

Winner: exacting_controller

### profile_012

Domain pairs:
- operatingStyle: influencer_operator
- coreDrivers: achievement_influence
- leadershipApproach: vision_people
- tensionResponse: collaborate_compromise
- environmentFit: market_clan
- pressureResponse: scatter_avoidance

Trait totals:
- people_led: 8
- paced: 4
- flexible: 3
- adaptive: 2
- tolerant: 1

Winner: relational_catalyst

### profile_013

Domain pairs:
- operatingStyle: operator_analyst
- coreDrivers: influence_stability
- leadershipApproach: people_process
- tensionResponse: collaborate_accommodate
- environmentFit: clan_hierarchy
- pressureResponse: avoidance_critical

Trait totals:
- people_led: 6
- deliberate: 4
- receptive: 3
- stable: 3
- structured: 2

Winner: diplomatic_stabiliser

### profile_014

Domain pairs:
- operatingStyle: driver_analyst
- coreDrivers: achievement_mastery
- leadershipApproach: vision_people
- tensionResponse: collaborate_compromise
- environmentFit: clan_hierarchy
- pressureResponse: control_critical

Trait totals:
- people_led: 5
- exacting: 4
- paced: 2
- stable: 2
- adaptive: 1
- assertive: 1
- deliberate: 1
- structured: 1
- tolerant: 1

Winner: relational_catalyst

### profile_015

Domain pairs:
- operatingStyle: driver_influencer
- coreDrivers: influence_mastery
- leadershipApproach: results_vision
- tensionResponse: compete_collaborate
- environmentFit: market_adhocracy
- pressureResponse: scatter_critical

Trait totals:
- adaptive: 6
- assertive: 5
- paced: 4
- people_led: 2
- exacting: 1

Winner: balanced_operator

### profile_016

Domain pairs:
- operatingStyle: influencer_analyst
- coreDrivers: stability_mastery
- leadershipApproach: vision_process
- tensionResponse: collaborate_accommodate
- environmentFit: adhocracy_hierarchy
- pressureResponse: avoidance_critical

Trait totals:
- deliberate: 4
- adaptive: 3
- people_led: 3
- receptive: 3
- flexible: 2
- structured: 2
- exacting: 1

Winner: balanced_operator

### profile_017

Domain pairs:
- operatingStyle: driver_operator
- coreDrivers: achievement_stability
- leadershipApproach: results_people
- tensionResponse: compete_accommodate
- environmentFit: market_clan
- pressureResponse: control_avoidance

Trait totals:
- task_led: 6
- stable: 4
- assertive: 2
- paced: 2
- people_led: 2
- receptive: 2

Winner: balanced_operator

### profile_018

Domain pairs:
- operatingStyle: operator_analyst
- coreDrivers: achievement_stability
- leadershipApproach: results_process
- tensionResponse: compromise_accommodate
- environmentFit: market_hierarchy
- pressureResponse: control_avoidance

Trait totals:
- structured: 4
- task_led: 4
- stable: 3
- deliberate: 2
- tolerant: 2
- assertive: 1
- flexible: 1
- receptive: 1

Winner: balanced_operator

### profile_019

Domain pairs:
- operatingStyle: driver_influencer
- coreDrivers: achievement_influence
- leadershipApproach: vision_people
- tensionResponse: collaborate_compromise
- environmentFit: market_clan
- pressureResponse: control_scatter

Trait totals:
- paced: 6
- people_led: 6
- adaptive: 3
- assertive: 2
- tolerant: 1

Winner: relational_catalyst

### profile_020

Domain pairs:
- operatingStyle: influencer_operator
- coreDrivers: influence_mastery
- leadershipApproach: people_process
- tensionResponse: collaborate_accommodate
- environmentFit: adhocracy_clan
- pressureResponse: scatter_avoidance

Trait totals:
- people_led: 7
- flexible: 5
- adaptive: 3
- receptive: 2
- structured: 1

Winner: flexible_mobiliser

### profile_021

Domain pairs:
- operatingStyle: operator_analyst
- coreDrivers: stability_mastery
- leadershipApproach: people_process
- tensionResponse: collaborate_compromise
- environmentFit: clan_hierarchy
- pressureResponse: control_avoidance

Trait totals:
- people_led: 5
- deliberate: 4
- stable: 4
- structured: 2
- exacting: 1
- receptive: 1
- tolerant: 1

Winner: balanced_operator

### profile_022

Domain pairs:
- operatingStyle: driver_analyst
- coreDrivers: achievement_mastery
- leadershipApproach: results_process
- tensionResponse: compete_compromise
- environmentFit: adhocracy_hierarchy
- pressureResponse: avoidance_critical

Trait totals:
- structured: 4
- adaptive: 3
- assertive: 3
- deliberate: 3
- exacting: 2
- paced: 2
- receptive: 1

Winner: balanced_operator

