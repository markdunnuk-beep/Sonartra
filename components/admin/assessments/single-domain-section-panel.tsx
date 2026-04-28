'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { LabelPill, SurfaceCard, cn } from '@/components/shared/user-app-ui';
import { initialSingleDomainNarrativeImportState } from '@/lib/admin/single-domain-narrative-import';
import type { SingleDomainNarrativeBuilderSection } from '@/lib/assessment-language/single-domain-builder-mappers';
import { importSingleDomainNarrativeSectionAction } from '@/lib/server/admin-single-domain-narrative-import-actions';

const DRIVER_ROLE_LABELS = [
  {
    key: 'primary_driver',
    description: 'The strongest signal shaping the pattern.',
  },
  {
    key: 'secondary_driver',
    description: 'The reinforcing signal behind the pattern.',
  },
  {
    key: 'supporting_context',
    description: 'Useful context that adds shape without owning the pattern.',
  },
  {
    key: 'range_limitation',
    description: 'A weaker or underplayed signal that limits range rather than sitting as neutral background.',
  },
] as const;

const APPLICATION_FOCUS_LABELS = [
  {
    key: 'rely on',
    description: 'What the person should trust in the established pattern.',
  },
  {
    key: 'notice',
    description: 'What should be monitored when the pattern starts to narrow.',
  },
  {
    key: 'develop',
    description: 'What needs deliberate range-building and follow-through.',
  },
] as const;

function getValidationTone(state: SingleDomainNarrativeBuilderSection['validationState']): string {
  return state === 'ready'
    ? 'border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] text-[rgba(214,246,233,0.86)]'
    : 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]';
}

function ActionStub({
  title,
  description,
  buttonLabel = 'Coming in a later task',
}: Readonly<{
  title: string;
  description: string;
  buttonLabel?: string;
}>) {
  return (
    <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/56">{description}</p>
      <button
        className="sonartra-button sonartra-button-secondary mt-4 cursor-not-allowed border-white/8 bg-white/[0.04] text-white/48"
        disabled
        type="button"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function ImportSubmitButton({ disabled }: Readonly<{ disabled: boolean }>) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring w-full sm:w-auto',
        pending || disabled
          ? 'cursor-not-allowed border-white/8 bg-white/[0.05] text-white/48'
          : 'sonartra-button-primary',
      )}
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? 'Importing section...' : 'Import section rows'}
    </button>
  );
}

function ImportIssueList({
  label,
  tone,
  messages,
}: Readonly<{
  label: string;
  tone: 'warning' | 'danger';
  messages: readonly string[];
}>) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-[0.95rem] border px-4 py-3',
        tone === 'danger'
          ? 'border-[rgba(255,157,157,0.2)] bg-[rgba(80,20,20,0.18)]'
          : 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)]',
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/46">{label}</p>
      <div className="mt-3 space-y-2 text-sm leading-6 text-white/74">
        {messages.map((message) => (
          <p key={`${label}-${message}`}>{message}</p>
        ))}
      </div>
    </div>
  );
}

export function SingleDomainSectionPanel({
  section,
}: Readonly<{
  section: SingleDomainNarrativeBuilderSection;
}>) {
  const assessment = useAdminAssessmentAuthoring();
  const draftVersionId = assessment.latestDraftVersion?.assessmentVersionId ?? null;
  const initialImportState = {
    ...initialSingleDomainNarrativeImportState,
    datasetKey: section.datasetKey,
  };
  const importAction = draftVersionId
    ? importSingleDomainNarrativeSectionAction.bind(null, {
        assessmentVersionId: draftVersionId,
        datasetKey: section.datasetKey,
      })
    : null;
  const disabledImportAction = async () => initialImportState;
  const [importState, formAction] = useActionState(
    importAction ?? disabledImportAction,
    initialImportState,
  );
  const parseErrors = importState.parseErrors.map((issue) => issue.message);
  const validationErrors = importState.validationErrors.map((issue) => issue.message);
  const planErrors = importState.planErrors.map((issue) => issue.message);
  const canImport = Boolean(draftVersionId);

  return (
    <SurfaceCard
      className="space-y-5 p-5 lg:p-6"
      accent={section.key === 'hero'}
      dashed={section.key === 'limitation'}
      muted={section.status === 'waiting'}
    >
      <div
        className="space-y-3 scroll-mt-24"
        id={`single-domain-section-${section.key}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="sonartra-page-eyebrow">{section.title}</p>
            <h3 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
              {section.question}
            </h3>
            <p className="max-w-3xl text-sm leading-6 text-white/62">{section.purpose}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{section.completionLabel}</LabelPill>
            <LabelPill className={getValidationTone(section.validationState)}>
              {section.validationState === 'ready' ? 'Validation ready' : 'Validation warning'}
            </LabelPill>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
              Completion
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
              {section.currentRowCount}/{section.expectedRowCount > 0 ? section.expectedRowCount : 0}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/56">Current section row coverage.</p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
              Owned claims
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {section.allowedClaimOwnership.map((claim) => (
                <LabelPill
                  className="border-white/10 bg-white/[0.04] text-white/66"
                  key={claim}
                >
                  {claim}
                </LabelPill>
              ))}
            </div>
          </div>
        </div>
      </div>

      {section.key === 'drivers' ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Driver roles</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {DRIVER_ROLE_LABELS.map((role) => (
              <div
                className={cn(
                  'rounded-[0.95rem] border p-4',
                  role.key === 'range_limitation'
                    ? 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)]'
                    : 'border-white/8 bg-black/10',
                )}
                key={role.key}
              >
                <LabelPill
                  className={cn(
                    'border-white/10 bg-white/[0.04] text-white/68',
                    role.key === 'range_limitation' && 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]',
                  )}
                >
                  {role.key}
                </LabelPill>
                <p className="mt-3 text-sm leading-6 text-white/58">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {section.key === 'application' ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Application focus</p>
          <div className="grid gap-3 md:grid-cols-3">
            {APPLICATION_FOCUS_LABELS.map((item) => (
              <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4" key={item.key}>
                <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
                  {item.key}
                </LabelPill>
                <p className="mt-3 text-sm leading-6 text-white/58">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Validation surface</p>
        <div className="space-y-2">
          {section.validationMessages.map((message) => (
            <div
              className={cn(
                'rounded-[0.95rem] border px-4 py-3 text-sm leading-6',
                section.validationState === 'ready'
                  ? 'border-[rgba(116,209,177,0.12)] bg-[rgba(116,209,177,0.04)] text-white/74'
                  : 'border-[rgba(255,184,107,0.14)] bg-[rgba(255,184,107,0.05)] text-white/74',
              )}
              key={message}
            >
              {message}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Primary action area</p>
        <form action={formAction} className="space-y-3">
          <div className="rounded-[0.95rem] border border-[rgba(126,179,255,0.14)] bg-[rgba(126,179,255,0.05)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">Pipe-delimited section import</p>
                <p className="text-sm leading-6 text-white/56">
                  Import only this section using the locked header below. Extra columns, missing
                  columns, or reordered columns will fail validation.
                </p>
              </div>
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
                {section.datasetLabel}
              </LabelPill>
            </div>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-[0.85rem] border border-white/8 bg-black/20 p-3 text-xs leading-6 text-white/72">
              {section.importHeader}
            </pre>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                Imported rows
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                {importState.summary.importedRowCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/56">
                Latest successful import count for this section action.
              </p>
            </div>
            <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                Existing stored rows
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                {importState.summary.existingRowCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/56">
                Rows currently stored in this section before the next import.
              </p>
            </div>
            <div className="rounded-[0.95rem] border border-white/8 bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                Latest validation result
              </p>
              <p className="mt-3 text-sm leading-6 text-white">
                {importState.latestValidationResult
                  ?? (canImport
                    ? 'Waiting for section rows.'
                    : 'Draft version required before this section can import.')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-white"
              htmlFor={`single-domain-import-${section.key}`}
            >
              Section import rows
            </label>
            <textarea
              className="sonartra-focus-ring min-h-[180px] w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28 hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]"
              defaultValue={importState.rawInput}
              disabled={!canImport}
              id={`single-domain-import-${section.key}`}
              name="rawInput"
              placeholder={section.importHeader}
            />
          </div>

          {importState.formError ? (
            <div className="rounded-[0.95rem] border border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] px-4 py-3 text-sm leading-6 text-white/74">
              {importState.formError}
            </div>
          ) : null}

          {importState.success ? (
            <div className="rounded-[0.95rem] border border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] px-4 py-3 text-sm leading-6 text-[rgba(214,246,233,0.86)]">
              {importState.latestValidationResult}
            </div>
          ) : null}

          {importState.executionError ? (
            <div className="rounded-[0.95rem] border border-[rgba(255,157,157,0.2)] bg-[rgba(80,20,20,0.18)] px-4 py-3 text-sm leading-6 text-[rgba(255,216,216,0.94)]">
              {importState.executionError}
            </div>
          ) : null}

          <ImportIssueList label="Parse errors" messages={parseErrors} tone="danger" />
          <ImportIssueList label="Validation errors" messages={validationErrors} tone="warning" />
          <ImportIssueList label="Plan errors" messages={planErrors} tone="warning" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-white/56">
              {canImport
                ? 'This import replaces the stored rows for this owned section only.'
                : 'Create or load a draft version before importing section rows.'}
            </p>
            <ImportSubmitButton disabled={!canImport} />
          </div>
        </form>

        <div className="grid gap-3 xl:grid-cols-3">
          <ActionStub
            buttonLabel="Live in this builder"
            title="Composer preview"
            description="Use the composer preview panel above to review this section inside the full report flow with diagnostics and provenance."
          />
          <ActionStub
            title="Publish blockers"
            description="Publish blockers will consume section completeness and validation state directly from this shell."
          />
        </div>
      </div>
    </SurfaceCard>
  );
}
