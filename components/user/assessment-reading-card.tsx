import Link from 'next/link';

import type { AssessmentReadingViewModel } from '@/lib/library/assessment-reading-links';

export function AssessmentReadingCard({
  reading,
}: Readonly<{
  reading: AssessmentReadingViewModel;
}>) {
  return (
    <aside className="border-white/8 border-t bg-white/[0.018] p-5 lg:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div>
          <p className="sonartra-page-eyebrow">{reading.heading}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">{reading.description}</p>
          <Link
            className="sonartra-focus-ring mt-4 inline-flex text-sm font-semibold text-[#32D6B0] transition hover:text-[#52E1C0]"
            href={reading.libraryHref}
          >
            Visit the Library
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {reading.links.map((link) => (
            <Link
              aria-label={`Read ${link.title}`}
              className="sonartra-focus-ring group rounded-[1rem] border border-white/10 bg-black/18 p-4 transition hover:border-[#32D6B0]/28 hover:bg-white/[0.045]"
              href={link.href}
              key={link.href}
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                {link.categoryLabel}
              </p>
              <h4 className="mt-2 text-sm font-semibold leading-5 text-white/90 transition group-hover:text-white">
                {link.title}
              </h4>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
