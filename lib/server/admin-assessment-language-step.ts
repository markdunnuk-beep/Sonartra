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
import { getAssessmentLanguage } from '@/lib/server/assessment-language-repository';
import { getAssessmentVersionLanguageBundle } from '@/lib/server/assessment-version-language';

export type AdminAssessmentLanguageDatasetSummary = {
  entryCount: number;
};

export type AdminAssessmentLanguageDatasetCounts = {
  assessment: AdminAssessmentLanguageDatasetSummary;
  heroHeaders: AdminAssessmentLanguageDatasetSummary;
  signals: AdminAssessmentLanguageDatasetSummary;
  pairs: AdminAssessmentLanguageDatasetSummary;
  domains: AdminAssessmentLanguageDatasetSummary;
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
  assessmentLanguageDescription: string | null;
  counts: AdminAssessmentLanguageDatasetCounts;
};

function isMissingLanguageSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === '42P01' &&
    typeof message === 'string' &&
    message.includes('assessment_version_language_')
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
    assessment: { entryCount: 0 },
    heroHeaders: { entryCount: 0 },
    signals: { entryCount: 0 },
    pairs: { entryCount: 0 },
    domains: { entryCount: 0 },
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
      assessmentLanguageDescription: null,
      counts: createEmptyCounts(),
    };
  }

  try {
    const [bundle, assessmentLanguage, pairTraitWeights, heroPatternRules, heroPatternLanguage] = await Promise.all([
      getAssessmentVersionLanguageBundle(db, resolvedVersion.assessmentVersionId),
      getAssessmentLanguage(resolvedVersion.assessmentVersionId, db),
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
      assessmentLanguageDescription: assessmentLanguage.assessment_description,
      counts: {
        assessment: {
          entryCount: assessmentLanguage.assessment_description ? 1 : 0,
        },
        heroHeaders: { entryCount: countEntriesByKey(bundle.heroHeaders ?? {}) },
        signals: { entryCount: countEntriesByKey(bundle.signals) },
        pairs: { entryCount: countEntriesByKey(bundle.pairs) },
        domains: { entryCount: countEntriesByKey(bundle.domains) },
        pairTraitWeights: { entryCount: pairTraitWeights.length },
        heroPatternRules: { entryCount: heroPatternRules.length },
        heroPatternLanguage: { entryCount: heroPatternLanguage.length },
      },
    };
  } catch (error) {
    if (!isMissingLanguageSchemaError(error)) {
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
      assessmentLanguageDescription: null,
      counts: createEmptyCounts(),
    };
  }
}
