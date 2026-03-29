const WEIGHT_PATTERN = /^-?\d+(?:\.\d+)?$/;
const MAX_INTEGER_DIGITS = 8;
const MAX_DECIMAL_DIGITS = 4;

export type AdminWeightingAuthoringFormValues = {
  signalId: string;
  weight: string;
};

export type AdminWeightingAuthoringFormState = {
  formError: string | null;
  fieldErrors: {
    signalId?: string;
    weight?: string;
  };
  values: AdminWeightingAuthoringFormValues;
};

export const emptyAdminWeightingAuthoringFormValues: AdminWeightingAuthoringFormValues = {
  signalId: '',
  weight: '',
};

export const initialAdminWeightingAuthoringFormState: AdminWeightingAuthoringFormState = {
  formError: null,
  fieldErrors: {},
  values: emptyAdminWeightingAuthoringFormValues,
};

export function validateAdminWeightingAuthoringValues(
  values: AdminWeightingAuthoringFormValues,
): AdminWeightingAuthoringFormState {
  const fieldErrors: AdminWeightingAuthoringFormState['fieldErrors'] = {};

  if (!values.signalId) {
    fieldErrors.signalId = 'Signal selection is required.';
  }

  if (!values.weight) {
    fieldErrors.weight = 'Weight is required.';
  } else if (!WEIGHT_PATTERN.test(values.weight)) {
    fieldErrors.weight = 'Enter a valid numeric weight.';
  } else {
    const normalized = values.weight.startsWith('-') ? values.weight.slice(1) : values.weight;
    const [integerPart, decimalPart = ''] = normalized.split('.');

    if (integerPart.length > MAX_INTEGER_DIGITS) {
      fieldErrors.weight = `Weight must have no more than ${MAX_INTEGER_DIGITS} digits before the decimal point.`;
    } else if (decimalPart.length > MAX_DECIMAL_DIGITS) {
      fieldErrors.weight = `Weight must have no more than ${MAX_DECIMAL_DIGITS} decimal places.`;
    }
  }

  return {
    formError: null,
    fieldErrors,
    values,
  };
}
