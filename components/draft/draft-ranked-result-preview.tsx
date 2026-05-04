import type { ReactNode } from 'react';

import { DraftResultReadingRail } from '@/components/draft/draft-result-reading-rail';
import {
  rankedPatternExample,
  rankedPatternSectionOrder,
  validateRankedPatternExample,
} from '@/content/draft-result/ranked-pattern-example';

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
  { label: 'Deep Focus', value: 52, role: 'Anchor', rank: 1, tone: 'primary' },
  { label: 'Creative Movement', value: 26, role: 'Shaper', rank: 2, tone: 'secondary' },
  { label: 'Physical Rhythm', value: 14, role: 'Support', rank: 3, tone: 'support' },
  { label: 'Social Exchange', value: 8, role: 'Stretch', rank: 4, tone: 'stretch' },
] as const;

const applicationAreaLabels = {
  use_this_when: 'Use this when',
  watch_for: 'Watch for',
  develop_by: 'Develop by',
} as const;

const signalRoleLabels = {
  dominant: 'Dominant',
  secondary: 'Secondary',
  tertiary: 'Supporting',
  least_expressed: 'Stretch range',
} as const;

const draftResultRailSections = rankedPatternSectionOrder.map((sectionKey) => ({
  id: sectionAnchorIds[sectionKey],
  label: sectionLabels[sectionKey],
}));

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

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
      className="results-anchor-target scroll-mt-28 border-t border-[#F5F1EA]/[0.07] py-12 md:py-16"
      id={sectionAnchorIds[sectionKey]}
    >
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#32D6B0]/72">
            Briefing section
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold leading-tight text-[#F5F1EA] md:text-[2.75rem]">
            {label}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function BodyText({ children }: { children: ReactNode }) {
  return <p className="text-base leading-8 text-[#D8D0C3]/84">{children}</p>;
}

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cx('rounded-[1.25rem] border border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.035] p-5', className)}>
      {children}
    </article>
  );
}

function FieldLabel({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'warm' }) {
  return (
    <p
      className={cx(
        'font-mono text-[0.68rem] uppercase tracking-[0.18em]',
        tone === 'teal' && 'text-[#32D6B0]/82',
        tone === 'warm' && 'text-[#D99A66]/88',
        tone === 'neutral' && 'text-[#9A9185]',
      )}
    >
      {children}
    </p>
  );
}

function SignalKey({ children, tone = 'teal' }: { children: ReactNode; tone?: 'teal' | 'warm' | 'neutral' }) {
  return (
    <span
      className={cx(
        'mt-4 inline-flex w-fit rounded-full border px-3 py-1 font-mono text-xs',
        tone === 'teal' && 'border-[#32D6B0]/18 bg-[#32D6B0]/[0.07] text-[#32D6B0]/90',
        tone === 'warm' && 'border-[#D99A66]/20 bg-[#D99A66]/[0.07] text-[#F0B884]/90',
        tone === 'neutral' && 'border-[#F5F1EA]/12 bg-[#F5F1EA]/[0.045] text-[#D8D0C3]/76',
      )}
    >
      {children}
    </span>
  );
}

function DraftPatternSignature() {
  return (
    <div
      className="rounded-[1.5rem] border border-[#F5F1EA]/10 bg-[#0D1218]/88 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:p-5"
      data-draft-pattern-signature="true"
    >
      <div className="flex flex-col gap-3 border-b border-[#F5F1EA]/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <FieldLabel tone="teal">Pattern signature</FieldLabel>
          <p className="mt-2 text-lg font-semibold text-[#F5F1EA]">Concentrated pattern</p>
        </div>
        <p className="max-w-[16rem] text-sm leading-6 text-[#D8D0C3]/70">First rank clearly anchors this result.</p>
      </div>

      <div className="mt-4 space-y-2.5">
        {prototypeScores.map(({ label, value, role, rank, tone }) => {
          const isPrimary = tone === 'primary';
          const fillClass =
            tone === 'stretch'
              ? 'bg-[linear-gradient(90deg,rgba(217,154,102,0.86),rgba(217,154,102,0.58))]'
              : tone === 'support'
                ? 'bg-[linear-gradient(90deg,rgba(143,208,190,0.82),rgba(143,208,190,0.5))]'
                : tone === 'secondary'
                  ? 'bg-[linear-gradient(90deg,rgba(107,226,200,0.94),rgba(107,226,200,0.62))]'
                  : 'bg-[linear-gradient(90deg,#32D6B0,rgba(50,214,176,0.72))]';

          return (
            <div
              aria-label={`${label}, rank ${rank}, ${role}, ${value}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={value}
              className={cx(
                'grid gap-3 rounded-[1rem] border p-3 sm:grid-cols-[minmax(10rem,0.78fr)_minmax(10rem,1.2fr)_3.75rem] sm:items-center sm:p-3.5',
                isPrimary
                  ? 'border-[#32D6B0]/26 bg-[#32D6B0]/[0.075]'
                  : tone === 'stretch'
                    ? 'border-[#D99A66]/18 bg-[#D99A66]/[0.045]'
                    : 'border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.028]',
              )}
              key={label}
              role="meter"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs',
                    isPrimary
                      ? 'border-[#32D6B0]/32 bg-[#32D6B0]/12 text-[#F5F1EA]'
                      : 'border-[#F5F1EA]/12 bg-[#080A0D]/58 text-[#D8D0C3]/76',
                  )}
                >
                  {rank}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-[#F5F1EA]">{label}</p>
                  <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#9A9185]">{role}</p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="h-2 overflow-hidden rounded-full bg-[#05070A]/80 ring-1 ring-[#F5F1EA]/10">
                  <div className={cx('h-full rounded-full shadow-[0_0_18px_rgba(50,214,176,0.18)]', fillClass)} style={{ width: `${value}%` }} />
                </div>
              </div>

              <p className={cx('font-mono text-xl sm:text-right', isPrimary ? 'text-[#F5F1EA]' : 'text-[#D8D0C3]/84')}>
                {value}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
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
    <div className="relative isolate -mx-5 overflow-x-clip px-5 pb-16 pt-16 text-[#F5F1EA] sm:-mx-6 sm:px-6 md:pb-24 md:pt-20 lg:-mx-8 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 z-0 w-full max-w-full overflow-hidden bg-[linear-gradient(180deg,#080A0D_0%,#0B0D11_34rem,#080A0D_100%)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_6%,rgba(50,214,176,0.11),transparent_29%),radial-gradient(circle_at_82%_8%,rgba(217,154,102,0.08),transparent_28%),linear-gradient(180deg,rgba(8,10,13,0)_0%,rgba(8,10,13,0.78)_74%,rgba(8,10,13,0)_100%)]" />
        <div className="absolute inset-x-[-8rem] top-0 h-[38rem] bg-[linear-gradient(rgba(245,241,234,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(245,241,234,0.012)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]" />
        <div className="absolute left-1/2 top-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-[#F5F1EA]/[0.03]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_56%,rgba(0,0,0,0.24)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="grid gap-8 py-8 md:py-12 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-end">
          <div className="max-w-5xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
                Draft report prototype
              </p>
              <span className="rounded-full border border-[#32D6B0]/24 bg-[#32D6B0]/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                Static sample / not live result
              </span>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-[#D8D0C3]/58">
              Static schema-faithful UX validation page for testing report layout, reading rhythm,
              section order, rail behaviour, and mobile flow.
            </p>

            <p className="mt-7 text-sm font-medium uppercase tracking-[0.18em] text-[#D8D0C3]/64">
              {context.domain_title}
            </p>
            <h1 className="mt-3 max-w-4xl text-5xl font-semibold leading-[1.02] text-[#F5F1EA] md:text-7xl">
              {recognition.headline}
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-8 text-[#D8D0C3]/88 md:text-2xl md:leading-10">
              {recognition.recognition_statement}
            </p>
          </div>

          <aside className="rounded-[1.5rem] border border-[#F5F1EA]/10 bg-[#0D1218]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
            <FieldLabel tone="teal">Result object</FieldLabel>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] border border-[#32D6B0]/18 bg-[#32D6B0]/[0.06] p-4">
                <p className="text-3xl font-semibold text-[#F5F1EA]">52%</p>
                <p className="mt-2 text-sm leading-5 text-[#D8D0C3]/78">Deep Focus</p>
              </div>
              <div className="rounded-[1rem] border border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.035] p-4">
                <p className="text-3xl font-semibold text-[#F5F1EA]">26%</p>
                <p className="mt-2 text-sm leading-5 text-[#D8D0C3]/78">Creative Movement</p>
              </div>
            </div>
            <dl className="mt-4 space-y-3 border-t border-[#F5F1EA]/10 pt-4">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-[#9A9185]">Pattern shape</dt>
                <dd className="font-mono text-sm text-[#F5F1EA]/88">{orientation.score_shape}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-[#9A9185]">Ranked spread</dt>
                <dd className="font-mono text-sm text-[#F5F1EA]/88">52 / 26 / 14 / 8</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-[#9A9185]">Source</dt>
                <dd className="text-sm text-[#F5F1EA]/80">ranked pattern import schema</dd>
              </div>
            </dl>
          </aside>
        </header>

        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_11.75rem] xl:items-start">
          <article className="min-w-0">
            <SchemaSection sectionKey="05_Context">
              <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
                <Panel className="border-[#32D6B0]/18 bg-[#32D6B0]/[0.055]">
                  <FieldLabel tone="teal">{context.domain_key}</FieldLabel>
                  <h3 className="mt-4 text-3xl font-semibold text-[#F5F1EA]">{context.domain_title}</h3>
                  <p className="mt-5 rounded-[1rem] border border-[#D99A66]/20 bg-[#D99A66]/[0.06] p-4 text-sm leading-6 text-[#D8D0C3]/78">
                    {context.intro_note}
                  </p>
                </Panel>
                <div className="grid gap-4 md:grid-cols-3">
                  <Panel>
                    <FieldLabel>Definition</FieldLabel>
                    <div className="mt-3">
                      <BodyText>{context.domain_definition}</BodyText>
                    </div>
                  </Panel>
                  <Panel>
                    <FieldLabel>Scope</FieldLabel>
                    <div className="mt-3">
                      <BodyText>{context.domain_scope}</BodyText>
                    </div>
                  </Panel>
                  <Panel>
                    <FieldLabel>Read as</FieldLabel>
                    <div className="mt-3">
                      <BodyText>{context.interpretation_guidance}</BodyText>
                    </div>
                  </Panel>
                </div>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="06_Orientation">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <DraftPatternSignature />
                <div className="rounded-[1.5rem] border border-[#32D6B0]/22 bg-[linear-gradient(135deg,rgba(50,214,176,0.11),rgba(245,241,234,0.035))] p-6 md:p-7">
                  <FieldLabel tone="teal">{orientation.orientation_title}</FieldLabel>
                  <p className="mt-5 text-2xl font-semibold leading-snug text-[#F5F1EA]">
                    {orientation.orientation_summary}
                  </p>
                  <div className="mt-6 border-t border-[#F5F1EA]/10 pt-5">
                    <FieldLabel>Concentrated pattern</FieldLabel>
                    <p className="mt-3 text-base leading-8 text-[#D8D0C3]/86">{orientation.score_shape_summary}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-[1.18fr_1fr]">
                {[orientation.rank_1_phrase, orientation.rank_2_phrase, orientation.rank_3_phrase, orientation.rank_4_phrase].map(
                  (phrase, index) => (
                    <Panel
                      key={phrase}
                      className={cx(
                        index === 0 && 'border-[#32D6B0]/22 bg-[#32D6B0]/[0.06] md:row-span-2',
                        index === 3 && 'border-[#D99A66]/18 bg-[#D99A66]/[0.045]',
                      )}
                    >
                      <FieldLabel tone={index === 3 ? 'warm' : index === 0 ? 'teal' : 'neutral'}>
                        Rank {index + 1}
                      </FieldLabel>
                      <p className={cx('mt-3 leading-7 text-[#D8D0C3]/84', index === 0 ? 'text-xl md:text-2xl md:leading-9' : 'text-sm')}>
                        {phrase}
                      </p>
                    </Panel>
                  ),
                )}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="07_Recognition">
              <div className="rounded-[1.65rem] border border-[#32D6B0]/22 bg-[linear-gradient(135deg,rgba(50,214,176,0.11),rgba(245,241,234,0.035))] p-6 md:p-8">
                <FieldLabel tone="teal">{recognition.headline}</FieldLabel>
                <p className="mt-5 text-2xl font-semibold leading-snug text-[#F5F1EA] md:text-3xl">
                  {recognition.recognition_statement}
                </p>
                <p className="mt-6 max-w-4xl text-base leading-8 text-[#D8D0C3]/84">
                  {recognition.recognition_expansion}
                </p>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="08_Signal_Roles">
              <div className="space-y-4">
                {signalRoles.map((role) => {
                  const isPrimaryRole = role.rank_position === '1' || role.rank_position === '2';
                  const isStretchRole = role.rank_position === '4';

                  return (
                    <article
                      className={cx(
                        'grid gap-5 rounded-[1.35rem] border p-5 md:grid-cols-[10rem_minmax(0,1fr)] md:p-6',
                        isPrimaryRole && 'border-[#32D6B0]/22 bg-[#32D6B0]/[0.055]',
                        role.rank_position === '3' && 'border-[#F5F1EA]/10 bg-[#F5F1EA]/[0.035]',
                        isStretchRole && 'border-[#D99A66]/18 bg-[#D99A66]/[0.045]',
                      )}
                      key={role.signal_key}
                    >
                      <div>
                        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#F5F1EA]/12 bg-[#080A0D]/60 font-mono text-lg text-[#F5F1EA]">
                          {role.rank_position}
                        </span>
                        <FieldLabel tone={isStretchRole ? 'warm' : isPrimaryRole ? 'teal' : 'neutral'}>
                          {signalRoleLabels[role.rank_role]}
                        </FieldLabel>
                        <h3 className="mt-3 text-xl font-semibold text-[#F5F1EA]">{role.signal_label}</h3>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-[#F5F1EA]/94">{role.title}</h4>
                        <p className="mt-3 text-base leading-8 text-[#D8D0C3]/84">{role.description}</p>
                        <div className="mt-5 grid gap-3 lg:grid-cols-3">
                          <Panel className="bg-[#080A0D]/35 p-4">
                            <FieldLabel>At its best</FieldLabel>
                            <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/80">{role.productive_expression}</p>
                          </Panel>
                          <Panel className="bg-[#080A0D]/35 p-4">
                            <FieldLabel tone={isStretchRole ? 'warm' : 'neutral'}>Risk pattern</FieldLabel>
                            <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/80">{role.risk_pattern}</p>
                          </Panel>
                          <Panel className="bg-[#080A0D]/35 p-4">
                            <FieldLabel>Development note</FieldLabel>
                            <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/80">{role.development_note}</p>
                          </Panel>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="09_Pattern_Mechanics">
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.65rem] border border-[#32D6B0]/18 bg-[#32D6B0]/[0.055] p-6 md:p-7">
                  <FieldLabel tone="teal">{mechanics.mechanics_title}</FieldLabel>
                  <blockquote className="mt-5 text-2xl font-semibold leading-snug text-[#F5F1EA] md:text-3xl">
                    {mechanics.core_mechanism}
                  </blockquote>
                </div>
                <div className="grid gap-4">
                  <Panel>
                    <FieldLabel>Entry point</FieldLabel>
                    <p className="mt-3 text-sm leading-7 text-[#D8D0C3]/84">{mechanics.core_mechanism}</p>
                  </Panel>
                  <Panel>
                    <FieldLabel>Reward loop</FieldLabel>
                    <p className="mt-3 text-sm leading-7 text-[#D8D0C3]/84">{mechanics.why_it_shows_up}</p>
                  </Panel>
                  <Panel>
                    <FieldLabel>Protected condition</FieldLabel>
                    <p className="mt-3 text-sm leading-7 text-[#D8D0C3]/84">{mechanics.what_it_protects}</p>
                  </Panel>
                </div>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="10_Pattern_Synthesis">
              <div className="rounded-[1.85rem] border border-[#F5F1EA]/12 bg-[#171B22]/82 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.18)] md:p-8">
                <FieldLabel>Editorial centre</FieldLabel>
                <h3 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
                  {synthesis.synthesis_title}
                </h3>
                <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
                  <Panel className="border-[#32D6B0]/22 bg-[#32D6B0]/[0.06]">
                    <FieldLabel tone="teal">Gift</FieldLabel>
                    <p className="mt-4 text-lg font-semibold leading-7 text-[#F5F1EA]">{synthesis.gift}</p>
                  </Panel>
                  <Panel className="border-[#D99A66]/18 bg-[#D99A66]/[0.045]">
                    <FieldLabel tone="warm">Trap</FieldLabel>
                    <p className="mt-4 text-lg font-semibold leading-7 text-[#F5F1EA]">{synthesis.trap}</p>
                  </Panel>
                  <Panel className="border-[#F5F1EA]/12 bg-[#F5F1EA]/[0.045]">
                    <FieldLabel>Takeaway</FieldLabel>
                    <p className="mt-4 text-lg font-semibold leading-7 text-[#F5F1EA]">{synthesis.takeaway}</p>
                  </Panel>
                </div>
                <p className="mt-8 max-w-5xl text-lg leading-9 text-[#D8D0C3]/88">{synthesis.synthesis_text}</p>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="11_Strengths">
              <div className="grid gap-4 lg:grid-cols-3">
                {strengths.map((strength) => (
                  <Panel key={strength.strength_key} className="border-[#32D6B0]/18 bg-[#32D6B0]/[0.05]">
                    <div className="flex items-start justify-between gap-4">
                      <FieldLabel tone="teal">Priority {strength.priority}</FieldLabel>
                      <SignalKey>{strength.linked_signal_key}</SignalKey>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-[#F5F1EA]">{strength.strength_title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#D8D0C3]/84">{strength.strength_text}</p>
                  </Panel>
                ))}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="12_Narrowing">
              <div className="grid gap-4 lg:grid-cols-3">
                {narrowing.map((item) => (
                  <Panel key={item.narrowing_key} className="border-[#D99A66]/18 bg-[#D99A66]/[0.045]">
                    <div className="flex items-start justify-between gap-4">
                      <FieldLabel tone="warm">Priority {item.priority}</FieldLabel>
                      <SignalKey tone="warm">{item.missing_range_signal_key}</SignalKey>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-[#F5F1EA]">{item.narrowing_title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#D8D0C3]/84">{item.narrowing_text}</p>
                  </Panel>
                ))}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="13_Application">
              <div className="grid gap-4 lg:grid-cols-3">
                {application.map((item) => (
                  <Panel key={item.application_area} className="flex min-h-[17rem] flex-col justify-between">
                    <div>
                      <FieldLabel tone={item.application_area === 'watch_for' ? 'warm' : 'teal'}>
                        {applicationAreaLabels[item.application_area]}
                      </FieldLabel>
                      <p className="mt-5 text-base leading-8 text-[#D8D0C3]/86">{item.guidance_text}</p>
                    </div>
                    <SignalKey tone={item.application_area === 'watch_for' ? 'warm' : 'teal'}>{item.linked_signal_key}</SignalKey>
                  </Panel>
                ))}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="14_Closing_Integration">
              <div className="rounded-[1.85rem] border border-[#32D6B0]/24 bg-[linear-gradient(135deg,rgba(50,214,176,0.12),rgba(245,241,234,0.04))] p-6 md:p-8">
                <p className="max-w-4xl text-2xl font-semibold leading-9 text-[#F5F1EA]">
                  {closing.closing_summary}
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <Panel className="border-[#32D6B0]/18 bg-[#080A0D]/32">
                    <FieldLabel tone="teal">Core gift</FieldLabel>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/84">{closing.core_gift}</p>
                  </Panel>
                  <Panel className="border-[#D99A66]/18 bg-[#080A0D]/32">
                    <FieldLabel tone="warm">Core trap</FieldLabel>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/84">{closing.core_trap}</p>
                  </Panel>
                  <Panel className="bg-[#080A0D]/32">
                    <FieldLabel>Development edge</FieldLabel>
                    <p className="mt-3 text-sm leading-6 text-[#D8D0C3]/84">{closing.development_edge}</p>
                  </Panel>
                </div>
                <p className="mt-8 border-t border-[#F5F1EA]/10 pt-6 text-3xl font-semibold leading-tight text-[#F5F1EA] md:text-4xl">
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
