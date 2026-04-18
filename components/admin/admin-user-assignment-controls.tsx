'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { AdminFeedbackNotice } from '@/components/admin/admin-feedback-primitives';
import {
  LabelPill,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import {
  emptyAdminAssignmentCreateValues,
  initialAdminAssignmentCreateFormState,
  initialAdminAssignmentMutationState,
} from '@/lib/admin/admin-user-assignment-controls';
import type { AdminUserDetailControlsViewModel } from '@/lib/server/admin-user-detail';
import {
  createAdminUserAssignmentAction,
  removeAdminUserAssignmentAction,
  reorderAdminUserAssignmentAction,
} from '@/lib/server/admin-user-assignment-controls';
import type { AdminUserDetailAssignmentControlViewModel } from '@/lib/server/admin-user-detail';

function getMutationFeedbackMessage(value: string | null): string | null {
  switch (value) {
    case 'added':
      return 'Assignment added.';
    case 'reordered':
      return 'Sequence updated.';
    case 'removed':
      return 'Assignment removed.';
    default:
      return null;
  }
}

function PendingButton({
  idleLabel,
  pendingLabel,
  tone = 'primary',
  disabled = false,
  name,
  value,
}: Readonly<{
  idleLabel: string;
  pendingLabel: string;
  tone?: 'primary' | 'neutral' | 'danger';
  disabled?: boolean;
  name?: string;
  value?: string;
}>) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        'sonartra-focus-ring inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm transition',
        tone === 'primary' &&
          'border-[rgba(142,162,255,0.28)] bg-[rgba(142,162,255,0.14)] text-white hover:border-[rgba(142,162,255,0.4)]',
        tone === 'neutral' &&
          'border-white/12 bg-white/[0.04] text-white/72 hover:border-white/18 hover:text-white',
        tone === 'danger' &&
          'border-[rgba(255,132,132,0.24)] bg-[rgba(255,132,132,0.08)] text-[rgba(255,225,225,0.88)] hover:border-[rgba(255,132,132,0.34)]',
        (disabled || pending) && 'cursor-not-allowed border-white/8 bg-white/[0.04] text-white/38 hover:border-white/8',
      )}
      disabled={disabled || pending}
      name={name}
      type="submit"
      value={value}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

type AssignmentVisualTone =
  | 'editable'
  | 'fixed'
  | 'started'
  | 'completed'
  | 'result_ready';

function getAssignmentVisualTone(
  assignment: AdminUserDetailAssignmentControlViewModel,
): AssignmentVisualTone {
  if (assignment.resultHref) {
    return 'result_ready';
  }

  if (assignment.status === 'completed') {
    return 'completed';
  }

  if (assignment.status === 'in_progress' || assignment.executionStateLabel === 'Historically active') {
    return 'started';
  }

  if (assignment.canRemove || assignment.canMoveEarlier || assignment.canMoveLater) {
    return 'editable';
  }

  return 'fixed';
}

function getAssignmentVisualToneLabel(tone: AssignmentVisualTone): string {
  switch (tone) {
    case 'editable':
      return 'Editable queue';
    case 'fixed':
      return 'Fixed history';
    case 'started':
      return 'Started history';
    case 'completed':
      return 'Completed history';
    case 'result_ready':
      return 'Result ready';
  }
}

function getAssignmentRowClassName(tone: AssignmentVisualTone): string {
  switch (tone) {
    case 'editable':
      return 'border-[rgba(142,162,255,0.22)] bg-[linear-gradient(180deg,rgba(142,162,255,0.12),rgba(255,255,255,0.03))] shadow-[inset_0_0_0_1px_rgba(142,162,255,0.08)]';
    case 'fixed':
      return 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.025))]';
    case 'started':
      return 'border-[rgba(255,184,107,0.2)] bg-[linear-gradient(180deg,rgba(255,184,107,0.1),rgba(255,255,255,0.03))] shadow-[inset_0_0_0_1px_rgba(255,184,107,0.06)]';
    case 'completed':
      return 'border-[rgba(116,209,177,0.16)] bg-[linear-gradient(180deg,rgba(116,209,177,0.08),rgba(255,255,255,0.03))]';
    case 'result_ready':
      return 'border-[rgba(116,209,177,0.26)] bg-[linear-gradient(180deg,rgba(116,209,177,0.14),rgba(255,255,255,0.03))] shadow-[0_0_0_1px_rgba(116,209,177,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]';
  }
}

function getAssignmentRailClassName(tone: AssignmentVisualTone): string {
  switch (tone) {
    case 'editable':
      return 'bg-[rgba(142,162,255,0.9)]';
    case 'fixed':
      return 'bg-white/16';
    case 'started':
      return 'bg-[rgba(255,184,107,0.9)]';
    case 'completed':
      return 'bg-[rgba(116,209,177,0.58)]';
    case 'result_ready':
      return 'bg-[rgba(116,209,177,0.92)]';
  }
}

function getAssignmentTonePillClassName(tone: AssignmentVisualTone): string {
  switch (tone) {
    case 'editable':
      return 'border-[rgba(142,162,255,0.24)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]';
    case 'fixed':
      return 'border-white/12 bg-black/10 text-white/62';
    case 'started':
      return 'border-[rgba(255,184,107,0.2)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]';
    case 'completed':
      return 'border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.09)] text-[rgba(214,246,233,0.82)]';
    case 'result_ready':
      return 'border-[rgba(116,209,177,0.24)] bg-[rgba(116,209,177,0.14)] text-[rgba(214,246,233,0.9)]';
  }
}

function getActionPanelClassName(tone: AssignmentVisualTone, canRemove: boolean): string {
  if (tone === 'editable' && canRemove) {
    return 'border-[rgba(142,162,255,0.18)] bg-[rgba(142,162,255,0.08)]';
  }

  if (tone === 'result_ready' || tone === 'completed') {
    return 'border-[rgba(116,209,177,0.14)] bg-[rgba(116,209,177,0.06)]';
  }

  if (tone === 'started') {
    return 'border-[rgba(255,184,107,0.14)] bg-[rgba(255,184,107,0.06)]';
  }

  return 'border-white/10 bg-black/10';
}

function ReorderForm({
  userId,
  assignmentId,
  direction,
  disabled,
}: Readonly<{
  userId: string;
  assignmentId: string;
  direction: 'up' | 'down';
  disabled: boolean;
}>) {
  const [state, formAction] = useActionState(
    reorderAdminUserAssignmentAction,
    initialAdminAssignmentMutationState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input name="userId" type="hidden" value={userId} />
      <input name="assignmentId" type="hidden" value={assignmentId} />
      <PendingButton
        disabled={disabled}
        idleLabel={direction === 'up' ? 'Move earlier' : 'Move later'}
        name="direction"
        pendingLabel={direction === 'up' ? 'Moving...' : 'Moving...'}
        tone="neutral"
        value={direction}
      />
      {state.formError ? <AdminFeedbackNotice tone="danger">{state.formError}</AdminFeedbackNotice> : null}
    </form>
  );
}

function RemoveForm({
  userId,
  assignmentId,
  disabled,
}: Readonly<{
  userId: string;
  assignmentId: string;
  disabled: boolean;
}>) {
  const [state, formAction] = useActionState(
    removeAdminUserAssignmentAction,
    initialAdminAssignmentMutationState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input name="userId" type="hidden" value={userId} />
      <input name="assignmentId" type="hidden" value={assignmentId} />
      <PendingButton disabled={disabled} idleLabel="Remove" pendingLabel="Removing..." tone="danger" />
      {state.formError ? <AdminFeedbackNotice tone="danger">{state.formError}</AdminFeedbackNotice> : null}
    </form>
  );
}

export function AdminUserAssignmentControls({
  userId,
  controls,
  mutationFeedbackKey,
}: Readonly<{
  userId: string;
  controls: AdminUserDetailControlsViewModel;
  mutationFeedbackKey: string | null;
}>) {
  const [createState, createAction] = useActionState(
    createAdminUserAssignmentAction,
    initialAdminAssignmentCreateFormState,
  );
  const [selectedAssessmentVersionId, setSelectedAssessmentVersionId] = useState(
    createState.values.assessmentVersionId ||
      controls.assignmentOptions[0]?.assessmentVersionId ||
      emptyAdminAssignmentCreateValues.assessmentVersionId,
  );
  const [selectedTargetOrderIndex, setSelectedTargetOrderIndex] = useState(
    createState.values.targetOrderIndex ||
      controls.insertPositionOptions[0]?.value ||
      emptyAdminAssignmentCreateValues.targetOrderIndex,
  );
  const selectedAssessmentOption =
    controls.assignmentOptions.find((option) => option.assessmentVersionId === selectedAssessmentVersionId) ??
    controls.assignmentOptions[0] ??
    null;
  const mutationFeedbackMessage = getMutationFeedbackMessage(mutationFeedbackKey);

  const safeValues = {
    userId,
    assessmentId: selectedAssessmentOption?.assessmentId ?? emptyAdminAssignmentCreateValues.assessmentId,
    assessmentVersionId: selectedAssessmentVersionId,
    targetOrderIndex: selectedTargetOrderIndex,
  };

  return (
    <div className="space-y-4">
      {mutationFeedbackMessage ? (
        <AdminFeedbackNotice tone="success">{mutationFeedbackMessage}</AdminFeedbackNotice>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.9fr)]">
        <AdminFeedbackNotice tone="neutral">{controls.ruleSummary}</AdminFeedbackNotice>
        <AdminFeedbackNotice tone="neutral">{controls.editableSummary}</AdminFeedbackNotice>
      </div>

      <SurfaceCard className="p-5">
        <form action={createAction} className="space-y-4">
          <input name="userId" type="hidden" value={userId} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.7fr)_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white" htmlFor="assignment-version">
                Add assignment
              </label>
              <select
                className="sonartra-focus-ring min-h-12 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
                disabled={controls.assignmentOptions.length === 0}
                id="assignment-version"
                name="assessmentVersionId"
                onChange={(event) => setSelectedAssessmentVersionId(event.currentTarget.value)}
                value={safeValues.assessmentVersionId}
              >
                {controls.assignmentOptions.map((option) => (
                  <option key={option.assessmentVersionId} value={option.assessmentVersionId}>
                    {option.optionLabel}
                  </option>
                ))}
              </select>
              <input name="assessmentId" type="hidden" value={safeValues.assessmentId} />
              <p className="text-sm leading-6 text-white/54">
                Choose from published assessment versions that are not already assigned to this user.
              </p>
              {createState.fieldErrors.assessmentId || createState.fieldErrors.assessmentVersionId ? (
                <AdminFeedbackNotice tone="danger">
                  {createState.fieldErrors.assessmentId ?? createState.fieldErrors.assessmentVersionId}
                </AdminFeedbackNotice>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white" htmlFor="assignment-position">
                Sequence position
              </label>
              <select
                className="sonartra-focus-ring min-h-12 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
                id="assignment-position"
                name="targetOrderIndex"
                onChange={(event) => setSelectedTargetOrderIndex(event.currentTarget.value)}
                value={safeValues.targetOrderIndex}
              >
                {controls.insertPositionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-sm leading-6 text-white/54">
                {controls.insertPositionOptions.find((option) => option.value === safeValues.targetOrderIndex)?.hint ??
                  'Select where the new assignment should enter the editable queue.'}
              </p>
              {createState.fieldErrors.targetOrderIndex ? (
                <AdminFeedbackNotice tone="danger">{createState.fieldErrors.targetOrderIndex}</AdminFeedbackNotice>
              ) : null}
            </div>

            <div className="flex items-end">
              <PendingButton
                disabled={controls.assignmentOptions.length === 0}
                idleLabel="Assign"
                pendingLabel="Assigning..."
              />
            </div>
          </div>

          <div className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3 text-sm leading-6 text-white/58">
            New rows enter only inside the editable suffix. Fixed historical rows stay in place so attempt and result history remains canonical.
          </div>

          {controls.addDisabledReason ? (
            <AdminFeedbackNotice tone="warning">{controls.addDisabledReason}</AdminFeedbackNotice>
          ) : null}
          {createState.formError ? <AdminFeedbackNotice tone="danger">{createState.formError}</AdminFeedbackNotice> : null}
        </form>
      </SurfaceCard>

      <div className="space-y-3">
        {controls.assignments.length === 0 ? (
          <SurfaceCard dashed muted className="p-5">
            <p className="text-sm leading-7 text-white/62">
              No assignments exist yet. Add the first published assessment to establish the deterministic sequence.
            </p>
          </SurfaceCard>
        ) : (
          controls.assignments.map((assignment) => {
            const tone = getAssignmentVisualTone(assignment);

            return (
              <SurfaceCard
                className={cn('overflow-hidden p-0', getAssignmentRowClassName(tone))}
                key={assignment.id}
              >
                <article
                  className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]"
                  data-assignment-row="true"
                  data-assignment-removal={assignment.canRemove ? 'safe' : 'blocked'}
                  data-assignment-state={tone}
                  data-assignment-status={assignment.status}
                >
                  <div className="flex min-w-0 gap-4 px-4 py-4 sm:px-5">
                    <div
                      className={cn(
                        'hidden w-1 self-stretch rounded-full sm:block',
                        getAssignmentRailClassName(tone),
                      )}
                    />

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex min-h-10 items-center rounded-full border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-medium text-white">
                          {assignment.orderLabel}
                        </span>
                        <LabelPill className="border-white/12 bg-white/[0.06] text-white/74">
                          {assignment.statusLabel}
                        </LabelPill>
                        <LabelPill className={getAssignmentTonePillClassName(tone)}>
                          {getAssignmentVisualToneLabel(tone)}
                        </LabelPill>
                        <LabelPill className="border-white/12 bg-black/10 text-white/68">
                          {assignment.eligibilityLabel}
                        </LabelPill>
                        <LabelPill
                          className={cn(
                            'border-white/12 bg-black/10 text-white/62',
                            assignment.canRemove &&
                              'border-[rgba(142,162,255,0.18)] bg-[rgba(142,162,255,0.1)] text-[rgba(228,234,255,0.82)]',
                          )}
                        >
                          {assignment.canRemove ? 'Safe removal' : 'Removal locked'}
                        </LabelPill>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <h3 className="text-base font-semibold tracking-[-0.02em] text-white">
                            {assignment.assessmentLabel}
                          </h3>
                          {assignment.resultHref ? (
                            <Link
                              className="rounded-full border border-[rgba(116,209,177,0.24)] bg-[rgba(116,209,177,0.14)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[rgba(214,246,233,0.88)] transition hover:border-[rgba(116,209,177,0.34)]"
                              href={assignment.resultHref}
                            >
                              Canonical result ready
                            </Link>
                          ) : null}
                        </div>
                        <p className="text-sm text-white/56">
                          Current sequence position {assignment.orderIndex + 1}.
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm leading-6 text-white/56 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                        <p data-assignment-guidance="true">
                          {assignment.blockedReason ? (
                            assignment.blockedReason
                          ) : (
                            'This untouched assignment remains in the editable suffix and can be moved or removed safely.'
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2" data-assignment-signals="true">
                          <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/52">
                            {assignment.executionStateLabel}
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/52">
                            {assignment.attemptStateLabel}
                          </span>
                          <span
                            className={cn(
                              'rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]',
                              assignment.resultHref
                                ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.11)] text-[rgba(214,246,233,0.84)]'
                                : 'border-white/10 bg-black/10 text-white/52',
                            )}
                          >
                            {assignment.resultStateLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'border-t border-white/8 px-4 py-4 sm:px-5 lg:border-l lg:border-t-0',
                      getActionPanelClassName(tone, assignment.canRemove),
                    )}
                    data-assignment-actions={assignment.canRemove ? 'safe-removal' : 'locked-removal'}
                  >
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-[0.72rem] uppercase tracking-[0.16em] text-white/40">
                          Action state
                        </p>
                        <p className="text-sm text-white/68">
                          {assignment.canRemove
                            ? 'This queued row is still in play.'
                            : 'This row now reads as part of the fixed record.'}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <ReorderForm
                          assignmentId={assignment.id}
                          direction="up"
                          disabled={!assignment.canMoveEarlier}
                          userId={userId}
                        />
                        <ReorderForm
                          assignmentId={assignment.id}
                          direction="down"
                          disabled={!assignment.canMoveLater}
                          userId={userId}
                        />
                        <RemoveForm assignmentId={assignment.id} disabled={!assignment.canRemove} userId={userId} />
                      </div>
                    </div>
                  </div>
                </article>
              </SurfaceCard>
            );
          })
        )}
      </div>
    </div>
  );
}
