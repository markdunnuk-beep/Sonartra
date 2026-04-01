import type {
  AssessmentKey,
  EngineLanguageBundle,
  AssessmentVersionId,
  AssessmentVersionTag,
  RuntimeAssessmentDefinition,
} from '@/lib/engine/types';
import {
  getAssessmentByKey,
  getPublishedVersionForAssessment,
  getVersionByAssessmentKeyAndVersion,
  getVersionById,
  loadDefinitionGraphByVersionId,
  type Queryable,
} from '@/lib/engine/repository-sql';
import { assembleRuntimeAssessmentDefinition } from '@/lib/engine/repository-mappers';
import { getAssessmentVersionLanguageBundle } from '@/lib/server/assessment-version-language';

export type AssessmentDefinitionRepository = {
  getPublishedAssessmentDefinitionByKey(
    assessmentKey: AssessmentKey,
  ): Promise<RuntimeAssessmentDefinition | null>;
  getAssessmentDefinitionByVersion(params: {
    assessmentVersionId?: AssessmentVersionId;
    assessmentKey?: AssessmentKey;
    version?: AssessmentVersionTag;
  }): Promise<RuntimeAssessmentDefinition | null>;
  getAssessmentVersionLanguageBundle(
    assessmentVersionId: AssessmentVersionId,
  ): Promise<EngineLanguageBundle>;
};

export type AssessmentDefinitionRepositoryDeps = {
  db: Queryable;
};

export function createAssessmentDefinitionRepository(
  deps: AssessmentDefinitionRepositoryDeps,
): AssessmentDefinitionRepository {
  return {
    async getPublishedAssessmentDefinitionByKey(assessmentKey) {
      const assessment = await getAssessmentByKey(deps.db, assessmentKey);
      if (!assessment) {
        return null;
      }

      const version = await getPublishedVersionForAssessment(deps.db, assessment.id);
      if (!version) {
        return null;
      }

      const graph = await loadDefinitionGraphByVersionId(deps.db, version.id);
      if (!graph) {
        return null;
      }

      return assembleRuntimeAssessmentDefinition(graph);
    },

    async getAssessmentDefinitionByVersion(params) {
      const { assessmentVersionId, assessmentKey, version } = params;

      let resolvedVersionId: AssessmentVersionId | null = null;

      if (assessmentVersionId) {
        const assessmentVersion = await getVersionById(deps.db, assessmentVersionId);
        if (!assessmentVersion) {
          return null;
        }

        resolvedVersionId = assessmentVersion.id;
      } else {
        if (!assessmentKey || !version) {
          throw new Error(
            'getAssessmentDefinitionByVersion requires either assessmentVersionId or (assessmentKey + version)',
          );
        }

        const assessmentVersion = await getVersionByAssessmentKeyAndVersion(deps.db, assessmentKey, version);
        if (!assessmentVersion) {
          return null;
        }

        resolvedVersionId = assessmentVersion.id;
      }

      const graph = await loadDefinitionGraphByVersionId(deps.db, resolvedVersionId);
      if (!graph) {
        return null;
      }

      return assembleRuntimeAssessmentDefinition(graph);
    },

    async getAssessmentVersionLanguageBundle(assessmentVersionId) {
      return getAssessmentVersionLanguageBundle(deps.db, assessmentVersionId);
    },
  };
}
