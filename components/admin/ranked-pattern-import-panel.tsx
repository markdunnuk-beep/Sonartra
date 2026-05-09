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
} from '@/lib/server/ranked-pattern-admin-import-workflow-actions';
import {
  initialRankedPatternAdminImportActionState,
  initialRankedPatternDraftVersionActionState,
  initialRankedPatternPublishAuditActionState,
  initialRankedPatternPublishVersionActionState,
  type RankedPatternAdminImportActionState,
  type RankedPatternDraftVersionActionState,
  type RankedPatternPublishAuditActionState,
  type RankedPatternPublishVersionActionState,
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
  targetAssessmentId,
  targetAssessmentVersionId,
}: Readonly<{
  sourcePath: string;
  sourceName: string;
  sourceHash: string;
  targetAssessmentId?: string;
  targetAssessmentVersionId?: string;
}>) {
  return (
    <>
      <input name="sourcePath" type="hidden" value={sourcePath} />
      <input name="sourceName" type="hidden" value={sourceName} />
      <input name="sourceHash" type="hidden" value={sourceHash} />
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
}: Readonly<{
  action: (payload: FormData) => void;
  sourcePath: string;
  sourceName: string;
  sourceHash: string;
}>) {
  return (
    <form action={action}>
      <HiddenWorkflowFields sourceHash={sourceHash} sourceName={sourceName} sourcePath={sourcePath} />
      <SubmitButton
        idleLabel="Create or resolve package draft"
        pendingLabel="Resolving package draft..."
        tone="secondary"
      />
    </form>
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
        idleLabel="Run publish audit"
        pendingLabel="Auditing publish..."
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
      <AdminFeedbackNotice tone="danger" title="Publish audit blocked">
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
        <p className="sonartra-page-eyebrow">Publish audit</p>
        <LabelPill
          className={
            result.canPublish
              ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]'
              : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]'
          }
        >
          {result.canPublish ? 'Can publish' : 'Blocked'}
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
        <p className="text-sm leading-6 text-white/60">No publish findings returned.</p>
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
        <p className="sonartra-page-eyebrow">Latest workflow result</p>
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
        title="Runtime definition planned counts"
      />
      <CountGrid
        counts={result.countsByStorageTarget.resultLanguagePlanByTable}
        title="Result-language planned counts"
      />
      <CountGrid
        counts={result.countsByStorageTarget.appliedRuntimeDefinitionByTable}
        title="Runtime definition applied counts"
      />
      <CountGrid
        counts={result.countsByStorageTarget.appliedResultLanguageByTable}
        title="Result-language applied counts"
      />

      <DiagnosticsList diagnostics={result.blockingDiagnostics} title="Blocking diagnostics" />
      <DiagnosticsList diagnostics={result.warningDiagnostics} title="Warnings" />
    </SurfaceCard>
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
  const hasDraft = resolvedDraft !== null;
  const canPublishFromAudit = publishAuditState.result?.canPublish === true;
  const packageTargetLabel = resolvedAssessmentKey ?? 'package metadata';

  return (
    <SurfaceCard className="space-y-6 p-5 lg:p-6" data-ranked-pattern-import-panel="true">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="sonartra-page-eyebrow">Ranked-pattern import</p>
            <LabelPill>Admin package workflow</LabelPill>
            {resolvedDraft ? (
              <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
                Draft {resolvedDraft.versionTag}
              </LabelPill>
            ) : (
              <LabelPill className="border-white/10 bg-white/[0.04] text-white/64">No draft</LabelPill>
            )}
          </div>
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Import and review a ranked-pattern package
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-white/62">
            Use this interim admin/developer workflow to audit a workbook package, dry-run the
            database plans, resolve a compatible package draft from workbook metadata, explicitly
            apply package data to that draft, and run publish readiness.
          </p>
        </div>

        <div className="sonartra-admin-feedback-card rounded-[1.2rem] border p-4">
            <p className="sonartra-page-eyebrow">Target</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-white/62">
            <p className="break-all">Assessment: {resolvedAssessmentKey ?? 'Read from workbook metadata'}</p>
            <p className="break-all">Assessment id: {resolvedAssessmentId ?? 'Resolve package draft first'}</p>
            <p className="break-all">
              Draft version id: {resolvedDraft?.assessmentVersionId ?? 'Resolve package draft first'}
            </p>
            <p>Status: {resolvedDraft?.status ?? 'No editable draft'}</p>
          </div>
        </div>
      </div>

      <AdminFeedbackNotice tone="neutral" title="Draft version requirements">
        {resolvedDraft
          ? `Draft ${resolvedDraft.versionTag} already exists for ${packageTargetLabel}. Continue with that draft; this workflow will not create a second concurrent draft.`
          : 'Audit the workbook, then create or resolve the compatible ranked-pattern draft from package metadata. The workflow will not attach a package to legacy or incompatible assessment records.'}
      </AdminFeedbackNotice>

      <AdminFeedbackNotice tone="neutral" title="Workflow safety">
        Audit and dry-run do not write to the database. Apply import writes package data but does
        not publish. Publish audit is read-only, and publishing remains a separate explicit action.
        Publishing affects new attempts only. Existing completed results remain tied to their
        original assessment version and persisted payload.
      </AdminFeedbackNotice>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.45fr)]">
        <div className="space-y-4">
          <label className="block space-y-2" htmlFor="ranked-pattern-workbook-path">
            <span className="text-sm font-medium text-white">Workbook file path or package reference</span>
            <input
              className="sonartra-focus-ring w-full rounded-[0.9rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28"
              id="ranked-pattern-workbook-path"
              onChange={(event) => setSourcePath(event.currentTarget.value)}
              placeholder="C:\\path\\to\\ranked-pattern-package.xlsx"
              title={sourcePath}
              type="text"
              value={sourcePath}
            />
          </label>
          <SourcePathPreview sourcePath={sourcePath} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-2" htmlFor="ranked-pattern-source-name">
              <span className="text-sm font-medium text-white">Source name</span>
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
              <span className="text-sm font-medium text-white">Source hash</span>
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
            Upload storage is not wired yet, so this field uses a server-readable workbook path or
            package reference for local/admin testing.
          </p>
        </div>

        <div className="sonartra-admin-feedback-card space-y-3 rounded-[1.2rem] border p-4">
          {resolvedDraft ? (
            <PassiveDraftStatus latestDraftVersion={resolvedDraft} />
          ) : (
            <PackageDraftForm
              action={draftVersionAction}
              sourceHash={sourceHash}
              sourceName={sourceName}
              sourcePath={sourcePath}
            />
          )}
          <WorkflowForm
            action={auditAction}
            idleLabel="Audit package"
            pendingLabel="Auditing..."
            sourceHash={sourceHash}
            sourceName={sourceName}
            sourcePath={sourcePath}
            targetAssessmentId={resolvedAssessmentId}
            targetAssessmentVersionId={resolvedDraft?.assessmentVersionId}
            tone="secondary"
          />
          <WorkflowForm
            action={dryRunAction}
            idleLabel="Dry-run import"
            pendingLabel="Planning..."
            sourceHash={sourceHash}
            sourceName={sourceName}
            sourcePath={sourcePath}
            targetAssessmentId={resolvedAssessmentId}
            targetAssessmentVersionId={resolvedDraft?.assessmentVersionId}
            tone="primary"
          />
          <WorkflowForm
            action={applyAction}
            disabled={!hasDraft}
            idleLabel="Apply import"
            pendingLabel="Applying..."
            sourceHash={sourceHash}
            sourceName={sourceName}
            sourcePath={sourcePath}
            targetAssessmentId={resolvedAssessmentId}
            targetAssessmentVersionId={resolvedDraft?.assessmentVersionId}
            tone="apply"
          />
          <PublishAuditForm action={publishAuditAction} disabled={!hasDraft} />
          <VersionMutationForm
            action={publishVersionAction}
            disabled={!hasDraft || !canPublishFromAudit}
            idleLabel="Publish audited draft"
            pendingLabel="Publishing..."
            tone="apply"
          />
          {!hasDraft ? (
            <p className="text-xs leading-5 text-white/46">
              Create or resolve a package draft before applying package data, running publish audit,
              or publishing.
            </p>
          ) : !canPublishFromAudit ? (
            <p className="text-xs leading-5 text-white/46">
              Run publish audit and resolve all blocking findings before explicit publish is enabled.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[1rem] border border-white/8 bg-black/10 p-4">
        <p className="text-sm font-medium text-white">Draft/version workflow</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-white/60">
          <li>Enter the workbook path or package reference.</li>
          <li>Audit the package and review workbook metadata before a target exists.</li>
          <li>Create or resolve the compatible draft version from package metadata.</li>
          <li>Dry-run and apply the ranked-pattern package against that draft.</li>
          <li>Apply the package only after blocking diagnostics are clear.</li>
          <li>Run publish audit and publish separately when all blocking findings are resolved.</li>
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
