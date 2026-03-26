import { buildCanonicalResultPayload } from '@/lib/engine/result-builder';
import type { AssessmentDefinitionRepository } from '@/lib/engine/repository';
import { loadRuntimeExecutionModel } from '@/lib/engine/runtime-loader';
import { scoreAssessmentResponses } from '@/lib/engine/scoring';
import { normalizeScoreResult } from '@/lib/engine/normalization';
import type {
  AssessmentKey,
  AssessmentVersionTag,
  CanonicalResultPayload,
  RuntimeAssessmentDefinition,
  RuntimeResponseSet,
} from '@/lib/engine/types';

export class EngineNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineNotFoundError';
  }
}

export type RunAssessmentEngineParams = {
  repository: AssessmentDefinitionRepository;
  assessmentKey?: AssessmentKey;
  versionKey?: AssessmentVersionTag;
  responses: RuntimeResponseSet;
};

async function loadDefinition(
  params: RunAssessmentEngineParams,
): Promise<RuntimeAssessmentDefinition> {
  if (params.versionKey) {
    const resolvedAssessmentKey = params.assessmentKey ?? params.responses.assessmentKey;
    const definition = await params.repository.getAssessmentDefinitionByVersion({
      assessmentKey: resolvedAssessmentKey,
      version: params.versionKey,
    });

    if (!definition) {
      throw new EngineNotFoundError(
        `Assessment definition not found for assessment ${resolvedAssessmentKey} version ${params.versionKey}`,
      );
    }

    return definition;
  }

  const resolvedAssessmentKey = params.assessmentKey ?? params.responses.assessmentKey;
  const definition = await params.repository.getPublishedAssessmentDefinitionByKey(resolvedAssessmentKey);

  if (!definition) {
    throw new EngineNotFoundError(
      `Published assessment definition not found for assessment ${resolvedAssessmentKey}`,
    );
  }

  return definition;
}

export async function runAssessmentEngine(
  params: RunAssessmentEngineParams,
): Promise<CanonicalResultPayload> {
  const definition = await loadDefinition(params);
  const executionModel = loadRuntimeExecutionModel(definition);
  const scoreResult = scoreAssessmentResponses({
    executionModel,
    responses: params.responses,
  });
  const normalizedResult = normalizeScoreResult({ scoreResult });

  return buildCanonicalResultPayload({
    normalizedResult: {
      ...normalizedResult,
      metadata: {
        assessmentKey: definition.assessment.key,
        version: definition.version.versionTag,
        attemptId: params.responses.attemptId,
      },
      scoringDiagnostics: scoreResult.diagnostics,
    },
  });
}
