'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  AdminFeedbackNotice,
  AdminFeedbackStat,
} from '@/components/admin/admin-feedback-primitives';
import {
  applyRankedPatternImportAction,
  auditRankedPatternPackageAction,
  auditRankedPatternPublishReadinessAction,
  createRankedPatternPackageDraftVersionAction,
  dryRunRankedPatternImportAction,
  publishRankedPatternVersionAction,
  uploadRankedPatternWorkbookPackageAction,
} from '@/lib/server/ranked-pattern-admin-import-workflow-actions';
import {
  initialRankedPatternAdminImportActionState,
  initialRankedPatternDraftVersionActionState,
  initialRankedPatternPublishAuditActionState,
  initialRankedPatternPublishVersionActionState,
  initialRankedPatternWorkbookUploadActionState,
  type RankedPatternAdminImportActionState,
  type RankedPatternDraftVersionActionState,
  type RankedPatternPublishAuditActionState,
  type RankedPatternPublishVersionActionState,
  type RankedPatternWorkbookUploadActionState,
} from '@/lib/server/ranked-pattern-admin-import-workflow-action-state';
import type {
  RankedPatternAdminImportWorkflowResult,
  RankedPatternAdminWorkflowDiagnostic,
} from '@/lib/server/ranked-pattern-admin-import-workflow';
import type {
  RankedPatternPublishAuditFinding,
  RankedPatternPublishAuditResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-publish-audit';
import type { AdminAssessmentDetailVersion } from '@/lib/server/admin-assessment-detail';
import {
  LabelPill,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';

type CountMap = Readonly<Record<string, number>> | undefined;

function SubmitButton({
  idleLabel,
  pendingLabel,
  tone = 'secondary',
  disabled = false,
}: Readonly<{
  idleLabel: string;
  pendingLabel: string;
  tone?: 'primary' | 'secondary' | 'apply';
  disabled?: boolean;
}>) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring w-full justify-center sm:w-auto',
        pending
          ? 'cursor-wait border-white/8 bg-white/[0.05] text-white/48'
          : disabled
            ? 'cursor-not-allowed border-white/8 bg-white/[0.04] text-white/42'
            : tone === 'primary'
              ? 'sonartra-button-primary'
              : tone === 'apply'
                ? 'border-[rgba(255,184,107,0.28)] bg-[rgba(255,184,107,0.12)] text-[rgba(255,235,204,0.96)] hover:bg-[rgba(255,184,107,0.18)]'
                : 'sonartra-button-secondary',
      )}
      disabled={isDisabled}
      type="submit"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function UploadSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring w-full justify-center sm:w-auto',
        pending ? 'cursor-wait border-white/8 bg-white/[0.05] text-white/48' : 'sonartra-button-primary',
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? 'Uploading...' : 'Upload workbook'}
    </button>
  );
}

function PassiveDraftStatus({
  latestDraftVersion,
}: Readonly<{
  latestDraftVersion: AdminAssessmentDetailVersion;
}>) {
  return (
    <div
      aria-label={`Using existing draft ${latestDraftVersion.versionTag}`}
      className="rounded-[0.9rem] border border-[rgba(126,179,255,0.18)] bg-[rgba(126,179,255,0.08)] px-4 py-3"
      data-ranked-pattern-existing-draft-status="true"
      role="status"
    >
      <p className="text-sm font-medium text-[rgba(222,236,255,0.92)]">
        Using draft {latestDraftVersion.versionTag}
      </p>
      <p className="mt-1 break-all text-xs leading-5 text-white/50">
        Draft version already exists. This workflow will continue with{' '}
        {latestDraftVersion.assessmentVersionId}.
      </p>
    </div>
  );
}

function sourcePathFileName(sourcePath: string): string | null {
  const trimmed = sourcePath.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}

function SourcePathPreview({
  sourcePath,
}: Readonly<{
  sourcePath: string;
}>) {
  const fileName = sourcePathFileName(sourcePath);

  if (!fileName) {
    return null;
  }

  return (
    <p className="rounded-[0.8rem] border border-white/8 bg-black/10 px-3 py-2 text-xs leading-5 text-white/52">
      Selected package:{' '}
      <span className="break-all font-medium text-white/72" title={sourcePath}>
        {fileName}
      </span>
    </p>
  );
}

function StatusPill({ status }: Readonly<{ status: string }>) {
  const isReady = ['ready', 'applied', 'publishable'].includes(status);

  return (
    <LabelPill
      className={
        isReady
          ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]'
          : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]'
      }
    >
      {status}
    </LabelPill>
  );
}

function HiddenWorkflowFields({
  sourcePath,
  sourceName,
  sourceHash,
  storageReferenceToken,
  targetAssessmentId,
  targetAssessmentVersionId,
}: Readonly<{
  sourcePath: string;
  sourceName: string;
  sourceHash: string;
  storageReferenceToken: string;
  targetAssessmentId?: string;
  targetAssessmentVersionId?: string;
}>) {
  return (
    <>
      <input name="sourcePath" type="hidden" value={sourcePath} />
      <input name="sourceName" type="hidden" value={sourceName} />
      <input name="sourceHash" type="hidden" value={sourceHash} />
      <input name="storageReferenceToken" type="hidden" value={storageReferenceToken} />
      <input name="targetAssessmentId" type="hidden" value={targetAssessmentId ?? ''} />
      <input name="targetAssessmentVersionId" type="hidden" value={targetAssessmentVersionId ?? ''} />
    </>
  );
}

function WorkflowForm({
  action,
  sourcePath,
  sourceName,
  sourceHash,
  storageReferenceToken,
  targetAssessmentId,
  targetAssessmentVersionId,
  idleLabel,
  pendingLabel,
  tone,
  disabled = false,
}: Readonly<{
  action: (payload: FormData) => void;
  sourcePath: string;
  sourceName: string;
  sourceHash: string;
  storageReferenceToken: string;
  targetAssessmentId?: string;
  targetAssessmentVersionId?: string;
  idleLabel: string;
  pendingLabel: string;
  tone?: 'primary' | 'secondary' | 'apply';
  disabled?: boolean;
}>) {
  return (
    <form action={action}>
      <HiddenWorkflowFields
        sourceHash={sourceHash}
        sourceName={sourceName}
        sourcePath={sourcePath}
        storageReferenceToken={storageReferenceToken}
        targetAssessmentId={targetAssessmentId}
        targetAssessmentVersionId={targetAssessmentVersionId}
      />
      <SubmitButton disabled={disabled} idleLabel={idleLabel} pendingLabel={pendingLabel} tone={tone} />
    </form>
  );
}

function PackageDraftForm({
  action,
  sourcePath,
  sourceName,
  sourceHash,
  storageReferenceToken,
}: Readonly<{
  action: (payload: FormData) => void;
  sourcePath: string;
  sourceName: string;
  sourceHash: string;
  storageReferenceToken: string;
}>) {
  return (
    <form action={action}>
      <HiddenWorkflowFields
        sourceHash={sourceHash}
        sourceName={sourceName}
        sourcePath={sourcePath}
        storageReferenceToken={storageReferenceToken}
      />
      <SubmitButton
        idleLabel="Create draft"
        pendingLabel="Creating draft..."
        tone="secondary"
      />
    </form>
  );
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StorageReferenceDisplay({ value }: Readonly<{ value: string }>) {
  const [bucket, ...pathParts] = value.split('/');
  const objectPath = pathParts.join('/');
  const fileName = objectPath.split('/').at(-1) ?? objectPath;
  return (
    <p className="break-words text-xs leading-5 text-white/46">
      Private storage reference:{' '}
      <span className="font-medium text-white/68" title={value}>
        {bucket}/{fileName}
      </span>
    </p>
  );
}

function WorkbookUploadResultBlock({
  state,
  selected,
  cleared,
  onSelect,
  onClear,
}: Readonly<{
  state: RankedPatternWorkbookUploadActionState;
  selected: boolean;
  cleared: boolean;
  onSelect: () => void;
  onClear: () => void;
}>) {
  if (state.formError) {
    return (
      <AdminFeedbackNotice tone="danger" title="Upload failed">
        <span>{state.formError}</span>
        {Object.values(state.fieldErrors).length > 0 ? (
          <span className="mt-3 block">{Object.values(state.fieldErrors).join(' ')}</span>
        ) : null}
      </AdminFeedbackNotice>
    );
  }

  if (!state.result || cleared) {
    return (
      <div className="space-y-2 rounded-[0.9rem] border border-white/8 bg-black/10 px-4 py-3 text-sm leading-6 text-white/52">
        <p>No workbook has been uploaded yet. Choose a completed .xlsx assessment workbook to begin.</p>
        <p>Accepted: .xlsx up to 10 MB.</p>
        {cleared ? (
          <p>
            The uploaded workbook was removed from this form. Choose another .xlsx file and upload it
            to replace the workbook.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[0.9rem] border border-[rgba(116,209,177,0.2)] bg-[rgba(116,209,177,0.08)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
          Uploaded
        </LabelPill>
        {selected ? (
          <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
            Selected workbook
          </LabelPill>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminFeedbackStat label="File" value={state.result.fileName} />
        <AdminFeedbackStat label="Size" value={formatFileSize(state.result.sizeBytes)} />
        <AdminFeedbackStat label="File fingerprint" value={state.result.shortSourceHash} />
      </div>
      <p className="text-sm leading-6 text-white/58">
        Private file - no public link is created. The workbook is used only for admin import; runtime
        result pages read database rows after import, not workbook files.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="sonartra-button sonartra-button-secondary sonartra-focus-ring w-full justify-center sm:w-auto"
          onClick={onSelect}
          type="button"
        >
          Use uploaded workbook
        </button>
        <button
          className="sonartra-button sonartra-focus-ring w-full justify-center border-white/10 bg-white/[0.03] text-white/58 hover:bg-white/[0.06] sm:w-auto"
          onClick={onClear}
          type="button"
        >
          Remove workbook
        </button>
      </div>
      <details className="rounded-[0.8rem] border border-white/8 bg-black/10 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
          Technical details
        </summary>
        <div className="mt-3 space-y-2">
          <StorageReferenceDisplay value={state.result.safeObjectPath} />
          <p className="break-all text-xs leading-5 text-white/46">
            File fingerprint: <span className="font-medium text-white/68">{state.result.sourceHash}</span>
          </p>
        </div>
      </details>
    </div>
  );
}

function ActiveSourceSummary({
  mode,
  uploadedFileName,
  uploadedHash,
  manualReference,
}: Readonly<{
  mode: 'upload' | 'manual';
  uploadedFileName: string | null;
  uploadedHash: string | null;
  manualReference: string;
}>) {
  const hasManualReference = manualReference.trim().length > 0;
  const label =
    mode === 'upload' && uploadedFileName
      ? 'Uploaded workbook'
      : hasManualReference
        ? 'Existing package reference'
        : 'No workbook selected';
  const detail =
    mode === 'upload' && uploadedFileName
      ? `${uploadedFileName}${uploadedHash ? ` | ${uploadedHash.slice(0, 12)}` : ''}`
      : hasManualReference
        ? manualReference.trim()
        : 'Upload a workbook to start the import workflow.';

  return (
    <div className="rounded-[0.9rem] border border-[rgba(126,179,255,0.16)] bg-[rgba(126,179,255,0.07)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(214,232,255,0.62)]">
        Selected workbook
      </p>
      <p className="mt-1 text-sm font-medium text-[rgba(231,240,255,0.9)]">{label}</p>
      <p className="mt-1 break-all text-xs leading-5 text-white/52">{detail}</p>
    </div>
  );
}

function PublishAuditForm({
  action,
  disabled,
}: Readonly<{
  action: (payload: FormData) => void;
  disabled: boolean;
}>) {
  return (
    <form action={action}>
      <SubmitButton
        disabled={disabled}
        idleLabel="Check publish readiness"
        pendingLabel="Checking readiness..."
        tone="secondary"
      />
    </form>
  );
}

function VersionMutationForm({
  action,
  disabled,
  idleLabel,
  pendingLabel,
  tone = 'secondary',
}: Readonly<{
  action: (payload: FormData) => void;
  disabled: boolean;
  idleLabel: string;
  pendingLabel: string;
  tone?: 'primary' | 'secondary' | 'apply';
}>) {
  return (
    <form action={action}>
      <SubmitButton
        disabled={disabled}
        idleLabel={idleLabel}
        pendingLabel={pendingLabel}
        tone={tone}
      />
    </form>
  );
}

function CountGrid({
  title,
  counts,
}: Readonly<{
  title: string;
  counts: CountMap;
}>) {
  if (!counts) {
    return null;
  }

  const entries = Object.entries(counts).filter(([, value]) => Number.isFinite(value));

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([label, value]) => (
          <AdminFeedbackStat
            detail={label.replaceAll('_', ' ')}
            key={label}
            label={label}
            value={String(value)}
          />
        ))}
      </div>
    </div>
  );
}

function DiagnosticLine({
  diagnostic,
}: Readonly<{
  diagnostic: RankedPatternAdminWorkflowDiagnostic;
}>) {
  const meta = [
    'sheetKey' in diagnostic && diagnostic.sheetKey ? diagnostic.sheetKey : null,
    'rowNumber' in diagnostic && diagnostic.rowNumber ? `row ${diagnostic.rowNumber}` : null,
    'fieldKey' in diagnostic && diagnostic.fieldKey ? diagnostic.fieldKey : null,
  ].filter(Boolean);

  return (
    <div className="rounded-[1rem] border border-white/8 bg-black/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill
          className={
            diagnostic.severity === 'error'
              ? 'border-[rgba(255,157,157,0.22)] bg-[rgba(255,157,157,0.1)] text-[rgba(255,221,221,0.9)]'
              : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,227,187,0.9)]'
          }
        >
          {diagnostic.severity === 'error' ? 'Blocking' : 'Warning'}
        </LabelPill>
        <span className="break-all text-xs font-semibold uppercase tracking-[0.14em] text-white/44">
          {diagnostic.code}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-white/72">{diagnostic.message}</p>
      {meta.length > 0 ? (
        <p className="mt-2 break-words text-xs text-white/42">{meta.join(' | ')}</p>
      ) : null}
    </div>
  );
}

function DiagnosticsList({
  title,
  diagnostics,
}: Readonly<{
  title: string;
  diagnostics: readonly RankedPatternAdminWorkflowDiagnostic[];
}>) {
  if (diagnostics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">{title}</p>
      <div className="space-y-2">
        {diagnostics.slice(0, 10).map((diagnostic, index) => (
          <DiagnosticLine diagnostic={diagnostic} key={`${diagnostic.code}-${index}`} />
        ))}
      </div>
      {diagnostics.length > 10 ? (
        <p className="text-xs text-white/44">
          Showing 10 of {diagnostics.length} findings. Run the package audit script for the full diagnostic export.
        </p>
      ) : null}
    </div>
  );
}

function PublishFindingLine({
  finding,
}: Readonly<{
  finding: RankedPatternPublishAuditFinding;
}>) {
  return (
    <div className="rounded-[1rem] border border-white/8 bg-black/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill
          className={
            finding.severity === 'blocking'
              ? 'border-[rgba(255,157,157,0.22)] bg-[rgba(255,157,157,0.1)] text-[rgba(255,221,221,0.9)]'
              : finding.severity === 'warning'
                ? 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,227,187,0.9)]'
                : 'border-white/10 bg-white/[0.04] text-white/64'
          }
        >
          {finding.severity}
        </LabelPill>
        <span className="break-all text-xs font-semibold uppercase tracking-[0.14em] text-white/44">
          {finding.category}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-white/72">{finding.message}</p>
      <p className="mt-2 break-words text-xs text-white/42">
        {[finding.code, finding.tableName, finding.rowKey, finding.lookupKey].filter(Boolean).join(' | ')}
      </p>
    </div>
  );
}

function PublishAuditResultBlock({
  state,
}: Readonly<{
  state: RankedPatternPublishAuditActionState;
}>) {
  if (state.formError) {
    return (
      <AdminFeedbackNotice tone="danger" title="Publish readiness blocked">
        <span>{state.formError}</span>
        {Object.values(state.fieldErrors).length > 0 ? (
          <span className="mt-3 block">{Object.values(state.fieldErrors).join(' ')}</span>
        ) : null}
      </AdminFeedbackNotice>
    );
  }

  if (!state.result) {
    return null;
  }

  const result: RankedPatternPublishAuditResult = state.result;

  return (
    <SurfaceCard className="space-y-5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="sonartra-page-eyebrow">Publish readiness</p>
        <LabelPill
          className={
            result.canPublish
              ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]'
              : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]'
          }
        >
          {result.canPublish ? 'Ready to publish' : 'Blocked'}
        </LabelPill>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminFeedbackStat label="Blocking findings" value={String(result.blockingCount)} />
        <AdminFeedbackStat label="Warnings" value={String(result.warningCount)} />
      </div>
      {result.findings.length > 0 ? (
        <div className="space-y-2">
          {result.findings.slice(0, 12).map((finding, index) => (
            <PublishFindingLine finding={finding} key={`${finding.code}-${index}`} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-white/60">No readiness issues found.</p>
      )}
    </SurfaceCard>
  );
}

function DraftVersionActionResultBlock({
  state,
}: Readonly<{
  state: RankedPatternDraftVersionActionState;
}>) {
  if (state.formError) {
    const diagnostics = state.result?.diagnostics ?? [];
    return (
      <AdminFeedbackNotice tone="danger" title="Draft version not created">
        <span>{state.formError}</span>
        {Object.values(state.fieldErrors).length > 0 ? (
          <span className="mt-3 block">{Object.values(state.fieldErrors).join(' ')}</span>
        ) : null}
        {diagnostics.length > 0 ? (
          <span className="mt-3 block">
            {diagnostics.slice(0, 4).map((diagnostic) => diagnostic.message).join(' ')}
          </span>
        ) : null}
      </AdminFeedbackNotice>
    );
  }

  if (state.formSuccess) {
    return <AdminFeedbackNotice tone="success">{state.formSuccess}</AdminFeedbackNotice>;
  }

  return null;
}

function PublishVersionActionResultBlock({
  state,
}: Readonly<{
  state: RankedPatternPublishVersionActionState;
}>) {
  if (state.formError) {
    const blocking = state.result?.status === 'blocked' ? state.result.blockingDiagnostics : [];
    return (
      <AdminFeedbackNotice tone="danger" title="Publish blocked">
        <span>{state.formError}</span>
        {blocking.length > 0 ? (
          <span className="mt-3 block">
            {blocking.slice(0, 4).map((diagnostic) => diagnostic.message).join(' ')}
          </span>
        ) : null}
      </AdminFeedbackNotice>
    );
  }

  if (state.formSuccess) {
    return <AdminFeedbackNotice tone="success">{state.formSuccess}</AdminFeedbackNotice>;
  }

  return null;
}

function WorkflowResultBlock({
  state,
}: Readonly<{
  state: RankedPatternAdminImportActionState;
}>) {
  if (state.formError) {
    return (
      <AdminFeedbackNotice tone="danger" title="Workflow action blocked">
        <span>{state.formError}</span>
        {Object.values(state.fieldErrors).length > 0 ? (
          <span className="mt-3 block">{Object.values(state.fieldErrors).join(' ')}</span>
        ) : null}
      </AdminFeedbackNotice>
    );
  }

  const result: RankedPatternAdminImportWorkflowResult | null = state.result;
  if (!result) {
    return null;
  }

  return (
    <SurfaceCard className="space-y-5 p-4" data-ranked-pattern-import-result="true">
      <div className="flex flex-wrap items-center gap-2">
        <p className="sonartra-page-eyebrow">Latest check result</p>
        <StatusPill status={result.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminFeedbackStat
          label="Assessment key"
          value={result.packageMetadata?.assessmentKey ?? 'Not detected'}
        />
        <AdminFeedbackStat
          label="Package version"
          value={result.packageMetadata?.version ?? 'Not detected'}
        />
        <AdminFeedbackStat
          label="Domain key"
          value={result.packageMetadata?.domainKey ?? 'Not detected'}
        />
        <AdminFeedbackStat
          label="Assessment title"
          value={result.packageMetadata?.assessmentTitle ?? 'Not detected'}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminFeedbackStat label="Blocking" value={String(result.blockingDiagnostics.length)} />
        <AdminFeedbackStat label="Warnings" value={String(result.warningDiagnostics.length)} />
        <AdminFeedbackStat
          label="Normalisation errors"
          value={String(result.workbookAuditSummary.normalisationDiagnosticCounts.error)}
        />
        <AdminFeedbackStat
          label="Normalisation warnings"
          value={String(result.workbookAuditSummary.normalisationDiagnosticCounts.warning)}
        />
      </div>

      <CountGrid
        counts={result.countsByStorageTarget.runtimeDefinitionPlanByTable}
        title="Assessment structure preview"
      />
      <CountGrid
        counts={result.countsByStorageTarget.resultLanguagePlanByTable}
        title="Result content preview"
      />
      <CountGrid
        counts={result.countsByStorageTarget.appliedRuntimeDefinitionByTable}
        title="Assessment structure imported"
      />
      <CountGrid
        counts={result.countsByStorageTarget.appliedResultLanguageByTable}
        title="Result content imported"
      />

      <DiagnosticsList diagnostics={result.blockingDiagnostics} title="Blocking diagnostics" />
      <DiagnosticsList diagnostics={result.warningDiagnostics} title="Warnings" />
    </SurfaceCard>
  );
}

type WorkflowStep = {
  readonly label: string;
  readonly status: 'complete' | 'current' | 'pending';
};

function WorkflowStepper({ steps }: Readonly<{ steps: readonly WorkflowStep[] }>) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6" aria-label="Import workflow steps">
      {steps.map((step, index) => (
        <div
          className={cn(
            'rounded-[0.85rem] border px-3 py-3',
            step.status === 'complete'
              ? 'border-[rgba(116,209,177,0.2)] bg-[rgba(116,209,177,0.08)]'
              : step.status === 'current'
                ? 'border-[rgba(126,179,255,0.24)] bg-[rgba(126,179,255,0.1)]'
                : 'border-white/8 bg-black/10',
          )}
          key={step.label}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
            Step {index + 1}
          </p>
          <p
            className={cn(
              'mt-1 text-sm font-medium',
              step.status === 'pending' ? 'text-white/54' : 'text-white/86',
            )}
          >
            {step.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function RecommendedNextAction({
  label,
  description,
}: Readonly<{
  label: string;
  description: string;
}>) {
  return (
    <div className="rounded-[1rem] border border-[rgba(126,179,255,0.2)] bg-[rgba(126,179,255,0.08)] p-4">
      <p className="sonartra-page-eyebrow">Recommended next step</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-white">{label}</p>
      <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
    </div>
  );
}

export function RankedPatternImportPanel({
  assessmentId,
  assessmentKey,
  latestDraftVersion,
}: Readonly<{
  assessmentId?: string;
  assessmentKey?: string;
  latestDraftVersion: AdminAssessmentDetailVersion | null;
}>) {
  const [sourcePath, setSourcePath] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceHash, setSourceHash] = useState('');
  const [sourceMode, setSourceMode] = useState<'upload' | 'manual'>('upload');
  const [clearedUploadToken, setClearedUploadToken] = useState<string | null>(null);
  const actionContext = {
    targetAssessmentId: assessmentId,
    targetAssessmentVersionId: latestDraftVersion?.assessmentVersionId,
  };
  const versionContext = {
    assessmentKey: assessmentKey ?? '',
    targetAssessmentVersionId: latestDraftVersion?.assessmentVersionId ?? '',
  };
  const [auditState, auditAction] = useActionState(
    auditRankedPatternPackageAction.bind(null, actionContext),
    initialRankedPatternAdminImportActionState,
  );
  const [dryRunState, dryRunAction] = useActionState(
    dryRunRankedPatternImportAction.bind(null, actionContext),
    initialRankedPatternAdminImportActionState,
  );
  const [applyState, applyAction] = useActionState(
    applyRankedPatternImportAction.bind(null, actionContext),
    initialRankedPatternAdminImportActionState,
  );
  const [draftVersionState, draftVersionAction] = useActionState(
    createRankedPatternPackageDraftVersionAction.bind(null, versionContext),
    initialRankedPatternDraftVersionActionState,
  );
  const resolvedDraft =
    latestDraftVersion ??
    (draftVersionState.result?.status === 'created' || draftVersionState.result?.status === 'resolved'
      ? {
          assessmentVersionId: draftVersionState.result.draftVersionId,
          versionTag: draftVersionState.result.draftVersionTag,
          status: 'draft' as const,
          titleOverride: null,
          descriptionOverride: null,
          publishedAt: null,
          questionCount: 0,
          createdAt: '',
          updatedAt: '',
        }
      : null);
  const resolvedAssessmentId =
    assessmentId ??
    (draftVersionState.result?.status === 'created' || draftVersionState.result?.status === 'resolved'
      ? draftVersionState.result.assessmentId
      : undefined);
  const resolvedAssessmentKey =
    assessmentKey ??
    (draftVersionState.result?.status === 'created' || draftVersionState.result?.status === 'resolved'
      ? draftVersionState.result.assessmentKey
      : undefined);
  const publishVersionContext = {
    assessmentKey: resolvedAssessmentKey ?? '',
    targetAssessmentVersionId: resolvedDraft?.assessmentVersionId ?? '',
  };
  const [publishAuditState, publishAuditAction] = useActionState(
    auditRankedPatternPublishReadinessAction.bind(null, {
      targetAssessmentVersionId: resolvedDraft?.assessmentVersionId ?? '',
    }),
    initialRankedPatternPublishAuditActionState,
  );
  const [publishVersionState, publishVersionAction] = useActionState(
    publishRankedPatternVersionAction.bind(null, publishVersionContext),
    initialRankedPatternPublishVersionActionState,
  );
  const [uploadState, uploadAction] = useActionState(
    uploadRankedPatternWorkbookPackageAction,
    initialRankedPatternWorkbookUploadActionState,
  );
  const hasDraft = resolvedDraft !== null;
  const canPublishFromAudit = publishAuditState.result?.canPublish === true;
  const packageTargetLabel = resolvedAssessmentKey ?? 'package metadata';
  const uploadedSourceAvailable =
    uploadState.result !== null && uploadState.result.storageReferenceToken !== clearedUploadToken;
  const uploadedSourceSelected = sourceMode === 'upload' && uploadedSourceAvailable;
  const manualSourceSelected = sourceMode === 'manual' && sourcePath.trim().length > 0;
  const workflowSourcePath = uploadedSourceSelected ? '' : sourcePath;
  const workflowSourceName = uploadedSourceSelected ? uploadState.result?.fileName ?? '' : sourceName;
  const workflowSourceHash = uploadedSourceSelected ? uploadState.result?.sourceHash ?? '' : sourceHash;
  const workflowStorageReferenceToken = uploadedSourceSelected ? uploadState.result?.storageReferenceToken ?? '' : '';
  const hasSelectedSource = uploadedSourceSelected || manualSourceSelected;
  const workbookChecked =
    auditState.result?.status === 'ready' &&
    auditState.result.blockingDiagnostics.length === 0;
  const importPreviewReady =
    dryRunState.result?.status === 'ready' &&
    dryRunState.result.blockingDiagnostics.length === 0;
  const importApplied = applyState.result?.status === 'applied';
  const published = publishVersionState.result?.status === 'published';
  const workflowSteps: readonly WorkflowStep[] = [
    {
      label: 'Upload workbook',
      status: hasSelectedSource ? 'complete' : 'current',
    },
    {
      label: 'Check workbook',
      status: workbookChecked ? 'complete' : hasSelectedSource ? 'current' : 'pending',
    },
    {
      label: 'Create draft',
      status: hasDraft ? 'complete' : workbookChecked ? 'current' : 'pending',
    },
    {
      label: 'Preview import',
      status: importPreviewReady ? 'complete' : hasDraft ? 'current' : 'pending',
    },
    {
      label: 'Import',
      status: importApplied ? 'complete' : importPreviewReady ? 'current' : 'pending',
    },
    {
      label: 'Publish',
      status: published ? 'complete' : importApplied || canPublishFromAudit ? 'current' : 'pending',
    },
  ];
  const recommendedNextAction = !hasSelectedSource
    ? {
        label: 'Upload workbook',
        description: 'Choose the completed .xlsx assessment workbook before running checks.',
      }
    : !workbookChecked
      ? {
          label: 'Check workbook',
          description: 'Read the workbook metadata and confirm there are no blocking workbook issues.',
        }
      : !hasDraft
        ? {
            label: 'Create draft',
            description: 'Create or reuse the compatible draft version from the workbook metadata.',
          }
        : !importPreviewReady
          ? {
              label: 'Preview import',
              description: 'Review the planned database changes before importing anything to the draft.',
            }
          : !importApplied
            ? {
                label: 'Import to draft',
                description: 'Write the checked workbook data to the draft version only.',
              }
            : !canPublishFromAudit
              ? {
                  label: 'Check publish readiness',
                  description: 'Confirm the imported draft is ready before publishing it.',
                }
              : !published
                ? {
                    label: 'Publish assessment',
                    description: 'Make the audited draft available for new assessment attempts.',
                  }
                : {
                    label: 'Published',
                    description: 'The assessment has been published from this workflow.',
                  };

  return (
    <SurfaceCard className="space-y-6 p-5 lg:p-6" data-ranked-pattern-import-panel="true">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="sonartra-page-eyebrow">Ranked-pattern import</p>
            <LabelPill>Guided workflow</LabelPill>
            {resolvedDraft ? (
              <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
                Draft {resolvedDraft.versionTag}
              </LabelPill>
            ) : (
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/64">No draft</LabelPill>
            )}
          </div>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Import ranked-pattern assessment
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Upload a completed assessment workbook, check it, import it into a draft, then publish
            when the draft is ready.
          </p>
        </div>

        <div className="sonartra-admin-feedback-card rounded-[1.2rem] border p-4">
            <p className="sonartra-page-eyebrow">Target</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-white/62">
            <p className="break-all">Assessment: {resolvedAssessmentKey ?? 'Read from workbook metadata'}</p>
            <p className="break-all">Assessment id: {resolvedAssessmentId ?? 'Create draft first'}</p>
            <p className="break-all">
              Draft version id: {resolvedDraft?.assessmentVersionId ?? 'Create draft first'}
            </p>
            <p>Status: {resolvedDraft?.status ?? 'No editable draft'}</p>
          </div>
        </div>
      </div>

      <WorkflowStepper steps={workflowSteps} />

      <AdminFeedbackNotice tone="neutral" title="Draft status">
        {resolvedDraft
          ? `Draft ${resolvedDraft.versionTag} already exists for ${packageTargetLabel}. Continue with that draft; this workflow will not create a second concurrent draft.`
          : 'Check the workbook, then create the compatible ranked-pattern draft from workbook metadata. The workflow will not attach a workbook to legacy or incompatible assessment records.'}
      </AdminFeedbackNotice>

      <AdminFeedbackNotice tone="neutral" title="Publishing safety">
        Nothing is published until you choose Publish assessment. Checking and previewing the
        workbook do not change live assessments.
        <details className="mt-3 rounded-[0.8rem] border border-white/8 bg-black/10 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
            Technical safety details
          </summary>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Preview does not write rows. Import writes to draft only. Publishing affects new
            attempts only, and completed results remain tied to their original assessment version
            and persisted payload.
          </p>
        </details>
      </AdminFeedbackNotice>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.45fr)]">
        <div className="space-y-4">
          <div className="space-y-4 rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="sonartra-page-eyebrow">Assessment workbook</p>
              <LabelPill>
                {uploadedSourceSelected
                  ? 'Uploaded workbook selected'
                  : manualSourceSelected
                    ? 'Existing reference selected'
                    : 'No workbook selected'}
              </LabelPill>
            </div>
            <ActiveSourceSummary
              manualReference={sourcePath}
              mode={uploadedSourceSelected ? 'upload' : 'manual'}
              uploadedFileName={uploadedSourceAvailable ? uploadState.result?.fileName ?? null : null}
              uploadedHash={uploadedSourceAvailable ? uploadState.result?.sourceHash ?? null : null}
            />
            <form action={uploadAction} className="space-y-3">
              <label className="block space-y-2" htmlFor="ranked-pattern-workbook-upload">
                <span className="text-sm font-medium text-white">Upload assessment workbook</span>
                <span className="block text-sm leading-6 text-white/56">
                  Upload the completed .xlsx workbook for this assessment. The file is stored
                  privately and used only for import.
                </span>
                <input
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sonartra-focus-ring w-full rounded-[0.9rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
                  id="ranked-pattern-workbook-upload"
                  name="workbookFile"
                  type="file"
                />
              </label>
              <UploadSubmitButton />
            </form>
            <p className="text-xs leading-5 text-white/46">
              Accepted: .xlsx up to 10 MB. To replace the workbook, choose another .xlsx file and
              upload it.
            </p>
            <WorkbookUploadResultBlock
              cleared={uploadState.result !== null && !uploadedSourceAvailable}
              onClear={() => {
                setClearedUploadToken(uploadState.result?.storageReferenceToken ?? null);
                setSourceMode('manual');
              }}
              onSelect={() => setSourceMode('upload')}
              selected={uploadedSourceSelected}
              state={uploadState}
            />
          </div>

          <div className="space-y-4 rounded-[1rem] border border-white/8 bg-black/10 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="sonartra-page-eyebrow">Advanced: use existing package reference</p>
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/64">Advanced / development only</LabelPill>
              {manualSourceSelected ? (
                <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
                  Existing reference selected
                </LabelPill>
              ) : null}
            </div>
            <label className="block space-y-2" htmlFor="ranked-pattern-workbook-path">
              <span className="text-sm font-medium text-white">Existing package reference or local path</span>
              <input
                className="sonartra-focus-ring w-full rounded-[0.9rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28"
                id="ranked-pattern-workbook-path"
                onChange={(event) => {
                  setSourcePath(event.currentTarget.value);
                  setSourceMode('manual');
                }}
                placeholder="leadership-approach"
                title={sourcePath}
                type="text"
                value={sourcePath}
              />
            </label>
            <SourcePathPreview sourcePath={sourcePath} />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-2" htmlFor="ranked-pattern-source-name">
                <span className="text-sm font-medium text-white">Technical source name</span>
                <input
                  className="sonartra-focus-ring w-full rounded-[0.9rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28"
                  id="ranked-pattern-source-name"
                  onChange={(event) => setSourceName(event.currentTarget.value)}
                  placeholder="Optional"
                  type="text"
                  value={sourceName}
                />
              </label>
              <label className="block space-y-2" htmlFor="ranked-pattern-source-hash">
                <span className="text-sm font-medium text-white">File fingerprint</span>
                <input
                  className="sonartra-focus-ring w-full rounded-[0.9rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28"
                  id="ranked-pattern-source-hash"
                  onChange={(event) => setSourceHash(event.currentTarget.value)}
                  placeholder="Optional"
                  type="text"
                  value={sourceHash}
                />
              </label>
            </div>
            <p className="text-sm leading-6 text-white/48">
              Existing package references remain available for advanced testing. Production upload
              uses private storage and never exposes a public workbook URL.
            </p>
            {sourcePath.trim() ? (
              <button
                className="sonartra-button sonartra-button-secondary sonartra-focus-ring w-full justify-center sm:w-auto"
                onClick={() => setSourceMode('manual')}
                type="button"
              >
                Use existing reference
              </button>
            ) : null}
          </div>
        </div>

        <div className="sonartra-admin-feedback-card space-y-3 rounded-[1.2rem] border p-4">
          <RecommendedNextAction
            description={recommendedNextAction.description}
            label={recommendedNextAction.label}
          />
          {resolvedDraft ? (
            <PassiveDraftStatus latestDraftVersion={resolvedDraft} />
          ) : (
            <PackageDraftForm
              action={draftVersionAction}
              sourceHash={workflowSourceHash}
              sourceName={workflowSourceName}
              sourcePath={workflowSourcePath}
              storageReferenceToken={workflowStorageReferenceToken}
            />
          )}
          <WorkflowForm
            action={auditAction}
            idleLabel="Check workbook"
            pendingLabel="Checking..."
            sourceHash={workflowSourceHash}
            sourceName={workflowSourceName}
            sourcePath={workflowSourcePath}
            storageReferenceToken={workflowStorageReferenceToken}
            targetAssessmentId={resolvedAssessmentId}
            targetAssessmentVersionId={resolvedDraft?.assessmentVersionId}
            tone="secondary"
          />
          <WorkflowForm
            action={dryRunAction}
            idleLabel="Preview import"
            pendingLabel="Previewing..."
            sourceHash={workflowSourceHash}
            sourceName={workflowSourceName}
            sourcePath={workflowSourcePath}
            storageReferenceToken={workflowStorageReferenceToken}
            targetAssessmentId={resolvedAssessmentId}
            targetAssessmentVersionId={resolvedDraft?.assessmentVersionId}
            tone="primary"
          />
          <WorkflowForm
            action={applyAction}
            disabled={!hasDraft}
            idleLabel="Import to draft"
            pendingLabel="Importing..."
            sourceHash={workflowSourceHash}
            sourceName={workflowSourceName}
            sourcePath={workflowSourcePath}
            storageReferenceToken={workflowStorageReferenceToken}
            targetAssessmentId={resolvedAssessmentId}
            targetAssessmentVersionId={resolvedDraft?.assessmentVersionId}
            tone="apply"
          />
          <PublishAuditForm action={publishAuditAction} disabled={!hasDraft} />
          <VersionMutationForm
            action={publishVersionAction}
            disabled={!hasDraft || !canPublishFromAudit}
            idleLabel="Publish assessment"
            pendingLabel="Publishing..."
            tone="apply"
          />
          {!hasDraft ? (
            <p className="text-xs leading-5 text-white/46">
              Create a draft before importing, checking publish readiness, or publishing.
            </p>
          ) : !canPublishFromAudit ? (
            <p className="text-xs leading-5 text-white/46">
              Check publish readiness and resolve all blocking findings before publishing is enabled.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-sm font-medium text-white">Workflow steps</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-white/60">
          <li>Upload a private .xlsx workbook, or choose an advanced existing reference.</li>
          <li>Check the workbook and review workbook metadata before a target exists.</li>
          <li>Create the compatible draft version from workbook metadata.</li>
          <li>Preview and import the ranked-pattern package against that draft.</li>
          <li>Import the package only after blocking diagnostics are clear.</li>
          <li>Check publish readiness and publish separately when all blocking findings are resolved.</li>
          <li>Completed results continue to render from their persisted payload.</li>
        </ol>
      </div>

      <div className="space-y-4">
        <DraftVersionActionResultBlock state={draftVersionState} />
        <WorkflowResultBlock state={auditState} />
        <WorkflowResultBlock state={dryRunState} />
        <WorkflowResultBlock state={applyState} />
        <PublishAuditResultBlock state={publishAuditState} />
        <PublishVersionActionResultBlock state={publishVersionState} />
      </div>
    </SurfaceCard>
  );
}
