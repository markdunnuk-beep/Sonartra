import Link from 'next/link';

import type { LibraryArticleDetailViewModel } from '@/lib/library/library-article-view-model';

export function LibraryArticleHero({ article }: { article: LibraryArticleDetailViewModel }) {
  return (
    <header className="max-w-5xl pt-4">
      <Link
        className="mb-8 inline-flex text-sm font-semibold text-[#32D6B0] transition hover:text-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
        href={article.categoryHref}
      >
        Back to {article.categoryLabel}
      </Link>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
        {article.categoryLabel}
      </p>
      <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.03] text-[#F5F1EA] md:text-7xl">
        {article.title}
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-[#D8D0C3]/88">
        {article.description}
      </p>
      <p className="mt-5 max-w-3xl text-base leading-8 text-[#D8D0C3]/72">
        {article.heroSummary}
      </p>
      <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#D8D0C3]/62">
        <span>{article.readingTimeLabel}</span>
        <span>{article.publishedAtLabel}</span>
        <span>{article.updatedAtLabel}</span>
        {article.assessmentRelationshipLabel ? <span>{article.assessmentRelationshipLabel}</span> : null}
      </div>
    </header>
  );
}
