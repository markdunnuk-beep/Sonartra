import { notFound } from 'next/navigation';

import { LibraryArticleShell } from '@/components/library/library-article-shell';
import {
  getLibraryArticle,
  getLibraryStaticParams,
} from '@/lib/library/resolve-library-content';

type LibraryArticlePageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getLibraryStaticParams();
}

export default async function LibraryArticlePage({ params }: LibraryArticlePageProps) {
  const { category: categoryKey, slug } = await params;
  const article = getLibraryArticle(categoryKey, slug);

  if (!article) {
    notFound();
  }

  return <LibraryArticleShell article={article} />;
}
