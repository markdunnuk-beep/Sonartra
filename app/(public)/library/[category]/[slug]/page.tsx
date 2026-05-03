import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LibraryArticleShell } from '@/components/library/library-article-shell';
import {
  getLibraryArticle,
  getLibraryStaticParams,
} from '@/lib/library/resolve-library-content';
import { getLibraryArticleMetadataByPath } from '@/lib/library/library-seo';

type LibraryArticlePageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getLibraryStaticParams();
}

export async function generateMetadata({ params }: LibraryArticlePageProps): Promise<Metadata> {
  const { category: categoryKey, slug } = await params;
  const metadata = getLibraryArticleMetadataByPath(categoryKey, slug);

  if (!metadata) {
    notFound();
  }

  return metadata;
}

export default async function LibraryArticlePage({ params }: LibraryArticlePageProps) {
  const { category: categoryKey, slug } = await params;
  const article = getLibraryArticle(categoryKey, slug);

  if (!article) {
    notFound();
  }

  return <LibraryArticleShell article={article} />;
}
