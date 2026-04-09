import type { BuilderStepSlug } from '@/lib/admin/admin-assessment-stepper';
import type {
  AdminAssessmentValidationIssue,
  AdminAssessmentValidationSectionKey,
} from '@/lib/server/admin-assessment-validation';

export type AdminReviewRemediationAction = {
  label: string;
  slug: BuilderStepSlug;
};

function createAction(label: string, slug: BuilderStepSlug): AdminReviewRemediationAction {
  return { label, slug };
}

export function getReviewRemediationAction(
  sectionKey: AdminAssessmentValidationSectionKey,
  issue: AdminAssessmentValidationIssue,
): AdminReviewRemediationAction | null {
  switch (sectionKey) {
    case 'domainsSignals':
      switch (issue.code) {
        case 'missing_domains':
          return createAction('Fix in Domains', 'domains');
        case 'missing_signals':
        case 'orphan_signals':
        case 'cross_version_signals':
          return createAction('Fix in Signals', 'signals');
        default:
          return createAction('Fix in Domains', 'domains');
      }
    case 'questionsOptions':
      switch (issue.code) {
        case 'missing_questions':
        case 'orphan_questions':
        case 'cross_version_questions':
          return createAction('Fix in Questions', 'questions');
        case 'questions_without_options':
        case 'missing_options':
        case 'orphan_options':
        case 'cross_version_options':
          return createAction('Fix in Responses', 'responses');
        default:
          return createAction('Fix in Questions', 'questions');
      }
    case 'weights':
      return createAction('Fix in Weights', 'weights');
    case 'applicationPlan':
      return createAction('Fix in Language', 'language');
    case 'overallSummary':
      return createAction('Fix in Review', 'review');
    case 'assessmentVersionContext':
      return issue.code === 'draft_version_missing' ? createAction('Fix in Review', 'review') : null;
  }
}
