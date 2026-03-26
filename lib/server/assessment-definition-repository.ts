import type { AssessmentDefinition, AssessmentKey, AssessmentVersion } from '@/types/engine';

export interface AssessmentDefinitionRepository {
  getPublishedDefinition(params: {
    assessmentKey: AssessmentKey;
    version: AssessmentVersion;
  }): Promise<AssessmentDefinition | null>;
}
