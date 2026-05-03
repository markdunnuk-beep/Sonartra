import type { LibraryArticle, LibraryCategoryKey } from './types';
import { getPublicUrl } from '@/lib/public/public-routes';

export function getLibraryIndexPath(): string {
  return '/library';
}

export function getLibraryCategoryPath(categoryKey: LibraryCategoryKey | string): string {
  return `${getLibraryIndexPath()}/${categoryKey}`;
}

export function getLibraryArticlePath(article: Pick<LibraryArticle, 'category' | 'slug'>): string {
  return `${getLibraryCategoryPath(article.category)}/${article.slug}`;
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
