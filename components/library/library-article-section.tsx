import type { LibraryArticleSectionViewModel } from '@/lib/library/library-article-view-model';

export function LibraryArticleSection({ section }: { section: LibraryArticleSectionViewModel }) {
  return (
    <section
      className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-sm md:p-8"
      id={section.id}
      tabIndex={-1}
    >
      {section.eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
          {section.eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#F5F1EA]">{section.title}</h2>
      {section.summary ? (
        <p className="mt-4 text-base leading-8 text-[#D8D0C3]/88">{section.summary}</p>
      ) : null}
      <p className="mt-5 text-base leading-8 text-[#D8D0C3]/78">{section.body}</p>
    </section>
  );
}
