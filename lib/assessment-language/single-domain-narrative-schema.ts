import type {
  AllowedClaimOwnershipForSection,
  SingleDomainApplicationGuidanceType,
  SingleDomainClaimOwnership,
  SingleDomainDriverClaimType,
  SingleDomainDriverRole,
  SingleDomainNarrativePreviewInput,
  SingleDomainNarrativeSectionContract,
  SingleDomainNarrativeSectionKey,
} from './single-domain-narrative-types';
import {
  SINGLE_DOMAIN_CLAIM_OWNERSHIP_KEYS,
  SINGLE_DOMAIN_DRIVER_ROLES,
  SINGLE_DOMAIN_NARRATIVE_SECTION_KEYS,
} from './single-domain-narrative-types';

export const SINGLE_DOMAIN_NARRATIVE_DATASET_COLUMNS = {
  SINGLE_DOMAIN_INTRO: [
    'domain_key',
    'section_key',
    'domain_title',
    'domain_definition',
    'domain_scope',
    'interpretation_guidance',
    'intro_note',
  ],
  SINGLE_DOMAIN_HERO: [
    'domain_key',
    'section_key',
    'pair_key',
    'pattern_label',
    'hero_statement',
    'hero_expansion',
    'hero_strength',
  ],
  SINGLE_DOMAIN_DRIVERS: [
    'domain_key',
    'section_key',
    'pair_key',
    'signal_key',
    'driver_role',
    'claim_type',
    'claim_text',
    'materiality',
    'priority',
  ],
  SINGLE_DOMAIN_PAIR: [
    'domain_key',
    'section_key',
    'pair_key',
    'pair_label',
    'interaction_claim',
    'synergy_claim',
    'tension_claim',
    'pair_outcome',
  ],
  SINGLE_DOMAIN_LIMITATION: [
    'domain_key',
    'section_key',
    'pair_key',
    'limitation_label',
    'pattern_cost',
    'range_narrowing',
    'weaker_signal_key',
    'weaker_signal_link',
  ],
  SINGLE_DOMAIN_APPLICATION: [
    'domain_key',
    'section_key',
    'pair_key',
    'focus_area',
    'guidance_type',
    'signal_key',
    'guidance_text',
    'linked_claim_type',
    'priority',
  ],
} as const;

export const SINGLE_DOMAIN_SECTION_QUESTION_MAP = {
  intro: 'What is this domain about?',
  hero: 'What is the defining pattern here?',
  drivers: 'What is creating that pattern?',
  pair: 'How do the top two tendencies combine?',
  limitation: 'Where does that pattern become costly or narrow?',
  application: 'What should the user rely on, notice, and develop?',
} as const;

export const SINGLE_DOMAIN_ALLOWED_CLAIMS_BY_SECTION = {
  intro: ['domain_definition', 'domain_scope', 'interpretation_guidance'],
  hero: ['dominant_pattern', 'pattern_identity', 'pattern_strength'],
  drivers: [
    'driver_primary',
    'driver_secondary',
    'driver_supporting_context',
    'driver_range_limitation',
  ],
  pair: ['pair_interaction', 'pair_synergy', 'pair_tension'],
  limitation: ['pattern_cost', 'range_narrowing', 'weaker_signal_linkage', 'blind_spot'],
  application: ['applied_strength', 'watchout', 'development_focus', 'range_recovery_action'],
} as const satisfies {
  [TSection in SingleDomainNarrativeSectionKey]: readonly AllowedClaimOwnershipForSection<TSection>[];
};

export const SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS = (
  SINGLE_DOMAIN_NARRATIVE_SECTION_KEYS.map((section) => ({
    section,
    question: SINGLE_DOMAIN_SECTION_QUESTION_MAP[section],
    allowedClaimOwnership: SINGLE_DOMAIN_ALLOWED_CLAIMS_BY_SECTION[section],
  })) satisfies readonly SingleDomainNarrativeSectionContract[]
);

export const SINGLE_DOMAIN_DRIVER_ROLE_TO_CLAIM_TYPE: Record<
  SingleDomainDriverRole,
  SingleDomainDriverClaimType
> = {
  primary_driver: 'driver_primary',
  secondary_driver: 'driver_secondary',
  supporting_context: 'driver_supporting_context',
  range_limitation: 'driver_range_limitation',
};

export const SINGLE_DOMAIN_APPLICATION_GUIDANCE_TYPES: readonly SingleDomainApplicationGuidanceType[] = [
  'applied_strength',
  'watchout',
  'development_focus',
  'range_recovery_action',
] as const;

export type SingleDomainNarrativeValidationIssueCode =
  | 'missing_required_sections'
  | 'section_role_collisions'
  | 'hero_pair_duplication'
  | 'weaker_signal_coverage'
  | 'limitation_weaker_signal_linkage'
  | 'application_weaker_signal_linkage';

export interface SingleDomainNarrativeValidationIssue {
  code: SingleDomainNarrativeValidationIssueCode;
  message: string;
}

export interface SingleDomainNarrativeValidationResult {
  success: boolean;
  issues: readonly SingleDomainNarrativeValidationIssue[];
}

function normalizeForDuplicationCheck(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasSectionContent(
  preview: SingleDomainNarrativePreviewInput,
  section: SingleDomainNarrativeSectionKey,
): boolean {
  if (section === 'drivers' || section === 'application') {
    return preview.sections[section].length > 0;
  }

  return Boolean(preview.sections[section]);
}

function isClaimOwnership(value: string): value is SingleDomainClaimOwnership {
  return SINGLE_DOMAIN_CLAIM_OWNERSHIP_KEYS.includes(value as SingleDomainClaimOwnership);
}

function countDriverRole(
  preview: SingleDomainNarrativePreviewInput,
  role: SingleDomainDriverRole,
): number {
  return preview.sections.drivers.filter((row) => row.driver_role === role).length;
}

function collectMaterialRangeLimitationSignals(
  preview: SingleDomainNarrativePreviewInput,
): readonly string[] {
  return preview.sections.drivers
    .filter(
      (row) =>
        row.driver_role === 'range_limitation' && row.materiality === 'material_underplay',
    )
    .map((row) => row.signal_key);
}

export function validateSingleDomainNarrativePreview(
  preview: SingleDomainNarrativePreviewInput,
): SingleDomainNarrativeValidationResult {
  const issues: SingleDomainNarrativeValidationIssue[] = [];

  const missingSections = SINGLE_DOMAIN_NARRATIVE_SECTION_KEYS.filter(
    (section) => !hasSectionContent(preview, section),
  );
  if (missingSections.length > 0) {
    issues.push({
      code: 'missing_required_sections',
      message: `Missing required sections: ${missingSections.join(', ')}.`,
    });
  }

  if (countDriverRole(preview, 'primary_driver') !== 1) {
    issues.push({
      code: 'section_role_collisions',
      message: 'Drivers must contain exactly one primary_driver row.',
    });
  }

  if (countDriverRole(preview, 'secondary_driver') !== 1) {
    issues.push({
      code: 'section_role_collisions',
      message: 'Drivers must contain exactly one secondary_driver row.',
    });
  }

  for (const row of preview.sections.drivers) {
    if (SINGLE_DOMAIN_DRIVER_ROLE_TO_CLAIM_TYPE[row.driver_role] !== row.claim_type) {
      issues.push({
        code: 'section_role_collisions',
        message: `Driver row for signal "${row.signal_key}" must map ${row.driver_role} to ${SINGLE_DOMAIN_DRIVER_ROLE_TO_CLAIM_TYPE[row.driver_role]}.`,
      });
    }
  }

  for (const row of preview.sections.application) {
    if (!isClaimOwnership(row.linked_claim_type)) {
      issues.push({
        code: 'section_role_collisions',
        message: `Application row for signal "${row.signal_key}" has an invalid linked_claim_type.`,
      });
      continue;
    }
  }

  const heroFingerprint = normalizeForDuplicationCheck(
    [preview.sections.hero.hero_statement, preview.sections.hero.hero_expansion].join(' '),
  );
  const pairFingerprint = normalizeForDuplicationCheck(
    [
      preview.sections.pair.interaction_claim,
      preview.sections.pair.synergy_claim,
      preview.sections.pair.tension_claim,
      preview.sections.pair.pair_outcome,
    ].join(' '),
  );

  if (heroFingerprint.length > 0 && heroFingerprint === pairFingerprint) {
    issues.push({
      code: 'hero_pair_duplication',
      message: 'Hero and pair sections duplicate the same normalized narrative claim.',
    });
  }

  const materiallyUnderplayedSignalKeys = new Set(
    preview.ranked_signals
      .filter((signal) => signal.materially_underplayed)
      .map((signal) => signal.signal_key),
  );
  const coveredRangeLimitations = new Set(collectMaterialRangeLimitationSignals(preview));

  for (const signalKey of materiallyUnderplayedSignalKeys) {
    if (!coveredRangeLimitations.has(signalKey)) {
      issues.push({
        code: 'weaker_signal_coverage',
        message: `Materially underplayed signal "${signalKey}" must be authored as range_limitation.`,
      });
    }
  }

  if (coveredRangeLimitations.size > 0) {
    const weakerSignalKey = preview.sections.limitation.weaker_signal_key.trim();
    const weakerSignalLink = preview.sections.limitation.weaker_signal_link.trim();

    if (weakerSignalKey.length === 0 || weakerSignalLink.length === 0) {
      issues.push({
        code: 'limitation_weaker_signal_linkage',
        message:
          'Limitation must include weaker_signal_key and weaker_signal_link when a material range_limitation exists.',
      });
    }
  }

  for (const signalKey of coveredRangeLimitations) {
    const hasApplicationLink = preview.sections.application.some(
      (row) =>
        row.signal_key === signalKey
        && (row.guidance_type === 'watchout'
          || row.guidance_type === 'development_focus'
          || row.guidance_type === 'range_recovery_action'),
    );

    if (!hasApplicationLink) {
      issues.push({
        code: 'application_weaker_signal_linkage',
        message: `Application must include a weaker-signal-linked watchout or development item for "${signalKey}".`,
      });
    }
  }

  return {
    success: issues.length === 0,
    issues,
  };
}

export function validateSingleDomainImportHeaders<
  TKey extends keyof typeof SINGLE_DOMAIN_NARRATIVE_DATASET_COLUMNS,
>(
  datasetKey: TKey,
  headers: readonly string[],
): {
  success: boolean;
  expected: readonly string[];
  received: readonly string[];
  message?: string;
} {
  const expected = SINGLE_DOMAIN_NARRATIVE_DATASET_COLUMNS[datasetKey];
  const received = headers.map((header) => header.trim());
  const exactMatch =
    expected.length === received.length
    && expected.every((column, index) => column === received[index]);

  if (exactMatch) {
    return {
      success: true,
      expected,
      received,
    };
  }

  return {
    success: false,
    expected,
    received,
    message: `Invalid headers for ${datasetKey}. Expected ${expected.join('|')}. Received ${received.join('|')}.`,
  };
}

export function isSingleDomainDriverRole(value: string): value is SingleDomainDriverRole {
  return SINGLE_DOMAIN_DRIVER_ROLES.includes(value as SingleDomainDriverRole);
}
