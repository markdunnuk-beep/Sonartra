export const MAX_SINGLE_DOMAIN_QUESTION_IMPORT_COUNT = 200;

export type SingleDomainQuestionImportValues = {
  questionLines: string;
};

export type SingleDomainQuestionImportState = {
  formError: string | null;
  fieldErrors: {
    questionLines?: string;
  };
  values: SingleDomainQuestionImportValues;
};

export type ParsedSingleDomainQuestionImportRow = {
  lineNumber: number;
  requestedOrder: number;
  prompt: string;
};

export type ExistingSingleDomainQuestionOrder = {
  questionId: string;
  orderIndex: number;
};

export type PlannedSingleDomainQuestionImportSlot =
  | {
      type: 'existing';
      questionId: string;
      orderIndex: number;
    }
  | {
      type: 'new';
      lineNumber: number;
      requestedOrder: number;
      prompt: string;
      orderIndex: number;
    };

export const emptySingleDomainQuestionImportValues: SingleDomainQuestionImportValues = {
  questionLines: '',
};

export const initialSingleDomainQuestionImportState: SingleDomainQuestionImportState = {
  formError: null,
  fieldErrors: {},
  values: emptySingleDomainQuestionImportValues,
};

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ');
}

export function validateSingleDomainQuestionImportValues(
  values: SingleDomainQuestionImportValues,
): SingleDomainQuestionImportState {
  const fieldErrors: SingleDomainQuestionImportState['fieldErrors'] = {};

  if (!values.questionLines.trim()) {
    fieldErrors.questionLines = 'Paste at least one question row.';
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}

export function parseSingleDomainQuestionImport(
  questionLines: string,
): readonly ParsedSingleDomainQuestionImportRow[] {
  const rows = questionLines.split(/\r?\n/);
  const parsed: ParsedSingleDomainQuestionImportRow[] = [];
  const seenOrders = new Map<number, number>();
  const seenPrompts = new Map<string, number>();

  for (let index = 0; index < rows.length; index += 1) {
    const rawLine = rows[index] ?? '';
    const trimmedLine = rawLine.trim();
    const lineNumber = index + 1;

    if (!trimmedLine) {
      continue;
    }

    const segments = rawLine.split('|');
    if (segments.length !== 2) {
      throw new Error(`SINGLE_DOMAIN_IMPORT_LINE_${lineNumber}_INVALID_FORMAT`);
    }

    const rawOrder = segments[0]?.trim() ?? '';
    const rawPrompt = segments[1] ?? '';

    if (!rawOrder) {
      throw new Error(`SINGLE_DOMAIN_IMPORT_LINE_${lineNumber}_ORDER_REQUIRED`);
    }

    if (!/^\d+$/.test(rawOrder)) {
      throw new Error(`SINGLE_DOMAIN_IMPORT_LINE_${lineNumber}_ORDER_INVALID`);
    }

    const requestedOrder = Number(rawOrder);
    if (!Number.isSafeInteger(requestedOrder) || requestedOrder < 1) {
      throw new Error(`SINGLE_DOMAIN_IMPORT_LINE_${lineNumber}_ORDER_INVALID`);
    }

    const prompt = normalizePrompt(rawPrompt);
    if (!prompt) {
      throw new Error(`SINGLE_DOMAIN_IMPORT_LINE_${lineNumber}_QUESTION_REQUIRED`);
    }

    const duplicateOrderLine = seenOrders.get(requestedOrder);
    if (duplicateOrderLine) {
      throw new Error(
        `SINGLE_DOMAIN_IMPORT_LINE_${lineNumber}_DUPLICATE_ORDER_${duplicateOrderLine}`,
      );
    }
    seenOrders.set(requestedOrder, lineNumber);

    const promptKey = prompt.toLowerCase();
    const duplicatePromptLine = seenPrompts.get(promptKey);
    if (duplicatePromptLine) {
      throw new Error(
        `SINGLE_DOMAIN_IMPORT_LINE_${lineNumber}_DUPLICATE_QUESTION_${duplicatePromptLine}`,
      );
    }
    seenPrompts.set(promptKey, lineNumber);

    parsed.push({
      lineNumber,
      requestedOrder,
      prompt,
    });
  }

  if (parsed.length < 1) {
    throw new Error('SINGLE_DOMAIN_IMPORT_EMPTY');
  }

  if (parsed.length > MAX_SINGLE_DOMAIN_QUESTION_IMPORT_COUNT) {
    throw new Error('SINGLE_DOMAIN_IMPORT_LIMIT_EXCEEDED');
  }

  return Object.freeze(parsed);
}

export function buildSingleDomainQuestionImportPlan(params: {
  existingQuestions: readonly ExistingSingleDomainQuestionOrder[];
  rows: readonly ParsedSingleDomainQuestionImportRow[];
}): readonly PlannedSingleDomainQuestionImportSlot[] {
  const totalQuestionCount = params.existingQuestions.length + params.rows.length;
  const slots = new Array<PlannedSingleDomainQuestionImportSlot | null>(totalQuestionCount).fill(null);

  for (const row of params.rows) {
    if (row.requestedOrder > totalQuestionCount) {
      throw new Error(
        `SINGLE_DOMAIN_IMPORT_LINE_${row.lineNumber}_ORDER_OUT_OF_RANGE_${totalQuestionCount}`,
      );
    }

    slots[row.requestedOrder - 1] = {
      type: 'new',
      lineNumber: row.lineNumber,
      requestedOrder: row.requestedOrder,
      prompt: row.prompt,
      orderIndex: row.requestedOrder - 1,
    };
  }

  let existingCursor = 0;
  for (let orderIndex = 0; orderIndex < slots.length; orderIndex += 1) {
    if (slots[orderIndex]) {
      continue;
    }

    const existingQuestion = params.existingQuestions[existingCursor];
    if (!existingQuestion) {
      throw new Error('SINGLE_DOMAIN_IMPORT_PLAN_INVALID');
    }

    slots[orderIndex] = {
      type: 'existing',
      questionId: existingQuestion.questionId,
      orderIndex,
    };
    existingCursor += 1;
  }

  return Object.freeze(slots.filter((slot): slot is PlannedSingleDomainQuestionImportSlot => slot !== null));
}

export function formatSingleDomainQuestionImportError(message: string): string | null {
  if (message === 'SINGLE_DOMAIN_IMPORT_EMPTY') {
    return 'Paste at least one question row.';
  }

  if (message === 'SINGLE_DOMAIN_IMPORT_LIMIT_EXCEEDED') {
    return `Import at most ${MAX_SINGLE_DOMAIN_QUESTION_IMPORT_COUNT} questions at a time.`;
  }

  const invalidFormatMatch = /^SINGLE_DOMAIN_IMPORT_LINE_(\d+)_INVALID_FORMAT$/.exec(message);
  if (invalidFormatMatch) {
    return `Line ${invalidFormatMatch[1]} must use exactly 2 pipe-delimited columns: order | question_text.`;
  }

  const orderRequiredMatch = /^SINGLE_DOMAIN_IMPORT_LINE_(\d+)_ORDER_REQUIRED$/.exec(message);
  if (orderRequiredMatch) {
    return `Line ${orderRequiredMatch[1]} must include an order value before the | separator.`;
  }

  const orderInvalidMatch = /^SINGLE_DOMAIN_IMPORT_LINE_(\d+)_ORDER_INVALID$/.exec(message);
  if (orderInvalidMatch) {
    return `Line ${orderInvalidMatch[1]} must use a whole-number order value greater than 0.`;
  }

  const questionRequiredMatch = /^SINGLE_DOMAIN_IMPORT_LINE_(\d+)_QUESTION_REQUIRED$/.exec(message);
  if (questionRequiredMatch) {
    return `Line ${questionRequiredMatch[1]} must include question text after the | separator.`;
  }

  const duplicateOrderMatch = /^SINGLE_DOMAIN_IMPORT_LINE_(\d+)_DUPLICATE_ORDER_(\d+)$/.exec(message);
  if (duplicateOrderMatch) {
    return `Line ${duplicateOrderMatch[1]} repeats an order already used on line ${duplicateOrderMatch[2]}.`;
  }

  const duplicateQuestionMatch =
    /^SINGLE_DOMAIN_IMPORT_LINE_(\d+)_DUPLICATE_QUESTION_(\d+)$/.exec(message);
  if (duplicateQuestionMatch) {
    return `Line ${duplicateQuestionMatch[1]} repeats question text already used on line ${duplicateQuestionMatch[2]}.`;
  }

  const outOfRangeMatch =
    /^SINGLE_DOMAIN_IMPORT_LINE_(\d+)_ORDER_OUT_OF_RANGE_(\d+)$/.exec(message);
  if (outOfRangeMatch) {
    return `Line ${outOfRangeMatch[1]} uses an order outside the allowed final range of 1 to ${outOfRangeMatch[2]}.`;
  }

  return null;
}
