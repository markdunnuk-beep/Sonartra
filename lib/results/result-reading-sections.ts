export type ResultReadingSectionLevel = 'section' | 'subsection';

export type ResultReadingSectionItem = {
  id: string;
  label: string;
  shortLabel?: string;
  level: ResultReadingSectionLevel;
  parentId?: string;
  order: number;
  intentPrompt?: string;
};

export type ResultReadingTopLevelSection = ResultReadingSectionItem & {
  level: 'section';
  intentPrompt: string;
};

export type ResultReadingSubsection = ResultReadingSectionItem & {
  level: 'subsection';
  parentId: string;
};

export type ResultReadingSectionsConfig = {
  topLevelSections: readonly ResultReadingTopLevelSection[];
  subsections: readonly ResultReadingSubsection[];
  sections: readonly ResultReadingSectionItem[];
  sectionIds: readonly string[];
  sectionsById: Readonly<Record<string, ResultReadingSectionItem>>;
};

export function createResultReadingSections(params: {
  topLevelSections: readonly ResultReadingTopLevelSection[];
  subsections?: readonly ResultReadingSubsection[];
}): ResultReadingSectionsConfig {
  const subsections = params.subsections ?? [];
  const sections = [...params.topLevelSections, ...subsections].sort((a, b) => a.order - b.order);

  return {
    topLevelSections: params.topLevelSections,
    subsections,
    sections,
    sectionIds: sections.map((section) => section.id),
    sectionsById: sections.reduce<Record<string, ResultReadingSectionItem>>((map, section) => {
      map[section.id] = section;
      return map;
    }, {}),
  };
}

export const DEFAULT_RESULT_READING_SECTIONS = createResultReadingSections({
  topLevelSections: [
    {
      id: 'intro',
      label: 'Introduction',
      shortLabel: 'Intro',
      level: 'section',
      order: 1,
      intentPrompt:
        'Start here. This report explains how your behavioural patterns are organised and how to read them.',
    },
    {
      id: 'hero',
      label: 'Your Behaviour Pattern',
      shortLabel: 'Pattern',
      level: 'section',
      order: 2,
      intentPrompt:
        'Read this first. It captures the pattern that shows up most consistently across your results.',
    },
    {
      id: 'domains',
      label: 'How It Shows Up',
      shortLabel: 'Domains',
      level: 'section',
      order: 3,
      intentPrompt:
        'These chapters show how that pattern appears in different areas. Focus on what feels most familiar, not everything at once.',
    },
    {
      id: 'application',
      label: 'How to Apply This',
      shortLabel: 'Application',
      level: 'section',
      order: 4,
      intentPrompt:
        'This is where to act. Choose one or two areas to work on rather than trying to change everything.',
    },
  ] as const,
  subsections: [
    {
      id: 'domain-operating-style',
      label: 'Operating Style',
      shortLabel: 'Operating',
      level: 'subsection',
      parentId: 'domains',
      order: 5,
    },
    {
      id: 'domain-core-drivers',
      label: 'Core Drivers',
      shortLabel: 'Drivers',
      level: 'subsection',
      parentId: 'domains',
      order: 6,
    },
    {
      id: 'domain-leadership-approach',
      label: 'Leadership Approach',
      shortLabel: 'Leadership',
      level: 'subsection',
      parentId: 'domains',
      order: 7,
    },
    {
      id: 'domain-tension-response',
      label: 'Tension Response',
      shortLabel: 'Tension',
      level: 'subsection',
      parentId: 'domains',
      order: 8,
    },
    {
      id: 'domain-environment-fit',
      label: 'Environment Fit',
      shortLabel: 'Environment',
      level: 'subsection',
      parentId: 'domains',
      order: 9,
    },
    {
      id: 'domain-pressure-response',
      label: 'Pressure Response',
      shortLabel: 'Pressure',
      level: 'subsection',
      parentId: 'domains',
      order: 10,
    },
  ] as const,
});

export const RESULT_READING_TOP_LEVEL_SECTIONS = DEFAULT_RESULT_READING_SECTIONS.topLevelSections;
export const RESULT_READING_DOMAIN_SUBSECTIONS = DEFAULT_RESULT_READING_SECTIONS.subsections;
export const RESULT_READING_SECTIONS = DEFAULT_RESULT_READING_SECTIONS.sections;
export const RESULT_READING_SECTION_IDS = DEFAULT_RESULT_READING_SECTIONS.sectionIds;
export const RESULT_READING_SECTIONS_BY_ID = DEFAULT_RESULT_READING_SECTIONS.sectionsById;
export {
  SINGLE_DOMAIN_RESULT_READING_SECTIONS,
  createSingleDomainResultReadingSections,
} from './single-domain-reading-sections';
