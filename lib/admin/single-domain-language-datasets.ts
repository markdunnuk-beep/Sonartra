import {
  SINGLE_DOMAIN_LANGUAGE_DATASET_COLUMNS,
  SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS,
  type SingleDomainLanguageDatasetKey,
} from '@/lib/types/single-domain-language';

export type SingleDomainLanguageDatasetDefinition = {
  key: SingleDomainLanguageDatasetKey;
  label: string;
  description: string;
  expectedHeaders: readonly string[];
  primaryKey: string;
};

const SINGLE_DOMAIN_LANGUAGE_DATASET_META = {
  DOMAIN_FRAMING: {
    label: 'Domain Framing',
    description: 'Single-domain framing copy for the domain chapter opening and bridge into the authored signals.',
  },
  HERO_PAIRS: {
    label: 'Hero Pairs',
    description: 'Pair-owned hero opening language for the derived signal pairs in this single-domain draft.',
  },
  DRIVER_CLAIMS: {
    label: 'Driver Claims',
    description: 'Pair-scoped driver section claims resolved by pair, signal, and driver role.',
  },
  SIGNAL_CHAPTERS: {
    label: 'Signal Chapters',
    description: 'Legacy per-signal chapter language and compatibility copy for the authored signal set.',
  },
  BALANCING_SECTIONS: {
    label: 'Balancing Sections',
    description: 'Pair-owned balancing guidance for the derived signal pairs in the draft.',
  },
  PAIR_SUMMARIES: {
    label: 'Pair Summaries',
    description: 'Pair-level summary language that closes the hero and balancing pair readings.',
  },
  APPLICATION_STATEMENTS: {
    label: 'Application Statements',
    description: 'Per-signal strengths, watchouts, and development statements for the authored signal set.',
  },
} as const satisfies Record<SingleDomainLanguageDatasetKey, {
  label: string;
  description: string;
}>;

export const SINGLE_DOMAIN_LANGUAGE_DATASET_DEFINITIONS = Object.freeze(
  SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS.map((key) =>
    Object.freeze({
      key,
      label: SINGLE_DOMAIN_LANGUAGE_DATASET_META[key].label,
      description: SINGLE_DOMAIN_LANGUAGE_DATASET_META[key].description,
      expectedHeaders: SINGLE_DOMAIN_LANGUAGE_DATASET_COLUMNS[key],
      primaryKey: key === 'DRIVER_CLAIMS'
        ? 'driver_claim_key'
        : SINGLE_DOMAIN_LANGUAGE_DATASET_COLUMNS[key][0],
    } satisfies SingleDomainLanguageDatasetDefinition),
  ),
);

export function getSingleDomainLanguageDatasetDefinition(
  datasetKey: SingleDomainLanguageDatasetKey,
): SingleDomainLanguageDatasetDefinition {
  return SINGLE_DOMAIN_LANGUAGE_DATASET_DEFINITIONS.find((definition) => definition.key === datasetKey)
    ?? {
      key: datasetKey,
      label: datasetKey,
      description: '',
      expectedHeaders: SINGLE_DOMAIN_LANGUAGE_DATASET_COLUMNS[datasetKey],
      primaryKey: SINGLE_DOMAIN_LANGUAGE_DATASET_COLUMNS[datasetKey][0],
    };
}
