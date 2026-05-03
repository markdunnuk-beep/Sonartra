import Link from 'next/link';

import type { LibraryCategoryCardViewModel } from '@/lib/library/library-browse-view-model';

export function LibraryCategoryCard({ category }: { category: LibraryCategoryCardViewModel }) {
  return (
    <Link
      aria-label={`Browse ${category.label}`}
      className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition hover:border-[#32D6B0]/28 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
      href={category.href}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-[#F5F1EA] transition group-hover:text-white">
          {category.label}
        </h3>
        <span className="rounded-full border border-[#32D6B0]/22 bg-[#32D6B0]/10 px-3 py-1 text-xs font-semibold text-[#32D6B0]">
          {category.articleCountLabel}
        </span>
      </div>
      <p className="mt-4 flex-1 text-sm leading-6 text-[#D8D0C3]/78">{category.description}</p>
    </Link>
  );
}
