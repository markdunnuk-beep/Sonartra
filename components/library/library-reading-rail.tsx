import type { LibraryReadingRailItem } from '@/lib/library/library-article-view-model';

export function LibraryReadingRail({ items }: { items: readonly LibraryReadingRailItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="In this article"
      className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm lg:sticky lg:top-28"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
        In this article
      </p>
      <ol className="mt-4 space-y-2">
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              className="group grid grid-cols-[1.8rem_1fr] gap-3 rounded-xl px-2 py-2 text-sm leading-6 text-[#D8D0C3]/78 transition hover:bg-white/[0.055] hover:text-[#F5F1EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
              href={item.href}
            >
              <span className="font-mono text-xs text-[#32D6B0]/75">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
