'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { SurfaceCard, cn } from '@/components/shared/user-app-ui';
import { useSingleDomainDirtyField } from '@/components/admin/single-domain-unsaved-changes';
import {
  initialAdminWeightingAuthoringFormState,
  validateAdminWeightingAuthoringValues,
} from '@/lib/admin/admin-weighting-authoring';
import type {
  AdminAssessmentDetailAvailableSignal,
  AdminAssessmentDetailQuestion,
  AdminAssessmentDetailSignalWeight,
} from '@/lib/server/admin-assessment-detail';
import {
  createSingleDomainWeightAction,
  deleteSingleDomainWeightAction,
  updateSingleDomainWeightAction,
} from '@/lib/server/admin-single-domain-structural-authoring';

export type SingleDomainWeightGridModel = {
  questionId: string;
  columns: readonly SingleDomainWeightGridColumn[];
  rows: readonly SingleDomainWeightGridRow[];
};

export type SingleDomainWeightGridColumn = {
  signalId: string;
  signalKey: string;
  signalLabel: string;
  domainLabel: string;
  domainOrderIndex: number;
  signalOrderIndex: number;
};

export type SingleDomainWeightGridCell = {
  optionId: string;
  signalId: string;
  value: string;
  mapping: AdminAssessmentDetailSignalWeight | null;
};

export type SingleDomainWeightGridRow = {
  optionId: string;
  optionKey: string;
  optionLabel: string;
  optionText: string;
  orderIndex: number;
  cells: readonly SingleDomainWeightGridCell[];
};

type SingleDomainWeightGridSaveMode = 'create' | 'update' | 'delete' | 'noop';

function getOptionDisplayLabel(
  option: AdminAssessmentDetailQuestion['options'][number],
): string {
  return option.optionLabel?.trim() || String.fromCharCode(65 + option.orderIndex);
}

function buildCellKey(rowIndex: number, columnIndex: number): string {
  return `${rowIndex}:${columnIndex}`;
}

function collectWeightActionError(result: {
  formError: string | null;
  fieldErrors: {
    signalId?: string;
    weight?: string;
  };
}): string | null {
  return result.fieldErrors.weight ?? result.fieldErrors.signalId ?? result.formError;
}

function resolveSaveMode(params: {
  currentValue: string;
  nextValue: string;
  mapping: AdminAssessmentDetailSignalWeight | null;
}): SingleDomainWeightGridSaveMode {
  const trimmedCurrent = params.currentValue.trim();
  const trimmedNext = params.nextValue.trim();

  if (trimmedNext === trimmedCurrent) {
    return 'noop';
  }

  if (!trimmedNext) {
    return params.mapping ? 'delete' : 'noop';
  }

  return params.mapping ? 'update' : 'create';
}

export function buildSingleDomainWeightGridModel(
  question: AdminAssessmentDetailQuestion,
  availableSignals: readonly AdminAssessmentDetailAvailableSignal[],
): SingleDomainWeightGridModel {
  const columns = Object.freeze(
    availableSignals.map((signal) => ({
      signalId: signal.signalId,
      signalKey: signal.signalKey,
      signalLabel: signal.signalLabel,
      domainLabel: signal.domainLabel,
      domainOrderIndex: signal.domainOrderIndex,
      signalOrderIndex: signal.signalOrderIndex,
    })),
  );

  const rows = Object.freeze(
    question.options.map((option) => {
      const mappingsBySignalId = new Map<string, AdminAssessmentDetailSignalWeight>();

      for (const mapping of option.signalWeights) {
        mappingsBySignalId.set(mapping.signalId, mapping);
      }

      return {
        optionId: option.optionId,
        optionKey: option.optionKey,
        optionLabel: getOptionDisplayLabel(option),
        optionText: option.optionText,
        orderIndex: option.orderIndex,
        cells: Object.freeze(
          columns.map((column) => {
            const mapping = mappingsBySignalId.get(column.signalId) ?? null;

            return {
              optionId: option.optionId,
              signalId: column.signalId,
              value: mapping?.weight ?? '',
              mapping,
            };
          }),
        ),
      } satisfies SingleDomainWeightGridRow;
    }),
  );

  return {
    questionId: question.questionId,
    columns,
    rows,
  };
}

function WeightGridCell({
  assessmentKey,
  assessmentVersionId,
  optionId,
  signalId,
  mapping,
  rowIndex,
  columnIndex,
  registerInput,
  onArrowNavigate,
}: Readonly<{
  assessmentKey: string;
  assessmentVersionId: string;
  optionId: string;
  signalId: string;
  mapping: AdminAssessmentDetailSignalWeight | null;
  rowIndex: number;
  columnIndex: number;
  registerInput: (rowIndex: number, columnIndex: number, input: HTMLInputElement | null) => void;
  onArrowNavigate: (rowIndex: number, columnIndex: number, direction: 'up' | 'down' | 'left' | 'right') => void;
}>) {
  const router = useRouter();
  const [draftValue, setDraftValue] = useState(mapping?.weight ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setDirty = useSingleDomainDirtyField();

  useEffect(() => {
    setDirty(draftValue.trim() !== (mapping?.weight ?? '').trim());
  }, [draftValue, mapping, setDirty]);

  useEffect(() => {
    registerInput(rowIndex, columnIndex, inputRef.current);

    return () => {
      registerInput(rowIndex, columnIndex, null);
    };
  }, [columnIndex, registerInput, rowIndex]);

  function submit(nextRawValue: string) {
    if (isPending) {
      return;
    }

    const currentValue = mapping?.weight ?? '';
    const nextValue = nextRawValue.trim();
    const saveMode = resolveSaveMode({
      currentValue,
      nextValue,
      mapping,
    });

    if (saveMode === 'noop') {
      setDraftValue(nextValue);
      setError(null);
      setDirty(false);
      return;
    }

    if (saveMode !== 'delete') {
      const validation = validateAdminWeightingAuthoringValues({
        signalId,
        weight: nextValue,
      });
      const validationError = collectWeightActionError(validation);

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setError(null);

    startTransition(async () => {
      let result = initialAdminWeightingAuthoringFormState;

      if (saveMode === 'create') {
        const formData = new FormData();
        formData.set('signalId', signalId);
        formData.set('weight', nextValue);
        result = await createSingleDomainWeightAction(
          {
            assessmentKey,
            assessmentVersionId,
            optionId,
          },
          initialAdminWeightingAuthoringFormState,
          formData,
        );
      }

      if (saveMode === 'update' && mapping) {
        const formData = new FormData();
        formData.set('signalId', signalId);
        formData.set('weight', nextValue);
        result = await updateSingleDomainWeightAction(
          {
            assessmentKey,
            assessmentVersionId,
            optionId,
            optionSignalWeightId: mapping.optionSignalWeightId,
          },
          initialAdminWeightingAuthoringFormState,
          formData,
        );
      }

      if (saveMode === 'delete' && mapping) {
        result = await deleteSingleDomainWeightAction(
          {
            assessmentKey,
            assessmentVersionId,
            optionId,
            optionSignalWeightId: mapping.optionSignalWeightId,
          },
          initialAdminWeightingAuthoringFormState,
          new FormData(),
        );
      }

      const actionError = collectWeightActionError(result);

      if (actionError) {
        setDraftValue(currentValue);
        setError(actionError);
        setDirty(false);
        return;
      }

      setDraftValue(nextValue);
      setDirty(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <input
        aria-invalid={error ? true : undefined}
        aria-label={`Weight row ${rowIndex + 1} column ${columnIndex + 1}`}
        className={cn(
          'sonartra-focus-ring h-10 w-full min-w-[88px] rounded-[0.85rem] border bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/28',
          error
            ? 'border-[rgba(255,157,157,0.32)]'
            : 'border-white/10 hover:border-white/16 focus:border-[rgba(142,162,255,0.36)]',
          isPending ? 'cursor-wait text-white/58' : '',
        )}
        onBlur={(event) => submit(event.currentTarget.value)}
        onChange={(event) => {
          setDraftValue(event.currentTarget.value);
          if (error) {
            setError(null);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit(draftValue);
            inputRef.current?.blur();
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            onArrowNavigate(rowIndex, columnIndex, 'up');
            return;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            onArrowNavigate(rowIndex, columnIndex, 'down');
            return;
          }

          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            onArrowNavigate(rowIndex, columnIndex, 'left');
            return;
          }

          if (event.key === 'ArrowRight') {
            event.preventDefault();
            onArrowNavigate(rowIndex, columnIndex, 'right');
          }
        }}
        placeholder="0"
        ref={(node) => {
          inputRef.current = node;
        }}
        type="text"
        value={draftValue}
      />
      {error ? <p className="text-xs text-[rgba(255,198,198,0.92)]">{error}</p> : null}
    </div>
  );
}

export function SingleDomainWeightGrid({
  assessmentKey,
  assessmentVersionId,
  question,
  availableSignals,
}: Readonly<{
  assessmentKey: string;
  assessmentVersionId: string;
  question: AdminAssessmentDetailQuestion;
  availableSignals: readonly AdminAssessmentDetailAvailableSignal[];
}>) {
  const model = buildSingleDomainWeightGridModel(question, availableSignals);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());

  function registerInput(rowIndex: number, columnIndex: number, input: HTMLInputElement | null) {
    const key = buildCellKey(rowIndex, columnIndex);

    if (input) {
      inputRefs.current.set(key, input);
      return;
    }

    inputRefs.current.delete(key);
  }

  function onArrowNavigate(
    rowIndex: number,
    columnIndex: number,
    direction: 'up' | 'down' | 'left' | 'right',
  ) {
    const targetRowIndex =
      direction === 'up'
        ? rowIndex - 1
        : direction === 'down'
          ? rowIndex + 1
          : rowIndex;
    const targetColumnIndex =
      direction === 'left'
        ? columnIndex - 1
        : direction === 'right'
          ? columnIndex + 1
          : columnIndex;

    if (
      targetRowIndex < 0 ||
      targetColumnIndex < 0 ||
      targetRowIndex >= model.rows.length ||
      targetColumnIndex >= model.columns.length
    ) {
      return;
    }

    const target = inputRefs.current.get(buildCellKey(targetRowIndex, targetColumnIndex));
    target?.focus();
    target?.select();
  }

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-[280px] border-b border-white/10 bg-[rgba(8,11,20,0.98)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-white/52">
                Response option
              </th>
              {model.columns.map((column) => (
                <th
                  className="sticky top-0 z-10 min-w-[120px] border-b border-l border-white/10 bg-[rgba(8,11,20,0.98)] px-3 py-3 text-left"
                  key={column.signalId}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                      {column.domainLabel}
                    </p>
                    <p className="text-sm font-medium text-white">{column.signalLabel}</p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row, rowIndex) => (
              <tr key={row.optionId}>
                <th className="sticky left-0 z-10 border-b border-white/10 bg-[rgba(8,11,20,0.96)] px-4 py-4 text-left align-top">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex min-h-7 items-center rounded-full border border-[rgba(142,162,255,0.22)] bg-[rgba(142,162,255,0.12)] px-3 text-xs font-medium uppercase tracking-[0.14em] text-[rgba(228,234,255,0.9)]">
                        {row.optionLabel}
                      </span>
                      <span className="text-xs uppercase tracking-[0.14em] text-white/38">
                        {row.optionKey}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-white/78">{row.optionText}</p>
                  </div>
                </th>
                {row.cells.map((cell, columnIndex) => (
                  <td
                    className="border-b border-l border-white/10 px-3 py-3 align-top"
                    key={`${row.optionId}:${cell.signalId}`}
                  >
                    <WeightGridCell
                      assessmentKey={assessmentKey}
                      assessmentVersionId={assessmentVersionId}
                      columnIndex={columnIndex}
                      key={`${row.optionId}:${cell.signalId}:${cell.mapping?.optionSignalWeightId ?? 'empty'}:${cell.value}`}
                      mapping={cell.mapping}
                      onArrowNavigate={onArrowNavigate}
                      optionId={row.optionId}
                      registerInput={registerInput}
                      rowIndex={rowIndex}
                      signalId={cell.signalId}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}
