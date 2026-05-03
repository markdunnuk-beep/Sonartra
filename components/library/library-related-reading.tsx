import { LibraryArticleCard } from './library-article-card';
import type { LibraryArticleCardViewModel } from '@/lib/library/library-browse-view-model';

export function LibraryRelatedReading({
  articles,
}: {
  articles: readonly LibraryArticleCardViewModel[];
}) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
        Related reading
      </p>
      <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
        Continue through connected concepts.
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {articles.map((article) => (
          <LibraryArticleCard article={article} key={article.href} />
        ))}
      </div>
    </section>
  );
}
