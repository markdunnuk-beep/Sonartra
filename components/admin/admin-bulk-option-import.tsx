'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  initialAdminBulkOptionImportState,
  type AdminBulkOptionImportState,
} from '@/lib/admin/admin-bulk-option-import';
import {
  importBulkOptionsAction,
} from '@/lib/server/admin-bulk-option-import-actions';
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

type AdminBulkOptionImportProps = {
  assessmentVersionId: string;
  isEditableAssessmentVersion: boolean;
};

const BULK_OPTION_FORMAT_EXAMPLE = [
  'question_number | option_label | option_text',
  '',
  '1|A|I prefer to move quickly and decide fast',
  '1|B|I prefer to discuss options with others',
  '1|C|I focus on structure and consistency',
  '1|D|I step back and analyse the detail',
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
}: Readonly<{
  items: readonly unknown[];
  renderLine: (item: unknown, index: number) => React.ReactNode;
}>) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <AdminFeedbackNotice key={index} tone="danger">
          {renderLine(item, index)}
        </AdminFeedbackNotice>
      ))}
    </div>
  );
}

function SummaryGrid({ state }: Readonly<{ state: AdminBulkOptionImportState }>) {
  const isImportResult = state.lastAction === 'import' && state.success;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <AdminFeedbackStat label="Question groups" value={String(state.summary.questionGroupCount)} />
      <AdminFeedbackStat label="Questions matched" value={String(state.summary.questionsMatched)} />
      <AdminFeedbackStat
        label={isImportResult ? 'Questions imported' : 'Options to insert'}
        value={String(isImportResult ? state.summary.questionsImported : state.summary.optionsInserted)}
      />
      <AdminFeedbackStat
        label={isImportResult ? 'Options inserted' : 'Existing options to replace'}
        value={String(isImportResult ? state.summary.optionsInserted : state.summary.existingOptionsDeleted)}
      />
    </div>
  );
}

export function AdminBulkOptionImport({
  assessmentVersionId,
  isEditableAssessmentVersion,
}: AdminBulkOptionImportProps) {
  const router = useRouter();
  const importAction = useMemo(
    () => importBulkOptionsAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminBulkOptionImportState>(
    initialAdminBulkOptionImportState,
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
          <p className="sonartra-page-eyebrow">Options</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Import options
          </h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Paste one option per line using the format: question_number | option_label | option_text
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Each imported question must include one complete A-D option set.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Import replaces existing options for matched questions in this draft version.
          </p>
        </div>

        {!isEditableAssessmentVersion ? (
          <AdminFeedbackNotice tone="warning">
            Bulk import is only available for draft assessment versions.
          </AdminFeedbackNotice>
        ) : null}

        <div className="sonartra-admin-feedback-card rounded-[1rem] border p-4">
          <p className="sonartra-admin-feedback-section-title">Expected format</p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-white/78">
            {BULK_OPTION_FORMAT_EXAMPLE}
          </pre>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-white">Paste option rows</span>
          <textarea
            aria-label="Bulk option import rows"
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
            placeholder="1|A|I prefer to move quickly and decide fast"
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
                    const issue = item as AdminBulkOptionImportState['parseErrors'][number];
                    return `Line ${issue.lineNumber}: ${issue.message}`;
                  }}
                />
              </AdminFeedbackSection>
            ) : null}

            {resultState.groupErrors.length > 0 ? (
              <AdminFeedbackSection title="Question set errors">
                <IssueList
                  items={resultState.groupErrors}
                  renderLine={(item) => {
                    const issue = item as AdminBulkOptionImportState['groupErrors'][number];
                    return `Question ${issue.questionNumber} (lines ${issue.lineNumbers.join(', ')}): ${issue.message}`;
                  }}
                />
              </AdminFeedbackSection>
            ) : null}

            {resultState.planErrors.length > 0 ? (
              <AdminFeedbackSection title="Assessment mapping errors">
                <IssueList
                  items={resultState.planErrors}
                  renderLine={(item) => {
                    const issue = item as AdminBulkOptionImportState['planErrors'][number];
                    return issue.questionNumber === null
                      ? issue.message
                      : `Question ${issue.questionNumber}: ${issue.message}`;
                  }}
                />
              </AdminFeedbackSection>
            ) : null}

            {resultState.warnings.length > 0 ? (
              <AdminFeedbackSection title="Warnings">
                <AdminFeedbackNotice tone="warning">
                  Warnings do not block import, but you should review them before proceeding.
                </AdminFeedbackNotice>
                <div className="space-y-2">
                  {resultState.warnings.map((warning) => (
                    <AdminFeedbackNotice key={`${warning.questionNumber}-${warning.code}`} tone="warning">
                      {`Question ${warning.questionNumber} (lines ${warning.lineNumbers.join(', ')}): ${warning.message}`}
                    </AdminFeedbackNotice>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}

            {resultState.plannedQuestions.length > 0 ? (
              <AdminFeedbackSection title="Question preview">
                <div className="space-y-4">
                  {resultState.plannedQuestions.map((question) => (
                    <div
                        className="sonartra-admin-feedback-card rounded-[1rem] border p-4"
                      key={question.questionId}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          Question {question.questionNumber}
                        </p>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          {question.questionKey}
                        </LabelPill>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          Existing options will be replaced
                        </LabelPill>
                      </div>
                      <div className="mt-4 space-y-2">
                        {question.replacementOptions.map((option) => (
                          <div
                            className="sonartra-admin-feedback-card rounded-[0.9rem] border px-3 py-2 text-sm text-white/82"
                            key={`${question.questionId}-${option.label}`}
                          >
                            {`${option.label} — ${option.text}`}
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
                    {`Imported ${resultState.summary.questionsImported} questions and inserted ${resultState.summary.optionsInserted} options.`}
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
