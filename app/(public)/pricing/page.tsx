import Link from 'next/link';

import { PublicPageCanvas, PublicPageHero, PublicPageSection } from '@/components/public/public-page-primitives';

type PricingPlan = {
  title: string;
  badge?: string;
  price: string;
  qualifier: string;
  description: string;
  benefits: string[];
  ctaLabel: string;
  href: string;
  featured?: boolean;
};

const pricingPlans: PricingPlan[] = [
  {
    title: 'Free Preview',
    price: '£0',
    qualifier: 'No payment required',
    description: 'Complete one assessment and receive a focused preview of your result.',
    benefits: [
      'Complete one assessment',
      'Receive a focused result preview',
      'See your top signal',
      'View your core pattern summary',
      'Explore the Sonartra experience',
    ],
    ctaLabel: 'Get Started',
    href: '/get-started',
  },
  {
    title: 'Individual Access',
    badge: 'Most Popular',
    price: '£49.99',
    qualifier: 'Full individual access',
    description: 'Full access to Sonartra’s premium insight library.',
    benefits: [
      'Full access to 10+ premium behavioural insight reports',
      'Complete access to the individual assessment library',
      'Comprehensive individual results',
      'Strengths, watchouts and development guidance',
      'PDF downloads',
      'Result sharing',
      'Personal result history',
      'New individual insight releases included',
    ],
    ctaLabel: 'Get Individual Access',
    href: '/get-started',
    featured: true,
  },
  {
    title: 'Enterprise Access',
    price: 'Volume pricing',
    qualifier: 'For teams and organisations',
    description:
      'Organisation-level access to Sonartra’s individual insight library, with volume-based pricing.',
    benefits: [
      'Access for teams and organisations',
      'Volume-based per-user pricing',
      'Discounted access at scale',
      'Full individual access for each user',
      'Rollout and onboarding discussion',
      'Contact-led scoping for organisation needs',
    ],
    ctaLabel: 'Discuss Enterprise Access',
    href: '/contact',
  },
];

function BenefitIcon({ featured = false }: { featured?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={[
        'mt-0.5 h-4 w-4 shrink-0',
        featured ? 'text-[#7DE8CD]' : 'text-[#D8D0C3]/70',
      ].join(' ')}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M3 8.25 6.25 11.5 13 4.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Pricing"
        intro="Start with a focused preview, unlock full access to Sonartra’s premium insight library, or speak to us about organisation access with volume-based pricing."
        title="Start using the Sonartra behavioural intelligence platform today."
      >
        <p className="max-w-2xl text-sm leading-6 text-[#D8D0C3]/73">
          Built for individuals first, with a clear path for organisations purchasing access at scale.
        </p>
      </PublicPageHero>

      <section className="mt-14 md:mt-16" aria-label="Pricing tiers">
        <div className="grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              className={[
                'flex h-full flex-col rounded-2xl border bg-white/[0.035] p-6 backdrop-blur-sm md:p-7',
                plan.featured
                  ? 'border-[#32D6B0]/45 bg-[linear-gradient(180deg,rgba(50,214,176,0.12),rgba(255,255,255,0.03)_26%,rgba(255,255,255,0.035))] shadow-[0_0_0_1px_rgba(50,214,176,0.26),0_16px_38px_rgba(8,10,13,0.45)]'
                  : 'border-white/12',
              ].join(' ')}
              key={plan.title}
            >
              <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h2 className="text-2xl font-semibold text-[#F5F1EA]">{plan.title}</h2>
                {plan.badge ? (
                  <span className="inline-flex items-center rounded-full border border-[#7DE8CD]/34 bg-[#7DE8CD]/14 px-3 py-1 text-xs font-medium uppercase leading-none tracking-[0.11em] text-[#C6F6EA]">
                    {plan.badge}
                  </span>
                ) : null}
              </div>

              <div className="mt-6 min-h-20">
                <p className="text-4xl font-semibold tracking-tight text-[#F5F1EA]">{plan.price}</p>
                <p className="mt-2 text-sm text-[#D8D0C3]/78">{plan.qualifier}</p>
              </div>

              <p className="mt-5 text-sm leading-6 text-[#D8D0C3]/84">{plan.description}</p>

              <ul className="mt-6 space-y-3 text-sm leading-6 text-[#E7DED2]/88">
                {plan.benefits.map((benefit) => (
                  <li className="flex items-start gap-2.5" key={benefit}>
                    <BenefitIcon featured={plan.featured} />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 pt-2">
                <Link
                  className={[
                    'inline-flex w-full items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]',
                    plan.featured
                      ? 'border-[#32D6B0]/28 bg-[#32D6B0] text-[#07100f] hover:bg-[#52E1C0] focus-visible:ring-[#32D6B0]/45'
                      : 'border-white/14 bg-white/[0.04] text-[#F5F1EA] hover:border-white/24 hover:bg-white/[0.08] focus-visible:ring-white/35',
                  ].join(' ')}
                  href={plan.href}
                >
                  {plan.ctaLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PublicPageSection eyebrow="Premium insight library" title="Unlock your full potential with Sonartra.">
        <div className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-8 md:p-6">
          <div>
            <p className="max-w-xl text-sm leading-6 text-[#D8D0C3]/82">
              Explore the patterns that shape how you lead, focus, decide and respond under pressure.
            </p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              'What type of leader are you?',
              'Where do you find your best flow state?',
              'What kind of culture helps you perform at your best?',
              'How do you respond to stress, conflict and pressure?',
              'What motivates your best work?',
            ].map((prompt) => (
              <p
                key={prompt}
                className="rounded-xl border border-white/14 bg-white/[0.04] px-3.5 py-2.5 text-sm leading-5 text-[#E7DED2]/90 sm:last:col-span-2"
              >
                {prompt}
              </p>
            ))}
          </div>
        </div>
      </PublicPageSection>

      <section className="mt-2" aria-label="Get started with Sonartra">
        <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h2 className="text-xl font-semibold text-[#F5F1EA]">Ready to explore Sonartra?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D8D0C3]/82">
              Start with a focused preview or speak to us about organisation access.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link
              href="/get-started"
              aria-label="Get started with Sonartra"
              className="inline-flex items-center justify-center rounded-full border border-[#32D6B0]/28 bg-[#32D6B0] px-5 py-3 text-sm font-semibold text-[#07100f] transition hover:bg-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
            >
              Get Started
            </Link>
            <Link
              href="/contact"
              aria-label="Discuss Sonartra enterprise access"
              className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-[#F5F1EA] transition hover:border-white/24 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
            >
              Discuss Enterprise Access
            </Link>
          </div>
        </div>
      </section>
    </PublicPageCanvas>
  );
}
