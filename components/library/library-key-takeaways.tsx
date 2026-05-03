import type { LibraryKeyTakeaway } from '@/lib/library/library-article-view-model';

export function LibraryKeyTakeaways({ takeaways }: { takeaways: readonly LibraryKeyTakeaway[] }) {
  if (takeaways.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-[#32D6B0]/20 bg-[#32D6B0]/[0.055] p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
        Key takeaways
      </p>
      <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
        What to carry forward.
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {takeaways.map((takeaway) => (
          <article
            className="rounded-2xl border border-white/10 bg-[#080A0D]/45 p-5"
            key={takeaway.id}
          >
            <h3 className="text-lg font-semibold text-[#F5F1EA]">{takeaway.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/78">{takeaway.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
