import Link from 'next/link';

import type { LibraryEntry } from '@/lib/library/library-entry-links';

type LibraryEntryBandProps = {
  entry: LibraryEntry;
  compact?: boolean;
};

export function LibraryEntryBand({ compact = false, entry }: LibraryEntryBandProps) {
  return (
    <section
      className={[
        'rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-sm md:p-8',
        compact ? 'mt-10' : 'mt-16 md:mt-20',
      ].join(' ')}
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
            {entry.eyebrow}
          </p>
          <h2
            className={[
              'mt-4 max-w-xl font-semibold leading-tight text-[#F5F1EA]',
              compact ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl',
            ].join(' ')}
          >
            {entry.title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#D8D0C3]/78">
            {entry.description}
          </p>
          <Link
            className="mt-6 inline-flex text-sm font-semibold text-[#32D6B0] transition hover:text-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
            href={entry.primaryHref}
          >
            {entry.primaryLabel}
          </Link>
        </div>
        <div className="grid gap-3">
          {entry.articles.map((article) => (
            <Link
              aria-label={`Read ${article.title}`}
              className="group rounded-2xl border border-white/10 bg-[#080A0D]/35 p-4 transition hover:border-[#32D6B0]/28 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
              href={article.href}
              key={article.href}
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
                {article.categoryLabel}
              </p>
              <h3 className="mt-2 text-base font-semibold text-[#F5F1EA] transition group-hover:text-white">
                {article.title}
              </h3>
              {compact ? null : (
                <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/72">{article.description}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
