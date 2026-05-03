import Link from 'next/link';

import type { LibraryCtaViewModel } from '@/lib/library/library-browse-view-model';

export function LibraryCtaBand({ cta, eyebrow }: { cta: LibraryCtaViewModel; eyebrow: string }) {
  return (
    <section className="rounded-3xl border border-[#32D6B0]/20 bg-[#32D6B0]/[0.055] p-6 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
            Connect the concepts to practical assessment insight.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8D0C3]/82">
            {cta.supportingText}
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-[#32D6B0]/28 bg-[#32D6B0] px-5 py-3 text-sm font-semibold text-[#07100f] transition hover:bg-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
          href={cta.href}
        >
          {cta.label}
        </Link>
      </div>
    </section>
  );
}
