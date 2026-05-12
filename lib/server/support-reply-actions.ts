'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  sendSupportUserReplyAdminEmail,
  type SupportEmailSendResult,
} from '@/lib/server/support-email-notifications';
import {
  addCurrentUserSupportMessage,
  SupportCaseClosedError,
  SupportCaseNotFoundError,
  SupportValidationError,
  type SupportCaseDetail,
} from '@/lib/server/support-service';
import {
  initialSupportReplyActionState,
  type SupportReplyActionState,
  type SupportReplyFieldErrors,
  type SupportReplyFormValues,
} from '@/lib/support/support-reply-action-state';

type SupportReplyActionDependencies = {
  addCurrentUserSupportMessage(input: {
    publicReference: string;
    body: string;
  }): Promise<SupportCaseDetail>;
  sendSupportUserReplyAdminEmail?(input: {
    supportCase: SupportCaseDetail;
    messagePreview: string;
  }): Promise<SupportEmailSendResult>;
  revalidatePath(path: string): void;
  redirect(path: string): never | void;
};

const defaultDependencies: SupportReplyActionDependencies = {
  addCurrentUserSupportMessage,
  sendSupportUserReplyAdminEmail,
  revalidatePath,
  redirect,
};

const MAX_REPLY_LENGTH = 4000;

function formValue(formData: FormData, key: keyof SupportReplyFormValues | 'caseReference'): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function validateReplyValues(values: SupportReplyFormValues): SupportReplyFieldErrors {
  const fieldErrors: SupportReplyFieldErrors = {};

  if (!values.body) {
    fieldErrors.body = 'Add a reply before sending.';
  } else if (values.body.length > MAX_REPLY_LENGTH) {
    fieldErrors.body = `Keep the reply to ${MAX_REPLY_LENGTH} characters or fewer.`;
  }

  return fieldErrors;
}

function validationErrorState(
  values: SupportReplyFormValues,
  fieldErrors: SupportReplyFieldErrors,
): SupportReplyActionState {
  return {
    ok: false,
    formError: 'Review the highlighted field and try again.',
    fieldErrors,
    values,
  };
}

function genericFailureState(values: SupportReplyFormValues): SupportReplyActionState {
  return {
    ok: false,
    formError: 'The reply could not be sent. Try again.',
    fieldErrors: {},
    values,
  };
}

async function notifySupportUserReply(params: {
  updatedCase: SupportCaseDetail;
  messagePreview: string;
  dependencies: SupportReplyActionDependencies;
}) {
  if (!params.dependencies.sendSupportUserReplyAdminEmail) {
    return;
  }

  try {
    await params.dependencies.sendSupportUserReplyAdminEmail({
      supportCase: params.updatedCase,
      messagePreview: params.messagePreview,
    });
  } catch (error) {
    console.error('[support-reply] email notification failed', error);
  }
}

export async function addSupportReplyAction(
  _previousState: SupportReplyActionState,
  formData: FormData,
): Promise<SupportReplyActionState> {
  return addSupportReplyActionWithDependencies(formData, defaultDependencies);
}

export async function addSupportReplyActionWithDependencies(
  formData: FormData,
  dependencies: SupportReplyActionDependencies,
): Promise<SupportReplyActionState> {
  const caseReference = formValue(formData, 'caseReference').toUpperCase();
  const values: SupportReplyFormValues = {
    body: formValue(formData, 'body'),
  };
  const fieldErrors = validateReplyValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return validationErrorState(values, fieldErrors);
  }

  let detailPath: string;

  try {
    const updatedCase = await dependencies.addCurrentUserSupportMessage({
      publicReference: caseReference,
      body: values.body,
    });
    detailPath = `/app/support/${updatedCase.publicReference}`;

    dependencies.revalidatePath('/app/support');
    dependencies.revalidatePath(detailPath);
    await notifySupportUserReply({
      updatedCase,
      messagePreview: values.body,
      dependencies,
    });
  } catch (error) {
    if (error instanceof SupportCaseClosedError) {
      return {
        ok: false,
        formError: 'This support request is closed. Create a new request if you need more help.',
        fieldErrors: {},
        values,
      };
    }

    if (error instanceof SupportCaseNotFoundError) {
      return {
        ok: false,
        formError: 'This support request could not be found.',
        fieldErrors: {},
        values,
      };
    }

    if (error instanceof SupportValidationError) {
      return validationErrorState(values, {
        body: 'Review the reply and try again.',
      });
    }

    console.error('[support-reply] send failed', error);
    return genericFailureState(values);
  }

  dependencies.redirect(detailPath);
  return initialSupportReplyActionState;
}
