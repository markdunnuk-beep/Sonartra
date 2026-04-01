'use client';

import { useMemo, useState, useTransition } from 'react';

import {
  initialAdminDomainLanguageImportState,
  type AdminDomainLanguageImportState,
} from '@/lib/admin/admin-domain-language-import';
import { DOMAIN_LANGUAGE_SECTION_ORDER } from '@/lib/admin/domain-language-import';
import {
  importDomainLanguageAction,
  previewDomainLanguageAction,
} from '@/lib/server/admin-domain-language-import-actions';
import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';

const DOMAIN_LANGUAGE_FORMAT_EXAMPLE = [
  'domain_key | section | content',
  '',
  'behaviour_style | summary | You tend to operate with visible pace, structure, and interpersonal impact.',
  'behaviour_style | focus | Your strongest contribution in this area is how you bring direction and consistency.',
  'behaviour_style | pressure | Under pressure, you may narrow your attention or become more forceful in your style.',
  'behaviour_style | environment | You perform best where expectations, pace, and collaboration are clear.',
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

function SummaryGrid({
  state,
  existingDomainLanguageRowCount,
}: Readonly<{
  state: AdminDomainLanguageImportState;
  existingDomainLanguageRowCount: number;
}>) {
  const isImportResult = state.lastAction === 'import' && state.success;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Pasted rows</p>
        <p className="mt-2 text-lg font-semibold text-white">{state.summary.rowCount}</p>
      </div>
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">Domains in batch</p>
        <p className="mt-2 text-lg font-semibold text-white">{state.summary.domainCount}</p>
      </div>
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
          {isImportResult ? 'Rows imported' : 'Existing rows to replace'}
        </p>
        <p className="mt-2 text-lg font-semibold text-white">
          {isImportResult ? state.summary.importedRowCount : state.summary.existingRowCount || existingDomainLanguageRowCount}
        </p>
      </div>
      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
          {isImportResult ? 'Domains imported' : 'Current stored rows'}
        </p>
        <p className="mt-2 text-lg font-semibold text-white">
          {isImportResult ? state.summary.importedDomainCount : existingDomainLanguageRowCount}
        </p>
      </div>
    </div>
  );
}

export function AdminDomainLanguageImport({
  assessmentVersionId,
  existingDomainLanguageRowCount,
  isEditableAssessmentVersion,
}: Readonly<{
  assessmentVersionId: string;
  existingDomainLanguageRowCount: number;
  isEditableAssessmentVersion: boolean;
}>) {
  const previewAction = useMemo(
    () => previewDomainLanguageAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const importAction = useMemo(
    () => importDomainLanguageAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<AdminDomainLanguageImportState>(
    initialAdminDomainLanguageImportState,
  );
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();

  const isInputEmpty = rawInput.trim().length === 0;
  const isBusy = isPreviewPending || isImportPending;
  const showResult = resultState.hasSubmitted;
  const hasBlockingErrors =
    resultState.parseErrors.length > 0 ||
    resultState.validationErrors.length > 0 ||
    resultState.planErrors.length > 0 ||
    Boolean(resultState.executionError);
  const isPreviewCurrent =
    resultState.lastAction === 'preview' && resultState.success && resultState.rawInput === rawInput;
  const canImport =
    !isInputEmpty &&
    !isBusy &&
    isEditableAssessmentVersion &&
    resultState.canImport &&
    isPreviewCurrent &&
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
      if (nextState.success && typeof window !== 'undefined') {
        window.location.reload();
      }
    });
  }

  return (
    <SurfaceCard className="overflow-hidden p-5 lg:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="sonartra-page-eyebrow">Domain Language</p>
          <h3 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-white">
            Domain Language import
          </h3>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Paste one structured row per line using the format: domain_key | section | content
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Preview validates against the active assessment version&apos;s authored result domains before any data is saved.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Import replaces all existing Domain Language rows for this assessment version.
          </p>
        </div>

        {!isEditableAssessmentVersion ? (
          <InlineBanner tone="warning">
            Domain language import is only available for draft assessment versions.
          </InlineBanner>
        ) : null}

        <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              Current stored rows: {existingDomainLanguageRowCount}
            </LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              Sections: {DOMAIN_LANGUAGE_SECTION_ORDER.join(', ')}
            </LabelPill>
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-white/42">Expected format</p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-white/78">
            {DOMAIN_LANGUAGE_FORMAT_EXAMPLE}
          </pre>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-white">Paste domain language rows</span>
          <textarea
            aria-label="Domain language import rows"
            className={cn(
              'sonartra-focus-ring min-h-[240px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
              'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
            )}
            disabled={!isEditableAssessmentVersion}
            onChange={(event) => {
              setRawInput(event.currentTarget.value);
            }}
            placeholder="behaviour_style|summary|You tend to operate with visible pace, structure, and interpersonal impact."
            value={rawInput}
          />
        </label>

        {!isInputEmpty && resultState.lastAction === 'preview' && resultState.rawInput !== rawInput ? (
          <InlineBanner tone="warning">
            The textarea changed after the last preview. Preview again before importing.
          </InlineBanner>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            disabled={isInputEmpty || isBusy || !isEditableAssessmentVersion}
            onClick={handlePreview}
            variant="secondary"
          >
            {isPreviewPending ? 'Previewing...' : 'Preview import'}
          </ActionButton>
          <ActionButton disabled={!canImport} onClick={handleImport} variant="primary">
            {isImportPending ? 'Importing...' : 'Import domain language'}
          </ActionButton>
        </div>

        {showResult ? (
          <div className="space-y-5">
            {resultState.formError ? <InlineBanner tone="danger">{resultState.formError}</InlineBanner> : null}

            <SectionBlock title="Summary">
              <SummaryGrid
                existingDomainLanguageRowCount={existingDomainLanguageRowCount}
                state={resultState}
              />
            </SectionBlock>

            {resultState.parseErrors.length > 0 ? (
              <SectionBlock title="Validation errors">
                <div className="space-y-2">
                  {resultState.parseErrors.map((issue) => (
                    <InlineBanner key={`${issue.lineNumber}-${issue.code}`} tone="danger">
                      {`Line ${issue.lineNumber}: ${issue.message}`}
                    </InlineBanner>
                  ))}
                </div>
              </SectionBlock>
            ) : null}

            {resultState.validationErrors.length > 0 ? (
              <SectionBlock title="Row errors">
                <div className="space-y-2">
                  {resultState.validationErrors.map((issue) => (
                    <InlineBanner
                      key={`${issue.lineNumber}-${issue.domainKey}-${issue.section}-${issue.code}`}
                      tone="danger"
                    >
                      {`Line ${issue.lineNumber} (${issue.domainKey} / ${issue.section}): ${issue.message}`}
                    </InlineBanner>
                  ))}
                </div>
              </SectionBlock>
            ) : null}

            {resultState.planErrors.length > 0 ? (
              <SectionBlock title="Assessment mapping errors">
                <div className="space-y-2">
                  {resultState.planErrors.map((issue) => (
                    <InlineBanner key={issue.code} tone="danger">
                      {issue.message}
                    </InlineBanner>
                  ))}
                </div>
              </SectionBlock>
            ) : null}

            {resultState.previewGroups.length > 0 ? (
              <SectionBlock title="Grouped preview">
                <div className="space-y-4">
                  {resultState.previewGroups.map((group) => (
                    <div
                      className="rounded-[1rem] border border-white/8 bg-black/10 p-4"
                      key={group.domainKey}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{group.domainKey}</p>
                        <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                          {group.entries.length} section{group.entries.length === 1 ? '' : 's'}
                        </LabelPill>
                      </div>
                      <div className="mt-4 space-y-2">
                        {group.entries.map((entry) => (
                          <div
                            className="rounded-[0.9rem] border border-white/8 bg-black/10 px-3 py-3"
                            key={`${group.domainKey}-${entry.section}`}
                          >
                            <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
                              {entry.section}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/82">{entry.content}</p>
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
                    {`Imported ${resultState.summary.importedRowCount} rows across ${resultState.summary.importedDomainCount} domains. Existing Domain Language rows were replaced for this assessment version.`}
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
