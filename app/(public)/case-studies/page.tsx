import {
  PublicPageCanvas,
  PublicPageCard,
  PublicPageCtaRow,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';

const scenarios = [
  {
    title: 'Leadership development',
    situation: 'A leader needs clearer language for how they set direction, make decisions, and respond under pressure.',
    help: 'Sonartra gives the conversation a structured behavioural profile rather than a loose coaching impression.',
    output: 'A report that can frame strengths, watchouts, and development focus in practical working language.',
  },
  {
    title: 'Team alignment',
    situation: 'A team has different working styles, but the friction is hard to name without making it personal.',
    help: 'Signals can create a neutral vocabulary for discussing pace, preference, pressure, and collaboration.',
    output: 'A shared view of patterns that can inform team norms, role clarity, and communication habits.',
  },
  {
    title: 'Manager conversations',
    situation: 'A manager wants a better starting point for development discussions than recent performance alone.',
    help: 'Sonartra connects individual results to concrete themes that can be explored in one-to-one conversations.',
    output: 'A structured prompt for discussing support needs, working conditions, and next areas of development.',
  },
  {
    title: 'Onboarding and role fit',
    situation: 'A new joiner is settling into the rhythms, expectations, and pressure points of a role.',
    help: 'Signals can help people discuss working preferences early without treating the result as a fixed label.',
    output: 'A practical profile that supports onboarding conversations and helps clarify where support may be useful.',
  },
];

const evidenceStandards = [
  'Context and reason for using the assessment.',
  'Assessment used and participant group.',
  'Behavioural questions explored.',
  'Result outputs used in the conversation.',
  'Action taken after reviewing the results.',
  'Observed outcomes or qualitative learning.',
  'Limitations and what the evidence does not prove.',
];

const structuredOutputPoints = [
  {
    title: 'Consistent report sections',
    body: 'Repeated structure helps people compare meaning without flattening individual context.',
  },
  {
    title: 'Comparable outputs',
    body: 'Results can be discussed across users because the same assessment logic produces the same kind of output.',
  },
  {
    title: 'Clearer conversations',
    body: 'A shared behavioural language reduces dependence on vague impressions or isolated anecdotes.',
  },
  {
    title: 'Less subjective interpretation',
    body: 'The report gives a grounded starting point while still leaving room for human judgement.',
  },
  {
    title: 'No improvised claims',
    body: 'Sonartra does not rely on ad hoc AI-generated summaries or made-up certainty at the point of reading.',
  },
];

const pilotUseCases = [
  {
    title: 'Founder or leadership team reflection',
    body: 'Use Signals to explore how senior leaders make decisions, handle pressure, and create alignment.',
  },
  {
    title: 'New manager development',
    body: 'Support managers with a clearer picture of their leadership tendencies and likely pressure points.',
  },
  {
    title: 'Team communication reset',
    body: 'Create a structured discussion around collaboration patterns, friction, and preferred ways of working.',
  },
  {
    title: 'Coaching programme support',
    body: 'Give coaches a consistent result structure to support individual reflection and development planning.',
  },
];

export default function CaseStudiesPage() {
  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Case Studies"
        intro="Sonartra is designed to turn assessment data into structured, practical insight. These example applications show where behavioural intelligence can support individuals, leaders, and teams without relying on vague summaries or one-off interpretation."
        title="Evidence-led applications for behavioural intelligence."
      >
        <PublicPageCtaRow
          actions={[
            { href: '/contact', label: 'Discuss a pilot' },
            { href: '/platform', label: 'Explore the platform', variant: 'secondary' },
          ]}
        />
      </PublicPageHero>

      <section className="mt-16 rounded-3xl border border-[#32D6B0]/20 bg-[#32D6B0]/[0.055] p-6 md:mt-20 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
          How to read this page
        </p>
        <div className="mt-4 max-w-3xl space-y-4 text-sm leading-7 text-[#D8D0C3]">
          <p>
            These are application scenarios, not fabricated customer stories. Real case studies
            should be added only when pilot or customer evidence exists.
          </p>
          <p>
            The structure below shows how Sonartra can be applied responsibly: with clear context,
            defined outputs, practical action, and honest limits.
          </p>
        </div>
      </section>

      <PublicPageSection
        eyebrow="Application scenarios"
        title="Where structured behavioural insight can create value."
      >
        <div className="grid gap-4">
          {scenarios.map((scenario) => (
            <article
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm"
              key={scenario.title}
            >
              <h3 className="text-xl font-semibold text-[#F5F1EA]">{scenario.title}</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                    Situation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/78">
                    {scenario.situation}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                    How Sonartra helps
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/78">{scenario.help}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                    Practical output
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/78">{scenario.output}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection
        eyebrow="Evidence standard"
        title="What a real case study should include."
      >
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-sm">
          <p className="max-w-3xl text-base leading-8 text-[#D8D0C3]">
            Sonartra case studies should be built from real customer or pilot evidence. The aim is
            not to manufacture proof, but to show what changed, what was learned, and where the
            evidence has limits.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {evidenceStandards.map((standard) => (
              <div
                className="rounded-2xl border border-white/10 bg-[#080A0D]/45 px-4 py-3 text-sm leading-6 text-[#F5F1EA]"
                key={standard}
              >
                {standard}
              </div>
            ))}
          </div>
        </div>
      </PublicPageSection>

      <PublicPageSection
        eyebrow="Structured outputs"
        title="Why repeatable outputs matter in practice."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {structuredOutputPoints.map((point) => (
            <PublicPageCard body={point.body} key={point.title} title={point.title} />
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="Pilot-ready use cases" title="Good first places to apply Signals.">
        <div className="grid gap-4 md:grid-cols-2">
          {pilotUseCases.map((useCase) => (
            <PublicPageCard body={useCase.body} key={useCase.title} title={useCase.title} />
          ))}
        </div>
      </PublicPageSection>

      <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-sm md:mt-20 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
          Build evidence responsibly
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_auto] lg:items-end">
          <div>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
              Start with a focused pilot and a clear behavioural question.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8D0C3]/82">
              The strongest Sonartra case studies will come from real use: a defined context, a
              structured assessment, a practical conversation, and honest learning.
            </p>
          </div>
          <PublicPageCtaRow
            actions={[
              { href: '/contact', label: 'Talk to us about a pilot' },
              { href: '/sonartra-signals', label: 'View Sonartra Signals', variant: 'secondary' },
            ]}
          />
        </div>
      </section>
    </PublicPageCanvas>
  );
}
