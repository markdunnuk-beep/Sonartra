import type { SupportPriority, SupportStatus } from '@/lib/server/support-service';

export type AdminSupportBodyFieldErrors = Partial<{
  body: string;
}>;

export type AdminSupportBodyFormValues = {
  body: string;
};

export type AdminSupportBodyActionState = {
  ok: boolean;
  formError: string | null;
  fieldErrors: AdminSupportBodyFieldErrors;
  values: AdminSupportBodyFormValues;
};

export type AdminSupportStatusFieldErrors = Partial<{
  status: string;
}>;

export type AdminSupportStatusFormValues = {
  status: string;
};

export type AdminSupportStatusActionState = {
  ok: boolean;
  formError: string | null;
  fieldErrors: AdminSupportStatusFieldErrors;
  values: AdminSupportStatusFormValues;
};

export type AdminSupportPriorityFieldErrors = Partial<{
  priority: string;
}>;

export type AdminSupportPriorityFormValues = {
  priority: string;
};

export type AdminSupportPriorityActionState = {
  ok: boolean;
  formError: string | null;
  fieldErrors: AdminSupportPriorityFieldErrors;
  values: AdminSupportPriorityFormValues;
};

export const emptyAdminSupportBodyFormValues: AdminSupportBodyFormValues = {
  body: '',
};

export const initialAdminSupportBodyActionState: AdminSupportBodyActionState = {
  ok: false,
  formError: null,
  fieldErrors: {},
  values: emptyAdminSupportBodyFormValues,
};

export function initialAdminSupportStatusActionState(
  status: SupportStatus,
): AdminSupportStatusActionState {
  return {
    ok: false,
    formError: null,
    fieldErrors: {},
    values: {
      status,
    },
  };
}

export function initialAdminSupportPriorityActionState(
  priority: SupportPriority,
): AdminSupportPriorityActionState {
  return {
    ok: false,
    formError: null,
    fieldErrors: {},
    values: {
      priority,
    },
  };
}
