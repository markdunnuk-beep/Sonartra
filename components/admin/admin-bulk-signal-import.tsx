'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  initialAdminSignalBulkImportState,
  type AdminSignalBulkImportState,
} from '@/lib/admin/admin-signal-bulk-import';
import {
  importSignalBulkAction,
} from '@/lib/server/admin-signal-bulk-import-actions';
import type { AdminAssessmentDetailDomain } from '@/lib/server/admin-assessment-detail';
import {
  AdminFeedbackNotice,
  AdminFeedbackSection,
  AdminFeedbackStat,
} from '@/components/admin/admin-feedback-primitives';
import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';

const SIGNAL_IMPORT_FORMAT_EXAMPLE = [
  'operating-style|Driver',
  'operating-style|Influencer|Shapes momentum through communication and visibility.',
  'operating-style|Implementer|Turns intent into dependable execution.',
  'operating-style|Analyst|Slows down decisions to improve accuracy and judgement.',
  'core-drivers|Achievement',
  'core-drivers|Influence',
  'leadership-approach|Results',
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

function SummaryGrid({ state }: Readonly<{ state: AdminSignalBulkImportState }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <AdminFeedbackStat label="Parsed rows" value={String(state.summary.rowCount)} />
      <AdminFeedbackStat label="Accepted rows" value={String(state.summary.acceptedCount)} />
      <AdminFeedbackStat label="Rejected rows" value={String(state.summary.rejectedCount)} />
      <AdminFeedbackStat label="Import status" value={state.canImport ? 'Ready' : 'Blocked'} />
    </div>
  );
}

function buildAcceptedPreviewGroups(
  domains: readonly AdminAssessmentDetailDomain[],
  accepted: AdminSignalBulkImportState['accepted'],
) {
  type AcceptedRow = AdminSignalBulkImportState['accepted'][number];
  const acceptedByDomainId = new Map<string, AcceptedRow[]>();

  for (const row of accepted) {
    const existing = acceptedByDomainId.get(row.domainId);
    if (existing) {
      existing.push(row);
      continue;
    }

    acceptedByDomainId.set(row.domainId, [row]);
  }

  return domains
    .map((domain) => ({
      domainId: domain.domainId,
      domainKey: domain.domainKey,
      domainLabel: domain.label,
      rows: acceptedByDomainId.get(domain.domainId) ?? [],
    }))
    .filter((group) => group.rows.length > 0);
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

export function AdminBulkSignalImport({
  assessmentVersionId,
  domains,
  isEditableAssessmentVersion,
}: Readonly<{
  assessmentVersionId: string;
  domains: readonly AdminAssessmentDetailDomain[];
  isEditableAssessmentVersion: boolean;
}>) {
  const router = useRouter();
  const importAction = useMemo(
    () => importSignalBulkAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminSignalBulkImportState>(
    initialAdminSignalBulkImportState,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isImportPending, startImportTransition] = useTransition();

  const isInputEmpty = rawInput.trim().length === 0;
  const isBusy = isImportPending;
  const hasAuthoredDomains = domains.length > 0;
  const existingSignalCount = domains.reduce((count, domain) => count + domain.signals.length, 0);
  const hasExistingSignals = existingSignalCount > 0;
  const actionErrorMessage =
    resultState.formError ??
    resultState.executionError ??
    (resultState.hasSubmitted && !resultState.success && resultState.rejected.length > 0
      ? 'Review the rejected rows below, then try importing again.'
      : null);
  const canImport =
    !isInputEmpty &&
    !isBusy &&
    isEditableAssessmentVersion &&
    hasAuthoredDomains;
  const acceptedPreviewGroups = buildAcceptedPreviewGroups(domains, resultState.accepted);

  function handleImport() {
    if (!canImport) {
      return;
    }

    startImportTransition(async () => {
      const nextState = await importAction({ rawInput });
      setResultState(nextState);
      if (nextState.success && nextState.didImport) {
        const importedDomainCount = Object.keys(nextState.summary.perDomainCreateCounts).length;
        setSuccessMessage(
          `${nextState.summary.importedCount} signal${nextState.summary.importedCount === 1 ? '' : 's'} imported across ${importedDomainCount} domain${importedDomainCount === 1 ? '' : 's'}.`,
        );
        router.refresh();
        return;
      }

      setSuccessMessage(null);
    });
  }

  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Bulk import signals
          </h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Paste one signal per line to add signals across the authored domains in one pass.
          </p>
        </div>

        {!isEditableAssessmentVersion ? (
          <AdminFeedbackNotice tone="warning">
            Bulk import is available only for draft assessment versions.
          </AdminFeedbackNotice>
        ) : null}

        {!hasAuthoredDomains ? (
          <AdminFeedbackNotice tone="warning">
            Add at least one domain before importing signals.
          </AdminFeedbackNotice>
        ) : null}

        {hasExistingSignals ? (
          <AdminFeedbackNotice tone="warning">
            New signals will be added to each matched domain. Existing signals will not be changed or removed.
          </AdminFeedbackNotice>
        ) : null}

        {successMessage ? <AdminFeedbackNotice tone="success">{successMessage}</AdminFeedbackNotice> : null}

        <div className="sonartra-admin-feedback-card rounded-[1rem] border p-4">
          <p className="text-sm leading-7 text-white/58">
            Keep the import rules close at hand without letting them dominate the page.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <ReferenceDisclosure title="Show import format">
              <div className="space-y-3">
                <p>
                  Accepted formats: <code>domain|label</code>, <code>domain|label|description</code>, or{' '}
                  <code>domain|label|key|description</code>.
                </p>
                <p>
                  Prefer the exact <code>domain_key</code>. Exact domain labels also work. No fuzzy matching is applied.
                </p>
              </div>
            </ReferenceDisclosure>
            <ReferenceDisclosure title="Show example">
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-white/78">
                {SIGNAL_IMPORT_FORMAT_EXAMPLE}
              </pre>
            </ReferenceDisclosure>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-white">Paste signal rows</span>
          <textarea
            aria-label="Bulk signal import rows"
            className={cn(
              'sonartra-focus-ring min-h-[240px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
              'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
            )}
            disabled={!isEditableAssessmentVersion || !hasAuthoredDomains}
            onChange={(event) => {
              const nextRawInput = event.currentTarget.value;
              setRawInput(nextRawInput);
              setSuccessMessage(null);
            }}
            placeholder="operating-style|Driver"
            value={rawInput}
          />
        </label>

        {actionErrorMessage ? <AdminFeedbackNotice tone="danger">{actionErrorMessage}</AdminFeedbackNotice> : null}

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

            {acceptedPreviewGroups.length > 0 ? (
              <AdminFeedbackSection title="Accepted preview">
                <div className="space-y-4">
                  {acceptedPreviewGroups.map((group) => (
                    <div
                      className="sonartra-admin-feedback-card rounded-[1rem] border p-4"
                      key={group.domainId}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{group.domainLabel}</p>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          {group.domainKey}
                        </LabelPill>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          {group.rows.length} accepted
                        </LabelPill>
                      </div>
                      <div className="mt-4 space-y-3">
                        {group.rows.map((row) => (
                          <div
                            className="sonartra-admin-feedback-card rounded-[0.9rem] border p-4"
                            key={`${row.sourceLineNumber}-${row.signalKey}`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                                Line {row.sourceLineNumber}
                              </LabelPill>
                              <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                                Key {row.signalKey}
                              </LabelPill>
                              <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                                Order {row.orderIndex + 1}
                              </LabelPill>
                            </div>
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-semibold text-white">{row.label}</p>
                              {row.description ? (
                                <p className="text-sm leading-6 text-white/76">{row.description}</p>
                              ) : (
                                <p className="text-sm leading-6 text-white/42">No description provided.</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}

            {resultState.rejected.length > 0 ? (
              <AdminFeedbackSection title="Rejected preview">
                <div className="space-y-2">
                  {resultState.rejected.map((row, index) => (
                    <AdminFeedbackNotice key={`${row.sourceLineNumber ?? 'global'}-${row.reasonCode}-${index}`} tone="danger">
                      {row.sourceLineNumber === null
                        ? row.message
                        : `Line ${row.sourceLineNumber}: ${row.message}`}
                    </AdminFeedbackNotice>
                  ))}
                </div>
              </AdminFeedbackSection>
            ) : null}

            {resultState.lastAction === 'import' && !resultState.didImport && !resultState.executionError ? (
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
