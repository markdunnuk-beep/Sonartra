import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  PublicPageCanvas,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';
import {
  getLibraryArticle,
  getLibraryCategory,
  getLibraryStaticParams,
  getRelatedLibraryArticles,
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

  const category = getLibraryCategory(article.category);
  const relatedArticles = getRelatedLibraryArticles(article);

  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow={category?.label ?? 'Library'}
        intro={article.heroSummary}
        title={article.title}
      />

      <div className="mt-10 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#D8D0C3]/68">
        <span>{article.readingTimeMinutes} min read</span>
        <span>Published {article.publishedAt}</span>
        <span>Updated {article.updatedAt}</span>
      </div>

      <div className="mt-10 space-y-10">
        {article.sections.map((section) => (
          <section className="border-t border-white/10 pt-8" id={section.id} key={section.id}>
            {section.eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
                {section.eyebrow}
              </p>
            ) : null}
            <h2 className="mt-3 text-2xl font-semibold text-[#F5F1EA]">{section.title}</h2>
            {section.summary ? (
              <p className="mt-3 text-base leading-7 text-[#D8D0C3]/86">{section.summary}</p>
            ) : null}
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#D8D0C3]/82">{section.body}</p>
          </section>
        ))}
      </div>

      <PublicPageSection eyebrow="Next step" title={article.cta.label}>
        <div className="rounded-2xl border border-[#32D6B0]/20 bg-[#32D6B0]/[0.055] p-5">
          {article.cta.supportingText ? (
            <p className="text-sm leading-7 text-[#D8D0C3]/82">{article.cta.supportingText}</p>
          ) : null}
          <Link
            className="mt-5 inline-flex rounded-full border border-[#32D6B0]/28 bg-[#32D6B0] px-5 py-3 text-sm font-semibold text-[#07100f] transition hover:bg-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
            href={article.cta.href}
          >
            {article.cta.label}
          </Link>
        </div>
      </PublicPageSection>

      {relatedArticles.length > 0 ? (
        <PublicPageSection eyebrow="Related" title="Continue reading.">
          <div className="grid gap-4 md:grid-cols-2">
            {relatedArticles.map((relatedArticle) => (
              <Link
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition hover:border-[#32D6B0]/28 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
                href={`/library/${relatedArticle.category}/${relatedArticle.slug}`}
                key={`${relatedArticle.category}/${relatedArticle.slug}`}
              >
                <h3 className="text-lg font-semibold text-[#F5F1EA]">{relatedArticle.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/78">
                  {relatedArticle.description}
                </p>
              </Link>
            ))}
          </div>
        </PublicPageSection>
      ) : null}
    </PublicPageCanvas>
  );
}
