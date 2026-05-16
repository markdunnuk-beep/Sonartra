'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  AdminFeedbackNotice,
  AdminFeedbackStat,
} from '@/components/admin/admin-feedback-primitives';
import {
  importReportFirstTemplatesAction,
} from '@/lib/server/ranked-pattern-admin-import-workflow-actions';
import {
  initialReportFirstTemplateImportActionState,
  type ReportFirstTemplateImportActionState,
} from '@/lib/server/ranked-pattern-admin-import-workflow-action-state';
import {
  CardTitle,
  LabelPill,
  MetaItem,
  SecondaryText,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';

function SubmitButton({ disabled }: Readonly<{ disabled: boolean }>) {
  const { pending } = useFormStatus();
  return (
    <button
      className={cn(
        'sonartra-button sonartra-focus-ring w-full justify-center sm:w-auto',
        pending || disabled
          ? 'cursor-not-allowed border-white/8 bg-white/[0.04] text-white/42'
          : 'border-[rgba(255,184,107,0.28)] bg-[rgba(255,184,107,0.12)] text-[rgba(255,235,204,0.96)] hover:bg-[rgba(255,184,107,0.18)]',
      )}
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? 'Importing templates...' : 'Import generated report templates'}
    </button>
  );
}

function ActionResult({ state }: Readonly<{ state: ReportFirstTemplateImportActionState }>) {
  if (state.formError) {
    return (
      <AdminFeedbackNotice tone="danger" title="Report-first import blocked">
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

  return (
    <div className="space-y-4 rounded-[1rem] border border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.07)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
          Import complete
        </LabelPill>
        <LabelPill className="border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,227,187,0.9)]">
          Coverage blocked
        </LabelPill>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminFeedbackStat label="Imported draft rows" value={String(state.result.importedTemplateCount)} />
        <AdminFeedbackStat label="Missing templates" value={String(state.result.missingTemplateCount)} />
        <AdminFeedbackStat label="Publishable coverage" value={state.result.publishableFullCoverage ? 'Yes' : 'No'} />
      </div>
      <p className="text-sm leading-6 text-[rgba(214,246,233,0.72)]">
        {state.result.importedTemplateCount} of {state.result.expectedTemplateCount} report-first
        templates are imported. {state.result.missingTemplateCount} templates are still missing, so
        publish remains blocked.
      </p>
    </div>
  );
}

export function ReportFirstTemplateImportPanel({
  assessmentKey,
  targetAssessmentVersionId,
  generatedImportReadyCount,
  importedDraftCount,
  missingTemplateCount,
  publishableCoverage,
  scoreShapePolicy,
}: Readonly<{
  assessmentKey: string;
  targetAssessmentVersionId: string | null;
  generatedImportReadyCount: number;
  importedDraftCount: number | null;
  missingTemplateCount: number;
  publishableCoverage: boolean;
  scoreShapePolicy: string;
}>) {
  const [state, action] = useActionState(
    importReportFirstTemplatesAction.bind(null, {
      assessmentKey,
      targetAssessmentVersionId: targetAssessmentVersionId ?? undefined,
    }),
    initialReportFirstTemplateImportActionState,
  );
  const visibleImportedCount = state.result?.importedTemplateCount ?? importedDraftCount;
  const visibleMissingCount = state.result?.missingTemplateCount ?? missingTemplateCount;
  const actionDisabled = !targetAssessmentVersionId;

  return (
    <SurfaceCard className="space-y-5 p-5 lg:p-6" data-report-first-import-status="true">
      <div className="flex flex-wrap items-center gap-2">
        <p className="sonartra-page-eyebrow">Report-first templates</p>
        <LabelPill>{generatedImportReadyCount} generated rows</LabelPill>
        <LabelPill className="border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,227,187,0.9)]">
          {visibleMissingCount} missing
        </LabelPill>
      </div>
      <div className="space-y-2">
        <CardTitle>Report-first import handoff</CardTitle>
        <SecondaryText>
          Import the generated package rows into draft template storage. This does not publish the
          assessment and does not change user results.
        </SecondaryText>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaItem label="Artifact" value="Found" />
        <MetaItem
          label="Draft imported rows"
          value={visibleImportedCount === null ? 'Create a draft first' : String(visibleImportedCount)}
        />
        <MetaItem label="Coverage" value={publishableCoverage ? 'Publishable' : 'Blocked'} />
        <MetaItem label="Score-shape policy" value={scoreShapePolicy} />
      </div>
      <div className="rounded-[1rem] border border-[rgba(255,184,107,0.2)] bg-[rgba(255,184,107,0.08)] px-4 py-3">
        <p className="text-sm font-medium text-[rgba(255,235,204,0.92)]">
          Report-first publish coverage remains blocked
        </p>
        <p className="mt-1 text-sm leading-6 text-[rgba(255,235,204,0.68)]">
          {visibleImportedCount ?? 0} report-first templates are present in draft storage.{' '}
          {visibleMissingCount} required ranked-pattern templates are still missing, so publish
          audit must continue to block report-first readiness.
        </p>
      </div>
      <form action={action}>
        <SubmitButton disabled={actionDisabled} />
      </form>
      {actionDisabled ? (
        <p className="text-sm leading-6 text-white/48">
          Create or resolve a draft version before importing report-first templates.
        </p>
      ) : null}
      <ActionResult state={state} />
    </SurfaceCard>
  );
}
