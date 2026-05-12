'use server';

import { revalidatePath } from 'next/cache';

import { requireCurrentUser } from '@/lib/server/request-user';
import {
  sendSupportCaseCreatedAdminEmail,
  sendSupportCaseCreatedUserEmail,
} from '@/lib/server/support-email-notifications';
import {
  emptySupportRequestFormValues,
  initialSupportRequestActionState,
  SUPPORT_REQUEST_CATEGORY_OPTIONS,
  type SupportRequestActionState,
  type SupportRequestFieldErrors,
  type SupportRequestFormValues,
} from '@/lib/support/support-request-action-state';
import {
  createSupportCase,
  SupportValidationError,
  type SupportCategory,
  type SupportCaseDetail,
} from '@/lib/server/support-service';
import type { SupportEmailSendResult } from '@/lib/server/support-email-notifications';

type SupportRequestActionDependencies = {
  createSupportCase(input: {
    category: SupportCategory;
    subject: string;
    body: string;
  }): Promise<SupportCaseDetail>;
  getCurrentUserEmail?(): Promise<string | null>;
  sendSupportCaseCreatedUserEmail?(input: {
    supportCase: SupportCaseDetail;
    userEmail: string | null;
    messagePreview: string;
  }): Promise<SupportEmailSendResult>;
  sendSupportCaseCreatedAdminEmail?(input: {
    supportCase: SupportCaseDetail;
    userEmail: string | null;
    messagePreview: string;
  }): Promise<SupportEmailSendResult>;
  revalidatePath(path: string): void;
};

const defaultDependencies: SupportRequestActionDependencies = {
  createSupportCase,
  async getCurrentUserEmail() {
    const user = await requireCurrentUser();
    return user.userEmail;
  },
  sendSupportCaseCreatedUserEmail,
  sendSupportCaseCreatedAdminEmail,
  revalidatePath,
};

const MAX_SUBJECT_LENGTH = 140;
const MAX_DESCRIPTION_LENGTH = 4000;

function formValue(formData: FormData, key: keyof SupportRequestFormValues): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isSupportRequestCategory(value: string): value is SupportCategory {
  return SUPPORT_REQUEST_CATEGORY_OPTIONS.some((option) => option.value === value);
}

function readSupportRequestValues(formData: FormData): SupportRequestFormValues {
  return {
    category: formValue(formData, 'category'),
    subject: formValue(formData, 'subject'),
    description: formValue(formData, 'description'),
  };
}

function validateSupportRequestValues(values: SupportRequestFormValues): {
  category: SupportCategory | null;
  fieldErrors: SupportRequestFieldErrors;
} {
  const fieldErrors: SupportRequestFieldErrors = {};

  if (!values.category) {
    fieldErrors.category = 'Choose a support category.';
  } else if (!isSupportRequestCategory(values.category)) {
    fieldErrors.category = 'Choose a valid support category.';
  }

  if (!values.subject) {
    fieldErrors.subject = 'Add a short subject.';
  } else if (values.subject.length > MAX_SUBJECT_LENGTH) {
    fieldErrors.subject = `Keep the subject to ${MAX_SUBJECT_LENGTH} characters or fewer.`;
  }

  if (!values.description) {
    fieldErrors.description = 'Describe what you need help with.';
  } else if (values.description.length > MAX_DESCRIPTION_LENGTH) {
    fieldErrors.description = `Keep the description to ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  return {
    category: isSupportRequestCategory(values.category) ? values.category : null,
    fieldErrors,
  };
}

function validationErrorState(
  values: SupportRequestFormValues,
  fieldErrors: SupportRequestFieldErrors,
): SupportRequestActionState {
  return {
    ok: false,
    message: null,
    publicReference: null,
    formError: 'Review the highlighted fields and try again.',
    fieldErrors,
    values,
  };
}

function genericFailureState(values: SupportRequestFormValues): SupportRequestActionState {
  return {
    ok: false,
    message: null,
    publicReference: null,
    formError: 'The support request could not be created. Try again, or contact Sonartra directly if the issue continues.',
    fieldErrors: {},
    values,
  };
}

async function notifySupportCaseCreated(params: {
  createdCase: SupportCaseDetail;
  messagePreview: string;
  dependencies: SupportRequestActionDependencies;
}) {
  if (
    !params.dependencies.getCurrentUserEmail ||
    !params.dependencies.sendSupportCaseCreatedUserEmail ||
    !params.dependencies.sendSupportCaseCreatedAdminEmail
  ) {
    return;
  }

  try {
    const userEmail = await params.dependencies.getCurrentUserEmail();
    await Promise.all([
      params.dependencies.sendSupportCaseCreatedUserEmail({
        supportCase: params.createdCase,
        userEmail,
        messagePreview: params.messagePreview,
      }),
      params.dependencies.sendSupportCaseCreatedAdminEmail({
        supportCase: params.createdCase,
        userEmail,
        messagePreview: params.messagePreview,
      }),
    ]);
  } catch (error) {
    console.error('[support-request] email notification failed', error);
  }
}

export async function createSupportRequestAction(
  _previousState: SupportRequestActionState,
  formData: FormData,
): Promise<SupportRequestActionState> {
  return createSupportRequestActionWithDependencies(formData, defaultDependencies);
}

export async function createSupportRequestActionWithDependencies(
  formData: FormData,
  dependencies: SupportRequestActionDependencies,
): Promise<SupportRequestActionState> {
  const values = readSupportRequestValues(formData);
  const validation = validateSupportRequestValues(values);

  if (Object.keys(validation.fieldErrors).length > 0 || !validation.category) {
    return validationErrorState(values, validation.fieldErrors);
  }

  try {
    const createdCase = await dependencies.createSupportCase({
      category: validation.category,
      subject: values.subject,
      body: values.description,
    });

    dependencies.revalidatePath('/app/support');
    await notifySupportCaseCreated({
      createdCase,
      messagePreview: values.description,
      dependencies,
    });

    return {
      ...initialSupportRequestActionState,
      ok: true,
      message: `Support request ${createdCase.publicReference} created.`,
      publicReference: createdCase.publicReference,
      values: emptySupportRequestFormValues,
    };
  } catch (error) {
    if (error instanceof SupportValidationError) {
      return validationErrorState(values, {
        description: 'Review the request details and try again.',
      });
    }

    console.error('[support-request] create failed', error);
    return genericFailureState(values);
  }
}
