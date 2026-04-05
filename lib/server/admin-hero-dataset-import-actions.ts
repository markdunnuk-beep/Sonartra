'use server';

import {
  buildHeroPairTraitWeightStoragePlan,
  parseHeroPairTraitWeightRows,
  validateHeroPairTraitWeightRows,
} from '@/lib/admin/hero-pair-trait-weight-import';
import {
  buildHeroPatternLanguageStoragePlan,
  parseHeroPatternLanguageRows,
  validateHeroPatternLanguageRows,
} from '@/lib/admin/hero-pattern-language-import';
import {
  buildHeroPatternRuleStoragePlan,
  parseHeroPatternRuleRows,
  validateHeroPatternRuleRows,
} from '@/lib/admin/hero-pattern-rule-import';
import {
  initialAdminHeroDatasetImportState,
  type AdminHeroDatasetImportIssue,
  type AdminHeroDatasetImportPreviewGroup,
  type AdminHeroDatasetImportState,
  type HeroImportDataset,
} from '@/lib/admin/admin-hero-dataset-import';
import { getDbPool } from '@/lib/server/db';
import {
  getAssessmentVersionHeroPatternLanguage,
  getAssessmentVersionHeroPatternRules,
  getAssessmentVersionPairTraitWeights,
  replaceAssessmentVersionHeroPatternLanguage,
  replaceAssessmentVersionHeroPatternRules,
  replaceAssessmentVersionPairTraitWeights,
} from '@/lib/server/assessment-version-hero';

type ActionContext = {
  assessmentVersionId: string;
};

type ActionValues = {
  dataset: HeroImportDataset;
  rawInput: string;
};

function normalizeIssues(
  issues: readonly { message: string }[],
  keyBuilder: (issue: { message: string }, index: number) => string,
): readonly AdminHeroDatasetImportIssue[] {
  return issues.map((issue, index) => ({
    key: keyBuilder(issue, index),
    message: issue.message,
  }));
}

function buildEmptyInputState(dataset: HeroImportDataset, rawInput: string): AdminHeroDatasetImportState {
  const noun =
    dataset === 'pairTraitWeight'
      ? 'pair-trait weight'
      : dataset === 'heroRule'
        ? 'Hero rule'
        : 'Hero language';

  return {
    ...initialAdminHeroDatasetImportState,
    dataset,
    rawInput,
    formError: `Paste one or more ${noun} rows before continuing.`,
  };
}

function buildPreviewGroups(
  dataset: HeroImportDataset,
  rows: readonly Record<string, unknown>[],
): readonly AdminHeroDatasetImportPreviewGroup[] {
  const grouped = new Map<string, { targetLabel: string; entries: AdminHeroDatasetImportPreviewGroup['entries'] }>();

  for (const row of rows) {
    const targetKey = String(row.targetKey ?? '');
    const targetLabel = String(row.targetLabel ?? targetKey);
    const existing = grouped.get(targetKey) ?? { targetLabel, entries: [] };
    existing.entries = [
      ...existing.entries,
      {
        lineNumber: Number(row.lineNumber ?? 0),
        label:
          dataset === 'pairTraitWeight'
            ? `${String(row.traitKey ?? 'trait')} (${String(row.weight ?? '')})`
            : String(row.label ?? row.ruleType ?? row.field ?? 'content'),
        content: String(row.content ?? row.description ?? row.rawLine ?? ''),
      },
    ];
    grouped.set(targetKey, existing);
  }

  return [...grouped.entries()].map(([targetKey, value]) => ({
    targetKey,
    targetLabel: value.targetLabel,
    entries: value.entries,
  }));
}

export async function importHeroDatasetAction(
  context: ActionContext,
  values: ActionValues,
): Promise<AdminHeroDatasetImportState> {
  if (!values.rawInput.trim()) {
    return buildEmptyInputState(values.dataset, values.rawInput);
  }

  const db = getDbPool();

  if (values.dataset === 'pairTraitWeight') {
    const parsed = parseHeroPairTraitWeightRows(values.rawInput);
    const validation = validateHeroPairTraitWeightRows({ rows: parsed.rows });
    const existingRows = await getAssessmentVersionPairTraitWeights(db, context.assessmentVersionId);

    if (parsed.errors.length > 0 || validation.errors.length > 0) {
      return {
        ...initialAdminHeroDatasetImportState,
        dataset: values.dataset,
        rawInput: values.rawInput,
        parseErrors: normalizeIssues(parsed.errors, (issue, index) => `parse-${index}-${issue.message}`),
        validationErrors: normalizeIssues(validation.errors, (issue, index) => `validation-${index}-${issue.message}`),
        summary: {
          assessmentVersionId: context.assessmentVersionId,
          rowCount: parsed.rows.length,
          targetCount: new Set(parsed.rows.map((row) => `${row.profileDomainKey}:${row.pairKey}`)).size,
          existingRowCount: existingRows.length,
          importedRowCount: 0,
          importedTargetCount: 0,
        },
        previewGroups: [],
        planErrors: [],
        executionError: null,
        formError: null,
        success: false,
      };
    }

    const storagePlan = buildHeroPairTraitWeightStoragePlan(validation.validRows);
    await replaceAssessmentVersionPairTraitWeights(db, {
      assessmentVersionId: context.assessmentVersionId,
      inputs: storagePlan,
    });

    return {
      ...initialAdminHeroDatasetImportState,
      dataset: values.dataset,
      rawInput: values.rawInput,
      success: true,
      previewGroups: buildPreviewGroups(
        values.dataset,
        validation.validRows.map((row) => ({
          targetKey: `${row.profileDomainKey}:${row.canonicalPairKey}`,
          targetLabel: `${row.profileDomainKey} / ${row.canonicalPairKey}`,
          lineNumber: row.lineNumber,
          traitKey: row.traitKey,
          weight: row.weight,
          rawLine: row.rawLine,
        })),
      ),
      summary: {
        assessmentVersionId: context.assessmentVersionId,
        rowCount: parsed.rows.length,
        targetCount: new Set(validation.validRows.map((row) => `${row.profileDomainKey}:${row.canonicalPairKey}`)).size,
        existingRowCount: existingRows.length,
        importedRowCount: storagePlan.length,
        importedTargetCount: new Set(storagePlan.map((row) => `${row.profileDomainKey}:${row.pairKey}`)).size,
      },
      parseErrors: [],
      validationErrors: [],
      planErrors: [],
      executionError: null,
      formError: null,
    };
  }

  if (values.dataset === 'heroRule') {
    const parsed = parseHeroPatternRuleRows(values.rawInput);
    const validation = validateHeroPatternRuleRows({ rows: parsed.rows });
    const existingRows = await getAssessmentVersionHeroPatternRules(db, context.assessmentVersionId);

    if (parsed.errors.length > 0 || validation.errors.length > 0) {
      return {
        ...initialAdminHeroDatasetImportState,
        dataset: values.dataset,
        rawInput: values.rawInput,
        parseErrors: normalizeIssues(parsed.errors, (issue, index) => `parse-${index}-${issue.message}`),
        validationErrors: normalizeIssues(validation.errors, (issue, index) => `validation-${index}-${issue.message}`),
        summary: {
          assessmentVersionId: context.assessmentVersionId,
          rowCount: parsed.rows.length,
          targetCount: new Set(parsed.rows.map((row) => row.patternKey)).size,
          existingRowCount: existingRows.length,
          importedRowCount: 0,
          importedTargetCount: 0,
        },
        previewGroups: [],
        planErrors: [],
        executionError: null,
        formError: null,
        success: false,
      };
    }

    const storagePlan = buildHeroPatternRuleStoragePlan(validation.validRows);
    await replaceAssessmentVersionHeroPatternRules(db, {
      assessmentVersionId: context.assessmentVersionId,
      inputs: storagePlan,
    });

    return {
      ...initialAdminHeroDatasetImportState,
      dataset: values.dataset,
      rawInput: values.rawInput,
      success: true,
      previewGroups: buildPreviewGroups(
        values.dataset,
        validation.validRows.map((row) => ({
          targetKey: row.patternKey,
          targetLabel: row.patternKey,
          lineNumber: row.lineNumber,
          ruleType: `${row.ruleType} ${row.traitKey} ${row.operator} ${row.thresholdValue}`,
          rawLine: row.rawLine,
        })),
      ),
      summary: {
        assessmentVersionId: context.assessmentVersionId,
        rowCount: parsed.rows.length,
        targetCount: new Set(validation.validRows.map((row) => row.patternKey)).size,
        existingRowCount: existingRows.length,
        importedRowCount: storagePlan.length,
        importedTargetCount: new Set(storagePlan.map((row) => row.patternKey)).size,
      },
      parseErrors: [],
      validationErrors: [],
      planErrors: [],
      executionError: null,
      formError: null,
    };
  }

  const parsed = parseHeroPatternLanguageRows(values.rawInput);
  const validation = validateHeroPatternLanguageRows({ rows: parsed.rows });
  const existingRows = await getAssessmentVersionHeroPatternLanguage(db, context.assessmentVersionId);

  if (parsed.errors.length > 0 || validation.errors.length > 0) {
    return {
      ...initialAdminHeroDatasetImportState,
      dataset: values.dataset,
      rawInput: values.rawInput,
      parseErrors: normalizeIssues(parsed.errors, (issue, index) => `parse-${index}-${issue.message}`),
      validationErrors: normalizeIssues(validation.errors, (issue, index) => `validation-${index}-${issue.message}`),
      summary: {
        assessmentVersionId: context.assessmentVersionId,
        rowCount: parsed.rows.length,
        targetCount: new Set(parsed.rows.map((row) => row.patternKey)).size,
        existingRowCount: existingRows.length,
        importedRowCount: 0,
        importedTargetCount: 0,
      },
      previewGroups: [],
      planErrors: [],
      executionError: null,
      formError: null,
      success: false,
    };
  }

  const storagePlan = buildHeroPatternLanguageStoragePlan(validation.validRows);
  await replaceAssessmentVersionHeroPatternLanguage(db, {
    assessmentVersionId: context.assessmentVersionId,
    inputs: storagePlan,
  });

  return {
    ...initialAdminHeroDatasetImportState,
    dataset: values.dataset,
    rawInput: values.rawInput,
    success: true,
    previewGroups: buildPreviewGroups(
      values.dataset,
      validation.validRows.map((row) => ({
        targetKey: row.patternKey,
        targetLabel: row.patternKey,
        lineNumber: row.lineNumber,
        label: row.field,
        content: row.content,
      })),
    ),
    summary: {
      assessmentVersionId: context.assessmentVersionId,
      rowCount: parsed.rows.length,
      targetCount: new Set(validation.validRows.map((row) => row.patternKey)).size,
      existingRowCount: existingRows.length,
      importedRowCount: storagePlan.length,
      importedTargetCount: storagePlan.length,
    },
    parseErrors: [],
    validationErrors: [],
    planErrors: [],
    executionError: null,
    formError: null,
  };
}
