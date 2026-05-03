import { LibraryArticleHero } from './library-article-hero';
import { LibraryArticleSection } from './library-article-section';
import { LibraryInsightCard } from './library-insight-card';
import { LibraryKeyTakeaways } from './library-key-takeaways';
import { LibraryPageShell } from './library-page-shell';
import { LibraryReadingRail } from './library-reading-rail';
import { LibraryRelatedReading } from './library-related-reading';
import type { LibraryArticle } from '@/lib/library/types';
import { getLibraryArticleDetailViewModel } from '@/lib/library/library-article-view-model';

export function LibraryArticleShell({ article }: { article: LibraryArticle }) {
  const viewModel = getLibraryArticleDetailViewModel(article);

  return (
    <LibraryPageShell>
      <LibraryArticleHero article={viewModel} />

      <div className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:items-start">
        <aside className="lg:order-1">
          <LibraryReadingRail items={viewModel.railItems} />
        </aside>
        <div className="space-y-8 lg:order-2">
          {viewModel.sections.map((section) => (
            <LibraryArticleSection key={section.id} section={section} />
          ))}
        </div>
      </div>

      <LibraryKeyTakeaways takeaways={viewModel.keyTakeaways} />
      <LibraryInsightCard cta={viewModel.cta} />
      <LibraryRelatedReading articles={viewModel.relatedArticles} />
    </LibraryPageShell>
  );
}
