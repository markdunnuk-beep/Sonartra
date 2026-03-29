import {
  ASSESSMENT_KEY_PATTERN,
  MAX_ASSESSMENT_KEY_LENGTH,
} from '@/lib/admin/assessment-key';

export type AdminAssessmentCreateFormValues = {
  title: string;
  assessmentKey: string;
  description: string;
};

export type AdminAssessmentCreateFormState = {
  formError: string | null;
  fieldErrors: {
    title?: string;
    assessmentKey?: string;
    description?: string;
  };
  values: AdminAssessmentCreateFormValues;
};

export const emptyAdminAssessmentCreateFormValues: AdminAssessmentCreateFormValues = {
  title: '',
  assessmentKey: '',
  description: '',
};

export const initialAdminAssessmentCreateFormState: AdminAssessmentCreateFormState = {
  formError: null,
  fieldErrors: {},
  values: emptyAdminAssessmentCreateFormValues,
};

export function validateAdminAssessmentCreateValues(
  values: AdminAssessmentCreateFormValues,
): AdminAssessmentCreateFormState {
  const fieldErrors: AdminAssessmentCreateFormState['fieldErrors'] = {};

  if (!values.title) {
    fieldErrors.title = 'Assessment title is required.';
  }

  if (!values.assessmentKey) {
    fieldErrors.assessmentKey = 'Assessment key is required.';
  } else if (!ASSESSMENT_KEY_PATTERN.test(values.assessmentKey)) {
    fieldErrors.assessmentKey = 'Use lowercase letters, numbers, and single hyphens only.';
  } else if (values.assessmentKey.length > MAX_ASSESSMENT_KEY_LENGTH) {
    fieldErrors.assessmentKey = `Assessment key must be ${MAX_ASSESSMENT_KEY_LENGTH} characters or fewer.`;
  }

  if (values.description.length > 600) {
    fieldErrors.description = 'Description must be 600 characters or fewer.';
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}
