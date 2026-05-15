import Image from 'next/image';
import type { ReactNode } from 'react';

import type {
  ReportFirstCanonicalPayloadV1,
  ReportFirstRankedSignal,
  ReportFirstScoreRow,
} from '@/lib/types/report-first-result';

type RecordValue = Record<string, unknown>;

type ReportFirstBlock =
  | { readonly type: 'paragraph'; readonly text: string }
  | { readonly type: 'list'; readonly items: readonly string[] }
  | { readonly type: 'ordered_list'; readonly items: readonly string[] }
  | { readonly type: 'unordered_list'; readonly items: readonly string[] }
  | { readonly type: 'table'; readonly columns?: readonly TableColumn[]; readonly rows: readonly (readonly TableCell[])[] }
  | { readonly type: 'pull_quote'; readonly text: string }
  | { readonly type: 'prompt_group'; readonly title?: string; readonly prompts: readonly string[] }
  | { readonly type: 'callout'; readonly title?: string; readonly text: string; readonly tone?: 'neutral' | 'evidence' }
  | { readonly type: 'signal_stack'; readonly signals: readonly ReportFirstRankedSignal[] }
  | { readonly type: 'strength_card'; readonly title: string; readonly text: string; readonly linkedSignals?: readonly string[] }
  | {
      readonly type: 'tightening_card';
      readonly title: string;
      readonly text: string;
      readonly whyItMatters?: string;
      readonly rangeToAdd?: string;
      readonly linkedSignals?: readonly string[];
    }
  | {
      readonly type: 'development_action';
      readonly title: string;
      readonly text: string;
      readonly useCases?: readonly string[];
      readonly whyItMatters?: string;
      readonly linkedSignals?: readonly string[];
    };

type TableColumn = {
  readonly key: string;
  readonly label: string;
};

type TableCell = {
  readonly columnKey?: string;
  readonly value?: string;
  readonly text?: string;
};

type ReportFirstChapter = {
  readonly chapterKey: string;
  readonly chapterNumber: number;
  readonly title: string;
  readonly railLabel?: string;
  readonly readerFacing?: boolean;
  readonly blocks: readonly ReportFirstBlock[];
};

type ReportFirstReport = {
  readonly reportKey?: string;
  readonly reportTitle?: string;
  readonly hero?: {
    readonly title?: string;
    readonly resultStatement?: string;
  };
  readonly opening?: readonly ReportFirstBlock[];
  readonly patternSummary?: {
    readonly title?: string;
    readonly blocks?: readonly ReportFirstBlock[];
  };
  readonly keyInsight?: ReportFirstBlock;
  readonly chapters?: readonly ReportFirstChapter[];
  readonly closing?: {
    readonly synthesis?: readonly ReportFirstBlock[];
    readonly finalLine?: string;
  };
  readonly pdf?: {
    readonly title?: string;
    readonly body?: string;
    readonly buttonLabel?: string;
  };
  readonly readerNavigation?: readonly {
    readonly id: string;
    readonly label: string;
    readonly targetChapterKey?: string;
  }[];
};

type ReportFirstSection = {
  readonly id: string;
  readonly label: string;
  readonly heading: string;
  readonly eyebrow?: string;
  readonly chapter?: ReportFirstChapter;
};

type ReportFirstCardBlock = Extract<
  ReportFirstBlock,
  { readonly type: 'strength_card' | 'tightening_card' | 'development_action' }
>;

const signalRoleLabelsByRank = ['Lead signal', 'Strengthening signal', 'Range signal', 'Further range'] as const;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readText(record: RecordValue, key: string): string | null {
  const value = record[key];
  return isNonEmptyText(value) ? value.trim() : null;
}

function toReport(value: unknown): ReportFirstReport {
  return isRecord(value) ? (value as unknown as ReportFirstReport) : {};
}

function toBlocks(value: unknown): readonly ReportFirstBlock[] {
  return Array.isArray(value) ? (value as readonly ReportFirstBlock[]) : [];
}

function splitParagraphText(value: string | null): readonly string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function templateEvidenceBlocks(payload: ReportFirstCanonicalPayloadV1): readonly ReportFirstBlock[] {
  const template = isRecord(payload.reportFirst.template) ? payload.reportFirst.template : {};
  const evidenceTemplate = isRecord(template.evidenceTemplate) ? template.evidenceTemplate : {};
  return toBlocks(evidenceTemplate.blocks).filter(
    (block) => block.type !== 'signal_stack' && block.type !== 'table',
  );
}

function cellText(cell: TableCell | undefined): string {
  return cell?.value ?? cell?.text ?? '';
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'No completion date';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function labelFromSignalKey(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function readerNavLabelForChapter(chapter: ReportFirstChapter): string {
  if (/How People expands your leadership/i.test(chapter.title)) {
    return 'People expansion';
  }

  if (/How Vision expands your leadership/i.test(chapter.title)) {
    return 'Vision expansion';
  }

  return chapter.railLabel ?? `Chapter ${chapter.chapterNumber}`;
}

function buildSections(report: ReportFirstReport): readonly ReportFirstSection[] {
  const chapters = Array.isArray(report.chapters)
    ? report.chapters.filter((chapter) => chapter.readerFacing !== false)
    : [];

  return [
    { id: 'overview', label: 'Overview', heading: 'Overview' },
    ...(report.patternSummary ? [{ id: 'pattern', label: 'Pattern', heading: report.patternSummary.title ?? 'Pattern at a glance' }] : []),
    { id: 'evidence', label: 'Evidence', heading: 'Evidence behind your result' },
    ...(report.keyInsight ? [{ id: 'key-insight', label: 'Insight', heading: 'Key insight' }] : []),
    ...chapters.map((chapter) => ({
      id: slugify(chapter.chapterKey || chapter.title),
      label: readerNavLabelForChapter(chapter),
      heading: chapter.title,
      eyebrow: `Chapter ${chapter.chapterNumber}`,
      chapter,
    })),
    ...(report.closing ? [{ id: 'closing', label: 'Closing', heading: 'Closing synthesis' }] : []),
  ];
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#32D6B0]/85">
      {children}
    </p>
  );
}

function SectionShell({
  children,
  className,
  eyebrow,
  heading,
  id,
}: {
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  heading: string;
  id: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cx(
        'results-anchor-target min-w-0 scroll-mt-28 border-t border-[#F3F1EA]/[0.08] py-12 md:py-16',
        className,
      )}
      data-report-first-section={id}
    >
      <div className="mb-7 max-w-3xl space-y-3">
        {eyebrow ? <FieldLabel>{eyebrow}</FieldLabel> : null}
        <h2 id={headingId} className="text-[2rem] font-semibold leading-tight text-[#F5F1EA] md:text-[2.65rem]">
          {heading}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SignalStack({
  rankedSignals,
  scoreRows,
}: {
  rankedSignals: readonly ReportFirstRankedSignal[];
  scoreRows: readonly ReportFirstScoreRow[];
}) {
  const scoresBySignal = new Map(scoreRows.map((score) => [score.signalKey, score]));
  const hasScores = scoreRows.length > 0;

  return (
    <div className="rounded-[1.25rem] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(245,241,234,0.055),rgba(9,11,15,0.24))] p-4 shadow-[0_24px_70px_rgba(4,7,6,0.18)] backdrop-blur-sm sm:p-5" data-report-first-signal-stack="true">
      <div className="mb-4 flex flex-col gap-2 border-b border-[#F3F1EA]/[0.08] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <FieldLabel>Ranked evidence</FieldLabel>
          <p className="mt-2 text-lg font-semibold text-[#F3F1EA]">Signal order and relative strength</p>
        </div>
        <p className="max-w-[16rem] text-sm leading-6 text-[#A8B0AA]/82">
          {hasScores ? 'Based on your completed assessment.' : 'Shows how each signal contributes to this pattern.'}
        </p>
      </div>
      <div className="space-y-2.5">
        {rankedSignals.map((signal, index) => {
          const percentage = scoresBySignal.get(signal.signalKey)?.normalizedPercent ?? 0;
          const isLead = index === 0;
          return (
            <div
              key={`${signal.rank}-${signal.signalKey}`}
              role="meter"
              aria-label={hasScores ? `${signal.signalLabel}, rank ${signal.rank}, ${percentage}%` : `${signal.signalLabel}, rank ${signal.rank}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={hasScores ? percentage : undefined}
              className={cx(
                'grid gap-3 rounded-[0.95rem] border p-3 sm:items-center',
                hasScores
                  ? 'sm:grid-cols-[minmax(9rem,0.8fr)_minmax(10rem,1fr)_3.75rem]'
                  : 'sm:grid-cols-[minmax(9rem,0.55fr)_minmax(0,1fr)]',
                isLead ? 'border-[#32D6B0]/32 bg-[#32D6B0]/[0.085]' : 'border-[#F3F1EA]/[0.08] bg-[#202622]/48',
              )}
              data-report-first-signal-row="true"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#F3F1EA]/14 bg-[#101312]/70 font-mono text-xs text-[#F3F1EA]">
                  {signal.rank}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-[#F3F1EA]">{signal.signalLabel}</p>
                  <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.15em] text-[#A8B0AA]/78">
                    {signal.roleLabel ?? signalRoleLabelsByRank[index] ?? 'Ranked signal'}
                  </p>
                </div>
              </div>
              {hasScores ? (
                <>
                  <div className="h-2 overflow-hidden rounded-full bg-[#0E1110]/85 ring-1 ring-[#F3F1EA]/[0.08]">
                    <div
                      className={cx(
                        'h-full rounded-full',
                        isLead
                          ? 'bg-[linear-gradient(90deg,#32D6B0,rgba(50,214,176,0.7))]'
                          : 'bg-[linear-gradient(90deg,rgba(139,196,181,0.84),rgba(139,196,181,0.48))]',
                      )}
                      style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                    />
                  </div>
                  <p className="font-mono text-xl text-[#F3F1EA] sm:text-right">{percentage}%</p>
                </>
              ) : (
                <p className="text-sm leading-6 text-[#C8CEC7]/82">{signal.roleSummary}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceTable({ rows }: { rows: readonly ReportFirstScoreRow[] }) {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-[1rem] border border-white/[0.09] bg-[#080A0D]/24" data-report-first-evidence-table="true">
      <table className="min-w-full divide-y divide-[#F3F1EA]/[0.08] text-left text-sm">
        <thead className="bg-[#F3F1EA]/[0.035] text-[#A8B0AA]">
          <tr>
            <th className="px-4 py-3 font-medium">Signal</th>
            <th className="px-4 py-3 font-medium">Ranked score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F1EA]/[0.07]">
          {rows.map((row) => (
            <tr key={row.signalKey}>
              <td className="px-4 py-3 text-[#F3F1EA]/90">{row.signalLabel}</td>
              <td className="px-4 py-3 font-mono text-[#F3F1EA]/90">{row.normalizedPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GenericTable({ block }: { block: Extract<ReportFirstBlock, { type: 'table' }> }) {
  const columns = block.columns && block.columns.length > 0
    ? block.columns
    : (block.rows[0] ?? []).map((cell, index) => ({ key: cell.columnKey || `column-${index}`, label: cellText(cell) }));
  const bodyRows = block.columns && block.columns.length > 0 ? block.rows : block.rows.slice(1);

  return (
    <div className="my-6 block w-full max-w-full min-w-0 overflow-x-auto rounded-[1rem] border border-[#F3F1EA]/[0.08]" data-report-first-table-block="true">
      <table className="min-w-full divide-y divide-[#F3F1EA]/[0.08] text-left text-sm">
        <thead className="bg-[#F3F1EA]/[0.035] text-[#A8B0AA]">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3 font-medium" key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F1EA]/[0.07]">
          {bodyRows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {columns.map((column, columnIndex) => (
                <td className="px-4 py-3 leading-6 text-[#D3D7D1]/88" key={column.key}>
                  {cellText(row.find((cell) => cell.columnKey === column.key)) || cellText(row[columnIndex])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignalTags({ signalKeys }: { signalKeys?: readonly string[] }) {
  if (!signalKeys || signalKeys.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {signalKeys.map((signalKey) => (
        <span
          className="rounded-full border border-[#32D6B0]/18 bg-[#32D6B0]/[0.075] px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#8BE7D0]"
          key={signalKey}
        >
          {labelFromSignalKey(signalKey)}
        </span>
      ))}
    </div>
  );
}

function ContentCard({
  children,
  tone = 'neutral',
  type,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'teal' | 'warm';
  type: string;
}) {
  return (
    <article
      className={cx(
        'rounded-[1rem] border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
        tone === 'teal' && 'border-[#32D6B0]/18 bg-[#32D6B0]/[0.052]',
        tone === 'warm' && 'border-[#C98E68]/20 bg-[#C98E68]/[0.052]',
        tone === 'neutral' && 'border-[#F3F1EA]/[0.08] bg-[#1B211F]/72',
      )}
      data-report-first-card={type}
    >
      {children}
    </article>
  );
}

function RenderBlock({ block }: { block: ReportFirstBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p className="max-w-[58rem] text-[1rem] leading-8 text-[#C8CEC7]/88">{block.text}</p>;
    case 'list':
    case 'unordered_list':
      return (
        <ul className="grid gap-2.5 text-[0.98rem] leading-7 text-[#C8CEC7]/88" role="list">
          {block.items.map((item) => (
            <li className="relative pl-5 before:absolute before:left-0 before:top-3 before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#32D6B0]/72" key={item}>
              {item}
            </li>
          ))}
        </ul>
      );
    case 'ordered_list':
      return (
        <ol className="grid gap-2.5 text-[0.98rem] leading-7 text-[#C8CEC7]/88">
          {block.items.map((item, index) => (
            <li className="grid grid-cols-[1.8rem_minmax(0,1fr)] gap-3" key={item}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#F3F1EA]/12 bg-[#101312]/72 font-mono text-xs text-[#A8B0AA]">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'table':
      return <GenericTable block={block} />;
    case 'signal_stack':
      return <SignalStack rankedSignals={block.signals} scoreRows={[]} />;
    case 'pull_quote':
      return (
        <blockquote className="rounded-[1.25rem] border border-[#32D6B0]/22 bg-[linear-gradient(135deg,rgba(50,214,176,0.1),rgba(245,241,234,0.035))] p-5 text-xl font-semibold leading-8 text-[#F5F1EA] md:p-6 md:text-2xl md:leading-10" data-report-first-pull-quote="true">
          {block.text}
        </blockquote>
      );
    case 'callout':
      return (
        <div className="rounded-[1rem] border border-[#F3F1EA]/[0.08] bg-[#F3F1EA]/[0.035] p-5" data-report-first-callout={block.tone ?? 'neutral'}>
          {block.title ? <h3 className="text-lg font-semibold text-[#F3F1EA]">{block.title}</h3> : null}
          <p className={cx('text-[0.98rem] leading-7 text-[#C8CEC7]/88', block.title && 'mt-3')}>{block.text}</p>
        </div>
      );
    case 'prompt_group':
      return (
        <div className="rounded-[1rem] border border-[#F3F1EA]/[0.08] bg-[#171D1A]/78 p-5" data-report-first-prompt-group="true">
          {block.title ? <h3 className="text-lg font-semibold text-[#F3F1EA]">{block.title}</h3> : null}
          <ol className={cx('grid gap-2.5', block.title && 'mt-4')}>
            {block.prompts.map((prompt, index) => (
              <li className="grid grid-cols-[1.9rem_minmax(0,1fr)] gap-3 text-[0.98rem] leading-7 text-[#C8CEC7]/88" key={prompt}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#F3F1EA]/12 bg-[#101312]/72 font-mono text-xs text-[#A8B0AA]">
                  {index + 1}
                </span>
                <span>{prompt}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case 'strength_card':
      return (
        <ContentCard tone="teal" type="strength">
          <SignalTags signalKeys={block.linkedSignals} />
          <h3 className="mt-4 text-xl font-semibold leading-7 text-[#F3F1EA]">{block.title}</h3>
          <p className="mt-3 text-sm leading-7 text-[#C8CEC7]/88">{block.text}</p>
        </ContentCard>
      );
    case 'tightening_card':
      return (
        <ContentCard tone="warm" type="tightening">
          <SignalTags signalKeys={block.linkedSignals} />
          <h3 className="mt-4 text-xl font-semibold leading-7 text-[#F3F1EA]">{block.title}</h3>
          <p className="mt-3 text-sm leading-7 text-[#C8CEC7]/88">{block.text}</p>
          {block.whyItMatters ? <p className="mt-4 text-sm leading-7 text-[#A8B0AA]/88"><strong className="text-[#E3AF8C]">Why this matters: </strong>{block.whyItMatters}</p> : null}
          {block.rangeToAdd ? <p className="mt-3 text-sm leading-7 text-[#A8B0AA]/88"><strong className="text-[#E3AF8C]">What to bring in: </strong>{block.rangeToAdd}</p> : null}
        </ContentCard>
      );
    case 'development_action':
      return (
        <ContentCard tone="teal" type="development-action">
          <SignalTags signalKeys={block.linkedSignals} />
          <h3 className="mt-4 text-xl font-semibold leading-7 text-[#F3F1EA]">{block.title}</h3>
          <p className="mt-3 text-sm leading-7 text-[#C8CEC7]/88">{block.text}</p>
          {block.whyItMatters ? <p className="mt-4 text-sm leading-7 text-[#A8B0AA]/88"><strong className="text-[#8BE7D0]">Why this matters: </strong>{block.whyItMatters}</p> : null}
          {block.useCases && block.useCases.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {block.useCases.map((useCase) => (
                <span className="rounded-full border border-[#F3F1EA]/10 bg-[#F3F1EA]/[0.04] px-2.5 py-1 text-xs text-[#C8CEC7]/80" key={useCase}>
                  {useCase}
                </span>
              ))}
            </div>
          ) : null}
        </ContentCard>
      );
  }
}

function BlockGroup({ blocks }: { blocks: readonly ReportFirstBlock[] }) {
  const groups: Array<
    | { readonly kind: 'cards'; readonly blocks: ReportFirstCardBlock[] }
    | { readonly kind: 'block'; readonly block: ReportFirstBlock }
  > = [];

  for (const block of blocks) {
    if (block.type === 'strength_card' || block.type === 'tightening_card' || block.type === 'development_action') {
      const previousGroup = groups.at(-1);
      if (previousGroup?.kind === 'cards') {
        previousGroup.blocks.push(block);
      } else {
        groups.push({ kind: 'cards', blocks: [block] });
      }
    } else {
      groups.push({ kind: 'block', block });
    }
  }

  return (
    <div className="space-y-5">
      {groups.map((group, index) => {
        if (group.kind === 'block') {
          return <RenderBlock block={group.block} key={`${group.block.type}-${index}`} />;
        }

        return (
          <div className="grid gap-4 lg:grid-cols-3" key={`cards-${index}`}>
            {group.blocks.map((block, blockIndex) => (
              <RenderBlock block={block} key={`${block.type}-${blockIndex}`} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ChapterSection({ section }: { section: ReportFirstSection }) {
  const chapter = section.chapter;
  if (!chapter) {
    return null;
  }

  return (
    <SectionShell
      id={section.id}
      heading={section.eyebrow ? `${section.eyebrow} — ${section.heading}` : section.heading}
    >
      <BlockGroup blocks={chapter.blocks} />
    </SectionShell>
  );
}

function ReadingRail({ sections }: { sections: readonly ReportFirstSection[] }) {
  return (
    <nav
      aria-label="Result reading navigation"
      className="hidden xl:sticky xl:top-[5.7rem] xl:block xl:w-[12rem] xl:shrink-0 xl:self-start"
      data-report-first-reading-rail="true"
    >
      <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#080A0D]/42 px-3 py-3.5 shadow-[0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-[14px]">
        <div className="mb-4 border-b border-white/[0.08] px-1 pb-3">
          <Image
            src="/images/brand/sonartra-logo-white.svg"
            alt="Sonartra"
            width={6259}
            height={1529}
            className="h-auto w-[132px] opacity-85"
          />
          <p className="mt-3 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#32D6B0]/75">
            Report guide
          </p>
        </div>
        <ol className="space-y-0.5" role="list">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="group grid grid-cols-[1.7rem_minmax(0,1fr)] rounded-[0.85rem] px-2.5 py-2 text-[0.78rem] leading-5 text-[#A8B0AA]/76 outline-none transition hover:bg-white/[0.045] hover:text-[#F5F1EA]/92 focus-visible:ring-2 focus-visible:ring-[#32D6B0]/55"
              >
                <span className="font-mono text-[0.63rem] text-[#32D6B0]/52">{String(index + 1).padStart(2, '0')}</span>
                <span>{section.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

function MobileSectionNav({ sections }: { sections: readonly ReportFirstSection[] }) {
  return (
    <nav
      aria-label="Result sections"
      className="sticky top-3 z-20 mb-4 max-w-full overflow-hidden rounded-[1rem] border border-white/[0.09] bg-[#080A0D]/88 p-2 shadow-[0_18px_46px_rgba(4,7,6,0.22)] backdrop-blur-[14px] xl:hidden"
      data-report-first-mobile-nav="true"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1.5 pt-1">
        <Image
          src="/images/brand/sonartra-logo-white.svg"
          alt="Sonartra"
          width={6259}
          height={1529}
          className="h-auto w-[112px] opacity-85"
        />
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#32D6B0]/72">
          Report guide
        </span>
      </div>
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {sections.map((section) => (
          <a
            href={`#${section.id}`}
            className="shrink-0 rounded-[0.78rem] border border-transparent px-3 py-2 text-sm text-[#C8CEC7]/84 outline-none hover:border-[#32D6B0]/20 hover:bg-[#32D6B0]/[0.07] focus-visible:ring-2 focus-visible:ring-[#32D6B0]/55"
            key={section.id}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function ReportFirstResultReport({ payload }: { payload: ReportFirstCanonicalPayloadV1 }) {
  const report = toReport(payload.report);
  const sections = buildSections(report);
  const openingBlocks = toBlocks(report.opening);
  const persistedEvidenceBlocks = templateEvidenceBlocks(payload);
  const heroTitle = report.hero?.title ?? report.reportTitle ?? payload.assessment.title;
  const resultStatement = report.hero?.resultStatement
    ?? (isRecord(report.keyInsight) ? readText(report.keyInsight, 'text') : null)
    ?? payload.evidence.explanatoryNote;
  const resultStatementParagraphs = splitParagraphText(resultStatement);
  const completionDate = formatDate(payload.attempt.completedAt ?? payload.metadata.completedAt);
  const rankedPatternSummary = payload.rankedSignals.map((signal) => signal.signalLabel).join(', ');

  return (
    <main
      className="relative isolate min-h-[calc(100vh-4.25rem)] overflow-x-clip bg-[#080A0D] text-[#F5F1EA]"
      data-report-first-result="true"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 z-0 w-full overflow-hidden bg-[linear-gradient(180deg,#090B0F_0%,#101715_38rem,#080A0D_100%)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_7%,rgba(50,214,176,0.13),transparent_31%),radial-gradient(circle_at_84%_12%,rgba(245,241,234,0.07),transparent_29%),linear-gradient(180deg,rgba(8,10,13,0)_0%,rgba(8,10,13,0.72)_68%,rgba(8,10,13,0)_100%)]" />
        <div className="absolute left-1/2 top-12 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full border border-[#F5F1EA]/[0.035]" />
        <div className="absolute left-1/2 top-24 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full border border-[#32D6B0]/[0.045]" />
        <div className="absolute inset-x-[-8rem] top-0 h-[42rem] bg-[linear-gradient(rgba(245,241,234,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(245,241,234,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_58%,rgba(0,0,0,0.2)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1560px] px-5 pb-16 pt-8 sm:px-6 md:pb-24 md:pt-10 lg:px-7 xl:px-8">
        <MobileSectionNav sections={sections} />

        <header className="grid gap-7 py-6 md:gap-8 md:py-9">
          <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <Image
              src="/images/brand/sonartra-logo-white.svg"
              alt="Sonartra"
              width={6259}
              height={1529}
              className="h-auto w-[156px] opacity-90"
              priority
            />
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D8D0C3]/70">
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5">Premium report</span>
              <span className="rounded-full border border-[#32D6B0]/24 bg-[#32D6B0]/[0.075] px-3 py-1.5 text-[#A8F4E1]">
                Full reference
              </span>
            </div>
          </div>

          <div className="max-w-5xl">
            <span className="rounded-full border border-[#32D6B0]/24 bg-[#32D6B0]/[0.07] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#32D6B0]">
              Sonartra leadership report
            </span>
            <p className="mt-7 text-sm font-medium uppercase tracking-[0.18em] text-[#C8CEC7]/70">
              {payload.domain.title} · Completed {completionDate}
            </p>
            <h1 className="mt-3 max-w-5xl text-5xl font-semibold leading-[1.02] text-[#F5F1EA] md:text-7xl">
              {heroTitle}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium text-[#D8D0C3]/68">Your ranked pattern</span>
              {payload.rankedSignals.map((signal) => (
                <span
                  className="rounded-full border border-white/[0.1] bg-white/[0.045] px-3 py-1.5 text-sm font-semibold text-[#F5F1EA]/88"
                  key={signal.signalKey}
                >
                  {signal.rank}. {signal.signalLabel}
                </span>
              ))}
            </div>
            <div className="mt-6 max-w-3xl space-y-4">
              {resultStatementParagraphs.map((paragraph, index) => (
                <p
                  className={cx(
                    'text-xl leading-8 text-[#C8CEC7]/95 md:text-2xl md:leading-10',
                    index > 0 && 'text-lg text-[#C8CEC7]/82 md:text-xl',
                  )}
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.5rem] border border-white/[0.09] bg-[linear-gradient(135deg,rgba(245,241,234,0.062),rgba(50,214,176,0.045)_46%,rgba(9,11,15,0.45))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.24)] backdrop-blur-sm md:p-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:items-start">
              <div>
                <FieldLabel>Result basis</FieldLabel>
                <h2 className="mt-3 text-2xl font-semibold text-[#F5F1EA]">
                  {payload.topSignal.signalLabel} leads this pattern
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#C8CEC7]/82">
                  This report is selected from your ranked signal order and relative strengths at completion.
                </p>
                <p className="mt-4 rounded-[1rem] border border-[#32D6B0]/18 bg-[#32D6B0]/[0.06] px-4 py-3 text-sm leading-6 text-[#DFFCF4]/86">
                  {rankedPatternSummary}
                </p>
                <dl className="mt-5 space-y-3 border-t border-[#F3F1EA]/[0.08] pt-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#A8B0AA]">Assessment</dt>
                    <dd className="text-right text-[#F3F1EA]/88">{payload.assessment.title}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#A8B0AA]">Completed responses</dt>
                    <dd className="text-right text-[#F3F1EA]/88">
                      {payload.attempt.answeredQuestionCount} of {payload.attempt.totalQuestionCount}
                    </dd>
                  </div>
                </dl>
              </div>
              <SignalStack rankedSignals={payload.rankedSignals} scoreRows={payload.normalizedScores} />
            </div>
          </aside>
        </header>

        <div className="grid gap-10 xl:grid-cols-[minmax(0,74rem)_11.5rem] xl:items-start xl:justify-center xl:gap-12 2xl:gap-16">
          <article className="min-w-0">
            <SectionShell id="overview" heading="Editorial introduction">
              <BlockGroup blocks={openingBlocks} />
            </SectionShell>

            {report.patternSummary ? (
              <SectionShell id="pattern" heading={report.patternSummary.title ?? 'Pattern at a glance'}>
                <BlockGroup blocks={toBlocks(report.patternSummary.blocks)} />
              </SectionShell>
            ) : null}

            <SectionShell id="evidence" heading={payload.evidence.title}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <SignalStack rankedSignals={payload.evidence.rankedSignalEvidence} scoreRows={payload.evidence.scoreRows} />
                <div className="space-y-5">
                  <EvidenceTable rows={payload.evidence.scoreRows} />
                  <p className="rounded-[1rem] border border-[#F3F1EA]/[0.08] bg-[#F3F1EA]/[0.035] p-5 text-sm leading-7 text-[#C8CEC7]/88">
                    {payload.evidence.explanatoryNote}
                  </p>
                  {persistedEvidenceBlocks.length > 0 ? (
                    <BlockGroup blocks={persistedEvidenceBlocks} />
                  ) : null}
                </div>
              </div>
            </SectionShell>

            {report.keyInsight ? (
              <SectionShell id="key-insight" heading="Key insight">
                <RenderBlock block={report.keyInsight} />
              </SectionShell>
            ) : null}

            {sections.map((section) => (
              <ChapterSection key={section.id} section={section} />
            ))}

            {report.closing ? (
              <SectionShell id="closing" heading="Closing synthesis">
                <BlockGroup blocks={toBlocks(report.closing.synthesis)} />
                {report.closing.finalLine ? (
                  <div className="mt-7">
                    <h3 className="mb-3 text-xl font-semibold leading-7 text-[#F3F1EA]">Final line</h3>
                    <p className="rounded-[1.15rem] border border-[#32D6B0]/20 bg-[#32D6B0]/[0.07] p-5 text-xl font-semibold leading-8 text-[#F3F1EA] md:p-6">
                      {report.closing.finalLine}
                    </p>
                  </div>
                ) : null}
              </SectionShell>
            ) : null}

            {report.pdf ? (
              <SectionShell id="pdf-export" heading="Save this report">
                <div className="rounded-[1.15rem] border border-[#F3F1EA]/[0.08] bg-[#1B211F]/72 p-5 md:p-6">
                  {report.pdf.title ? (
                    <h3 className="text-xl font-semibold leading-7 text-[#F3F1EA]">{report.pdf.title}</h3>
                  ) : null}
                  {report.pdf.body ? (
                    <p className="mt-3 max-w-[52rem] text-[1rem] leading-8 text-[#C8CEC7]/88">{report.pdf.body}</p>
                  ) : null}
                </div>
              </SectionShell>
            ) : null}
          </article>

          <ReadingRail sections={sections} />
        </div>
      </div>
    </main>
  );
}
