import { SINGLE_DOMAIN_NARRATIVE_DATASET_COLUMNS } from '@/lib/assessment-language/single-domain-narrative-schema';
import type {
  SingleDomainNarrativeDatasetKey,
  SingleDomainNarrativeSectionKey,
} from '@/lib/assessment-language/single-domain-narrative-types';

export const SINGLE_DOMAIN_IMPORT_DATASET_SECTION_MAP: Record<
  SingleDomainNarrativeDatasetKey,
  SingleDomainNarrativeSectionKey
> = {
  SINGLE_DOMAIN_INTRO: 'intro',
  SINGLE_DOMAIN_HERO: 'hero',
  SINGLE_DOMAIN_DRIVERS: 'drivers',
  SINGLE_DOMAIN_PAIR: 'pair',
  SINGLE_DOMAIN_LIMITATION: 'limitation',
  SINGLE_DOMAIN_APPLICATION: 'application',
};

export const SINGLE_DOMAIN_SECTION_IMPORT_DATASET_MAP: Record<
  SingleDomainNarrativeSectionKey,
  SingleDomainNarrativeDatasetKey
> = {
  intro: 'SINGLE_DOMAIN_INTRO',
  hero: 'SINGLE_DOMAIN_HERO',
  drivers: 'SINGLE_DOMAIN_DRIVERS',
  pair: 'SINGLE_DOMAIN_PAIR',
  limitation: 'SINGLE_DOMAIN_LIMITATION',
  application: 'SINGLE_DOMAIN_APPLICATION',
};

export function getSingleDomainImportHeaderColumns<TKey extends SingleDomainNarrativeDatasetKey>(
  datasetKey: TKey,
): readonly string[] {
  return SINGLE_DOMAIN_NARRATIVE_DATASET_COLUMNS[datasetKey];
}

export function getSingleDomainImportHeaderPreview(
  datasetKey: SingleDomainNarrativeDatasetKey,
): string {
  return getSingleDomainImportHeaderColumns(datasetKey).join('|');
}
