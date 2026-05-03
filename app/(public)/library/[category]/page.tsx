import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  PublicPageCanvas,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';
import {
  getArticlesByCategory,
  getLibraryCategory,
  getLibraryCategoryStaticParams,
} from '@/lib/library/resolve-library-content';

type LibraryCategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export function generateStaticParams() {
  return getLibraryCategoryStaticParams();
}

export default async function LibraryCategoryPage({ params }: LibraryCategoryPageProps) {
  const { category: categoryKey } = await params;
  const category = getLibraryCategory(categoryKey);

  if (!category) {
    notFound();
  }

  const articles = getArticlesByCategory(category.key);

  return (
    <PublicPageCanvas>
      <PublicPageHero eyebrow="Library category" intro={category.intro} title={category.label} />

      <PublicPageSection eyebrow="Articles" title="Read the available explainers in this topic.">
        {articles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {articles.map((article) => (
              <Link
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition hover:border-[#32D6B0]/28 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
                href={`/library/${article.category}/${article.slug}`}
                key={article.slug}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
                  {article.readingTimeMinutes} min read
                </p>
                <h2 className="mt-3 text-xl font-semibold text-[#F5F1EA]">{article.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/78">
                  {article.description}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-[#D8D0C3]/82">
            Articles for this category are being prepared.
          </p>
        )}
      </PublicPageSection>
    </PublicPageCanvas>
  );
}
