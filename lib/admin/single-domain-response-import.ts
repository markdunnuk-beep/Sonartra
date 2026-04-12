export const SINGLE_DOMAIN_RESPONSE_OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export type SingleDomainResponseImportValues = {
  responseLines: string;
};

export type SingleDomainResponseImportState = {
  formError: string | null;
  fieldErrors: {
    responseLines?: string;
  };
  values: SingleDomainResponseImportValues;
  updatedQuestionCount?: number;
  updatedOptionCount?: number;
};

export type ParsedSingleDomainResponseImportRow = {
  lineNumber: number;
  questionOrder: number;
  optionLabel: (typeof SINGLE_DOMAIN_RESPONSE_OPTION_LABELS)[number];
  responseText: string;
};

export const emptySingleDomainResponseImportValues: SingleDomainResponseImportValues = {
  responseLines: '',
};

export const initialSingleDomainResponseImportState: SingleDomainResponseImportState = {
  formError: null,
  fieldErrors: {},
  values: emptySingleDomainResponseImportValues,
  updatedQuestionCount: 0,
  updatedOptionCount: 0,
};

function isValidOptionLabel(
  value: string,
): value is ParsedSingleDomainResponseImportRow['optionLabel'] {
  return (SINGLE_DOMAIN_RESPONSE_OPTION_LABELS as readonly string[]).includes(value);
}

export function validateSingleDomainResponseImportValues(
  values: SingleDomainResponseImportValues,
): SingleDomainResponseImportState {
  const fieldErrors: SingleDomainResponseImportState['fieldErrors'] = {};

  if (!values.responseLines.trim()) {
    fieldErrors.responseLines = 'Paste at least one response row.';
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}

export function parseSingleDomainResponseImport(
  responseLines: string,
): readonly ParsedSingleDomainResponseImportRow[] {
  const rows = responseLines.split(/\r?\n/);
  const parsed: ParsedSingleDomainResponseImportRow[] = [];
  const seenKeys = new Map<string, number>();

  for (let index = 0; index < rows.length; index += 1) {
    const rawLine = rows[index] ?? '';
    const trimmedLine = rawLine.trim();
    const lineNumber = index + 1;

    if (!trimmedLine) {
      continue;
    }

    const segments = rawLine.split('|');
    if (segments.length !== 3) {
      throw new Error(`SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_${lineNumber}_INVALID_FORMAT`);
    }

    const rawOrder = segments[0]?.trim() ?? '';
    const rawLabel = segments[1]?.trim() ?? '';
    const responseText = segments[2]?.trim() ?? '';

    if (!/^\d+$/.test(rawOrder)) {
      throw new Error(`SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_${lineNumber}_QUESTION_ORDER_INVALID`);
    }

    const questionOrder = Number(rawOrder);
    if (!Number.isSafeInteger(questionOrder) || questionOrder < 1) {
      throw new Error(`SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_${lineNumber}_QUESTION_ORDER_INVALID`);
    }

    const optionLabel = rawLabel.toUpperCase();
    if (!isValidOptionLabel(optionLabel)) {
      throw new Error(`SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_${lineNumber}_OPTION_LABEL_INVALID`);
    }

    if (!responseText) {
      throw new Error(`SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_${lineNumber}_RESPONSE_TEXT_REQUIRED`);
    }

    const duplicateKey = `${questionOrder}|${optionLabel}`;
    const duplicateLine = seenKeys.get(duplicateKey);
    if (duplicateLine) {
      throw new Error(
        `SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_${lineNumber}_DUPLICATE_ROW_${duplicateLine}`,
      );
    }
    seenKeys.set(duplicateKey, lineNumber);

    parsed.push({
      lineNumber,
      questionOrder,
      optionLabel,
      responseText,
    });
  }

  if (parsed.length === 0) {
    throw new Error('SINGLE_DOMAIN_RESPONSES_IMPORT_EMPTY');
  }

  return Object.freeze(parsed);
}

export function formatSingleDomainResponseImportError(message: string): string | null {
  if (message === 'SINGLE_DOMAIN_RESPONSES_IMPORT_EMPTY') {
    return 'Paste at least one response row.';
  }

  const invalidFormatMatch = /^SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_(\d+)_INVALID_FORMAT$/.exec(message);
  if (invalidFormatMatch) {
    return `Line ${invalidFormatMatch[1]} must use exactly 3 pipe-delimited columns: question_order | option_label | response_text.`;
  }

  const orderInvalidMatch =
    /^SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_(\d+)_QUESTION_ORDER_INVALID$/.exec(message);
  if (orderInvalidMatch) {
    return `Line ${orderInvalidMatch[1]} must use a whole-number question order greater than 0.`;
  }

  const optionLabelInvalidMatch =
    /^SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_(\d+)_OPTION_LABEL_INVALID$/.exec(message);
  if (optionLabelInvalidMatch) {
    return `Line ${optionLabelInvalidMatch[1]} must use option label A, B, C, or D.`;
  }

  const responseRequiredMatch =
    /^SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_(\d+)_RESPONSE_TEXT_REQUIRED$/.exec(message);
  if (responseRequiredMatch) {
    return `Line ${responseRequiredMatch[1]} must include response text after the second | separator.`;
  }

  const duplicateMatch =
    /^SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_(\d+)_DUPLICATE_ROW_(\d+)$/.exec(message);
  if (duplicateMatch) {
    return `Line ${duplicateMatch[1]} repeats a question_order and option_label already used on line ${duplicateMatch[2]}.`;
  }

  const unknownQuestionMatch =
    /^SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_(\d+)_QUESTION_ORDER_NOT_FOUND_(\d+)$/.exec(message);
  if (unknownQuestionMatch) {
    return `Line ${unknownQuestionMatch[1]} references question order ${unknownQuestionMatch[2]}, which does not exist in the persisted draft.`;
  }

  const missingOptionMatch =
    /^SINGLE_DOMAIN_RESPONSES_IMPORT_LINE_(\d+)_OPTION_LABEL_NOT_FOUND_(\d+)_([A-D])$/.exec(message);
  if (missingOptionMatch) {
    return `Line ${missingOptionMatch[1]} references option ${missingOptionMatch[3]} on question ${missingOptionMatch[2]}, but that canonical option slot is missing from the persisted draft.`;
  }

  return null;
}
