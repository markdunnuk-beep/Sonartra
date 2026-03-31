'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  initialAdminBulkWeightImportState,
  type AdminBulkWeightImportState,
} from '@/lib/admin/admin-bulk-weight-import';
import {
  importBulkWeightsAction,
  previewBulkWeightsAction,
} from '@/lib/server/admin-bulk-weight-import-actions';
import {
  LabelPill,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';

type AdminBulkWeightImportProps = {
  assessmentVersionId: string;
  isEditableAssessmentVersion: boolean;
};

const BULK_WEIGHT_FORMAT_EXAMPLE = [
  'question_number | option_label | signal_key | weight',
  '',
  '1|A|driver|3',
  '1|A|influencer|1',
  '1|A|implementer|0',
  '1|A|analyst|2',
  '1|B|driver|0',
  '1|B|influencer|3',
].join('\n');

function ActionButton({
  children,
  disabled,
  onClick,
  variant = 'secondary',
}: Readonly<{
  children: string;
  disabled: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}>) {
  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring',
        variant === 'primary' ? 'sonartra-button-primary' : 'sonartra-button-secondary',
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

  return (
    <div className={cn('rounded-[1rem] border px-4 py-3 text-sm', toneClass)}>
      {children}
    </div>
  );
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

function IssueList({
  items,
  renderLine,
  tone = 'danger',
}: Readonly<{
  items: readonly unknown[];
  renderLine: (item: unknown, index: number) => React.ReactNode;
  tone?: 'danger' | 'warning';
}>) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <InlineBanner key={index} tone={tone}>
          {renderLine(item, index)}
        </InlineBanner>
      ))}
    </div>
  );
}

function SummaryGrid({ state }: Readonly<{ state: AdminBulkWeightImportState }>) {
  const isImportResult = state.lastAction === 'import' && state.success;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Option groups</p>
        <p className="mt-2 text-lg font-semibold text-white">{state.summary.optionGroupCount}</p>
      </div>
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Questions matched</p>
        <p className="mt-2 text-lg font-semibold text-white">{state.summary.questionCountMatched}</p>
      </div>
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
          {isImportResult ? 'Option groups imported' : 'Option groups matched'}
        </p>
        <p className="mt-2 text-lg font-semibold text-white">
          {isImportResult ? state.summary.optionGroupCountImported : state.summary.optionGroupCountMatched}
        </p>
      </div>
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
          {isImportResult ? 'Weights inserted' : 'Existing weights to replace'}
        </p>
        <p className="mt-2 text-lg font-semibold text-white">
          {isImportResult ? state.summary.weightsInserted : state.summary.weightsDeleted}
        </p>
      </div>
    </div>
  );
}

export function AdminBulkWeightImport({
  assessmentVersionId,
  isEditableAssessmentVersion,
}: AdminBulkWeightImportProps) {
  const router = useRouter();
  const previewAction = useMemo(
    () => previewBulkWeightsAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const importAction = useMemo(
    () => importBulkWeightsAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminBulkWeightImportState>(
    initialAdminBulkWeightImportState,
  );
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();

  const isInputEmpty = rawInput.trim().length === 0;
  const isBusy = isPreviewPending || isImportPending;
  const showResult = resultState.hasSubmitted;
  const hasBlockingErrors =
    resultState.parseErrors.length > 0 ||
    resultState.groupErrors.length > 0 ||
    resultState.planErrors.length > 0 ||
    Boolean(resultState.executionError);
  const canImport =
    !isInputEmpty &&
    !isBusy &&
    isEditableAssessmentVersion &&
    resultState.canImport &&
    !hasBlockingErrors;

  function handlePreview() {
    if (isInputEmpty || isBusy || !isEditableAssessmentVersion) {
      return;
    }

    startPreviewTransition(async () => {
      const nextState = await previewAction({ rawInput });
      setResultState(nextState);
    });
  }

  function handleImport() {
    if (!canImport) {
      return;
    }

    startImportTransition(async () => {
      const nextState = await importAction({ rawInput });
      setResultState(nextState);
      if (nextState.success) {
        router.refresh();
      }
    });
  }

  function handleClear() {
    setRawInput('');
    setResultState(initialAdminBulkWeightImportState);
  }

  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Bulk weight import</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Bulk weight import
          </h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Paste one weight row per line using the format: question_number | option_label | signal_key | weight
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Each row assigns one signal weight to one option for one question.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Import replaces all existing weights for each matched question/option group in this draft version.
          </p>
        </div>

        {!isEditableAssessmentVersion ? (
          <InlineBanner tone="warning">
            Bulk weight import is only available for draft assessment versions.
          </InlineBanner>
        ) : null}

        <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Expected format</p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-white/78">
            {BULK_WEIGHT_FORMAT_EXAMPLE}
          </pre>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-white">Paste weight rows</span>
          <textarea
            aria-label="Bulk weight import rows"
            className={cn(
              'sonartra-focus-ring min-h-[240px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
              'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
            )}
            disabled={!isEditableAssessmentVersion}
            onChange={(event) => {
              const nextRawInput = event.currentTarget.value;
              setRawInput(nextRawInput);
            }}
            placeholder="1|A|driver|3"
            value={rawInput}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            disabled={isInputEmpty || isBusy || !isEditableAssessmentVersion}
            onClick={handlePreview}
            variant="secondary"
          >
            {isPreviewPending ? 'Previewing...' : 'Preview import'}
          </ActionButton>
          <ActionButton disabled={!canImport} onClick={handleImport} variant="primary">
            {isImportPending ? 'Importing...' : 'Import weights'}
          </ActionButton>
          <ActionButton disabled={isBusy || isInputEmpty} onClick={handleClear} variant="secondary">
            Clear
          </ActionButton>
        </div>

        {showResult ? (
          <div className="space-y-5">
            {resultState.formError ? (
              <InlineBanner tone="danger">{resultState.formError}</InlineBanner>
            ) : null}

            <SectionBlock title="Summary">
              <SummaryGrid state={resultState} />
            </SectionBlock>

            {resultState.parseErrors.length > 0 ? (
              <SectionBlock title="Parse errors">
                <IssueList
                  items={resultState.parseErrors}
                  renderLine={(item) => {
                    const issue = item as AdminBulkWeightImportState['parseErrors'][number];
                    return `Line ${issue.lineNumber}: ${issue.message}`;
                  }}
                />
              </SectionBlock>
            ) : null}

            {resultState.groupErrors.length > 0 ? (
              <SectionBlock title="Weight group errors">
                <IssueList
                  items={resultState.groupErrors}
                  renderLine={(item) => {
                    const issue = item as AdminBulkWeightImportState['groupErrors'][number];
                    return `Question ${issue.questionNumber} option ${issue.optionLabel} (lines ${issue.lineNumbers.join(', ')}): ${issue.message}`;
                  }}
                />
              </SectionBlock>
            ) : null}

            {resultState.planErrors.length > 0 ? (
              <SectionBlock title="Assessment mapping errors">
                <IssueList
                  items={resultState.planErrors}
                  renderLine={(item) => {
                    const issue = item as AdminBulkWeightImportState['planErrors'][number];
                    const prefix =
                      issue.questionNumber === null
                        ? ''
                        : `Question ${issue.questionNumber}${issue.optionLabel ? ` option ${issue.optionLabel}` : ''}: `;
                    return `${prefix}${issue.message}`;
                  }}
                />
              </SectionBlock>
            ) : null}

            {resultState.warnings.length > 0 ? (
              <SectionBlock title="Warnings">
                <InlineBanner tone="warning">
                  Warnings do not block import, but they should be reviewed before proceeding.
                </InlineBanner>
                <IssueList
                  items={resultState.warnings}
                  renderLine={(item) => {
                    const issue = item as AdminBulkWeightImportState['warnings'][number];
                    return `Question ${issue.questionNumber} option ${issue.optionLabel} (lines ${issue.lineNumbers.join(', ')}): ${issue.message}`;
                  }}
                  tone="warning"
                />
              </SectionBlock>
            ) : null}

            {resultState.plannedOptionGroups.length > 0 ? (
              <SectionBlock title="Weight group preview">
                <div className="space-y-4">
                  {resultState.plannedOptionGroups.map((group) => (
                    <div
                      className="rounded-[1rem] border border-white/8 bg-black/10 p-4"
                      key={`${group.questionId}-${group.optionId}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          Question {group.questionNumber} - Option {group.optionLabel}
                        </p>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          {group.optionKey}
                        </LabelPill>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          Existing weights will be replaced
                        </LabelPill>
                      </div>
                      <div className="mt-4 space-y-2">
                        {group.replacementWeights.map((weight) => (
                          <div
                            className="rounded-[0.9rem] border border-white/8 bg-black/10 px-3 py-2 text-sm text-white/82"
                            key={`${group.optionId}-${weight.signalId}`}
                          >
                            {`${weight.signalKey}: ${weight.weight}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionBlock>
            ) : null}

            {resultState.lastAction === 'import' ? (
              <SectionBlock title="Import result summary">
                {resultState.success ? (
                  <InlineBanner tone="success">
                    {`Imported ${resultState.summary.optionGroupCountImported} option groups and inserted ${resultState.summary.weightsInserted} weight rows.`}
                  </InlineBanner>
                ) : resultState.executionError ? (
                  <InlineBanner tone="danger">{resultState.executionError}</InlineBanner>
                ) : (
                  <InlineBanner tone="neutral">
                    Import did not run because the current preview contains blocking issues.
                  </InlineBanner>
                )}
              </SectionBlock>
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
