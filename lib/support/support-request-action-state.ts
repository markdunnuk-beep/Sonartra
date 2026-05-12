import type { SupportCategory } from '@/lib/server/support-service';

export const SUPPORT_REQUEST_CATEGORY_OPTIONS: readonly {
  value: SupportCategory;
  label: string;
  helper: string;
}[] = [
  {
    value: 'technical_issue',
    label: 'Technical issue',
    helper: 'Something is not working as expected.',
  },
  {
    value: 'account_support',
    label: 'Account support',
    helper: 'Help with your account, login, or workspace.',
  },
  {
    value: 'billing_access',
    label: 'Billing or access',
    helper: 'Questions about payment, plan access, or availability.',
  },
  {
    value: 'feedback',
    label: 'Product feedback',
    helper: 'Share an idea or improvement.',
  },
  {
    value: 'general_question',
    label: 'General question',
    helper: 'Anything else about using Sonartra.',
  },
] as const;

export type SupportRequestFieldErrors = Partial<{
  category: string;
  subject: string;
  description: string;
}>;

export type SupportRequestFormValues = {
  category: string;
  subject: string;
  description: string;
};

export type SupportRequestActionState = {
  ok: boolean;
  message: string | null;
  publicReference: string | null;
  formError: string | null;
  fieldErrors: SupportRequestFieldErrors;
  values: SupportRequestFormValues;
};

export const emptySupportRequestFormValues: SupportRequestFormValues = {
  category: '',
  subject: '',
  description: '',
};

export const initialSupportRequestActionState: SupportRequestActionState = {
  ok: false,
  message: null,
  publicReference: null,
  formError: null,
  fieldErrors: {},
  values: emptySupportRequestFormValues,
};
