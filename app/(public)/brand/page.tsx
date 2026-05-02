import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';

const coreColours = [
  { name: 'sonar-950', value: '#080A0D', guidance: 'Primary dark foundation' },
  { name: 'sonar-900', value: '#101318', guidance: 'Page background and deep panels' },
  { name: 'sonar-850', value: '#171B22', guidance: 'Raised surfaces' },
  { name: 'sonar-700', value: '#2A303A', guidance: 'Borders and quiet dividers' },
  { name: 'paper-50', value: '#F5F1EA', guidance: 'Primary text on dark' },
  { name: 'paper-200', value: '#D8D0C3', guidance: 'Secondary text' },
  { name: 'paper-400', value: '#9A9185', guidance: 'Captions and restrained metadata' },
  { name: 'paper-100', value: '#EFE8DC', guidance: 'Light report surfaces' },
  { name: 'ink-900', value: '#171512', guidance: 'Text on light paper surfaces' },
];

const accentColours = [
  { name: 'signal-teal', value: '#32D6B0', guidance: 'Primary Sonartra accent' },
  { name: 'signal-gold', value: '#D9A441', guidance: 'Important emphasis' },
  { name: 'signal-amber', value: '#E3A72F', guidance: 'Caution and readiness' },
  { name: 'signal-clay', value: '#C86B54', guidance: 'Tension and limitation' },
  { name: 'signal-green', value: '#65C28C', guidance: 'Stable progress' },
  { name: 'signal-blue', value: '#6FA8DC', guidance: 'Supportive context' },
];

const principles = [
  {
    title: 'Clear, not simplistic',
    body: 'Explain behavioural patterns in plain English without flattening the nuance.',
  },
  {
    title: 'Premium, not decorative',
    body: 'Let restraint, spacing, typography, and precision create value. Avoid ornamental effects.',
  },
  {
    title: 'Human, not soft',
    body: 'Speak to real working behaviour without drifting into wellness language.',
  },
  {
    title: 'Structured, not rigid',
    body: 'Use clear hierarchy and repeated patterns while leaving room for interpretation.',
  },
  {
    title: 'Insight-first',
    body: 'Design should reveal what matters and help people decide what to do next.',
  },
];

const voiceExamples = [
  {
    bad: 'Unlock your full potential.',
    better: 'Understand the patterns shaping how you work.',
  },
  {
    bad: 'AI-powered insights that transform your team overnight!',
    better: 'See the decision patterns that shape team momentum and friction.',
  },
  {
    bad: 'You are a visionary leader.',
    better: 'Vision appears strongly in how you frame direction and future options.',
  },
];

const componentExamples = [
  {
    title: 'Primary button',
    body: 'Reserved for the next meaningful action.',
    sample: 'View signal pattern',
    className: 'border-[#32D6B0]/30 bg-[#32D6B0] text-[#07100f]',
  },
  {
    title: 'Secondary button',
    body: 'For considered navigation and non-destructive actions.',
    sample: 'Compare results',
    className: 'border-[#F5F1EA]/14 bg-[#F5F1EA]/5 text-[#F5F1EA]',
  },
  {
    title: 'Status badge',
    body: 'Short, specific, and calm.',
    sample: 'Results ready',
    className: 'border-[#65C28C]/28 bg-[#65C28C]/10 text-[#A8E2C0]',
  },
];

const applications = [
  {
    label: 'Public homepage hero',
    title: 'Behavioural intelligence for how teams work',
    body: 'Reveal the patterns behind how people lead, decide, adapt, and develop.',
  },
  {
    label: 'Dashboard card',
    title: 'Your current signal pattern',
    body: 'Results leads your profile, with Vision providing the strongest secondary pull.',
  },
  {
    label: 'Assessment runner question',
    title: 'When a plan becomes uncertain, what do you usually do first?',
    body: 'Choose the response that best reflects your normal working pattern, not your ideal one.',
  },
  {
    label: 'Result opening panel',
    title: 'A practical pattern of direction and delivery',
    body: 'Your result suggests a strong bias towards outcomes, supported by future framing.',
  },
  {
    label: 'Admin validation state',
    title: 'Language coverage needs review',
    body: 'Three driver statements are missing for this draft. Publish remains blocked until coverage is complete.',
  },
];

function Section({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="border-t border-[#F5F1EA]/10 py-14 md:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">{eyebrow}</p>
          <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
            {title}
          </h2>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

function ColourSwatch({
  guidance,
  name,
  value,
}: {
  guidance: string;
  name: string;
  value: string;
}) {
  const swatchStyle = { backgroundColor: value } satisfies CSSProperties;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#F5F1EA]/10 bg-[#171B22]">
      <div className="h-20 border-b border-[#F5F1EA]/10" style={swatchStyle} />
      <div className="space-y-1 p-4">
        <p className="font-mono text-xs text-[#F5F1EA]">{name}</p>
        <p className="font-mono text-xs text-[#D8D0C3]">{value}</p>
        <p className="text-sm text-[#9A9185]">{guidance}</p>
      </div>
    </div>
  );
}

function GuidanceCard({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-[#F5F1EA]/10 bg-[#171B22]/78 p-5">
      <h3 className="text-lg font-semibold text-[#F5F1EA]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/82">{body}</p>
    </article>
  );
}

export default function BrandIdentityPage() {
  return (
    <div className="bg-[#080A0D] text-[#F5F1EA]">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
        <header className="py-16 md:py-24">
          <div className="flex flex-wrap items-center gap-5 border-b border-[#F5F1EA]/10 pb-10">
            <Image
              alt="Sonartra"
              className="block"
              height={54}
              priority
              src="/images/brand/sonartra-logo-white.svg"
              unoptimized
              width={220}
            />
            <span className="rounded-full border border-[#32D6B0]/20 bg-[#32D6B0]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#79E9CF]">
              Brand identity reference
            </span>
          </div>

          <div className="grid gap-10 pt-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
                Dark Editorial Intelligence
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.04] text-[#F5F1EA] md:text-7xl">
                Behavioural patterns, made clear enough to act on.
              </h1>
            </div>
            <div className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6">
              <p className="text-lg leading-8 text-[#D8D0C3]">
                Sonartra is a behavioural intelligence platform that helps people and teams
                understand how they work, lead, decide, adapt, and develop.
              </p>
            </div>
          </div>
        </header>

        <Section eyebrow="01 Overview" title="A calm, editorial system for serious behavioural insight.">
          <div className="space-y-6 text-base leading-8 text-[#D8D0C3]">
            <p>
              Dark Editorial Intelligence gives Sonartra a premium and enterprise-credible
              presence without making the product feel cold or technical. It frames assessments as
              structured interpretation rather than quizzes, dashboards, or generic HR content.
            </p>
            <p>
              The direction fits because Sonartra needs to hold complexity clearly. It should make
              behavioural evidence feel legible, considered, and actionable, while leaving room for
              human judgement.
            </p>
          </div>
        </Section>

        <Section eyebrow="02 Brand principles" title="The rules that keep the brand precise.">
          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map((principle) => (
              <GuidanceCard body={principle.body} key={principle.title} title={principle.title} />
            ))}
          </div>
        </Section>

        <Section eyebrow="03 Logo and mark" title="Use the identity with restraint and clear space.">
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#9A9185]">
                  Full wordmark
                </p>
                <div className="mt-8 flex min-h-28 items-center justify-center rounded-2xl border border-[#F5F1EA]/10 bg-[#080A0D] p-8">
                  <Image
                    alt="Sonartra wordmark"
                    className="block"
                    height={59}
                    src="/images/brand/sonartra-logo-white.svg"
                    unoptimized
                    width={242}
                  />
                </div>
                <p className="mt-4 text-sm leading-6 text-[#D8D0C3]/82">
                  Use the full Sonartra wordmark for public, report, and expanded navigation
                  surfaces where the brand needs to be immediately understood.
                </p>
              </div>
              <div className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#9A9185]">
                  Isolated S mark
                </p>
                <div className="mt-8 flex min-h-28 items-center justify-center rounded-2xl border border-[#F5F1EA]/10 bg-[#080A0D] p-8">
                  <Image
                    alt="Sonartra mark"
                    className="block"
                    height={56}
                    src="/images/brand/sonartra-mark-white.svg"
                    unoptimized
                    width={80}
                  />
                </div>
                <p className="mt-4 text-sm leading-6 text-[#D8D0C3]/82">
                  Use the mark for compact app icons, favicon-style contexts, collapsed sidebars,
                  and small identity moments where the wordmark would become cramped.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <GuidanceCard
                title="Clear space"
                body="Leave clear space around the logo at least equal to the height of the mark. Do not crowd it with labels, badges, or navigation."
              />
              <GuidanceCard
                title="Do"
                body="Use white assets on dark surfaces and black assets on light paper surfaces. Keep the logo flat, sharp, and undistorted."
              />
              <GuidanceCard
                title="Do not"
                body="Do not stretch, recolour, outline, rotate, add glow, add drop shadows, or place the logo on noisy backgrounds."
              />
            </div>
          </div>
        </Section>

        <Section eyebrow="04 Colour" title="Dark foundations, paper neutrals, and one primary signal accent.">
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#F5F1EA]">Core colours</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {coreColours.map((colour) => (
                  <ColourSwatch key={colour.name} {...colour} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#F5F1EA]">Accent colours</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {accentColours.map((colour) => (
                  <ColourSwatch key={colour.name} {...colour} />
                ))}
              </div>
            </div>
            <p className="rounded-2xl border border-[#32D6B0]/16 bg-[#32D6B0]/7 p-5 text-sm leading-7 text-[#D8D0C3]">
              Teal is the primary Sonartra accent. Other accents should support interpretation,
              status, and comparison, not decoration. Avoid neon colour, heavy gradients, and
              excessive glow.
            </p>
          </div>
        </Section>

        <Section eyebrow="05 Typography" title="Editorial hierarchy with practical product legibility.">
          <div className="grid gap-4 md:grid-cols-3">
            <GuidanceCard
              title="Display and reports"
              body="Use a refined serif style for major report headings and editorial moments. It should feel considered, not literary or ornate."
            />
            <GuidanceCard
              title="UI and body"
              body="Use a clean sans-serif for interface text, labels, navigation, and long-form guidance. Clarity wins over personality."
            />
            <GuidanceCard
              title="Data and diagnostics"
              body="Use restrained mono only where it helps parse keys, tokens, statuses, or diagnostics. Do not overuse mono in product or public pages."
            />
          </div>
        </Section>

        <Section eyebrow="06 Voice and tone" title="Measured language for behavioural evidence.">
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <GuidanceCard
                title="Use"
                body="Clear, measured, behavioural, balanced, premium, plain English, and British English."
              />
              <GuidanceCard
                title="Avoid"
                body="Hype, exclamation marks, wellness clichés, vague AI claims, corporate buzzwords, and personality absolutes."
              />
            </div>
            <div className="space-y-4">
              {voiceExamples.map((example) => (
                <div
                  className="grid gap-3 rounded-2xl border border-[#F5F1EA]/10 bg-[#171B22]/78 p-4 md:grid-cols-2"
                  key={example.bad}
                >
                  <p className="text-sm leading-6 text-[#C86B54]">
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9185]">
                      Bad
                    </span>
                    {example.bad}
                  </p>
                  <p className="text-sm leading-6 text-[#D8D0C3]">
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                      Better
                    </span>
                    {example.better}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section eyebrow="07 Components" title="Reference patterns for future product polish.">
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
              {componentExamples.map((component) => (
                <div
                  className="rounded-2xl border border-[#F5F1EA]/10 bg-[#171B22]/78 p-5"
                  key={component.title}
                >
                  <h3 className="text-lg font-semibold text-[#F5F1EA]">{component.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/82">{component.body}</p>
                  <button
                    className={`mt-5 rounded-full border px-4 py-2 text-sm font-semibold ${component.className}`}
                    type="button"
                  >
                    {component.sample}
                  </button>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9185]">
                  Result panel
                </p>
                <h3 className="mt-4 text-2xl font-semibold text-[#F5F1EA]">
                  Direction is clear, but adaptation needs range.
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#D8D0C3]">
                  The result should explain the behavioural pattern, then show what it enables,
                  where it narrows, and how to apply it.
                </p>
              </div>
              <div className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9185]">
                  Assessment answer card
                </p>
                <div className="mt-4 rounded-2xl border border-[#32D6B0]/24 bg-[#32D6B0]/8 p-4">
                  <p className="font-medium text-[#F5F1EA]">
                    I clarify the outcome first, then adjust the route.
                  </p>
                  <p className="mt-2 text-sm text-[#D8D0C3]/82">
                    Selected states should be confident and calm, not gamified.
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9185]">
                  Card
                </p>
                <h3 className="mt-4 text-xl font-semibold text-[#F5F1EA]">
                  Team decision pattern
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#D8D0C3]">
                  Cards should carry one clear idea, a short explanation, and a precise next step.
                </p>
              </div>
              <div className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9185]">
                  Sidebar and navigation
                </p>
                <div className="mt-4 space-y-2">
                  {['Workspace', 'Assessments', 'Results'].map((item, index) => (
                    <div
                      className={[
                        'rounded-2xl border px-4 py-3 text-sm font-medium',
                        index === 0
                          ? 'border-[#32D6B0]/28 bg-[#32D6B0]/9 text-[#F5F1EA]'
                          : 'border-[#F5F1EA]/10 bg-[#F5F1EA]/4 text-[#D8D0C3]',
                      ].join(' ')}
                      key={item}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section eyebrow="08 Layout" title="Spacing should make the intelligence easier to scan.">
          <div className="grid gap-4 md:grid-cols-2">
            <GuidanceCard
              title="Generous spacing"
              body="Use meaningful section breaks and avoid packing too many competing ideas into one viewport."
            />
            <GuidanceCard
              title="Calm report width"
              body="Long-form insight should sit in a readable measure, supported by side metadata only when it adds clarity."
            />
            <GuidanceCard
              title="Scan-first hierarchy"
              body="Headings, labels, panels, and status should let a reader understand the page before reading every line."
            />
            <GuidanceCard
              title="Mobile readability"
              body="Stack sections deliberately, preserve spacing, and avoid dense text blocks or cramped card grids."
            />
          </div>
        </Section>

        <Section eyebrow="09 Motion" title="Movement should orient, not impress.">
          <div className="grid gap-4 md:grid-cols-2">
            <GuidanceCard
              title="Use"
              body="Subtle fades, small state changes, and purposeful transitions that help users track where they are."
            />
            <GuidanceCard
              title="Avoid"
              body="Bounce, gamified transitions, theatrical reveals, excessive glow, or motion that competes with the insight."
            />
          </div>
        </Section>

        <Section eyebrow="10 Applications" title="How the direction translates across Sonartra surfaces.">
          <div className="grid gap-4">
            {applications.map((application) => (
              <article
                className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6"
                key={application.label}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                  {application.label}
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-[#F5F1EA]">{application.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#D8D0C3]">{application.body}</p>
              </article>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
