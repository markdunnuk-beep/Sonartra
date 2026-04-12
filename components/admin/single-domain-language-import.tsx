'use client';

import { useMemo, useState, useTransition } from 'react';

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
import {
  initialSingleDomainLanguageImportState,
  type SingleDomainLanguageImportState,
} from '@/lib/admin/single-domain-language-import';
import {
  SINGLE_DOMAIN_LANGUAGE_DATASET_DEFINITIONS,
} from '@/lib/admin/single-domain-language-datasets';
import { importSingleDomainLanguageDatasetAction } from '@/lib/server/admin-single-domain-language-import-actions';
import type {
  SingleDomainLanguageDatasetValidation,
} from '@/lib/admin/single-domain-structural-validation';
import type { SingleDomainLanguageDatasetKey } from '@/lib/types/single-domain-language';

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
        'sonartra-button sonartra-focus-ring sonartra-button-primary w-full sm:min-w-[140px] sm:w-auto',
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

function buildDatasetPlaceholder(datasetKey: SingleDomainLanguageDatasetKey, headers: readonly string[]): string {
  const headerLine = headers.join('|');

  switch (datasetKey) {
    case 'DOMAIN_FRAMING':
      return [
        headerLine,
        'leadership-style|Leadership style|This domain frames how your approach tends to land in real work.|It describes the practical meaning behind the signal mix.|The authored signals show where that style becomes most visible.|This domain provides the reading frame for the chapters that follow.',
      ].join('\n');
    case 'HERO_PAIRS':
      return [
        headerLine,
        'directive_supportive|Momentum with steadiness|You combine pace with relational awareness.|You tend to bring clear movement without losing the people context.|At your best this creates direction others can trust.|Under pressure, speed and care can pull against each other.|This pair works best when pace stays visible and well-directed.',
      ].join('\n');
    case 'SIGNAL_CHAPTERS':
      return [
        headerLine,
        'directive|Primary drive|Secondary drive|Supporting drive|Underplayed drive|When this signal leads, you move early and make direction visible.|When it sits second, it sharpens follow-through without owning the full tone.|In a supporting position it helps work stay moving in the background.|When underplayed, pace can become harder to establish.|It tends to show up as visible movement, clear intent, and a bias toward traction.|This can create traction and reduce drift when the path is clear.|Teams often experience this as momentum and directional energy.|The risk is moving before enough context is gathered.|That can narrow options too early or leave others catching up.|Build range by pairing speed with clearer check points.',
      ].join('\n');
    case 'BALANCING_SECTIONS':
      return [
        headerLine,
        'directive_supportive|Rebalancing this pair|The current pattern often blends pace with care for people impact.|In practice this means progress is often relational as well as operational.|The risk is over-correcting toward one side when pressure rises.|Rebalancing starts by naming which side is currently overrunning the other.|Slow the decision long enough to confirm the real need.|Make the next step explicit so care does not become drift.|Check whether the tone still matches the pace being asked of others.',
      ].join('\n');
    case 'PAIR_SUMMARIES':
      return [
        headerLine,
        'directive_supportive|Directive and Supportive|Fast enough to move, aware enough to land it well.|This pair often reads as movement with relational context.|Its strength is helping work advance without feeling detached.|Its tension is that speed and care can start to compete under strain.|At its best the pair creates momentum that people can stay with.',
      ].join('\n');
    case 'APPLICATION_STATEMENTS':
      return [
        headerLine,
        'directive|Creates visible traction when direction needs to become concrete.|Helps work move from ambiguity into action.|Can push too quickly before the team has context.|May close options before the best route is clear.|Build in one pause point before finalising the next step.|Invite one contrary view before acting on early momentum.',
      ].join('\n');
  }
}

export function SingleDomainLanguageImport({
  assessmentVersionId,
  isEditableAssessmentVersion,
  datasetValidation,
}: Readonly<{
  assessmentVersionId: string;
  isEditableAssessmentVersion: boolean;
  datasetValidation: readonly SingleDomainLanguageDatasetValidation[];
}>) {
  const [selectedDatasetKey, setSelectedDatasetKey] = useState<SingleDomainLanguageDatasetKey>('DOMAIN_FRAMING');
  const [rawInput, setRawInput] = useState('');
  const [resultState, setResultState] = useState<SingleDomainLanguageImportState>(
    initialSingleDomainLanguageImportState,
  );
  const [hasImported, setHasImported] = useState(false);
  const [isImportPending, startImportTransition] = useTransition();
  const action = useMemo(
    () => importSingleDomainLanguageDatasetAction.bind(null, { assessmentVersionId }),
    [assessmentVersionId],
  );

  const selectedDefinition = SINGLE_DOMAIN_LANGUAGE_DATASET_DEFINITIONS.find(
    (definition) => definition.key === selectedDatasetKey,
  ) ?? SINGLE_DOMAIN_LANGUAGE_DATASET_DEFINITIONS[0];
  const selectedValidation = datasetValidation.find((dataset) => dataset.datasetKey === selectedDatasetKey)
    ?? datasetValidation[0];
  const inlineError =
    resultState.datasetKey === selectedDatasetKey
      ? resultState.formError
        ?? resultState.executionError
        ?? resultState.parseErrors[0]?.message
        ?? resultState.validationErrors[0]?.message
        ?? resultState.planErrors[0]?.message
        ?? null
      : null;

  function resetResult(nextDatasetKey: SingleDomainLanguageDatasetKey, nextRawInput: string) {
    setResultState({
      ...initialSingleDomainLanguageImportState,
      datasetKey: nextDatasetKey,
      rawInput: nextRawInput,
    });
  }

  function handleDatasetChange(nextDatasetKey: SingleDomainLanguageDatasetKey) {
    setSelectedDatasetKey(nextDatasetKey);
    setRawInput('');
    setHasImported(false);
    resetResult(nextDatasetKey, '');
  }

  function handleInputChange(nextValue: string) {
    setRawInput(nextValue);
    setHasImported(false);
    resetResult(selectedDatasetKey, nextValue);
  }

  function handleImport() {
    if (!rawInput.trim() || isImportPending || !isEditableAssessmentVersion) {
      return;
    }

    startImportTransition(async () => {
      const nextState = await action({
        datasetKey: selectedDatasetKey,
        rawInput,
      });
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
    <div className="space-y-5">
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sonartra-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3"
      >
        {datasetValidation.map((dataset) => {
          const isSelected = dataset.datasetKey === selectedDatasetKey;

          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                'sonartra-focus-ring min-w-[12rem] shrink-0 rounded-[1rem] border px-4 py-4 text-left transition sm:min-w-0',
                isSelected
                  ? 'border-[rgba(142,162,255,0.36)] bg-[rgba(142,162,255,0.08)]'
                  : 'border-white/8 bg-black/10 hover:border-white/14',
              )}
              key={dataset.datasetKey}
              onClick={() => handleDatasetChange(dataset.datasetKey)}
              type="button"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{dataset.label}</p>
                <LabelPill
                  className={dataset.status === 'ready'
                    ? 'border-[rgba(151,233,182,0.22)] bg-[rgba(16,61,34,0.26)] text-[rgba(217,255,229,0.94)]'
                    : 'border-[rgba(255,210,143,0.22)] bg-[rgba(78,48,6,0.24)] text-[rgba(255,234,196,0.94)]'}
                >
                  {dataset.status === 'ready'
                    ? 'Ready'
                    : dataset.status === 'waiting'
                      ? 'Waiting'
                      : dataset.status === 'not_started'
                        ? 'Not started'
                        : 'Attention'}
                </LabelPill>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/54">
                {dataset.actualRowCount} row{dataset.actualRowCount === 1 ? '' : 's'}
                {' '}loaded
                {dataset.status === 'waiting'
                  ? ` / ${dataset.detail}`
                  : dataset.countRule === 'exact'
                    ? ` / ${dataset.expectedRowCount} expected`
                    : ' / 1+ required'}
              </p>
            </button>
          );
        })}
      </div>

      {!isEditableAssessmentVersion ? (
        <AdminFeedbackNotice tone="warning">
          Single-domain language datasets are editable only for draft assessment versions.
        </AdminFeedbackNotice>
      ) : null}

      <SurfaceCard className="overflow-hidden p-4 sm:p-5 lg:p-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[1.22rem] font-semibold tracking-[-0.025em] text-white">
                {selectedDefinition.label}
              </h3>
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                {selectedValidation?.actualRowCount ?? 0} current row{selectedValidation?.actualRowCount === 1 ? '' : 's'}
              </LabelPill>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-white/62 sm:leading-7">
              {selectedDefinition.description}
            </p>
            <p className="max-w-3xl text-sm leading-6 text-white/54 sm:leading-7">
              Import replaces the selected dataset for this assessment version only. Headers and field order must match the locked schema exactly.
            </p>
          </div>

          <div className="sonartra-admin-feedback-card min-w-0 rounded-[1rem] border p-4">
            <div className="flex flex-wrap items-start gap-2">
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                Expected header: {selectedDefinition.expectedHeaders.join('|')}
              </LabelPill>
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
                {selectedValidation?.status === 'waiting'
                  ? 'Waiting on earlier structure'
                  : selectedValidation?.countRule === 'exact'
                  ? `${selectedValidation.expectedRowCount} expected`
                  : '1+ required'}
              </LabelPill>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/62 sm:leading-7">
              {selectedValidation?.detail ?? 'Counts will update after the next successful import.'}
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <ReferenceDisclosure title="Show locked headers">
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-white/78">
                  {selectedDefinition.expectedHeaders.join('|')}
                </pre>
              </ReferenceDisclosure>
              <ReferenceDisclosure title="Show import example">
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-white/78">
                  {buildDatasetPlaceholder(selectedDatasetKey, selectedDefinition.expectedHeaders)}
                </pre>
              </ReferenceDisclosure>
            </div>
          </div>

          <div className="rounded-[1rem] border border-[rgba(142,162,255,0.14)] bg-[rgba(142,162,255,0.04)] p-4">
            <label className="block space-y-2">
              <span className="block text-sm font-medium text-white">
                Paste {selectedDefinition.label} rows
              </span>
              <textarea
                aria-label={`Paste ${selectedDefinition.label} rows`}
                className={cn(
                  'sonartra-focus-ring min-h-[280px] w-full rounded-[1rem] border bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28',
                  inlineError
                    ? 'border-[rgba(255,157,157,0.32)]'
                    : 'border-white/10 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
                )}
                disabled={!isEditableAssessmentVersion || isImportPending}
                onChange={(event) => handleInputChange(event.currentTarget.value)}
                placeholder={buildDatasetPlaceholder(selectedDatasetKey, selectedDefinition.expectedHeaders)}
                value={rawInput}
              />
            </label>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={cn(
                  'min-w-0 text-sm break-words',
                  inlineError ? 'text-[rgba(255,198,198,0.92)]' : 'text-white/45',
                )}
              >
                {inlineError ?? 'Paste the locked header row first, followed by dataset rows.'}
              </p>
              <ActionButton
                disabled={!rawInput.trim() || isImportPending || !isEditableAssessmentVersion}
                onClick={handleImport}
              >
                {isImportPending ? 'Importing...' : hasImported ? 'Imported' : 'Import'}
              </ActionButton>
            </div>
          </div>

          {resultState.datasetKey === selectedDatasetKey &&
          (resultState.success ||
            resultState.parseErrors.length > 0 ||
            resultState.validationErrors.length > 0 ||
            resultState.planErrors.length > 0 ||
            Boolean(resultState.executionError) ||
            Boolean(resultState.formError)) ? (
            <div className="space-y-5">
              <AdminFeedbackSection title="Summary">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <AdminFeedbackStat label="Pasted rows" value={String(resultState.summary.rowCount)} />
                  <AdminFeedbackStat label="Targets in batch" value={String(resultState.summary.targetCount)} />
                  <AdminFeedbackStat
                    label={resultState.success ? 'Rows imported' : 'Existing rows to replace'}
                    value={String(resultState.success ? resultState.summary.importedRowCount : resultState.summary.existingRowCount)}
                  />
                  <AdminFeedbackStat
                    label={resultState.success ? 'Targets imported' : 'Current stored rows'}
                    value={String(resultState.success ? resultState.summary.importedTargetCount : selectedValidation?.actualRowCount ?? 0)}
                  />
                </div>
              </AdminFeedbackSection>

              {resultState.success ? (
                <AdminFeedbackNotice tone="success">
                  {`Imported ${resultState.summary.importedRowCount} row${resultState.summary.importedRowCount === 1 ? '' : 's'} into ${selectedDefinition.label}.`}
                </AdminFeedbackNotice>
              ) : null}

              {resultState.parseErrors.length > 0 ? (
                <AdminFeedbackSection title="Parse errors">
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
                <AdminFeedbackSection title="Version errors">
                  <div className="space-y-2">
                    {resultState.planErrors.map((issue) => (
                      <AdminFeedbackNotice key={issue.key} tone="danger">
                        {issue.message}
                      </AdminFeedbackNotice>
                    ))}
                  </div>
                </AdminFeedbackSection>
              ) : null}
            </div>
          ) : null}
        </div>
      </SurfaceCard>
    </div>
  );
}
