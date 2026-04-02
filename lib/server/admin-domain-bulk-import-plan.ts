import type {
  DomainBulkImportParseError,
  DomainBulkImportResult,
  DomainBulkImportValidationError,
} from '@/lib/admin/domain-bulk-import';

export type DomainBulkImportPlannerLifecycleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type DomainBulkImportPlannerAssessmentVersion = {
  assessmentVersionId: string;
  lifecycleStatus: DomainBulkImportPlannerLifecycleStatus;
};

export type DomainBulkImportPlannerExistingDomain = {
  domainId: string;
  domainKey: string;
  label: string;
  orderIndex: number;
  domainType?: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
};

export type DomainBulkImportPlanReasonCode =
  | 'INVALID_PARSED_ROW'
  | 'ROW_LIMIT_EXCEEDED'
  | 'VERSION_NOT_DRAFT'
  | 'DOMAIN_KEY_CONFLICT'
  | 'DOMAIN_LABEL_CONFLICT';

export type PlannedDomainBulkImportAcceptedRow = {
  sourceLineNumber: number;
  rawLine: string;
  label: string;
  description: string | null;
  domainKey: string;
  orderIndex: number;
};

export type PlannedDomainBulkImportRejectedRow = {
  sourceLineNumber: number | null;
  rawLine: string | null;
  reasonCode: DomainBulkImportPlanReasonCode;
  message: string;
};

export type DomainBulkImportPlanSummary = {
  assessmentVersionId: string;
  lifecycleStatus: DomainBulkImportPlannerLifecycleStatus;
  basedOn: {
    authoredDomainCount: number;
    authoredDomainMaxOrderIndex: number;
  };
  acceptedCount: number;
  rejectedCount: number;
  createdCount: number;
  errorCount: number;
};

export type DomainBulkImportPlanResult = {
  ok: boolean;
  canImport: boolean;
  assessmentVersionId: string;
  lifecycleStatus: DomainBulkImportPlannerLifecycleStatus;
  summary: DomainBulkImportPlanSummary;
  accepted: PlannedDomainBulkImportAcceptedRow[];
  rejected: PlannedDomainBulkImportRejectedRow[];
  errorCount: number;
};

const BLOCKING_REASON_CODES = new Set<DomainBulkImportPlanReasonCode>([
  'ROW_LIMIT_EXCEEDED',
  'VERSION_NOT_DRAFT',
]);

export function planDomainBulkImport(params: {
  assessmentVersion: DomainBulkImportPlannerAssessmentVersion;
  existingDomains: readonly DomainBulkImportPlannerExistingDomain[];
  parserResult: DomainBulkImportResult;
}): DomainBulkImportPlanResult {
  const authoredDomains = params.existingDomains
    .filter((domain) => domain.domainType === undefined || domain.domainType === 'SIGNAL_GROUP')
    .sort((left, right) => left.orderIndex - right.orderIndex || left.domainId.localeCompare(right.domainId));

  const rejected = new Map<string, PlannedDomainBulkImportRejectedRow>();
  const rejectedLineNumbers = new Set<number>();

  addParserRejections(rejected, rejectedLineNumbers, params.parserResult.parseErrors, params.parserResult.validationErrors);

  if (params.assessmentVersion.lifecycleStatus !== 'DRAFT') {
    addRejectedRow(rejected, {
      sourceLineNumber: null,
      rawLine: null,
      reasonCode: 'VERSION_NOT_DRAFT',
      message: 'Bulk domain import is allowed only for draft assessment versions.',
    });
  }

  const existingDomainKeys = new Set(authoredDomains.map((domain) => domain.domainKey));
  const nextOrderIndexStart = authoredDomains.reduce(
    (max, domain) => Math.max(max, domain.orderIndex),
    -1,
  ) + 1;

  const accepted: PlannedDomainBulkImportAcceptedRow[] = [];
  let nextOrderIndex = nextOrderIndexStart;

  for (const record of params.parserResult.previewRecords) {
    if (rejectedLineNumbers.has(record.lineNumber)) {
      continue;
    }

    if (existingDomainKeys.has(record.key)) {
      addRejectedRow(rejected, {
        sourceLineNumber: record.lineNumber,
        rawLine: record.rawLine,
        reasonCode: 'DOMAIN_KEY_CONFLICT',
        message: `Domain key ${record.key} already exists in the current assessment version.`,
      });
      rejectedLineNumbers.add(record.lineNumber);
      continue;
    }

    accepted.push({
      sourceLineNumber: record.lineNumber,
      rawLine: record.rawLine,
      label: record.label,
      description: record.description,
      domainKey: record.key,
      orderIndex: nextOrderIndex,
    });

    nextOrderIndex += 1;
  }

  const rejectedRows = sortRejectedRows([...rejected.values()]);
  const blockingErrorsPresent = rejectedRows.some((row) => BLOCKING_REASON_CODES.has(row.reasonCode));
  const summary: DomainBulkImportPlanSummary = {
    assessmentVersionId: params.assessmentVersion.assessmentVersionId,
    lifecycleStatus: params.assessmentVersion.lifecycleStatus,
    basedOn: {
      authoredDomainCount: authoredDomains.length,
      authoredDomainMaxOrderIndex: authoredDomains.reduce(
        (max, domain) => Math.max(max, domain.orderIndex),
        -1,
      ),
    },
    acceptedCount: accepted.length,
    rejectedCount: rejectedRows.length,
    createdCount: accepted.length,
    errorCount: rejectedRows.length,
  };

  return {
    ok: rejectedRows.length === 0,
    canImport: !blockingErrorsPresent && accepted.length > 0,
    assessmentVersionId: params.assessmentVersion.assessmentVersionId,
    lifecycleStatus: params.assessmentVersion.lifecycleStatus,
    summary,
    accepted,
    rejected: rejectedRows,
    errorCount: rejectedRows.length,
  };
}

function addParserRejections(
  rejected: Map<string, PlannedDomainBulkImportRejectedRow>,
  rejectedLineNumbers: Set<number>,
  parseErrors: readonly DomainBulkImportParseError[],
  validationErrors: readonly DomainBulkImportValidationError[],
): void {
  for (const error of parseErrors) {
    addRejectedRow(rejected, {
      sourceLineNumber: error.lineNumber,
      rawLine: error.rawLine,
      reasonCode: 'INVALID_PARSED_ROW',
      message: error.message,
    });
    rejectedLineNumbers.add(error.lineNumber);
  }

  for (const error of validationErrors) {
    addRejectedRow(rejected, {
      sourceLineNumber: error.lineNumber,
      rawLine: error.rawLine,
      reasonCode:
        error.code === 'ROW_LIMIT_EXCEEDED'
          ? 'ROW_LIMIT_EXCEEDED'
          : error.code === 'DUPLICATE_DOMAIN_LABEL'
            ? 'DOMAIN_LABEL_CONFLICT'
            : 'DOMAIN_KEY_CONFLICT',
      message: error.message,
    });
    if (error.lineNumber !== null) {
      rejectedLineNumbers.add(error.lineNumber);
    }
  }
}

function addRejectedRow(
  rejected: Map<string, PlannedDomainBulkImportRejectedRow>,
  row: PlannedDomainBulkImportRejectedRow,
): void {
  const key = `${row.sourceLineNumber ?? 'global'}::${row.reasonCode}::${row.rawLine ?? ''}`;
  if (!rejected.has(key)) {
    rejected.set(key, row);
  }
}

function sortRejectedRows(
  rows: readonly PlannedDomainBulkImportRejectedRow[],
): PlannedDomainBulkImportRejectedRow[] {
  return [...rows].sort((left, right) => {
    const leftLine = left.sourceLineNumber ?? -1;
    const rightLine = right.sourceLineNumber ?? -1;
    return leftLine - rightLine || left.reasonCode.localeCompare(right.reasonCode);
  });
}
