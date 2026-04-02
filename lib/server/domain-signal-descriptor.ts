type DomainSignalDescriptorSource = {
  signalKey?: unknown;
  signalTitle?: unknown;
  title?: unknown;
  signalDescription?: unknown;
  description?: unknown;
};

const SONARTRA_SIGNAL_DESCRIPTOR_BY_KEY = new Map<string, string>([
  ['style_driver', 'Drives action and momentum'],
  ['style_influencer', 'Engages and energises others'],
  ['style_operator', 'Turns intent into dependable execution'],
  ['style_analyst', 'Slows decisions to improve accuracy and judgement'],
  ['mot_achievement', 'Seeks progress, stretch, and visible success'],
  ['mot_influence', 'Seeks reach, visibility, and impact'],
  ['mot_stability', 'Values certainty, security, and steadiness'],
  ['mot_mastery', 'Seeks expertise, quality, and continual improvement'],
  ['lead_results', 'Sets direction through outcomes and accountability'],
  ['lead_vision', 'Sets direction through future focus and belief'],
  ['lead_people', 'Leads through trust, support, and development'],
  ['lead_process', 'Leads through structure, clarity, and discipline'],
  ['conflict_compete', 'Faces tension directly to force resolution'],
  ['conflict_collaborate', 'Works through tension to reach a shared answer'],
  ['conflict_compromise', 'Looks for practical middle ground'],
  ['conflict_accommodate', 'Protects relationships by lowering friction'],
  ['conflict_avoid', 'Steps back until tension feels more manageable'],
  ['culture_market', 'Thrives on pace, targets, and visible performance'],
  ['culture_adhocracy', 'Thrives on experimentation and freedom to move'],
  ['culture_clan', 'Thrives on trust, cohesion, and collaboration'],
  ['culture_hierarchy', 'Thrives on clarity, structure, and dependable process'],
  ['stress_control', 'Tightens control and standards under pressure'],
  ['stress_scatter', 'Loses focus and spreads energy under pressure'],
  ['stress_avoidance', 'Withdraws from friction under pressure'],
  ['stress_criticality', 'Becomes more exacting and fault-focused under pressure'],
  ['decision_agility', 'Makes quick calls and keeps decisions moving'],
  ['decision_consensus', 'Builds decisions through involvement and buy-in'],
  ['decision_stability', 'Protects continuity and lowers disruption'],
  ['decision_evidence', 'Anchors decisions in proof and sound reasoning'],
  ['role_commercial_leadership', 'Leads growth through commercial direction and accountability'],
  ['role_business_development', 'Creates opportunity through connection and momentum'],
  ['role_operations_management', 'Keeps delivery stable through structure and control'],
  ['role_technical_specialist', 'Adds depth through expertise and careful judgement'],
]);

const SONARTRA_SIGNAL_DESCRIPTOR_BY_LABEL = new Map<string, string>([
  ['driver', 'Drives action and momentum'],
  ['influencer', 'Engages and energises others'],
  ['operator', 'Turns intent into dependable execution'],
  ['analyst', 'Slows decisions to improve accuracy and judgement'],
  ['achievement', 'Seeks progress, stretch, and visible success'],
  ['influence', 'Seeks reach, visibility, and impact'],
  ['stability', 'Values certainty, security, and steadiness'],
  ['mastery', 'Seeks expertise, quality, and continual improvement'],
  ['results', 'Sets direction through outcomes and accountability'],
  ['vision', 'Sets direction through future focus and belief'],
  ['people', 'Leads through trust, support, and development'],
  ['process', 'Leads through structure, clarity, and discipline'],
  ['compete', 'Faces tension directly to force resolution'],
  ['collaborate', 'Works through tension to reach a shared answer'],
  ['compromise', 'Looks for practical middle ground'],
  ['accommodate', 'Protects relationships by lowering friction'],
  ['avoid', 'Steps back until tension feels more manageable'],
  ['market', 'Thrives on pace, targets, and visible performance'],
  ['adhocracy', 'Thrives on experimentation and freedom to move'],
  ['clan', 'Thrives on trust, cohesion, and collaboration'],
  ['hierarchy', 'Thrives on clarity, structure, and dependable process'],
  ['control', 'Tightens control and standards under pressure'],
  ['scatter', 'Loses focus and spreads energy under pressure'],
  ['avoidance', 'Withdraws from friction under pressure'],
  ['criticality', 'Becomes more exacting and fault-focused under pressure'],
  ['agility', 'Makes quick calls and keeps decisions moving'],
  ['consensus', 'Builds decisions through involvement and buy-in'],
  ['evidence', 'Anchors decisions in proof and sound reasoning'],
  ['commercial leadership', 'Leads growth through commercial direction and accountability'],
  ['business development', 'Creates opportunity through connection and momentum'],
  ['operations management', 'Keeps delivery stable through structure and control'],
  ['technical specialist', 'Adds depth through expertise and careful judgement'],
]);

function getTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveDomainSignalDescriptor(
  source: DomainSignalDescriptorSource | null | undefined,
): string | null {
  if (!source) {
    return null;
  }

  const assessmentDrivenDescriptor =
    getTrimmedString(source.signalDescription)
    ?? getTrimmedString(source.description);

  if (assessmentDrivenDescriptor) {
    return assessmentDrivenDescriptor;
  }

  const signalKey = getTrimmedString(source.signalKey);
  if (signalKey) {
    const descriptorByKey = SONARTRA_SIGNAL_DESCRIPTOR_BY_KEY.get(signalKey);
    if (descriptorByKey) {
      return descriptorByKey;
    }
  }

  const signalLabel = getTrimmedString(source.signalTitle) ?? getTrimmedString(source.title);
  if (!signalLabel) {
    return null;
  }

  return SONARTRA_SIGNAL_DESCRIPTOR_BY_LABEL.get(normalizeLabel(signalLabel)) ?? null;
}
