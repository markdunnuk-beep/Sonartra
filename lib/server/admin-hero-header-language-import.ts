'use server';

import { revalidatePath } from 'next/cache';

import {
  buildHeroHeaderLanguageStoragePlan,
  parseHeroHeaderLanguageRows,
  validateHeroHeaderLanguageRows,
} from '@/lib/admin/hero-header-language-import';
import type { AdminLanguageDatasetImportPreviewGroup } from '@/lib/admin/admin-language-dataset-import';
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

type TableExistsRow = {
  present: boolean;
};

export type HeroHeaderImportPlanError = {
  code:
    | 'ASSESSMENT_VERSION_NOT_FOUND'
    | 'ASSESSMENT_VERSION_NOT_EDITABLE'
    | 'SIGNAL_SET_EMPTY'
    | 'HERO_HEADER_TABLE_UNAVAILABLE';
  message: string;
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
  planErrors: readonly HeroHeaderImportPlanError[];
  previewGroups: readonly AdminLanguageDatasetImportPreviewGroup[];
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

  const [assessmentVersion, authoredSignals, heroHeaderTableAvailable] = await Promise.all([
    loadAssessmentVersionForImport(dependencies.db, command.assessmentVersionId),
    loadTargetSignalsForImport(dependencies.db, command.assessmentVersionId),
    isHeroHeaderLanguageTableAvailable(dependencies.db),
  ]);
  const validation = validateHeroHeaderLanguageRows({
    rows: parsed.records,
    validSignalKeys: authoredSignals,
  });
  const planErrors = buildPlanErrors(assessmentVersion, authoredSignals.length, heroHeaderTableAvailable);
  const existingRowCount = heroHeaderTableAvailable
    ? await loadExistingRowCount(
        dependencies.db,
        assessmentVersion?.assessmentVersionId ?? command.assessmentVersionId,
      )
    : 0;

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
      planErrors: buildPlanErrors(null, preview.summary.targetCount, true),
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
  } catch (error) {
    return {
      ...preview,
      success: false,
      canImport: false,
      executionError: getHeroHeaderImportExecutionError(error),
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

async function isHeroHeaderLanguageTableAvailable(db: Queryable): Promise<boolean> {
  const result = await db.query<TableExistsRow>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'assessment_version_language_hero_headers'
    ) AS present
    `,
  );

  return result.rows[0]?.present === true;
}

function buildPlanErrors(
  assessmentVersion: AssessmentVersionImportTarget | null,
  signalCount: number,
  heroHeaderTableAvailable: boolean,
): readonly HeroHeaderImportPlanError[] {
  const errors: HeroHeaderImportPlanError[] = [];

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

  if (!heroHeaderTableAvailable) {
    errors.push({
      code: 'HERO_HEADER_TABLE_UNAVAILABLE',
      message: 'Hero Header table is missing in this environment. Run the hero header migration before importing.',
    });
  }

  return errors;
}

function isMissingRelationError(error: unknown, relationName: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  return (
    code === '42P01' ||
    (typeof error.message === 'string'
      && error.message.includes(relationName)
      && error.message.includes('does not exist'))
  );
}

function getHeroHeaderImportExecutionError(error: unknown): string {
  if (isMissingRelationError(error, 'assessment_version_language_hero_headers')) {
    return 'Hero Header table is missing in this environment. Run the hero header migration before importing.';
  }

  return 'Hero Header import could not be saved because the write failed. Review the import rows and try again.';
}

function buildPreviewGroups(
  rows: readonly ReturnType<typeof validateHeroHeaderLanguageRows>['validRows'][number][],
): readonly AdminLanguageDatasetImportPreviewGroup[] {
  return [...new Map(rows.map((row) => [
    row.canonicalPairKey,
    {
      targetKey: row.canonicalPairKey,
      targetLabel: row.canonicalPairKey,
      entries: [{ lineNumber: row.lineNumber, label: 'headline', content: row.headline }],
    },
  ])).values()].sort((left, right) => left.targetKey.localeCompare(right.targetKey));
}

function buildResult(params: {
  assessmentVersionId: string | null;
  parseErrors: ReturnType<typeof parseHeroHeaderLanguageRows>['errors'];
  validationErrors: ReturnType<typeof validateHeroHeaderLanguageRows>['errors'];
  planErrors: readonly HeroHeaderImportPlanError[];
  previewGroups: readonly AdminLanguageDatasetImportPreviewGroup[];
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
