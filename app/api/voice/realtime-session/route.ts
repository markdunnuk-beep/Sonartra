import { NextResponse } from 'next/server';

import {
  isAuthenticatedUserRequiredError,
  isClerkUserProfileRequiredError,
  isDisabledUserAccessError,
  requireCurrentUser,
} from '@/lib/server/request-user';
import type {
  RealtimeVoiceBootstrapError,
  RealtimeVoiceBootstrapPayload,
} from '@/lib/voice/realtime/realtime-voice.types';

type RealtimeBootstrapRequest = {
  assessmentKey?: string;
};

type OpenAIClientSecretResponse = {
  client_secret?: {
    value?: string;
    expires_at?: number;
  };
  value?: string;
  expires_at?: number;
  session?: {
    model?: string;
    audio?: {
      output?: {
        voice?: string;
      };
    };
  };
  model?: string;
  audio?: {
    output?: {
      voice?: string;
    };
  };
};

function getRealtimeModel(): string {
  return process.env.SONARTRA_OPENAI_REALTIME_MODEL?.trim() || 'gpt-realtime-mini';
}

function getRealtimeVoice(): string {
  return process.env.SONARTRA_OPENAI_REALTIME_VOICE?.trim() || 'marin';
}

function buildSessionConfig(): string {
  return JSON.stringify({
    session: {
      type: 'realtime',
      model: getRealtimeModel(),
      audio: {
        output: {
          voice: getRealtimeVoice(),
        },
      },
    },
  });
}

function mapClientSecretResponse(
  payload: OpenAIClientSecretResponse,
): RealtimeVoiceBootstrapPayload | null {
  const clientSecret = payload.client_secret?.value ?? payload.value;
  const expiresAt = payload.client_secret?.expires_at ?? payload.expires_at;

  if (!clientSecret || !expiresAt) {
    return null;
  }

  return {
    provider: 'openai',
    session: {
      model: payload.model ?? payload.session?.model ?? getRealtimeModel(),
      voice: payload.audio?.output?.voice ?? payload.session?.audio?.output?.voice ?? getRealtimeVoice(),
      expiresAt,
      clientSecret,
    },
  };
}

function errorResponse(
  status: number,
  error: RealtimeVoiceBootstrapError,
) {
  return NextResponse.json(
    {
      ok: false,
      data: null,
      error,
    },
    { status },
  );
}

export async function POST(request: Request) {
  try {
    await requireCurrentUser();
  } catch (error) {
    if (
      isAuthenticatedUserRequiredError(error)
      || isClerkUserProfileRequiredError(error)
    ) {
      return errorResponse(401, {
        code: 'unauthorized',
        message: 'Sign in is required to start a voice session.',
      });
    }

    if (isDisabledUserAccessError(error)) {
      return errorResponse(403, {
        code: 'forbidden',
        message: 'Voice session access is not available for this account.',
      });
    }

    return errorResponse(500, {
      code: 'internal_error',
      message: 'Voice session bootstrap could not be initialised.',
    });
  }

  try {
    await request.json().catch(() => ({}) as RealtimeBootstrapRequest);

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return errorResponse(503, {
        code: 'missing_server_api_key',
        message: 'Voice runtime is not configured on the server.',
      });
    }

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: buildSessionConfig(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const providerBody = await response.text().catch(() => '');
      console.error('voice realtime bootstrap provider failure', {
        status: response.status,
        body: providerBody.slice(0, 500),
      });

      return errorResponse(502, {
        code: 'provider_bootstrap_failed',
        message: 'The realtime provider could not create a client voice session.',
      });
    }

    const payload = (await response.json()) as OpenAIClientSecretResponse;
    const bootstrap = mapClientSecretResponse(payload);

    if (!bootstrap) {
      console.error('voice realtime bootstrap malformed provider response', {
        keys: Object.keys(payload ?? {}),
      });

      return errorResponse(502, {
        code: 'malformed_provider_response',
        message: 'The realtime provider returned an incomplete client session.',
      });
    }

    return NextResponse.json(
      {
        ok: true,
        data: bootstrap,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('voice realtime bootstrap failed', error);
    return errorResponse(500, {
      code: 'internal_error',
      message: 'Voice session bootstrap failed before the realtime connection started.',
    });
  }
}
