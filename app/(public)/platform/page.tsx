import { LibraryEntryBand } from '@/components/library/library-entry-band';
import {
  PublicPageCanvas,
  PublicPageCard,
  PublicPageCtaRow,
  PublicPageHero,
  PublicPageSection,
} from '@/components/public/public-page-primitives';
import { getLibraryEntry } from '@/lib/library/library-entry-links';

const platformCards = [
  {
    title: 'Runs structured assessments',
    body: 'Assessment content, response options, and signal weightings are defined before a user starts, so each run follows a clear model.',
  },
  {
    title: 'Generates deterministic results',
    body: 'Responses move through one scoring path to produce stable, reproducible behavioural intelligence.',
  },
  {
    title: 'Presents insight where it is needed',
    body: 'The same completed result can support dashboards, reports, and future team views without creating competing summaries.',
  },
];

const engineSteps = [
  {
    label: '01',
    title: 'Assessment definition',
    body: 'Questions, responses, signals, and language are authored as a structured assessment model.',
  },
  {
    label: '02',
    title: 'Response capture',
    body: 'A user completes the assessment through one guided flow, with each answer stored against the attempt.',
  },
  {
    label: '03',
    title: 'Scoring and normalisation',
    body: 'The engine applies the assessment weightings and normalises the outcome in a deterministic way.',
  },
  {
    label: '04',
    title: 'Canonical result',
    body: 'One result payload is generated once, persisted, and then read by every product surface.',
  },
  {
    label: '05',
    title: 'User and report surfaces',
    body: 'Workspace, result pages, and future analytics consume the same source rather than recalculating in the interface.',
  },
];

const deterministicPoints = [
  'No improvised result text at runtime.',
  'No UI-side recalculation of scores.',
  'No competing result formats for the same completion.',
  'Outputs are stable, reproducible, and ready for review.',
];

const surfaceCards = [
  {
    title: 'Individual results',
    body: 'Readable behavioural reports help people understand their current working pattern and what to do with it.',
  },
  {
    title: 'Workspace dashboard',
    body: 'The workspace can summarise completed assessments because it reads from persisted results.',
  },
  {
    title: 'Admin authoring',
    body: 'Assessment owners can prepare and review content before it reaches the engine path.',
  },
  {
    title: 'Future team views',
    body: 'Organisation and team surfaces can build on the same result contract without changing completed records.',
  },
];

const principleCards = [
  {
    title: 'Structured before flexible',
    body: 'The platform defines the model before interpretation, so flexibility does not become inconsistency.',
  },
  {
    title: 'Insight before decoration',
    body: 'Visual design supports behavioural understanding rather than turning results into dashboard theatre.',
  },
  {
    title: 'Reliable before clever',
    body: 'Stable outputs matter more than surprising language or novelty in the moment.',
  },
  {
    title: 'Human language, rule-based engine',
    body: 'Results should read naturally while still being generated from explicit assessment rules.',
  },
];

export default function PlatformPage() {
  const libraryEntry = getLibraryEntry('platform');

  return (
    <PublicPageCanvas>
      <PublicPageHero
        eyebrow="Platform"
        intro="Sonartra turns assessment responses into structured, readable behavioural intelligence. One scoring path produces one canonical result, so dashboards, reports, and future analytics all read from the same source."
        title="Behavioural intelligence, built on one clear engine."
      >
        <PublicPageCtaRow
          actions={[
            { href: '/sonartra-signals', label: 'Explore Sonartra Signals' },
            { href: '/brand', label: 'View brand system', variant: 'secondary' },
          ]}
        />
      </PublicPageHero>

      <PublicPageSection eyebrow="What it does" title="A platform for structured behavioural insight.">
        <div className="grid gap-4 md:grid-cols-3">
          {platformCards.map((card) => (
            <PublicPageCard body={card.body} key={card.title} title={card.title} />
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="Engine-first model" title="One execution path from assessment to result.">
        <div className="space-y-3">
          {engineSteps.map((step) => (
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

      <PublicPageSection eyebrow="Deterministic outputs" title="Reliable results are easier to trust and reuse.">
        <div className="rounded-3xl border border-[#32D6B0]/20 bg-[#32D6B0]/[0.055] p-6">
          <p className="max-w-3xl text-base leading-8 text-[#D8D0C3]">
            Sonartra does not ask the interface to invent a result after completion. The engine
            produces a stable output once, stores it, and lets every surface read from that record.
            That makes behavioural insight easier to explain, audit, and improve over time.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {deterministicPoints.map((point) => (
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

      <LibraryEntryBand entry={libraryEntry} />

      <PublicPageSection eyebrow="Multiple surfaces" title="One result can support different moments of use.">
        <div className="grid gap-4 md:grid-cols-2">
          {surfaceCards.map((card) => (
            <PublicPageCard body={card.body} key={card.title} title={card.title} />
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection eyebrow="Principles" title="Built for clarity before scale.">
        <div className="grid gap-4 md:grid-cols-2">
          {principleCards.map((card) => (
            <PublicPageCard body={card.body} key={card.title} title={card.title} />
          ))}
        </div>
      </PublicPageSection>

      <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-sm md:mt-20 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
          Start with the flagship assessment
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_auto] lg:items-end">
          <div>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
              Begin with behavioural signals, then build towards team intelligence.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8D0C3]/82">
              Sonartra is designed to support individuals first, then extend the same structured
              result model into richer team and organisation views.
            </p>
          </div>
          <PublicPageCtaRow
            actions={[
              { href: '/sonartra-signals', label: 'Explore Signals' },
              { href: '/contact', label: 'Contact', variant: 'secondary' },
            ]}
          />
        </div>
      </section>
    </PublicPageCanvas>
  );
}
