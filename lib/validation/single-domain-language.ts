import {
  APPLICATION_STATEMENTS_COLUMNS,
  BALANCING_SECTIONS_COLUMNS,
  DOMAIN_FRAMING_COLUMNS,
  HERO_PAIRS_COLUMNS,
  PAIR_SUMMARIES_COLUMNS,
  SIGNAL_CHAPTERS_COLUMNS,
  SINGLE_DOMAIN_LANGUAGE_DATASET_COLUMNS,
  SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS,
  type ApplicationStatementsRow,
  type BalancingSectionsRow,
  type DomainFramingRow,
  type HeroPairsRow,
  type PairSummariesRow,
  type SignalChaptersRow,
  type SingleDomainLanguageDatasetKey,
  type SingleDomainLanguageDatasetRowMap,
} from '@/lib/types/single-domain-language';

type RawSingleDomainRow = Record<string, unknown>;

type StrictRowSchema<TRow> = {
  parse(row: RawSingleDomainRow): TRow;
};

type SingleDomainLanguageSchemaRegistry = {
  [TKey in SingleDomainLanguageDatasetKey]: {
    columns: typeof SINGLE_DOMAIN_LANGUAGE_DATASET_COLUMNS[TKey];
    rowSchema: StrictRowSchema<SingleDomainLanguageDatasetRowMap[TKey]>;
  };
};

export type SingleDomainHeaderValidationResult =
  | {
      success: true;
      datasetKey: SingleDomainLanguageDatasetKey;
      expectedColumns: readonly string[];
      receivedColumns: readonly string[];
    }
  | {
      success: false;
      message: string;
      expectedColumns: readonly string[];
      receivedColumns: readonly string[];
    };

function buildInvalidDatasetKeyMessage(datasetKey: string): string {
  return [
    `Invalid single-domain dataset key "${datasetKey}".`,
    `Expected one of: ${SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS.join(', ')}`,
  ].join(' ');
}

function buildInvalidHeadersMessage(
  datasetKey: SingleDomainLanguageDatasetKey,
  expectedColumns: readonly string[],
  receivedColumns: readonly string[],
): string {
  return [
    `Invalid headers for ${datasetKey}.`,
    `Expected columns: ${expectedColumns.join('|')}`,
    `Received columns: ${receivedColumns.join('|')}`,
  ].join(' ');
}

function hasExactSequence(expected: readonly string[], received: readonly string[]): boolean {
  return expected.length === received.length &&
    expected.every((column, index) => column === received[index]);
}

function getOrderedRowKeys(row: RawSingleDomainRow): readonly string[] {
  return Object.keys(row);
}

function createStrictRowSchema<TRow extends { [TKey in keyof TRow]: string }>(
  columns: readonly (keyof TRow & string)[],
): StrictRowSchema<TRow> {
  return {
    parse(row: RawSingleDomainRow): TRow {
      const receivedColumns = getOrderedRowKeys(row);
      if (!hasExactSequence(columns, receivedColumns)) {
        throw new Error([
          'Row columns must match the dataset contract exactly.',
          `Expected columns: ${columns.join('|')}`,
          `Received columns: ${receivedColumns.join('|')}`,
        ].join(' '));
      }

      const parsedRow: Partial<Record<keyof TRow & string, string>> = {};

      for (const column of columns) {
        const value = row[column];

        if (typeof value !== 'string') {
          throw new Error(`Field "${column}" must be a string.`);
        }

        const trimmedValue = value.trim();
        if (trimmedValue.length === 0) {
          throw new Error(`Field "${column}" must be a non-empty string.`);
        }

        parsedRow[column] = trimmedValue;
      }

      return parsedRow as TRow;
    },
  };
}

export const domainFramingRowSchema = createStrictRowSchema<DomainFramingRow>(DOMAIN_FRAMING_COLUMNS);
export const heroPairsRowSchema = createStrictRowSchema<HeroPairsRow>(HERO_PAIRS_COLUMNS);
export const signalChaptersRowSchema = createStrictRowSchema<SignalChaptersRow>(SIGNAL_CHAPTERS_COLUMNS);
export const balancingSectionsRowSchema = createStrictRowSchema<BalancingSectionsRow>(BALANCING_SECTIONS_COLUMNS);
export const pairSummariesRowSchema = createStrictRowSchema<PairSummariesRow>(PAIR_SUMMARIES_COLUMNS);
export const applicationStatementsRowSchema = createStrictRowSchema<ApplicationStatementsRow>(
  APPLICATION_STATEMENTS_COLUMNS,
);

export const singleDomainLanguageSchemaRegistry = {
  DOMAIN_FRAMING: {
    columns: DOMAIN_FRAMING_COLUMNS,
    rowSchema: domainFramingRowSchema,
  },
  HERO_PAIRS: {
    columns: HERO_PAIRS_COLUMNS,
    rowSchema: heroPairsRowSchema,
  },
  SIGNAL_CHAPTERS: {
    columns: SIGNAL_CHAPTERS_COLUMNS,
    rowSchema: signalChaptersRowSchema,
  },
  BALANCING_SECTIONS: {
    columns: BALANCING_SECTIONS_COLUMNS,
    rowSchema: balancingSectionsRowSchema,
  },
  PAIR_SUMMARIES: {
    columns: PAIR_SUMMARIES_COLUMNS,
    rowSchema: pairSummariesRowSchema,
  },
  APPLICATION_STATEMENTS: {
    columns: APPLICATION_STATEMENTS_COLUMNS,
    rowSchema: applicationStatementsRowSchema,
  },
} as const satisfies SingleDomainLanguageSchemaRegistry;

export function isSingleDomainLanguageDatasetKey(value: string): value is SingleDomainLanguageDatasetKey {
  return SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS.includes(value as SingleDomainLanguageDatasetKey);
}

export function validateSingleDomainDatasetHeaders(
  datasetKey: string,
  headers: readonly string[],
): SingleDomainHeaderValidationResult {
  const receivedColumns = headers.map((header) => header.trim());

  if (!isSingleDomainLanguageDatasetKey(datasetKey)) {
    return {
      success: false,
      message: buildInvalidDatasetKeyMessage(datasetKey),
      expectedColumns: [],
      receivedColumns,
    };
  }

  const expectedColumns = [...singleDomainLanguageSchemaRegistry[datasetKey].columns];
  if (!hasExactSequence(expectedColumns, receivedColumns)) {
    return {
      success: false,
      message: buildInvalidHeadersMessage(datasetKey, expectedColumns, receivedColumns),
      expectedColumns,
      receivedColumns,
    };
  }

  return {
    success: true,
    datasetKey,
    expectedColumns,
    receivedColumns,
  };
}

export function parseSingleDomainDatasetRows<TKey extends SingleDomainLanguageDatasetKey>(
  datasetKey: TKey,
  rows: readonly RawSingleDomainRow[],
): SingleDomainLanguageDatasetRowMap[TKey][] {
  const registryEntry = singleDomainLanguageSchemaRegistry[datasetKey];
  const rowSchema = registryEntry.rowSchema as StrictRowSchema<SingleDomainLanguageDatasetRowMap[TKey]>;

  const headerSource = rows[0] ? getOrderedRowKeys(rows[0]) : registryEntry.columns;
  const headerValidation = validateSingleDomainDatasetHeaders(datasetKey, headerSource);
  if (!headerValidation.success) {
    throw new Error(headerValidation.message);
  }

  return rows.map((row, index) => {
    const rowNumber = index + 2;

    try {
      return rowSchema.parse(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid row.';
      throw new Error(`Invalid row ${rowNumber} for ${datasetKey}. ${message}`);
    }
  });
}
