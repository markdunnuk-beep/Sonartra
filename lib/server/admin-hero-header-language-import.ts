'use server';

import { revalidatePath } from 'next/cache';

import {
  buildHeroHeaderLanguageStoragePlan,
  parseHeroHeaderLanguageRows,
  validateHeroHeaderLanguageRows,
} from '@/lib/admin/hero-header-language-import';
import type { AdminHeroHeaderPreviewGroup } from '@/lib/admin/admin-hero-header-language-import';
import {
  getAssessmentVersionLanguageHeroHeaders,
  replaceAssessmentVersionLanguageHeroHeaders,
} from '@/lib/server/assessment-version-language';
import { getDbPool } from '@/lib/server/db';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type Dependencies = {
  db: Queryable & {
    connect(): Promise<Queryable & { release(): void }>;
  };
  revalidatePath(path: string): void;
};

type PreviewDependencies = {
  db: Queryable;
};

type AssessmentVersionRow = {
  assessment_key: string;
  assessment_version_id: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type SignalRow = {
  signal_key: string;
};

type AssessmentVersionImportTarget = {
  assessmentVersionId: string;
  assessmentKey: string;
  lifecycleStatus: AssessmentVersionRow['lifecycle_status'];
};

export type HeroHeaderImportCommand = {
  assessmentVersionId: string;
  rawInput: string;
};

export type HeroHeaderImportResult = {
  success: boolean;
  canImport: boolean;
  parseErrors: ReturnType<typeof parseHeroHeaderLanguageRows>['errors'];
  validationErrors: ReturnType<typeof validateHeroHeaderLanguageRows>['errors'];
  planErrors: readonly {
    code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
    message: string;
  }[];
  previewGroups: readonly AdminHeroHeaderPreviewGroup[];
  summary: {
    assessmentVersionId: string | null;
    rowCount: number;
    targetCount: number;
    existingRowCount: number;
    importedRowCount: number;
    importedTargetCount: number;
  };
  executionError: string | null;
};

function authoringPath(assessmentKey: string): string {
  return `/admin/assessments/${assessmentKey}/language`;
}

export async function previewHeroHeaderLanguageForAssessmentVersion(
  command: HeroHeaderImportCommand,
): Promise<HeroHeaderImportResult> {
  return previewHeroHeaderLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
  });
}

export async function previewHeroHeaderLanguageForAssessmentVersionWithDependencies(
  command: HeroHeaderImportCommand,
  dependencies: PreviewDependencies,
): Promise<HeroHeaderImportResult> {
  const parsed = parseHeroHeaderLanguageRows(command.rawInput);
  if (parsed.errors.length > 0) {
    return buildResult({
      assessmentVersionId: command.assessmentVersionId,
      parseErrors: parsed.errors,
      validationErrors: [],
      planErrors: [],
      previewGroups: [],
      existingRowCount: 0,
    });
  }

  const assessmentVersion = await loadAssessmentVersionForImport(dependencies.db, command.assessmentVersionId);
  const authoredSignals = await loadTargetSignalsForImport(dependencies.db, command.assessmentVersionId);
  const validation = validateHeroHeaderLanguageRows({
    rows: parsed.records,
    validSignalKeys: authoredSignals,
  });
  const planErrors = buildPlanErrors(assessmentVersion, authoredSignals.length);
  const existingRowCount = await loadExistingRowCount(
    dependencies.db,
    assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
  );

  if (validation.errors.length > 0 || planErrors.length > 0) {
    return buildResult({
      assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
      parseErrors: [],
      validationErrors: validation.errors,
      planErrors,
      previewGroups: [],
      existingRowCount,
      rowCount: parsed.records.length,
      targetCount: new Set(parsed.records.map((row) => row.key)).size,
    });
  }

  return buildResult({
    assessmentVersionId: assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
    parseErrors: [],
    validationErrors: [],
    planErrors: [],
    previewGroups: buildPreviewGroups(validation.validRows),
    existingRowCount,
    rowCount: validation.validRows.length,
    targetCount: new Set(validation.validRows.map((row) => row.canonicalPairKey)).size,
  });
}

export async function importHeroHeaderLanguageForAssessmentVersion(
  command: HeroHeaderImportCommand,
): Promise<HeroHeaderImportResult> {
  return importHeroHeaderLanguageForAssessmentVersionWithDependencies(command, {
    db: getDbPool(),
    revalidatePath,
  });
}

export async function importHeroHeaderLanguageForAssessmentVersionWithDependencies(
  command: HeroHeaderImportCommand,
  dependencies: Dependencies,
): Promise<HeroHeaderImportResult> {
  const preview = await previewHeroHeaderLanguageForAssessmentVersionWithDependencies(command, {
    db: dependencies.db,
  });

  if (!preview.canImport) {
    return preview;
  }

  const assessmentVersion = await loadAssessmentVersionForImport(dependencies.db, command.assessmentVersionId);
  if (!assessmentVersion) {
    return {
      ...preview,
      success: false,
      canImport: false,
      planErrors: buildPlanErrors(null, preview.summary.targetCount),
    };
  }

  try {
    const parsed = parseHeroHeaderLanguageRows(command.rawInput);
    const validation = validateHeroHeaderLanguageRows({
      rows: parsed.records,
      validSignalKeys: await loadTargetSignalsForImport(dependencies.db, command.assessmentVersionId),
    });

    await replaceAssessmentVersionLanguageHeroHeaders(dependencies.db, {
      assessmentVersionId: assessmentVersion.assessmentVersionId,
      inputs: buildHeroHeaderLanguageStoragePlan(validation.validRows),
    });

    dependencies.revalidatePath('/admin/assessments');
    dependencies.revalidatePath(authoringPath(assessmentVersion.assessmentKey));

    return {
      ...preview,
      success: true,
      canImport: false,
      summary: {
        ...preview.summary,
        assessmentVersionId: assessmentVersion.assessmentVersionId,
        importedRowCount: validation.validRows.length,
        importedTargetCount: new Set(validation.validRows.map((row) => row.canonicalPairKey)).size,
      },
    };
  } catch {
    return {
      ...preview,
      success: false,
      canImport: false,
      executionError: 'Hero Header import could not be saved. Try again.',
    };
  }
}

async function loadAssessmentVersionForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<AssessmentVersionImportTarget | null> {
  const result = await db.query<AssessmentVersionRow>(
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
    assessmentVersionId: row.assessment_version_id,
    assessmentKey: row.assessment_key,
    lifecycleStatus: row.lifecycle_status,
  };
}

async function loadTargetSignalsForImport(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly string[]> {
  const result = await db.query<SignalRow>(
    `
    SELECT
      s.signal_key
    FROM signals s
    INNER JOIN domains d
      ON d.id = s.domain_id
      AND d.assessment_version_id = s.assessment_version_id
    WHERE s.assessment_version_id = $1
    ORDER BY d.order_index ASC, s.order_index ASC, s.id ASC
    `,
    [assessmentVersionId],
  );

  return result.rows.map((row) => row.signal_key);
}

async function loadExistingRowCount(
  db: Queryable,
  assessmentVersionId: string,
): Promise<number> {
  return (await getAssessmentVersionLanguageHeroHeaders(db, assessmentVersionId)).length;
}

function buildPlanErrors(
  assessmentVersion: AssessmentVersionImportTarget | null,
  signalCount: number,
): readonly {
  code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
  message: string;
}[] {
  const errors: Array<{
    code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
    message: string;
  }> = [];

  if (!assessmentVersion) {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_FOUND',
      message: 'The selected assessment version could not be found.',
    });
    return errors;
  }

  if (assessmentVersion.lifecycleStatus !== 'DRAFT') {
    errors.push({
      code: 'ASSESSMENT_VERSION_NOT_EDITABLE',
      message: 'Hero Header can be edited only for draft assessment versions.',
    });
  }

  if (signalCount === 0) {
    errors.push({
      code: 'SIGNAL_SET_EMPTY',
      message: 'The active assessment version does not contain any authored signals for Hero Header authoring.',
    });
  }

  return errors;
}

function buildPreviewGroups(
  rows: readonly ReturnType<typeof validateHeroHeaderLanguageRows>['validRows'][number][],
): readonly AdminHeroHeaderPreviewGroup[] {
  return [...new Map(rows.map((row) => [
    row.canonicalPairKey,
    {
      targetKey: row.canonicalPairKey,
      targetLabel: row.canonicalPairKey,
      entries: [{ lineNumber: row.lineNumber, headline: row.headline }],
    },
  ])).values()].sort((left, right) => left.targetKey.localeCompare(right.targetKey));
}

function buildResult(params: {
  assessmentVersionId: string | null;
  parseErrors: ReturnType<typeof parseHeroHeaderLanguageRows>['errors'];
  validationErrors: ReturnType<typeof validateHeroHeaderLanguageRows>['errors'];
  planErrors: readonly {
    code: 'ASSESSMENT_VERSION_NOT_FOUND' | 'ASSESSMENT_VERSION_NOT_EDITABLE' | 'SIGNAL_SET_EMPTY';
    message: string;
  }[];
  previewGroups: readonly AdminHeroHeaderPreviewGroup[];
  existingRowCount: number;
  rowCount?: number;
  targetCount?: number;
}): HeroHeaderImportResult {
  const rowCount = params.rowCount ?? 0;
  const targetCount = params.targetCount ?? 0;
  const success =
    params.parseErrors.length === 0 &&
    params.validationErrors.length === 0 &&
    params.planErrors.length === 0;

  return {
    success,
    canImport: success,
    parseErrors: params.parseErrors,
    validationErrors: params.validationErrors,
    planErrors: params.planErrors,
    previewGroups: params.previewGroups,
    summary: {
      assessmentVersionId: params.assessmentVersionId,
      rowCount,
      targetCount,
      existingRowCount: params.existingRowCount,
      importedRowCount: 0,
      importedTargetCount: 0,
    },
    executionError: null,
  };
}
