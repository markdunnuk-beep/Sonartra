import Link from 'next/link';

import type { LibraryArticleCardViewModel } from '@/lib/library/library-browse-view-model';

type LibraryArticleCardProps = {
  article: LibraryArticleCardViewModel;
  prominence?: 'feature' | 'standard';
};

export function LibraryArticleCard({ article, prominence = 'standard' }: LibraryArticleCardProps) {
  return (
    <Link
      aria-label={`Read ${article.title}`}
      className={[
        'group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition hover:border-[#32D6B0]/28 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]',
        prominence === 'feature' ? 'md:p-6' : '',
      ].join(' ')}
      href={article.href}
    >
      <div className="flex flex-wrap gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
        <span>{article.categoryLabel}</span>
        <span className="text-[#D8D0C3]/42">/</span>
        <span>{article.readingTimeLabel}</span>
      </div>
      <h3
        className={[
          'mt-4 font-semibold leading-tight text-[#F5F1EA] transition group-hover:text-white',
          prominence === 'feature' ? 'text-2xl' : 'text-xl',
        ].join(' ')}
      >
        {article.title}
      </h3>
      <p className="mt-4 flex-1 text-sm leading-6 text-[#D8D0C3]/78">{article.description}</p>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-[#D8D0C3]/52">
        {article.dateLabel}
      </p>
    </Link>
  );
}
