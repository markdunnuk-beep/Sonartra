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

export const SINGLE_DOMAIN_RESULT_READING_SECTIONS = createResultReadingSections({
  topLevelSections: [
    {
      id: 'intro',
      label: 'Introduction',
      shortLabel: 'Intro',
      level: 'section',
      order: 1,
      intentPrompt:
        'Start here. This introduction frames the domain you completed and how to read the sections that follow.',
    },
    {
      id: 'hero',
      label: 'Your Behaviour Pattern',
      shortLabel: 'Pattern',
      level: 'section',
      order: 2,
      intentPrompt:
        'The clearest pattern in this domain, written as a direct read of how you tend to operate.',
    },
    {
      id: 'signals',
      label: 'Inside This Domain',
      shortLabel: 'Signals',
      level: 'section',
      order: 3,
      intentPrompt:
        'These signal chapters show how the pattern is built. Read them in order rather than scanning for a single label.',
    },
    {
      id: 'balancing',
      label: 'Balancing Your Approach',
      shortLabel: 'Balance',
      level: 'section',
      order: 4,
      intentPrompt:
        'This section explains where the current pattern helps, where it narrows, and what rebalancing looks like.',
    },
    {
      id: 'pair-summary',
      label: 'How This Shows Up',
      shortLabel: 'Pair',
      level: 'section',
      order: 5,
      intentPrompt:
        'This is the integrated reading. It explains how the signal pair comes together in actual behaviour.',
    },
    {
      id: 'application',
      label: 'Application',
      shortLabel: 'Apply',
      level: 'section',
      order: 6,
      intentPrompt:
        'Practical points to lean on, watch for, and develop from here.',
    },
  ] as const,
});

export function createSingleDomainResultReadingSections(params: {
  introLabel: string;
  heroLabel?: string;
  signalsLabel?: string;
  balancingLabel: string;
  pairSummaryLabel: string;
  applicationLabel?: string;
}) {
  return createResultReadingSections({
    topLevelSections: [
      {
        id: 'intro',
        label: params.introLabel,
        shortLabel: 'Intro',
        level: 'section',
        order: 1,
        intentPrompt: 'A quick orientation to what this part of your report is about.',
      },
      {
        id: 'hero',
        label: params.heroLabel ?? 'Behaviour pattern',
        shortLabel: 'Pattern',
        level: 'section',
        order: 2,
        intentPrompt: 'The clearest pattern in this domain, written as a direct read of how you tend to operate.',
      },
      {
        id: 'signals',
        label: params.signalsLabel ?? 'Inside this domain',
        shortLabel: 'Signals',
        level: 'section',
        order: 3,
        intentPrompt: 'A closer look at the tendencies shaping this domain and the role each one plays.',
      },
      {
        id: 'balancing',
        label: params.balancingLabel,
        shortLabel: 'Balance',
        level: 'section',
        order: 4,
        intentPrompt: 'Where this pattern helps, where it can narrow your range, and how to bring it back into balance.',
      },
      {
        id: 'pair-summary',
        label: params.pairSummaryLabel,
        shortLabel: 'Summary',
        level: 'section',
        order: 5,
        intentPrompt: 'How the leading tendencies work together when this domain is at its most recognisable.',
      },
      {
        id: 'application',
        label: params.applicationLabel ?? 'Application',
        shortLabel: 'Apply',
        level: 'section',
        order: 6,
        intentPrompt: 'Practical points to lean on, watch for, and develop from here.',
      },
    ] as const,
  });
}
