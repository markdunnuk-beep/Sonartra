import type { ReactNode } from 'react';

import { ResultReadingProgress } from '@/components/results/result-reading-progress';
import { ResultReadingRail } from '@/components/results/result-reading-rail';
import { ResultSectionNavigation } from '@/components/results/result-section-navigation';
import { ReportBody, ReportShell } from '@/components/results/report-shell';
import {
  createResultReadingSections,
  type ResultReadingSectionsConfig,
} from '@/lib/results/result-reading-sections';
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

const RANKED_PATTERN_READING_SECTIONS: ResultReadingSectionsConfig = (() => {
  const topLevelSections = [
    { id: 'context', label: 'Context', level: 'section', order: 1, intentPrompt: 'Start with the domain and result context persisted for this assessment.' },
    { id: 'orientation', label: 'Orientation', level: 'section', order: 2, intentPrompt: 'Read the first orientation for this ranked pattern and score shape.' },
    { id: 'recognition', label: 'Recognition', level: 'section', order: 3, intentPrompt: 'Use this section to recognise how the persisted pattern may show up.' },
    { id: 'signal-roles', label: 'Signal Roles', level: 'section', order: 4, intentPrompt: 'Review each signal in its persisted rank position.' },
    { id: 'pattern-mechanics', label: 'Pattern Mechanics', level: 'section', order: 5, intentPrompt: 'Understand how this ranked pattern tends to work.' },
    { id: 'pattern-synthesis', label: 'Pattern Synthesis', level: 'section', order: 6, intentPrompt: 'Bring together the gift, trap, and takeaway for this pattern.' },
    { id: 'strengths', label: 'Strengths', level: 'section', order: 7, intentPrompt: 'Notice the strengths persisted for this pattern.' },
    { id: 'narrowing', label: 'Narrowing', level: 'section', order: 8, intentPrompt: 'Notice where this pattern can narrow.' },
    { id: 'application', label: 'Application', level: 'section', order: 9, intentPrompt: 'Use the persisted application guidance.' },
    { id: 'closing-integration', label: 'Closing Integration', level: 'section', order: 10, intentPrompt: 'Close with the integration language persisted for this result.' },
  ] as const;

  return createResultReadingSections({
    topLevelSections,
  });
})();

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(record: RecordValue, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(record: RecordValue, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}

function isPayloadSection(value: unknown): value is PayloadSection {
  return isRecord(value) && isRecord(value.fieldValues);
}

function isPayloadList(value: unknown): value is PayloadListItem[] {
  return Array.isArray(value) && value.length > 0 && value.every(isPayloadSection);
}

function isRankedSignal(value: unknown): value is RankedSignalDisplay {
  return isRecord(value)
    && typeof value.signalKey === 'string'
    && typeof value.signalLabel === 'string'
    && typeof value.rank === 'number'
    && typeof value.rawScore === 'number'
    && typeof value.normalizedPercentage === 'number';
}

export function isRankedPatternRenderablePayload(
  payload: SingleDomainResultPayload,
): boolean {
  const metadata = payload.metadata as unknown;
  return isRecord(metadata)
    && metadata.resultModelKey === 'ranked_pattern'
    && isPayloadSection(payload.context)
    && isPayloadSection(payload.orientation)
    && isPayloadSection(payload.recognition)
    && isPayloadList(payload.signalRoles)
    && isPayloadSection(payload.patternMechanics)
    && isPayloadSection(payload.patternSynthesis)
    && isPayloadList(payload.strengths)
    && isPayloadList(payload.narrowing)
    && isPayloadList(payload.application)
    && isPayloadSection(payload.closingIntegration)
    && Array.isArray(payload.rankedSignals)
    && payload.rankedSignals.length === 4
    && payload.rankedSignals.every(isRankedSignal)
    && isRecord(payload.scoreShape)
    && typeof payload.scoreShape.value === 'string'
    && typeof payload.patternKey === 'string';
}

function fieldEntries(fieldValues: RecordValue): readonly [string, string][] {
  return Object.entries(fieldValues)
    .filter((entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].trim().length > 0,
    );
}

function fieldTitle(fieldValues: RecordValue): string | null {
  return readText(fieldValues, 'title')
    ?? readText(fieldValues, 'headline')
    ?? readText(fieldValues, 'section_title')
    ?? readText(fieldValues, 'orientation_title')
    ?? readText(fieldValues, 'recognition_headline')
    ?? readText(fieldValues, 'synthesis_title');
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

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="results-anchor-target sonartra-single-domain-section space-y-5 md:space-y-6"
      data-ranked-pattern-section={id}
    >
      <div className="space-y-2">
        <p className="sonartra-report-kicker">Reader-first result</p>
        <h2
          id={`${id}-heading`}
          className="text-[1.72rem] font-semibold leading-tight tracking-[-0.025em] text-white/88 md:text-[2.08rem]"
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SingletonSection({
  id,
  title,
  section,
}: {
  id: string;
  title: string;
  section: PayloadSection;
}) {
  const heading = fieldTitle(section.fieldValues);
  const bodyEntries = fieldBodyEntries(section.fieldValues);

  return (
    <Section id={id} title={title}>
      <div className="sonartra-single-domain-surface rounded-[1.35rem] border px-5 py-5 md:px-6 md:py-6">
        {heading ? (
          <h3 className="max-w-[48rem] text-[1.18rem] font-semibold leading-7 tracking-[0] text-white/84 md:text-[1.32rem] md:leading-8">
            {heading}
          </h3>
        ) : null}
        <div className="mt-4 grid max-w-[56rem] gap-3">
          {bodyEntries.map(([key, value]) => (
            <p key={key} className="sonartra-report-body text-white/66">
              {value}
            </p>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ListSection({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: readonly PayloadListItem[];
}) {
  return (
    <Section id={id} title={title}>
      <div className="grid gap-3 md:gap-4">
        {items.map((item, index) => {
          const heading = fieldTitle(item.fieldValues);
          const bodyEntries = fieldBodyEntries(item.fieldValues);
          return (
            <article
              key={item.itemKey ?? item.lookupKey ?? `${id}-${index}`}
              className="sonartra-single-domain-surface rounded-[1.2rem] border px-5 py-4 md:px-6 md:py-5"
              data-lookup-key={item.lookupKey}
            >
              <div className="flex items-start gap-3">
                <span className="sonartra-single-domain-application-entry-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  {heading ? (
                    <h3 className="text-[1.1rem] font-semibold leading-7 tracking-[0] text-white/84">
                      {heading}
                    </h3>
                  ) : null}
                  <div className="grid gap-2.5">
                    {bodyEntries.map(([key, value]) => (
                      <p key={key} className="sonartra-report-body-soft text-white/62">
                        {value}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

function SignalDistribution({ signals }: { signals: readonly RankedSignalDisplay[] }) {
  return (
    <div
      aria-label="Ranked signal distribution"
      className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
      data-ranked-pattern-signal-distribution="true"
    >
      {signals.map((signal) => (
        <div
          key={signal.signalKey}
          className="rounded-[1.05rem] border border-white/[0.07] bg-white/[0.018] px-4 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="sonartra-report-kicker">
                {signal.rank === 1 ? 'Top signal' : `Rank ${signal.rank}`}
              </p>
              <p className="mt-1 truncate text-[1rem] font-semibold leading-6 text-white/86">
                {signal.signalLabel}
              </p>
            </div>
            <p className="shrink-0 text-[0.95rem] font-semibold text-[#32D6B0]">
              {signal.normalizedPercentage}%
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalRolesSection({ items }: { items: readonly PayloadListItem[] }) {
  const orderedItems = [...items].sort(
    (left, right) => (left.rankPosition ?? 0) - (right.rankPosition ?? 0),
  );

  return (
    <Section id="signal-roles" title="Signal Roles">
      <div className="grid gap-3 md:gap-4">
        {orderedItems.map((item) => {
          const heading = fieldTitle(item.fieldValues);
          const bodyEntries = fieldBodyEntries(item.fieldValues);
          return (
            <article
              key={item.lookupKey ?? `${item.signalKey}-${item.rankPosition}`}
              className="sonartra-single-domain-surface rounded-[1.2rem] border px-5 py-4 md:px-6 md:py-5"
              data-lookup-key={item.lookupKey}
            >
              <div className="grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)]">
                <div>
                  <p className="sonartra-report-kicker">Rank {item.rankPosition}</p>
                  {item.signalKey ? (
                    <p className="mt-1 text-[0.92rem] font-semibold text-white/74">
                      {toLabel(item.signalKey)}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2.5">
                  {heading ? (
                    <h3 className="text-[1.1rem] font-semibold leading-7 tracking-[0] text-white/84">
                      {heading}
                    </h3>
                  ) : null}
                  {bodyEntries.map(([key, value]) => (
                    <p key={key} className="sonartra-report-body-soft text-white/62">
                      {value}
                    </p>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

function UnreadableRankedPatternResult() {
  return (
    <ReportShell>
      <ReportBody>
        <section className="sonartra-single-domain-surface max-w-[48rem] rounded-[1.35rem] border p-6">
          <p className="sonartra-report-kicker">Result unavailable</p>
          <h1 className="mt-2 text-[1.7rem] font-semibold text-white/88">
            This ranked-pattern result cannot be displayed.
          </h1>
          <p className="sonartra-report-body-soft mt-3 text-white/62">
            The persisted canonical result payload is missing one or more required reader-first sections.
          </p>
        </section>
      </ReportBody>
    </ReportShell>
  );
}

export function RankedPatternResultReport({ payload }: { payload: SingleDomainResultPayload }) {
  if (!isRankedPatternRenderablePayload(payload)) {
    return <UnreadableRankedPatternResult />;
  }

  const rankedSignals = payload.rankedSignals as readonly RankedSignalDisplay[];
  const topSignal = rankedSignals[0]!;
  const scoreShape = payload.scoreShape!.value;
  const domain = isRecord(payload.domain) ? payload.domain : {};
  const domainLabel = readText(domain, 'label')
    ?? readText(domain, 'title')
    ?? readText(domain, 'domainLabel')
    ?? payload.metadata.domainKey;
  const orientation = payload.orientation as PayloadSection;
  const recognition = payload.recognition as PayloadSection;
  const orientationTitle = fieldTitle(orientation.fieldValues);
  const recognitionTitle = fieldTitle(recognition.fieldValues);

  return (
    <ReportShell rail={<ResultReadingRail sectionsConfig={RANKED_PATTERN_READING_SECTIONS} />}>
      <ReportBody className="sonartra-single-domain-report-flow">
        <header
          className="results-anchor-target sonartra-single-domain-intro space-y-7"
          data-ranked-pattern-result="true"
        >
          <div className="space-y-4">
            <div className="sonartra-single-domain-meta-block">
              <dl aria-label="Report details" className="sonartra-single-domain-meta-strip">
                <div className="sonartra-single-domain-meta-strip-item">
                  <dt className="sonartra-report-kicker">Completed</dt>
                  <dd className="sonartra-single-domain-meta-strip-value">
                    {formatResultDate(payload.metadata.completedAt ?? payload.metadata.generatedAt)}
                  </dd>
                </div>
                <div className="sonartra-single-domain-meta-strip-item">
                  <dt className="sonartra-report-kicker">Assessment</dt>
                  <dd className="sonartra-single-domain-meta-strip-value">
                    {payload.metadata.assessmentTitle}
                  </dd>
                </div>
                <div className="sonartra-single-domain-meta-strip-item">
                  <dt className="sonartra-report-kicker">Domain</dt>
                  <dd className="sonartra-single-domain-meta-strip-value">{domainLabel}</dd>
                </div>
                <div className="sonartra-single-domain-meta-strip-item">
                  <dt className="sonartra-report-kicker">Score shape</dt>
                  <dd className="sonartra-single-domain-meta-strip-value">
                    {formatScoreShape(scoreShape)}
                  </dd>
                </div>
              </dl>
              <p className="sonartra-single-domain-version-note">
                Version {payload.metadata.version} · Pattern {payload.patternKey}
              </p>
            </div>
            <ResultSectionNavigation sectionsConfig={RANKED_PATTERN_READING_SECTIONS} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-start">
            <div className="space-y-5">
              <p className="sonartra-report-kicker">Ranked-pattern result</p>
              <h1 className="sonartra-type-display max-w-[12ch] text-[3rem] tracking-[-0.055em] md:text-[4.5rem]">
                {topSignal.signalLabel} leads the current pattern
              </h1>
              {recognitionTitle ? (
                <p className="sonartra-report-summary max-w-[54rem] text-white/78">
                  {recognitionTitle}
                </p>
              ) : null}
              {orientationTitle ? (
                <p className="sonartra-report-body max-w-[54rem] text-white/62">
                  {orientationTitle}
                </p>
              ) : null}
            </div>
            <aside
              aria-label="Persisted ranked-pattern evidence"
              className="sonartra-single-domain-evidence-panel"
            >
              <div className="sonartra-single-domain-evidence-panel-header">
                <p className="sonartra-report-kicker">Pattern evidence</p>
                <p className="sonartra-single-domain-evidence-panel-note">
                  Persisted score distribution, score shape, and pattern key from the completed result payload.
                </p>
              </div>
              <SignalDistribution signals={rankedSignals} />
            </aside>
          </div>
        </header>

        <ResultReadingProgress
          className="max-w-[72rem] px-1 md:px-2 xl:hidden"
          sectionsConfig={RANKED_PATTERN_READING_SECTIONS}
        />

        <SingletonSection id="context" title="Context" section={payload.context as PayloadSection} />
        <SingletonSection id="orientation" title="Orientation" section={orientation} />
        <SingletonSection id="recognition" title="Recognition" section={recognition} />
        <SignalRolesSection items={payload.signalRoles as unknown as readonly PayloadListItem[]} />
        <SingletonSection
          id="pattern-mechanics"
          title="Pattern Mechanics"
          section={payload.patternMechanics as PayloadSection}
        />
        <SingletonSection
          id="pattern-synthesis"
          title="Pattern Synthesis"
          section={payload.patternSynthesis as PayloadSection}
        />
        <ListSection id="strengths" title="Strengths" items={payload.strengths as unknown as readonly PayloadListItem[]} />
        <ListSection id="narrowing" title="Narrowing" items={payload.narrowing as unknown as readonly PayloadListItem[]} />
        <ListSection id="application" title="Application" items={payload.application as unknown as readonly PayloadListItem[]} />
        <SingletonSection
          id="closing-integration"
          title="Closing Integration"
          section={payload.closingIntegration as PayloadSection}
        />
      </ReportBody>
    </ReportShell>
  );
}
