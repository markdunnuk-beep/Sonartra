'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  initialAdminDomainBulkImportState,
  type AdminDomainBulkImportState,
} from '@/lib/admin/admin-domain-bulk-import';
import {
  importDomainBulkAction,
} from '@/lib/server/admin-domain-bulk-import-actions';
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

function SummaryGrid({ state }: Readonly<{ state: AdminDomainBulkImportState }>) {
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
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Bulk import</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Bulk import domains
          </h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Paste one domain per line to add domains to this assessment version.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Accepted formats: <code>label</code>, <code>label|description</code>, or <code>label|key|description</code>.
          </p>
        </div>

        {!isEditableAssessmentVersion ? (
          <InlineBanner tone="warning">
            Bulk import is available only for draft assessment versions.
          </InlineBanner>
        ) : null}

        {hasExistingDomains ? (
          <InlineBanner tone="warning">
            New domains will be added. Existing domains will not be changed or removed.
          </InlineBanner>
        ) : null}

        {successMessage ? <InlineBanner tone="success">{successMessage}</InlineBanner> : null}

        <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Accepted format</p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-white/78">
            {DOMAIN_IMPORT_FORMAT_EXAMPLE}
          </pre>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-white">Paste domain rows</span>
          <textarea
            aria-label="Bulk domain import rows"
            className={cn(
              'sonartra-focus-ring min-h-[220px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
              'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
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

        {actionErrorMessage ? <InlineBanner tone="danger">{actionErrorMessage}</InlineBanner> : null}

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton disabled={!canImport} onClick={handleImport} variant="primary">
            {isImportPending ? 'Importing...' : successMessage ? 'Imported' : 'Import'}
          </ActionButton>
        </div>

        {resultState.hasSubmitted ? (
          <div className="space-y-5">
            <SectionBlock title="Summary">
              <SummaryGrid state={resultState} />
            </SectionBlock>

            {!resultState.didImport && resultState.accepted.length === 0 ? (
              <InlineBanner tone="warning">
                No valid rows were found to import. Fix the rejected rows and try again.
              </InlineBanner>
            ) : null}

            {resultState.accepted.length > 0 ? (
              <SectionBlock title="Accepted preview">
                <div className="space-y-3">
                  {resultState.accepted.map((row) => (
                    <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4" key={`${row.sourceLineNumber}-${row.domainKey}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          Line {row.sourceLineNumber}
                        </LabelPill>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          Order {row.orderIndex + 1}
                        </LabelPill>
                      </div>
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-semibold text-white">{row.label}</p>
                        <p className="text-sm text-white/64">{row.domainKey}</p>
                        {row.description ? (
                          <p className="text-sm leading-6 text-white/76">{row.description}</p>
                        ) : (
                          <p className="text-sm leading-6 text-white/42">No description provided.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionBlock>
            ) : null}

            {resultState.rejected.length > 0 ? (
              <SectionBlock title="Rejected rows">
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
                  Import did not run. Review the messages, then try again after fixing the rows.
                </InlineBanner>
              </SectionBlock>
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
