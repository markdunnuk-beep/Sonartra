import { NextResponse } from 'next/server';

import {
  isAuthenticatedUserRequiredError,
  isClerkUserProfileRequiredError,
  isDisabledUserAccessError,
  requireCurrentUser,
} from '@/lib/server/request-user';
import type { RealtimeVoiceBootstrapPayload } from '@/lib/voice/realtime/realtime-voice.types';

type RealtimeBootstrapRequest = {
  assessmentKey?: string;
};

type OpenAIClientSecretResponse = {
  expires_at: number;
  value?: string;
  session?: {
    client_secret?: {
      value?: string;
      expires_at?: number;
    };
    model?: string;
    audio?: {
      output?: {
        voice?: string;
      };
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
  const clientSecret = payload.session?.client_secret?.value ?? payload.value;
  const expiresAt = payload.session?.client_secret?.expires_at ?? payload.expires_at;

  if (!clientSecret || !expiresAt) {
    return null;
  }

  return {
    provider: 'openai',
    session: {
      model: payload.session?.model ?? getRealtimeModel(),
      voice: payload.session?.audio?.output?.voice ?? getRealtimeVoice(),
      expiresAt,
      clientSecret,
    },
  };
}

export async function POST(request: Request) {
  try {
    await requireCurrentUser();
  } catch (error) {
    if (
      isAuthenticatedUserRequiredError(error)
      || isClerkUserProfileRequiredError(error)
    ) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (isDisabledUserAccessError(error)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }

  try {
    await request.json().catch(() => ({}) as RealtimeBootstrapRequest);

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'voice_bootstrap_unavailable' },
        { status: 503 },
      );
    }

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: buildSessionConfig(),
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'voice_bootstrap_failed' },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as OpenAIClientSecretResponse;
    const bootstrap = mapClientSecretResponse(payload);

    if (!bootstrap) {
      return NextResponse.json(
        { error: 'voice_bootstrap_invalid' },
        { status: 502 },
      );
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
    return NextResponse.json({ error: 'voice_bootstrap_failed' }, { status: 500 });
  }
}
