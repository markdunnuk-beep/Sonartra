'use client';

import { useEffect, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import {
  DRAFT_FOCUS_MODE_CHANGE_EVENT,
  DRAFT_READING_MODE_CHANGE_EVENT,
  type DraftReadingMode,
} from '@/components/draft/draft-display-mode-events';
import { DraftReadingModeToggle } from '@/components/draft/draft-reading-mode-toggle';
import { DraftMobileSectionNavigator } from '@/components/draft/draft-mobile-section-navigator';
import {
  DraftResultReadingRail,
  type DraftResultRailSection,
} from '@/components/draft/draft-result-reading-rail';
import { isRankedPatternRenderablePayload } from '@/lib/results/ranked-pattern-renderable';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

type RecordValue = Record<string, unknown>;

type RankedSignalDisplay = {
  signalKey: string;
  signalLabel: string;
  rank: number;
  rawScore: number;
  normalizedPercentage: number;
};

type PayloadSection = {
  lookupKey?: string;
  fieldValues: RecordValue;
};

type PayloadListItem = PayloadSection & {
  itemKey?: string;
  signalKey?: string;
  rankPosition?: number;
  priority?: number;
};

type Tone = 'teal' | 'warm' | 'neutral';

const rankedPatternSections = [
  { id: 'context', label: 'Introduction' },
  { id: 'orientation', label: 'Pattern at a Glance' },
  { id: 'recognition', label: 'Core Interpretation' },
  { id: 'signal-roles', label: 'Signal Profile' },
  { id: 'pattern-mechanics', label: 'What Shapes This Pattern' },
  { id: 'pattern-synthesis', label: 'How the Pattern Works' },
  { id: 'strengths', label: 'What Comes Easily' },
  { id: 'narrowing', label: 'Where It Can Narrow' },
  { id: 'application', label: 'How to Use It' },
  { id: 'closing-integration', label: 'Take Forward' },
] as const satisfies readonly DraftResultRailSection[];

const signatureRoleLabelsByRank = ['Main route', 'Adds energy', 'Support', 'Use deliberately'] as const;
const signatureTonesByRank = ['primary', 'secondary', 'support', 'stretch'] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(record: RecordValue, ...keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function toLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}

function fieldEntries(fieldValues: RecordValue): readonly [string, string][] {
  return Object.entries(fieldValues)
    .filter((entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].trim().length > 0,
    );
}

function fieldTitle(fieldValues: RecordValue): string | null {
  return readText(
    fieldValues,
    'headline',
    'title',
    'section_title',
    'orientation_title',
    'recognition_headline',
    'synthesis_title',
    'mechanics_title',
  );
}

function fieldBodyEntries(fieldValues: RecordValue): readonly [string, string][] {
  const title = fieldTitle(fieldValues);
  return fieldEntries(fieldValues).filter(([, value]) => value !== title);
}

function formatScoreShape(value: string): string {
  return `${toLabel(value)} pattern`;
}

function formatResultDate(value: string | null | undefined): string {
  if (!value) {
    return 'No completion date';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function FieldLabel({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
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

function Panel({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'article'>, 'children' | 'className'>) {
  return (
    <article
      {...props}
      className={cx('draft-panel rounded-[1.25rem] border border-[#F3F1EA]/[0.085] bg-[#1B211F]/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]', className)}
    >
      {children}
    </article>
  );
}

function BodyText({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('draft-copy text-base leading-8 text-[#B8BDB7]/90', className)}>{children}</p>;
}

function SchemaSection({
  children,
  id,
  label,
}: {
  children: ReactNode;
  id: string;
  label: string;
}) {
  return (
    <section
      className="draft-section results-anchor-target scroll-mt-28 border-t border-[#F3F1EA]/[0.075] py-12 md:py-16"
      data-ranked-pattern-section={id}
      id={id}
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

function DraftPatternSignature({ signals }: { signals: readonly RankedSignalDisplay[] }) {
  return (
    <div
      className="draft-surface rounded-[1.5rem] border border-[#F3F1EA]/[0.085] bg-[#171D1A]/90 p-4 shadow-[0_24px_70px_rgba(4,7,6,0.18)] sm:p-5"
      data-ranked-pattern-signal-distribution="true"
    >
      <div className="flex flex-col gap-3 border-b border-[#F3F1EA]/[0.085] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <FieldLabel tone="teal">Pattern signature</FieldLabel>
          <p className="mt-2 text-lg font-semibold text-[#F3F1EA]">Ranked signal distribution</p>
        </div>
        <p className="max-w-[16rem] text-sm leading-6 text-[#A8B0AA]/82">
          The first signal is the clearest starting point.
        </p>
      </div>

      <div className="mt-4 space-y-2.5">
        {signals.map((signal, index) => {
          const tone = signatureTonesByRank[index] ?? 'support';
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
              aria-label={`${signal.signalLabel}, rank ${signal.rank}, ${signatureRoleLabelsByRank[index] ?? 'Support'}, ${signal.normalizedPercentage}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={signal.normalizedPercentage}
              className={cx(
                'draft-signal-row grid gap-3 rounded-[1rem] border p-3 sm:grid-cols-[minmax(10rem,0.78fr)_minmax(10rem,1.2fr)_3.75rem] sm:items-center sm:p-3.5',
                isPrimary
                  ? 'border-[#32D6B0]/26 bg-[#32D6B0]/[0.075]'
                  : tone === 'stretch'
                    ? 'border-[#C98E68]/18 bg-[#C98E68]/[0.045]'
                    : 'border-[#F3F1EA]/[0.085] bg-[#202622]/45',
              )}
              key={signal.signalKey}
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
                  {signal.rank}
                </span>
                <div className="min-w-0">
                  <p className="draft-strong-text text-sm font-semibold leading-5 text-[#F3F1EA]">{signal.signalLabel}</p>
                  <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#A8B0AA]">
                    {signatureRoleLabelsByRank[index] ?? 'Support'}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="draft-signature-track h-2 overflow-hidden rounded-full bg-[#0E1110]/85 ring-1 ring-[#F3F1EA]/[0.085]">
                  <div className={cx('h-full rounded-full shadow-[0_0_18px_rgba(50,214,176,0.18)]', fillClass)} style={{ width: `${signal.normalizedPercentage}%` }} />
                </div>
              </div>

              <p className={cx('draft-percent font-mono text-xl sm:text-right', isPrimary ? 'text-[#F3F1EA]' : 'text-[#B8BDB7]/90')}>
                {signal.normalizedPercentage}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sectionTextGrid(section: PayloadSection) {
  const title = fieldTitle(section.fieldValues);
  const bodyEntries = fieldBodyEntries(section.fieldValues);

  return { title, bodyEntries };
}

function ContextSection({ section, domainLabel }: { section: PayloadSection; domainLabel: string }) {
  const { title, bodyEntries } = sectionTextGrid(section);

  return (
    <SchemaSection id="context" label="Introduction">
      <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <Panel className="draft-teal-surface border-[#32D6B0]/18 bg-[#32D6B0]/[0.055]">
          <FieldLabel tone="teal">Foundation</FieldLabel>
          <h3 className="mt-4 text-3xl font-semibold text-[#F3F1EA]">{title ?? domainLabel}</h3>
        </Panel>
        <div className="grid gap-4 md:grid-cols-3">
          {bodyEntries.slice(0, 3).map(([key, value]) => (
            <Panel key={key}>
              <FieldLabel>{toLabel(key)}</FieldLabel>
              <div className="mt-3">
                <BodyText>{value}</BodyText>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </SchemaSection>
  );
}

function OrientationSection({
  scoreShape,
  section,
  signals,
}: {
  scoreShape: string;
  section: PayloadSection;
  signals: readonly RankedSignalDisplay[];
}) {
  const { title, bodyEntries } = sectionTextGrid(section);

  return (
    <SchemaSection id="orientation" label="Pattern at a Glance">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <DraftPatternSignature signals={signals} />
        <div className="draft-teal-surface rounded-[1.5rem] border border-[#32D6B0]/20 bg-[linear-gradient(135deg,rgba(50,214,176,0.085),rgba(243,241,234,0.032))] p-6 md:p-7">
          <FieldLabel tone="teal">{title ?? 'Pattern orientation'}</FieldLabel>
          {bodyEntries[0] ? (
            <p className="mt-5 text-2xl font-semibold leading-snug text-[#F3F1EA]">
              {bodyEntries[0][1]}
            </p>
          ) : null}
          <div className="mt-6 border-t border-[#F3F1EA]/[0.085] pt-5">
            <FieldLabel>{formatScoreShape(scoreShape)}</FieldLabel>
            {bodyEntries.slice(1).map(([key, value]) => (
              <BodyText className="mt-3" key={key}>{value}</BodyText>
            ))}
          </div>
        </div>
      </div>
    </SchemaSection>
  );
}

function RecognitionSection({ section }: { section: PayloadSection }) {
  const { title, bodyEntries } = sectionTextGrid(section);

  return (
    <SchemaSection id="recognition" label="Core Interpretation">
      <div className="draft-teal-surface rounded-[1.65rem] border border-[#32D6B0]/20 bg-[linear-gradient(135deg,rgba(50,214,176,0.085),rgba(243,241,234,0.032))] p-6 md:p-8">
        <FieldLabel tone="teal">{title ?? 'Recognition'}</FieldLabel>
        {bodyEntries[0] ? (
          <p className="mt-5 text-2xl font-semibold leading-snug text-[#F3F1EA] md:text-3xl">
            {bodyEntries[0][1]}
          </p>
        ) : null}
        {bodyEntries.slice(1).map(([key, value]) => (
          <p className="mt-6 max-w-4xl text-base leading-8 text-[#B8BDB7]/90" key={key}>
            {value}
          </p>
        ))}
      </div>
    </SchemaSection>
  );
}

function SignalRolesSection({ items }: { items: readonly PayloadListItem[] }) {
  const orderedItems = [...items].sort(
    (left, right) => (left.rankPosition ?? 0) - (right.rankPosition ?? 0),
  );

  return (
    <SchemaSection id="signal-roles" label="Signal Profile">
      <div className="space-y-4">
        {orderedItems.map((item, index) => {
          const { title, bodyEntries } = sectionTextGrid(item);
          const isPrimaryRole = index === 0 || index === 1;
          const isDominantRole = index === 0;
          const isStretchRole = index === 3;
          const fieldGroups = bodyEntries.slice(0, 3);

          return (
            <article
              className={cx(
                'grid gap-5 rounded-[1.35rem] border p-5 md:grid-cols-[10.75rem_minmax(0,1fr)] md:items-stretch md:p-6',
                isDominantRole && 'draft-teal-surface border-[#32D6B0]/26 bg-[#32D6B0]/[0.07]',
                index === 1 && 'draft-teal-surface border-[#32D6B0]/18 bg-[#32D6B0]/[0.045]',
                index === 2 && 'draft-panel border-[#F3F1EA]/[0.085] bg-[#202622]/50',
                isStretchRole && 'draft-warm-surface border-[#C98E68]/18 bg-[#C98E68]/[0.045]',
              )}
              data-ranked-pattern-signal-role-group="true"
              key={item.lookupKey ?? `${item.signalKey}-${item.rankPosition}`}
            >
              <div>
                <span className="draft-rank-token flex h-12 w-12 items-center justify-center rounded-full border border-[#F3F1EA]/12 bg-[#101312]/62 font-mono text-lg text-[#F3F1EA]">
                  {item.rankPosition ?? index + 1}
                </span>
                <FieldLabel tone={isStretchRole ? 'warm' : isPrimaryRole ? 'teal' : 'neutral'}>
                  {signatureRoleLabelsByRank[index] ?? 'Support'}
                </FieldLabel>
                {item.signalKey ? (
                  <h3 className="mt-3 text-xl font-semibold text-[#F3F1EA]">{toLabel(item.signalKey)}</h3>
                ) : null}
              </div>
              <div>
                {title ? (
                  <h4 className={cx('font-semibold text-[#F3F1EA]/94', isDominantRole ? 'text-2xl' : 'text-xl')}>
                    {title}
                  </h4>
                ) : null}
                <div className="mt-5 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
                  {fieldGroups.map(([key, value], fieldIndex) => (
                    <Panel
                      className="flex h-full min-h-[7.5rem] flex-col bg-[#151A18]/78 p-4"
                      data-ranked-pattern-signal-role-card="true"
                      key={key}
                    >
                      <FieldLabel tone={fieldIndex === 1 && isStretchRole ? 'warm' : 'neutral'}>
                        {fieldIndex === 0 ? 'What this helps' : fieldIndex === 1 ? 'Watch for' : 'Try this'}
                      </FieldLabel>
                      <p className="mt-3 text-sm leading-6 text-[#B8BDB7]/88">{value}</p>
                    </Panel>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </SchemaSection>
  );
}

function MechanicsSection({ section }: { section: PayloadSection }) {
  const { title, bodyEntries } = sectionTextGrid(section);

  return (
    <SchemaSection id="pattern-mechanics" label="What Shapes This Pattern">
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="draft-teal-surface rounded-[1.65rem] border border-[#32D6B0]/18 bg-[#32D6B0]/[0.055] p-6 md:p-7">
          <FieldLabel tone="teal">{title ?? 'Pattern mechanics'}</FieldLabel>
          {bodyEntries[0] ? (
            <blockquote className="mt-5 text-2xl font-semibold leading-snug text-[#F3F1EA] md:text-3xl">
              {bodyEntries[0][1]}
            </blockquote>
          ) : null}
        </div>
        <div className="grid gap-4">
          {bodyEntries.slice(1).map(([key, value]) => (
            <Panel key={key}>
              <FieldLabel>{toLabel(key)}</FieldLabel>
              <p className="mt-3 text-sm leading-7 text-[#B8BDB7]/90">{value}</p>
            </Panel>
          ))}
        </div>
      </div>
    </SchemaSection>
  );
}

function SynthesisSection({ section }: { section: PayloadSection }) {
  const { title, bodyEntries } = sectionTextGrid(section);

  return (
    <SchemaSection id="pattern-synthesis" label="How the Pattern Works">
      <div className="draft-surface rounded-[1.85rem] border border-[#F3F1EA]/[0.09] bg-[#1B211F]/84 p-6 shadow-[0_30px_90px_rgba(4,7,6,0.16)] md:p-8">
        <FieldLabel>Editorial centre</FieldLabel>
        {title ? (
          <h3 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-[#F3F1EA] md:text-4xl">
            {title}
          </h3>
        ) : null}
        <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
          {bodyEntries.slice(0, 3).map(([key, value], index) => (
            <Panel
              className={cx(
                index === 0 && 'draft-teal-surface border-[#32D6B0]/22 bg-[#32D6B0]/[0.06]',
                index === 1 && 'draft-warm-surface border-[#C98E68]/18 bg-[#C98E68]/[0.045]',
                index === 2 && 'border-[#F3F1EA]/[0.09] bg-[#202622]/58',
              )}
              key={key}
            >
              <FieldLabel tone={index === 0 ? 'teal' : index === 1 ? 'warm' : 'neutral'}>
                {toLabel(key)}
              </FieldLabel>
              <p className="mt-4 text-lg font-semibold leading-7 text-[#F3F1EA]">{value}</p>
            </Panel>
          ))}
        </div>
        {bodyEntries.slice(3).map(([key, value]) => (
          <p className="mt-8 max-w-5xl text-lg leading-9 text-[#B8BDB7]/94" key={key}>{value}</p>
        ))}
      </div>
    </SchemaSection>
  );
}

function ListSection({
  id,
  items,
  label,
  tone,
}: {
  id: string;
  items: readonly PayloadListItem[];
  label: string;
  tone: Tone;
}) {
  return (
    <SchemaSection id={id} label={label}>
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((item, index) => {
          const { title, bodyEntries } = sectionTextGrid(item);
          return (
            <Panel
              key={item.itemKey ?? item.lookupKey ?? `${id}-${index}`}
              className={cx(
                tone === 'teal' && 'draft-teal-surface border-[#32D6B0]/18 bg-[#32D6B0]/[0.05]',
                tone === 'warm' && 'draft-warm-surface border-[#C98E68]/18 bg-[#C98E68]/[0.045]',
                id === 'application' && 'flex min-h-[17rem] flex-col justify-between',
              )}
            >
              <FieldLabel tone={tone}>{item.priority ? `Priority ${item.priority}` : toLabel(id)}</FieldLabel>
              {title ? <h3 className="mt-4 text-xl font-semibold text-[#F3F1EA]">{title}</h3> : null}
              {bodyEntries.map(([key, value]) => (
                <p className="mt-3 text-sm leading-7 text-[#B8BDB7]/90" key={key}>{value}</p>
              ))}
            </Panel>
          );
        })}
      </div>
    </SchemaSection>
  );
}

function ClosingSection({ section }: { section: PayloadSection }) {
  const { title, bodyEntries } = sectionTextGrid(section);
  const memorableLine = readText(section.fieldValues, 'memorableLine', 'memorable_line');
  const supportingEntries = bodyEntries.filter(([, value]) => value !== memorableLine);

  return (
    <SchemaSection id="closing-integration" label="Take Forward">
      <div className="draft-teal-surface rounded-[1.85rem] border border-[#32D6B0]/22 bg-[linear-gradient(135deg,rgba(50,214,176,0.09),rgba(243,241,234,0.035))] p-6 md:p-8">
        {title ? (
          <p className="max-w-4xl text-2xl font-semibold leading-9 text-[#F3F1EA]">
            {title}
          </p>
        ) : null}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {supportingEntries.slice(0, 3).map(([key, value], index) => (
            <Panel
              className={cx(
                'bg-[#151A18]/70',
                index === 0 && 'draft-teal-surface border-[#32D6B0]/18',
                index === 1 && 'draft-warm-surface border-[#C98E68]/18',
              )}
              key={key}
            >
              <FieldLabel tone={index === 0 ? 'teal' : index === 1 ? 'warm' : 'neutral'}>
                {toLabel(key)}
              </FieldLabel>
              <p className="mt-3 text-sm leading-6 text-[#B8BDB7]/90">{value}</p>
            </Panel>
          ))}
        </div>
        {memorableLine ? (
          <p className="mt-8 border-t border-[#F3F1EA]/[0.085] pt-6 text-3xl font-semibold leading-tight text-[#F3F1EA] md:text-4xl">
            {memorableLine}
          </p>
        ) : null}
      </div>
    </SchemaSection>
  );
}

function UnreadableRankedPatternResult() {
  return (
    <div className="draft-result-shell relative isolate -mx-5 overflow-x-clip bg-[#101312] px-5 pb-16 pt-16 text-[#F3F1EA] sm:-mx-6 sm:px-6 md:pb-24 md:pt-20 lg:-mx-8 lg:px-8">
      <section className="relative z-10 mx-auto max-w-[48rem] rounded-[1.35rem] border border-[#F3F1EA]/[0.085] bg-[#1B211F]/72 p-6">
        <FieldLabel tone="warm">Result unavailable</FieldLabel>
        <h1 className="mt-2 text-[1.7rem] font-semibold text-[#F3F1EA]">
          This ranked-pattern result cannot be displayed.
        </h1>
        <BodyText className="mt-3">
          The persisted canonical result payload is missing one or more required reader-first sections.
        </BodyText>
      </section>
    </div>
  );
}

export function RankedPatternResultReport({ payload }: { payload: SingleDomainResultPayload }) {
  const [focusMode, setFocusMode] = useState(false);
  const [readingMode, setReadingMode] = useState<DraftReadingMode>('dark');

  function toggleReadingMode() {
    const nextMode = readingMode === 'dark' ? 'light' : 'dark';

    setReadingMode(nextMode);
    window.dispatchEvent(
      new CustomEvent(DRAFT_READING_MODE_CHANGE_EVENT, {
        detail: { mode: nextMode },
      }),
    );
  }

  function setResultFocusMode(nextFocusMode: boolean) {
    setFocusMode(nextFocusMode);
    window.dispatchEvent(
      new CustomEvent(DRAFT_FOCUS_MODE_CHANGE_EVENT, {
        detail: { focusMode: nextFocusMode },
      }),
    );
  }

  function toggleFocusMode() {
    setResultFocusMode(!focusMode);
  }

  useEffect(() => {
    if (!focusMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setResultFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusMode]);

  if (!isRankedPatternRenderablePayload(payload)) {
    return <UnreadableRankedPatternResult />;
  }

  const rankedSignals = payload.rankedSignals as readonly RankedSignalDisplay[];
  const topSignal = rankedSignals[0]!;
  const scoreShape = payload.scoreShape!.value;
  const domain: RecordValue = isRecord(payload.domain) ? payload.domain : {};
  const attempt: RecordValue = isRecord(payload.attempt) ? payload.attempt : {};
  const diagnostics: RecordValue = isRecord(payload.diagnostics) ? payload.diagnostics : {};
  const domainLabel = readText(domain, 'label', 'title', 'domainLabel')
    ?? payload.metadata.domainKey;
  const orientation = payload.orientation as PayloadSection;
  const recognition = payload.recognition as PayloadSection;
  const recognitionTitle = fieldTitle(recognition.fieldValues);
  const recognitionLead = fieldBodyEntries(recognition.fieldValues)[0]?.[1]
    ?? fieldTitle(orientation.fieldValues)
    ?? `${topSignal.signalLabel} leads the current pattern.`;
  const answeredCount = typeof attempt.answeredQuestionCount === 'number'
    ? attempt.answeredQuestionCount
    : typeof diagnostics.answeredQuestionCount === 'number'
      ? diagnostics.answeredQuestionCount
      : null;
  const totalCount = typeof attempt.totalQuestionCount === 'number'
    ? attempt.totalQuestionCount
    : typeof diagnostics.totalQuestionCount === 'number'
      ? diagnostics.totalQuestionCount
      : null;

  return (
    <div
      className="draft-result-shell relative isolate -mx-5 overflow-x-clip bg-[#101312] px-5 pb-16 pt-16 text-[#F3F1EA] sm:-mx-6 sm:px-6 md:pb-24 md:pt-20 lg:-mx-8 lg:px-8"
      data-focus-mode={focusMode ? 'true' : 'false'}
      data-reading-mode={readingMode}
      data-ranked-pattern-result="true"
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

          .draft-result-shell[data-reading-mode='light'] .draft-reading-toggle,
          .draft-result-shell[data-reading-mode='light'] .draft-focus-toggle {
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

          .draft-result-shell[data-reading-mode='light'] .draft-mobile-section-nav-card {
            background: rgba(250, 248, 243, 0.9) !important;
            border-color: rgba(23, 32, 28, 0.12) !important;
            box-shadow: 0 18px 42px rgba(58, 51, 42, 0.1) !important;
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

          .draft-result-shell[data-reading-mode='light'] .draft-mobile-section-kicker {
            color: #137F70 !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-mobile-section-current,
          .draft-result-shell[data-reading-mode='light'] .draft-mobile-section-link[aria-current='step'] {
            color: #17201C !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-mobile-section-button-label,
          .draft-result-shell[data-reading-mode='light'] .draft-mobile-section-link {
            color: rgba(39, 50, 45, 0.78) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-mobile-section-panel {
            border-color: rgba(23, 32, 28, 0.1) !important;
          }

          .draft-result-shell[data-reading-mode='light'] .draft-mobile-section-link:hover,
          .draft-result-shell[data-reading-mode='light'] .draft-mobile-section-link[aria-current='step'] {
            background: rgba(38, 148, 128, 0.08) !important;
            border-color: rgba(38, 148, 128, 0.22) !important;
          }

          @media (min-width: 1280px) {
            .draft-result-shell[data-focus-mode='true'] {
              padding-top: 2rem !important;
            }

            .draft-result-shell[data-focus-mode='true'] .draft-result-header {
              padding-top: 1.5rem !important;
            }

            .draft-result-shell[data-focus-mode='true'] .draft-result-mobile-toggle {
              display: none !important;
            }

            .draft-result-shell[data-focus-mode='true'] .draft-result-article-grid {
              grid-template-columns: minmax(0, 1fr) 11.75rem !important;
              max-width: 76rem;
              margin-left: auto;
              margin-right: auto;
            }
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
        <DraftMobileSectionNavigator sections={rankedPatternSections} />

        <header className="draft-result-header grid gap-8 py-8 md:py-12 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-end">
          <div className="max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-[#32D6B0]/24 bg-[#32D6B0]/[0.07] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
                Sonartra result
              </span>
              <DraftReadingModeToggle
                className="draft-result-mobile-toggle xl:hidden"
                mode={readingMode}
                onToggle={toggleReadingMode}
              />
            </div>

            <p className="mt-7 text-sm font-medium uppercase tracking-[0.18em] text-[#B8BDB7]/72">
              {domainLabel}
            </p>
            <h1 className="mt-3 max-w-4xl text-5xl font-semibold leading-[1.02] text-[#F3F1EA] md:text-7xl">
              {recognitionTitle ?? `${topSignal.signalLabel} leads the current pattern`}
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-8 text-[#B8BDB7]/95 md:text-2xl md:leading-10">
              {recognitionLead}
            </p>
          </div>

          <aside
            className="draft-surface rounded-[1.5rem] border border-[#F3F1EA]/[0.085] bg-[#171D1A]/82 p-5 shadow-[0_24px_80px_rgba(4,7,6,0.2)]"
            data-ranked-pattern-snapshot="true"
          >
            <FieldLabel tone="teal">Pattern snapshot</FieldLabel>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {rankedSignals.slice(0, 4).map((signal, index) => (
                <div
                  className={cx(
                    'min-w-0 rounded-[1rem] border p-3.5 sm:p-4',
                    index === 0
                      ? 'draft-teal-surface border-[#32D6B0]/22 bg-[#32D6B0]/[0.075]'
                      : index === 1
                        ? 'draft-teal-surface border-[#32D6B0]/16 bg-[#32D6B0]/[0.045]'
                        : index === 3
                          ? 'draft-warm-surface border-[#C98E68]/16 bg-[#C98E68]/[0.042]'
                          : 'draft-panel border-[#F3F1EA]/[0.085] bg-[#202622]/58',
                  )}
                  data-ranked-pattern-snapshot-card="true"
                  key={signal.signalKey}
                >
                  <p
                    className={cx(
                      'draft-percent font-semibold text-[#F3F1EA]',
                      index === 0 ? 'text-3xl' : 'text-2xl',
                    )}
                  >
                    {signal.normalizedPercentage}%
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold leading-5 text-[#F3F1EA]/90">
                    {signal.signalLabel}
                  </p>
                  <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#A8B0AA]/76">
                    Rank {signal.rank}
                  </p>
                </div>
              ))}
            </div>
            <dl className="mt-4 space-y-3 border-t border-[#F3F1EA]/[0.085] pt-4">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-[#A8B0AA]">Signal shape</dt>
                <dd className="font-mono text-sm text-[#F3F1EA]/88">{formatScoreShape(scoreShape)}</dd>
              </div>
              {answeredCount !== null && totalCount !== null ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-[#A8B0AA]">Responses</dt>
                  <dd className="font-mono text-sm text-[#F3F1EA]/88">{answeredCount}/{totalCount}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-[#A8B0AA]">Completed</dt>
                <dd className="font-mono text-sm text-[#F3F1EA]/88">
                  {formatResultDate(payload.metadata.completedAt ?? payload.metadata.generatedAt)}
                </dd>
              </div>
            </dl>
          </aside>
        </header>

        <div className="draft-result-article-grid grid gap-10 xl:grid-cols-[minmax(0,1fr)_11.75rem] xl:items-start">
          <article className="min-w-0">
            <ContextSection domainLabel={domainLabel} section={payload.context as PayloadSection} />
            <OrientationSection scoreShape={scoreShape} section={orientation} signals={rankedSignals} />
            <RecognitionSection section={recognition} />
            <SignalRolesSection items={payload.signalRoles as unknown as readonly PayloadListItem[]} />
            <MechanicsSection section={payload.patternMechanics as PayloadSection} />
            <SynthesisSection section={payload.patternSynthesis as PayloadSection} />
            <ListSection id="strengths" label="What Comes Easily" items={payload.strengths as unknown as readonly PayloadListItem[]} tone="teal" />
            <ListSection id="narrowing" label="Where It Can Narrow" items={payload.narrowing as unknown as readonly PayloadListItem[]} tone="warm" />
            <ListSection id="application" label="How to Use It" items={payload.application as unknown as readonly PayloadListItem[]} tone="teal" />
            <ClosingSection section={payload.closingIntegration as PayloadSection} />
          </article>

          <DraftResultReadingRail
            focusMode={focusMode}
            onFocusModeToggle={toggleFocusMode}
            onReadingModeToggle={toggleReadingMode}
            readingMode={readingMode}
            sections={rankedPatternSections}
          />
        </div>

        <p className="relative z-10 mx-auto mt-10 max-w-7xl text-xs leading-5 text-[#A8B0AA]/38">
          Pattern reference: {payload.patternKey} · Assessment version {payload.metadata.version}
        </p>
      </div>
    </div>
  );
}
