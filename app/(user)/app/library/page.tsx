import {
  EmptyState,
  LabelPill,
  PageFrame,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';

const libraryCategories = [
  {
    title: 'Flow State',
    description: 'Reading on focus, momentum, recovery, and the conditions that support sustained performance.',
  },
  {
    title: 'Leadership',
    description: 'Guides for understanding how operating patterns shape influence, direction, and trust.',
  },
  {
    title: 'Decision Making',
    description: 'Material on judgement, tradeoffs, pace, and the habits that make decisions clearer.',
  },
  {
    title: 'Communication',
    description: 'Practical reading on signal clarity, feedback, listening, and working style translation.',
  },
  {
    title: 'Work Energy',
    description: 'Notes on motivation, attention, stress load, and the contexts that change how work feels.',
  },
  {
    title: 'Conflict',
    description: 'Guides for recognising friction patterns and staying constructive under pressure.',
  },
  {
    title: 'Case Studies',
    description: 'Applied examples showing how Sonartra chapters can inform real workplace moments.',
  },
  {
    title: 'Guides',
    description: 'Concise reference material for revisiting chapter concepts after an assessment is complete.',
  },
] as const;

export default function UserLibraryPage() {
  return (
    <PageFrame>
      <SurfaceCard accent className="overflow-hidden p-0">
        <header className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.34fr)]">
          <div className="space-y-5 p-6 sm:p-8 lg:p-10">
            <p className="sonartra-page-eyebrow">Reading area</p>
            <div className="space-y-4">
              <h1 className="sonartra-page-title">Library</h1>
              <p className="max-w-3xl text-base leading-8 text-[#D8D0C3]/76">
                Guides, case studies, and reading material to help you go deeper into the
                Sonartra chapters.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/16 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <p className="sonartra-page-eyebrow">Content hub</p>
            <p className="mt-4 text-2xl font-semibold leading-tight text-[#F5F1EA]">
              Chapter context, practical guides, and applied reading in one calm place.
            </p>
          </div>
        </header>
      </SurfaceCard>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Library sections"
          title="Reading categories"
          description="Each category will collect practical material that supports the published Sonartra chapters without creating a new assessment result."
        />

        <div aria-label="Library reading categories" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {libraryCategories.map((category) => (
            <SurfaceCard
              key={category.title}
              className="flex min-h-full flex-col gap-5 p-5"
              data-library-category={category.title}
            >
              <div className="flex items-center justify-between gap-3">
                <LabelPill>Reading track</LabelPill>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-[#32D6B0]/70 shadow-[0_0_18px_rgba(50,214,176,0.2)]"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-[1.25rem] font-semibold leading-tight text-[#F5F1EA]">
                  {category.title}
                </h2>
                <p className="text-sm leading-7 text-[#D8D0C3]/70">{category.description}</p>
              </div>
              <p className="mt-auto border-t border-white/10 pt-4 text-xs font-medium uppercase tracking-[0.12em] text-[#9A9185]/76">
                Content coming soon
              </p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <EmptyState
        title="The Library is being built"
        description="This authenticated reading area will launch with chapter context, case material, and practical guides. It does not read, change, or reinterpret your assessment reports."
      />
    </PageFrame>
  );
}
