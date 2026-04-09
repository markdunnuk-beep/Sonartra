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
  parentId: 'domains';
};

export const RESULT_READING_TOP_LEVEL_SECTIONS: readonly ResultReadingTopLevelSection[] = [
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
    label: 'Your Pattern',
    shortLabel: 'Pattern',
    level: 'section',
    order: 2,
    intentPrompt:
      'Read this first. It captures the pattern that shows up most consistently across your results.',
  },
  {
    id: 'domains',
    label: 'Domain Chapters',
    shortLabel: 'Domains',
    level: 'section',
    order: 3,
    intentPrompt:
      'These chapters show how that pattern appears in different areas. Focus on what feels most familiar, not everything at once.',
  },
  {
    id: 'application',
    label: 'Application',
    shortLabel: 'Apply',
    level: 'section',
    order: 4,
    intentPrompt:
      'This is where to act. Choose one or two areas to work on rather than trying to change everything.',
  },
] as const;

export const RESULT_READING_DOMAIN_SUBSECTIONS: readonly ResultReadingSubsection[] = [
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
] as const;

export const RESULT_READING_SECTIONS: readonly ResultReadingSectionItem[] = [
  ...RESULT_READING_TOP_LEVEL_SECTIONS,
  ...RESULT_READING_DOMAIN_SUBSECTIONS,
].sort((a, b) => a.order - b.order);

export const RESULT_READING_SECTION_IDS = RESULT_READING_SECTIONS.map((section) => section.id);

export const RESULT_READING_SECTIONS_BY_ID: Readonly<Record<string, ResultReadingSectionItem>> =
  RESULT_READING_SECTIONS.reduce<Record<string, ResultReadingSectionItem>>((map, section) => {
    map[section.id] = section;
    return map;
  }, {});
