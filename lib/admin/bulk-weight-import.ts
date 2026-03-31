export const BULK_WEIGHT_OPTION_LABEL_ORDER = ['A', 'B', 'C', 'D'] as const;

const ALLOWED_OPTION_LABELS = new Set(BULK_WEIGHT_OPTION_LABEL_ORDER);
const SIGNAL_KEY_PATTERN = /^[a-z0-9_-]+$/;

export type BulkWeightLabel = (typeof BULK_WEIGHT_OPTION_LABEL_ORDER)[number];

export type BulkWeightParseErrorCode =
  | 'INVALID_COLUMN_COUNT'
  | 'EMPTY_QUESTION_NUMBER'
  | 'INVALID_QUESTION_NUMBER'
  | 'EMPTY_OPTION_LABEL'
  | 'INVALID_OPTION_LABEL'
  | 'EMPTY_SIGNAL_KEY'
  | 'INVALID_SIGNAL_KEY'
  | 'EMPTY_WEIGHT'
  | 'INVALID_WEIGHT';

export type ParsedBulkWeightRow = {
  lineNumber: number;
  rawLine: string;
  questionNumberRaw: string;
  questionNumber: number;
  optionLabel: BulkWeightLabel;
  signalKeyRaw: string;
  signalKey: string;
  weightRaw: string;
  weight: number;
};

export type BulkWeightParseError = {
  lineNumber: number;
  rawLine: string;
  code: BulkWeightParseErrorCode;
  message: string;
};

export type BulkWeightParseResult = {
  success: boolean;
  records: ParsedBulkWeightRow[];
  errors: BulkWeightParseError[];
};

export type BulkWeightGroupValidationErrorCode =
  | 'DUPLICATE_SIGNAL_KEY'
  | 'EMPTY_WEIGHT_GROUP';

export type BulkWeightGroupValidationWarningCode =
  | 'ZERO_ONLY_WEIGHT_GROUP'
  | 'NEGATIVE_ONLY_WEIGHT_GROUP';

export type ValidatedBulkWeightPreviewRow = Pick<
  ParsedBulkWeightRow,
  'lineNumber' | 'signalKey' | 'weight'
>;

export type ValidatedBulkWeightGroup = {
  questionNumber: number;
  optionLabel: BulkWeightLabel;
  groupKey: string;
  weights: ValidatedBulkWeightPreviewRow[];
  weightCount: number;
  isEmpty: boolean;
  allZero: boolean;
  allNegative: boolean;
};

export type BulkWeightGroupValidationError = {
  questionNumber: number;
  optionLabel: BulkWeightLabel;
  code: BulkWeightGroupValidationErrorCode;
  message: string;
  lineNumbers: number[];
};

export type BulkWeightGroupValidationWarning = {
  questionNumber: number;
  optionLabel: BulkWeightLabel;
  code: BulkWeightGroupValidationWarningCode;
  message: string;
  lineNumbers: number[];
};

export type BulkWeightGroupValidationResult = {
  success: boolean;
  weightGroups: ValidatedBulkWeightGroup[];
  errors: BulkWeightGroupValidationError[];
  warnings: BulkWeightGroupValidationWarning[];
};

export type BulkWeightImportPreviewResult = {
  success: boolean;
  records: ParsedBulkWeightRow[];
  parseErrors: BulkWeightParseError[];
  weightGroups: ValidatedBulkWeightGroup[];
  groupErrors: BulkWeightGroupValidationError[];
  warnings: BulkWeightGroupValidationWarning[];
};

export type BulkWeightImportPlanErrorCode =
  | 'ASSESSMENT_VERSION_NOT_FOUND'
  | 'ASSESSMENT_VERSION_NOT_EDITABLE'
  | 'QUESTION_NUMBER_NOT_FOUND'
  | 'DUPLICATE_QUESTION_NUMBER_IN_ASSESSMENT'
  | 'OPTION_LABEL_NOT_FOUND'
  | 'DUPLICATE_OPTION_LABEL_FOR_QUESTION'
  | 'SIGNAL_KEY_NOT_FOUND'
  | 'DUPLICATE_SIGNAL_KEY_IN_ASSESSMENT'
  | 'QUESTION_SET_EMPTY'
  | 'SIGNAL_SET_EMPTY'
  | 'IMPORT_HAS_NO_VALID_GROUPS';

export type BulkWeightImportTargetAssessmentVersion = {
  assessmentVersionId: string;
  assessmentKey: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

export type BulkWeightImportTargetQuestion = {
  questionId: string;
  questionNumber: number;
  questionKey: string;
};

export type BulkWeightImportTargetOption = {
  optionId: string;
  questionId: string;
  questionNumber: number;
  optionLabel: BulkWeightLabel;
  optionKey: string;
  existingWeightRowIds: string[];
};

export type BulkWeightImportTargetSignal = {
  signalId: string;
  signalKey: string;
};

export type PlannedBulkWeightReplacement = {
  signalId: string;
  signalKey: string;
  weight: number;
};

export type PlannedBulkWeightGroupImport = {
  questionId: string;
  questionNumber: number;
  optionId: string;
  optionLabel: BulkWeightLabel;
  optionKey: string;
  existingWeightRowIds: string[];
  replacementWeights: PlannedBulkWeightReplacement[];
};

export type BulkWeightImportPlanError = {
  questionNumber: number | null;
  optionLabel: BulkWeightLabel | null;
  signalKey?: string;
  code: BulkWeightImportPlanErrorCode;
  message: string;
};

export type BulkWeightImportPlanSummary = {
  assessmentVersionId: string | null;
  optionGroupCount: number;
  questionCountMatched: number;
  optionGroupCountMatched: number;
  weightsToInsert: number;
  existingWeightsToDelete: number;
};

export type BulkWeightImportPlanResult = {
  success: boolean;
  plannedOptionGroups: PlannedBulkWeightGroupImport[];
  errors: BulkWeightImportPlanError[];
  summary: BulkWeightImportPlanSummary;
};

type ParseLineSuccess = {
  record: ParsedBulkWeightRow;
};

type ParseLineFailure = {
  error: BulkWeightParseError;
};

type ParseLineResult = ParseLineSuccess | ParseLineFailure;

export function parseBulkWeightImport(input: string): BulkWeightParseResult {
  const records: ParsedBulkWeightRow[] = [];
  const errors: BulkWeightParseError[] = [];
  const lines = input.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    if (rawLine.trim() === '') {
      continue;
    }

    const parsedLine = parseLine(rawLine, index + 1);
    if ('record' in parsedLine) {
      records.push(parsedLine.record);
      continue;
    }

    errors.push(parsedLine.error);
  }

  return {
    success: errors.length === 0,
    records,
    errors,
  };
}

export function validateBulkWeightGroups(
  records: ParsedBulkWeightRow[],
): BulkWeightGroupValidationResult {
  const groupedRows = groupBulkWeightRows(records);
  const groupKeys = [...groupedRows.keys()].sort(compareWeightGroupKeys);
  const weightGroups: ValidatedBulkWeightGroup[] = [];
  const errors: BulkWeightGroupValidationError[] = [];
  const warnings: BulkWeightGroupValidationWarning[] = [];

  for (const groupKey of groupKeys) {
    const rows = groupedRows.get(groupKey) ?? [];
    const validation = validateBulkWeightGroup(rows);

    weightGroups.push(validation.weightGroup);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }

  errors.sort(compareGroupedIssues);
  warnings.sort(compareGroupedIssues);

  return {
    success: errors.length === 0,
    weightGroups,
    errors,
    warnings,
  };
}

export function buildBulkWeightImportPreview(input: string): BulkWeightImportPreviewResult {
  const parsedResult = parseBulkWeightImport(input);
  const groupValidation = validateBulkWeightGroups(parsedResult.records);

  return {
    success: parsedResult.errors.length === 0 && groupValidation.errors.length === 0,
    records: parsedResult.records,
    parseErrors: parsedResult.errors,
    weightGroups: groupValidation.weightGroups,
    groupErrors: groupValidation.errors,
    warnings: groupValidation.warnings,
  };
}

export function buildBulkWeightImportPlan(params: {
  assessmentVersion: BulkWeightImportTargetAssessmentVersion | null;
  questions: readonly BulkWeightImportTargetQuestion[];
  options: readonly BulkWeightImportTargetOption[];
  signals: readonly BulkWeightImportTargetSignal[];
  validatedWeightGroups: readonly ValidatedBulkWeightGroup[];
}): BulkWeightImportPlanResult {
  const errors: BulkWeightImportPlanError[] = [];
  const plannedOptionGroups: PlannedBulkWeightGroupImport[] = [];
  const validWeightGroups = sortBulkWeightGroups(
    params.validatedWeightGroups.filter((group) => !group.isEmpty),
  );

  if (!params.assessmentVersion) {
    errors.push({
      questionNumber: null,
      optionLabel: null,
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    });
  } else if (params.assessmentVersion.lifecycleStatus !== 'DRAFT') {
    errors.push({
      questionNumber: null,
      optionLabel: null,
      code: 'ASSESSMENT_VERSION_NOT_EDITABLE',
      message: 'Bulk weight import is allowed only for draft assessment versions.',
    });
  }

  if (params.questions.length === 0) {
    errors.push({
      questionNumber: null,
      optionLabel: null,
      code: 'QUESTION_SET_EMPTY',
      message: 'The selected assessment version does not contain any questions.',
    });
  }

  if (params.signals.length === 0) {
    errors.push({
      questionNumber: null,
      optionLabel: null,
      code: 'SIGNAL_SET_EMPTY',
      message: 'The selected assessment version does not contain any signals.',
    });
  }

  if (validWeightGroups.length === 0) {
    errors.push({
      questionNumber: null,
      optionLabel: null,
      code: 'IMPORT_HAS_NO_VALID_GROUPS',
      message: 'No valid weight groups are available to import.',
    });
  }

  const questionsByNumber = new Map<number, BulkWeightImportTargetQuestion[]>();
  for (const question of params.questions) {
    const existing = questionsByNumber.get(question.questionNumber);
    if (existing) {
      existing.push(question);
      continue;
    }

    questionsByNumber.set(question.questionNumber, [question]);
  }

  const duplicateQuestionNumbers = [...questionsByNumber.entries()]
    .filter(([, questions]) => questions.length > 1)
    .map(([questionNumber]) => questionNumber)
    .sort((left, right) => left - right);

  for (const questionNumber of duplicateQuestionNumbers) {
    errors.push({
      questionNumber,
      optionLabel: null,
      code: 'DUPLICATE_QUESTION_NUMBER_IN_ASSESSMENT',
      message: `Question number ${questionNumber} is duplicated in the target assessment version.`,
    });
  }

  const signalsByKey = new Map<string, BulkWeightImportTargetSignal[]>();
  for (const signal of params.signals) {
    const existing = signalsByKey.get(signal.signalKey);
    if (existing) {
      existing.push(signal);
      continue;
    }

    signalsByKey.set(signal.signalKey, [signal]);
  }

  const duplicateSignalKeys = [...signalsByKey.entries()]
    .filter(([, signals]) => signals.length > 1)
    .map(([signalKey]) => signalKey)
    .sort((left, right) => left.localeCompare(right));

  for (const signalKey of duplicateSignalKeys) {
    errors.push({
      questionNumber: null,
      optionLabel: null,
      signalKey,
      code: 'DUPLICATE_SIGNAL_KEY_IN_ASSESSMENT',
      message: `Signal key ${signalKey} is duplicated in the target assessment version.`,
    });
  }

  const optionsByQuestionIdAndLabel = new Map<string, BulkWeightImportTargetOption[]>();
  for (const option of params.options) {
    const key = buildBulkWeightGroupKey(option.questionNumber, option.optionLabel);
    const existing = optionsByQuestionIdAndLabel.get(key);
    if (existing) {
      existing.push(option);
      continue;
    }

    optionsByQuestionIdAndLabel.set(key, [option]);
  }

  const duplicateOptionEntries = [...optionsByQuestionIdAndLabel.entries()]
    .filter(([, options]) => options.length > 1)
    .map(([groupKey]) => parseWeightGroupKey(groupKey))
    .sort(
      (left, right) =>
        left.questionNumber - right.questionNumber ||
        getLabelOrderIndex(left.optionLabel) - getLabelOrderIndex(right.optionLabel),
    );

  for (const duplicateOption of duplicateOptionEntries) {
    errors.push({
      questionNumber: duplicateOption.questionNumber,
      optionLabel: duplicateOption.optionLabel,
      code: 'DUPLICATE_OPTION_LABEL_FOR_QUESTION',
      message: `Question ${duplicateOption.questionNumber} contains duplicate option label ${duplicateOption.optionLabel} in the target assessment version.`,
    });
  }

  if (
    duplicateQuestionNumbers.length === 0 &&
    duplicateSignalKeys.length === 0 &&
    duplicateOptionEntries.length === 0
  ) {
    for (const weightGroup of validWeightGroups) {
      const matchedQuestion = questionsByNumber.get(weightGroup.questionNumber)?.[0] ?? null;
      if (!matchedQuestion) {
        errors.push({
          questionNumber: weightGroup.questionNumber,
          optionLabel: weightGroup.optionLabel,
          code: 'QUESTION_NUMBER_NOT_FOUND',
          message: `Question number ${weightGroup.questionNumber} does not exist in the target assessment version.`,
        });
        continue;
      }

      const matchedOption =
        optionsByQuestionIdAndLabel.get(
          buildBulkWeightGroupKey(weightGroup.questionNumber, weightGroup.optionLabel),
        )?.[0] ?? null;
      if (!matchedOption) {
        errors.push({
          questionNumber: weightGroup.questionNumber,
          optionLabel: weightGroup.optionLabel,
          code: 'OPTION_LABEL_NOT_FOUND',
          message: `Question ${weightGroup.questionNumber} does not contain option label ${weightGroup.optionLabel} in the target assessment version.`,
        });
        continue;
      }

      const replacementWeights: PlannedBulkWeightReplacement[] = [];
      let groupHasMissingSignal = false;

      for (const weightRow of weightGroup.weights) {
        const matchedSignal = signalsByKey.get(weightRow.signalKey)?.[0] ?? null;
        if (!matchedSignal) {
          errors.push({
            questionNumber: weightGroup.questionNumber,
            optionLabel: weightGroup.optionLabel,
            signalKey: weightRow.signalKey,
            code: 'SIGNAL_KEY_NOT_FOUND',
            message: `Signal key ${weightRow.signalKey} does not exist in the target assessment version.`,
          });
          groupHasMissingSignal = true;
          continue;
        }

        replacementWeights.push({
          signalId: matchedSignal.signalId,
          signalKey: matchedSignal.signalKey,
          weight: weightRow.weight,
        });
      }

      if (groupHasMissingSignal) {
        continue;
      }

      plannedOptionGroups.push({
        questionId: matchedQuestion.questionId,
        questionNumber: matchedQuestion.questionNumber,
        optionId: matchedOption.optionId,
        optionLabel: matchedOption.optionLabel,
        optionKey: matchedOption.optionKey,
        existingWeightRowIds: [...matchedOption.existingWeightRowIds],
        replacementWeights,
      });
    }
  }

  return {
    success: errors.length === 0,
    plannedOptionGroups,
    errors: sortPlanErrors(errors),
    summary: buildWeightPlanSummary(
      params.assessmentVersion?.assessmentVersionId ?? null,
      validWeightGroups.length,
      plannedOptionGroups,
    ),
  };
}

function parseLine(rawLine: string, lineNumber: number): ParseLineResult {
  const columns = rawLine.split('|');
  if (columns.length !== 4) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_COLUMN_COUNT',
        'Each row must contain exactly 4 pipe-delimited columns: question_number | option_label | signal_key | weight.',
      ),
    };
  }

  const [questionNumberRaw, optionLabelRaw, signalKeyRaw, weightRaw] = columns.map((column) =>
    column.trim(),
  );

  if (questionNumberRaw.length === 0) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'EMPTY_QUESTION_NUMBER',
        'Question number is required.',
      ),
    };
  }

  const questionNumber = parseQuestionNumber(questionNumberRaw);
  if (questionNumber === null) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_QUESTION_NUMBER',
        'Question number must be a positive integer.',
      ),
    };
  }

  const optionLabel = normalizeBulkWeightOptionLabel(optionLabelRaw);
  if (optionLabelRaw.length === 0) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'EMPTY_OPTION_LABEL',
        'Option label is required.',
      ),
    };
  }

  if (optionLabel === null) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_OPTION_LABEL',
        'Option label must be one of A, B, C, or D.',
      ),
    };
  }

  if (signalKeyRaw.length === 0) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'EMPTY_SIGNAL_KEY',
        'Signal key is required.',
      ),
    };
  }

  const signalKey = normalizeBulkWeightSignalKey(signalKeyRaw);
  if (signalKey === null) {
    return {
      error: createParseError(
        lineNumber,
        rawLine,
        'INVALID_SIGNAL_KEY',
        'Signal key must use lowercase letters, numbers, underscores, or hyphens.',
      ),
    };
  }

  if (weightRaw.length === 0) {
    return {
      error: createParseError(lineNumber, rawLine, 'EMPTY_WEIGHT', 'Weight is required.'),
    };
  }

  const weight = parseBulkWeightValue(weightRaw);
  if (weight === null) {
    return {
      error: createParseError(lineNumber, rawLine, 'INVALID_WEIGHT', 'Weight must be a valid number.'),
    };
  }

  return {
    record: {
      lineNumber,
      rawLine,
      questionNumberRaw,
      questionNumber,
      optionLabel,
      signalKeyRaw,
      signalKey,
      weightRaw,
      weight,
    },
  };
}

export function normalizeBulkWeightOptionLabel(value: string): BulkWeightLabel | null {
  const normalizedValue = value.trim().toUpperCase();
  if (!isBulkWeightLabel(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

export function normalizeBulkWeightSignalKey(value: string): string | null {
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue.length === 0) {
    return null;
  }

  if (!SIGNAL_KEY_PATTERN.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

export function parseBulkWeightValue(value: string): number | null {
  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return null;
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

export function groupBulkWeightRows(
  records: ParsedBulkWeightRow[],
): Map<string, ParsedBulkWeightRow[]> {
  const groupedRows = new Map<string, ParsedBulkWeightRow[]>();

  for (const record of records) {
    const groupKey = buildBulkWeightGroupKey(record.questionNumber, record.optionLabel);
    const existingRows = groupedRows.get(groupKey);
    if (existingRows) {
      existingRows.push(record);
      continue;
    }

    groupedRows.set(groupKey, [record]);
  }

  return groupedRows;
}

export function buildBulkWeightGroupKey(questionNumber: number, optionLabel: BulkWeightLabel): string {
  return `${questionNumber}|${optionLabel}`;
}

type WeightGroupValidation = {
  weightGroup: ValidatedBulkWeightGroup;
  errors: BulkWeightGroupValidationError[];
  warnings: BulkWeightGroupValidationWarning[];
};

export function validateBulkWeightGroup(rows: ParsedBulkWeightRow[]): WeightGroupValidation {
  const firstRow = rows[0];
  const questionNumber = firstRow?.questionNumber ?? 0;
  const optionLabel = firstRow?.optionLabel ?? 'A';
  const sortedRows = sortWeightRowsWithinGroup(rows);
  const lineNumbers = sortLineNumbers(rows.map((row) => row.lineNumber));
  const duplicateSignalKeys = findDuplicateSignalKeys(rows);
  const isEmpty = rows.length === 0;
  const allZero = rows.length > 0 && rows.every((row) => Object.is(row.weight, 0));
  const allNegative = rows.length > 0 && rows.every((row) => row.weight < 0);
  const errors: BulkWeightGroupValidationError[] = [];
  const warnings: BulkWeightGroupValidationWarning[] = [];

  if (isEmpty) {
    errors.push({
      questionNumber,
      optionLabel,
      code: 'EMPTY_WEIGHT_GROUP',
      message: `Question ${questionNumber} option ${optionLabel} does not contain any weight rows.`,
      lineNumbers: [],
    });
  }

  if (duplicateSignalKeys.length > 0) {
    const duplicateLineNumbers = duplicateSignalKeys.flatMap((signalKey) =>
      rows.filter((row) => row.signalKey === signalKey).map((row) => row.lineNumber),
    );
    errors.push({
      questionNumber,
      optionLabel,
      code: 'DUPLICATE_SIGNAL_KEY',
      message: `Question ${questionNumber} option ${optionLabel} contains duplicate signal keys: ${duplicateSignalKeys.join(', ')}.`,
      lineNumbers: sortLineNumbers(duplicateLineNumbers),
    });
  }

  if (allZero) {
    warnings.push({
      questionNumber,
      optionLabel,
      code: 'ZERO_ONLY_WEIGHT_GROUP',
      message: `Question ${questionNumber} option ${optionLabel} contains only zero weights.`,
      lineNumbers,
    });
  }

  if (allNegative) {
    warnings.push({
      questionNumber,
      optionLabel,
      code: 'NEGATIVE_ONLY_WEIGHT_GROUP',
      message: `Question ${questionNumber} option ${optionLabel} contains only negative weights.`,
      lineNumbers,
    });
  }

  return {
    weightGroup: {
      questionNumber,
      optionLabel,
      groupKey: buildBulkWeightGroupKey(questionNumber, optionLabel),
      weights: sortedRows.map((row) => ({
        lineNumber: row.lineNumber,
        signalKey: row.signalKey,
        weight: row.weight,
      })),
      weightCount: rows.length,
      isEmpty,
      allZero,
      allNegative,
    },
    errors,
    warnings,
  };
}

export function findDuplicateSignalKeys(rows: ParsedBulkWeightRow[]): string[] {
  const signalKeyCounts = new Map<string, number>();

  for (const row of rows) {
    signalKeyCounts.set(row.signalKey, (signalKeyCounts.get(row.signalKey) ?? 0) + 1);
  }

  return [...signalKeyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([signalKey]) => signalKey)
    .sort((left, right) => left.localeCompare(right));
}

export function sortBulkWeightGroups(
  groups: ValidatedBulkWeightGroup[],
): ValidatedBulkWeightGroup[] {
  return [...groups].sort(
    (left, right) =>
      left.questionNumber - right.questionNumber ||
      getLabelOrderIndex(left.optionLabel) - getLabelOrderIndex(right.optionLabel),
  );
}

export function sortWeightRowsWithinGroup(rows: ParsedBulkWeightRow[]): ParsedBulkWeightRow[] {
  return [...rows].sort(
    (left, right) =>
      left.signalKey.localeCompare(right.signalKey) || left.lineNumber - right.lineNumber,
  );
}

function parseQuestionNumber(value: string): number | null {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);
  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function createParseError(
  lineNumber: number,
  rawLine: string,
  code: BulkWeightParseErrorCode,
  message: string,
): BulkWeightParseError {
  return {
    lineNumber,
    rawLine,
    code,
    message,
  };
}

function isBulkWeightLabel(value: string): value is BulkWeightLabel {
  return ALLOWED_OPTION_LABELS.has(value as BulkWeightLabel);
}

function compareGroupedIssues(
  left: { questionNumber: number; optionLabel: BulkWeightLabel; code: string },
  right: { questionNumber: number; optionLabel: BulkWeightLabel; code: string },
): number {
  return (
    left.questionNumber - right.questionNumber ||
    getLabelOrderIndex(left.optionLabel) - getLabelOrderIndex(right.optionLabel) ||
    left.code.localeCompare(right.code)
  );
}

function compareWeightGroupKeys(left: string, right: string): number {
  const leftParts = parseWeightGroupKey(left);
  const rightParts = parseWeightGroupKey(right);

  return (
    leftParts.questionNumber - rightParts.questionNumber ||
    getLabelOrderIndex(leftParts.optionLabel) - getLabelOrderIndex(rightParts.optionLabel)
  );
}

function parseWeightGroupKey(value: string): { questionNumber: number; optionLabel: BulkWeightLabel } {
  const [questionNumberValue, optionLabelValue] = value.split('|');
  return {
    questionNumber: Number.parseInt(questionNumberValue ?? '0', 10),
    optionLabel: normalizeBulkWeightOptionLabel(optionLabelValue ?? 'A') ?? 'A',
  };
}

function getLabelOrderIndex(label: BulkWeightLabel): number {
  return BULK_WEIGHT_OPTION_LABEL_ORDER.indexOf(label);
}

function sortLineNumbers(lineNumbers: number[]): number[] {
  return [...lineNumbers].sort((left, right) => left - right);
}

function buildWeightPlanSummary(
  assessmentVersionId: string | null,
  optionGroupCount: number,
  plannedOptionGroups: readonly PlannedBulkWeightGroupImport[],
): BulkWeightImportPlanSummary {
  return {
    assessmentVersionId,
    optionGroupCount,
    questionCountMatched: new Set(plannedOptionGroups.map((group) => group.questionId)).size,
    optionGroupCountMatched: plannedOptionGroups.length,
    weightsToInsert: plannedOptionGroups.reduce(
      (count, group) => count + group.replacementWeights.length,
      0,
    ),
    existingWeightsToDelete: plannedOptionGroups.reduce(
      (count, group) => count + group.existingWeightRowIds.length,
      0,
    ),
  };
}

function sortPlanErrors(errors: readonly BulkWeightImportPlanError[]): BulkWeightImportPlanError[] {
  return [...errors].sort((left, right) => {
    const leftQuestionNumber = left.questionNumber ?? -1;
    const rightQuestionNumber = right.questionNumber ?? -1;
    const leftOptionOrder = left.optionLabel ? getLabelOrderIndex(left.optionLabel) : -1;
    const rightOptionOrder = right.optionLabel ? getLabelOrderIndex(right.optionLabel) : -1;

    return (
      leftQuestionNumber - rightQuestionNumber ||
      leftOptionOrder - rightOptionOrder ||
      left.code.localeCompare(right.code) ||
      (left.signalKey ?? '').localeCompare(right.signalKey ?? '')
    );
  });
}
