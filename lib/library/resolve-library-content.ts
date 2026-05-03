import { LIBRARY_ARTICLES } from './articles';
import { LIBRARY_CATEGORIES } from './categories';
import type {
  LibraryArticle,
  LibraryArticleStaticParam,
  LibraryCategory,
  LibraryCategoryKey,
  LibraryCategoryStaticParam,
} from './types';

function compareByOrder(left: LibraryCategory, right: LibraryCategory): number {
  return left.order - right.order || left.label.localeCompare(right.label);
}

function compareArticles(left: LibraryArticle, right: LibraryArticle): number {
  return (
    left.category.localeCompare(right.category) ||
    left.title.localeCompare(right.title) ||
    left.slug.localeCompare(right.slug)
  );
}

function isLibraryCategoryKey(value: string): value is LibraryCategoryKey {
  return LIBRARY_CATEGORIES.some((category) => category.key === value);
}

function resolveArticleBySlug(slug: string): LibraryArticle | null {
  return LIBRARY_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function getLibraryCategories(): readonly LibraryCategory[] {
  return [...LIBRARY_CATEGORIES].sort(compareByOrder);
}

export function getLibraryCategory(categoryKey: string): LibraryCategory | null {
  if (!isLibraryCategoryKey(categoryKey)) {
    return null;
  }

  return LIBRARY_CATEGORIES.find((category) => category.key === categoryKey) ?? null;
}

export function getLibraryArticles(): readonly LibraryArticle[] {
  return [...LIBRARY_ARTICLES].sort(compareArticles);
}

export function getArticlesByCategory(categoryKey: string): readonly LibraryArticle[] {
  if (!isLibraryCategoryKey(categoryKey)) {
    return [];
  }

  return LIBRARY_ARTICLES.filter((article) => article.category === categoryKey).sort(compareArticles);
}

export function getLibraryArticle(categoryKey: string, slug: string): LibraryArticle | null {
  if (!isLibraryCategoryKey(categoryKey)) {
    return null;
  }

  return (
    LIBRARY_ARTICLES.find((article) => article.category === categoryKey && article.slug === slug) ??
    null
  );
}

export function getFeaturedLibraryArticles(): readonly LibraryArticle[] {
  return LIBRARY_ARTICLES.filter((article) => article.featured).sort((left, right) => {
    return (
      (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.featuredOrder ?? Number.MAX_SAFE_INTEGER) || compareArticles(left, right)
    );
  });
}

export function getRelatedLibraryArticles(article: LibraryArticle): readonly LibraryArticle[] {
  return article.relatedArticleSlugs
    .map(resolveArticleBySlug)
    .filter((relatedArticle): relatedArticle is LibraryArticle => relatedArticle !== null);
}

export function getLibraryStaticParams(): LibraryArticleStaticParam[] {
  return LIBRARY_ARTICLES.map((article) => ({
    category: article.category,
    slug: article.slug,
  }));
}

export function getLibraryCategoryStaticParams(): LibraryCategoryStaticParam[] {
  return LIBRARY_CATEGORIES.map((category) => ({
    category: category.key,
  }));
}
