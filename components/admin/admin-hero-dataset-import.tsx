'use client';

import { useMemo, useState, useTransition } from 'react';

import {
  initialAdminHeroDatasetImportState,
  type AdminHeroDatasetImportState,
  type HeroImportDataset,
} from '@/lib/admin/admin-hero-dataset-import';
import { importHeroDatasetAction } from '@/lib/server/admin-hero-dataset-import-actions';
import {
  AdminFeedbackNotice,
  AdminFeedbackSection,
  AdminFeedbackStat,
} from '@/components/admin/admin-feedback-primitives';
import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';

type DatasetOption = {
  key: HeroImportDataset;
  label: string;
  title: string;
  description: string;
  rowFormatLabel: string;
  textareaLabel: string;
  placeholder: string;
  formatExample: string;
};

const DATASET_OPTIONS: readonly DatasetOption[] = [
  {
    key: 'pairTraitWeight',
    label: 'Pair Traits',
    title: 'Pair Trait Weights',
    description: 'Replace the version-scoped pair-to-trait weights used to aggregate Hero traits from the six domain pair winners.',
    rowFormatLabel: 'profile-domain | pair-key | trait-key | weight',
    textareaLabel: 'Paste pair-trait weight rows',
    placeholder: 'operatingStyle | analyst_driver | paced | 2',
    formatExample: [
      'operatingStyle | analyst_driver | paced | 2',
      'operatingStyle | analyst_driver | structured | 1',
      'pressureResponse | control_critical | exacting | 2',
      'pressureResponse | control_critical | assertive | 1',
    ].join('\n'),
  },
  {
    key: 'heroRule',
    label: 'Rules',
    title: 'Hero Pattern Rules',
    description: 'Replace the priority-ordered rule rows used to match Hero patterns from the aggregated trait totals.',
    rowFormatLabel: 'pattern | priority | rule-type | trait-key | operator | threshold',
    textareaLabel: 'Paste Hero rule rows',
    placeholder: 'adaptive_mobiliser | 24 | condition | adaptive | >= | 3',
    formatExample: [
      'adaptive_mobiliser | 24 | condition | adaptive | >= | 3',
      'adaptive_mobiliser | 24 | condition | flexible | >= | 0',
      'adaptive_mobiliser | 24 | exclusion | people_led | >= | 4',
      'steady_steward | 26 | condition | stable | >= | 2',
    ].join('\n'),
  },
  {
    key: 'heroLanguage',
    label: 'Language',
    title: 'Hero Pattern Language',
    description: 'Replace the pattern language used when the Hero engine selects a final pattern or the balanced fallback.',
    rowFormatLabel: 'pattern | field | content',
    textareaLabel: 'Paste Hero language rows',
    placeholder: 'forceful_driver | headline | You push momentum into motion quickly.',
    formatExample: [
      'forceful_driver | headline | You push momentum into motion quickly.',
      'forceful_driver | subheadline | Fast, assertive, and willing to make the path visible before the room fully settles.',
      'forceful_driver | narrative | You are likely to read hesitation as a signal to step in, sharpen priorities, and move the work forward decisively.',
      'balanced_operator | headline | You present as broadly balanced rather than sharply polarised.',
    ].join('\n'),
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

export function AdminHeroDatasetImport({
  assessmentVersionId,
  counts,
  isEditableAssessmentVersion,
}: Readonly<{
  assessmentVersionId: string;
  counts: {
    pairTraitWeights: { entryCount: number };
    heroPatternRules: { entryCount: number };
    heroPatternLanguage: { entryCount: number };
  };
  isEditableAssessmentVersion: boolean;
}>) {
  const action = useMemo(
    () => importHeroDatasetAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [selectedDataset, setSelectedDataset] = useState<HeroImportDataset>('pairTraitWeight');
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminHeroDatasetImportState>(
    initialAdminHeroDatasetImportState,
  );
  const [hasImported, setHasImported] = useState(false);
  const [isImportPending, startImportTransition] = useTransition();

  const selectedOption = DATASET_OPTIONS.find((option) => option.key === selectedDataset) ?? DATASET_OPTIONS[0];
  const existingRowCount =
    selectedDataset === 'pairTraitWeight'
      ? counts.pairTraitWeights.entryCount
      : selectedDataset === 'heroRule'
        ? counts.heroPatternRules.entryCount
        : counts.heroPatternLanguage.entryCount;
  const inlineError =
    resultState.dataset === selectedDataset
      ? resultState.formError ??
        resultState.executionError ??
        resultState.parseErrors[0]?.message ??
        resultState.validationErrors[0]?.message ??
        resultState.planErrors[0]?.message ??
        null
      : null;

  function resetResult(dataset: HeroImportDataset, nextRawInput: string) {
    setResultState({
      ...initialAdminHeroDatasetImportState,
      dataset,
      rawInput: nextRawInput,
    });
  }

  function handleDatasetChange(nextDataset: HeroImportDataset) {
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

      if (nextState.success && typeof window !== 'undefined') {
        setHasImported(true);
        window.location.reload();
      }
    });
  }

  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Hero Engine</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">Import Hero datasets</h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Replace the version-scoped pair traits, pattern rules, and pattern language used by the canonical Hero engine.
          </p>
        </div>

        {!isEditableAssessmentVersion ? (
          <AdminFeedbackNotice tone="warning">
            Hero datasets are only editable for draft assessment versions.
          </AdminFeedbackNotice>
        ) : null}

        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Dataset type</p>
          <div className="grid gap-3 sm:grid-cols-3">
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
              Current rows: {existingRowCount}
            </LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              Format: {selectedOption.rowFormatLabel}
            </LabelPill>
          </div>
          <p className="mt-3 text-sm leading-7 text-white/62">{selectedOption.description}</p>
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
            {inlineError ?? 'Import replaces the selected Hero dataset for this assessment version only.'}
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
                            <p className="sonartra-admin-feedback-section-title">{entry.label}</p>
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
