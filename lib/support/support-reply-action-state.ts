export type SupportReplyFieldErrors = Partial<{
  body: string;
}>;

export type SupportReplyFormValues = {
  body: string;
};

export type SupportReplyActionState = {
  ok: boolean;
  formError: string | null;
  fieldErrors: SupportReplyFieldErrors;
  values: SupportReplyFormValues;
};

export const emptySupportReplyFormValues: SupportReplyFormValues = {
  body: '',
};

export const initialSupportReplyActionState: SupportReplyActionState = {
  ok: false,
  formError: null,
  fieldErrors: {},
  values: emptySupportReplyFormValues,
};
