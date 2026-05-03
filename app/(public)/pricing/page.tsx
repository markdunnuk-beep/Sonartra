import { LibraryEntryBand } from '@/components/library/library-entry-band';
import {
  PublicPageCanvas,
  PublicPageCard,
  PublicPageCtaRow,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';
import { getLibraryEntry } from '@/lib/library/library-entry-links';

const pricingPrinciples = [
  {
    title: 'Pilot-first access',
    body: 'Early pricing is being shaped around focused pilots, assessment access, and the level of support needed to interpret results well.',
  },
  {
    title: 'Clear scope',
    body: 'Pricing should make the assessment context, expected output, and support model easy to understand before work begins.',
  },
  {
    title: 'No artificial tiers',
    body: 'Sonartra will avoid publishing decorative pricing packages before the access model is ready to stand behind.',
  },
];

const enquiryCards = [
  {
    title: 'Individual assessment access',
    body: 'Useful for early users who want to understand the Sonartra Signals experience and result structure.',
  },
  {
    title: 'Small pilot groups',
    body: 'Useful when a team, coach, or leader wants to test the assessment against a practical behavioural question.',
  },
];

export default function PricingPage() {
  const libraryEntry = getLibraryEntry('pricing');

  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Pricing"
        intro="Pricing is being shaped around early pilots and assessment access. Sonartra is not publishing fixed packages until the public access model is clear enough to be useful."
        title="Simple, transparent pricing is being prepared."
      >
        <PublicPageCtaRow
          actions={[
            { href: '/contact', label: 'Discuss access' },
            { href: '/sonartra-signals', label: 'Explore assessments', variant: 'secondary' },
          ]}
        />
      </PublicPageHero>

      <PublicPageSection eyebrow="Approach" title="Pricing should support trust before scale.">
        <div className="grid gap-4 md:grid-cols-3">
          {pricingPrinciples.map((principle) => (
            <PublicPageCard body={principle.body} key={principle.title} title={principle.title} />
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="Current fit" title="The best starting point is a focused access conversation.">
        <div className="grid gap-4 md:grid-cols-2">
          {enquiryCards.map((card) => (
            <PublicPageCard body={card.body} key={card.title} title={card.title} />
          ))}
        </div>
      </PublicPageSection>

      <LibraryEntryBand compact entry={libraryEntry} />
    </PublicPageCanvas>
  );
}
