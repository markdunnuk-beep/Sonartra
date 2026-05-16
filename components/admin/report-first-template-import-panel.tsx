'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  AdminFeedbackNotice,
  AdminFeedbackStat,
} from '@/components/admin/admin-feedback-primitives';
import {
  importReportFirstTemplatesAction,
  promoteReportFirstTemplatesAction,
} from '@/lib/server/ranked-pattern-admin-import-workflow-actions';
import {
  initialReportFirstTemplateImportActionState,
  initialReportFirstTemplatePromotionActionState,
  type ReportFirstTemplateImportActionState,
  type ReportFirstTemplatePromotionActionState,
} from '@/lib/server/ranked-pattern-admin-import-workflow-action-state';
import {
  CardTitle,
  LabelPill,
  MetaItem,
  SecondaryText,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';

function SubmitButton({
  disabled,
  idleLabel,
  pendingLabel,
}: Readonly<{
  disabled: boolean;
  idleLabel: string;
  pendingLabel: string;
}>) {
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
      {pending ? pendingLabel : idleLabel}
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
        <LabelPill className={state.result.publishableFullCoverage
          ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]'
          : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,227,187,0.9)]'}
        >
          {state.result.publishableFullCoverage ? 'Coverage complete' : 'Coverage blocked'}
        </LabelPill>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminFeedbackStat label="Imported draft rows" value={String(state.result.importedTemplateCount)} />
        <AdminFeedbackStat label="Missing templates" value={String(state.result.missingTemplateCount)} />
        <AdminFeedbackStat label="Publishable coverage" value={state.result.publishableFullCoverage ? 'Yes' : 'No'} />
      </div>
      <p className="text-sm leading-6 text-[rgba(214,246,233,0.72)]">
          {state.result.importedTemplateCount} of {state.result.expectedTemplateCount} report-first
        templates are imported. {state.result.publishableFullCoverage
          ? 'Generated report-first template coverage is complete. Publish audit still requires active DB template rows.'
          : `${state.result.missingTemplateCount} templates are still missing, so publish remains blocked.`}
      </p>
    </div>
  );
}

function PromotionResult({ state }: Readonly<{ state: ReportFirstTemplatePromotionActionState }>) {
  if (state.formError) {
    return (
      <AdminFeedbackNotice tone="danger" title="Report-first publish prep blocked">
        <span>{state.formError}</span>
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
          Publish prep complete
        </LabelPill>
        <LabelPill className="border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]">
          DB coverage ready
        </LabelPill>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminFeedbackStat label="Promoted rows" value={String(state.result.promotedTemplateCount)} />
        <AdminFeedbackStat label="Active publish rows" value={String(state.result.activeTemplateCount)} />
        <AdminFeedbackStat label="Assessment published" value="No" />
      </div>
      <p className="text-sm leading-6 text-[rgba(214,246,233,0.72)]">
        {state.result.status === 'already_active'
          ? 'The report-first template set was already active and publishable in DB storage.'
          : `${state.result.promotedTemplateCount} draft templates were prepared as active DB rows for publish audit.`}{' '}
        The assessment itself has not been published.
      </p>
    </div>
  );
}

export function ReportFirstTemplateImportPanel({
  assessmentKey,
  targetAssessmentVersionId,
  generatedImportReadyCount,
  generatedPublishableCoverage,
  importedDraftCount,
  importedActiveCount,
  importedActiveCoverageComplete,
  missingTemplateCount,
  scoreShapePolicy,
}: Readonly<{
  assessmentKey: string;
  targetAssessmentVersionId: string | null;
  generatedImportReadyCount: number;
  generatedPublishableCoverage: boolean;
  importedDraftCount: number | null;
  importedActiveCount: number | null;
  importedActiveCoverageComplete: boolean;
  missingTemplateCount: number;
  scoreShapePolicy: string;
}>) {
  const [state, action] = useActionState(
    importReportFirstTemplatesAction.bind(null, {
      assessmentKey,
      targetAssessmentVersionId: targetAssessmentVersionId ?? undefined,
    }),
    initialReportFirstTemplateImportActionState,
  );
  const [promotionState, promotionAction] = useActionState(
    promoteReportFirstTemplatesAction.bind(null, {
      assessmentKey,
      targetAssessmentVersionId: targetAssessmentVersionId ?? undefined,
    }),
    initialReportFirstTemplatePromotionActionState,
  );
  const visibleImportedCount = state.result?.importedTemplateCount ?? importedDraftCount;
  const visibleActiveCount = promotionState.result?.activeTemplateCount ?? importedActiveCount;
  const visibleActiveCoverageComplete = promotionState.result?.publishableFullCoverage ?? importedActiveCoverageComplete;
  const visibleMissingCount = state.result?.missingTemplateCount ?? missingTemplateCount;
  const actionDisabled = !targetAssessmentVersionId;
  const promotionDisabled = actionDisabled || visibleImportedCount !== 24;

  return (
    <SurfaceCard className="space-y-5 p-5 lg:p-6" data-report-first-import-status="true">
      <div className="flex flex-wrap items-center gap-2">
        <p className="sonartra-page-eyebrow">Report-first templates</p>
        <LabelPill>{generatedImportReadyCount} generated rows</LabelPill>
        <LabelPill className={visibleMissingCount === 0
          ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]'
          : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.1)] text-[rgba(255,227,187,0.9)]'}
        >
          {visibleMissingCount} missing
        </LabelPill>
      </div>
      <div className="space-y-2">
        <CardTitle>Report-first import handoff</CardTitle>
        <SecondaryText>
          Import the generated package rows into draft template storage. This does not publish the assessment and does not change user results.
        </SecondaryText>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaItem label="Artifact" value="Found" />
        <MetaItem label="Generated coverage" value={generatedPublishableCoverage ? '24/24 complete' : 'Incomplete'} />
        <MetaItem
          label="Draft imported rows"
          value={visibleImportedCount === null ? 'Create a draft first' : String(visibleImportedCount)}
        />
        <MetaItem
          label="Active publish rows"
          value={visibleActiveCount === null ? 'Create a draft first' : String(visibleActiveCount)}
        />
        <MetaItem label="Promotion available" value={!promotionDisabled && !visibleActiveCoverageComplete ? 'Yes' : 'No'} />
        <MetaItem label="Publish audit DB coverage" value={visibleActiveCoverageComplete ? 'Ready' : 'Blocked'} />
        <MetaItem label="Score-shape policy" value={scoreShapePolicy} />
      </div>
      <div className={visibleActiveCoverageComplete
        ? 'rounded-[1rem] border border-[rgba(116,209,177,0.2)] bg-[rgba(116,209,177,0.08)] px-4 py-3'
        : 'rounded-[1rem] border border-[rgba(255,184,107,0.2)] bg-[rgba(255,184,107,0.08)] px-4 py-3'}
      >
        <p className={visibleActiveCoverageComplete
          ? 'text-sm font-medium text-[rgba(214,246,233,0.92)]'
          : 'text-sm font-medium text-[rgba(255,235,204,0.92)]'}
        >
          {visibleActiveCoverageComplete
            ? 'Report-first DB publish coverage is complete'
            : 'Report-first DB publish coverage remains blocked'}
        </p>
        <p className={visibleActiveCoverageComplete
          ? 'mt-1 text-sm leading-6 text-[rgba(214,246,233,0.68)]'
          : 'mt-1 text-sm leading-6 text-[rgba(255,235,204,0.68)]'}
        >
          Generated artifact coverage is {generatedPublishableCoverage ? 'complete' : 'incomplete'}, with {generatedImportReadyCount} rows.{' '}
          {visibleImportedCount ?? 0} rows are in draft storage and {visibleActiveCount ?? 0} active rows are available for publish audit.{' '}
          {visibleActiveCoverageComplete
            ? 'All required active DB templates are available. Publishing still requires the normal admin publish workflow.'
            : 'Publish audit checks active DB template rows, so generated artifact coverage or draft-only rows do not make this publish-ready.'}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <form action={action}>
          <SubmitButton
            disabled={actionDisabled}
            idleLabel="Import generated report templates"
            pendingLabel="Importing templates..."
          />
        </form>
        <form action={promotionAction}>
          <SubmitButton
            disabled={promotionDisabled}
            idleLabel="Prepare report-first templates for publish"
            pendingLabel="Preparing templates..."
          />
        </form>
      </div>
      <Link
        className="sonartra-button sonartra-focus-ring inline-flex w-full justify-center sm:w-auto"
        href="/admin/qa/report-first"
      >
        Open report-first QA route
      </Link>
      {actionDisabled ? (
        <p className="text-sm leading-6 text-white/48">
          Create or resolve a draft version before importing report-first templates.
        </p>
      ) : null}
      {!actionDisabled && promotionDisabled && !visibleActiveCoverageComplete ? (
        <p className="text-sm leading-6 text-white/48">
          Import all 24 generated report-first templates before preparing them for publish audit.
        </p>
      ) : null}
      <ActionResult state={state} />
      <PromotionResult state={promotionState} />
    </SurfaceCard>
  );
}
