import type { MetadataRoute } from 'next';

import { getLibraryArticles, getLibraryCategories } from '@/lib/library/resolve-library-content';
import {
  getLibraryArticleUrl,
  getLibraryCategoryUrl,
  getLibraryIndexUrl,
} from '@/lib/library/library-routes';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getLibraryArticles();
  const latestArticleDate = articles
    .map((article) => article.updatedAt)
    .sort()
    .at(-1);

  const categoryEntries = getLibraryCategories().map((category) => ({
    url: getLibraryCategoryUrl(category.key),
    lastModified:
      articles
        .filter((article) => article.category === category.key)
        .map((article) => article.updatedAt)
        .sort()
        .at(-1) ?? latestArticleDate,
  }));

  const articleEntries = articles.map((article) => ({
    url: getLibraryArticleUrl(article),
    lastModified: article.updatedAt,
  }));

  return [
    {
      url: getLibraryIndexUrl(),
      lastModified: latestArticleDate,
    },
    ...categoryEntries,
    ...articleEntries,
  ];
}
