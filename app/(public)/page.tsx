import {
  PublicPageCanvas,
  PublicPageCard,
  PublicPageCtaRow,
  PublicPageHero,
} from '@/components/public/public-page-primitives';

const homepageHighlights = [
  {
    title: 'Work patterns',
    body: 'Reveal the behaviours that shape momentum and friction.',
  },
  {
    title: 'Leadership signals',
    body: 'Understand how direction, judgement, and adaptation show up.',
  },
  {
    title: 'Applied development',
    body: 'Turn assessment evidence into practical next steps.',
  },
];

export default function HomePage() {
  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Behavioural intelligence platform"
        intro="Sonartra helps people and teams see how they lead, decide, adapt, and develop, with structured behavioural insight clear enough to act on."
        title="Understand the patterns shaping how people work."
      >
        <PublicPageCtaRow
          actions={[
            { href: '/get-started', label: 'Get Started' },
            { href: '/platform', label: 'Explore Platform', variant: 'secondary' },
          ]}
        />
      </PublicPageHero>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {homepageHighlights.map((highlight) => (
          <PublicPageCard body={highlight.body} key={highlight.title} title={highlight.title} />
        ))}
      </div>
    </PublicPageCanvas>
  );
}
