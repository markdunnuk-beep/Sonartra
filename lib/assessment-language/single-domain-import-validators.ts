import {
  resolveSingleDomainPairKey,
} from '@/lib/assessment-language/single-domain-pair-keys';
import {
  getExpectedDriverClaimTuples,
  getSingleDomainCanonicalPairKeys,
} from '@/lib/assessment-language/single-domain-canonical';
import { SINGLE_DOMAIN_DRIVER_ROLE_TO_CLAIM_TYPE } from '@/lib/assessment-language/single-domain-narrative-schema';
import type {
  SingleDomainApplicationImportRow,
  SingleDomainDriverMateriality,
  SingleDomainDriverRole,
  SingleDomainDriversImportRow,
  SingleDomainIntroImportRow,
  SingleDomainLimitationImportRow,
  SingleDomainNarrativeDatasetKey,
  SingleDomainNarrativeImportRowMap,
  SingleDomainNarrativeSectionKey,
  SingleDomainPairImportRow,
  SingleDomainHeroImportRow,
} from '@/lib/assessment-language/single-domain-narrative-types';
import { SINGLE_DOMAIN_IMPORT_DATASET_SECTION_MAP } from '@/lib/assessment-language/single-domain-import-headers';
import {
  SINGLE_DOMAIN_CLAIM_OWNERSHIP_KEYS,
  SINGLE_DOMAIN_DRIVER_ROLES,
} from '@/lib/assessment-language/single-domain-narrative-types';

export type SingleDomainImportValidationIssue = {
  lineNumber: number | null;
  message: string;
};

export type SingleDomainImportValidationContext = {
  datasetKey: SingleDomainNarrativeDatasetKey;
  targetSection: SingleDomainNarrativeSectionKey;
  currentDomainKey: string | null;
  signalKeys: readonly string[];
  pairKeys: readonly string[];
};

export type SingleDomainImportValidationResult<TKey extends SingleDomainNarrativeDatasetKey> = {
  success: boolean;
  rows: readonly SingleDomainNarrativeImportRowMap[TKey][];
  validationErrors: readonly SingleDomainImportValidationIssue[];
};

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isPositiveIntegerString(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function isDriverMateriality(value: string): value is SingleDomainDriverMateriality {
  return value === 'core' || value === 'supporting' || value === 'material_underplay';
}

function hasKnownSignalKey(signalKeys: readonly string[], signalKey: string): boolean {
  return signalKeys.includes(signalKey);
}

function hasCanonicalPairKey(pairKeys: readonly string[], pairKey: string): boolean {
  return pairKeys.includes(pairKey);
}

const SINGLE_DOMAIN_APPLICATION_IMPORT_GUIDANCE_TYPES = [
  'applied_strength',
  'watchout',
  'development_focus',
] as const;

const APPLICATION_FOCUS_TO_GUIDANCE_TYPE = {
  rely_on: 'applied_strength',
  notice: 'watchout',
  develop: 'development_focus',
} as const;

const APPLICATION_DRIVER_ROLE_TO_PRIORITY = {
  primary_driver: '1',
  secondary_driver: '2',
  supporting_context: '3',
  range_limitation: '4',
} as const satisfies Record<SingleDomainDriverRole, string>;

const APPLICATION_DRIVER_ROLE_ORDER = [
  'primary_driver',
  'secondary_driver',
  'supporting_context',
  'range_limitation',
] as const;

const APPLICATION_FOCUS_AREAS = [
  'rely_on',
  'notice',
  'develop',
] as const;

function splitPatternKey(patternKey: string): readonly string[] {
  return patternKey.split('_');
}

function splitApplicationPairKey(pairKey: string): readonly string[] {
  return pairKey.split('_');
}

function validatePairKey(
  pairKeys: readonly string[],
  pairKey: string,
  lineNumber: number,
  issues: SingleDomainImportValidationIssue[],
): void {
  const resolution = resolveSingleDomainPairKey(pairKeys, pairKey);
  if (!resolution.success && resolution.reason === 'invalid_shape') {
    issues.push({
      lineNumber,
      message: `Line ${lineNumber}: pair_key "${pairKey}" must be a canonical two-signal key.`,
    });
    return;
  }

  if (!resolution.success) {
    issues.push({
      lineNumber,
      message: `Line ${lineNumber}: pair_key "${pairKey}" is not resolvable for the current signal set.`,
    });
    return;
  }

  if (resolution.wasReversed) {
    issues.push({
      lineNumber,
      message: `Line ${lineNumber}: pair_key "${pairKey}" must be canonical for the current signal order.`,
    });
  }
}

function validateSharedRowFields<TKey extends SingleDomainNarrativeDatasetKey>(
  row: SingleDomainNarrativeImportRowMap[TKey],
  lineNumber: number,
  context: SingleDomainImportValidationContext,
  issues: SingleDomainImportValidationIssue[],
): void {
  if (row.section_key !== context.targetSection) {
    issues.push({
      lineNumber,
      message: `Line ${lineNumber}: section_key must be "${context.targetSection}".`,
    });
  }

  if (!context.currentDomainKey) {
    issues.push({
      lineNumber: null,
      message: 'A single authored domain must exist before section imports can be validated.',
    });
    return;
  }

  if (row.domain_key !== context.currentDomainKey) {
    issues.push({
      lineNumber,
      message: `Line ${lineNumber}: domain_key "${row.domain_key}" does not match the current domain "${context.currentDomainKey}".`,
    });
  }
}

function validateIntroRows(
  rows: readonly SingleDomainIntroImportRow[],
  context: SingleDomainImportValidationContext,
): readonly SingleDomainImportValidationIssue[] {
  const issues: SingleDomainImportValidationIssue[] = [];
  const seenDomainKeys = new Set<string>();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    validateSharedRowFields(row, lineNumber, context, issues);

    if (!hasText(row.domain_title)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: domain_title is required.` });
    }
    if (!hasText(row.domain_definition)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: domain_definition is required.` });
    }
    if (!hasText(row.domain_scope)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: domain_scope is required.` });
    }
    if (!hasText(row.interpretation_guidance)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: interpretation_guidance is required.`,
      });
    }

    if (seenDomainKeys.has(row.domain_key)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: duplicate intro row for domain_key "${row.domain_key}".`,
      });
    }
    seenDomainKeys.add(row.domain_key);
  });

  return issues;
}

function validateHeroRows(
  rows: readonly SingleDomainHeroImportRow[],
  context: SingleDomainImportValidationContext,
): readonly SingleDomainImportValidationIssue[] {
  const issues: SingleDomainImportValidationIssue[] = [];
  const seenPairKeys = new Set<string>();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    validateSharedRowFields(row, lineNumber, context, issues);
    validatePairKey(context.pairKeys, row.pair_key, lineNumber, issues);

    if (!hasText(row.pattern_label)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: pattern_label is required.` });
    }
    if (!hasText(row.hero_statement)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: hero_statement is required.` });
    }
    if (!hasText(row.hero_expansion)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: hero_expansion is required.` });
    }
    if (!hasText(row.hero_strength)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: hero_strength is required.` });
    }

    if (seenPairKeys.has(row.pair_key)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: duplicate hero row for pair_key "${row.pair_key}".`,
      });
    }
    seenPairKeys.add(row.pair_key);
  });

  return issues;
}

function validateDriverMateriality(
  row: SingleDomainDriversImportRow,
  lineNumber: number,
  issues: SingleDomainImportValidationIssue[],
): void {
  if (row.driver_role === 'primary_driver' && row.materiality !== 'core') {
    issues.push({
      lineNumber,
      message: `Line ${lineNumber}: primary_driver rows must use materiality "core".`,
    });
  }

  if (row.driver_role === 'secondary_driver' && row.materiality !== 'core') {
    issues.push({
      lineNumber,
      message: `Line ${lineNumber}: secondary_driver rows must use materiality "core".`,
    });
  }

  if (row.driver_role === 'supporting_context' && row.materiality !== 'supporting') {
    issues.push({
      lineNumber,
      message: `Line ${lineNumber}: supporting_context rows must use materiality "supporting".`,
    });
  }

  if (row.driver_role === 'range_limitation' && row.materiality !== 'material_underplay') {
    issues.push({
      lineNumber,
      message: `Line ${lineNumber}: range_limitation rows must use materiality "material_underplay".`,
    });
  }

  if (row.materiality === 'material_underplay' && row.driver_role !== 'range_limitation') {
    issues.push({
      lineNumber,
      message:
        `Line ${lineNumber}: materially underplayed signals must be authored as range_limitation, not ${row.driver_role}.`,
    });
  }
}

function validateDriversRows(
  rows: readonly SingleDomainDriversImportRow[],
  context: SingleDomainImportValidationContext,
): readonly SingleDomainImportValidationIssue[] {
  const issues: SingleDomainImportValidationIssue[] = [];
  const seenKeys = new Set<string>();
  const actualTupleCounts = new Map<string, number>();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    validateSharedRowFields(row, lineNumber, context, issues);
    if (!hasCanonicalPairKey(context.pairKeys, row.pair_key)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: pair_key "${row.pair_key}" must be canonical for this draft.`,
      });
    }

    if (!hasKnownSignalKey(context.signalKeys, row.signal_key)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: signal_key "${row.signal_key}" is not resolvable for the current domain.`,
      });
    }

    if (!SINGLE_DOMAIN_DRIVER_ROLES.includes(row.driver_role)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: driver_role "${row.driver_role}" is invalid.`,
      });
    }

    if (!isDriverMateriality(row.materiality)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: materiality "${row.materiality}" is invalid.`,
      });
    }

    if (!hasText(row.claim_text)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: claim_text is required.` });
    }

    if (!isPositiveIntegerString(row.priority)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: priority must be a positive integer string.`,
      });
    }

    if (SINGLE_DOMAIN_DRIVER_ROLE_TO_CLAIM_TYPE[row.driver_role] !== row.claim_type) {
      issues.push({
        lineNumber,
        message:
          `Line ${lineNumber}: ${row.driver_role} must use claim_type "${SINGLE_DOMAIN_DRIVER_ROLE_TO_CLAIM_TYPE[row.driver_role]}".`,
      });
    }

    validateDriverMateriality(row, lineNumber, issues);

    const tupleKey = [
      row.domain_key,
      row.pair_key,
      row.signal_key,
      row.driver_role,
    ].join('|');
    actualTupleCounts.set(tupleKey, (actualTupleCounts.get(tupleKey) ?? 0) + 1);

    const duplicateKey = [
      row.domain_key,
      row.pair_key,
      row.signal_key,
      row.driver_role,
      row.claim_type,
      row.priority,
    ].join('|');
    if (seenKeys.has(duplicateKey)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: duplicate driver row for "${duplicateKey}".`,
      });
    }
    seenKeys.add(duplicateKey);
  });

  if (!context.currentDomainKey) {
    return issues;
  }

  const expectedTuples = getExpectedDriverClaimTuples({
    domainKey: context.currentDomainKey,
    signalKeys: context.signalKeys,
    pairKeys: context.pairKeys,
  });
  const expectedTupleKeys = new Set(
    expectedTuples.map((tuple) => `${tuple.domainKey}|${tuple.pairKey}|${tuple.signalKey}|${tuple.driverRole}`),
  );

  rows.forEach((row, index) => {
    const tupleKey = [
      row.domain_key,
      row.pair_key,
      row.signal_key,
      row.driver_role,
    ].join('|');
    if (!expectedTupleKeys.has(tupleKey)) {
      issues.push({
        lineNumber: index + 2,
        message: `Line ${index + 2}: drivers row must match an exact runtime tuple. Received ${tupleKey}.`,
      });
    }
  });

  expectedTuples.forEach((tuple) => {
    const tupleKey = `${tuple.domainKey}|${tuple.pairKey}|${tuple.signalKey}|${tuple.driverRole}`;
    const count = actualTupleCounts.get(tupleKey) ?? 0;
    if (count !== 1) {
      issues.push({
        lineNumber: null,
        message: `Missing drivers row for exact tuple "${tupleKey}" (found ${count}).`,
      });
    }
  });

  return issues;
}

function validatePairRows(
  rows: readonly SingleDomainPairImportRow[],
  context: SingleDomainImportValidationContext,
): readonly SingleDomainImportValidationIssue[] {
  const issues: SingleDomainImportValidationIssue[] = [];
  const seenPairKeys = new Set<string>();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    validateSharedRowFields(row, lineNumber, context, issues);
    validatePairKey(context.pairKeys, row.pair_key, lineNumber, issues);

    if (!hasText(row.pair_label)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: pair_label is required.` });
    }
    if (!hasText(row.interaction_claim)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: interaction_claim is required.` });
    }
    if (!hasText(row.synergy_claim)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: synergy_claim is required.` });
    }
    if (!hasText(row.tension_claim)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: tension_claim is required.` });
    }
    if (!hasText(row.pair_outcome)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: pair_outcome is required.` });
    }

    if (seenPairKeys.has(row.pair_key)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: duplicate pair row for pair_key "${row.pair_key}".`,
      });
    }
    seenPairKeys.add(row.pair_key);
  });

  return issues;
}

function validateLimitationRows(
  rows: readonly SingleDomainLimitationImportRow[],
  context: SingleDomainImportValidationContext,
): readonly SingleDomainImportValidationIssue[] {
  const issues: SingleDomainImportValidationIssue[] = [];
  const seenPairKeys = new Set<string>();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    validateSharedRowFields(row, lineNumber, context, issues);
    validatePairKey(context.pairKeys, row.pair_key, lineNumber, issues);

    if (!hasText(row.limitation_label)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: limitation_label is required.` });
    }
    if (!hasText(row.pattern_cost)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: pattern_cost is required.` });
    }
    if (!hasText(row.range_narrowing)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: range_narrowing is required.` });
    }

    const hasWeakerSignalKey = hasText(row.weaker_signal_key);
    const hasWeakerSignalLink = hasText(row.weaker_signal_link);

    if (hasWeakerSignalKey !== hasWeakerSignalLink) {
      issues.push({
        lineNumber,
        message:
          `Line ${lineNumber}: weaker_signal_key and weaker_signal_link must both be present when either is provided.`,
      });
    }

    if (hasWeakerSignalKey && !hasKnownSignalKey(context.signalKeys, row.weaker_signal_key)) {
      issues.push({
        lineNumber,
        message:
          `Line ${lineNumber}: weaker_signal_key "${row.weaker_signal_key}" is not resolvable for the current domain.`,
      });
    }

    if (seenPairKeys.has(row.pair_key)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: duplicate limitation row for pair_key "${row.pair_key}".`,
      });
    }
    seenPairKeys.add(row.pair_key);
  });

  return issues;
}

function validateApplicationRows(
  rows: readonly SingleDomainApplicationImportRow[],
  context: SingleDomainImportValidationContext,
): readonly SingleDomainImportValidationIssue[] {
  const issues: SingleDomainImportValidationIssue[] = [];
  const seenKeys = new Set<string>();
  const rowsByPatternKey = new Map<string, SingleDomainApplicationImportRow[]>();
  const patternKeysByPairKey = new Map<string, Set<string>>();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    validateSharedRowFields(row, lineNumber, context, issues);

    const patternKey = row.pattern_key ?? '';
    const driverRole = row.driver_role ?? '';
    const patternSignals = splitPatternKey(patternKey);
    const pairSignals = splitApplicationPairKey(row.pair_key);

    if (!hasText(patternKey)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: pattern_key is required.` });
    } else if (patternSignals.length !== 4 || patternSignals.some((signalKey) => !hasText(signalKey))) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: pattern_key must contain exactly 4 signals.`,
      });
    }

    if (pairSignals.length !== 2 || pairSignals.some((signalKey) => !hasText(signalKey))) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: pair_key must contain exactly 2 signals.`,
      });
    } else if (patternSignals.length === 4) {
      const expectedPairKey = `${patternSignals[0]}_${patternSignals[1]}`;
      if (row.pair_key !== expectedPairKey) {
        issues.push({
          lineNumber,
          message: `Line ${lineNumber}: pair_key must match the first two signals in pattern_key.`,
        });
      }
    }

    if (!hasCanonicalPairKey(context.pairKeys, row.pair_key)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: pair_key "${row.pair_key}" must be canonical for this draft.`,
      });
    }

    if (row.focus_area !== 'rely_on' && row.focus_area !== 'notice' && row.focus_area !== 'develop') {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: focus_area "${row.focus_area}" is invalid.`,
      });
    }

    if (!SINGLE_DOMAIN_APPLICATION_IMPORT_GUIDANCE_TYPES.includes(
      row.guidance_type as typeof SINGLE_DOMAIN_APPLICATION_IMPORT_GUIDANCE_TYPES[number],
    )) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: guidance_type "${row.guidance_type}" is invalid.`,
      });
    }

    if (
      row.focus_area === 'rely_on'
      || row.focus_area === 'notice'
      || row.focus_area === 'develop'
    ) {
      const expectedGuidanceType = APPLICATION_FOCUS_TO_GUIDANCE_TYPE[row.focus_area];
      if (row.guidance_type !== expectedGuidanceType) {
        issues.push({
          lineNumber,
          message: `Line ${lineNumber}: focus_area "${row.focus_area}" must use guidance_type "${expectedGuidanceType}".`,
        });
      }
    }

    if (!SINGLE_DOMAIN_DRIVER_ROLES.includes(driverRole as SingleDomainDriverRole)) {
      issues.push({
        lineNumber,
        message: hasText(driverRole)
          ? `Line ${lineNumber}: driver_role "${driverRole}" is invalid.`
          : `Line ${lineNumber}: driver_role is required.`,
      });
    } else if (patternSignals.length === 4) {
      const expectedSignalKey = patternSignals[APPLICATION_DRIVER_ROLE_ORDER.indexOf(driverRole as SingleDomainDriverRole)];
      if (row.signal_key !== expectedSignalKey) {
        issues.push({
          lineNumber,
          message: `Line ${lineNumber}: driver_role does not match signal position in pattern_key.`,
        });
      }
    }

    if (!hasKnownSignalKey(context.signalKeys, row.signal_key)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: signal_key "${row.signal_key}" is not resolvable for the current domain.`,
      });
    }

    for (const signalKey of patternSignals) {
      if (hasText(signalKey) && !hasKnownSignalKey(context.signalKeys, signalKey)) {
        issues.push({
          lineNumber,
          message: `Line ${lineNumber}: pattern_key signal "${signalKey}" is not resolvable for the current domain.`,
        });
      }
    }

    if (!hasText(row.guidance_text)) {
      issues.push({ lineNumber, message: `Line ${lineNumber}: guidance_text is required.` });
    }

    if (!SINGLE_DOMAIN_CLAIM_OWNERSHIP_KEYS.includes(row.linked_claim_type)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: linked_claim_type "${row.linked_claim_type}" is invalid.`,
      });
    }

    if (!isPositiveIntegerString(row.priority)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: priority must be a positive integer string.`,
      });
    } else if (SINGLE_DOMAIN_DRIVER_ROLES.includes(driverRole as SingleDomainDriverRole)) {
      const expectedPriority = APPLICATION_DRIVER_ROLE_TO_PRIORITY[
        driverRole as keyof typeof APPLICATION_DRIVER_ROLE_TO_PRIORITY
      ];
      if (row.priority !== expectedPriority) {
        issues.push({
          lineNumber,
          message: `Line ${lineNumber}: priority does not match driver_role.`,
        });
      }
    }

    const duplicateKey = [
      row.domain_key,
      patternKey,
      row.focus_area,
      row.guidance_type,
      driverRole,
    ].join('|');
    if (seenKeys.has(duplicateKey)) {
      issues.push({
        lineNumber,
        message: `Line ${lineNumber}: duplicate application row for "${duplicateKey}".`,
      });
    }
    seenKeys.add(duplicateKey);

    if (hasText(patternKey)) {
      const patternRows = rowsByPatternKey.get(patternKey) ?? [];
      patternRows.push(row);
      rowsByPatternKey.set(patternKey, patternRows);
    }

    if (hasText(row.pair_key) && hasText(patternKey)) {
      const patternKeys = patternKeysByPairKey.get(row.pair_key) ?? new Set<string>();
      patternKeys.add(patternKey);
      patternKeysByPairKey.set(row.pair_key, patternKeys);
    }
  });

  rowsByPatternKey.forEach((patternRows, patternKey) => {
    const patternSignals = splitPatternKey(patternKey);
    if (patternRows.length !== 12) {
      issues.push({
        lineNumber: null,
        message: `Pattern "${patternKey}" must contain exactly 12 application rows (found ${patternRows.length}).`,
      });
    }

    for (const focusArea of APPLICATION_FOCUS_AREAS) {
      const focusRows = patternRows.filter((row) => row.focus_area === focusArea);
      for (const driverRole of APPLICATION_DRIVER_ROLE_ORDER) {
        const count = focusRows.filter((row) => row.driver_role === driverRole).length;
        if (count !== 1) {
          issues.push({
            lineNumber: null,
            message:
              `Pattern "${patternKey}" focus_area "${focusArea}" must contain exactly one ${driverRole} row (found ${count}).`,
          });
        }
      }

      const extraRoleRows = focusRows.filter(
        (row) => !SINGLE_DOMAIN_DRIVER_ROLES.includes((row.driver_role ?? '') as SingleDomainDriverRole),
      );
      if (extraRoleRows.length > 0) {
        issues.push({
          lineNumber: null,
          message:
            `Pattern "${patternKey}" focus_area "${focusArea}" contains extra role rows.`,
        });
      }
    }

    if (patternSignals.length === 4 && new Set(patternSignals).size !== 4) {
      issues.push({
        lineNumber: null,
        message: `Pattern "${patternKey}" must contain 4 distinct signals.`,
      });
    }
  });

  context.pairKeys.forEach((pairKey) => {
    const patternKeys = patternKeysByPairKey.get(pairKey) ?? new Set<string>();
    if (patternKeys.size !== 2) {
      issues.push({
        lineNumber: null,
        message: `pair_key "${pairKey}" must contain exactly 2 pattern_keys (found ${patternKeys.size}).`,
      });
      return;
    }

    const pairSignals = splitApplicationPairKey(pairKey);
    const remainingSignals = context.signalKeys.filter((signalKey) => !pairSignals.includes(signalKey));
    const expectedPatternKeys = new Set([
      [...pairSignals, ...remainingSignals].join('_'),
      [...pairSignals, ...[...remainingSignals].reverse()].join('_'),
    ]);

    patternKeys.forEach((patternKey) => {
      if (!expectedPatternKeys.has(patternKey)) {
        issues.push({
          lineNumber: null,
          message:
            `pair_key "${pairKey}" pattern_key "${patternKey}" must use the remaining signals in opposite orders.`,
        });
      }
    });
  });

  return issues;
}

export function buildSingleDomainImportValidationContext(params: {
  datasetKey: SingleDomainNarrativeDatasetKey;
  currentDomainKey: string | null;
  signalKeys: readonly string[];
}): SingleDomainImportValidationContext {
  return {
    datasetKey: params.datasetKey,
    targetSection: SINGLE_DOMAIN_IMPORT_DATASET_SECTION_MAP[params.datasetKey],
    currentDomainKey: params.currentDomainKey,
    signalKeys: [...params.signalKeys],
    pairKeys: [...getSingleDomainCanonicalPairKeys(params.signalKeys)],
  };
}

export function normalizeSingleDomainImportRowsForRuntimePairKeys<
  TKey extends SingleDomainNarrativeDatasetKey,
>(
  context: SingleDomainImportValidationContext,
  rows: readonly SingleDomainNarrativeImportRowMap[TKey][],
): readonly SingleDomainNarrativeImportRowMap[TKey][] {
  return rows;
}

export function validateSingleDomainImportRows<TKey extends SingleDomainNarrativeDatasetKey>(
  context: SingleDomainImportValidationContext,
  rows: readonly SingleDomainNarrativeImportRowMap[TKey][],
): SingleDomainImportValidationResult<TKey> {
  if (rows.length === 0) {
    return {
      success: false,
      rows: [],
      validationErrors: [{
        lineNumber: null,
        message: `At least one ${context.targetSection} row is required for import.`,
      }],
    };
  }

  const validationErrors = (() => {
    switch (context.datasetKey) {
      case 'SINGLE_DOMAIN_INTRO':
        return validateIntroRows(rows as readonly SingleDomainIntroImportRow[], context);
      case 'SINGLE_DOMAIN_HERO':
        return validateHeroRows(rows as readonly SingleDomainHeroImportRow[], context);
      case 'SINGLE_DOMAIN_DRIVERS':
        return validateDriversRows(rows as readonly SingleDomainDriversImportRow[], context);
      case 'SINGLE_DOMAIN_PAIR':
        return validatePairRows(rows as readonly SingleDomainPairImportRow[], context);
      case 'SINGLE_DOMAIN_LIMITATION':
        return validateLimitationRows(rows as readonly SingleDomainLimitationImportRow[], context);
      case 'SINGLE_DOMAIN_APPLICATION':
        return validateApplicationRows(rows as readonly SingleDomainApplicationImportRow[], context);
    }
  })();

  return {
    success: validationErrors.length === 0,
    rows: validationErrors.length === 0 ? rows : [],
    validationErrors,
  };
}
