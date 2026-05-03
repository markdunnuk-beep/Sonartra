import type { LibraryArticle, LibraryArticleSection } from './types';
import { mapLibraryArticleCard, type LibraryArticleCardViewModel } from './library-browse-view-model';
import { getLibraryCategoryPath } from './library-routes';
import { getLibraryCategory, getRelatedLibraryArticles } from './resolve-library-content';

export type LibraryReadingRailItem = {
  id: string;
  href: string;
  label: string;
  eyebrow?: string;
};

export type LibraryArticleSectionViewModel = LibraryArticleSection & {
  href: string;
};

export type LibraryKeyTakeaway = {
  id: string;
  title: string;
  body: string;
};

export type LibraryArticleDetailViewModel = {
  categoryHref: string;
  categoryLabel: string;
  title: string;
  description: string;
  heroSummary: string;
  readingTimeLabel: string;
  publishedAtLabel: string;
  updatedAtLabel: string;
  assessmentRelationshipLabel: string | null;
  sections: readonly LibraryArticleSectionViewModel[];
  railItems: readonly LibraryReadingRailItem[];
  keyTakeaways: readonly LibraryKeyTakeaway[];
  cta: {
    label: string;
    href: string;
    supportingText?: string;
  };
  relatedArticles: readonly LibraryArticleCardViewModel[];
};

function toSectionHref(sectionId: string): string {
  return `#${sectionId}`;
}

function buildKeyTakeaway(section: LibraryArticleSection): LibraryKeyTakeaway {
  return {
    id: section.id,
    title: section.title,
    body: section.summary ?? section.body,
  };
}

export function getLibraryArticleDetailViewModel(
  article: LibraryArticle,
): LibraryArticleDetailViewModel {
  const category = getLibraryCategory(article.category);
  const sections = article.sections.map((section) => ({
    ...section,
    href: toSectionHref(section.id),
  }));

  return {
    categoryHref: getLibraryCategoryPath(article.category),
    categoryLabel: category?.label ?? 'Library',
    title: article.title,
    description: article.description,
    heroSummary: article.heroSummary,
    readingTimeLabel: `${article.readingTimeMinutes} min read`,
    publishedAtLabel: `Published ${article.publishedAt}`,
    updatedAtLabel: `Updated ${article.updatedAt}`,
    assessmentRelationshipLabel: article.assessmentKey
      ? `Connected to ${article.assessmentKey.toUpperCase()} assessment language`
      : null,
    sections,
    railItems: sections.map((section) => ({
      id: section.id,
      href: section.href,
      label: section.title,
      eyebrow: section.eyebrow,
    })),
    keyTakeaways: article.sections.map(buildKeyTakeaway),
    cta: article.cta,
    relatedArticles: getRelatedLibraryArticles(article).map(mapLibraryArticleCard),
  };
}
