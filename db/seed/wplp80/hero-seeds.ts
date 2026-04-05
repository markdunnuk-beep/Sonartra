import type {
  HeroPatternLanguageSeed,
  HeroPatternRuleSeed,
  PairTraitWeightSeed,
} from './types';

function definePairWeights(
  profileDomainKey: PairTraitWeightSeed['profileDomainKey'],
  pairKey: string,
  primaryTraitKey: PairTraitWeightSeed['traitKey'],
  secondaryTraitKey: PairTraitWeightSeed['traitKey'],
): readonly PairTraitWeightSeed[] {
  return [
    { profileDomainKey, pairKey, traitKey: primaryTraitKey, weight: 2, orderIndex: 0 },
    { profileDomainKey, pairKey, traitKey: secondaryTraitKey, weight: 1, orderIndex: 1 },
  ];
}

export const WPLP80_HERO_PAIR_TRAIT_WEIGHTS: readonly PairTraitWeightSeed[] = [
  ...definePairWeights('operatingStyle', 'driver_influencer', 'paced', 'assertive'),
  ...definePairWeights('operatingStyle', 'driver_operator', 'task_led', 'stable'),
  ...definePairWeights('operatingStyle', 'analyst_driver', 'paced', 'structured'),
  ...definePairWeights('operatingStyle', 'influencer_operator', 'people_led', 'flexible'),
  ...definePairWeights('operatingStyle', 'analyst_influencer', 'people_led', 'adaptive'),
  ...definePairWeights('operatingStyle', 'analyst_operator', 'deliberate', 'structured'),

  ...definePairWeights('coreDrivers', 'achievement_influence', 'paced', 'people_led'),
  ...definePairWeights('coreDrivers', 'achievement_stability', 'task_led', 'stable'),
  ...definePairWeights('coreDrivers', 'achievement_mastery', 'exacting', 'deliberate'),
  ...definePairWeights('coreDrivers', 'influence_stability', 'people_led', 'stable'),
  ...definePairWeights('coreDrivers', 'influence_mastery', 'adaptive', 'people_led'),
  ...definePairWeights('coreDrivers', 'mastery_stability', 'deliberate', 'exacting'),

  ...definePairWeights('leadershipApproach', 'results_vision', 'assertive', 'paced'),
  ...definePairWeights('leadershipApproach', 'people_results', 'task_led', 'people_led'),
  ...definePairWeights('leadershipApproach', 'process_results', 'structured', 'assertive'),
  ...definePairWeights('leadershipApproach', 'people_vision', 'people_led', 'adaptive'),
  ...definePairWeights('leadershipApproach', 'process_vision', 'flexible', 'structured'),
  ...definePairWeights('leadershipApproach', 'people_process', 'people_led', 'structured'),

  ...definePairWeights('tensionResponse', 'collaborate_compete', 'assertive', 'people_led'),
  ...definePairWeights('tensionResponse', 'compete_compromise', 'assertive', 'adaptive'),
  ...definePairWeights('tensionResponse', 'accommodate_compete', 'assertive', 'receptive'),
  ...definePairWeights('tensionResponse', 'collaborate_compromise', 'people_led', 'tolerant'),
  ...definePairWeights('tensionResponse', 'accommodate_collaborate', 'receptive', 'people_led'),
  ...definePairWeights('tensionResponse', 'accommodate_compromise', 'tolerant', 'flexible'),
  ...definePairWeights('tensionResponse', 'avoid_compete', 'assertive', 'receptive'),
  ...definePairWeights('tensionResponse', 'avoid_collaborate', 'receptive', 'people_led'),
  ...definePairWeights('tensionResponse', 'avoid_compromise', 'tolerant', 'receptive'),
  ...definePairWeights('tensionResponse', 'accommodate_avoid', 'receptive', 'tolerant'),

  ...definePairWeights('environmentFit', 'adhocracy_market', 'adaptive', 'paced'),
  ...definePairWeights('environmentFit', 'clan_market', 'paced', 'people_led'),
  ...definePairWeights('environmentFit', 'hierarchy_market', 'task_led', 'structured'),
  ...definePairWeights('environmentFit', 'adhocracy_clan', 'flexible', 'people_led'),
  ...definePairWeights('environmentFit', 'adhocracy_hierarchy', 'adaptive', 'structured'),
  ...definePairWeights('environmentFit', 'clan_hierarchy', 'stable', 'people_led'),

  ...definePairWeights('pressureResponse', 'control_scatter', 'adaptive', 'assertive'),
  ...definePairWeights('pressureResponse', 'control_avoidance', 'stable', 'receptive'),
  ...definePairWeights('pressureResponse', 'control_critical', 'exacting', 'assertive'),
  ...definePairWeights('pressureResponse', 'avoidance_scatter', 'flexible', 'adaptive'),
  ...definePairWeights('pressureResponse', 'critical_scatter', 'adaptive', 'exacting'),
  ...definePairWeights('pressureResponse', 'avoidance_critical', 'deliberate', 'receptive'),
] as const;

export const WPLP80_HERO_PATTERN_RULES: readonly HeroPatternRuleSeed[] = [
  { patternKey: 'forceful_driver', priority: 10, ruleType: 'condition', traitKey: 'assertive', operator: '>=', thresholdValue: 4, orderIndex: 0 },
  { patternKey: 'forceful_driver', priority: 10, ruleType: 'condition', traitKey: 'paced', operator: '>=', thresholdValue: 3, orderIndex: 1 },

  { patternKey: 'exacting_controller', priority: 12, ruleType: 'condition', traitKey: 'exacting', operator: '>=', thresholdValue: 4, orderIndex: 0 },
  { patternKey: 'exacting_controller', priority: 12, ruleType: 'condition', traitKey: 'assertive', operator: '>=', thresholdValue: 2, orderIndex: 1 },

  { patternKey: 'delivery_commander', priority: 16, ruleType: 'condition', traitKey: 'task_led', operator: '>=', thresholdValue: 4, orderIndex: 0 },
  { patternKey: 'delivery_commander', priority: 16, ruleType: 'condition', traitKey: 'assertive', operator: '>=', thresholdValue: 2, orderIndex: 1 },

  { patternKey: 'deliberate_craftsperson', priority: 18, ruleType: 'condition', traitKey: 'deliberate', operator: '>=', thresholdValue: 3, orderIndex: 0 },
  { patternKey: 'deliberate_craftsperson', priority: 18, ruleType: 'condition', traitKey: 'structured', operator: '>=', thresholdValue: 3, orderIndex: 1 },

  { patternKey: 'grounded_planner', priority: 20, ruleType: 'condition', traitKey: 'deliberate', operator: '>=', thresholdValue: 2, orderIndex: 0 },
  { patternKey: 'grounded_planner', priority: 20, ruleType: 'condition', traitKey: 'stable', operator: '>=', thresholdValue: 2, orderIndex: 1 },
  { patternKey: 'grounded_planner', priority: 20, ruleType: 'exclusion', traitKey: 'people_led', operator: '>=', thresholdValue: 3, orderIndex: 0 },

  { patternKey: 'relational_catalyst', priority: 22, ruleType: 'condition', traitKey: 'people_led', operator: '>=', thresholdValue: 4, orderIndex: 0 },
  { patternKey: 'relational_catalyst', priority: 22, ruleType: 'exclusion', traitKey: 'stable', operator: '>=', thresholdValue: 2, orderIndex: 0 },
  { patternKey: 'relational_catalyst', priority: 22, ruleType: 'exclusion', traitKey: 'assertive', operator: '>=', thresholdValue: 5, orderIndex: 1 },

  { patternKey: 'adaptive_mobiliser', priority: 24, ruleType: 'condition', traitKey: 'adaptive', operator: '>=', thresholdValue: 3, orderIndex: 0 },
  { patternKey: 'adaptive_mobiliser', priority: 24, ruleType: 'condition', traitKey: 'flexible', operator: '>=', thresholdValue: 0, orderIndex: 1 },
  { patternKey: 'adaptive_mobiliser', priority: 24, ruleType: 'exclusion', traitKey: 'people_led', operator: '>=', thresholdValue: 4, orderIndex: 0 },
  { patternKey: 'adaptive_mobiliser', priority: 24, ruleType: 'exclusion', traitKey: 'assertive', operator: '>=', thresholdValue: 4, orderIndex: 1 },
  { patternKey: 'adaptive_mobiliser', priority: 24, ruleType: 'exclusion', traitKey: 'stable', operator: '>=', thresholdValue: 3, orderIndex: 2 },
  { patternKey: 'adaptive_mobiliser', priority: 24, ruleType: 'exclusion', traitKey: 'exacting', operator: '>=', thresholdValue: 4, orderIndex: 3 },

  { patternKey: 'steady_steward', priority: 26, ruleType: 'condition', traitKey: 'people_led', operator: '>=', thresholdValue: 3, orderIndex: 0 },
  { patternKey: 'steady_steward', priority: 26, ruleType: 'condition', traitKey: 'stable', operator: '>=', thresholdValue: 2, orderIndex: 1 },
  { patternKey: 'steady_steward', priority: 26, ruleType: 'exclusion', traitKey: 'paced', operator: '>=', thresholdValue: 4, orderIndex: 0 },
] as const;

export const WPLP80_HERO_PATTERN_LANGUAGE: readonly HeroPatternLanguageSeed[] = [
  {
    patternKey: 'forceful_driver',
    headline: 'You push momentum into motion quickly.',
    subheadline: 'Fast, assertive, and willing to make the path visible before the room fully settles.',
    summary: 'This pattern fits profiles that combine speed with a strong instinct to take hold of direction.',
    narrative: 'You are likely to read hesitation as a signal to step in, sharpen priorities, and move the work forward decisively. At your best this creates traction quickly; overused, it can make others feel as though they are being pulled rather than brought along.',
    pressureOverlay: 'Under pressure, this pattern usually becomes firmer, faster, and less patient with drift.',
    environmentOverlay: 'You are often strongest where urgency, ownership, and clear forward motion are genuinely valuable.',
  },
  {
    patternKey: 'exacting_controller',
    headline: 'You raise the standard when conditions get loose.',
    subheadline: 'Precise, corrective, and unwilling to let weak execution pass unnoticed.',
    summary: 'This pattern fits profiles where accuracy, scrutiny, and directional force combine into a highly demanding presence.',
    narrative: 'You are likely to spot flaws quickly and respond by narrowing ambiguity, tightening expectations, and making quality visible. At your best this protects standards; overused, it can make the room feel more judged than helped.',
    pressureOverlay: 'Pressure usually sharpens this pattern further, turning concern into corrective intensity and lower tolerance for loose thinking.',
    environmentOverlay: 'You are often strongest in contexts that genuinely need quality control, disciplined reasoning, and clear performance edges.',
  },
  {
    patternKey: 'delivery_commander',
    headline: 'You turn direction into visible execution pressure.',
    subheadline: 'Task-led, forceful, and inclined to push delivery before momentum fades.',
    summary: 'This MVP pattern fits profiles that combine strong delivery bias with enough direction to keep others moving.',
    narrative: 'You are likely to create progress by making ownership visible, tightening follow-through, and pushing execution into the foreground. In the 8-pattern system, this lane intentionally absorbs both steadier execution and more directive orchestration so the Hero layer stays identity-led rather than splitting execution styles too finely.',
    pressureOverlay: 'Pressure often makes this pattern more direct, more outcome-focused, and less tolerant of drift.',
    environmentOverlay: 'You usually do best where visible accountability and reliable execution are core to performance.',
  },
  {
    patternKey: 'deliberate_craftsperson',
    headline: 'You build confidence through care and precision.',
    subheadline: 'Methodical, quality-conscious, and more interested in robustness than rush.',
    summary: 'This pattern fits profiles that slow the work down enough to improve quality, judgement, and long-term reliability.',
    narrative: 'You are likely to create value by checking sequence, improving logic, and making sure the work stands up after the first pass. Others may lean on you for rigour while also wishing you would sometimes move before every uncertainty has been reduced.',
    pressureOverlay: 'Under pressure, you may become even more careful about evidence, sequence, and quality thresholds.',
    environmentOverlay: 'You usually fit best where strong standards, craft discipline, and thoughtful execution are respected rather than treated as drag.',
  },
  {
    patternKey: 'grounded_planner',
    headline: 'You create steadiness through thoughtful sequencing.',
    subheadline: 'Measured, dependable, and inclined to make the work safer by planning it properly.',
    summary: 'This pattern fits profiles where deliberation and stability rise together into a calm planning centre.',
    narrative: 'You are likely to protect outcomes by thinking ahead, reducing avoidable volatility, and building enough certainty for others to trust the route. In the MVP taxonomy this lane holds the quieter grounded middle so those profiles do not collapse into generic balance.',
    pressureOverlay: 'Under pressure, you may double down on sequence, pacing, and reducing avoidable disruption.',
    environmentOverlay: 'You usually fit best where continuity, preparation, and considered delivery are all taken seriously.',
  },
  {
    patternKey: 'relational_catalyst',
    headline: 'You move people by creating energy around the work.',
    subheadline: 'Visible, connective, and able to create momentum through engagement rather than force alone.',
    summary: 'This pattern fits profiles where people focus and pace rise together strongly enough to make your impact feel social as well as directional.',
    narrative: 'You are likely to build progress by keeping people engaged, making the work feel alive, and pulling others into movement early. The benefit is momentum with connection; the risk is that pace and positivity can outrun the harder edges of detail or follow-through.',
    pressureOverlay: 'Under pressure, you may work even harder to keep others connected, motivated, and moving rather than letting the room flatten out.',
    environmentOverlay: 'You usually do best where visibility, collaboration, and momentum-building are valued as real levers of performance.',
  },
  {
    patternKey: 'adaptive_mobiliser',
    headline: 'You keep movement alive by adapting faster than the context settles.',
    subheadline: 'Mobile, inventive, and comfortable changing shape while others are still deciding how fixed the route should be.',
    summary: 'This MVP pattern fits profiles where change-readiness, flexibility, and forward movement combine into a recognisable adaptive identity.',
    narrative: 'You are likely to create progress by staying open, re-reading the terrain, and finding a next move before the system becomes rigid. That makes you valuable in live, shifting environments, though the same mobility can make your centre harder for others to predict if you do not signal the through-line clearly.',
    pressureOverlay: 'Under pressure, you often become even more adaptive, scanning for workable openings instead of forcing premature closure.',
    environmentOverlay: 'You usually fit best where change is frequent, experimentation is tolerated, and responsiveness counts as real capability rather than drift.',
  },
  {
    patternKey: 'steady_steward',
    headline: 'You create trust by holding people and continuity together.',
    subheadline: 'Calm, people-aware, and more interested in keeping the system workable than making yourself dramatic inside it.',
    summary: 'This MVP pattern fits profiles where social awareness and stability combine into a clear stewardship identity.',
    narrative: 'You are likely to create confidence by staying usable, reading what others need, and keeping enough continuity for the work to remain coherent through friction or change. The strength is steady containment; the risk is carrying the relational load longer than the moment really requires before naming the harder decision.',
    pressureOverlay: 'Under pressure, you often move further toward containment, reassurance, and keeping the room workable enough to continue.',
    environmentOverlay: 'You usually work best where trust, continuity, and relationship-sensitive judgement are treated as central to performance rather than secondary to louder forms of leadership.',
  },
  {
    patternKey: 'balanced_operator',
    headline: 'You present as broadly balanced rather than sharply polarised.',
    subheadline: 'No stronger Hero rule dominates, so the profile resolves to a steady central pattern.',
    summary: 'This fallback fits profiles that spread across several traits without crossing a more specific rule cleanly.',
    narrative: 'You are likely to show usable range across contexts, with behaviour shaped more by the situation than by one consistently dominant Hero signature. That can be an advantage in varied roles, though it also means the profile may need richer supporting sections to feel fully distinctive.',
    pressureOverlay: 'Under pressure, the profile may borrow from several nearby styles rather than defaulting to one obvious response.',
    environmentOverlay: 'You usually fit best in environments that value versatility, role balance, and context-sensitive judgement.',
  },
] as const;
