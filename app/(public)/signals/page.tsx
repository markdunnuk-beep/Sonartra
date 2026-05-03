import {
  PublicPageCanvas,
  PublicPageCard,
  PublicPageCtaRow,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';

const domainCards = [
  {
    title: 'Behaviour Style',
    body: 'How someone tends to approach work, pace, structure, change, and day-to-day execution.',
  },
  {
    title: 'Motivators',
    body: 'The conditions and outcomes that are most likely to create energy, focus, and sustained effort.',
  },
  {
    title: 'Leadership',
    body: 'How direction, judgement, responsibility, and influence tend to show up in working behaviour.',
  },
  {
    title: 'Conflict',
    body: 'How tension is usually handled, including patterns around challenge, avoidance, repair, and pressure.',
  },
  {
    title: 'Culture',
    body: 'The environments, norms, and team conditions that are likely to feel productive or draining.',
  },
  {
    title: 'Stress',
    body: 'How behaviour can shift when demands increase, clarity drops, or the work environment becomes strained.',
  },
];

const processSteps = [
  {
    label: '01',
    title: 'Answer structured questions',
    body: 'The assessment asks people to choose responses that best reflect normal working patterns, not idealised behaviour.',
  },
  {
    label: '02',
    title: 'Responses are scored against behavioural signals',
    body: 'Each answer contributes to the signal model through predefined assessment weightings.',
  },
  {
    label: '03',
    title: 'Scores are normalised and ranked',
    body: 'The engine compares signal strength consistently so the result can show the most relevant patterns first.',
  },
  {
    label: '04',
    title: 'A result profile is generated and saved',
    body: 'The completed result is stored once, then used by reports, dashboards, and future product surfaces.',
  },
];

const resultCards = [
  {
    title: 'Top signal',
    body: 'A clear opening pattern that explains the strongest behavioural theme in the result.',
  },
  {
    title: 'Ranked signals',
    body: 'A structured view of which signals are more present and how they relate to one another.',
  },
  {
    title: 'Domain summaries',
    body: 'Plain-English interpretation across behaviour, motivation, leadership, conflict, culture, and stress.',
  },
  {
    title: 'Overview summary',
    body: 'A concise synthesis that helps the reader understand the result before going deeper.',
  },
  {
    title: 'Strengths',
    body: 'Practical advantages that may come from the person’s current behavioural pattern.',
  },
  {
    title: 'Watchouts',
    body: 'Situations where the same pattern may narrow options, create friction, or need more range.',
  },
  {
    title: 'Development focus',
    body: 'Specific areas that can support reflection, coaching, and more deliberate working habits.',
  },
  {
    title: 'Completion checks',
    body: 'Report confidence is supported by structured completion and consistency checks rather than improvised claims.',
  },
];

const differencePoints = [
  'Deterministic, rule-based output.',
  'One saved result payload.',
  'No UI-side recalculation.',
  'No improvised AI summaries.',
  'A consistent structure across users and future assessments.',
];

const useCards = [
  {
    title: 'Personal development',
    body: 'Helps individuals reflect on working patterns without reducing them to a fixed personality label.',
  },
  {
    title: 'Leadership coaching',
    body: 'Gives coaches and leaders a shared language for discussing judgement, influence, and adaptation.',
  },
  {
    title: 'Team alignment',
    body: 'Supports more precise conversations about how people prefer to work together and where friction may appear.',
  },
  {
    title: 'Manager conversations',
    body: 'Creates a practical starting point for development conversations, role fit, and support needs.',
  },
];

export default function SignalsPage() {
  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Sonartra Signals"
        intro="Sonartra Signals is a structured behavioural assessment that turns responses into a clear profile of working style, motivators, leadership tendencies, conflict patterns, cultural fit, and stress responses."
        title="Understand the patterns behind how people work."
      >
        <PublicPageCtaRow
          actions={[
            { href: '/sign-up', label: 'Start assessment' },
            { href: '/platform', label: 'View platform', variant: 'secondary' },
          ]}
        />
      </PublicPageHero>

      <PublicPageSection eyebrow="What it measures" title="Six domains create a broader working profile.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {domainCards.map((card) => (
            <PublicPageCard body={card.body} key={card.title} title={card.title} />
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="How it works" title="A structured path from response to result.">
        <div className="space-y-3">
          {processSteps.map((step) => (
            <article
              className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm sm:grid-cols-[4rem_1fr]"
              key={step.label}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#32D6B0]/24 bg-[#32D6B0]/10 font-mono text-sm font-semibold text-[#32D6B0]">
                {step.label}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#F5F1EA]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/78">{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="Result profile" title="Readable insight with a consistent structure.">
        <div className="grid gap-4 sm:grid-cols-2">
          {resultCards.map((card) => (
            <PublicPageCard body={card.body} key={card.title} title={card.title} />
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="Why it is different" title="More useful than a generic personality quiz.">
        <div className="rounded-3xl border border-[#32D6B0]/20 bg-[#32D6B0]/[0.055] p-6">
          <p className="max-w-3xl text-base leading-8 text-[#D8D0C3]">
            Signals focuses on observable working behaviour rather than personality absolutes. The
            output is structured, deterministic, and practical, so the same completed assessment can
            support reflection, reporting, and future product surfaces without changing the result.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {differencePoints.map((point) => (
              <div
                className="rounded-2xl border border-white/10 bg-[#080A0D]/45 px-4 py-3 text-sm leading-6 text-[#F5F1EA]"
                key={point}
              >
                {point}
              </div>
            ))}
          </div>
        </div>
      </PublicPageSection>

      <PublicPageSection
        eyebrow="Individual and team use"
        title="A shared language for development conversations."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {useCards.map((card) => (
            <PublicPageCard body={card.body} key={card.title} title={card.title} />
          ))}
        </div>
      </PublicPageSection>

      <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-sm md:mt-20 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
          Start with Sonartra Signals
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_auto] lg:items-end">
          <div>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
              Begin with the flagship behavioural assessment.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8D0C3]/82">
              Signals is the first major Sonartra product experience: a clear, practical profile for
              understanding how people work and where development conversations can begin.
            </p>
          </div>
          <PublicPageCtaRow
            actions={[
              { href: '/sign-up', label: 'Start assessment' },
              { href: '/contact', label: 'Contact us', variant: 'secondary' },
            ]}
          />
        </div>
      </section>
    </PublicPageCanvas>
  );
}
