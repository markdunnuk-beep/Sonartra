import {
  validateAssessmentStructure,
  validateLanguageCoverage,
  validateNormalization,
  validateResultPayload,
  validateWeights,
  type EngineDiagnosticIssue,
} from '@/lib/engine/engine-validator';
import type {
  CanonicalResultPayload,
  EngineLanguageBundle,
  NormalizedSignalScore,
  RuntimeExecutionModel,
} from '@/lib/engine/types';

export type EngineDiagnostics = {
  ok: boolean;
  errors: readonly EngineDiagnosticIssue[];
  warnings: readonly EngineDiagnosticIssue[];
  issues: readonly EngineDiagnosticIssue[];
  checkedAt: string;
};

export type RunFullDiagnosticsInput = {
  runtimeModel?: RuntimeExecutionModel | null;
  languageConfig?: EngineLanguageBundle | null;
  normalizationScores?: readonly NormalizedSignalScore[] | null;
  result?: CanonicalResultPayload | unknown;
};

export function runFullDiagnostics(input: RunFullDiagnosticsInput): EngineDiagnostics {
  const issues: EngineDiagnosticIssue[] = [];

  if (input.runtimeModel) {
    issues.push(...validateAssessmentStructure(input.runtimeModel));
    issues.push(...validateWeights(input.runtimeModel));
  }

  if (input.languageConfig) {
    issues.push(...validateLanguageCoverage(input.languageConfig));
  }

  if (input.normalizationScores) {
    issues.push(...validateNormalization(input.normalizationScores));
  }

  if (input.result) {
    issues.push(...validateResultPayload(input.result));
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    issues: Object.freeze(issues),
    checkedAt: new Date().toISOString(),
  });
}
