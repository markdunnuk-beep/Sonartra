import { runFullDiagnostics } from '@/lib/engine/engine-diagnostics';
import { buildCanonicalResultPayload } from '@/lib/engine/result-builder';
import type { AssessmentDefinitionRepository } from '@/lib/engine/repository';
import { loadRuntimeExecutionModel } from '@/lib/engine/runtime-loader';
import { scoreAssessmentResponses } from '@/lib/engine/scoring';
import { normalizeScoreResult } from '@/lib/engine/normalization';
import { getAssessmentLanguage } from '@/lib/server/assessment-language-repository';
import type {
  AssessmentKey,
  AssessmentVersionId,
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
  assessmentVersionId?: AssessmentVersionId;
  assessmentKey?: AssessmentKey;
  versionKey?: AssessmentVersionTag;
  responses: RuntimeResponseSet;
  loadAssessmentLanguage?: typeof getAssessmentLanguage;
};

async function loadDefinition(
  params: RunAssessmentEngineParams,
): Promise<RuntimeAssessmentDefinition> {
  if (params.assessmentVersionId) {
    const definition = await params.repository.getAssessmentDefinitionByVersion({
      assessmentVersionId: params.assessmentVersionId,
    });

    if (!definition) {
      throw new EngineNotFoundError(
        `Assessment definition not found for assessment version ${params.assessmentVersionId}`,
      );
    }

    return definition;
  }

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
  const languageBundle = await params.repository.getAssessmentVersionLanguageBundle(definition.version.id);
  const assessmentLanguageLoader = params.loadAssessmentLanguage ?? getAssessmentLanguage;
  const assessmentLanguage = await assessmentLanguageLoader(definition.version.id);
  const executionModel = loadRuntimeExecutionModel(definition);
  const scoreResult = scoreAssessmentResponses({
    executionModel,
    responses: params.responses,
  });
  const normalizedResult = normalizeScoreResult({ scoreResult });

  const payload = buildCanonicalResultPayload({
    normalizedResult: {
      assessmentVersionId: definition.version.id,
      ...normalizedResult,
      metadata: {
        assessmentKey: definition.assessment.key,
        version: definition.version.versionTag,
        attemptId: params.responses.attemptId,
        assessmentDescription: assessmentLanguage.assessment_description ?? null,
      },
      scoringDiagnostics: scoreResult.diagnostics,
      languageBundle,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    const diagnostics = runFullDiagnostics({
      runtimeModel: executionModel,
      languageConfig: languageBundle,
      normalizationScores: payload.normalizedScores,
      result: payload,
    });

    if (diagnostics.issues.length > 0) {
      console.warn('[engine-diagnostics]', {
        assessmentVersionId: definition.version.id,
        attemptId: params.responses.attemptId,
        errors: diagnostics.errors,
        warnings: diagnostics.warnings,
      });
    }
  }

  return payload;
}
