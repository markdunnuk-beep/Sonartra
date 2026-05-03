import {
  PublicPageCanvas,
  PublicPageCard,
  PublicPageCtaRow,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';

const libraryTopics = [
  {
    title: 'Behavioural signals',
    body: 'Plain-English explainers on the patterns Sonartra uses to describe how people work, lead, decide, and adapt.',
  },
  {
    title: 'Assessment practice',
    body: 'Guidance for using structured behavioural assessment in development conversations without turning results into labels.',
  },
  {
    title: 'Result interpretation',
    body: 'Short articles on reading evidence, comparing patterns, and moving from report language into practical next steps.',
  },
];

const startingPoints = [
  {
    title: 'Explore the assessment',
    body: 'Review Sonartra Signals as the first public assessment experience.',
  },
  {
    title: 'Understand the platform',
    body: 'See how the engine-first model keeps assessment output structured and consistent.',
  },
];

export default function LibraryPage() {
  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Library"
        intro="The Sonartra library will collect articles, explainers, and practical notes on behavioural intelligence. The first resources will focus on assessment interpretation, working patterns, and clearer development conversations."
        title="Articles and explainers for behavioural intelligence."
      >
        <PublicPageCtaRow
          actions={[
            { href: '/sonartra-signals', label: 'Explore assessments' },
            { href: '/platform', label: 'View platform', variant: 'secondary' },
          ]}
        />
      </PublicPageHero>

      <PublicPageSection eyebrow="Coming soon" title="A focused reference library, not a content feed.">
        <div className="grid gap-4 md:grid-cols-3">
          {libraryTopics.map((topic) => (
            <PublicPageCard body={topic.body} key={topic.title} title={topic.title} />
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="Start here" title="Use the current product pages as the live reference.">
        <div className="grid gap-4 md:grid-cols-2">
          {startingPoints.map((point) => (
            <PublicPageCard body={point.body} key={point.title} title={point.title} />
          ))}
        </div>
      </PublicPageSection>
    </PublicPageCanvas>
  );
}
