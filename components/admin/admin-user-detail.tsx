import Link from 'next/link';

import { AdminUserAssignmentControls } from '@/components/admin/admin-user-assignment-controls';
import {
  ButtonLink,
  EmptyState,
  LabelPill,
  MetaItem,
  PageFrame,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import type {
  AdminUserDetailAssignmentViewModel,
  AdminUserDetailViewModel,
} from '@/lib/server/admin-user-detail';

function getUserStatusPillClass(status: AdminUserDetailViewModel['userStatus']): string {
  switch (status) {
    case 'active':
      return 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]';
    case 'invited':
      return 'border-[rgba(142,162,255,0.25)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]';
    case 'disabled':
      return 'border-[rgba(255,132,132,0.24)] bg-[rgba(255,132,132,0.1)] text-[rgba(255,225,225,0.88)]';
  }
}

function getRolePillClass(role: AdminUserDetailViewModel['role']): string {
  switch (role) {
    case 'admin':
      return 'border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]';
    case 'user':
      return 'border-white/10 bg-white/[0.045] text-white/68';
  }
}

function getAssignmentStatusPillClass(status: AdminUserDetailAssignmentViewModel['status']): string {
  switch (status) {
    case 'completed':
      return 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]';
    case 'in_progress':
      return 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]';
    case 'assigned':
      return 'border-[rgba(142,162,255,0.25)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]';
    case 'not_assigned':
      return 'border-white/10 bg-white/[0.045] text-white/68';
  }
}

type TimelineAssignmentTone = 'queued' | 'started' | 'completed' | 'result_ready';

function getTimelineAssignmentTone(
  assignment: AdminUserDetailAssignmentViewModel,
): TimelineAssignmentTone {
  if (assignment.resultHref) {
    return 'result_ready';
  }

  if (assignment.status === 'completed') {
    return 'completed';
  }

  if (assignment.status === 'in_progress') {
    return 'started';
  }

  return 'queued';
}

function getTimelineAssignmentFrameClassName(tone: TimelineAssignmentTone): string {
  switch (tone) {
    case 'queued':
      return 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]';
    case 'started':
      return 'border-[rgba(255,184,107,0.18)] bg-[linear-gradient(180deg,rgba(255,184,107,0.08),rgba(255,255,255,0.03))]';
    case 'completed':
      return 'border-[rgba(116,209,177,0.16)] bg-[linear-gradient(180deg,rgba(116,209,177,0.07),rgba(255,255,255,0.02))]';
    case 'result_ready':
      return 'border-[rgba(116,209,177,0.24)] bg-[linear-gradient(180deg,rgba(116,209,177,0.12),rgba(255,255,255,0.03))] shadow-[0_0_0_1px_rgba(116,209,177,0.06)]';
  }
}

function getTimelineAssignmentRailClassName(tone: TimelineAssignmentTone): string {
  switch (tone) {
    case 'queued':
      return 'bg-[rgba(142,162,255,0.88)]';
    case 'started':
      return 'bg-[rgba(255,184,107,0.9)]';
    case 'completed':
      return 'bg-[rgba(116,209,177,0.58)]';
    case 'result_ready':
      return 'bg-[rgba(116,209,177,0.92)]';
  }
}

function getTimelineAssignmentToneLabel(tone: TimelineAssignmentTone): string {
  switch (tone) {
    case 'queued':
      return 'Queued';
    case 'started':
      return 'Started';
    case 'completed':
      return 'Completed';
    case 'result_ready':
      return 'Result ready';
  }
}

function TimelineDate({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
      <p className="text-[0.72rem] uppercase tracking-[0.16em] text-white/38">{label}</p>
      <p className="pt-2 text-sm text-white/68">{value ?? 'Not available'}</p>
    </div>
  );
}

function AssignmentTimeline({
  assignments,
}: {
  assignments: readonly AdminUserDetailAssignmentViewModel[];
}) {
  if (assignments.length === 0) {
    return (
      <EmptyState
        title="No assignments yet"
        description="This user has resolved into the internal registry but no assessment sequence has been assigned."
      />
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => {
        const tone = getTimelineAssignmentTone(assignment);

        return (
          <SurfaceCard
            className={cn('overflow-hidden p-0', getTimelineAssignmentFrameClassName(tone))}
            key={assignment.id}
          >
            <article
              className="overflow-hidden"
              data-assignment-timeline-row="true"
              data-assignment-timeline-state={tone}
              data-assignment-timeline-status={assignment.status}
            >
              <div className="flex gap-4 border-b border-white/8 bg-white/[0.03] px-5 py-4">
                <div
                  className={cn(
                    'hidden w-1 rounded-full sm:block',
                    getTimelineAssignmentRailClassName(tone),
                  )}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex min-h-10 items-center rounded-full border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-medium text-white">
                          {assignment.orderLabel}
                        </span>
                        <LabelPill className={getAssignmentStatusPillClass(assignment.status)}>
                          {assignment.statusLabel}
                        </LabelPill>
                        <LabelPill
                          className={cn(
                            'border-white/12 bg-black/10 text-white/62',
                            tone === 'result_ready' &&
                              'border-[rgba(116,209,177,0.24)] bg-[rgba(116,209,177,0.14)] text-[rgba(214,246,233,0.88)]',
                            tone === 'started' &&
                              'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.88)]',
                          )}
                        >
                          {getTimelineAssignmentToneLabel(tone)}
                        </LabelPill>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">
                          {assignment.assessmentLabel}
                        </h3>
                        <p className="text-sm text-white/56">
                          Deterministic sequence position {assignment.orderIndex + 1}.
                        </p>
                      </div>
                    </div>

                    {assignment.resultHref ? (
                      <div
                        className="flex flex-col items-start gap-2"
                        data-assignment-timeline-result="ready"
                      >
                        <p className="text-[0.72rem] uppercase tracking-[0.16em] text-[rgba(214,246,233,0.62)]">
                          Canonical result
                        </p>
                        <ButtonLink className="self-start" href={assignment.resultHref}>
                          View result
                        </ButtonLink>
                      </div>
                    ) : (
                      <p className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/46">
                        No canonical result yet
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <TimelineDate label="Assigned" value={assignment.assignedAtLabel} />
                <TimelineDate label="Started" value={assignment.startedAtLabel} />
                <TimelineDate label="Completed" value={assignment.completedAtLabel} />
              </div>
            </article>
          </SurfaceCard>
        );
      })}
    </div>
  );
}

export function AdminUserDetail({
  viewModel,
  mutationFeedbackKey,
}: {
  viewModel: AdminUserDetailViewModel;
  mutationFeedbackKey: string | null;
}) {
  const showsSecondaryEmail =
    viewModel.name.localeCompare(viewModel.email, 'en', { sensitivity: 'base' }) !== 0;
  const identityMeta = [
    viewModel.organisationName
      ? { label: 'Organisation', value: viewModel.organisationName }
      : null,
    { label: 'Joined', value: viewModel.createdAtDisplay },
  ].filter((item): item is { label: string; value: string } => item !== null);

  return (
    <PageFrame className="min-w-0 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <ButtonLink href="/admin/users">Back to users</ButtonLink>
      </div>

      <SurfaceCard accent className="overflow-hidden p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill className={getUserStatusPillClass(viewModel.userStatus)}>
                {viewModel.userStatusLabel}
              </LabelPill>
              <LabelPill className={getRolePillClass(viewModel.role)}>{viewModel.roleLabel}</LabelPill>
            </div>

            <div className="min-w-0 space-y-2">
              <h1 className="max-w-full text-[clamp(1.8rem,4vw,2.35rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white [overflow-wrap:anywhere]">
                {viewModel.name}
              </h1>
              {showsSecondaryEmail ? (
                <p className="text-sm leading-7 text-white/66 [overflow-wrap:anywhere]">{viewModel.email}</p>
              ) : null}
              <p className="max-w-2xl text-sm leading-7 text-white/72">
                Internal user record for assignment sequencing and result access.
              </p>
            </div>
          </div>

          <div className="w-full max-w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/62 xl:w-auto xl:max-w-[19rem] xl:shrink-0">
            {viewModel.currentStateLabel}
          </div>
        </div>

        <div className="grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-2">
          {identityMeta.map((item) => (
            <MetaItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </SurfaceCard>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Controls"
          title="Assignment controls"
          description="Add, reorder, or remove only the assignment records that remain safely outside historical execution."
        />

        <AdminUserAssignmentControls
          controls={viewModel.controls}
          mutationFeedbackKey={mutationFeedbackKey}
          userId={viewModel.id}
        />
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="State"
          title="Current and next state"
          description="Derived from the canonical assignment order without mutable shortcuts."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <SurfaceCard className="p-5">
            <p className="text-[0.72rem] uppercase tracking-[0.16em] text-white/38">Current assessment</p>
            <p className="pt-3 text-lg font-semibold tracking-[-0.02em] text-white">
              {viewModel.currentAssessmentLabel ?? 'No assignment yet'}
            </p>
          </SurfaceCard>
          <SurfaceCard className="p-5">
            <p className="text-[0.72rem] uppercase tracking-[0.16em] text-white/38">Next assessment</p>
            <p className="pt-3 text-lg font-semibold tracking-[-0.02em] text-white">
              {viewModel.nextAssessmentLabel ?? 'None queued'}
            </p>
          </SurfaceCard>
          <SurfaceCard className="p-5">
            <p className="text-[0.72rem] uppercase tracking-[0.16em] text-white/38">Last activity</p>
            <p className="pt-3 text-lg font-semibold tracking-[-0.02em] text-white">
              {viewModel.lastActivityLabel}
            </p>
          </SurfaceCard>
        </div>
      </section>

      <section className="sonartra-section">
        <SectionHeader
          eyebrow="Timeline"
          title="Assessment timeline"
          description="Assignments in ascending order_index with canonical attempt and result linkage."
        />

        <AssignmentTimeline assignments={viewModel.assignments} />
      </section>
    </PageFrame>
  );
}
