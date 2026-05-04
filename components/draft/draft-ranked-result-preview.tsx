import type { ReactNode } from 'react';

import {
  rankedPatternExample,
  rankedPatternSectionOrder,
  validateRankedPatternExample,
} from '@/content/draft-result/ranked-pattern-example';
import { DraftResultReadingRail } from '@/components/draft/draft-result-reading-rail';

const sectionLabels = {
  '05_Context': 'Introduction',
  '06_Orientation': 'Pattern at a Glance',
  '07_Recognition': 'Core Interpretation',
  '08_Signal_Roles': 'Signal Profile',
  '09_Pattern_Mechanics': 'What Shapes This Pattern',
  '10_Pattern_Synthesis': 'How the Pattern Works',
  '11_Strengths': 'What Comes Easily',
  '12_Narrowing': 'Where It Can Narrow',
  '13_Application': 'How to Use It',
  '14_Closing_Integration': 'Take Forward',
} as const;

const sectionAnchorIds = {
  '05_Context': 'context',
  '06_Orientation': 'orientation',
  '07_Recognition': 'recognition',
  '08_Signal_Roles': 'signal-roles',
  '09_Pattern_Mechanics': 'pattern-mechanics',
  '10_Pattern_Synthesis': 'pattern-synthesis',
  '11_Strengths': 'strengths',
  '12_Narrowing': 'narrowing',
  '13_Application': 'application',
  '14_Closing_Integration': 'closing-integration',
} as const;

const prototypeScores = [
  { label: 'Deep Focus', value: 52 },
  { label: 'Creative Movement', value: 26 },
  { label: 'Physical Rhythm', value: 14 },
  { label: 'Social Exchange', value: 8 },
] as const;

const applicationAreaLabels = {
  use_this_when: 'Use this when',
  watch_for: 'Watch for',
  develop_by: 'Develop by',
} as const;

const draftResultRailSections = rankedPatternSectionOrder.map((sectionKey) => {
  const label = sectionLabels[sectionKey];

  return {
    id: sectionAnchorIds[sectionKey],
    label,
  };
});

function SchemaSection({
  children,
  sectionKey,
}: {
  children: ReactNode;
  sectionKey: keyof typeof sectionLabels;
}) {
  const label = sectionLabels[sectionKey];

  return (
    <section
      className="results-anchor-target scroll-mt-28 border-t border-[#F5F1EA]/10 py-12 md:py-16"
      id={sectionAnchorIds[sectionKey]}
    >
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#32D6B0]/80">
            {sectionKey}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
            {label}
          </h2>
        </div>
        <span className="w-fit rounded-full border border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.04] px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#9A9185]">
          Schema section
        </span>
      </div>
      {children}
    </section>
  );
}

function BodyText({ children }: { children: ReactNode }) {
  return <p className="text-base leading-8 text-[#D8D0C3]/84">{children}</p>;
}

function DetailCard({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'strong' | 'warm';
}) {
  const toneClass =
    tone === 'strong'
      ? 'border-[#32D6B0]/20 bg-[#32D6B0]/[0.055]'
      : tone === 'warm'
        ? 'border-[#C86B54]/20 bg-[#C86B54]/[0.055]'
        : 'border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.045]';

  return <article className={`rounded-2xl border p-5 backdrop-blur-sm ${toneClass}`}>{children}</article>;
}

function SignalKey({ children }: { children: ReactNode }) {
  return (
    <span className="mt-4 inline-flex w-fit rounded-full border border-[#32D6B0]/18 bg-[#32D6B0]/[0.07] px-3 py-1 font-mono text-xs text-[#32D6B0]/90">
      {children}
    </span>
  );
}

export function DraftRankedResultPreview() {
  validateRankedPatternExample();

  const [context] = rankedPatternExample['05_Context'];
  const [orientation] = rankedPatternExample['06_Orientation'];
  const [recognition] = rankedPatternExample['07_Recognition'];
  const signalRoles = rankedPatternExample['08_Signal_Roles'];
  const [mechanics] = rankedPatternExample['09_Pattern_Mechanics'];
  const [synthesis] = rankedPatternExample['10_Pattern_Synthesis'];
  const strengths = rankedPatternExample['11_Strengths'];
  const narrowing = rankedPatternExample['12_Narrowing'];
  const application = rankedPatternExample['13_Application'];
  const [closing] = rankedPatternExample['14_Closing_Integration'];

  return (
    <div className="relative isolate -mx-5 overflow-x-clip px-5 pb-16 pt-20 text-[#F5F1EA] sm:-mx-6 sm:px-6 md:pb-24 md:pt-24 lg:-mx-8 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 z-0 w-full max-w-full overflow-hidden bg-[linear-gradient(180deg,#090B0F_0%,#080A0D_46rem,#080A0D_100%)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_7%,rgba(50,214,176,0.13),transparent_31%),radial-gradient(circle_at_84%_12%,rgba(245,241,234,0.07),transparent_29%),linear-gradient(180deg,rgba(8,10,13,0)_0%,rgba(8,10,13,0.72)_68%,rgba(8,10,13,0)_100%)]" />
        <div className="absolute left-1/2 top-12 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full border border-[#F5F1EA]/[0.035]" />
        <div className="absolute left-1/2 top-24 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full border border-[#32D6B0]/[0.045]" />
        <div className="absolute inset-x-[-8rem] top-0 h-[42rem] bg-[linear-gradient(rgba(245,241,234,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(245,241,234,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_58%,rgba(0,0,0,0.2)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="max-w-5xl py-10 md:py-16">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
              Draft report prototype
            </p>
            <span className="rounded-full border border-[#32D6B0]/24 bg-[#32D6B0]/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
              Static sample / not live result
            </span>
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.03] text-[#F5F1EA] md:text-7xl">
            Flow State — Ranked Pattern Preview
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#D8D0C3]/86">
            Static schema-faithful UX validation page for testing report layout, reading rhythm,
            section order, rail behaviour, and mobile flow.
          </p>
          <dl className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.04] p-4">
              <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#9A9185]">
                pattern_key
              </dt>
              <dd className="mt-2 break-words font-mono text-xs leading-5 text-[#F5F1EA]/86">
                {orientation.pattern_key}
              </dd>
            </div>
            <div className="rounded-2xl border border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.04] p-4">
              <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#9A9185]">
                score_shape
              </dt>
              <dd className="mt-2 font-mono text-xs text-[#F5F1EA]/86">{orientation.score_shape}</dd>
            </div>
            <div className="rounded-2xl border border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.04] p-4">
              <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#9A9185]">
                source
              </dt>
              <dd className="mt-2 text-sm text-[#F5F1EA]/86">ranked pattern import schema</dd>
            </div>
          </dl>
        </header>

        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_11.75rem] xl:items-start">
          <article className="min-w-0">
            <SchemaSection sectionKey="05_Context">
              <div className="grid gap-5 md:grid-cols-[0.75fr_1.25fr]">
                <DetailCard tone="strong">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#32D6B0]/86">
                    {context.domain_key}
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold text-[#F5F1EA]">
                    {context.domain_title}
                  </h3>
                  <p className="mt-5 rounded-xl border border-[#E3A72F]/20 bg-[#E3A72F]/[0.06] p-4 text-sm leading-6 text-[#D8D0C3]/76">
                    {context.intro_note}
                  </p>
                </DetailCard>
                <div className="space-y-5">
                  <DetailCard>
                    <BodyText>{context.domain_definition}</BodyText>
                  </DetailCard>
                  <DetailCard>
                    <BodyText>{context.domain_scope}</BodyText>
                  </DetailCard>
                  <DetailCard>
                    <BodyText>{context.interpretation_guidance}</BodyText>
                  </DetailCard>
                </div>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="06_Orientation">
              <div className="space-y-6">
                <DetailCard tone="strong">
                  <h3 className="text-2xl font-semibold text-[#F5F1EA]">
                    {orientation.orientation_title}
                  </h3>
                  <p className="mt-4 text-lg leading-8 text-[#F5F1EA]/88">
                    {orientation.orientation_summary}
                  </p>
                  <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-[#32D6B0]/80">
                    score_shape: {orientation.score_shape}
                  </p>
                  <BodyText>{orientation.score_shape_summary}</BodyText>
                </DetailCard>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {prototypeScores.map((score) => (
                    <div
                      className="rounded-2xl border border-[#F5F1EA]/10 bg-[#101318]/82 p-4"
                      key={score.label}
                    >
                      <p className="text-sm font-semibold text-[#F5F1EA]">{score.label}</p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F5F1EA]/10">
                        <div
                          className="h-full rounded-full bg-[#32D6B0]"
                          style={{ width: `${score.value}%` }}
                        />
                      </div>
                      <p className="mt-3 font-mono text-2xl text-[#F5F1EA]">{score.value}%</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    orientation.rank_1_phrase,
                    orientation.rank_2_phrase,
                    orientation.rank_3_phrase,
                    orientation.rank_4_phrase,
                  ].map((phrase) => (
                    <DetailCard key={phrase}>
                      <BodyText>{phrase}</BodyText>
                    </DetailCard>
                  ))}
                </div>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="07_Recognition">
              <div className="rounded-[2rem] border border-[#32D6B0]/22 bg-[linear-gradient(135deg,rgba(50,214,176,0.11),rgba(245,241,234,0.035))] p-6 md:p-8">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#32D6B0]/80">
                  {recognition.headline}
                </p>
                <p className="mt-5 text-2xl font-semibold leading-snug text-[#F5F1EA] md:text-3xl">
                  {recognition.recognition_statement}
                </p>
                <p className="mt-6 text-base leading-8 text-[#D8D0C3]/84">
                  {recognition.recognition_expansion}
                </p>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="08_Signal_Roles">
              <div className="grid gap-4 md:grid-cols-2">
                {signalRoles.map((role) => {
                  const isPrimaryRole = role.rank_position === '1' || role.rank_position === '2';

                  return (
                    <article
                      className={[
                        'rounded-2xl border p-5',
                        isPrimaryRole
                          ? 'border-[#32D6B0]/22 bg-[#32D6B0]/[0.055]'
                          : 'border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.04]',
                      ].join(' ')}
                      key={role.signal_key}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#9A9185]">
                            Rank {role.rank_position} · {role.rank_role}
                          </p>
                          <h3 className="mt-3 text-xl font-semibold text-[#F5F1EA]">
                            {role.signal_label}
                          </h3>
                        </div>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F5F1EA]/12 bg-[#080A0D]/60 font-mono text-sm text-[#F5F1EA]">
                          {role.rank_position}
                        </span>
                      </div>
                      <h4 className="mt-5 text-base font-semibold text-[#F5F1EA]/92">{role.title}</h4>
                      <div className="mt-4 space-y-4 text-sm leading-6 text-[#D8D0C3]/80">
                        <p>{role.description}</p>
                        <p>{role.productive_expression}</p>
                        <p>{role.risk_pattern}</p>
                        <p>{role.development_note}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="09_Pattern_Mechanics">
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[2rem] border border-[#32D6B0]/18 bg-[#32D6B0]/[0.055] p-6">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#32D6B0]/82">
                    {mechanics.mechanics_title}
                  </p>
                  <blockquote className="mt-5 text-2xl font-semibold leading-snug text-[#F5F1EA]">
                    {mechanics.core_mechanism}
                  </blockquote>
                </div>
                <div className="grid gap-4">
                  <DetailCard>
                    <h3 className="text-lg font-semibold text-[#F5F1EA]">Why it shows up</h3>
                    <p className="mt-3 text-sm leading-7 text-[#D8D0C3]/82">
                      {mechanics.why_it_shows_up}
                    </p>
                  </DetailCard>
                  <DetailCard>
                    <h3 className="text-lg font-semibold text-[#F5F1EA]">What it protects</h3>
                    <p className="mt-3 text-sm leading-7 text-[#D8D0C3]/82">
                      {mechanics.what_it_protects}
                    </p>
                  </DetailCard>
                </div>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="10_Pattern_Synthesis">
              <div className="rounded-[2rem] border border-[#F5F1EA]/12 bg-[#171B22]/82 p-6 md:p-8">
                <h3 className="text-3xl font-semibold leading-tight text-[#F5F1EA]">
                  {synthesis.synthesis_title}
                </h3>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <DetailCard tone="strong">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                      Gift
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/84">{synthesis.gift}</p>
                  </DetailCard>
                  <DetailCard tone="warm">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#C86B54]">
                      Trap
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/84">{synthesis.trap}</p>
                  </DetailCard>
                  <DetailCard>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#F5F1EA]/72">
                      Takeaway
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/84">{synthesis.takeaway}</p>
                  </DetailCard>
                </div>
                <p className="mt-7 text-base leading-8 text-[#D8D0C3]/86">
                  {synthesis.synthesis_text}
                </p>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="11_Strengths">
              <div className="grid gap-4 md:grid-cols-3">
                {strengths.map((strength) => (
                  <DetailCard key={strength.strength_key} tone="strong">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#32D6B0]/78">
                      {strength.strength_key} · priority {strength.priority}
                    </p>
                    <h3 className="mt-4 text-lg font-semibold text-[#F5F1EA]">
                      {strength.strength_title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/82">
                      {strength.strength_text}
                    </p>
                    <SignalKey>{strength.linked_signal_key}</SignalKey>
                  </DetailCard>
                ))}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="12_Narrowing">
              <div className="grid gap-4 md:grid-cols-3">
                {narrowing.map((item) => (
                  <DetailCard key={item.narrowing_key} tone="warm">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#C86B54]/86">
                      {item.narrowing_key} · priority {item.priority}
                    </p>
                    <h3 className="mt-4 text-lg font-semibold text-[#F5F1EA]">
                      {item.narrowing_title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/82">
                      {item.narrowing_text}
                    </p>
                    <SignalKey>{item.missing_range_signal_key}</SignalKey>
                  </DetailCard>
                ))}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="13_Application">
              <div className="grid gap-4 md:grid-cols-3">
                {application.map((item) => (
                  <DetailCard key={item.application_area}>
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#32D6B0]/78">
                      {applicationAreaLabels[item.application_area]}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-[#D8D0C3]/84">
                      {item.guidance_text}
                    </p>
                    <SignalKey>{item.linked_signal_key}</SignalKey>
                  </DetailCard>
                ))}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="14_Closing_Integration">
              <div className="rounded-[2rem] border border-[#32D6B0]/24 bg-[linear-gradient(135deg,rgba(50,214,176,0.12),rgba(245,241,234,0.04))] p-6 md:p-8">
                <p className="text-xl font-semibold leading-8 text-[#F5F1EA]">
                  {closing.closing_summary}
                </p>
                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  <DetailCard tone="strong">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                      Core gift
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/84">{closing.core_gift}</p>
                  </DetailCard>
                  <DetailCard tone="warm">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#C86B54]">
                      Core trap
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/84">{closing.core_trap}</p>
                  </DetailCard>
                  <DetailCard>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#F5F1EA]/72">
                      Development edge
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/84">
                      {closing.development_edge}
                    </p>
                  </DetailCard>
                </div>
                <p className="mt-8 border-t border-[#F5F1EA]/10 pt-6 text-2xl font-semibold leading-snug text-[#F5F1EA]">
                  {closing.memorable_line}
                </p>
              </div>
            </SchemaSection>
          </article>

          <DraftResultReadingRail sections={draftResultRailSections} />
        </div>
      </div>
    </div>
  );
}
