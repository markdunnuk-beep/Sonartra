import type { MetadataRoute } from 'next';

import { getLibraryArticles, getLibraryCategories } from '@/lib/library/resolve-library-content';
import {
  getLibraryArticleUrl,
  getLibraryCategoryUrl,
} from '@/lib/library/library-routes';
import { getIndexablePublicRoutes, getPublicUrl } from '@/lib/public/public-routes';

function uniqueByUrl(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    if (seen.has(entry.url)) {
      return false;
    }

    seen.add(entry.url);
    return true;
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getLibraryArticles();
  const latestArticleDate = articles
    .map((article) => article.updatedAt)
    .sort()
    .at(-1);

  const publicEntries = getIndexablePublicRoutes().map((route) => ({
    url: getPublicUrl(route.path),
    lastModified: route.path === '/library' ? latestArticleDate ?? route.lastModified : route.lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const categoryEntries = getLibraryCategories().map((category) => ({
    url: getLibraryCategoryUrl(category.key),
    lastModified:
      articles
        .filter((article) => article.category === category.key)
        .map((article) => article.updatedAt)
        .sort()
        .at(-1) ?? latestArticleDate,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const articleEntries = articles.map((article) => ({
    url: getLibraryArticleUrl(article),
    lastModified: article.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return uniqueByUrl([...publicEntries, ...categoryEntries, ...articleEntries]);
}
