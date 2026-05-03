import type { LibraryArticle, LibraryCategory, LibraryCategoryKey } from './types';
import {
  getArticlesByCategory,
  getFeaturedLibraryArticles,
  getLibraryArticles,
  getLibraryCategories,
  getLibraryCategory,
} from './resolve-library-content';

export type LibraryArticleCardViewModel = {
  href: string;
  categoryLabel: string;
  title: string;
  description: string;
  readingTimeLabel: string;
  dateLabel: string;
};

export type LibraryCategoryCardViewModel = {
  href: string;
  label: string;
  description: string;
  articleCount: number;
  articleCountLabel: string;
};

export type LibraryCtaViewModel = {
  label: string;
  href: string;
  supportingText: string;
};

export type LibraryIndexViewModel = {
  categories: readonly LibraryCategoryCardViewModel[];
  featuredArticles: readonly LibraryArticleCardViewModel[];
  recommendedArticles: readonly LibraryArticleCardViewModel[];
  cta: LibraryCtaViewModel;
};

export type LibraryCategoryViewModel = {
  category: LibraryCategory;
  articles: readonly LibraryArticleCardViewModel[];
  cta: LibraryCtaViewModel;
};

function getCategoryLabel(categoryKey: LibraryCategoryKey): string {
  return getLibraryCategory(categoryKey)?.label ?? 'Library';
}

function formatArticleCount(count: number): string {
  return count === 1 ? '1 article' : `${count} articles`;
}

function formatDateLabel(article: LibraryArticle): string {
  return `Updated ${article.updatedAt}`;
}

export function getLibraryArticleHref(article: LibraryArticle): string {
  return `/library/${article.category}/${article.slug}`;
}

export function mapLibraryArticleCard(article: LibraryArticle): LibraryArticleCardViewModel {
  return {
    href: getLibraryArticleHref(article),
    categoryLabel: getCategoryLabel(article.category),
    title: article.title,
    description: article.description,
    readingTimeLabel: `${article.readingTimeMinutes} min read`,
    dateLabel: formatDateLabel(article),
  };
}

export function mapLibraryCategoryCard(category: LibraryCategory): LibraryCategoryCardViewModel {
  const articleCount = getArticlesByCategory(category.key).length;

  return {
    href: `/library/${category.key}`,
    label: category.label,
    description: category.description,
    articleCount,
    articleCountLabel: formatArticleCount(articleCount),
  };
}

export function getLibraryCategoryCta(category: LibraryCategory): LibraryCtaViewModel {
  if (category.assessmentKey) {
    return {
      label: 'Explore Sonartra Signals',
      href: '/sonartra-signals',
      supportingText:
        'Use the assessment experience to connect these concepts with a structured behavioural profile.',
    };
  }

  return {
    label: 'Discuss practical use',
    href: '/contact',
    supportingText:
      'Use this topic as a starting point for a focused behavioural intelligence conversation.',
  };
}

export function getLibraryIndexViewModel(): LibraryIndexViewModel {
  const categories = getLibraryCategories();
  const featuredArticles = getFeaturedLibraryArticles();
  const allArticles = getLibraryArticles();
  const recommendedArticles = allArticles.slice(0, 4);

  return {
    categories: categories.map(mapLibraryCategoryCard),
    featuredArticles: featuredArticles.slice(0, 3).map(mapLibraryArticleCard),
    recommendedArticles: recommendedArticles.map(mapLibraryArticleCard),
    cta: {
      label: 'Explore assessments',
      href: '/sonartra-signals',
      supportingText:
        'Start with Sonartra Signals, then use the Library to interpret behavioural concepts with more range.',
    },
  };
}

export function getLibraryCategoryViewModel(categoryKey: string): LibraryCategoryViewModel | null {
  const category = getLibraryCategory(categoryKey);

  if (!category) {
    return null;
  }

  return {
    category,
    articles: getArticlesByCategory(category.key).map(mapLibraryArticleCard),
    cta: getLibraryCategoryCta(category),
  };
}
