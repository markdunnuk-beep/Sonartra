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
      'domain | operating-style | chapterOpening | You tend to operate with visible pace, structure, and interpersonal impact.',
    formatExample: [
      'domain | operating-style | chapterOpening | You tend to operate with visible pace, structure, and interpersonal impact.',
    ].join('\n'),
  },
  {
    key: 'signal',
    label: 'Signal Chapter',
    title: 'Signal Chapter Language',
    description: 'Author chapterSummary rows for the primary and secondary signal readings.',
    detail:
      'Signal Chapter Language supports chapterSummary only. The results page reads these summaries directly from the canonical signal chapter payload.',
    currentRowsLabel: 'Current Signal rows',
    rowFormatLabel: 'section | target | field | content',
    textareaLabel: 'Paste signal chapter rows',
    placeholder: 'signal | driver | chapterSummary | You tend to move quickly and take initiative.',
    formatExample: [
      'signal | driver | chapterSummary | You tend to move quickly and take initiative.',
    ].join('\n'),
  },
  {
    key: 'pair',
    label: 'Signal Pair Chapter',
    title: 'Signal Pair Chapter Language',
    description: 'Author chapterSummary, pressureFocus, and environmentFocus rows for the pair-owned reading.',
    detail:
      'Signal Pair Chapter Language supports chapterSummary, pressureFocus, and environmentFocus only. Pair keys remain canonicalized under the hood so report-shaped inputs still land in the canonical pair-owned fields safely.',
    currentRowsLabel: 'Current Pair rows',
    rowFormatLabel: 'section | target | field | content',
    textareaLabel: 'Paste signal pair chapter rows',
    placeholder: 'pair | driver_analyst | chapterSummary | You combine forward momentum with structured thinking.',
    formatExample: [
      'pair | driver_analyst | chapterSummary | You combine forward momentum with structured thinking.',
      'pair | driver_analyst | pressureFocus | Under strain, pace can outrun reflection.',
      'pair | driver_analyst | environmentFocus | Best in environments that reward momentum with clear structure.',
    ].join('\n'),
  },
  {
    key: 'applicationThesis',
    label: 'Application Thesis',
    title: 'Application Thesis',
    description: 'Opening bridge into the final application chapter.',
    detail: 'Header: hero_pattern_key|headline|summary',
    currentRowsLabel: 'Current Thesis rows',
    rowFormatLabel: 'hero_pattern_key|headline|summary',
    textareaLabel: 'Paste application thesis rows',
    placeholder: 'steady_steward|You create value through calm structured follow-through|At your best you help work become clearer, steadier, and easier to carry.',
    formatExample: [
      'hero_pattern_key|headline|summary',
      'steady_steward|You create value through calm structured follow-through|At your best you help work become clearer, steadier, and easier to carry.',
    ].join('\n'),
  },
  {
    key: 'applicationContribution',
    label: 'Contribution Language',
    title: 'Contribution Language',
    description: 'How the person creates value at their best.',
    detail: 'Header: source_type|source_key|priority|label|narrative|best_when|watch_for',
    currentRowsLabel: 'Current Contribution rows',
    rowFormatLabel: 'source_type|source_key|priority|label|narrative|best_when|watch_for',
    textareaLabel: 'Paste contribution language rows',
    placeholder: 'pair|driver_analyst|1|Structured pace|Creates traction through structured pace.|When direction is clear and sequencing matters.|Can over-tighten the plan.',
    formatExample: [
      'source_type|source_key|priority|label|narrative|best_when|watch_for',
      'pair|driver_analyst|1|Structured pace|Creates traction through structured pace.|When direction is clear and sequencing matters.|Can over-tighten the plan.',
    ].join('\n'),
  },
  {
    key: 'applicationRisk',
    label: 'Risk Language',
    title: 'Risk Language',
    description: 'Where strengths can become limiting patterns.',
    detail: 'Header: source_type|source_key|priority|label|narrative|impact|early_warning',
    currentRowsLabel: 'Current Risk rows',
    rowFormatLabel: 'source_type|source_key|priority|label|narrative|impact|early_warning',
    textareaLabel: 'Paste risk language rows',
    placeholder: 'pair|driver_analyst|1|Over-control|Can narrow too early around the plan.|Other options get filtered out too soon.|Discussion becomes one-track.',
    formatExample: [
      'source_type|source_key|priority|label|narrative|impact|early_warning',
      'pair|driver_analyst|1|Over-control|Can narrow too early around the plan.|Other options get filtered out too soon.|Discussion becomes one-track.',
    ].join('\n'),
  },
  {
    key: 'applicationDevelopment',
    label: 'Development Language',
    title: 'Development Language',
    description: 'Where to build more range.',
    detail: 'Header: source_type|source_key|priority|label|narrative|practice|success_marker',
    currentRowsLabel: 'Current Development rows',
    rowFormatLabel: 'source_type|source_key|priority|label|narrative|practice|success_marker',
    textareaLabel: 'Paste development language rows',
    placeholder: 'signal|decision_evidence|1|Sharpen evidence|Support instinct with clearer proof points.|Bring two pieces of evidence to the decision.|Others can see the reasoning more clearly.',
    formatExample: [
      'source_type|source_key|priority|label|narrative|practice|success_marker',
      'signal|decision_evidence|1|Sharpen evidence|Support instinct with clearer proof points.|Bring two pieces of evidence to the decision.|Others can see the reasoning more clearly.',
    ].join('\n'),
  },
  {
    key: 'applicationActionPrompts',
    label: 'Action Prompt Language',
    title: 'Action Prompt Language',
    description: '30-day action guidance and feedback prompts.',
    detail: 'Header: source_type|source_key|keep_doing|watch_for|practice_next|ask_others',
    currentRowsLabel: 'Current Action Prompt rows',
    rowFormatLabel: 'source_type|source_key|keep_doing|watch_for|practice_next|ask_others',
    textareaLabel: 'Paste action prompt rows',
    placeholder: 'hero_pattern|steady_steward|Keep making the next step concrete.|Watch for locking too soon.|Widen the option set before closing.|Ask where your pace is helping or narrowing the work.',
    formatExample: [
      'source_type|source_key|keep_doing|watch_for|practice_next|ask_others',
      'hero_pattern|steady_steward|Keep making the next step concrete.|Watch for locking too soon.|Widen the option set before closing.|Ask where your pace is helping or narrowing the work.',
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


export function AdminLanguageDatasetImport({
  dataset,
  assessmentVersionId,
  counts,
  isEditableAssessmentVersion,
  sectionEyebrow,
  sectionTitle,
  sectionDescription,
}: Readonly<{
  dataset: LanguageImportDataset;
  assessmentVersionId: string;
  counts: {
    heroHeaders: { entryCount: number };
    domains: { entryCount: number };
    signals: { entryCount: number };
    pairs: { entryCount: number };
    applicationThesis: { entryCount: number };
    applicationContribution: { entryCount: number };
    applicationRisk: { entryCount: number };
    applicationDevelopment: { entryCount: number };
    applicationActionPrompts: { entryCount: number };
  };
  isEditableAssessmentVersion: boolean;
  sectionEyebrow?: string;
  sectionTitle?: string;
  sectionDescription?: string;
}>) {
  const action = useMemo(
    () => importLanguageDatasetAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminLanguageDatasetImportState>(
    initialAdminLanguageDatasetImportState,
  );
  const [hasImported, setHasImported] = useState(false);
  const [isImportPending, startImportTransition] = useTransition();

  const selectedOption = DATASET_OPTIONS.find((option) => option.key === dataset) ?? DATASET_OPTIONS[0];
  const resolvedSectionEyebrow = sectionEyebrow ?? selectedOption.title;
  const resolvedSectionTitle = sectionTitle ?? selectedOption.title;
  const resolvedSectionDescription =
    sectionDescription ?? selectedOption.description;
  const existingRowCount =
    dataset === 'heroHeader'
      ? counts.heroHeaders.entryCount
      : dataset === 'domain'
        ? counts.domains.entryCount
        : dataset === 'signal'
          ? counts.signals.entryCount
          : dataset === 'pair'
            ? counts.pairs.entryCount
            : dataset === 'applicationThesis'
              ? counts.applicationThesis.entryCount
              : dataset === 'applicationContribution'
                ? counts.applicationContribution.entryCount
                : dataset === 'applicationRisk'
                  ? counts.applicationRisk.entryCount
                  : dataset === 'applicationDevelopment'
                    ? counts.applicationDevelopment.entryCount
                    : counts.applicationActionPrompts.entryCount;
  const inlineError =
    resultState.dataset === dataset
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

  function handleInputChange(nextValue: string) {
    setRawInput(nextValue);
    setHasImported(false);
    resetResult(dataset, nextValue);
  }

  function handleImport() {
    if (!rawInput.trim() || isImportPending || !isEditableAssessmentVersion) {
      return;
    }

    startImportTransition(async () => {
      const nextState = await action({ dataset, rawInput });
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
          <p className="sonartra-page-eyebrow">{resolvedSectionEyebrow}</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">{resolvedSectionTitle}</h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">{resolvedSectionDescription}</p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">{REPORT_ALIGNED_AUTHORING_NOTE}</p>
        </div>

        {!isEditableAssessmentVersion ? (
          <AdminFeedbackNotice tone="warning">
            Language datasets are only editable for draft assessment versions.
          </AdminFeedbackNotice>
        ) : null}

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

        {resultState.dataset === dataset &&
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
