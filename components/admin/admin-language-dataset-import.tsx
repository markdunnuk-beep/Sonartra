'use client';

import { useMemo, useState, useTransition } from 'react';

import {
  initialAdminLanguageDatasetImportState,
  type AdminLanguageDatasetImportState,
  type LanguageImportDataset,
} from '@/lib/admin/admin-language-dataset-import';
import { REPORT_ALIGNED_AUTHORING_NOTE } from '@/lib/admin/report-language-import';
import { importLanguageDatasetAction } from '@/lib/server/admin-language-dataset-import-actions';
import {
  AdminFeedbackNotice,
  AdminFeedbackSection,
  AdminFeedbackStat,
} from '@/components/admin/admin-feedback-primitives';
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
    description: 'Author chapterOpening rows for report domains.',
    detail:
      'Domain Chapter Language supports chapterOpening only. Signal ordering, primary and secondary signal selection, and pair selection remain engine-resolved.',
    currentRowsLabel: 'Current Domain rows',
    rowFormatLabel: 'section | target | field | content',
    textareaLabel: 'Paste domain chapter rows',
    placeholder:
      'domain | signal_style | chapterOpening | You tend to operate with visible pace, structure, and interpersonal impact.',
    formatExample: [
      'domain | signal_style | chapterOpening | You tend to operate with visible pace, structure, and interpersonal impact.',
    ].join('\n'),
  },
  {
    key: 'signal',
    label: 'Signal',
    title: 'Signal Language',
    description: 'Author chapterSummary, strength, watchout, and development language by signal.',
    detail:
      'These are reusable report building blocks. The engine decides where each signal sentence appears.',
    currentRowsLabel: 'Current Signal rows',
    rowFormatLabel: 'section | target | field | content',
    textareaLabel: 'Paste signal rows',
    placeholder: 'signal | style_driver | chapterSummary | You tend to move quickly and take initiative.',
    formatExample: [
      'signal | style_driver | chapterSummary | You tend to move quickly and take initiative.',
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
          <p className="sonartra-page-eyebrow">Report Language</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">Import report language</h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Select the section you want to replace, paste the rows, and run a single import action.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">{REPORT_ALIGNED_AUTHORING_NOTE}</p>
        </div>

        {!isEditableAssessmentVersion ? (
          <AdminFeedbackNotice tone="warning">
            Language datasets are only editable for draft assessment versions.
          </AdminFeedbackNotice>
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

        <div className="sonartra-admin-feedback-card rounded-[1rem] border p-4">
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
          <p className="sonartra-admin-feedback-section-title mt-3">Example</p>
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
            <AdminFeedbackSection title="Summary">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <AdminFeedbackStat label="Pasted rows" value={String(resultState.summary.rowCount)} />
                <AdminFeedbackStat label="Targets in batch" value={String(resultState.summary.targetCount)} />
                <AdminFeedbackStat
                  label={resultState.success ? 'Rows imported' : 'Existing rows to replace'}
                  value={String(resultState.success ? resultState.summary.importedRowCount : resultState.summary.existingRowCount)}
                />
                <AdminFeedbackStat
                  label={resultState.success ? 'Targets imported' : 'Current stored rows'}
                  value={String(resultState.success ? resultState.summary.importedTargetCount : existingRowCount)}
                />
              </div>
            </AdminFeedbackSection>

            {resultState.success ? (
              <AdminFeedbackNotice tone="success">
                {`Imported ${resultState.summary.importedRowCount} rows across ${resultState.summary.importedTargetCount} targets.`}
              </AdminFeedbackNotice>
            ) : null}

            {resultState.parseErrors.length > 0 ? (
              <AdminFeedbackSection title="Validation errors">
                <div className="space-y-2">
                  {resultState.parseErrors.map((issue) => (
                    <AdminFeedbackNotice key={issue.key} tone="danger">
                      {issue.message}
                    </AdminFeedbackNotice>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}

            {resultState.validationErrors.length > 0 ? (
              <AdminFeedbackSection title="Row errors">
                <div className="space-y-2">
                  {resultState.validationErrors.map((issue) => (
                    <AdminFeedbackNotice key={issue.key} tone="danger">
                      {issue.message}
                    </AdminFeedbackNotice>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}

            {resultState.planErrors.length > 0 ? (
              <AdminFeedbackSection title="Assessment mapping errors">
                <div className="space-y-2">
                  {resultState.planErrors.map((issue) => (
                    <AdminFeedbackNotice key={issue.key} tone="danger">
                      {issue.message}
                    </AdminFeedbackNotice>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}

            {resultState.previewGroups.length > 0 ? (
              <AdminFeedbackSection title="Imported dataset">
                <div className="space-y-4">
                  {resultState.previewGroups.map((group) => (
                    <div className="sonartra-admin-feedback-card rounded-[1rem] border p-4" key={group.targetKey}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{group.targetLabel}</p>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          {group.entries.length} row{group.entries.length === 1 ? '' : 's'}
                        </LabelPill>
                      </div>
                      <div className="mt-4 space-y-2">
                        {group.entries.map((entry) => (
                          <div
                            className="sonartra-admin-feedback-card rounded-[0.9rem] border px-3 py-3"
                            key={`${group.targetKey}-${entry.label}-${entry.lineNumber}`}
                          >
                            <p className="sonartra-admin-feedback-section-title">
                              {entry.label}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/82">{entry.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
