import type { Queryable } from '@/lib/engine/repository-sql';
import {
  getAdminAssessmentDetailByKey,
  type AdminAssessmentDetailVersion,
} from '@/lib/server/admin-assessment-detail';
import {
  getAssessmentVersionHeroPatternLanguage,
  getAssessmentVersionHeroPatternRules,
  getAssessmentVersionPairTraitWeights,
} from '@/lib/server/assessment-version-hero';
import { getAssessmentVersionLanguageBundle } from '@/lib/server/assessment-version-language';

export type AdminAssessmentLanguageDatasetSummary = {
  entryCount: number;
};

export type AdminAssessmentLanguageDatasetCounts = {
  heroHeaders: AdminAssessmentLanguageDatasetSummary;
  signals: AdminAssessmentLanguageDatasetSummary;
  pairs: AdminAssessmentLanguageDatasetSummary;
  domains: AdminAssessmentLanguageDatasetSummary;
  applicationThesis: AdminAssessmentLanguageDatasetSummary;
  applicationContribution: AdminAssessmentLanguageDatasetSummary;
  applicationRisk: AdminAssessmentLanguageDatasetSummary;
  applicationDevelopment: AdminAssessmentLanguageDatasetSummary;
  applicationActionPrompts: AdminAssessmentLanguageDatasetSummary;
  pairTraitWeights: AdminAssessmentLanguageDatasetSummary;
  heroPatternRules: AdminAssessmentLanguageDatasetSummary;
  heroPatternLanguage: AdminAssessmentLanguageDatasetSummary;
};

export type AdminAssessmentLanguageActiveVersion = {
  assessmentVersionId: string;
  versionTag: string;
  status: 'draft' | 'published' | 'archived';
};

export type AdminAssessmentLanguageStepViewModel = {
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  assessmentDescription: string | null;
  activeVersion: AdminAssessmentLanguageActiveVersion | null;
  availableVersions: readonly {
    assessmentVersionId: string;
    versionTag: string;
    status: 'draft' | 'published' | 'archived';
  }[];
  languageSchemaStatus: 'available' | 'unavailable';
  languageSchemaMessage: string | null;
  counts: AdminAssessmentLanguageDatasetCounts;
};

const RECOVERABLE_LANGUAGE_STEP_SCHEMA_TABLES = [
  'assessment_version_language_',
  'assessment_version_application_',
  'assessment_version_pair_trait_weights',
  'assessment_version_hero_pattern_rules',
  'assessment_version_hero_pattern_language',
] as const;

function isRecoverableLanguageStepSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === '42P01' &&
    typeof message === 'string' &&
    RECOVERABLE_LANGUAGE_STEP_SCHEMA_TABLES.some((tableName) => message.includes(tableName))
  );
}

function toActiveVersion(
  version: AdminAssessmentDetailVersion | null,
): AdminAssessmentLanguageActiveVersion | null {
  if (!version) {
    return null;
  }

  return {
    assessmentVersionId: version.assessmentVersionId,
    versionTag: version.versionTag,
    status: version.status,
  };
}

function countEntriesByKey(bundle: Readonly<Record<string, unknown>>): number {
  return Object.keys(bundle).length;
}

function createEmptyCounts(): AdminAssessmentLanguageDatasetCounts {
  return {
    heroHeaders: { entryCount: 0 },
    signals: { entryCount: 0 },
    pairs: { entryCount: 0 },
    domains: { entryCount: 0 },
    applicationThesis: { entryCount: 0 },
    applicationContribution: { entryCount: 0 },
    applicationRisk: { entryCount: 0 },
    applicationDevelopment: { entryCount: 0 },
    applicationActionPrompts: { entryCount: 0 },
    pairTraitWeights: { entryCount: 0 },
    heroPatternRules: { entryCount: 0 },
    heroPatternLanguage: { entryCount: 0 },
  };
}

export async function getAdminAssessmentLanguageStepViewModel(
  db: Queryable,
  assessmentKey: string,
): Promise<AdminAssessmentLanguageStepViewModel | null> {
  const assessment = await getAdminAssessmentDetailByKey(db, assessmentKey);

  if (!assessment) {
    return null;
  }

  const resolvedVersion = assessment.latestDraftVersion ?? assessment.publishedVersion ?? null;

  if (!resolvedVersion) {
    return {
      assessmentId: assessment.assessmentId,
      assessmentKey: assessment.assessmentKey,
      assessmentTitle: assessment.title,
      assessmentDescription: assessment.description,
      activeVersion: null,
      availableVersions: assessment.versions.map((version) => ({
        assessmentVersionId: version.assessmentVersionId,
        versionTag: version.versionTag,
        status: version.status,
      })),
      languageSchemaStatus: 'available',
      languageSchemaMessage: null,
      counts: createEmptyCounts(),
    };
  }

  try {
    const [bundle, pairTraitWeights, heroPatternRules, heroPatternLanguage] = await Promise.all([
      getAssessmentVersionLanguageBundle(db, resolvedVersion.assessmentVersionId),
      getAssessmentVersionPairTraitWeights(db, resolvedVersion.assessmentVersionId),
      getAssessmentVersionHeroPatternRules(db, resolvedVersion.assessmentVersionId),
      getAssessmentVersionHeroPatternLanguage(db, resolvedVersion.assessmentVersionId),
    ]);

    return {
      assessmentId: assessment.assessmentId,
      assessmentKey: assessment.assessmentKey,
      assessmentTitle: assessment.title,
      assessmentDescription: assessment.description,
      activeVersion: toActiveVersion(resolvedVersion),
      availableVersions: assessment.versions.map((version) => ({
        assessmentVersionId: version.assessmentVersionId,
        versionTag: version.versionTag,
        status: version.status,
      })),
      languageSchemaStatus: 'available',
      languageSchemaMessage: null,
      counts: {
        heroHeaders: { entryCount: countEntriesByKey(bundle.heroHeaders ?? {}) },
        signals: { entryCount: countEntriesByKey(bundle.signals) },
        pairs: { entryCount: countEntriesByKey(bundle.pairs) },
        domains: { entryCount: countEntriesByKey(bundle.domains) },
        applicationThesis: { entryCount: bundle.application?.thesis.length ?? 0 },
        applicationContribution: { entryCount: bundle.application?.contribution.length ?? 0 },
        applicationRisk: { entryCount: bundle.application?.risk.length ?? 0 },
        applicationDevelopment: { entryCount: bundle.application?.development.length ?? 0 },
        applicationActionPrompts: { entryCount: bundle.application?.prompts.length ?? 0 },
        pairTraitWeights: { entryCount: pairTraitWeights.length },
        heroPatternRules: { entryCount: heroPatternRules.length },
        heroPatternLanguage: { entryCount: heroPatternLanguage.length },
      },
    };
  } catch (error) {
    if (!isRecoverableLanguageStepSchemaError(error)) {
      throw error;
    }

    return {
      assessmentId: assessment.assessmentId,
      assessmentKey: assessment.assessmentKey,
      assessmentTitle: assessment.title,
      assessmentDescription: assessment.description,
      activeVersion: toActiveVersion(resolvedVersion),
      availableVersions: assessment.versions.map((version) => ({
        assessmentVersionId: version.assessmentVersionId,
        versionTag: version.versionTag,
        status: version.status,
      })),
      languageSchemaStatus: 'unavailable',
      languageSchemaMessage:
        'Language datasets are unavailable for this environment. Apply the assessment version language migration before using this step.',
      counts: createEmptyCounts(),
    };
  }
}
