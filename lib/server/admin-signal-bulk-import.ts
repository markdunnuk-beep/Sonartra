'use server';

import { revalidatePath } from 'next/cache';

import {
  parseSignalBulkImport,
  type SignalBulkImportExistingDomain,
  type SignalBulkImportExistingSignal,
} from '@/lib/admin/signal-bulk-import';
import {
  planSignalBulkImport,
  type PlannedSignalBulkImportAcceptedDomainGroup,
  type PlannedSignalBulkImportAcceptedRow,
  type PlannedSignalBulkImportRejectedRow,
  type SignalBulkImportPlanResult,
  type SignalBulkImportPlannerAssessmentVersion,
  type SignalBulkImportPlannerExistingDomain,
  type SignalBulkImportPlannerExistingSignal,
} from '@/lib/server/admin-signal-bulk-import-plan';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release(): void;
};

type SignalBulkImportDependencies = {
  connect(): Promise<TransactionClient>;
  db: Queryable;
  revalidatePath(path: string): void;
};

type SignalBulkImportTargetVersionRow = {
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: SignalBulkImportPlannerAssessmentVersion['lifecycleStatus'];
};

type SignalBulkImportDomainRow = {
  domain_id: string;
  domain_key: string;
  label: string;
  order_index: string | number;
  domain_type: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
};

type SignalBulkImportSignalRow = {
  signal_id: string;
  domain_id: string;
  signal_key: string;
  label: string;
  order_index: string | number;
};

type InsertedSignalRow = {
  id: string;
  signal_key: string;
  label: string;
  description: string | null;
  order_index: string | number;
};

export type SignalBulkImportCommand = {
  assessmentVersionId: string;
  rawInput: string;
};

export type ExecutedSignalBulkImportRecord = {
  signalId: string;
  domainId: string;
  domainKey: string;
  domainLabel: string;
  signalKey: string;
  label: string;
  description: string | null;
  orderIndex: number;
};

export type ExecutedSignalBulkImportDomainGroup = {
  domainId: string;
  domainKey: string;
  domainLabel: string;
  createdCount: number;
  rows: ExecutedSignalBulkImportRecord[];
};

export type SignalBulkImportExecutionSummary = {
  assessmentVersionId: string;
  lifecycleStatus: SignalBulkImportPlannerAssessmentVersion['lifecycleStatus'];
  importedCount: number;
  rejectedCount: number;
  basedOn: SignalBulkImportPlanResult['summary']['basedOn'];
  perDomainCreateCounts: SignalBulkImportPlanResult['summary']['perDomainCreateCounts'];
};

export type SignalBulkImportExecutionResult = {
  ok: boolean;
  canImport: boolean;
  didImport: boolean;
  assessmentVersionId: string;
  importedCount: number;
  rejectedCount: number;
  created: ExecutedSignalBulkImportRecord[];
  createdByDomain: ExecutedSignalBulkImportDomainGroup[];
  accepted: PlannedSignalBulkImportAcceptedRow[];
  acceptedByDomain: PlannedSignalBulkImportAcceptedDomainGroup[];
  rejected: PlannedSignalBulkImportRejectedRow[];
  summary: SignalBulkImportExecutionSummary;
  executionError: string | null;
};

function assessmentAuthoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
}

export async function executeSignalBulkImport(
  command: SignalBulkImportCommand,
): Promise<SignalBulkImportExecutionResult> {
  const db = getDbPool();
  return executeSignalBulkImportWithDependencies(command, {
    db,
    connect: () => db.connect(),
    revalidatePath,
  });
}

export async function executeSignalBulkImportWithDependencies(
  command: SignalBulkImportCommand,
  dependencies: SignalBulkImportDependencies,
): Promise<SignalBulkImportExecutionResult> {
  const preview = await buildSignalImportPreview(dependencies.db, command);
  if (!preview.plan.canImport || preview.plan.accepted.length === 0) {
    return buildExecutionResult({
      assessmentVersionId: command.assessmentVersionId,
      lifecycleStatus: preview.assessmentVersion?.lifecycleStatus ?? 'ARCHIVED',
      canImport: preview.plan.canImport,
      didImport: false,
      created: [],
      createdByDomain: [],
      accepted: preview.plan.accepted,
      acceptedByDomain: preview.plan.acceptedByDomain,
      rejected: preview.plan.rejected,
      basedOn: preview.plan.summary.basedOn,
      perDomainCreateCounts: preview.plan.summary.perDomainCreateCounts,
      executionError: null,
    });
  }

  let client: TransactionClient | null = null;

  try {
    client = await dependencies.connect();
    await client.query('BEGIN');

    const livePreview = await buildSignalImportPreview(client, command);
    if (!livePreview.plan.canImport || livePreview.plan.accepted.length === 0) {
      await client.query('ROLLBACK');
      return buildExecutionResult({
        assessmentVersionId: command.assessmentVersionId,
        lifecycleStatus: livePreview.assessmentVersion?.lifecycleStatus ?? 'ARCHIVED',
        canImport: livePreview.plan.canImport,
        didImport: false,
        created: [],
        createdByDomain: [],
        accepted: livePreview.plan.accepted,
        acceptedByDomain: livePreview.plan.acceptedByDomain,
        rejected: livePreview.plan.rejected,
        basedOn: livePreview.plan.summary.basedOn,
        perDomainCreateCounts: livePreview.plan.summary.perDomainCreateCounts,
        executionError: null,
      });
    }

    const created = await insertPlannedSignals(client, {
      assessmentVersionId: livePreview.assessmentVersion!.assessmentVersionId,
      accepted: livePreview.plan.accepted,
    });
    await client.query('COMMIT');
    dependencies.revalidatePath(assessmentAuthoringPath(livePreview.assessmentVersion!.assessmentKey));

    return buildExecutionResult({
      assessmentVersionId: livePreview.assessmentVersion!.assessmentVersionId,
      lifecycleStatus: livePreview.assessmentVersion!.lifecycleStatus,
      canImport: false,
      didImport: true,
      created,
      createdByDomain: groupCreatedByDomain(created),
      accepted: livePreview.plan.accepted,
      acceptedByDomain: livePreview.plan.acceptedByDomain,
      rejected: livePreview.plan.rejected,
      basedOn: livePreview.plan.summary.basedOn,
      perDomainCreateCounts: livePreview.plan.summary.perDomainCreateCounts,
      executionError: null,
    });
  } catch {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    return buildExecutionResult({
      assessmentVersionId: command.assessmentVersionId,
      lifecycleStatus: preview.assessmentVersion?.lifecycleStatus ?? 'ARCHIVED',
      canImport: false,
      didImport: false,
      created: [],
      createdByDomain: [],
      accepted: preview.plan.accepted,
      acceptedByDomain: preview.plan.acceptedByDomain,
      rejected: preview.plan.rejected,
      basedOn: preview.plan.summary.basedOn,
      perDomainCreateCounts: preview.plan.summary.perDomainCreateCounts,
      executionError: 'Signal bulk import could not be saved. Try again.',
    });
  } finally {
    client?.release();
  }
}

async function buildSignalImportPreview(
  db: Queryable,
  command: SignalBulkImportCommand,
): Promise<{
  assessmentVersion: (SignalBulkImportPlannerAssessmentVersion & { assessmentKey: string }) | null;
  plan: SignalBulkImportPlanResult;
}> {
  const assessmentVersion = await loadAssessmentVersionForImport(db, command.assessmentVersionId);
  const existingDomains = assessmentVersion
    ? await loadExistingDomainsForImport(db, assessmentVersion.assessmentVersionId)
    : [];
  const existingSignals = assessmentVersion
    ? await loadExistingSignalsForImport(db, assessmentVersion.assessmentVersionId)
    : [];
  const parserResult = parseSignalBulkImport({
    input: command.rawInput,
    existingDomains: toParserExistingDomains(existingDomains),
    existingSignals: toParserExistingSignals(existingSignals),
  });

  return {
    assessmentVersion,
    plan: planSignalBulkImport({
      assessmentVersion: assessmentVersion ?? {
        assessmentVersionId: command.assessmentVersionId,
        lifecycleStatus: 'ARCHIVED',
      },
      existingDomains,
      existingSignals,
      parserResult,
    }),
  };
}

async function loadAssessmentVersionForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<(SignalBulkImportPlannerAssessmentVersion & { assessmentKey: string }) | null> {
  const result = await db.query<SignalBulkImportTargetVersionRow>(
    `
    SELECT
      a.assessment_key,
      av.id AS assessment_version_id,
      av.lifecycle_status
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );

  const row = result.rows[0] ?? null;
  if (!row) {
    return null;
  }

  return {
    assessmentKey: row.assessment_key,
    assessmentVersionId: row.assessment_version_id,
    lifecycleStatus: row.lifecycle_status,
  };
}

async function loadExistingDomainsForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly SignalBulkImportPlannerExistingDomain[]> {
  const result = await db.query<SignalBulkImportDomainRow>(
    `
    SELECT
      id AS domain_id,
      domain_key,
      label,
      order_index,
      domain_type
    FROM domains
    WHERE assessment_version_id = $1
    ORDER BY order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return result.rows.map((row) => ({
    domainId: row.domain_id,
    domainKey: row.domain_key,
    label: row.label,
    orderIndex: Number(row.order_index),
    domainType: row.domain_type,
  }));
}

async function loadExistingSignalsForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly SignalBulkImportPlannerExistingSignal[]> {
  const result = await db.query<SignalBulkImportSignalRow>(
    `
    SELECT
      id AS signal_id,
      domain_id,
      signal_key,
      label,
      order_index
    FROM signals
    WHERE assessment_version_id = $1
    ORDER BY domain_id ASC, order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return result.rows.map((row) => ({
    signalId: row.signal_id,
    domainId: row.domain_id,
    signalKey: row.signal_key,
    label: row.label,
    orderIndex: Number(row.order_index),
  }));
}

function toParserExistingDomains(
  domains: readonly SignalBulkImportPlannerExistingDomain[],
): readonly SignalBulkImportExistingDomain[] {
  return domains
    .filter((domain) => domain.domainType === 'SIGNAL_GROUP')
    .map((domain) => ({
      domainId: domain.domainId,
      domainKey: domain.domainKey,
      label: domain.label,
    }));
}

function toParserExistingSignals(
  signals: readonly SignalBulkImportPlannerExistingSignal[],
): readonly SignalBulkImportExistingSignal[] {
  return signals.map((signal) => ({
    signalId: signal.signalId,
    domainId: signal.domainId,
    signalKey: signal.signalKey,
    label: signal.label,
  }));
}

async function insertPlannedSignals(
  db: Queryable,
  params: {
    assessmentVersionId: string;
    accepted: readonly PlannedSignalBulkImportAcceptedRow[];
  },
): Promise<ExecutedSignalBulkImportRecord[]> {
  const created: ExecutedSignalBulkImportRecord[] = [];

  for (const row of params.accepted) {
    const result = await db.query<InsertedSignalRow>(
      `
      INSERT INTO signals (
        assessment_version_id,
        domain_id,
        signal_key,
        label,
        description,
        order_index,
        is_overlay
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      RETURNING id, signal_key, label, description, order_index
      `,
      [params.assessmentVersionId, row.domainId, row.signalKey, row.label, row.description, row.orderIndex],
    );

    const inserted = result.rows[0];
    if (!inserted) {
      throw new Error('SIGNAL_INSERT_FAILED');
    }

    created.push({
      signalId: inserted.id,
      domainId: row.domainId,
      domainKey: row.domainKey,
      domainLabel: row.domainLabel,
      signalKey: inserted.signal_key,
      label: inserted.label,
      description: inserted.description,
      orderIndex: Number(inserted.order_index),
    });
  }

  return created;
}

function groupCreatedByDomain(
  rows: readonly ExecutedSignalBulkImportRecord[],
): ExecutedSignalBulkImportDomainGroup[] {
  const groups = new Map<string, ExecutedSignalBulkImportDomainGroup>();

  for (const row of rows) {
    const existingGroup = groups.get(row.domainId);
    if (existingGroup) {
      existingGroup.rows.push(row);
      existingGroup.createdCount += 1;
      continue;
    }

    groups.set(row.domainId, {
      domainId: row.domainId,
      domainKey: row.domainKey,
      domainLabel: row.domainLabel,
      createdCount: 1,
      rows: [row],
    });
  }

  return [...groups.values()].sort(
    (left, right) => left.domainLabel.localeCompare(right.domainLabel) || left.domainId.localeCompare(right.domainId),
  );
}

function buildExecutionResult(params: {
  assessmentVersionId: string;
  lifecycleStatus: SignalBulkImportPlannerAssessmentVersion['lifecycleStatus'];
  canImport: boolean;
  didImport: boolean;
  created: ExecutedSignalBulkImportRecord[];
  createdByDomain: ExecutedSignalBulkImportDomainGroup[];
  accepted: PlannedSignalBulkImportAcceptedRow[];
  acceptedByDomain: PlannedSignalBulkImportAcceptedDomainGroup[];
  rejected: PlannedSignalBulkImportRejectedRow[];
  basedOn: SignalBulkImportPlanResult['summary']['basedOn'];
  perDomainCreateCounts: SignalBulkImportPlanResult['summary']['perDomainCreateCounts'];
  executionError: string | null;
}): SignalBulkImportExecutionResult {
  return {
    ok: params.executionError === null && (params.didImport || params.rejected.length === 0),
    canImport: params.canImport,
    didImport: params.didImport,
    assessmentVersionId: params.assessmentVersionId,
    importedCount: params.created.length,
    rejectedCount: params.rejected.length,
    created: params.created,
    createdByDomain: params.createdByDomain,
    accepted: params.accepted,
    acceptedByDomain: params.acceptedByDomain,
    rejected: params.rejected,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
      lifecycleStatus: params.lifecycleStatus,
      importedCount: params.created.length,
      rejectedCount: params.rejected.length,
      basedOn: params.basedOn,
      perDomainCreateCounts: params.perDomainCreateCounts,
    },
    executionError: params.executionError,
  };
}
