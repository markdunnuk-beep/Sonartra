export type AdminAssignmentCreateValues = {
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  targetOrderIndex: string;
};

export type AdminAssignmentCreateFormState = {
  formError: string | null;
  fieldErrors: {
    assessmentId?: string;
    assessmentVersionId?: string;
    targetOrderIndex?: string;
  };
  values: AdminAssignmentCreateValues;
};

export type AdminAssignmentMutationState = {
  formError: string | null;
};

export const emptyAdminAssignmentCreateValues: AdminAssignmentCreateValues = {
  userId: '',
  assessmentId: '',
  assessmentVersionId: '',
  targetOrderIndex: '',
};

export const initialAdminAssignmentCreateFormState: AdminAssignmentCreateFormState = {
  formError: null,
  fieldErrors: {},
  values: emptyAdminAssignmentCreateValues,
};

export const initialAdminAssignmentMutationState: AdminAssignmentMutationState = {
  formError: null,
};

export function validateAdminAssignmentCreateValues(
  values: AdminAssignmentCreateValues,
): AdminAssignmentCreateFormState {
  const fieldErrors: AdminAssignmentCreateFormState['fieldErrors'] = {};

  if (!values.assessmentId) {
    fieldErrors.assessmentId = 'Assessment is required.';
  }

  if (!values.assessmentVersionId) {
    fieldErrors.assessmentVersionId = 'Assessment version is required.';
  }

  if (!values.targetOrderIndex) {
    fieldErrors.targetOrderIndex = 'Sequence position is required.';
  } else if (!/^\d+$/.test(values.targetOrderIndex)) {
    fieldErrors.targetOrderIndex = 'Sequence position must be a whole number.';
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}
