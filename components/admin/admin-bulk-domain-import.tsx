'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  initialAdminDomainBulkImportState,
  type AdminDomainBulkImportState,
} from '@/lib/admin/admin-domain-bulk-import';
import { importDomainBulkAction } from '@/lib/server/admin-domain-bulk-import-actions';
import {
  AdminFeedbackNotice,
  AdminFeedbackSection,
  AdminFeedbackStat,
} from '@/components/admin/admin-feedback-primitives';
import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';

const DOMAIN_IMPORT_FORMAT_EXAMPLE = [
  'Operating Style',
  'Core Drivers|What motivates your decisions and priorities.',
  'Leadership Approach|leadership-approach|How you lead and influence others.',
  'Tension Response|How you tend to respond when challenge or friction appears.',
  'Environment Fit|The conditions and culture in which you do your best work.',
  'Pressure Response|How pressure affects your focus, judgement, and behaviour.',
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
        disabled && 'border-white/8 text-white/42 cursor-not-allowed bg-white/[0.05]',
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SummaryGrid({ state }: Readonly<{ state: AdminDomainBulkImportState }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <AdminFeedbackStat label="Parsed rows" value={String(state.summary.rowCount)} />
      <AdminFeedbackStat label="Accepted rows" value={String(state.summary.acceptedCount)} />
      <AdminFeedbackStat label="Rejected rows" value={String(state.summary.rejectedCount)} />
      <AdminFeedbackStat label="Import status" value={state.canImport ? 'Ready' : 'Blocked'} />
    </div>
  );
}

function ReferenceDisclosure({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <details className="overflow-hidden rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3">
      <summary className="sonartra-motion-details-summary cursor-pointer list-none text-sm font-medium text-white/68">
        {title}
      </summary>
      <div className="mt-3 text-sm leading-7 text-white/62">{children}</div>
    </details>
  );
}

export function AdminBulkDomainImport({
  assessmentVersionId,
  isEditableAssessmentVersion,
  existingDomainCount,
}: Readonly<{
  assessmentVersionId: string;
  isEditableAssessmentVersion: boolean;
  existingDomainCount: number;
}>) {
  const router = useRouter();
  const importAction = useMemo(
    () => importDomainBulkAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminDomainBulkImportState>(
    initialAdminDomainBulkImportState,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isImportPending, startImportTransition] = useTransition();

  const isInputEmpty = rawInput.trim().length === 0;
  const isBusy = isImportPending;
  const hasExistingDomains = existingDomainCount > 0;
  const actionErrorMessage =
    resultState.formError ??
    resultState.executionError ??
    (resultState.hasSubmitted && !resultState.success && resultState.rejected.length > 0
      ? 'Review the rejected rows below, then try importing again.'
      : null);
  const canImport = !isInputEmpty && !isBusy && isEditableAssessmentVersion;

  function handleImport() {
    if (!canImport) {
      return;
    }

    startImportTransition(async () => {
      const nextState = await importAction({ rawInput });
      setResultState(nextState);
      if (nextState.success && nextState.didImport) {
        setSuccessMessage(
          `${nextState.summary.importedCount} domain${nextState.summary.importedCount === 1 ? '' : 's'} imported successfully.`,
        );
        router.refresh();
        return;
      }

      setSuccessMessage(null);
    });
  }

  return (
    <SurfaceCard className="sonartra-motion-reveal-soft overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Bulk import domains
          </h3>
          <p className="text-white/62 max-w-3xl text-sm leading-7">
            Paste one domain per line to add domains to this assessment version.
          </p>
        </div>

        {!isEditableAssessmentVersion ? (
          <AdminFeedbackNotice tone="warning">
            Bulk import is available only for draft assessment versions.
          </AdminFeedbackNotice>
        ) : null}

        {hasExistingDomains ? (
          <AdminFeedbackNotice tone="warning">
            New domains will be added. Existing domains will not be changed or removed.
          </AdminFeedbackNotice>
        ) : null}

        {successMessage ? <AdminFeedbackNotice tone="success">{successMessage}</AdminFeedbackNotice> : null}

        <div className="sonartra-admin-feedback-card sonartra-motion-surface rounded-[1rem] border p-4">
          <p className="text-sm leading-7 text-white/58">
            Import guidance stays available here without competing with the main action surface.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <ReferenceDisclosure title="Show import format">
              <p>
                Accepted formats: <code>label</code>, <code>label|description</code>, or{' '}
                <code>label|key|description</code>.
              </p>
            </ReferenceDisclosure>
            <ReferenceDisclosure title="Show example">
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-white/78">
                {DOMAIN_IMPORT_FORMAT_EXAMPLE}
              </pre>
            </ReferenceDisclosure>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-white">Paste domain rows</span>
          <textarea
            aria-label="Bulk domain import rows"
            className={cn(
              'sonartra-focus-ring placeholder:text-white/28 min-h-[220px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white',
              'sonartra-motion-input',
              'hover:border-white/14 border-white/10 focus:border-[rgba(142,162,255,0.36)]',
            )}
            disabled={!isEditableAssessmentVersion}
            onChange={(event) => {
              const nextRawInput = event.currentTarget.value;
              setRawInput(nextRawInput);
              setSuccessMessage(null);
            }}
            placeholder="Operating Style"
            value={rawInput}
          />
        </label>

        {actionErrorMessage ? (
          <AdminFeedbackNotice tone="danger">{actionErrorMessage}</AdminFeedbackNotice>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton disabled={!canImport} onClick={handleImport} variant="primary">
            {isImportPending ? 'Importing...' : successMessage ? 'Imported' : 'Import'}
          </ActionButton>
        </div>

        {resultState.hasSubmitted ? (
          <div className="space-y-5">
            <AdminFeedbackSection title="Summary">
              <SummaryGrid state={resultState} />
            </AdminFeedbackSection>

            {!resultState.didImport && resultState.accepted.length === 0 ? (
              <AdminFeedbackNotice tone="warning">
                No valid rows were found to import. Fix the rejected rows and try again.
              </AdminFeedbackNotice>
            ) : null}

            {resultState.accepted.length > 0 ? (
              <AdminFeedbackSection title="Accepted preview">
                <div className="space-y-3">
                  {resultState.accepted.map((row) => (
                    <div
                      className="sonartra-admin-feedback-card sonartra-motion-surface rounded-[1rem] border p-4"
                      key={`${row.sourceLineNumber}-${row.domainKey}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <LabelPill className="text-white/62 border-white/10 bg-white/[0.04]">
                          Line {row.sourceLineNumber}
                        </LabelPill>
                        <LabelPill className="text-white/62 border-white/10 bg-white/[0.04]">
                          Order {row.orderIndex + 1}
                        </LabelPill>
                      </div>
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-semibold text-white">{row.label}</p>
                        <p className="text-white/64 text-sm">{row.domainKey}</p>
                        {row.description ? (
                          <p className="text-white/76 text-sm leading-6">{row.description}</p>
                        ) : (
                          <p className="text-white/42 text-sm leading-6">
                            No description provided.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}

            {resultState.rejected.length > 0 ? (
              <AdminFeedbackSection title="Rejected rows">
                <div className="space-y-2">
                  {resultState.rejected.map((row, index) => (
                    <AdminFeedbackNotice
                      key={`${row.sourceLineNumber ?? 'global'}-${row.reasonCode}-${index}`}
                      tone="danger"
                    >
                      {row.sourceLineNumber === null
                        ? row.message
                        : `Line ${row.sourceLineNumber}: ${row.message}`}
                    </AdminFeedbackNotice>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}

            {resultState.lastAction === 'import' &&
            !resultState.didImport &&
            !resultState.executionError ? (
              <AdminFeedbackSection title="Import result">
                <AdminFeedbackNotice tone="neutral">
                  Import did not run. Review the messages, then try again after fixing the rows.
                </AdminFeedbackNotice>
              </AdminFeedbackSection>
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
