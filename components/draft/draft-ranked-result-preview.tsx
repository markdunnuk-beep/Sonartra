'use client';

import { useState, type ReactNode } from 'react';

import { DraftResultReadingRail } from '@/components/draft/draft-result-reading-rail';
import {
  rankedPatternExample,
  rankedPatternSectionOrder,
  validateRankedPatternExample,
} from '@/content/draft-result/ranked-pattern-example';

type DraftReadingMode = 'dark' | 'light';

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
      className="draft-section results-anchor-target scroll-mt-28 border-t border-[#F3F1EA]/[0.075] py-12 md:py-16"
      id={sectionAnchorIds[sectionKey]}
    >
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <h2 className="mt-3 text-[2rem] font-semibold leading-tight text-[#F3F1EA] md:text-[2.75rem]">
            {label}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function BodyText({ children }: { children: ReactNode }) {
  return <p className="draft-copy text-base leading-8 text-[#B8BDB7]/90">{children}</p>;
}

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cx('draft-panel rounded-[1.25rem] border border-[#F3F1EA]/[0.085] bg-[#1B211F]/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]', className)}>
      {children}
    </article>
  );
}

function FieldLabel({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'warm' }) {
  return (
    <p
      className={cx(
        'draft-field-label font-mono text-[0.68rem] uppercase tracking-[0.18em]',
        tone === 'teal' && 'text-[#32D6B0]/82',
        tone === 'warm' && 'text-[#C98E68]/88',
        tone === 'neutral' && 'text-[#A8B0AA]',
      )}
    >
      {children}
    </p>
  );
}

function ReadingModeIcon({ mode }: { mode: DraftReadingMode }) {
  if (mode === 'dark') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.64 5.64 4.22 4.22M19.78 19.78l-1.42-1.42M18.36 5.64l1.42-1.42M4.22 19.78l1.42-1.42"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M20.25 14.2A7.2 7.2 0 0 1 9.8 3.75 8.4 8.4 0 1 0 20.25 14.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function DraftReadingModeToggle({
  mode,
  onToggle,
}: {
  mode: DraftReadingMode;
  onToggle: () => void;
}) {
  const nextMode = mode === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextMode} reading mode`}
      aria-pressed={mode === 'light'}
      className="draft-reading-toggle sonartra-focus-ring inline-flex items-center gap-2 rounded-full border border-[#F3F1EA]/[0.11] bg-[#171D1A]/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#F3F1EA]/86 shadow-[0_14px_34px_rgba(4,7,6,0.16)] outline-none transition hover:border-[#32D6B0]/28 hover:bg-[#32D6B0]/[0.07] hover:text-[#F3F1EA] focus-visible:ring-2 focus-visible:ring-[#32D6B0]/55"
      onClick={onToggle}
    >
      <ReadingModeIcon mode={mode} />
      <span>{nextMode}</span>
    </button>
  );
}

function DraftPatternSignature() {
  return (
    <div
      className="draft-surface rounded-[1.5rem] border border-[#F3F1EA]/[0.085] bg-[#171D1A]/90 p-4 shadow-[0_24px_70px_rgba(4,7,6,0.18)] sm:p-5"
      data-draft-pattern-signature="true"
    >
      <div className="flex flex-col gap-3 border-b border-[#F3F1EA]/[0.085] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <FieldLabel tone="teal">Pattern signature</FieldLabel>
          <p className="mt-2 text-lg font-semibold text-[#F3F1EA]">Concentrated pattern</p>
        </div>
        <p className="max-w-[16rem] text-sm leading-6 text-[#A8B0AA]/82">First rank clearly anchors this result.</p>
      </div>

      <div className="mt-4 space-y-2.5">
        {prototypeScores.map(({ label, value, role, rank, tone }) => {
          const isPrimary = tone === 'primary';
          const fillClass =
            tone === 'stretch'
              ? 'bg-[linear-gradient(90deg,rgba(201,142,104,0.86),rgba(201,142,104,0.58))]'
              : tone === 'support'
                ? 'bg-[linear-gradient(90deg,rgba(139,196,181,0.82),rgba(139,196,181,0.5))]'
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
                'draft-signal-row grid gap-3 rounded-[1rem] border p-3 sm:grid-cols-[minmax(10rem,0.78fr)_minmax(10rem,1.2fr)_3.75rem] sm:items-center sm:p-3.5',
                isPrimary
                  ? 'border-[#32D6B0]/26 bg-[#32D6B0]/[0.075]'
                  : tone === 'stretch'
                    ? 'border-[#C98E68]/18 bg-[#C98E68]/[0.045]'
                    : 'border-[#F3F1EA]/[0.085] bg-[#202622]/45',
              )}
              key={label}
              role="meter"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cx(
                    'draft-rank-token flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs',
                    isPrimary
                      ? 'border-[#32D6B0]/32 bg-[#32D6B0]/12 text-[#F3F1EA]'
                      : 'border-[#F3F1EA]/12 bg-[#101312]/58 text-[#B8BDB7]/82',
                  )}
                >
                  {rank}
                </span>
                <div className="min-w-0">
                  <p className="draft-strong-text text-sm font-semibold leading-5 text-[#F3F1EA]">{label}</p>
                  <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#A8B0AA]">{role}</p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="draft-signature-track h-2 overflow-hidden rounded-full bg-[#0E1110]/85 ring-1 ring-[#F3F1EA]/[0.085]">
                  <div className={cx('h-full rounded-full shadow-[0_0_18px_rgba(50,214,176,0.18)]', fillClass)} style={{ width: `${value}%` }} />
                </div>
              </div>

              <p className={cx('draft-percent font-mono text-xl sm:text-right', isPrimary ? 'text-[#F3F1EA]' : 'text-[#B8BDB7]/90')}>
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

  const [readingMode, setReadingMode] = useState<DraftReadingMode>('dark');

  function toggleReadingMode() {
    const nextMode = readingMode === 'dark' ? 'light' : 'dark';

    setReadingMode(nextMode);
    window.dispatchEvent(
      new CustomEvent('sonartra-draft-result-reading-mode-change', {
        detail: { mode: nextMode },
      }),
    );
  }

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
    <div
      className="draft-result-shell relative isolate -mx-5 overflow-x-clip bg-[#101312] px-5 pb-16 pt-16 text-[#F3F1EA] sm:-mx-6 sm:px-6 md:pb-24 md:pt-20 lg:-mx-8 lg:px-8"
      data-reading-mode={readingMode}
      data-draft-result-preview="true"
    >
      <style>
        {`
          .draft-result-shell[data-reading-mode='light'] {
            background: #F4F1EA !important;
            color: #17201C !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-backdrop {
            background: linear-gradient(180deg, #F4F1EA 0%, #ECE7DC 34rem, #F7F4EE 100%) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-backdrop-glow {
            background:
              radial-gradient(circle at 16% 6%, rgba(38, 148, 128, 0.12), transparent 31%),
              radial-gradient(circle at 82% 8%, rgba(164, 101, 67, 0.11), transparent 30%),
              linear-gradient(180deg, rgba(244, 241, 234, 0) 0%, rgba(244, 241, 234, 0.58) 74%, rgba(244, 241, 234, 0) 100%) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-backdrop-grid {
            background-image:
              linear-gradient(rgba(23, 32, 28, 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(23, 32, 28, 0.026) 1px, transparent 1px) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-backdrop-ring {
            border-color: rgba(23, 32, 28, 0.055) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-backdrop-vignette {
            background: radial-gradient(circle at center, transparent 0%, transparent 62%, rgba(83, 74, 60, 0.11) 100%) !important;
          }

          .draft-result-shell[data-reading-mode='light'] :where(h1, h2, h3, h4, blockquote) {
            color: #17201C !important;
          }

          .draft-result-shell[data-reading-mode='light'] :where(p, dt, dd) {
            color: #5D6861 !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-section {
            border-color: rgba(23, 32, 28, 0.1) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-panel,
          .draft-result-shell[data-reading-mode='light'] .draft-surface {
            background: rgba(250, 248, 243, 0.86) !important;
            border-color: rgba(23, 32, 28, 0.105) !important;
            box-shadow: 0 18px 48px rgba(58, 51, 42, 0.055), inset 0 1px 0 rgba(255, 255, 255, 0.72) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-teal-surface {
            background: linear-gradient(135deg, rgba(38, 148, 128, 0.105), rgba(250, 248, 243, 0.76)) !important;
            border-color: rgba(38, 148, 128, 0.22) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-warm-surface {
            background: rgba(164, 101, 67, 0.078) !important;
            border-color: rgba(164, 101, 67, 0.2) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-field-label {
            color: #6B7770 !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-field-label.text-\\[\\#32D6B0\\]\\/82,
          .draft-result-shell[data-reading-mode='light'] .draft-field-label.text-\\[\\#32D6B0\\] {
            color: #137F70 !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-field-label.text-\\[\\#C98E68\\]\\/88 {
            color: #9A5D3E !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-reading-toggle {
            background: rgba(250, 248, 243, 0.88) !important;
            border-color: rgba(23, 32, 28, 0.16) !important;
            color: #17201C !important;
            box-shadow: 0 14px 34px rgba(58, 51, 42, 0.08) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-signature-track {
            background: rgba(23, 32, 28, 0.13) !important;
            box-shadow: inset 0 0 0 1px rgba(23, 32, 28, 0.08) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-signal-row {
            background: rgba(250, 248, 243, 0.72) !important;
            border-color: rgba(23, 32, 28, 0.1) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-rank-token {
            background: rgba(23, 32, 28, 0.055) !important;
            border-color: rgba(23, 32, 28, 0.12) !important;
            color: #17201C !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-percent,
          .draft-result-shell[data-reading-mode='light'] .draft-strong-text {
            color: #17201C !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-logo {
            filter: none !important;
            opacity: 0.8 !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-card {
            background: rgba(250, 248, 243, 0.78) !important;
            border-color: rgba(23, 32, 28, 0.1) !important;
            box-shadow: 0 16px 36px rgba(58, 51, 42, 0.08) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-rail-group-label {
            color: rgba(93, 104, 97, 0.72) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-item {
            color: rgba(23, 32, 28, 0.72) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-item span {
            color: rgba(23, 32, 28, 0.7) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-item:hover,
          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-item[aria-current='step'] {
            background: rgba(38, 148, 128, 0.08) !important;
            color: #17201C !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-item:hover span,
          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-item[aria-current='step'] span {
            color: #17201C !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-item[data-reading-state='next'] span {
            color: rgba(39, 50, 45, 0.78) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-marker {
            background: #F7F4EE !important;
            border-color: rgba(23, 32, 28, 0.16) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-reading-rail-item[aria-current='step'] .draft-reading-rail-marker {
            background: rgba(38, 148, 128, 0.2) !important;
            border-color: rgba(38, 148, 128, 0.34) !important;
            box-shadow: 0 0 0 5px rgba(38, 148, 128, 0.08) !important;
          }
        `}
      </style>
      <div
        aria-hidden="true"
        className="draft-backdrop pointer-events-none fixed inset-y-0 left-0 z-0 w-full max-w-full overflow-hidden bg-[linear-gradient(180deg,#101312_0%,#141816_34rem,#0E1110_100%)]"
      >
        <div className="draft-backdrop-glow absolute inset-0 bg-[radial-gradient(circle_at_16%_6%,rgba(50,214,176,0.075),transparent_31%),radial-gradient(circle_at_82%_8%,rgba(201,142,104,0.055),transparent_30%),linear-gradient(180deg,rgba(16,19,18,0)_0%,rgba(16,19,18,0.62)_74%,rgba(16,19,18,0)_100%)]" />
        <div className="draft-backdrop-grid absolute inset-x-[-8rem] top-0 h-[38rem] bg-[linear-gradient(rgba(243,241,234,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(243,241,234,0.009)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]" />
        <div className="draft-backdrop-ring absolute left-1/2 top-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-[#F3F1EA]/[0.024]" />
        <div className="draft-backdrop-vignette absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_58%,rgba(7,9,8,0.16)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="grid gap-8 py-8 md:py-12 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-end">
          <div className="max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-[#32D6B0]/24 bg-[#32D6B0]/[0.07] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                Prototype preview
              </span>
              <DraftReadingModeToggle mode={readingMode} onToggle={toggleReadingMode} />
            </div>

            <p className="mt-7 text-sm font-medium uppercase tracking-[0.18em] text-[#B8BDB7]/72">
              {context.domain_title}
            </p>
            <h1 className="mt-3 max-w-4xl text-5xl font-semibold leading-[1.02] text-[#F3F1EA] md:text-7xl">
              {recognition.headline}
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-8 text-[#B8BDB7]/95 md:text-2xl md:leading-10">
              {recognition.recognition_statement}
            </p>
          </div>

          <aside className="draft-surface rounded-[1.5rem] border border-[#F3F1EA]/[0.085] bg-[#171D1A]/82 p-5 shadow-[0_24px_80px_rgba(4,7,6,0.2)]">
            <FieldLabel tone="teal">Pattern snapshot</FieldLabel>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="draft-teal-surface rounded-[1rem] border border-[#32D6B0]/18 bg-[#32D6B0]/[0.06] p-4">
                <p className="draft-percent text-3xl font-semibold text-[#F3F1EA]">52%</p>
                <p className="mt-2 text-sm leading-5 text-[#B8BDB7]/88">Deep Focus</p>
              </div>
              <div className="draft-panel rounded-[1rem] border border-[#F3F1EA]/[0.085] bg-[#202622]/58 p-4">
                <p className="draft-percent text-3xl font-semibold text-[#F3F1EA]">26%</p>
                <p className="mt-2 text-sm leading-5 text-[#B8BDB7]/88">Creative Movement</p>
              </div>
            </div>
            <dl className="mt-4 space-y-3 border-t border-[#F3F1EA]/[0.085] pt-4">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-[#A8B0AA]">Pattern shape</dt>
                <dd className="font-mono text-sm text-[#F3F1EA]/88">{orientation.score_shape}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-[#A8B0AA]">Ranked spread</dt>
                <dd className="font-mono text-sm text-[#F3F1EA]/88">52 / 26 / 14 / 8</dd>
              </div>
            </dl>
          </aside>
        </header>

        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_11.75rem] xl:items-start">
          <article className="min-w-0">
            <SchemaSection sectionKey="05_Context">
              <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
                <Panel className="draft-teal-surface border-[#32D6B0]/18 bg-[#32D6B0]/[0.055]">
                  <FieldLabel tone="teal">Foundation</FieldLabel>
                  <h3 className="mt-4 text-3xl font-semibold text-[#F3F1EA]">{context.domain_title}</h3>
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
                <div className="draft-teal-surface rounded-[1.5rem] border border-[#32D6B0]/20 bg-[linear-gradient(135deg,rgba(50,214,176,0.085),rgba(243,241,234,0.032))] p-6 md:p-7">
                  <FieldLabel tone="teal">{orientation.orientation_title}</FieldLabel>
                  <p className="mt-5 text-2xl font-semibold leading-snug text-[#F3F1EA]">
                    {orientation.orientation_summary}
                  </p>
                  <div className="mt-6 border-t border-[#F3F1EA]/[0.085] pt-5">
                    <FieldLabel>Concentrated pattern</FieldLabel>
                    <p className="mt-3 text-base leading-8 text-[#B8BDB7]/92">{orientation.score_shape_summary}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-[1.18fr_1fr]">
                {[orientation.rank_1_phrase, orientation.rank_2_phrase, orientation.rank_3_phrase, orientation.rank_4_phrase].map(
                  (phrase, index) => (
                    <Panel
                      key={phrase}
                      className={cx(
                        index === 0 && 'draft-teal-surface border-[#32D6B0]/22 bg-[#32D6B0]/[0.06] md:row-span-2',
                        index === 3 && 'draft-warm-surface border-[#C98E68]/18 bg-[#C98E68]/[0.045]',
                      )}
                    >
                      <FieldLabel tone={index === 3 ? 'warm' : index === 0 ? 'teal' : 'neutral'}>
                        Rank {index + 1}
                      </FieldLabel>
                      <p className={cx('mt-3 leading-7 text-[#B8BDB7]/90', index === 0 ? 'text-xl md:text-2xl md:leading-9' : 'text-sm')}>
                        {phrase}
                      </p>
                    </Panel>
                  ),
                )}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="07_Recognition">
              <div className="draft-teal-surface rounded-[1.65rem] border border-[#32D6B0]/20 bg-[linear-gradient(135deg,rgba(50,214,176,0.085),rgba(243,241,234,0.032))] p-6 md:p-8">
                <FieldLabel tone="teal">{recognition.headline}</FieldLabel>
                <p className="mt-5 text-2xl font-semibold leading-snug text-[#F3F1EA] md:text-3xl">
                  {recognition.recognition_statement}
                </p>
                <p className="mt-6 max-w-4xl text-base leading-8 text-[#B8BDB7]/90">
                  {recognition.recognition_expansion}
                </p>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="08_Signal_Roles">
              <div className="space-y-4">
                {signalRoles.map((role) => {
                  const isPrimaryRole = role.rank_position === '1' || role.rank_position === '2';
                  const isStretchRole = role.rank_position === '4';

                  const isDominantRole = role.rank_position === '1';

                  return (
                    <article
                      className={cx(
                        'grid gap-5 rounded-[1.35rem] border p-5 md:p-6',
                        isDominantRole && 'draft-teal-surface border-[#32D6B0]/26 bg-[#32D6B0]/[0.07] md:grid-cols-[12rem_minmax(0,1fr)] md:p-7',
                        role.rank_position === '2' && 'draft-teal-surface border-[#32D6B0]/18 bg-[#32D6B0]/[0.045] md:grid-cols-[11rem_minmax(0,1fr)]',
                        role.rank_position === '3' && 'draft-panel border-[#F3F1EA]/[0.085] bg-[#202622]/50 md:grid-cols-[9.5rem_minmax(0,1fr)]',
                        isStretchRole && 'draft-warm-surface border-[#C98E68]/18 bg-[#C98E68]/[0.045] md:grid-cols-[9.5rem_minmax(0,1fr)]',
                      )}
                      key={role.signal_key}
                    >
                      <div>
                        <span className="draft-rank-token flex h-12 w-12 items-center justify-center rounded-full border border-[#F3F1EA]/12 bg-[#101312]/62 font-mono text-lg text-[#F3F1EA]">
                          {role.rank_position}
                        </span>
                        <FieldLabel tone={isStretchRole ? 'warm' : isPrimaryRole ? 'teal' : 'neutral'}>
                          {signalRoleLabels[role.rank_role]}
                        </FieldLabel>
                        <h3 className="mt-3 text-xl font-semibold text-[#F3F1EA]">{role.signal_label}</h3>
                      </div>
                      <div>
                        <h4 className={cx('font-semibold text-[#F3F1EA]/94', isDominantRole ? 'text-2xl' : 'text-xl')}>{role.title}</h4>
                        <p className="mt-3 text-base leading-8 text-[#B8BDB7]/90">{role.description}</p>
                        <div className="mt-5 grid gap-3 lg:grid-cols-3">
                          <Panel className="bg-[#151A18]/78 p-4">
                            <FieldLabel>At its best</FieldLabel>
                            <p className="mt-3 text-sm leading-6 text-[#B8BDB7]/88">{role.productive_expression}</p>
                          </Panel>
                          <Panel className="bg-[#151A18]/78 p-4">
                            <FieldLabel tone={isStretchRole ? 'warm' : 'neutral'}>Risk pattern</FieldLabel>
                            <p className="mt-3 text-sm leading-6 text-[#B8BDB7]/88">{role.risk_pattern}</p>
                          </Panel>
                          <Panel className="bg-[#151A18]/78 p-4">
                            <FieldLabel>Development note</FieldLabel>
                            <p className="mt-3 text-sm leading-6 text-[#B8BDB7]/88">{role.development_note}</p>
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
                <div className="draft-teal-surface rounded-[1.65rem] border border-[#32D6B0]/18 bg-[#32D6B0]/[0.055] p-6 md:p-7">
                  <FieldLabel tone="teal">{mechanics.mechanics_title}</FieldLabel>
                  <blockquote className="mt-5 text-2xl font-semibold leading-snug text-[#F3F1EA] md:text-3xl">
                    {mechanics.core_mechanism}
                  </blockquote>
                </div>
                <div className="grid gap-4">
                  <Panel>
                    <FieldLabel>Reward loop</FieldLabel>
                    <p className="mt-3 text-sm leading-7 text-[#B8BDB7]/90">{mechanics.why_it_shows_up}</p>
                  </Panel>
                  <Panel>
                    <FieldLabel>Protected condition</FieldLabel>
                    <p className="mt-3 text-sm leading-7 text-[#B8BDB7]/90">{mechanics.what_it_protects}</p>
                  </Panel>
                </div>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="10_Pattern_Synthesis">
              <div className="draft-surface rounded-[1.85rem] border border-[#F3F1EA]/[0.09] bg-[#1B211F]/84 p-6 shadow-[0_30px_90px_rgba(4,7,6,0.16)] md:p-8">
                <FieldLabel>Editorial centre</FieldLabel>
                <h3 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-[#F3F1EA] md:text-4xl">
                  {synthesis.synthesis_title}
                </h3>
                <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
                  <Panel className="draft-teal-surface border-[#32D6B0]/22 bg-[#32D6B0]/[0.06]">
                    <FieldLabel tone="teal">Gift</FieldLabel>
                    <p className="mt-4 text-lg font-semibold leading-7 text-[#F3F1EA]">{synthesis.gift}</p>
                  </Panel>
                  <Panel className="draft-warm-surface border-[#C98E68]/18 bg-[#C98E68]/[0.045]">
                    <FieldLabel tone="warm">Trap</FieldLabel>
                    <p className="mt-4 text-lg font-semibold leading-7 text-[#F3F1EA]">{synthesis.trap}</p>
                  </Panel>
                  <Panel className="border-[#F3F1EA]/[0.09] bg-[#202622]/58">
                    <FieldLabel>Takeaway</FieldLabel>
                    <p className="mt-4 text-lg font-semibold leading-7 text-[#F3F1EA]">{synthesis.takeaway}</p>
                  </Panel>
                </div>
                <p className="mt-8 max-w-5xl text-lg leading-9 text-[#B8BDB7]/94">{synthesis.synthesis_text}</p>
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="11_Strengths">
              <div className="grid gap-4 lg:grid-cols-3">
                {strengths.map((strength) => (
                  <Panel key={strength.strength_key} className="draft-teal-surface border-[#32D6B0]/18 bg-[#32D6B0]/[0.05]">
                    <FieldLabel tone="teal">Priority {strength.priority}</FieldLabel>
                    <h3 className="mt-4 text-xl font-semibold text-[#F3F1EA]">{strength.strength_title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#B8BDB7]/90">{strength.strength_text}</p>
                  </Panel>
                ))}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="12_Narrowing">
              <div className="grid gap-4 lg:grid-cols-3">
                {narrowing.map((item) => (
                  <Panel key={item.narrowing_key} className="draft-warm-surface border-[#C98E68]/18 bg-[#C98E68]/[0.045]">
                    <FieldLabel tone="warm">Priority {item.priority}</FieldLabel>
                    <h3 className="mt-4 text-xl font-semibold text-[#F3F1EA]">{item.narrowing_title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#B8BDB7]/90">{item.narrowing_text}</p>
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
                      <p className="mt-5 text-base leading-8 text-[#B8BDB7]/92">{item.guidance_text}</p>
                    </div>
                  </Panel>
                ))}
              </div>
            </SchemaSection>

            <SchemaSection sectionKey="14_Closing_Integration">
              <div className="draft-teal-surface rounded-[1.85rem] border border-[#32D6B0]/22 bg-[linear-gradient(135deg,rgba(50,214,176,0.09),rgba(243,241,234,0.035))] p-6 md:p-8">
                <p className="max-w-4xl text-2xl font-semibold leading-9 text-[#F3F1EA]">
                  {closing.closing_summary}
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <Panel className="draft-teal-surface border-[#32D6B0]/18 bg-[#151A18]/70">
                    <FieldLabel tone="teal">Core gift</FieldLabel>
                    <p className="mt-3 text-sm leading-6 text-[#B8BDB7]/90">{closing.core_gift}</p>
                  </Panel>
                  <Panel className="draft-warm-surface border-[#C98E68]/18 bg-[#151A18]/70">
                    <FieldLabel tone="warm">Core trap</FieldLabel>
                    <p className="mt-3 text-sm leading-6 text-[#B8BDB7]/90">{closing.core_trap}</p>
                  </Panel>
                  <Panel className="bg-[#151A18]/70">
                    <FieldLabel>Development edge</FieldLabel>
                    <p className="mt-3 text-sm leading-6 text-[#B8BDB7]/90">{closing.development_edge}</p>
                  </Panel>
                </div>
                <p className="mt-8 border-t border-[#F3F1EA]/[0.085] pt-6 text-3xl font-semibold leading-tight text-[#F3F1EA] md:text-4xl">
                  {closing.memorable_line}
                </p>
              </div>
            </SchemaSection>
          </article>

          <DraftResultReadingRail readingMode={readingMode} sections={draftResultRailSections} />
        </div>
      </div>
    </div>
  );
}
