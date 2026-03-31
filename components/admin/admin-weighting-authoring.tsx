'use client';

import { useState } from 'react';

import {
  EmptyState,
  LabelPill,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import type {
  AdminAssessmentDetailAvailableSignal,
  AdminAssessmentDetailQuestion,
  AdminAssessmentDetailWeightingSummary,
} from '@/lib/server/admin-assessment-detail';

import { AdminBulkWeightImport } from '@/components/admin/admin-bulk-weight-import';
import { AdminWeightGrid, buildAdminWeightGridModel } from '@/components/admin/admin-weight-grid';

function SummaryCard({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <SurfaceCard className="p-4">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</p>
    </SurfaceCard>
  );
}

function QuestionSelect({
  questions,
  selectedQuestionId,
  onChange,
}: Readonly<{
  questions: readonly AdminAssessmentDetailQuestion[];
  selectedQuestionId: string;
  onChange: (questionId: string) => void;
}>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">Question</span>
      <select
        aria-label="Select question for weighting grid"
        className={cn(
          'sonartra-focus-ring min-h-11 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white',
          'hover:border-white/14 focus:border-[rgba(142,162,255,0.36)]',
        )}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={selectedQuestionId}
      >
        {questions.map((question) => (
          <option key={question.questionId} value={question.questionId}>
            Question {question.orderIndex + 1}: {question.prompt}
          </option>
        ))}
      </select>
    </label>
  );
}

function QuestionMeta({
  question,
  availableSignals,
}: Readonly<{
  question: AdminAssessmentDetailQuestion;
  availableSignals: readonly AdminAssessmentDetailAvailableSignal[];
}>) {
  const model = buildAdminWeightGridModel(question, availableSignals);
  const mappedCells = model.rows.reduce(
    (sum, row) => sum + row.cells.filter((cell) => cell.mapping !== null).length,
    0,
  );

  return (
    <SurfaceCard className="p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{question.questionKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            Question {question.orderIndex + 1}
          </LabelPill>
          <LabelPill className="border-[rgba(142,162,255,0.22)] bg-[rgba(142,162,255,0.12)] text-[rgba(228,234,255,0.9)]">
            {question.domainLabel}
          </LabelPill>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{question.prompt}</h3>
          <p className="text-sm leading-7 text-white/58">
            Enter weights directly in the grid. Changes save when a cell loses focus.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-white/62">
          <span>{question.options.length} options</span>
          <span>{availableSignals.length} signals</span>
          <span>{mappedCells} mapped cells</span>
        </div>
      </div>
    </SurfaceCard>
  );
}

export function AdminWeightingAuthoring({
  assessmentKey,
  assessmentVersionId,
  isEditableAssessmentVersion,
  questions,
  availableSignals,
  weightingSummary,
}: {
  assessmentKey: string;
  assessmentVersionId: string;
  isEditableAssessmentVersion: boolean;
  questions: readonly AdminAssessmentDetailQuestion[];
  availableSignals: readonly AdminAssessmentDetailAvailableSignal[];
  weightingSummary: AdminAssessmentDetailWeightingSummary;
}) {
  const optionsCount = questions.reduce((sum, question) => sum + question.options.length, 0);
  const initialQuestionId = questions[0]?.questionId ?? '';
  const [selectedQuestionId, setSelectedQuestionId] = useState(initialQuestionId);

  const selectedQuestion =
    questions.find((question) => question.questionId === selectedQuestionId) ?? questions[0] ?? null;

  return (
    <section className="sonartra-section">
      <SectionHeader
        eyebrow="Response scoring"
        title="Set response scoring"
        description="Edit option-to-signal weights in a compact grid without changing scoring logic."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Signals" value={String(availableSignals.length)} />
        <SummaryCard label="Options" value={String(weightingSummary.totalOptions)} />
        <SummaryCard label="Scored responses" value={String(weightingSummary.weightedOptions)} />
        <SummaryCard label="Unscored responses" value={String(weightingSummary.unmappedOptions)} />
      </div>

      <AdminBulkWeightImport
        assessmentVersionId={assessmentVersionId}
        isEditableAssessmentVersion={isEditableAssessmentVersion}
      />

      {questions.length === 0 ? (
        <EmptyState
          description="Add questions and response options before setting scoring."
          title="No questions yet"
        />
      ) : optionsCount === 0 ? (
        <EmptyState
          description="Add options before setting scoring."
          title="Add options"
        />
      ) : availableSignals.length === 0 ? (
        <EmptyState
          description="Add signals before setting scoring."
          title="No signals yet"
        />
      ) : selectedQuestion ? (
        <div className="space-y-4">
          <SurfaceCard className="p-5">
            <QuestionSelect
              onChange={setSelectedQuestionId}
              questions={questions}
              selectedQuestionId={selectedQuestion.questionId}
            />
          </SurfaceCard>

          <QuestionMeta availableSignals={availableSignals} question={selectedQuestion} />

          <AdminWeightGrid
            assessmentKey={assessmentKey}
            assessmentVersionId={assessmentVersionId}
            availableSignals={availableSignals}
            question={selectedQuestion}
          />
        </div>
      ) : null}
    </section>
  );
}
