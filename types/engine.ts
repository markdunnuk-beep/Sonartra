/**
 * Initial engine-scaffolding types for Task 1 foundation only.
 * Runtime logic is intentionally not implemented here.
 */

export type AssessmentLifecycleStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type ResultReadinessStatus = 'PROCESSING' | 'READY' | 'FAILED';

export interface AssessmentDefinitionRef {
  assessmentKey: string;
  version: string;
}

export interface CanonicalResultMetadata {
  assessmentKey: string;
  version: string;
  attemptId: string;
  readiness: ResultReadinessStatus;
  generatedAt: string;
}
