'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  sendSupportAdminReplyUserEmail,
  sendSupportCaseStatusChangedUserEmail,
  type SupportEmailSendResult,
} from '@/lib/server/support-email-notifications';
import {
  addAdminInternalNote,
  addAdminSupportReply,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  SupportCaseNotFoundError,
  SupportValidationError,
  updateAdminSupportCasePriority,
  updateAdminSupportCaseStatus,
  type AdminSupportCaseDetail,
  type SupportPriority,
  type SupportStatus,
} from '@/lib/server/support-service';
import {
  initialAdminSupportBodyActionState,
  type AdminSupportBodyActionState,
  type AdminSupportBodyFieldErrors,
  type AdminSupportBodyFormValues,
  type AdminSupportPriorityActionState,
  type AdminSupportPriorityFieldErrors,
  type AdminSupportPriorityFormValues,
  type AdminSupportStatusActionState,
  type AdminSupportStatusFieldErrors,
  type AdminSupportStatusFormValues,
} from '@/lib/support/support-admin-action-state';

type AdminSupportActionDependencies = {
  addAdminSupportReply(input: {
    publicReference: string;
    body: string;
  }): Promise<AdminSupportCaseDetail>;
  addAdminInternalNote(input: {
    publicReference: string;
    body: string;
  }): Promise<AdminSupportCaseDetail>;
  updateAdminSupportCaseStatus(input: {
    publicReference: string;
    status: SupportStatus;
  }): Promise<AdminSupportCaseDetail>;
  updateAdminSupportCasePriority(input: {
    publicReference: string;
    priority: SupportPriority;
  }): Promise<AdminSupportCaseDetail>;
  sendSupportAdminReplyUserEmail?(input: {
    supportCase: AdminSupportCaseDetail;
    messagePreview: string;
  }): Promise<SupportEmailSendResult>;
  sendSupportCaseStatusChangedUserEmail?(input: {
    supportCase: AdminSupportCaseDetail;
    status: SupportStatus;
  }): Promise<SupportEmailSendResult>;
  revalidatePath(path: string): void;
  redirect(path: string): never | void;
};

const defaultDependencies: AdminSupportActionDependencies = {
  addAdminSupportReply,
  addAdminInternalNote,
  updateAdminSupportCaseStatus,
  updateAdminSupportCasePriority,
  sendSupportAdminReplyUserEmail,
  sendSupportCaseStatusChangedUserEmail,
  revalidatePath,
  redirect,
};

const MAX_BODY_LENGTH = 4000;

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readBodyValues(formData: FormData): {
  caseReference: string;
  values: AdminSupportBodyFormValues;
} {
  return {
    caseReference: formValue(formData, 'caseReference').toUpperCase(),
    values: {
      body: formValue(formData, 'body'),
    },
  };
}

function validateBodyValues(values: AdminSupportBodyFormValues): AdminSupportBodyFieldErrors {
  const fieldErrors: AdminSupportBodyFieldErrors = {};

  if (!values.body) {
    fieldErrors.body = 'Add a message before saving.';
  } else if (values.body.length > MAX_BODY_LENGTH) {
    fieldErrors.body = `Keep the message to ${MAX_BODY_LENGTH} characters or fewer.`;
  }

  return fieldErrors;
}

function bodyValidationErrorState(
  values: AdminSupportBodyFormValues,
  fieldErrors: AdminSupportBodyFieldErrors,
): AdminSupportBodyActionState {
  return {
    ok: false,
    formError: 'Review the highlighted field and try again.',
    fieldErrors,
    values,
  };
}

function bodyGenericFailureState(values: AdminSupportBodyFormValues): AdminSupportBodyActionState {
  return {
    ok: false,
    formError: 'This support case update could not be saved. Try again.',
    fieldErrors: {},
    values,
  };
}

function adminDetailPath(publicReference: string): string {
  return `/admin/support/${publicReference}`;
}

function revalidateAdminSupportCase(
  paths: Pick<AdminSupportActionDependencies, 'revalidatePath'>,
  publicReference: string,
) {
  paths.revalidatePath('/admin/support');
  paths.revalidatePath(adminDetailPath(publicReference));
}

function isSupportStatus(value: string): value is SupportStatus {
  return SUPPORT_STATUSES.includes(value as SupportStatus);
}

function isSupportPriority(value: string): value is SupportPriority {
  return SUPPORT_PRIORITIES.includes(value as SupportPriority);
}

async function notifyAdminReply(params: {
  updatedCase: AdminSupportCaseDetail;
  messagePreview: string;
  dependencies: AdminSupportActionDependencies;
}) {
  if (!params.dependencies.sendSupportAdminReplyUserEmail) {
    return;
  }

  try {
    await params.dependencies.sendSupportAdminReplyUserEmail({
      supportCase: params.updatedCase,
      messagePreview: params.messagePreview,
    });
  } catch (error) {
    console.error('[admin-support] public reply email notification failed', error);
  }
}

async function notifyStatusChanged(params: {
  updatedCase: AdminSupportCaseDetail;
  status: SupportStatus;
  dependencies: AdminSupportActionDependencies;
}) {
  if (
    !params.dependencies.sendSupportCaseStatusChangedUserEmail ||
    (params.status !== 'resolved' && params.status !== 'closed')
  ) {
    return;
  }

  try {
    await params.dependencies.sendSupportCaseStatusChangedUserEmail({
      supportCase: params.updatedCase,
      status: params.status,
    });
  } catch (error) {
    console.error('[admin-support] status email notification failed', error);
  }
}

export async function addAdminSupportReplyAction(
  _previousState: AdminSupportBodyActionState,
  formData: FormData,
): Promise<AdminSupportBodyActionState> {
  return addAdminSupportReplyActionWithDependencies(formData, defaultDependencies);
}

export async function addAdminSupportReplyActionWithDependencies(
  formData: FormData,
  dependencies: AdminSupportActionDependencies,
): Promise<AdminSupportBodyActionState> {
  const { caseReference, values } = readBodyValues(formData);
  const fieldErrors = validateBodyValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return bodyValidationErrorState(values, fieldErrors);
  }

  let updatedReference = caseReference;

  try {
    const updatedCase = await dependencies.addAdminSupportReply({
      publicReference: caseReference,
      body: values.body,
    });
    updatedReference = updatedCase.publicReference;
    revalidateAdminSupportCase(dependencies, updatedReference);
    await notifyAdminReply({
      updatedCase,
      messagePreview: values.body,
      dependencies,
    });
  } catch (error) {
    if (error instanceof SupportCaseNotFoundError) {
      return {
        ok: false,
        formError: 'This support case could not be found.',
        fieldErrors: {},
        values,
      };
    }

    if (error instanceof SupportValidationError) {
      return bodyValidationErrorState(values, {
        body: 'Review the message and try again.',
      });
    }

    console.error('[admin-support] public reply failed', error);
    return bodyGenericFailureState(values);
  }

  dependencies.redirect(adminDetailPath(updatedReference));
  return initialAdminSupportBodyActionState;
}

export async function addAdminInternalNoteAction(
  _previousState: AdminSupportBodyActionState,
  formData: FormData,
): Promise<AdminSupportBodyActionState> {
  return addAdminInternalNoteActionWithDependencies(formData, defaultDependencies);
}

export async function addAdminInternalNoteActionWithDependencies(
  formData: FormData,
  dependencies: AdminSupportActionDependencies,
): Promise<AdminSupportBodyActionState> {
  const { caseReference, values } = readBodyValues(formData);
  const fieldErrors = validateBodyValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return bodyValidationErrorState(values, fieldErrors);
  }

  let updatedReference = caseReference;

  try {
    const updatedCase = await dependencies.addAdminInternalNote({
      publicReference: caseReference,
      body: values.body,
    });
    updatedReference = updatedCase.publicReference;
    revalidateAdminSupportCase(dependencies, updatedReference);
  } catch (error) {
    if (error instanceof SupportCaseNotFoundError) {
      return {
        ok: false,
        formError: 'This support case could not be found.',
        fieldErrors: {},
        values,
      };
    }

    if (error instanceof SupportValidationError) {
      return bodyValidationErrorState(values, {
        body: 'Review the internal note and try again.',
      });
    }

    console.error('[admin-support] internal note failed', error);
    return bodyGenericFailureState(values);
  }

  dependencies.redirect(adminDetailPath(updatedReference));
  return initialAdminSupportBodyActionState;
}

export async function updateAdminSupportStatusAction(
  _previousState: AdminSupportStatusActionState,
  formData: FormData,
): Promise<AdminSupportStatusActionState> {
  return updateAdminSupportStatusActionWithDependencies(formData, defaultDependencies);
}

export async function updateAdminSupportStatusActionWithDependencies(
  formData: FormData,
  dependencies: AdminSupportActionDependencies,
): Promise<AdminSupportStatusActionState> {
  const caseReference = formValue(formData, 'caseReference').toUpperCase();
  const values: AdminSupportStatusFormValues = {
    status: formValue(formData, 'status'),
  };
  const fieldErrors: AdminSupportStatusFieldErrors = {};

  if (!values.status) {
    fieldErrors.status = 'Choose a status.';
  } else if (!isSupportStatus(values.status)) {
    fieldErrors.status = 'Choose a valid status.';
  }

  if (Object.keys(fieldErrors).length > 0 || !isSupportStatus(values.status)) {
    return {
      ok: false,
      formError: 'Review the selected status and try again.',
      fieldErrors,
      values,
    };
  }

  let updatedReference = caseReference;

  try {
    const updatedCase = await dependencies.updateAdminSupportCaseStatus({
      publicReference: caseReference,
      status: values.status,
    });
    updatedReference = updatedCase.publicReference;
    revalidateAdminSupportCase(dependencies, updatedReference);
    await notifyStatusChanged({
      updatedCase,
      status: values.status,
      dependencies,
    });
  } catch (error) {
    if (error instanceof SupportCaseNotFoundError) {
      return {
        ok: false,
        formError: 'This support case could not be found.',
        fieldErrors: {},
        values,
      };
    }

    if (error instanceof SupportValidationError) {
      return {
        ok: false,
        formError: 'Review the selected status and try again.',
        fieldErrors: {
          status: 'Choose a valid status.',
        },
        values,
      };
    }

    console.error('[admin-support] status update failed', error);
    return {
      ok: false,
      formError: 'The status could not be updated. Try again.',
      fieldErrors: {},
      values,
    };
  }

  dependencies.redirect(adminDetailPath(updatedReference));
  return {
    ok: true,
    formError: null,
    fieldErrors: {},
    values,
  };
}

export async function updateAdminSupportPriorityAction(
  _previousState: AdminSupportPriorityActionState,
  formData: FormData,
): Promise<AdminSupportPriorityActionState> {
  return updateAdminSupportPriorityActionWithDependencies(formData, defaultDependencies);
}

export async function updateAdminSupportPriorityActionWithDependencies(
  formData: FormData,
  dependencies: AdminSupportActionDependencies,
): Promise<AdminSupportPriorityActionState> {
  const caseReference = formValue(formData, 'caseReference').toUpperCase();
  const values: AdminSupportPriorityFormValues = {
    priority: formValue(formData, 'priority'),
  };
  const fieldErrors: AdminSupportPriorityFieldErrors = {};

  if (!values.priority) {
    fieldErrors.priority = 'Choose a priority.';
  } else if (!isSupportPriority(values.priority)) {
    fieldErrors.priority = 'Choose a valid priority.';
  }

  if (Object.keys(fieldErrors).length > 0 || !isSupportPriority(values.priority)) {
    return {
      ok: false,
      formError: 'Review the selected priority and try again.',
      fieldErrors,
      values,
    };
  }

  let updatedReference = caseReference;

  try {
    const updatedCase = await dependencies.updateAdminSupportCasePriority({
      publicReference: caseReference,
      priority: values.priority,
    });
    updatedReference = updatedCase.publicReference;
    revalidateAdminSupportCase(dependencies, updatedReference);
  } catch (error) {
    if (error instanceof SupportCaseNotFoundError) {
      return {
        ok: false,
        formError: 'This support case could not be found.',
        fieldErrors: {},
        values,
      };
    }

    if (error instanceof SupportValidationError) {
      return {
        ok: false,
        formError: 'Review the selected priority and try again.',
        fieldErrors: {
          priority: 'Choose a valid priority.',
        },
        values,
      };
    }

    console.error('[admin-support] priority update failed', error);
    return {
      ok: false,
      formError: 'The priority could not be updated. Try again.',
      fieldErrors: {},
      values,
    };
  }

  dependencies.redirect(adminDetailPath(updatedReference));
  return {
    ok: true,
    formError: null,
    fieldErrors: {},
    values,
  };
}
