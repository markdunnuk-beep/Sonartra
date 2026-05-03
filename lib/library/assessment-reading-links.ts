import { getLibraryArticleHref } from './library-browse-view-model';
import { getLibraryArticle, getLibraryCategory } from './resolve-library-content';
import type { LibraryArticle } from './types';

export type AssessmentReadingLink = {
  title: string;
  description: string;
  href: string;
  categoryLabel: string;
};

export type AssessmentReadingViewModel = {
  heading: string;
  description: string;
  links: readonly AssessmentReadingLink[];
  libraryHref: string;
};

export type AssessmentReadingStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed_processing'
  | 'results_ready'
  | 'ready'
  | 'error';

type ArticleReference = readonly [category: string, slug: string];

const DEFAULT_READING: readonly ArticleReference[] = [
  ['behavioural-assessments', 'what-is-a-behavioural-assessment'],
  ['behavioural-assessments', 'behavioural-assessment-vs-personality-test'],
  ['assessment-guides', 'how-to-use-an-assessment-report-without-over-labelling-yourself'],
];

const SIGNALS_READING: readonly ArticleReference[] = [
  ['behavioural-assessments', 'what-is-a-behavioural-assessment'],
  ['work-style', 'what-is-work-style'],
  ['assessment-guides', 'how-to-use-an-assessment-report-without-over-labelling-yourself'],
];

const LEADERSHIP_READING: readonly ArticleReference[] = [
  ['behavioural-assessments', 'what-is-a-behavioural-assessment'],
  ['leadership-style', 'what-is-leadership-style'],
  ['assessment-guides', 'how-to-use-an-assessment-report-without-over-labelling-yourself'],
];

const ASSESSMENT_READING_BY_KEY = new Map<string, readonly ArticleReference[]>([
  ['wplp80', SIGNALS_READING],
  ['signals', SIGNALS_READING],
  ['sonartra-signals', SIGNALS_READING],
  ['leadership', LEADERSHIP_READING],
]);

function resolveArticle(reference: ArticleReference): LibraryArticle {
  const article = getLibraryArticle(reference[0], reference[1]);

  if (!article) {
    throw new Error(`Assessment reading article does not resolve: ${reference[0]}/${reference[1]}`);
  }

  return article;
}

function mapReadingLink(article: LibraryArticle): AssessmentReadingLink {
  return {
    title: article.title,
    description: article.description,
    href: getLibraryArticleHref(article),
    categoryLabel: getLibraryCategory(article.category)?.label ?? 'Library',
  };
}

export function getDefaultAssessmentReadingLinks(): readonly AssessmentReadingLink[] {
  return DEFAULT_READING.map(resolveArticle).map(mapReadingLink);
}

export function getAssessmentReadingLinks(assessmentKey: string): readonly AssessmentReadingLink[] {
  const references = ASSESSMENT_READING_BY_KEY.get(assessmentKey) ?? DEFAULT_READING;

  return references.map(resolveArticle).map(mapReadingLink);
}

export function resolveAssessmentReadingViewModel(
  assessmentKey: string,
  status: AssessmentReadingStatus,
): AssessmentReadingViewModel | null {
  if (status !== 'not_started') {
    return null;
  }

  return {
    heading: 'Before you start',
    description: 'Read these short guides to understand what this assessment measures.',
    links: getAssessmentReadingLinks(assessmentKey),
    libraryHref: '/library',
  };
}
