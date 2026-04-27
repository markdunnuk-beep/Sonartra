import {
  SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS,
} from '@/lib/assessment-language/single-domain-narrative-schema';

import {
  createResultReadingSections,
  type ResultReadingTopLevelSection,
} from './result-reading-sections';

const SINGLE_DOMAIN_RESULT_SECTION_METADATA: Record<
  (typeof SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS)[number]['section'],
  {
    label: string;
    shortLabel: string;
    intentPrompt: string;
  }
> = {
  intro: {
    label: 'Intro',
    shortLabel: 'Intro',
    intentPrompt: 'What this domain measures and how to read the report that follows.',
  },
  hero: {
    label: 'Your Style at a Glance',
    shortLabel: 'Style at a Glance',
    intentPrompt: 'The defining pattern that stands out most clearly in this domain.',
  },
  drivers: {
    label: 'What Shapes Your Approach',
    shortLabel: 'Shapes Your Approach',
    intentPrompt: 'What is creating that pattern, including any missing range that matters.',
  },
  pair: {
    label: 'How Your Style Balances',
    shortLabel: 'Style Balance',
    intentPrompt: 'How the two strongest tendencies combine when this pattern shows up.',
  },
  limitation: {
    label: 'Where This Can Work Against You',
    shortLabel: 'Work Against You',
    intentPrompt: 'Where the current pattern narrows, costs more, or needs broader range.',
  },
  application: {
    label: 'Putting This Into Practice',
    shortLabel: 'Into Practice',
    intentPrompt: 'What to rely on, what to notice, and what to develop from here.',
  },
};

export const SINGLE_DOMAIN_RESULT_READING_SECTIONS = createResultReadingSections({
  topLevelSections: SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS.map((contract, index) => ({
    id: contract.section,
    label: SINGLE_DOMAIN_RESULT_SECTION_METADATA[contract.section].label,
    shortLabel: SINGLE_DOMAIN_RESULT_SECTION_METADATA[contract.section].shortLabel,
    level: 'section',
    order: index + 1,
    intentPrompt: SINGLE_DOMAIN_RESULT_SECTION_METADATA[contract.section].intentPrompt,
  })) as readonly ResultReadingTopLevelSection[],
});

export function createSingleDomainResultReadingSections() {
  return SINGLE_DOMAIN_RESULT_READING_SECTIONS;
}
