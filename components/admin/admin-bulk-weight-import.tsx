'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  initialAdminBulkWeightImportState,
  type AdminBulkWeightImportState,
} from '@/lib/admin/admin-bulk-weight-import';
import {
  importBulkWeightsAction,
} from '@/lib/server/admin-bulk-weight-import-actions';
import {
  AdminFeedbackNotice,
  AdminFeedbackSection,
  AdminFeedbackStat,
} from '@/components/admin/admin-feedback-primitives';
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
        <AdminFeedbackNotice key={index} tone={tone}>
          {renderLine(item, index)}
        </AdminFeedbackNotice>
      ))}
    </div>
  );
}

function SummaryGrid({ state }: Readonly<{ state: AdminBulkWeightImportState }>) {
  const isImportResult = state.lastAction === 'import' && state.success;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <AdminFeedbackStat label="Option groups" value={String(state.summary.optionGroupCount)} />
      <AdminFeedbackStat label="Questions matched" value={String(state.summary.questionCountMatched)} />
      <AdminFeedbackStat
        label={isImportResult ? 'Option groups imported' : 'Option groups matched'}
        value={String(isImportResult ? state.summary.optionGroupCountImported : state.summary.optionGroupCountMatched)}
      />
      <AdminFeedbackStat
        label={isImportResult ? 'Weights inserted' : 'Existing weights to replace'}
        value={String(isImportResult ? state.summary.weightsInserted : state.summary.weightsDeleted)}
      />
    </div>
  );
}

export function AdminBulkWeightImport({
  assessmentVersionId,
  isEditableAssessmentVersion,
}: AdminBulkWeightImportProps) {
  const router = useRouter();
  const importAction = useMemo(
    () => importBulkWeightsAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminBulkWeightImportState>(
    initialAdminBulkWeightImportState,
  );
  const [hasImported, setHasImported] = useState(false);
  const [isImportPending, startImportTransition] = useTransition();

  const isInputEmpty = rawInput.trim().length === 0;
  const isBusy = isImportPending;
  const showResult = resultState.hasSubmitted;
  const actionErrorMessage =
    resultState.formError ??
    resultState.executionError ??
    (resultState.hasSubmitted && !resultState.success && (
      resultState.parseErrors.length > 0 ||
      resultState.groupErrors.length > 0 ||
      resultState.planErrors.length > 0
    )
      ? 'Review the highlighted import issues, then try again.'
      : null);
  const canImport =
    !isInputEmpty &&
    !isBusy &&
    isEditableAssessmentVersion;

  function handleImport() {
    if (!canImport) {
      return;
    }

    startImportTransition(async () => {
      const nextState = await importAction({ rawInput });
      setResultState(nextState);
      if (nextState.success) {
        setHasImported(true);
        router.refresh();
        return;
      }

      setHasImported(false);
    });
  }

  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Weights</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Import weights
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
          <AdminFeedbackNotice tone="warning">
            Bulk weight import is only available for draft assessment versions.
          </AdminFeedbackNotice>
        ) : null}

        <div className="sonartra-admin-feedback-card rounded-[1rem] border p-4">
          <p className="sonartra-admin-feedback-section-title">Expected format</p>
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
              setHasImported(false);
            }}
            placeholder="1|A|driver|3"
            value={rawInput}
          />
        </label>

        {actionErrorMessage ? <AdminFeedbackNotice tone="danger">{actionErrorMessage}</AdminFeedbackNotice> : null}

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton disabled={!canImport} onClick={handleImport} variant="primary">
            {isImportPending ? 'Importing...' : hasImported ? 'Imported' : 'Import'}
          </ActionButton>
        </div>

        {showResult ? (
          <div className="space-y-5">
            <AdminFeedbackSection title="Summary">
              <SummaryGrid state={resultState} />
            </AdminFeedbackSection>

            {resultState.parseErrors.length > 0 ? (
              <AdminFeedbackSection title="Parse errors">
                <IssueList
                  items={resultState.parseErrors}
                  renderLine={(item) => {
                    const issue = item as AdminBulkWeightImportState['parseErrors'][number];
                    return `Line ${issue.lineNumber}: ${issue.message}`;
                  }}
                />
              </AdminFeedbackSection>
            ) : null}

            {resultState.groupErrors.length > 0 ? (
              <AdminFeedbackSection title="Weight group errors">
                <IssueList
                  items={resultState.groupErrors}
                  renderLine={(item) => {
                    const issue = item as AdminBulkWeightImportState['groupErrors'][number];
                    return `Question ${issue.questionNumber} option ${issue.optionLabel} (lines ${issue.lineNumbers.join(', ')}): ${issue.message}`;
                  }}
                />
              </AdminFeedbackSection>
            ) : null}

            {resultState.planErrors.length > 0 ? (
              <AdminFeedbackSection title="Assessment mapping errors">
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
              </AdminFeedbackSection>
            ) : null}

            {resultState.warnings.length > 0 ? (
              <AdminFeedbackSection title="Warnings">
                <AdminFeedbackNotice tone="warning">
                  Warnings do not block import, but they should be reviewed before proceeding.
                </AdminFeedbackNotice>
                <IssueList
                  items={resultState.warnings}
                  renderLine={(item) => {
                    const issue = item as AdminBulkWeightImportState['warnings'][number];
                    return `Question ${issue.questionNumber} option ${issue.optionLabel} (lines ${issue.lineNumbers.join(', ')}): ${issue.message}`;
                  }}
                  tone="warning"
                />
              </AdminFeedbackSection>
            ) : null}

            {resultState.plannedOptionGroups.length > 0 ? (
              <AdminFeedbackSection title="Weight group preview">
                <div className="space-y-4">
                  {resultState.plannedOptionGroups.map((group) => (
                    <div
                      className="sonartra-admin-feedback-card rounded-[1rem] border p-4"
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
                            className="sonartra-admin-feedback-card rounded-[0.9rem] border px-3 py-2 text-sm text-white/82"
                            key={`${group.optionId}-${weight.signalId}`}
                          >
                            {`${weight.signalKey}: ${weight.weight}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}

            {resultState.lastAction === 'import' ? (
              <AdminFeedbackSection title="Import result summary">
                {resultState.success ? (
                  <AdminFeedbackNotice tone="success">
                    {`Imported ${resultState.summary.optionGroupCountImported} option groups and inserted ${resultState.summary.weightsInserted} weight rows.`}
                  </AdminFeedbackNotice>
                ) : resultState.executionError ? (
                  <AdminFeedbackNotice tone="danger">{resultState.executionError}</AdminFeedbackNotice>
                ) : (
                  <AdminFeedbackNotice tone="neutral">
                    Import did not run because the current input still contains blocking issues.
                  </AdminFeedbackNotice>
                )}
              </AdminFeedbackSection>
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
