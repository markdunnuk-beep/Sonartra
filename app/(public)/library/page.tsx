import Link from 'next/link';

import {
  PublicPageCanvas,
  PublicPageCard,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';
import {
  getFeaturedLibraryArticles,
  getLibraryArticles,
  getLibraryCategories,
} from '@/lib/library/resolve-library-content';

export default function LibraryPage() {
  const categories = getLibraryCategories();
  const articles = getLibraryArticles();
  const featuredArticles = getFeaturedLibraryArticles();

  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Library"
        intro="Static, version-controlled articles and explainers for behavioural assessments, leadership style, work style, conflict style, flow state, team dynamics, and assessment concepts."
        title="Articles and explainers for behavioural intelligence."
      />

      <PublicPageSection eyebrow="Categories" title="Browse the Library by topic.">
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((category) => (
            <Link
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition hover:border-[#32D6B0]/28 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
              href={`/library/${category.key}`}
              key={category.key}
            >
              <h3 className="text-lg font-semibold text-[#F5F1EA]">{category.label}</h3>
              <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/78">{category.description}</p>
            </Link>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="Featured" title="Start with the foundational explainers.">
        <div className="grid gap-4 md:grid-cols-2">
          {featuredArticles.map((article) => (
            <Link
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition hover:border-[#32D6B0]/28 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
              href={`/library/${article.category}/${article.slug}`}
              key={`${article.category}/${article.slug}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
                {article.readingTimeMinutes} min read
              </p>
              <h3 className="mt-3 text-lg font-semibold text-[#F5F1EA]">{article.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/78">{article.description}</p>
            </Link>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="All articles" title="Version-controlled Library entries.">
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <PublicPageCard
              body={article.heroSummary}
              key={`${article.category}/${article.slug}`}
              title={article.title}
            />
          ))}
        </div>
      </PublicPageSection>
    </PublicPageCanvas>
  );
}
