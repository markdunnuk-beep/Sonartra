import { getLibraryArticleHref } from './library-browse-view-model';
import { getLibraryIndexPath } from './library-routes';
import { getLibraryArticle } from './resolve-library-content';

export type LibraryEntryKey = 'home' | 'platform' | 'signals' | 'pricing' | 'contact';

export type LibraryEntryArticleLink = {
  title: string;
  description: string;
  href: string;
  categoryLabel: string;
};

export type LibraryEntry = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  articles: readonly LibraryEntryArticleLink[];
};

const LIBRARY_ENTRY_ARTICLES = {
  home: [
    ['behavioural-assessments', 'what-is-a-behavioural-assessment'],
    ['work-style', 'what-is-work-style'],
  ],
  platform: [
    ['behavioural-assessments', 'what-is-a-behavioural-assessment'],
    ['behavioural-assessments', 'behavioural-assessment-vs-personality-test'],
    ['assessment-guides', 'how-to-use-an-assessment-report-without-over-labelling-yourself'],
  ],
  signals: [
    ['behavioural-assessments', 'what-is-a-behavioural-assessment'],
    ['leadership-style', 'what-is-leadership-style'],
    ['work-style', 'what-is-work-style'],
    ['conflict-style', 'what-is-conflict-style'],
    ['flow-state', 'what-is-flow-state'],
  ],
  pricing: [['assessment-guides', 'how-to-use-an-assessment-report-without-over-labelling-yourself']],
  contact: [['assessment-guides', 'how-to-use-an-assessment-report-without-over-labelling-yourself']],
} as const satisfies Record<LibraryEntryKey, readonly (readonly [string, string])[]>;

const LIBRARY_ENTRY_COPY = {
  home: {
    eyebrow: 'Library',
    title: 'Explore the concepts behind Sonartra.',
    description:
      'Short explainers on behavioural assessments, work style, leadership style, conflict style and flow state.',
  },
  platform: {
    eyebrow: 'From the Library',
    title: 'Read the thinking behind structured behavioural insight.',
    description:
      'These explainers clarify how Sonartra treats assessment output as practical behavioural evidence, not a fixed label.',
  },
  signals: {
    eyebrow: 'From the Library',
    title: 'Understand the concepts before taking an assessment.',
    description:
      'Use these short guides to explore behavioural assessments, leadership style, work style, conflict style and flow state.',
  },
  pricing: {
    eyebrow: 'Before you start',
    title: 'Not sure where to start?',
    description:
      'Read how to use an assessment report carefully before treating the result as a fixed label.',
  },
  contact: {
    eyebrow: 'Useful preparation',
    title: 'Prepare the conversation with clearer assessment language.',
    description:
      'Use the Library guide to frame assessment results as prompts for reflection, conversation and action.',
  },
} as const satisfies Record<LibraryEntryKey, Pick<LibraryEntry, 'description' | 'eyebrow' | 'title'>>;

function getCategoryLabel(categoryKey: string): string {
  return categoryKey
    .split('-')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

export function getLibraryEntry(entryKey: LibraryEntryKey): LibraryEntry {
  const copy = LIBRARY_ENTRY_COPY[entryKey];
  const articles = LIBRARY_ENTRY_ARTICLES[entryKey].map(([category, slug]) => {
    const article = getLibraryArticle(category, slug);

    if (!article) {
      throw new Error(`Library entry article does not resolve: ${category}/${slug}`);
    }

    return {
      title: article.title,
      description: article.description,
      href: getLibraryArticleHref(article),
      categoryLabel: getCategoryLabel(article.category),
    };
  });

  return {
    ...copy,
    primaryHref: getLibraryIndexPath(),
    primaryLabel: 'Visit the Library',
    articles,
  };
}
