'use server';

import { revalidatePath } from 'next/cache';

import { parseDomainBulkImport, type DomainBulkImportExistingDomain } from '@/lib/admin/domain-bulk-import';
import {
  planDomainBulkImport,
  type DomainBulkImportPlanResult,
  type DomainBulkImportPlannerAssessmentVersion,
  type DomainBulkImportPlannerExistingDomain,
  type PlannedDomainBulkImportAcceptedRow,
  type PlannedDomainBulkImportRejectedRow,
} from '@/lib/server/admin-domain-bulk-import-plan';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type TransactionClient = Queryable & {
  release(): void;
};

type DomainBulkImportDependencies = {
  connect(): Promise<TransactionClient>;
  db: Queryable;
  revalidatePath(path: string): void;
};

type DomainBulkImportTargetVersionRow = {
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: DomainBulkImportPlannerAssessmentVersion['lifecycleStatus'];
};

type DomainBulkImportExistingDomainRow = {
  domain_id: string;
  domain_key: string;
  label: string;
  order_index: string | number;
  domain_type: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
};

type InsertedDomainRow = {
  id: string;
  domain_key: string;
  label: string;
  description: string | null;
  order_index: string | number;
};

export type DomainBulkImportCommand = {
  assessmentVersionId: string;
  rawInput: string;
};

export type ExecutedDomainBulkImportRecord = {
  domainId: string;
  domainKey: string;
  label: string;
  description: string | null;
  orderIndex: number;
};

export type DomainBulkImportExecutionSummary = {
  assessmentVersionId: string;
  lifecycleStatus: DomainBulkImportPlannerAssessmentVersion['lifecycleStatus'];
  importedCount: number;
  rejectedCount: number;
  basedOn: DomainBulkImportPlanResult['summary']['basedOn'];
};

export type DomainBulkImportExecutionResult = {
  ok: boolean;
  canImport: boolean;
  didImport: boolean;
  assessmentVersionId: string;
  importedCount: number;
  rejectedCount: number;
  created: ExecutedDomainBulkImportRecord[];
  accepted: PlannedDomainBulkImportAcceptedRow[];
  rejected: PlannedDomainBulkImportRejectedRow[];
  summary: DomainBulkImportExecutionSummary;
  executionError: string | null;
};

function assessmentAuthoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}`;
}

export async function executeDomainBulkImport(
  command: DomainBulkImportCommand,
): Promise<DomainBulkImportExecutionResult> {
  const db = getDbPool();
  return executeDomainBulkImportWithDependencies(command, {
    db,
    connect: () => db.connect(),
    revalidatePath,
  });
}

export async function previewDomainBulkImport(
  command: DomainBulkImportCommand,
): Promise<DomainBulkImportExecutionResult> {
  return previewDomainBulkImportWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewDomainBulkImportWithDependencies(
  command: DomainBulkImportCommand,
  dependencies: { db: Queryable },
): Promise<DomainBulkImportExecutionResult> {
  const preview = await buildDomainImportPreview(dependencies.db, command);
  return buildExecutionResult({
    assessmentVersionId: command.assessmentVersionId,
    lifecycleStatus: preview.assessmentVersion?.lifecycleStatus ?? 'ARCHIVED',
    canImport: preview.plan.canImport,
    didImport: false,
    created: [],
    accepted: preview.plan.accepted,
    rejected: preview.plan.rejected,
    basedOn: preview.plan.summary.basedOn,
    executionError: null,
  });
}

export async function executeDomainBulkImportWithDependencies(
  command: DomainBulkImportCommand,
  dependencies: DomainBulkImportDependencies,
): Promise<DomainBulkImportExecutionResult> {
  const preview = await buildDomainImportPreview(dependencies.db, command);
  if (!preview.plan.canImport || preview.plan.accepted.length === 0) {
    return buildExecutionResult({
      assessmentVersionId: command.assessmentVersionId,
      lifecycleStatus: preview.assessmentVersion?.lifecycleStatus ?? 'ARCHIVED',
      canImport: preview.plan.canImport,
      didImport: false,
      created: [],
      accepted: preview.plan.accepted,
      rejected: preview.plan.rejected,
      basedOn: preview.plan.summary.basedOn,
      executionError: null,
    });
  }

  let client: TransactionClient | null = null;

  try {
    client = await dependencies.connect();
    await client.query('BEGIN');

    const livePreview = await buildDomainImportPreview(client, command);
    if (!livePreview.plan.canImport || livePreview.plan.accepted.length === 0) {
      await client.query('ROLLBACK');
      return buildExecutionResult({
        assessmentVersionId: command.assessmentVersionId,
        lifecycleStatus: livePreview.assessmentVersion?.lifecycleStatus ?? 'ARCHIVED',
        canImport: livePreview.plan.canImport,
        didImport: false,
        created: [],
        accepted: livePreview.plan.accepted,
        rejected: livePreview.plan.rejected,
        basedOn: livePreview.plan.summary.basedOn,
        executionError: null,
      });
    }

    const created = await insertPlannedDomains(client, {
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
      accepted: livePreview.plan.accepted,
      rejected: livePreview.plan.rejected,
      basedOn: livePreview.plan.summary.basedOn,
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
      accepted: preview.plan.accepted,
      rejected: preview.plan.rejected,
      basedOn: preview.plan.summary.basedOn,
      executionError: 'Domain bulk import could not be saved. Try again.',
    });
  } finally {
    client?.release();
  }
}

async function buildDomainImportPreview(
  db: Queryable,
  command: DomainBulkImportCommand,
): Promise<{
  assessmentVersion: (DomainBulkImportPlannerAssessmentVersion & { assessmentKey: string }) | null;
  plan: DomainBulkImportPlanResult;
}> {
  const assessmentVersion = await loadAssessmentVersionForImport(db, command.assessmentVersionId);
  const existingDomains = assessmentVersion
    ? await loadExistingDomainsForImport(db, assessmentVersion.assessmentVersionId)
    : [];
  const parserResult = parseDomainBulkImport({
    input: command.rawInput,
    existingDomains: toParserExistingDomains(existingDomains),
  });

  return {
    assessmentVersion,
    plan: planDomainBulkImport({
      assessmentVersion: assessmentVersion ?? {
        assessmentVersionId: command.assessmentVersionId,
        lifecycleStatus: 'ARCHIVED',
      },
      existingDomains,
      parserResult,
    }),
  };
}

async function loadAssessmentVersionForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<(DomainBulkImportPlannerAssessmentVersion & { assessmentKey: string }) | null> {
  const result = await db.query<DomainBulkImportTargetVersionRow>(
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
): Promise<readonly DomainBulkImportPlannerExistingDomain[]> {
  const result = await db.query<DomainBulkImportExistingDomainRow>(
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

function toParserExistingDomains(
  domains: readonly DomainBulkImportPlannerExistingDomain[],
): readonly DomainBulkImportExistingDomain[] {
  return domains
    .filter((domain) => domain.domainType === 'SIGNAL_GROUP')
    .map((domain) => ({
      domainId: domain.domainId,
      domainKey: domain.domainKey,
      label: domain.label,
    }));
}

async function insertPlannedDomains(
  db: Queryable,
  params: {
    assessmentVersionId: string;
    accepted: readonly PlannedDomainBulkImportAcceptedRow[];
  },
): Promise<ExecutedDomainBulkImportRecord[]> {
  const created: ExecutedDomainBulkImportRecord[] = [];

  for (const row of params.accepted) {
    const result = await db.query<InsertedDomainRow>(
      `
      INSERT INTO domains (
        assessment_version_id,
        domain_key,
        label,
        description,
        domain_type,
        order_index
      )
      VALUES ($1, $2, $3, $4, 'SIGNAL_GROUP', $5)
      RETURNING id, domain_key, label, description, order_index
      `,
      [params.assessmentVersionId, row.domainKey, row.label, row.description, row.orderIndex],
    );

    const inserted = result.rows[0];
    if (!inserted) {
      throw new Error('DOMAIN_INSERT_FAILED');
    }

    created.push({
      domainId: inserted.id,
      domainKey: inserted.domain_key,
      label: inserted.label,
      description: inserted.description,
      orderIndex: Number(inserted.order_index),
    });
  }

  return created;
}

function buildExecutionResult(params: {
  assessmentVersionId: string;
  lifecycleStatus: DomainBulkImportPlannerAssessmentVersion['lifecycleStatus'];
  canImport: boolean;
  didImport: boolean;
  created: ExecutedDomainBulkImportRecord[];
  accepted: PlannedDomainBulkImportAcceptedRow[];
  rejected: PlannedDomainBulkImportRejectedRow[];
  basedOn: DomainBulkImportPlanResult['summary']['basedOn'];
  executionError: string | null;
}): DomainBulkImportExecutionResult {
  return {
    ok: params.executionError === null && (params.didImport || params.rejected.length === 0),
    canImport: params.canImport,
    didImport: params.didImport,
    assessmentVersionId: params.assessmentVersionId,
    importedCount: params.created.length,
    rejectedCount: params.rejected.length,
    created: params.created,
    accepted: params.accepted,
    rejected: params.rejected,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
      lifecycleStatus: params.lifecycleStatus,
      importedCount: params.created.length,
      rejectedCount: params.rejected.length,
      basedOn: params.basedOn,
    },
    executionError: params.executionError,
  };
}
