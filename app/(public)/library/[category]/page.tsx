import { notFound } from 'next/navigation';

import { LibraryArticleCard } from '@/components/library/library-article-card';
import { LibraryCtaBand } from '@/components/library/library-cta-band';
import { LibraryHero } from '@/components/library/library-hero';
import { LibraryPageShell } from '@/components/library/library-page-shell';
import { getLibraryCategoryViewModel } from '@/lib/library/library-browse-view-model';
import { getLibraryCategoryStaticParams } from '@/lib/library/resolve-library-content';

type LibraryCategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export function generateStaticParams() {
  return getLibraryCategoryStaticParams();
}

export default async function LibraryCategoryPage({ params }: LibraryCategoryPageProps) {
  const { category: categoryKey } = await params;
  const viewModel = getLibraryCategoryViewModel(categoryKey);

  if (!viewModel) {
    notFound();
  }

  return (
    <LibraryPageShell>
      <LibraryHero
        backHref="/library"
        backLabel="Back to Library"
        description={viewModel.category.description}
        eyebrow="Library category"
        secondaryCopy={viewModel.category.intro}
        title={viewModel.category.label}
      />

      <section aria-labelledby="library-category-articles-heading">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
              Articles
            </p>
            <h2
              className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl"
              id="library-category-articles-heading"
            >
              Read the available explainers in this topic.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-[#D8D0C3]/72">
            {viewModel.articles.length === 1
              ? '1 article currently available.'
              : `${viewModel.articles.length} articles currently available.`}
          </p>
        </div>

        {viewModel.articles.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {viewModel.articles.map((article) => (
              <LibraryArticleCard article={article} key={article.href} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm leading-7 text-[#D8D0C3]/82">
            Articles for this category are being prepared.
          </p>
        )}
      </section>

      <LibraryCtaBand cta={viewModel.cta} eyebrow="Use this category" />
    </LibraryPageShell>
  );
}
