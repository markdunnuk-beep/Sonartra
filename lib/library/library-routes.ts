import type { LibraryArticle, LibraryCategoryKey } from './types';

export const SONARTRA_SITE_ORIGIN = 'https://www.sonartra.com';

export function getLibraryIndexPath(): string {
  return '/library';
}

export function getLibraryCategoryPath(categoryKey: LibraryCategoryKey | string): string {
  return `${getLibraryIndexPath()}/${categoryKey}`;
}

export function getLibraryArticlePath(article: Pick<LibraryArticle, 'category' | 'slug'>): string {
  return `${getLibraryCategoryPath(article.category)}/${article.slug}`;
}

export function getPublicUrl(path: string): string {
  return new URL(path, SONARTRA_SITE_ORIGIN).toString();
}

export function getLibraryIndexUrl(): string {
  return getPublicUrl(getLibraryIndexPath());
}

export function getLibraryCategoryUrl(categoryKey: LibraryCategoryKey | string): string {
  return getPublicUrl(getLibraryCategoryPath(categoryKey));
}

export function getLibraryArticleUrl(article: Pick<LibraryArticle, 'category' | 'slug'>): string {
  return getPublicUrl(getLibraryArticlePath(article));
}
