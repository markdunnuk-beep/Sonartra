'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  initialAdminSignalBulkImportState,
  type AdminSignalBulkImportState,
} from '@/lib/admin/admin-signal-bulk-import';
import {
  importSignalBulkAction,
  previewSignalBulkImportAction,
} from '@/lib/server/admin-signal-bulk-import-actions';
import type { AdminAssessmentDetailDomain } from '@/lib/server/admin-assessment-detail';
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

function SummaryGrid({ state }: Readonly<{ state: AdminSignalBulkImportState }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Parsed rows</p>
        <p className="mt-2 text-lg font-semibold text-white">{state.summary.rowCount}</p>
      </div>
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Accepted rows</p>
        <p className="mt-2 text-lg font-semibold text-white">{state.summary.acceptedCount}</p>
      </div>
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Rejected rows</p>
        <p className="mt-2 text-lg font-semibold text-white">{state.summary.rejectedCount}</p>
      </div>
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Import status</p>
        <p className="mt-2 text-lg font-semibold text-white">{state.canImport ? 'Ready' : 'Blocked'}</p>
      </div>
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
  const previewAction = useMemo(
    () => previewSignalBulkImportAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const importAction = useMemo(
    () => importSignalBulkAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminSignalBulkImportState>(
    initialAdminSignalBulkImportState,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();

  const isInputEmpty = rawInput.trim().length === 0;
  const isBusy = isPreviewPending || isImportPending;
  const hasAuthoredDomains = domains.length > 0;
  const existingSignalCount = domains.reduce((count, domain) => count + domain.signals.length, 0);
  const hasExistingSignals = existingSignalCount > 0;
  const isPreviewCurrent =
    resultState.lastAction === 'preview' &&
    resultState.rawInput === rawInput &&
    resultState.accepted.length > 0;
  const canImport =
    !isInputEmpty &&
    !isBusy &&
    isEditableAssessmentVersion &&
    hasAuthoredDomains &&
    resultState.canImport &&
    isPreviewCurrent;
  const acceptedPreviewGroups = buildAcceptedPreviewGroups(domains, resultState.accepted);

  function handlePreview() {
    if (isInputEmpty || isBusy || !isEditableAssessmentVersion) {
      return;
    }

    startPreviewTransition(async () => {
      const nextState = await previewAction({ rawInput });
      setSuccessMessage(null);
      setResultState(nextState);
    });
  }

  function handleImport() {
    if (!canImport) {
      return;
    }

    startImportTransition(async () => {
      const nextState = await importAction({ rawInput });
      if (nextState.success && nextState.didImport) {
        const importedDomainCount = Object.keys(nextState.summary.perDomainCreateCounts).length;
        setSuccessMessage(
          `${nextState.summary.importedCount} signal${nextState.summary.importedCount === 1 ? '' : 's'} imported across ${importedDomainCount} domain${importedDomainCount === 1 ? '' : 's'}.`,
        );
        setRawInput('');
        setResultState(initialAdminSignalBulkImportState);
        router.refresh();
        return;
      }

      setSuccessMessage(null);
      setResultState(nextState);
    });
  }

  function handleClear() {
    setRawInput('');
    setSuccessMessage(null);
    setResultState(initialAdminSignalBulkImportState);
  }

  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Bulk import</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Bulk import signals
          </h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Paste one signal per line to add signals across the authored domains in one pass.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Accepted formats: <code>domain|label</code>, <code>domain|label|description</code>, or{' '}
            <code>domain|label|key|description</code>.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Prefer the exact <code>domain_key</code>. Exact domain labels also work. No fuzzy matching is applied.
          </p>
        </div>

        {!isEditableAssessmentVersion ? (
          <InlineBanner tone="warning">
            Bulk import is available only for draft assessment versions.
          </InlineBanner>
        ) : null}

        {!hasAuthoredDomains ? (
          <InlineBanner tone="warning">
            Add at least one domain before previewing signal imports.
          </InlineBanner>
        ) : null}

        {hasExistingSignals ? (
          <InlineBanner tone="warning">
            This will append new signals within each matched domain. Existing signals stay in place.
          </InlineBanner>
        ) : null}

        {successMessage ? <InlineBanner tone="success">{successMessage}</InlineBanner> : null}

        <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Accepted format</p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-white/78">
            {SIGNAL_IMPORT_FORMAT_EXAMPLE}
          </pre>
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

        {!isInputEmpty && resultState.lastAction === 'preview' && resultState.rawInput !== rawInput ? (
          <InlineBanner tone="warning">
            The pasted rows changed after the last preview. Preview again before importing.
          </InlineBanner>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            disabled={isInputEmpty || isBusy || !isEditableAssessmentVersion || !hasAuthoredDomains}
            onClick={handlePreview}
            variant="secondary"
          >
            {isPreviewPending ? 'Previewing...' : 'Preview'}
          </ActionButton>
          <ActionButton disabled={!canImport} onClick={handleImport} variant="primary">
            {isImportPending ? 'Importing...' : 'Import'}
          </ActionButton>
          <ActionButton disabled={isBusy || isInputEmpty} onClick={handleClear} variant="secondary">
            Clear
          </ActionButton>
        </div>

        {resultState.hasSubmitted ? (
          <div className="space-y-5">
            {resultState.formError ? <InlineBanner tone="danger">{resultState.formError}</InlineBanner> : null}
            {resultState.executionError ? <InlineBanner tone="danger">{resultState.executionError}</InlineBanner> : null}

            <SectionBlock title="Summary">
              <SummaryGrid state={resultState} />
            </SectionBlock>

            {resultState.lastAction === 'preview' && resultState.accepted.length === 0 ? (
              <InlineBanner tone="warning">
                No valid rows were found to import. Fix the rejected rows and preview again.
              </InlineBanner>
            ) : null}

            {acceptedPreviewGroups.length > 0 ? (
              <SectionBlock title="Accepted preview">
                <div className="space-y-4">
                  {acceptedPreviewGroups.map((group) => (
                    <div
                      className="rounded-[1rem] border border-white/8 bg-black/10 p-4"
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
                            className="rounded-[0.9rem] border border-white/8 bg-black/10 p-4"
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
              </SectionBlock>
            ) : null}

            {resultState.rejected.length > 0 ? (
              <SectionBlock title="Rejected preview">
                <div className="space-y-2">
                  {resultState.rejected.map((row, index) => (
                    <InlineBanner key={`${row.sourceLineNumber ?? 'global'}-${row.reasonCode}-${index}`} tone="danger">
                      {row.sourceLineNumber === null
                        ? row.message
                        : `Line ${row.sourceLineNumber}: ${row.message}`}
                    </InlineBanner>
                  ))}
                </div>
              </SectionBlock>
            ) : null}

            {resultState.lastAction === 'import' && !resultState.didImport && !resultState.executionError ? (
              <SectionBlock title="Import result">
                <InlineBanner tone="neutral">
                  Import is blocked right now. Review the preview messages, then preview again after fixing the rows.
                </InlineBanner>
              </SectionBlock>
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
