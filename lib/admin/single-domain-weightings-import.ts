import { parseBulkWeightValue } from '@/lib/admin/bulk-weight-import';

export const SINGLE_DOMAIN_WEIGHTING_OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export type SingleDomainWeightingsImportValues = {
  weightingLines: string;
};

export type SingleDomainWeightingsImportState = {
  formError: string | null;
  fieldErrors: {
    weightingLines?: string;
  };
  values: SingleDomainWeightingsImportValues;
  updatedOptionGroupCount?: number;
  updatedWeightCount?: number;
};

export type ParsedSingleDomainWeightingImportRow = {
  lineNumber: number;
  questionOrder: number;
  optionLabel: (typeof SINGLE_DOMAIN_WEIGHTING_OPTION_LABELS)[number];
  signalKey: string;
  weight: number;
};

export const emptySingleDomainWeightingsImportValues: SingleDomainWeightingsImportValues = {
  weightingLines: '',
};

export const initialSingleDomainWeightingsImportState: SingleDomainWeightingsImportState = {
  formError: null,
  fieldErrors: {},
  values: emptySingleDomainWeightingsImportValues,
  updatedOptionGroupCount: 0,
  updatedWeightCount: 0,
};

function isValidOptionLabel(
  value: string,
): value is ParsedSingleDomainWeightingImportRow['optionLabel'] {
  return (SINGLE_DOMAIN_WEIGHTING_OPTION_LABELS as readonly string[]).includes(value);
}

export function validateSingleDomainWeightingsImportValues(
  values: SingleDomainWeightingsImportValues,
): SingleDomainWeightingsImportState {
  const fieldErrors: SingleDomainWeightingsImportState['fieldErrors'] = {};

  if (!values.weightingLines.trim()) {
    fieldErrors.weightingLines = 'Paste at least one weighting row.';
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}

export function parseSingleDomainWeightingsImport(
  weightingLines: string,
): readonly ParsedSingleDomainWeightingImportRow[] {
  const rows = weightingLines.split(/\r?\n/);
  const parsed: ParsedSingleDomainWeightingImportRow[] = [];
  const seenKeys = new Map<string, number>();

  for (let index = 0; index < rows.length; index += 1) {
    const rawLine = rows[index] ?? '';
    const trimmedLine = rawLine.trim();
    const lineNumber = index + 1;

    if (!trimmedLine) {
      continue;
    }

    const segments = rawLine.split('|');
    if (segments.length !== 4) {
      throw new Error(`SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${lineNumber}_INVALID_FORMAT`);
    }

    const rawOrder = segments[0]?.trim() ?? '';
    const rawLabel = segments[1]?.trim() ?? '';
    const rawSignalKey = segments[2]?.trim().toLowerCase() ?? '';
    const rawWeight = segments[3]?.trim() ?? '';

    if (!/^\d+$/.test(rawOrder)) {
      throw new Error(`SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${lineNumber}_QUESTION_ORDER_INVALID`);
    }

    const questionOrder = Number(rawOrder);
    if (!Number.isSafeInteger(questionOrder) || questionOrder < 1) {
      throw new Error(`SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${lineNumber}_QUESTION_ORDER_INVALID`);
    }

    const optionLabel = rawLabel.toUpperCase();
    if (!isValidOptionLabel(optionLabel)) {
      throw new Error(`SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${lineNumber}_OPTION_LABEL_INVALID`);
    }

    if (!/^[a-z0-9_-]+$/.test(rawSignalKey)) {
      throw new Error(`SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${lineNumber}_SIGNAL_KEY_INVALID`);
    }

    const weight = parseBulkWeightValue(rawWeight);
    if (weight === null) {
      throw new Error(`SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${lineNumber}_WEIGHT_INVALID`);
    }

    const duplicateKey = `${questionOrder}|${optionLabel}|${rawSignalKey}`;
    const duplicateLine = seenKeys.get(duplicateKey);
    if (duplicateLine) {
      throw new Error(
        `SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_${lineNumber}_DUPLICATE_ROW_${duplicateLine}`,
      );
    }
    seenKeys.set(duplicateKey, lineNumber);

    parsed.push({
      lineNumber,
      questionOrder,
      optionLabel,
      signalKey: rawSignalKey,
      weight,
    });
  }

  if (parsed.length === 0) {
    throw new Error('SINGLE_DOMAIN_WEIGHTINGS_IMPORT_EMPTY');
  }

  return Object.freeze(parsed);
}

export function formatSingleDomainWeightingsImportError(message: string): string | null {
  if (message === 'SINGLE_DOMAIN_WEIGHTINGS_IMPORT_EMPTY') {
    return 'Paste at least one weighting row.';
  }

  const invalidFormatMatch =
    /^SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_(\d+)_INVALID_FORMAT$/.exec(message);
  if (invalidFormatMatch) {
    return `Line ${invalidFormatMatch[1]} must use exactly 4 pipe-delimited columns: question_order | option_label | signal_key | weight.`;
  }

  const orderInvalidMatch =
    /^SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_(\d+)_QUESTION_ORDER_INVALID$/.exec(message);
  if (orderInvalidMatch) {
    return `Line ${orderInvalidMatch[1]} must use a whole-number question order greater than 0.`;
  }

  const optionLabelInvalidMatch =
    /^SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_(\d+)_OPTION_LABEL_INVALID$/.exec(message);
  if (optionLabelInvalidMatch) {
    return `Line ${optionLabelInvalidMatch[1]} must use option label A, B, C, or D.`;
  }

  const signalKeyInvalidMatch =
    /^SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_(\d+)_SIGNAL_KEY_INVALID$/.exec(message);
  if (signalKeyInvalidMatch) {
    return `Line ${signalKeyInvalidMatch[1]} must include a valid signal key using lowercase letters, numbers, underscores, or hyphens.`;
  }

  const weightInvalidMatch =
    /^SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_(\d+)_WEIGHT_INVALID$/.exec(message);
  if (weightInvalidMatch) {
    return `Line ${weightInvalidMatch[1]} must include a valid numeric weight.`;
  }

  const duplicateMatch =
    /^SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_(\d+)_DUPLICATE_ROW_(\d+)$/.exec(message);
  if (duplicateMatch) {
    return `Line ${duplicateMatch[1]} repeats a question_order, option_label, and signal_key already used on line ${duplicateMatch[2]}.`;
  }

  const unknownQuestionMatch =
    /^SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_(\d+)_QUESTION_ORDER_NOT_FOUND_(\d+)$/.exec(message);
  if (unknownQuestionMatch) {
    return `Line ${unknownQuestionMatch[1]} references question order ${unknownQuestionMatch[2]}, which does not exist in the persisted draft.`;
  }

  const missingOptionMatch =
    /^SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_(\d+)_OPTION_LABEL_NOT_FOUND_(\d+)_([A-D])$/.exec(message);
  if (missingOptionMatch) {
    return `Line ${missingOptionMatch[1]} references option ${missingOptionMatch[3]} on question ${missingOptionMatch[2]}, but that canonical option slot is missing from the persisted draft.`;
  }

  const unknownSignalMatch =
    /^SINGLE_DOMAIN_WEIGHTINGS_IMPORT_LINE_(\d+)_SIGNAL_KEY_NOT_FOUND_(.+)$/.exec(message);
  if (unknownSignalMatch) {
    return `Line ${unknownSignalMatch[1]} references signal key "${unknownSignalMatch[2]}", which does not exist in the persisted draft.`;
  }

  return null;
}
