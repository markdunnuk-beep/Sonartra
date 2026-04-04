export type AdminAssessmentIntroFormValues = {
  introTitle: string;
  introSummary: string;
  introHowItWorks: string;
  estimatedTimeOverride: string;
  instructions: string;
  confidentialityNote: string;
};

export type AdminAssessmentIntroFormState = {
  formError: string | null;
  formSuccess: string | null;
  values: AdminAssessmentIntroFormValues;
};

export const emptyAdminAssessmentIntroFormValues: AdminAssessmentIntroFormValues = {
  introTitle: '',
  introSummary: '',
  introHowItWorks: '',
  estimatedTimeOverride: '',
  instructions: '',
  confidentialityNote: '',
};

export const initialAdminAssessmentIntroFormState: AdminAssessmentIntroFormState = {
  formError: null,
  formSuccess: null,
  values: emptyAdminAssessmentIntroFormValues,
};

export function createEmptyAssessmentIntroState(): AdminAssessmentIntroFormState {
  return {
    formError: null,
    formSuccess: null,
    values: emptyAdminAssessmentIntroFormValues,
  };
}
