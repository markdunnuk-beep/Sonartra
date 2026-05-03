import type { Metadata } from 'next';

import {
  getLibraryArticleUrl,
  getLibraryCategoryUrl,
  getLibraryIndexUrl,
} from './library-routes';
import { getLibraryArticle, getLibraryCategory } from './resolve-library-content';
import type { LibraryArticle, LibraryCategory } from './types';
import { getPublicUrl } from '@/lib/public/public-routes';

const SITE_NAME = 'Sonartra';
const LIBRARY_INDEX_TITLE = 'Sonartra Library';
const LIBRARY_INDEX_DESCRIPTION =
  'Clear explanations of the behavioural patterns, work styles and decision dynamics behind Sonartra assessments.';

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonLdValue[]
  | { readonly [key: string]: JsonLdValue };

export type JsonLdObject = {
  readonly [key: string]: JsonLdValue;
};

function buildMetadata(params: {
  title: string;
  description: string;
  canonicalUrl: string;
  openGraphType?: 'website' | 'article';
  publishedAt?: string;
  updatedAt?: string;
  section?: string;
}): Metadata {
  const title = params.title === SITE_NAME ? params.title : `${params.title} | ${SITE_NAME}`;

  return {
    title,
    description: params.description,
    alternates: {
      canonical: params.canonicalUrl,
    },
    openGraph: {
      title,
      description: params.description,
      url: params.canonicalUrl,
      siteName: SITE_NAME,
      type: params.openGraphType ?? 'website',
      publishedTime: params.publishedAt,
      modifiedTime: params.updatedAt,
      section: params.section,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: params.description,
    },
  };
}

export function getLibraryIndexMetadata(): Metadata {
  return buildMetadata({
    title: LIBRARY_INDEX_TITLE,
    description: LIBRARY_INDEX_DESCRIPTION,
    canonicalUrl: getLibraryIndexUrl(),
  });
}

export function getLibraryCategoryMetadata(category: LibraryCategory): Metadata {
  return buildMetadata({
    title: `${category.label} Library`,
    description: category.intro || category.description,
    canonicalUrl: getLibraryCategoryUrl(category.key),
  });
}

export function getLibraryCategoryMetadataByKey(categoryKey: string): Metadata | null {
  const category = getLibraryCategory(categoryKey);

  if (!category) {
    return null;
  }

  return getLibraryCategoryMetadata(category);
}

export function getLibraryArticleMetadata(article: LibraryArticle, category: LibraryCategory): Metadata {
  return buildMetadata({
    title: article.title,
    description: article.description,
    canonicalUrl: getLibraryArticleUrl(article),
    openGraphType: 'article',
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    section: category.label,
  });
}

export function getLibraryArticleMetadataByPath(categoryKey: string, slug: string): Metadata | null {
  const article = getLibraryArticle(categoryKey, slug);

  if (!article) {
    return null;
  }

  const category = getLibraryCategory(article.category);

  if (!category) {
    return null;
  }

  return getLibraryArticleMetadata(article, category);
}

export function getLibraryArticleJsonLd(
  article: LibraryArticle,
  category: LibraryCategory,
): JsonLdObject {
  const articleUrl = getLibraryArticleUrl(article);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getPublicUrl('/'),
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getPublicUrl('/'),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    articleSection: category.label,
  };
}
