import { LibraryArticleCard } from '@/components/library/library-article-card';
import { LibraryCategoryCard } from '@/components/library/library-category-card';
import { LibraryCtaBand } from '@/components/library/library-cta-band';
import { LibraryHero } from '@/components/library/library-hero';
import { LibraryPageShell } from '@/components/library/library-page-shell';
import { getLibraryIndexViewModel } from '@/lib/library/library-browse-view-model';

export default function LibraryPage() {
  const viewModel = getLibraryIndexViewModel();

  return (
    <LibraryPageShell>
      <LibraryHero
        description="Clear explanations of the behavioural patterns, work styles and decision dynamics behind Sonartra assessments."
        eyebrow="Behavioural intelligence library"
        secondaryCopy="Use the Library to understand the concepts behind each assessment before you take it, or to explore a result in more depth afterwards."
        title="Sonartra Library"
      />

      <section aria-labelledby="library-featured-heading">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
              Featured
            </p>
            <h2
              className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl"
              id="library-featured-heading"
            >
              Start with the clearest foundations.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-[#D8D0C3]/72">
            These articles frame the assessment language before it becomes a report, profile, or
            development conversation.
          </p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {viewModel.featuredArticles.map((article) => (
            <LibraryArticleCard article={article} key={article.href} prominence="feature" />
          ))}
        </div>
      </section>

      <section aria-labelledby="library-categories-heading">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
              Categories
            </p>
            <h2
              className="mt-4 max-w-md text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl"
              id="library-categories-heading"
            >
              Browse by behavioural theme.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#D8D0C3]/72">
              Each category keeps the focus on practical interpretation rather than generic blog
              content.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {viewModel.categories.map((category) => (
              <LibraryCategoryCard category={category} key={category.href} />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="library-recommended-heading">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
              Recommended
            </p>
            <h2
              className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl"
              id="library-recommended-heading"
            >
              Continue into applied concepts.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-[#D8D0C3]/72">
            Short explainers for reading patterns with more care, context, and range.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {viewModel.recommendedArticles.map((article) => (
            <LibraryArticleCard article={article} key={article.href} />
          ))}
        </div>
      </section>

      <LibraryCtaBand cta={viewModel.cta} eyebrow="Assessment context" />
    </LibraryPageShell>
  );
}
