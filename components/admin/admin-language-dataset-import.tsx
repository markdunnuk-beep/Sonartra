'use client';

import { useMemo, useState, useTransition } from 'react';

import {
  initialAdminLanguageDatasetImportState,
  type AdminLanguageDatasetImportState,
  type LanguageImportDataset,
} from '@/lib/admin/admin-language-dataset-import';
import { REPORT_ALIGNED_AUTHORING_NOTE } from '@/lib/admin/report-language-import';
import { importLanguageDatasetAction } from '@/lib/server/admin-language-dataset-import-actions';
import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';

type DatasetOption = {
  key: LanguageImportDataset;
  label: string;
  title: string;
  description: string;
  detail: string;
  currentRowsLabel: string;
  rowFormatLabel: string;
  textareaLabel: string;
  placeholder: string;
  formatExample: string;
};

const DATASET_OPTIONS: readonly DatasetOption[] = [
  {
    key: 'heroHeader',
    label: 'Hero Header',
    title: 'Hero Header Language',
    description: 'Author pair-level hero headlines for the opening line shown at the top of the report.',
    detail: 'Format: scope | key | headline',
    currentRowsLabel: 'Current Hero Header rows',
    rowFormatLabel: 'scope | key | headline',
    textareaLabel: 'Paste Hero Header rows',
    placeholder: 'pair | driver_influencer | Fast-moving, people-driven and energised by momentum',
    formatExample: [
      'pair | driver_influencer | Fast-moving, people-driven and energised by momentum',
      'pair | driver_analyst | Decisive with structure, balancing speed with considered thinking',
    ].join('\n'),
  },
  {
    key: 'domain',
    label: 'Chapter',
    title: 'Domain Chapter Language',
    description: 'Author summary override, focus, pressure, and environment rows for report domains.',
    detail:
      'Signal ordering, primary and secondary signal selection, and pair selection remain engine-resolved.',
    currentRowsLabel: 'Current Domain rows',
    rowFormatLabel: 'section | target | field | content',
    textareaLabel: 'Paste domain chapter rows',
    placeholder:
      'domain | signal_style | focus | Your strongest contribution in this area is how you bring direction and consistency.',
    formatExample: [
      'domain | signal_style | summary | You tend to operate with visible pace, structure, and interpersonal impact.',
      'domain | signal_style | focus | Your strongest contribution in this area is how you bring direction and consistency.',
      'domain | signal_style | pressure | Under pressure, you may narrow your attention or become more forceful in your style.',
      'domain | signal_style | environment | You perform best where expectations, pace, and collaboration are clear.',
    ].join('\n'),
  },
  {
    key: 'signal',
    label: 'Signal',
    title: 'Signal Language',
    description: 'Author summary, strength, watchout, and development language by signal.',
    detail:
      'These are reusable report building blocks. The engine decides where each signal sentence appears.',
    currentRowsLabel: 'Current Signal rows',
    rowFormatLabel: 'section | target | field | content',
    textareaLabel: 'Paste signal rows',
    placeholder: 'signal | style_driver | summary | You tend to move quickly and take initiative.',
    formatExample: [
      'signal | style_driver | summary | You tend to move quickly and take initiative.',
      'signal | style_driver | strength | You bring momentum and energy to delivery.',
      'signal | style_driver | watchout | You may move ahead before others are ready.',
      'signal | style_driver | development | Pause slightly longer before committing to direction.',
    ].join('\n'),
  },
  {
    key: 'pair',
    label: 'Pair Summary',
    title: 'Pair Summary Language',
    description: 'Author pair summaries only. Pair strength and watchout are legacy-only and are not surfaced here.',
    detail:
      'Pair keys remain canonicalized under the hood so report-shaped inputs still round-trip into the current storage model safely.',
    currentRowsLabel: 'Current Pair rows',
    rowFormatLabel: 'section | target | field | content',
    textareaLabel: 'Paste pair summary rows',
    placeholder: 'pair | driver_analyst | summary | You combine forward momentum with structured thinking.',
    formatExample: 'pair | driver_analyst | summary | You combine forward momentum with structured thinking.',
  },
] as const;

function ActionButton({
  children,
  disabled,
  onClick,
}: Readonly<{
  children: string;
  disabled: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring sonartra-button-primary min-w-[140px]',
        disabled && 'cursor-not-allowed border-white/8 bg-white/[0.05] text-white/42',
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function InlineBanner({
  tone,
  children,
}: Readonly<{
  tone: 'danger' | 'warning' | 'success' | 'neutral';
  children: React.ReactNode;
}>) {
  const toneClass =
    tone === 'danger'
      ? 'border-[rgba(255,157,157,0.24)] bg-[rgba(80,20,20,0.22)] text-[rgba(255,216,216,0.94)]'
      : tone === 'warning'
        ? 'border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] text-[rgba(255,234,196,0.94)]'
        : tone === 'success'
          ? 'border-[rgba(151,233,182,0.22)] bg-[rgba(16,61,34,0.26)] text-[rgba(217,255,229,0.94)]'
          : 'border-white/10 bg-black/10 text-white/72';

  return <div className={cn('rounded-[1rem] border px-4 py-3 text-sm', toneClass)}>{children}</div>;
}

function SectionBlock({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/56">{title}</h4>
      {children}
    </section>
  );
}

export function AdminLanguageDatasetImport({
  assessmentVersionId,
  counts,
  isEditableAssessmentVersion,
}: Readonly<{
  assessmentVersionId: string;
  counts: {
    heroHeaders: { entryCount: number };
    domains: { entryCount: number };
    signals: { entryCount: number };
    pairs: { entryCount: number };
  };
  isEditableAssessmentVersion: boolean;
}>) {
  const action = useMemo(
    () => importLanguageDatasetAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [selectedDataset, setSelectedDataset] = useState<LanguageImportDataset>('heroHeader');
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminLanguageDatasetImportState>(
    initialAdminLanguageDatasetImportState,
  );
  const [hasImported, setHasImported] = useState(false);
  const [isImportPending, startImportTransition] = useTransition();

  const selectedOption = DATASET_OPTIONS.find((option) => option.key === selectedDataset) ?? DATASET_OPTIONS[0];
  const existingRowCount =
    selectedDataset === 'heroHeader'
      ? counts.heroHeaders.entryCount
      : selectedDataset === 'domain'
        ? counts.domains.entryCount
        : selectedDataset === 'signal'
          ? counts.signals.entryCount
          : counts.pairs.entryCount;
  const inlineError =
    resultState.dataset === selectedDataset
      ? resultState.formError ??
        resultState.executionError ??
        resultState.parseErrors[0]?.message ??
        resultState.validationErrors[0]?.message ??
        resultState.planErrors[0]?.message ??
        null
      : null;

  function resetResult(dataset: LanguageImportDataset, nextRawInput: string) {
    setResultState({
      ...initialAdminLanguageDatasetImportState,
      dataset,
      rawInput: nextRawInput,
    });
  }

  function handleDatasetChange(nextDataset: LanguageImportDataset) {
    setSelectedDataset(nextDataset);
    setHasImported(false);
    resetResult(nextDataset, rawInput);
  }

  function handleInputChange(nextValue: string) {
    setRawInput(nextValue);
    setHasImported(false);
    resetResult(selectedDataset, nextValue);
  }

  function handleImport() {
    if (!rawInput.trim() || isImportPending || !isEditableAssessmentVersion) {
      return;
    }

    startImportTransition(async () => {
      const nextState = await action({ dataset: selectedDataset, rawInput });
      setResultState(nextState);

      if (nextState.success) {
        setHasImported(true);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    });
  }

  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Language Datasets</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">Language Import</h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Select the dataset you want to replace, paste the rows, and run a single import action.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">{REPORT_ALIGNED_AUTHORING_NOTE}</p>
        </div>

        {!isEditableAssessmentVersion ? (
          <InlineBanner tone="warning">
            Language datasets are only editable for draft assessment versions.
          </InlineBanner>
        ) : null}

        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Dataset type</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {DATASET_OPTIONS.map((option) => {
              const isSelected = option.key === selectedDataset;
              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    'sonartra-focus-ring rounded-[1rem] border px-4 py-4 text-left transition',
                    isSelected
                      ? 'border-[rgba(142,162,255,0.36)] bg-[rgba(142,162,255,0.08)]'
                      : 'border-white/8 bg-black/10 hover:border-white/14',
                  )}
                  key={option.key}
                  onClick={() => handleDatasetChange(option.key)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-white">{option.label}</p>
                  <p className="mt-2 text-sm leading-6 text-white/54">{option.title}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              {selectedOption.currentRowsLabel}: {existingRowCount}
            </LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              Format: {selectedOption.rowFormatLabel}
            </LabelPill>
          </div>
          <p className="mt-3 text-sm leading-7 text-white/62">{selectedOption.description}</p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">{selectedOption.detail}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-white/42">Example</p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-white/78">
            {selectedOption.formatExample}
          </pre>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-white">{selectedOption.textareaLabel}</span>
          <textarea
            aria-label={selectedOption.textareaLabel}
            className={cn(
              'sonartra-focus-ring min-h-[240px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
              inlineError
                ? 'border-[rgba(255,157,157,0.32)]'
                : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
            )}
            disabled={!isEditableAssessmentVersion || isImportPending}
            onChange={(event) => handleInputChange(event.currentTarget.value)}
            placeholder={selectedOption.placeholder}
            value={rawInput}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={inlineError ? 'text-sm text-[rgba(255,198,198,0.92)]' : 'text-sm text-white/45'}>
            {inlineError ?? 'Import replaces the selected dataset for this assessment version only.'}
          </p>
          <ActionButton
            disabled={!rawInput.trim() || isImportPending || !isEditableAssessmentVersion}
            onClick={handleImport}
          >
            {isImportPending ? 'Importing...' : hasImported ? 'Imported' : 'Import'}
          </ActionButton>
        </div>

        {resultState.dataset === selectedDataset &&
        (resultState.success ||
          resultState.parseErrors.length > 0 ||
          resultState.validationErrors.length > 0 ||
          resultState.planErrors.length > 0 ||
          Boolean(resultState.executionError) ||
          Boolean(resultState.formError)) ? (
          <div className="space-y-5">
            <SectionBlock title="Summary">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Pasted rows</p>
                  <p className="mt-2 text-lg font-semibold text-white">{resultState.summary.rowCount}</p>
                </div>
                <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Targets in batch</p>
                  <p className="mt-2 text-lg font-semibold text-white">{resultState.summary.targetCount}</p>
                </div>
                <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
                    {resultState.success ? 'Rows imported' : 'Existing rows to replace'}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {resultState.success ? resultState.summary.importedRowCount : resultState.summary.existingRowCount}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
                    {resultState.success ? 'Targets imported' : 'Current stored rows'}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {resultState.success ? resultState.summary.importedTargetCount : existingRowCount}
                  </p>
                </div>
              </div>
            </SectionBlock>

            {resultState.success ? (
              <InlineBanner tone="success">
                {`Imported ${resultState.summary.importedRowCount} rows across ${resultState.summary.importedTargetCount} targets.`}
              </InlineBanner>
            ) : null}

            {resultState.parseErrors.length > 0 ? (
              <SectionBlock title="Validation errors">
                <div className="space-y-2">
                  {resultState.parseErrors.map((issue) => (
                    <InlineBanner key={issue.key} tone="danger">
                      {issue.message}
                    </InlineBanner>
                  ))}
                </div>
              </SectionBlock>
            ) : null}

            {resultState.validationErrors.length > 0 ? (
              <SectionBlock title="Row errors">
                <div className="space-y-2">
                  {resultState.validationErrors.map((issue) => (
                    <InlineBanner key={issue.key} tone="danger">
                      {issue.message}
                    </InlineBanner>
                  ))}
                </div>
              </SectionBlock>
            ) : null}

            {resultState.planErrors.length > 0 ? (
              <SectionBlock title="Assessment mapping errors">
                <div className="space-y-2">
                  {resultState.planErrors.map((issue) => (
                    <InlineBanner key={issue.key} tone="danger">
                      {issue.message}
                    </InlineBanner>
                  ))}
                </div>
              </SectionBlock>
            ) : null}

            {resultState.previewGroups.length > 0 ? (
              <SectionBlock title="Imported dataset">
                <div className="space-y-4">
                  {resultState.previewGroups.map((group) => (
                    <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4" key={group.targetKey}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{group.targetLabel}</p>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          {group.entries.length} row{group.entries.length === 1 ? '' : 's'}
                        </LabelPill>
                      </div>
                      <div className="mt-4 space-y-2">
                        {group.entries.map((entry) => (
                          <div
                            className="rounded-[0.9rem] border border-white/8 bg-black/10 px-3 py-3"
                            key={`${group.targetKey}-${entry.label}-${entry.lineNumber}`}
                          >
                            <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
                              {entry.label}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/82">{entry.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionBlock>
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
