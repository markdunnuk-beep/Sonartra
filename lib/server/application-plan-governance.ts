import type { AssessmentVersionApplicationLanguageBundle } from '@/lib/server/assessment-version-application-language-types';

export const REQUIRED_APPLICATION_HERO_PATTERN_KEYS = Object.freeze([
  'forceful_driver',
  'exacting_controller',
  'delivery_commander',
  'deliberate_craftsperson',
  'grounded_planner',
  'relational_catalyst',
  'adaptive_mobiliser',
  'steady_steward',
  'balanced_operator',
]);

export const APPLICATION_PLAN_WARNING_THRESHOLD = 24;

export type ApplicationPlanCoverageSummary = {
  thesisCount: number;
  contributionCount: number;
  riskCount: number;
  developmentCount: number;
  actionPromptsCount: number;
  missingThesisHeroPatterns: readonly string[];
  missingActionPromptHeroPatterns: readonly string[];
};

function collectMissingKeys(authoredKeys: readonly string[]): readonly string[] {
  const authored = new Set(authoredKeys);
  return Object.freeze(
    REQUIRED_APPLICATION_HERO_PATTERN_KEYS.filter((patternKey) => !authored.has(patternKey)),
  );
}

export function summarizeApplicationPlanCoverage(
  bundle: AssessmentVersionApplicationLanguageBundle,
): ApplicationPlanCoverageSummary {
  return {
    thesisCount: bundle.thesis.length,
    contributionCount: bundle.contribution.length,
    riskCount: bundle.risk.length,
    developmentCount: bundle.development.length,
    actionPromptsCount: bundle.prompts.length,
    missingThesisHeroPatterns: collectMissingKeys(
      bundle.thesis.map((row) => row.heroPatternKey),
    ),
    missingActionPromptHeroPatterns: collectMissingKeys(
      bundle.prompts
        .filter((row) => row.sourceType === 'hero_pattern')
        .map((row) => row.sourceKey),
    ),
  };
}
