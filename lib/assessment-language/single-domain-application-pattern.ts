import type { ApplicationStatementsRow } from '@/lib/types/single-domain-language';

export const SINGLE_DOMAIN_APPLICATION_DRIVER_ROLES = [
  'primary_driver',
  'secondary_driver',
  'supporting_context',
  'range_limitation',
] as const;

export type SingleDomainApplicationDriverRole =
  typeof SINGLE_DOMAIN_APPLICATION_DRIVER_ROLES[number];

export type SingleDomainApplicationPattern = {
  patternKey: string;
  pairKey: string;
  signalByRole: Readonly<Record<SingleDomainApplicationDriverRole, string>>;
  roleBySignal: Readonly<Record<string, SingleDomainApplicationDriverRole>>;
};

export function buildSingleDomainApplicationPattern(
  rankedSignalKeys: readonly string[],
): SingleDomainApplicationPattern {
  const [primary, secondary, supporting, limitation] = rankedSignalKeys;

  if (!primary || !secondary || !supporting || !limitation) {
    throw new Error('single_domain_application_full_pattern requires at least four ranked signals.');
  }

  const signalByRole = {
    primary_driver: primary,
    secondary_driver: secondary,
    supporting_context: supporting,
    range_limitation: limitation,
  } as const satisfies Record<SingleDomainApplicationDriverRole, string>;

  return Object.freeze({
    patternKey: [primary, secondary, supporting, limitation].join('_'),
    pairKey: [primary, secondary].join('_'),
    signalByRole: Object.freeze(signalByRole),
    roleBySignal: Object.freeze(Object.fromEntries(
      Object.entries(signalByRole).map(([role, signalKey]) => [signalKey, role]),
    ) as Record<string, SingleDomainApplicationDriverRole>),
  });
}

export function isFullPatternApplicationRow(row: ApplicationStatementsRow): boolean {
  return Boolean(
    row.domain_key
    && row.pattern_key
    && row.pair_key
    && row.focus_area
    && row.guidance_type
    && row.driver_role
    && row.priority
    && row.guidance_text
    && row.linked_claim_type,
  );
}

