import {
  APPLICATION_STATEMENTS_COLUMNS,
  BALANCING_SECTIONS_COLUMNS,
  DRIVER_CLAIMS_COLUMNS,
  DOMAIN_FRAMING_COLUMNS,
  HERO_PAIRS_COLUMNS,
  PAIR_SUMMARIES_COLUMNS,
  SIGNAL_CHAPTERS_COLUMNS,
  SINGLE_DOMAIN_LANGUAGE_DATASET_COLUMNS,
  SINGLE_DOMAIN_LANGUAGE_DATASET_KEYS,
  type ApplicationStatementsRow,
  type BalancingSectionsRow,
  type DriverClaimsRow,
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

const DRIVER_ROLES = [
  'primary_driver',
  'secondary_driver',
  'supporting_context',
  'range_limitation',
] as const satisfies readonly DriverClaimsRow['driver_role'][];

const CLAIM_TYPES = [
  'driver_primary',
  'driver_secondary',
  'driver_supporting_context',
  'driver_range_limitation',
] as const satisfies readonly DriverClaimsRow['claim_type'][];

const MATERIALITIES = [
  'core',
  'supporting',
  'material_underplay',
] as const satisfies readonly DriverClaimsRow['materiality'][];

const DRIVER_ROLE_TO_CLAIM_TYPE = {
  primary_driver: 'driver_primary',
  secondary_driver: 'driver_secondary',
  supporting_context: 'driver_supporting_context',
  range_limitation: 'driver_range_limitation',
} as const satisfies Record<DriverClaimsRow['driver_role'], DriverClaimsRow['claim_type']>;

const DRIVER_ROLE_TO_MATERIALITY = {
  primary_driver: 'core',
  secondary_driver: 'core',
  supporting_context: 'supporting',
  range_limitation: 'material_underplay',
} as const satisfies Record<DriverClaimsRow['driver_role'], DriverClaimsRow['materiality']>;

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Field "${fieldName}" must be a string.`);
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    throw new Error(`Field "${fieldName}" must be a non-empty string.`);
  }

  return trimmedValue;
}

function requireDriverRole(value: string): DriverClaimsRow['driver_role'] {
  if (!DRIVER_ROLES.includes(value as DriverClaimsRow['driver_role'])) {
    throw new Error(`Field "driver_role" must be one of: ${DRIVER_ROLES.join(', ')}.`);
  }

  return value as DriverClaimsRow['driver_role'];
}

function requireClaimType(value: string): DriverClaimsRow['claim_type'] {
  if (!CLAIM_TYPES.includes(value as DriverClaimsRow['claim_type'])) {
    throw new Error(`Field "claim_type" must be one of: ${CLAIM_TYPES.join(', ')}.`);
  }

  return value as DriverClaimsRow['claim_type'];
}

function requireMateriality(value: string): DriverClaimsRow['materiality'] {
  if (!MATERIALITIES.includes(value as DriverClaimsRow['materiality'])) {
    throw new Error(`Field "materiality" must be one of: ${MATERIALITIES.join(', ')}.`);
  }

  return value as DriverClaimsRow['materiality'];
}

function parsePositiveInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('Field "priority" must be a positive integer.');
  }

  return Number(value);
}

export const domainFramingRowSchema = createStrictRowSchema<DomainFramingRow>(DOMAIN_FRAMING_COLUMNS);
export const heroPairsRowSchema = createStrictRowSchema<HeroPairsRow>(HERO_PAIRS_COLUMNS);
export const driverClaimsRowSchema: StrictRowSchema<DriverClaimsRow> = {
  parse(row: RawSingleDomainRow): DriverClaimsRow {
    const receivedColumns = getOrderedRowKeys(row);
    if (!hasExactSequence(DRIVER_CLAIMS_COLUMNS, receivedColumns)) {
      throw new Error([
        'Row columns must match the dataset contract exactly.',
        `Expected columns: ${DRIVER_CLAIMS_COLUMNS.join('|')}`,
        `Received columns: ${receivedColumns.join('|')}`,
      ].join(' '));
    }

    const domainKey = requireNonEmptyString(row.domain_key, 'domain_key');
    const pairKey = requireNonEmptyString(row.pair_key, 'pair_key');
    const signalKey = requireNonEmptyString(row.signal_key, 'signal_key');
    const driverRole = requireDriverRole(requireNonEmptyString(row.driver_role, 'driver_role'));
    const claimType = requireClaimType(requireNonEmptyString(row.claim_type, 'claim_type'));
    const claimText = requireNonEmptyString(row.claim_text, 'claim_text');
    const materiality = requireMateriality(requireNonEmptyString(row.materiality, 'materiality'));
    const priority = parsePositiveInteger(requireNonEmptyString(row.priority, 'priority'));
    const expectedClaimType = DRIVER_ROLE_TO_CLAIM_TYPE[driverRole];
    const expectedMateriality = DRIVER_ROLE_TO_MATERIALITY[driverRole];

    if (claimType !== expectedClaimType) {
      throw new Error(`Field "claim_type" must be "${expectedClaimType}" when driver_role is "${driverRole}".`);
    }

    if (materiality !== expectedMateriality) {
      throw new Error(`Field "materiality" must be "${expectedMateriality}" when driver_role is "${driverRole}".`);
    }

    return {
      domain_key: domainKey,
      pair_key: pairKey,
      signal_key: signalKey,
      driver_role: driverRole,
      claim_type: claimType,
      claim_text: claimText,
      materiality,
      priority,
    };
  },
};
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
  DRIVER_CLAIMS: {
    columns: DRIVER_CLAIMS_COLUMNS,
    rowSchema: driverClaimsRowSchema,
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
