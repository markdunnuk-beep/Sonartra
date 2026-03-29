const QUESTION_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OPTION_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_KEY_LENGTH = 64;
const MAX_PROMPT_LENGTH = 1000;
const MAX_OPTION_TEXT_LENGTH = 600;
const MAX_OPTION_LABEL_LENGTH = 32;

export type AdminQuestionAuthoringFormValues = {
  prompt: string;
  key: string;
  domainId: string;
};

export type AdminQuestionAuthoringFormState = {
  formError: string | null;
  fieldErrors: {
    prompt?: string;
    key?: string;
    domainId?: string;
  };
  values: AdminQuestionAuthoringFormValues;
};

export type AdminBulkQuestionAuthoringFormValues = {
  count: string;
};

export type AdminBulkQuestionAuthoringFormState = {
  formError: string | null;
  fieldErrors: {
    count?: string;
  };
  values: AdminBulkQuestionAuthoringFormValues;
};

export type AdminOptionAuthoringFormValues = {
  key: string;
  label: string;
  text: string;
};

export type AdminOptionAuthoringFormState = {
  formError: string | null;
  fieldErrors: {
    key?: string;
    label?: string;
    text?: string;
  };
  values: AdminOptionAuthoringFormValues;
};

export const emptyAdminQuestionAuthoringFormValues: AdminQuestionAuthoringFormValues = {
  prompt: '',
  key: '',
  domainId: '',
};

export const initialAdminQuestionAuthoringFormState: AdminQuestionAuthoringFormState = {
  formError: null,
  fieldErrors: {},
  values: emptyAdminQuestionAuthoringFormValues,
};

export const emptyAdminBulkQuestionAuthoringFormValues: AdminBulkQuestionAuthoringFormValues = {
  count: '80',
};

export const initialAdminBulkQuestionAuthoringFormState: AdminBulkQuestionAuthoringFormState = {
  formError: null,
  fieldErrors: {},
  values: emptyAdminBulkQuestionAuthoringFormValues,
};

export const emptyAdminOptionAuthoringFormValues: AdminOptionAuthoringFormValues = {
  key: '',
  label: '',
  text: '',
};

export const initialAdminOptionAuthoringFormState: AdminOptionAuthoringFormState = {
  formError: null,
  fieldErrors: {},
  values: emptyAdminOptionAuthoringFormValues,
};

export function validateAdminQuestionAuthoringValues(
  values: AdminQuestionAuthoringFormValues,
): AdminQuestionAuthoringFormState {
  const fieldErrors: AdminQuestionAuthoringFormState['fieldErrors'] = {};

  if (!values.prompt) {
    fieldErrors.prompt = 'Question prompt is required.';
  } else if (values.prompt.length > MAX_PROMPT_LENGTH) {
    fieldErrors.prompt = `Question prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`;
  }

  if (!values.key) {
    fieldErrors.key = 'Question key is required.';
  } else if (!QUESTION_KEY_PATTERN.test(values.key)) {
    fieldErrors.key = 'Use lowercase letters, numbers, and single hyphens only.';
  } else if (values.key.length > MAX_KEY_LENGTH) {
    fieldErrors.key = `Question key must be ${MAX_KEY_LENGTH} characters or fewer.`;
  }

  if (!values.domainId) {
    fieldErrors.domainId = 'Question domain is required.';
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}

export function validateAdminBulkQuestionAuthoringValues(
  values: AdminBulkQuestionAuthoringFormValues,
): AdminBulkQuestionAuthoringFormState {
  const fieldErrors: AdminBulkQuestionAuthoringFormState['fieldErrors'] = {};
  const count = Number(values.count);

  if (!values.count) {
    fieldErrors.count = 'Question count is required.';
  } else if (!Number.isInteger(count) || count < 1) {
    fieldErrors.count = 'Enter a whole number greater than zero.';
  } else if (count > 200) {
    fieldErrors.count = 'Generate at most 200 questions at a time.';
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}

export function validateAdminOptionAuthoringValues(
  values: AdminOptionAuthoringFormValues,
): AdminOptionAuthoringFormState {
  const fieldErrors: AdminOptionAuthoringFormState['fieldErrors'] = {};

  if (!values.key) {
    fieldErrors.key = 'Option key is required.';
  } else if (!OPTION_KEY_PATTERN.test(values.key)) {
    fieldErrors.key = 'Use lowercase letters, numbers, and single hyphens only.';
  } else if (values.key.length > MAX_KEY_LENGTH) {
    fieldErrors.key = `Option key must be ${MAX_KEY_LENGTH} characters or fewer.`;
  }

  if (!values.text) {
    fieldErrors.text = 'Option text is required.';
  } else if (values.text.length > MAX_OPTION_TEXT_LENGTH) {
    fieldErrors.text = `Option text must be ${MAX_OPTION_TEXT_LENGTH} characters or fewer.`;
  }

  if (values.label.length > MAX_OPTION_LABEL_LENGTH) {
    fieldErrors.label = `Option label must be ${MAX_OPTION_LABEL_LENGTH} characters or fewer.`;
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}
