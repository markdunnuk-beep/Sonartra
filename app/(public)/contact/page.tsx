import {
  PublicPageCanvas,
  PublicPageCard,
  PublicPageCtaRow,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';

const contactOptions = [
  {
    title: 'Pilot enquiry',
    body: 'Share the context, the group you want to support, and the behavioural questions you want the assessment to help answer.',
  },
  {
    title: 'Product question',
    body: 'Ask about Sonartra Signals, the platform model, result structure, or how the assessment experience works.',
  },
  {
    title: 'Partnership conversation',
    body: 'Describe the audience, programme, or organisational setting where behavioural intelligence could be useful.',
  },
];

const enquiryGuidance = [
  {
    title: 'Who you are',
    body: 'Include your role, organisation context, and whether you are enquiring as an individual, coach, leader, or team operator.',
  },
  {
    title: 'What you want to explore',
    body: 'Describe the working patterns, development questions, or leadership conversations you want to make clearer.',
  },
  {
    title: 'Level of use',
    body: 'Clarify whether the enquiry is individual, team, programme, or organisation-level so the conversation can stay focused.',
  },
  {
    title: 'Timing or pilot context',
    body: 'Note any relevant timing, pilot size, assessment context, or constraints that would shape a first conversation.',
  },
];

const expectationSteps = [
  {
    title: 'Define the context',
    body: 'Start with the behavioural question and the people or team situation behind it.',
  },
  {
    title: 'Choose the right starting point',
    body: 'Decide whether Sonartra Signals, the platform model, or a focused pilot conversation is the right first step.',
  },
  {
    title: 'Review the intended output',
    body: 'Clarify what a useful result, report, or pilot learning should produce before assessment work begins.',
  },
];

const usefulLinks = [
  {
    title: 'Platform',
    body: 'Understand the engine-first model behind Sonartra.',
    href: '/platform',
  },
  {
    title: 'Sonartra Signals',
    body: 'Review the flagship behavioural assessment.',
    href: '/sonartra-signals',
  },
  {
    title: 'Case Studies',
    body: 'See pilot-ready applications and the future evidence standard.',
    href: '/case-studies',
  },
  {
    title: 'Brand',
    body: 'Read the public identity reference for Sonartra.',
    href: '/brand',
  },
];

export default function ContactPage() {
  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Contact"
        intro="Whether you are exploring Sonartra for individual development, leadership work, or a pilot with a small team, the best starting point is a clear conversation about what you want the assessment to help you understand."
        title="Start a focused conversation about behavioural intelligence."
      >
        <PublicPageCtaRow
          actions={[
            { href: '#enquiry-guidance', label: 'Prepare an enquiry' },
            { href: '/sonartra-signals', label: 'Explore Sonartra Signals', variant: 'secondary' },
          ]}
        />
      </PublicPageHero>

      <PublicPageSection eyebrow="Contact options" title="Useful starting points for a serious enquiry.">
        <div className="grid gap-4 md:grid-cols-3">
          {contactOptions.map((option) => (
            <PublicPageCard body={option.body} key={option.title} title={option.title} />
          ))}
        </div>
      </PublicPageSection>

      <section
        className="mt-16 scroll-mt-24 rounded-3xl border border-[#32D6B0]/20 bg-[#32D6B0]/[0.055] p-6 md:mt-20 md:p-8"
        id="enquiry-guidance"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
          Enquiry guidance
        </p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h2 className="max-w-xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
              Contact routing is being prepared. Use this structure for now.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#D8D0C3]/82">
              There is not yet a public contact form or confirmed public email address wired into
              this site. This page therefore provides static guidance only and does not pretend to
              submit an enquiry.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {enquiryGuidance.map((item) => (
              <PublicPageCard body={item.body} key={item.title} title={item.title} />
            ))}
          </div>
        </div>
      </section>

      <PublicPageSection eyebrow="What to expect" title="Keep the first conversation practical.">
        <div className="grid gap-4 md:grid-cols-3">
          {expectationSteps.map((step, index) => (
            <article
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm"
              key={step.title}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#32D6B0]/24 bg-[#32D6B0]/10 font-mono text-sm font-semibold text-[#32D6B0]">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#F5F1EA]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/78">{step.body}</p>
            </article>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="Useful links" title="Review the context before getting in touch.">
        <div className="grid gap-4 md:grid-cols-2">
          {usefulLinks.map((link) => (
            <a
              className="group rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition hover:border-[#32D6B0]/28 hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]"
              href={link.href}
              key={link.href}
            >
              <h3 className="text-lg font-semibold text-[#F5F1EA]">{link.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/78">{link.body}</p>
              <p className="mt-4 text-sm font-semibold text-[#32D6B0] transition group-hover:text-[#52E1C0]">
                View page
              </p>
            </a>
          ))}
        </div>
      </PublicPageSection>

      <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-sm md:mt-20 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
          Calm, structured first steps
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_auto] lg:items-end">
          <div>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
              Sonartra is built for practical assessment conversations.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8D0C3]/82">
              The platform uses structured assessments, deterministic outputs, and practical
              reporting for individuals and teams. It does not rely on improvised AI-generated
              result summaries.
            </p>
          </div>
          <PublicPageCtaRow
            actions={[
              { href: '/sonartra-signals', label: 'View Sonartra Signals' },
              { href: '/platform', label: 'Explore platform', variant: 'secondary' },
            ]}
          />
        </div>
      </section>
    </PublicPageCanvas>
  );
}
