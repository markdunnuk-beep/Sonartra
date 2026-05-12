import type {
  AdminSupportCaseDetail,
  SupportCaseDetail,
  SupportCategory,
  SupportStatus,
} from '@/lib/server/support-service';
import {
  formatAdminSupportStatus,
  formatSupportCategory,
} from '@/lib/support/support-display';

type SupportEmailEnvironment = {
  [key: string]: string | undefined;
  RESEND_API_KEY?: string;
  SUPPORT_EMAIL_FROM?: string;
  SUPPORT_EMAIL_TO?: string;
  APP_BASE_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

type SupportEmailFetch = typeof fetch;

export type SupportEmailSendRequest = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type SupportEmailSendResult =
  | {
      ok: true;
      skipped: false;
    }
  | {
      ok: false;
      skipped: true;
      reason: string;
    }
  | {
      ok: false;
      skipped: false;
      reason: string;
    };

type SupportEmailSkippedResult = Extract<
  SupportEmailSendResult,
  {
    ok: false;
    skipped: true;
  }
>;

export type SupportEmailDependencies = {
  env: SupportEmailEnvironment;
  fetch: SupportEmailFetch;
  logger: Pick<typeof console, 'error' | 'warn'>;
};

export type SupportCaseCreatedEmailInput = {
  supportCase: SupportCaseDetail;
  userEmail: string | null;
  messagePreview: string;
};

export type SupportUserReplyEmailInput = {
  supportCase: SupportCaseDetail;
  messagePreview: string;
};

export type SupportAdminReplyEmailInput = {
  supportCase: AdminSupportCaseDetail;
  messagePreview: string;
};

export type SupportStatusChangedEmailInput = {
  supportCase: AdminSupportCaseDetail;
  status: SupportStatus;
};

const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails';

function normalizeBaseUrl(env: SupportEmailEnvironment): string | null {
  const raw = env.APP_BASE_URL ?? env.NEXT_PUBLIC_APP_URL ?? '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed || null;
}

function truncatePreview(value: string, maxLength = 280): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildUserCaseUrl(env: SupportEmailEnvironment, publicReference: string): string | null {
  const baseUrl = normalizeBaseUrl(env);
  return baseUrl ? `${baseUrl}/app/support/${encodeURIComponent(publicReference)}` : null;
}

function buildAdminCaseUrl(env: SupportEmailEnvironment, publicReference: string): string | null {
  const baseUrl = normalizeBaseUrl(env);
  return baseUrl ? `${baseUrl}/admin/support/${encodeURIComponent(publicReference)}` : null;
}

function buildMessage(params: {
  heading: string;
  intro: string;
  publicReference: string;
  subject: string;
  category?: SupportCategory;
  status?: SupportStatus;
  messagePreview?: string;
  url: string;
  replyInstruction: string;
}): { text: string; html: string } {
  const lines = [
    'Sonartra Support',
    '',
    params.heading,
    '',
    params.intro,
    '',
    `Case: ${params.publicReference}`,
    `Subject: ${params.subject}`,
    params.category ? `Category: ${formatSupportCategory(params.category)}` : null,
    params.status ? `Status: ${formatAdminSupportStatus(params.status)}` : null,
    params.messagePreview ? `Message preview: ${truncatePreview(params.messagePreview)}` : null,
    '',
    params.replyInstruction,
    params.url,
  ].filter((line): line is string => line !== null);

  const htmlRows = [
    ['Case', params.publicReference],
    ['Subject', params.subject],
    params.category ? ['Category', formatSupportCategory(params.category)] : null,
    params.status ? ['Status', formatAdminSupportStatus(params.status)] : null,
    params.messagePreview ? ['Message preview', truncatePreview(params.messagePreview)] : null,
  ].filter((row): row is [string, string] => row !== null);

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#4b5563">Sonartra Support</p>
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(params.heading)}</h1>
      <p>${escapeHtml(params.intro)}</p>
      <table style="border-collapse:collapse;margin:20px 0">
        <tbody>
          ${htmlRows
            .map(
              ([label, value]) => `
                <tr>
                  <th style="text-align:left;padding:6px 18px 6px 0;color:#4b5563">${escapeHtml(label)}</th>
                  <td style="padding:6px 0">${escapeHtml(value)}</td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
      <p>${escapeHtml(params.replyInstruction)}</p>
      <p><a href="${escapeHtml(params.url)}">${escapeHtml(params.url)}</a></p>
    </div>
  `;

  return {
    text: lines.join('\n'),
    html,
  };
}

type SupportEmailConfig =
  | {
      ready: true;
      apiKey: string;
      from: string;
    }
  | {
      ready: false;
      result: SupportEmailSkippedResult;
    };

function resolveConfig(dependencies: SupportEmailDependencies): SupportEmailConfig {
  const apiKey = dependencies.env.RESEND_API_KEY?.trim();
  const from = dependencies.env.SUPPORT_EMAIL_FROM?.trim();
  const baseUrl = normalizeBaseUrl(dependencies.env);

  if (!apiKey) {
    return {
      ready: false,
      result: { ok: false, skipped: true, reason: 'missing_resend_api_key' },
    };
  }

  if (!from) {
    return {
      ready: false,
      result: { ok: false, skipped: true, reason: 'missing_support_email_from' },
    };
  }

  if (!baseUrl) {
    return {
      ready: false,
      result: { ok: false, skipped: true, reason: 'missing_app_base_url' },
    };
  }

  return { ready: true, apiKey, from };
}

export async function sendSupportEmailWithDependencies(
  request: SupportEmailSendRequest,
  dependencies: SupportEmailDependencies,
): Promise<SupportEmailSendResult> {
  const config = resolveConfig(dependencies);
  if (!config.ready) {
    dependencies.logger.warn('[support-email] skipped', config.result.reason);
    return config.result;
  }

  if (!request.to.trim()) {
    const result: SupportEmailSendResult = {
      ok: false,
      skipped: true,
      reason: 'missing_recipient',
    };
    dependencies.logger.warn('[support-email] skipped', result.reason);
    return result;
  }

  try {
    const response = await dependencies.fetch(RESEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: [request.to],
        subject: request.subject,
        text: request.text,
        html: request.html,
      }),
    });

    if (!response.ok) {
      dependencies.logger.error('[support-email] provider rejected message', {
        status: response.status,
      });
      return { ok: false, skipped: false, reason: 'provider_rejected' };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    dependencies.logger.error('[support-email] send failed', error);
    return { ok: false, skipped: false, reason: 'provider_unavailable' };
  }
}

function defaultDependencies(): SupportEmailDependencies {
  return {
    env: process.env,
    fetch,
    logger: console,
  };
}

export async function sendSupportCaseCreatedUserEmail(
  input: SupportCaseCreatedEmailInput,
): Promise<SupportEmailSendResult> {
  return sendSupportCaseCreatedUserEmailWithDependencies(input, defaultDependencies());
}

export async function sendSupportCaseCreatedUserEmailWithDependencies(
  input: SupportCaseCreatedEmailInput,
  dependencies: SupportEmailDependencies,
): Promise<SupportEmailSendResult> {
  const url = buildUserCaseUrl(dependencies.env, input.supportCase.publicReference);
  if (!url) {
    return { ok: false, skipped: true, reason: 'missing_app_base_url' };
  }

  const message = buildMessage({
    heading: `Support request ${input.supportCase.publicReference} created`,
    intro: 'We have received your support request.',
    publicReference: input.supportCase.publicReference,
    subject: input.supportCase.subject,
    category: input.supportCase.category,
    status: input.supportCase.status,
    messagePreview: input.messagePreview,
    url,
    replyInstruction: 'Please open your support request in Sonartra to reply.',
  });

  return sendSupportEmailWithDependencies(
    {
      to: input.userEmail ?? '',
      subject: `Support request ${input.supportCase.publicReference} created`,
      ...message,
    },
    dependencies,
  );
}

export async function sendSupportCaseCreatedAdminEmail(
  input: SupportCaseCreatedEmailInput,
): Promise<SupportEmailSendResult> {
  return sendSupportCaseCreatedAdminEmailWithDependencies(input, defaultDependencies());
}

export async function sendSupportCaseCreatedAdminEmailWithDependencies(
  input: SupportCaseCreatedEmailInput,
  dependencies: SupportEmailDependencies,
): Promise<SupportEmailSendResult> {
  const url = buildAdminCaseUrl(dependencies.env, input.supportCase.publicReference);
  if (!url) {
    return { ok: false, skipped: true, reason: 'missing_app_base_url' };
  }

  const message = buildMessage({
    heading: `New support request ${input.supportCase.publicReference}`,
    intro: 'A user created a new support request in Sonartra.',
    publicReference: input.supportCase.publicReference,
    subject: input.supportCase.subject,
    category: input.supportCase.category,
    status: input.supportCase.status,
    messagePreview: input.messagePreview,
    url,
    replyInstruction: 'Open the support case in Sonartra to reply.',
  });

  return sendSupportEmailWithDependencies(
    {
      to: dependencies.env.SUPPORT_EMAIL_TO ?? '',
      subject: `New support request ${input.supportCase.publicReference}`,
      ...message,
    },
    dependencies,
  );
}

export async function sendSupportUserReplyAdminEmail(
  input: SupportUserReplyEmailInput,
): Promise<SupportEmailSendResult> {
  return sendSupportUserReplyAdminEmailWithDependencies(input, defaultDependencies());
}

export async function sendSupportUserReplyAdminEmailWithDependencies(
  input: SupportUserReplyEmailInput,
  dependencies: SupportEmailDependencies,
): Promise<SupportEmailSendResult> {
  const url = buildAdminCaseUrl(dependencies.env, input.supportCase.publicReference);
  if (!url) {
    return { ok: false, skipped: true, reason: 'missing_app_base_url' };
  }

  const message = buildMessage({
    heading: `User replied to ${input.supportCase.publicReference}`,
    intro: 'A user added a public reply to a support request.',
    publicReference: input.supportCase.publicReference,
    subject: input.supportCase.subject,
    category: input.supportCase.category,
    status: input.supportCase.status,
    messagePreview: input.messagePreview,
    url,
    replyInstruction: 'Open the support case in Sonartra to reply.',
  });

  return sendSupportEmailWithDependencies(
    {
      to: dependencies.env.SUPPORT_EMAIL_TO ?? '',
      subject: `User replied to ${input.supportCase.publicReference}`,
      ...message,
    },
    dependencies,
  );
}

export async function sendSupportAdminReplyUserEmail(
  input: SupportAdminReplyEmailInput,
): Promise<SupportEmailSendResult> {
  return sendSupportAdminReplyUserEmailWithDependencies(input, defaultDependencies());
}

export async function sendSupportAdminReplyUserEmailWithDependencies(
  input: SupportAdminReplyEmailInput,
  dependencies: SupportEmailDependencies,
): Promise<SupportEmailSendResult> {
  const url = buildUserCaseUrl(dependencies.env, input.supportCase.publicReference);
  if (!url) {
    return { ok: false, skipped: true, reason: 'missing_app_base_url' };
  }

  const message = buildMessage({
    heading: `Sonartra support replied to ${input.supportCase.publicReference}`,
    intro: 'Sonartra support added a public reply to your support request.',
    publicReference: input.supportCase.publicReference,
    subject: input.supportCase.subject,
    category: input.supportCase.category,
    status: input.supportCase.status,
    messagePreview: input.messagePreview,
    url,
    replyInstruction: 'Please open your support request in Sonartra to reply.',
  });

  return sendSupportEmailWithDependencies(
    {
      to: input.supportCase.userEmail,
      subject: `Sonartra support replied to ${input.supportCase.publicReference}`,
      ...message,
    },
    dependencies,
  );
}

export async function sendSupportCaseStatusChangedUserEmail(
  input: SupportStatusChangedEmailInput,
): Promise<SupportEmailSendResult> {
  return sendSupportCaseStatusChangedUserEmailWithDependencies(input, defaultDependencies());
}

export async function sendSupportCaseStatusChangedUserEmailWithDependencies(
  input: SupportStatusChangedEmailInput,
  dependencies: SupportEmailDependencies,
): Promise<SupportEmailSendResult> {
  const url = buildUserCaseUrl(dependencies.env, input.supportCase.publicReference);
  if (!url) {
    return { ok: false, skipped: true, reason: 'missing_app_base_url' };
  }

  const readableStatus = formatAdminSupportStatus(input.status).toLowerCase();
  const message = buildMessage({
    heading: `Support request ${input.supportCase.publicReference} ${readableStatus}`,
    intro: `Your support request has been marked ${readableStatus}.`,
    publicReference: input.supportCase.publicReference,
    subject: input.supportCase.subject,
    category: input.supportCase.category,
    status: input.status,
    url,
    replyInstruction: 'Please open your support request in Sonartra to reply.',
  });

  return sendSupportEmailWithDependencies(
    {
      to: input.supportCase.userEmail,
      subject: `Support request ${input.supportCase.publicReference} ${readableStatus}`,
      ...message,
    },
    dependencies,
  );
}
