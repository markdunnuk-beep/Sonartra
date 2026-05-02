import {
  PublicPageCanvas,
  PublicPageCard,
  PublicPageCtaRow,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';

const signalCards = [
  {
    title: 'Work patterns',
    body: 'Signals describe recurring behaviours in how people move from information to action.',
  },
  {
    title: 'Leadership context',
    body: 'They help teams discuss direction, decision-making, adaptation, and development with more precision.',
  },
  {
    title: 'Applied insight',
    body: 'A signal should make a behavioural pattern clearer, not reduce a person to a fixed label.',
  },
];

export default function SignalsPage() {
  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Sonartra Signals"
        intro="Signals are Sonartra's behavioural language for describing how people work, lead, decide, adapt, and develop."
        title="A clearer language for behavioural patterns."
      >
        <PublicPageCtaRow
          actions={[
            { href: '/get-started', label: 'Get Started' },
            { href: '/platform', label: 'Explore Platform', variant: 'secondary' },
          ]}
        />
      </PublicPageHero>

      <PublicPageSection
        eyebrow="Signal model"
        title="Designed to support interpretation, not decoration."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {signalCards.map((card) => (
            <PublicPageCard body={card.body} key={card.title} title={card.title} />
          ))}
        </div>
      </PublicPageSection>
    </PublicPageCanvas>
  );
}
