export const SINGLE_DOMAIN_NARRATIVE_SECTION_KEYS = [
  'intro',
  'hero',
  'drivers',
  'pair',
  'limitation',
  'application',
] as const;

export type SingleDomainNarrativeSectionKey =
  typeof SINGLE_DOMAIN_NARRATIVE_SECTION_KEYS[number];

export const SINGLE_DOMAIN_DRIVER_ROLES = [
  'primary_driver',
  'secondary_driver',
  'supporting_context',
  'range_limitation',
] as const;

export type SingleDomainDriverRole = typeof SINGLE_DOMAIN_DRIVER_ROLES[number];

export const SINGLE_DOMAIN_CLAIM_OWNERSHIP_KEYS = [
  'domain_definition',
  'domain_scope',
  'interpretation_guidance',
  'dominant_pattern',
  'pattern_identity',
  'pattern_strength',
  'driver_primary',
  'driver_secondary',
  'driver_supporting_context',
  'driver_range_limitation',
  'pair_interaction',
  'pair_synergy',
  'pair_tension',
  'pattern_cost',
  'range_narrowing',
  'weaker_signal_linkage',
  'blind_spot',
  'applied_strength',
  'watchout',
  'development_focus',
  'range_recovery_action',
] as const;

export type SingleDomainClaimOwnership =
  typeof SINGLE_DOMAIN_CLAIM_OWNERSHIP_KEYS[number];

export type SingleDomainClaimOwnershipBySection = {
  intro: 'domain_definition' | 'domain_scope' | 'interpretation_guidance';
  hero: 'dominant_pattern' | 'pattern_identity' | 'pattern_strength';
  drivers:
    | 'driver_primary'
    | 'driver_secondary'
    | 'driver_supporting_context'
    | 'driver_range_limitation';
  pair: 'pair_interaction' | 'pair_synergy' | 'pair_tension';
  limitation: 'pattern_cost' | 'range_narrowing' | 'weaker_signal_linkage' | 'blind_spot';
  application:
    | 'applied_strength'
    | 'watchout'
    | 'development_focus'
    | 'range_recovery_action';
};

export type AllowedClaimOwnershipForSection<
  TSection extends SingleDomainNarrativeSectionKey,
> = SingleDomainClaimOwnershipBySection[TSection];

export type SingleDomainDriverClaimType =
  | 'driver_primary'
  | 'driver_secondary'
  | 'driver_supporting_context'
  | 'driver_range_limitation';

export type SingleDomainDriverMateriality =
  | 'core'
  | 'supporting'
  | 'material_underplay';

export type SingleDomainApplicationFocusArea = 'rely_on' | 'notice' | 'develop';

export type SingleDomainApplicationGuidanceType =
  | 'applied_strength'
  | 'watchout'
  | 'development_focus'
  | 'range_recovery_action';

export type SingleDomainNarrativeDatasetKey =
  | 'SINGLE_DOMAIN_INTRO'
  | 'SINGLE_DOMAIN_HERO'
  | 'SINGLE_DOMAIN_DRIVERS'
  | 'SINGLE_DOMAIN_PAIR'
  | 'SINGLE_DOMAIN_LIMITATION'
  | 'SINGLE_DOMAIN_APPLICATION';

export interface SingleDomainIntroImportRow {
  domain_key: string;
  section_key: 'intro';
  domain_title: string;
  domain_definition: string;
  domain_scope: string;
  interpretation_guidance: string;
  intro_note: string;
}

export interface SingleDomainHeroImportRow {
  domain_key: string;
  section_key: 'hero';
  pair_key: string;
  pattern_label: string;
  hero_statement: string;
  hero_expansion: string;
  hero_strength: string;
}

export interface SingleDomainDriversImportRow {
  domain_key: string;
  section_key: 'drivers';
  pair_key: string;
  signal_key: string;
  driver_role: SingleDomainDriverRole;
  claim_type: SingleDomainDriverClaimType;
  claim_text: string;
  materiality: SingleDomainDriverMateriality;
  priority: string;
}

export interface SingleDomainPairImportRow {
  domain_key: string;
  section_key: 'pair';
  pair_key: string;
  pair_label: string;
  interaction_claim: string;
  synergy_claim: string;
  tension_claim: string;
  pair_outcome: string;
}

export interface SingleDomainLimitationImportRow {
  domain_key: string;
  section_key: 'limitation';
  pair_key: string;
  limitation_label: string;
  pattern_cost: string;
  range_narrowing: string;
  weaker_signal_key: string;
  weaker_signal_link: string;
}

export interface SingleDomainApplicationImportRow {
  domain_key: string;
  section_key: 'application';
  pattern_key?: string;
  pair_key: string;
  focus_area: SingleDomainApplicationFocusArea;
  guidance_type: SingleDomainApplicationGuidanceType;
  driver_role?: SingleDomainDriverRole;
  signal_key: string;
  guidance_text: string;
  linked_claim_type: SingleDomainClaimOwnership;
  priority: string;
}

export type SingleDomainNarrativeImportRowMap = {
  SINGLE_DOMAIN_INTRO: SingleDomainIntroImportRow;
  SINGLE_DOMAIN_HERO: SingleDomainHeroImportRow;
  SINGLE_DOMAIN_DRIVERS: SingleDomainDriversImportRow;
  SINGLE_DOMAIN_PAIR: SingleDomainPairImportRow;
  SINGLE_DOMAIN_LIMITATION: SingleDomainLimitationImportRow;
  SINGLE_DOMAIN_APPLICATION: SingleDomainApplicationImportRow;
};

export interface SingleDomainDriverPreviewItem {
  signal_key: string;
  signal_label: string;
  rank: number;
  driver_role: SingleDomainDriverRole;
  materiality: SingleDomainDriverMateriality;
  claim_text: string;
}

export interface SingleDomainPreviewSignal {
  signal_key: string;
  signal_label: string;
  rank: number;
  normalized_score: number;
  materially_underplayed: boolean;
}

export interface SingleDomainNarrativePreviewInput {
  domain_key: string;
  domain_title: string;
  pair_key: string;
  ranked_signals: readonly SingleDomainPreviewSignal[];
  driver_rows: readonly SingleDomainDriverPreviewItem[];
  sections: {
    intro: SingleDomainIntroImportRow;
    hero: SingleDomainHeroImportRow;
    drivers: readonly SingleDomainDriversImportRow[];
    pair: SingleDomainPairImportRow;
    limitation: SingleDomainLimitationImportRow;
    application: readonly SingleDomainApplicationImportRow[];
  };
}

export type SingleDomainSectionQuestionMap = {
  intro: 'What is this domain about?';
  hero: 'What is the defining pattern here?';
  drivers: 'What is creating that pattern?';
  pair: 'How do the top two tendencies combine?';
  limitation: 'Where does that pattern become costly or narrow?';
  application: 'What should the user rely on, notice, and develop?';
};

export type SingleDomainNarrativeSectionContract<
  TSection extends SingleDomainNarrativeSectionKey = SingleDomainNarrativeSectionKey,
> = {
  section: TSection;
  question: SingleDomainSectionQuestionMap[TSection];
  allowedClaimOwnership: readonly AllowedClaimOwnershipForSection<TSection>[];
};
