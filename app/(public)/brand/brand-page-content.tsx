import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';

type BrandAccent = {
  token: string;
  hex: string;
  textOnAccent: string;
};

const PRIMARY_ACCENT = {
  token: 'signal-teal',
  hex: '#32D6B0',
  textOnAccent: '#07100f',
} satisfies BrandAccent;

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

const primaryAccentExperiments = [
  {
    name: 'signal-teal',
    value: '#32D6B0',
    guidance: 'Selected primary accent. Clean, modern, and now locked as the Sonartra signal colour.',
  },
  {
    name: 'signal-teal-deep',
    value: '#2FBFA3',
    guidance: 'Calmer and more mature while keeping the existing teal direction.',
  },
  {
    name: 'signal-cyan-mineral',
    value: '#4DB8C8',
    guidance: 'Cooler, more analytical, and more clearly separated from Supabase-style green.',
  },
  {
    name: 'signal-sage',
    value: '#8FBF9F',
    guidance: 'Softer, more human and editorial, but less active.',
  },
  {
    name: 'signal-violet',
    value: '#9B8CFF',
    guidance: 'More distinctive and behavioural, but a stronger identity shift.',
  },
  {
    name: 'signal-copper',
    value: '#C9825A',
    guidance: 'Premium and human, but better suited as a secondary accent than the primary CTA colour.',
  },
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

function withAlpha(hex: string, alpha: number) {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function Section({
  accent,
  children,
  eyebrow,
  title,
}: {
  accent: BrandAccent;
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="border-t border-[#F5F1EA]/10 py-14 md:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: accent.hex }}
          >
            {eyebrow}
          </p>
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

function AccentPill({
  accent,
  children,
}: {
  accent: BrandAccent;
  children: ReactNode;
}) {
  return (
    <span
      className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
      style={{
        backgroundColor: withAlpha(accent.hex, 0.08),
        borderColor: withAlpha(accent.hex, 0.22),
        color: accent.hex,
      }}
    >
      {children}
    </span>
  );
}

function BrandBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[44rem] bg-[radial-gradient(circle_at_24%_8%,rgba(50,214,176,0.14),transparent_34%),radial-gradient(circle_at_78%_4%,rgba(245,241,234,0.08),transparent_30%),linear-gradient(180deg,rgba(8,10,13,0)_0%,#080A0D_82%)]" />
      <div className="absolute left-1/2 top-16 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-[#F5F1EA]/[0.035]" />
      <div className="absolute left-1/2 top-28 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full border border-[#32D6B0]/[0.045]" />
      <div className="absolute inset-x-0 top-0 h-[36rem] bg-[linear-gradient(rgba(245,241,234,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(245,241,234,0.014)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_84%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_54%,rgba(0,0,0,0.28)_100%)]" />
    </div>
  );
}

export function BrandPageContent() {
  const accent = PRIMARY_ACCENT;
  const primaryPanelStyle = {
    backgroundColor: withAlpha(accent.hex, 0.07),
    borderColor: withAlpha(accent.hex, 0.18),
  } satisfies CSSProperties;

  return (
    <div className="relative isolate overflow-hidden bg-[#080A0D] text-[#F5F1EA]">
      <BrandBackground />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
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
            <AccentPill accent={accent}>Brand identity reference</AccentPill>
            <AccentPill accent={accent}>Selected primary accent: signal-teal #32D6B0</AccentPill>
          </div>

          <div className="grid gap-10 pt-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p
                className="text-sm font-semibold uppercase tracking-[0.16em]"
                style={{ color: accent.hex }}
              >
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

        <Section
          accent={accent}
          eyebrow="01 Overview"
          title="A calm, editorial system for serious behavioural insight."
        >
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

        <Section accent={accent} eyebrow="02 Brand principles" title="The rules that keep the brand precise.">
          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map((principle) => (
              <GuidanceCard body={principle.body} key={principle.title} title={principle.title} />
            ))}
          </div>
        </Section>

        <Section accent={accent} eyebrow="03 Logo and mark" title="Use the identity with restraint and clear space.">
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

        <Section accent={accent} eyebrow="04 Colour" title="Dark foundations, paper neutrals, and one primary signal accent.">
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
            <p className="rounded-2xl border p-5 text-sm leading-7 text-[#D8D0C3]" style={primaryPanelStyle}>
              Selected primary accent: signal-teal #32D6B0. The primary accent is used for active
              states, selected answers, CTAs, focus states, and key interpretive highlights. Other
              accents should support interpretation, status, and comparison, not decoration. Avoid
              neon colour, heavy gradients, and excessive glow.
            </p>
            <div className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6">
              <div className="max-w-3xl">
                <h3 className="text-xl font-semibold text-[#F5F1EA]">
                  Primary accent experiments
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#D8D0C3]/82">
                  Historical comparison set from the accent selection pass. Signal-teal #32D6B0 is
                  now the selected primary accent; the alternatives remain here as context only.
                </p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {primaryAccentExperiments.map((colour) => (
                  <ColourSwatch key={colour.name} {...colour} />
                ))}
              </div>
              <p
                className="mt-5 rounded-2xl border p-5 text-sm leading-7 text-[#D8D0C3]"
                style={{
                  backgroundColor: withAlpha(PRIMARY_ACCENT.hex, 0.08),
                  borderColor: withAlpha(PRIMARY_ACCENT.hex, 0.18),
                }}
              >
                Decision locked: signal-teal (#32D6B0) remains the Sonartra primary accent. It is
                the reference colour for primary actions and interpretive emphasis on this brand
                page.
              </p>
            </div>
          </div>
        </Section>

        <Section accent={accent} eyebrow="05 Typography" title="Editorial hierarchy with practical product legibility.">
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

        <Section accent={accent} eyebrow="06 Voice and tone" title="Measured language for behavioural evidence.">
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
                    <span
                      className="block text-xs font-semibold uppercase tracking-[0.14em]"
                      style={{ color: accent.hex }}
                    >
                      Better
                    </span>
                    {example.better}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section accent={accent} eyebrow="07 Components" title="Reference patterns for future product polish.">
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#F5F1EA]/10 bg-[#171B22]/78 p-5">
                <h3 className="text-lg font-semibold text-[#F5F1EA]">Primary button</h3>
                <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/82">
                  Reserved for the next meaningful action.
                </p>
                <button
                  className="mt-5 rounded-full border px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: accent.hex,
                    borderColor: withAlpha(accent.hex, 0.3),
                    color: accent.textOnAccent,
                  }}
                  type="button"
                >
                  View signal pattern
                </button>
              </div>
              <div className="rounded-2xl border border-[#F5F1EA]/10 bg-[#171B22]/78 p-5">
                <h3 className="text-lg font-semibold text-[#F5F1EA]">Secondary button</h3>
                <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/82">
                  For considered navigation and non-destructive actions.
                </p>
                <button
                  className="mt-5 rounded-full border border-[#F5F1EA]/14 bg-[#F5F1EA]/5 px-4 py-2 text-sm font-semibold text-[#F5F1EA]"
                  type="button"
                >
                  Compare results
                </button>
              </div>
              <div className="rounded-2xl border border-[#F5F1EA]/10 bg-[#171B22]/78 p-5">
                <h3 className="text-lg font-semibold text-[#F5F1EA]">Status badge</h3>
                <p className="mt-2 text-sm leading-6 text-[#D8D0C3]/82">
                  Short, specific, and calm.
                </p>
                <button
                  className="mt-5 rounded-full border border-[#65C28C]/28 bg-[#65C28C]/10 px-4 py-2 text-sm font-semibold text-[#A8E2C0]"
                  type="button"
                >
                  Results ready
                </button>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div
                className="rounded-3xl border bg-[#101318] p-6"
                style={{ borderColor: withAlpha(accent.hex, 0.24) }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ color: accent.hex }}
                >
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
                <div className="mt-4 rounded-2xl border p-4" style={primaryPanelStyle}>
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
                      className="rounded-2xl border px-4 py-3 text-sm font-medium"
                      key={item}
                      style={
                        index === 0
                          ? {
                              backgroundColor: withAlpha(accent.hex, 0.09),
                              borderColor: withAlpha(accent.hex, 0.28),
                              color: '#F5F1EA',
                            }
                          : {
                              backgroundColor: 'rgba(245, 241, 234, 0.04)',
                              borderColor: 'rgba(245, 241, 234, 0.1)',
                              color: '#D8D0C3',
                            }
                      }
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section accent={accent} eyebrow="08 Layout" title="Spacing should make the intelligence easier to scan.">
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

        <Section accent={accent} eyebrow="09 Motion" title="Movement should orient, not impress.">
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

        <Section accent={accent} eyebrow="10 Applications" title="How the direction translates across Sonartra surfaces.">
          <div className="grid gap-4">
            {applications.map((application) => (
              <article
                className="rounded-3xl border border-[#F5F1EA]/10 bg-[#101318] p-6"
                key={application.label}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ color: accent.hex }}
                >
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
