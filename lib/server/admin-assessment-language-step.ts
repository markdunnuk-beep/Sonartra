import type { Queryable } from '@/lib/engine/repository-sql';
import {
  getAdminAssessmentDetailByKey,
  type AdminAssessmentDetailVersion,
} from '@/lib/server/admin-assessment-detail';
import { getAssessmentVersionLanguageBundle } from '@/lib/server/assessment-version-language';

export type AdminAssessmentLanguageDatasetSummary = {
  entryCount: number;
};

export type AdminAssessmentLanguageDatasetCounts = {
  signals: AdminAssessmentLanguageDatasetSummary;
  pairs: AdminAssessmentLanguageDatasetSummary;
  domains: AdminAssessmentLanguageDatasetSummary;
  overview: AdminAssessmentLanguageDatasetSummary;
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
  counts: AdminAssessmentLanguageDatasetCounts;
};

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
    signals: { entryCount: 0 },
    pairs: { entryCount: 0 },
    domains: { entryCount: 0 },
    overview: { entryCount: 0 },
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
      counts: createEmptyCounts(),
    };
  }

  const bundle = await getAssessmentVersionLanguageBundle(db, resolvedVersion.assessmentVersionId);

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
    counts: {
      signals: { entryCount: countEntriesByKey(bundle.signals) },
      pairs: { entryCount: countEntriesByKey(bundle.pairs) },
      domains: { entryCount: countEntriesByKey(bundle.domains) },
      overview: { entryCount: countEntriesByKey(bundle.overview) },
    },
  };
}