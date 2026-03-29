const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_KEY_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 600;

export type AdminAuthoringFormValues = {
  label: string;
  key: string;
  description: string;
};

export type AdminAuthoringFormState = {
  formError: string | null;
  fieldErrors: {
    label?: string;
    key?: string;
    description?: string;
  };
  values: AdminAuthoringFormValues;
};

export const emptyAdminAuthoringFormValues: AdminAuthoringFormValues = {
  label: '',
  key: '',
  description: '',
};

export const initialAdminAuthoringFormState: AdminAuthoringFormState = {
  formError: null,
  fieldErrors: {},
  values: emptyAdminAuthoringFormValues,
};

export function validateAdminAuthoringValues(
  values: AdminAuthoringFormValues,
): AdminAuthoringFormState {
  const fieldErrors: AdminAuthoringFormState['fieldErrors'] = {};

  if (!values.label) {
    fieldErrors.label = 'Name is required.';
  }

  if (!values.key) {
    fieldErrors.key = 'Key is required.';
  } else if (!KEY_PATTERN.test(values.key)) {
    fieldErrors.key = 'Use lowercase letters, numbers, and single hyphens only.';
  } else if (values.key.length > MAX_KEY_LENGTH) {
    fieldErrors.key = `Key must be ${MAX_KEY_LENGTH} characters or fewer.`;
  }

  if (values.description.length > MAX_DESCRIPTION_LENGTH) {
    fieldErrors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}
