import type {
  SignalBulkImportParseError,
  SignalBulkImportResult,
  SignalBulkImportValidationError,
} from '@/lib/admin/signal-bulk-import';
import { DOMAIN_KEY_PATTERN, slugifyDomainKey } from '@/lib/utils/domain-key';

export type SignalBulkImportPlannerLifecycleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type SignalBulkImportPlannerAssessmentVersion = {
  assessmentVersionId: string;
  lifecycleStatus: SignalBulkImportPlannerLifecycleStatus;
};

export type SignalBulkImportPlannerExistingDomain = {
  domainId: string;
  domainKey: string;
  label: string;
  orderIndex: number;
  domainType?: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
};

export type SignalBulkImportPlannerExistingSignal = {
  signalId: string;
  domainId: string;
  signalKey: string;
  label: string;
  orderIndex: number;
};

export type SignalBulkImportPlanReasonCode =
  | 'INVALID_PARSED_ROW'
  | 'ROW_LIMIT_EXCEEDED'
  | 'VERSION_NOT_DRAFT'
  | 'UNKNOWN_DOMAIN'
  | 'AMBIGUOUS_DOMAIN'
  | 'SIGNAL_KEY_CONFLICT'
  | 'SIGNAL_LABEL_CONFLICT';

export type PlannedSignalBulkImportAcceptedRow = {
  sourceLineNumber: number;
  rawLine: string;
  label: string;
  description: string | null;
  signalKey: string;
  domainId: string;
  domainKey: string;
  domainLabel: string;
  orderIndex: number;
};

export type PlannedSignalBulkImportAcceptedDomainGroup = {
  domainId: string;
  domainKey: string;
  domainLabel: string;
  createdCount: number;
  rows: PlannedSignalBulkImportAcceptedRow[];
};

export type PlannedSignalBulkImportRejectedRow = {
  sourceLineNumber: number | null;
  rawLine: string | null;
  reasonCode: SignalBulkImportPlanReasonCode;
  message: string;
};

export type SignalBulkImportPlanSummary = {
  assessmentVersionId: string;
  lifecycleStatus: SignalBulkImportPlannerLifecycleStatus;
  basedOn: {
    authoredDomainCount: number;
    signalCount: number;
  };
  acceptedCount: number;
  rejectedCount: number;
  createdCount: number;
  errorCount: number;
  perDomainCreateCounts: Record<string, number>;
};

export type SignalBulkImportPlanResult = {
  ok: boolean;
  canImport: boolean;
  assessmentVersionId: string;
  lifecycleStatus: SignalBulkImportPlannerLifecycleStatus;
  summary: SignalBulkImportPlanSummary;
  accepted: PlannedSignalBulkImportAcceptedRow[];
  acceptedByDomain: PlannedSignalBulkImportAcceptedDomainGroup[];
  rejected: PlannedSignalBulkImportRejectedRow[];
  errorCount: number;
};

type ResolvedPlannerDomain =
  | {
      status: 'resolved';
      domain: SignalBulkImportPlannerExistingDomain;
    }
  | {
      status: 'unknown';
    }
  | {
      status: 'ambiguous';
    };

const BLOCKING_REASON_CODES = new Set<SignalBulkImportPlanReasonCode>([
  'ROW_LIMIT_EXCEEDED',
  'VERSION_NOT_DRAFT',
]);

export function planSignalBulkImport(params: {
  assessmentVersion: SignalBulkImportPlannerAssessmentVersion;
  existingDomains: readonly SignalBulkImportPlannerExistingDomain[];
  existingSignals: readonly SignalBulkImportPlannerExistingSignal[];
  parserResult: SignalBulkImportResult;
  allowDuplicateLabelsWithinDomain?: boolean;
}): SignalBulkImportPlanResult {
  const allowDuplicateLabelsWithinDomain = params.allowDuplicateLabelsWithinDomain ?? false;
  const authoredDomains = params.existingDomains
    .filter((domain) => domain.domainType === undefined || domain.domainType === 'SIGNAL_GROUP')
    .sort((left, right) => left.orderIndex - right.orderIndex || left.domainId.localeCompare(right.domainId));

  const rejected = new Map<string, PlannedSignalBulkImportRejectedRow>();
  const rejectedLineNumbers = new Set<number>();
  addParserRejections(rejected, rejectedLineNumbers, params.parserResult.parseErrors, params.parserResult.validationErrors);

  if (params.assessmentVersion.lifecycleStatus !== 'DRAFT') {
    addRejectedRow(rejected, {
      sourceLineNumber: null,
      rawLine: null,
      reasonCode: 'VERSION_NOT_DRAFT',
      message: 'Bulk signal import is allowed only for draft assessment versions.',
    });
  }

  const existingSignalKeys = new Set(params.existingSignals.map((signal) => signal.signalKey));
  const existingSignalLabelKeys = new Set(
    params.existingSignals.map((signal) => `${signal.domainId}::${normalizeLabelKey(signal.label)}`),
  );
  const nextOrderIndexByDomainId = new Map<string, number>();

  for (const domain of authoredDomains) {
    const nextOrderIndex =
      params.existingSignals
        .filter((signal) => signal.domainId === domain.domainId)
        .reduce((max, signal) => Math.max(max, signal.orderIndex), -1) + 1;
    nextOrderIndexByDomainId.set(domain.domainId, nextOrderIndex);
  }

  const accepted: PlannedSignalBulkImportAcceptedRow[] = [];

  for (const record of params.parserResult.previewRecords) {
    if (rejectedLineNumbers.has(record.lineNumber)) {
      continue;
    }

    const resolvedDomain = resolveDomain(record.domainReference, authoredDomains);
    if (resolvedDomain.status === 'unknown') {
      addRejectedRow(rejected, {
        sourceLineNumber: record.lineNumber,
        rawLine: record.rawLine,
        reasonCode: 'UNKNOWN_DOMAIN',
        message: `Domain ${record.domainReference} does not exist in the current assessment version.`,
      });
      rejectedLineNumbers.add(record.lineNumber);
      continue;
    }

    if (resolvedDomain.status === 'ambiguous') {
      addRejectedRow(rejected, {
        sourceLineNumber: record.lineNumber,
        rawLine: record.rawLine,
        reasonCode: 'AMBIGUOUS_DOMAIN',
        message: `Domain ${record.domainReference} matches multiple domains in the current assessment version.`,
      });
      rejectedLineNumbers.add(record.lineNumber);
      continue;
    }

    const labelKey = `${resolvedDomain.domain.domainId}::${normalizeLabelKey(record.label)}`;
    if (existingSignalKeys.has(record.key)) {
      addRejectedRow(rejected, {
        sourceLineNumber: record.lineNumber,
        rawLine: record.rawLine,
        reasonCode: 'SIGNAL_KEY_CONFLICT',
        message: `Signal key ${record.key} already exists in the current assessment version.`,
      });
      rejectedLineNumbers.add(record.lineNumber);
      continue;
    }

    if (!allowDuplicateLabelsWithinDomain && existingSignalLabelKeys.has(labelKey)) {
      addRejectedRow(rejected, {
        sourceLineNumber: record.lineNumber,
        rawLine: record.rawLine,
        reasonCode: 'SIGNAL_LABEL_CONFLICT',
        message: `Signal label ${record.label} already exists within domain ${resolvedDomain.domain.domainKey} in the current assessment version.`,
      });
      rejectedLineNumbers.add(record.lineNumber);
      continue;
    }

    const nextOrderIndex = nextOrderIndexByDomainId.get(resolvedDomain.domain.domainId) ?? 0;
    accepted.push({
      sourceLineNumber: record.lineNumber,
      rawLine: record.rawLine,
      label: record.label,
      description: record.description,
      signalKey: record.key,
      domainId: resolvedDomain.domain.domainId,
      domainKey: resolvedDomain.domain.domainKey,
      domainLabel: resolvedDomain.domain.label,
      orderIndex: nextOrderIndex,
    });
    nextOrderIndexByDomainId.set(resolvedDomain.domain.domainId, nextOrderIndex + 1);
  }

  const acceptedByDomain = buildAcceptedByDomain(accepted);
  const perDomainCreateCounts = Object.fromEntries(
    acceptedByDomain.map((group) => [group.domainKey, group.createdCount]),
  );
  const rejectedRows = sortRejectedRows([...rejected.values()]);
  const blockingErrorsPresent = rejectedRows.some((row) => BLOCKING_REASON_CODES.has(row.reasonCode));
  const summary: SignalBulkImportPlanSummary = {
    assessmentVersionId: params.assessmentVersion.assessmentVersionId,
    lifecycleStatus: params.assessmentVersion.lifecycleStatus,
    basedOn: {
      authoredDomainCount: authoredDomains.length,
      signalCount: params.existingSignals.length,
    },
    acceptedCount: accepted.length,
    rejectedCount: rejectedRows.length,
    createdCount: accepted.length,
    errorCount: rejectedRows.length,
    perDomainCreateCounts,
  };

  return {
    ok: rejectedRows.length === 0,
    canImport: !blockingErrorsPresent && accepted.length > 0,
    assessmentVersionId: params.assessmentVersion.assessmentVersionId,
    lifecycleStatus: params.assessmentVersion.lifecycleStatus,
    summary,
    accepted,
    acceptedByDomain,
    rejected: rejectedRows,
    errorCount: rejectedRows.length,
  };
}

function addParserRejections(
  rejected: Map<string, PlannedSignalBulkImportRejectedRow>,
  rejectedLineNumbers: Set<number>,
  parseErrors: readonly SignalBulkImportParseError[],
  validationErrors: readonly SignalBulkImportValidationError[],
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
          : error.code === 'UNKNOWN_DOMAIN'
            ? 'UNKNOWN_DOMAIN'
            : error.code === 'AMBIGUOUS_DOMAIN'
              ? 'AMBIGUOUS_DOMAIN'
              : error.code === 'DUPLICATE_SIGNAL_LABEL_IN_DOMAIN' ||
                  error.code === 'EXISTING_SIGNAL_LABEL_IN_DOMAIN_CONFLICT'
                ? 'SIGNAL_LABEL_CONFLICT'
                : 'SIGNAL_KEY_CONFLICT',
      message: error.message,
    });
    if (error.lineNumber !== null) {
      rejectedLineNumbers.add(error.lineNumber);
    }
  }
}

function buildAcceptedByDomain(
  rows: readonly PlannedSignalBulkImportAcceptedRow[],
): PlannedSignalBulkImportAcceptedDomainGroup[] {
  const rowsByDomainId = new Map<string, PlannedSignalBulkImportAcceptedDomainGroup>();

  for (const row of rows) {
    const existingGroup = rowsByDomainId.get(row.domainId);
    if (existingGroup) {
      existingGroup.rows.push(row);
      existingGroup.createdCount += 1;
      continue;
    }

    rowsByDomainId.set(row.domainId, {
      domainId: row.domainId,
      domainKey: row.domainKey,
      domainLabel: row.domainLabel,
      createdCount: 1,
      rows: [row],
    });
  }

  return [...rowsByDomainId.values()].sort(
    (left, right) => left.domainLabel.localeCompare(right.domainLabel) || left.domainId.localeCompare(right.domainId),
  );
}

function resolveDomain(
  domainReference: string,
  domains: readonly SignalBulkImportPlannerExistingDomain[],
): ResolvedPlannerDomain {
  const normalizedKeyCandidate = slugifyDomainKey(domainReference);
  if (normalizedKeyCandidate && DOMAIN_KEY_PATTERN.test(normalizedKeyCandidate)) {
    const keyMatches = domains.filter((domain) => domain.domainKey === normalizedKeyCandidate);
    if (keyMatches.length === 1) {
      return { status: 'resolved', domain: keyMatches[0]! };
    }

    if (keyMatches.length > 1) {
      return { status: 'ambiguous' };
    }
  }

  const labelMatches = domains.filter((domain) => domain.label === domainReference.trim());
  if (labelMatches.length === 1) {
    return { status: 'resolved', domain: labelMatches[0]! };
  }

  if (labelMatches.length > 1) {
    return { status: 'ambiguous' };
  }

  return { status: 'unknown' };
}

function addRejectedRow(
  rejected: Map<string, PlannedSignalBulkImportRejectedRow>,
  row: PlannedSignalBulkImportRejectedRow,
): void {
  const key = `${row.sourceLineNumber ?? 'global'}::${row.reasonCode}::${row.rawLine ?? ''}`;
  if (!rejected.has(key)) {
    rejected.set(key, row);
  }
}

function normalizeLabelKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function sortRejectedRows(
  rows: readonly PlannedSignalBulkImportRejectedRow[],
): PlannedSignalBulkImportRejectedRow[] {
  return [...rows].sort((left, right) => {
    const leftLine = left.sourceLineNumber ?? -1;
    const rightLine = right.sourceLineNumber ?? -1;
    return leftLine - rightLine || left.reasonCode.localeCompare(right.reasonCode);
  });
}
