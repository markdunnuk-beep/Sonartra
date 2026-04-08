import type { AssessmentVersionId } from '@/lib/engine/types';

export type ApplicationLanguageSourceType = 'pair' | 'signal' | 'hero_pattern';

export type AssessmentVersionApplicationThesisRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  heroPatternKey: string;
  headline: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionApplicationContributionRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  sourceType: Extract<ApplicationLanguageSourceType, 'pair' | 'signal'>;
  sourceKey: string;
  label: string;
  narrative: string;
  bestWhen: string;
  watchFor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionApplicationRiskRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  sourceType: Extract<ApplicationLanguageSourceType, 'pair' | 'signal'>;
  sourceKey: string;
  label: string;
  narrative: string;
  impact: string;
  earlyWarning: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionApplicationDevelopmentRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  sourceType: Extract<ApplicationLanguageSourceType, 'pair' | 'signal'>;
  sourceKey: string;
  label: string;
  narrative: string;
  practice: string;
  successMarker: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionApplicationActionPromptsRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  sourceType: 'hero_pattern';
  sourceKey: string;
  keepDoing: string;
  watchFor: string;
  practiceNext: string;
  askOthers: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionApplicationLanguageBundle = {
  thesis: readonly AssessmentVersionApplicationThesisRow[];
  contribution: readonly AssessmentVersionApplicationContributionRow[];
  risk: readonly AssessmentVersionApplicationRiskRow[];
  development: readonly AssessmentVersionApplicationDevelopmentRow[];
  prompts: readonly AssessmentVersionApplicationActionPromptsRow[];
};
