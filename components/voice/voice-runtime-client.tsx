'use client';

import { useEffect, useRef, useState } from 'react';

import {
  ButtonLink,
  LabelPill,
  MetaItem,
  StatusPill,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { createRealtimeVoiceAdapter } from '@/lib/voice/realtime/realtime-voice-adapter';
import type {
  RealtimeVoiceAdapter,
  RealtimeVoiceBootstrapPayload,
  RealtimeVoiceConnectionState,
} from '@/lib/voice/realtime/realtime-voice.types';

type VoiceRuntimeClientProps = {
  assessmentKey: string;
};

type BootstrapResponse =
  | {
      ok: true;
      data: RealtimeVoiceBootstrapPayload;
      error: null;
    }
  | {
      ok: false;
      data?: null;
      error: string;
    };

function mapRuntimeLabel(state: RealtimeVoiceConnectionState): string {
  switch (state) {
    case 'requesting_microphone':
      return 'Requesting microphone';
    case 'connecting':
      return 'Connecting';
    case 'connected':
      return 'Connected';
    case 'listening':
      return 'Listening';
    case 'speaking':
      return 'Speaking';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Connection error';
    case 'idle':
    default:
      return 'Idle';
  }
}

function mapRuntimeTone(
  state: RealtimeVoiceConnectionState,
): 'not_started' | 'in_progress' | 'ready' {
  switch (state) {
    case 'connected':
    case 'listening':
    case 'speaking':
      return 'ready';
    case 'requesting_microphone':
    case 'connecting':
      return 'in_progress';
    default:
      return 'not_started';
  }
}

export function VoiceRuntimeClient({
  assessmentKey,
}: Readonly<VoiceRuntimeClientProps>) {
  const adapterRef = useRef<RealtimeVoiceAdapter | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [runtimeState, setRuntimeState] = useState<RealtimeVoiceConnectionState>('idle');
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState<string | null>(null);

  async function cleanup(): Promise<void> {
    const adapter = adapterRef.current;
    adapterRef.current = null;

    if (adapter) {
      await adapter.disconnect().catch(() => undefined);
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }

  async function connect(): Promise<void> {
    if (
      typeof window === 'undefined'
      || !navigator.mediaDevices?.getUserMedia
      || typeof RTCPeerConnection === 'undefined'
    ) {
      setRuntimeState('error');
      setRuntimeError('This browser does not support the required voice runtime APIs.');
      return;
    }

    setRuntimeError(null);
    setTranscriptPreview(null);
    setRuntimeState('requesting_microphone');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setRuntimeState('connecting');

      const bootstrapResponse = await fetch('/api/voice/realtime-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assessmentKey }),
      });

      if (!bootstrapResponse.ok) {
        throw new Error('Voice session bootstrap failed.');
      }

      const bootstrapResult = (await bootstrapResponse.json()) as BootstrapResponse;
      if (!bootstrapResult.ok || !bootstrapResult.data) {
        throw new Error('Voice session bootstrap failed.');
      }

      const adapter = createRealtimeVoiceAdapter(bootstrapResult.data.provider);
      adapterRef.current = adapter;
      adapter.subscribe((event) => {
        switch (event.type) {
          case 'connecting':
            setRuntimeState('connecting');
            break;
          case 'connected':
            setRuntimeState('connected');
            break;
          case 'listening':
            setRuntimeState('listening');
            break;
          case 'speaking':
            setRuntimeState('speaking');
            break;
          case 'disconnected':
            setRuntimeState('disconnected');
            break;
          case 'transcript_partial':
            setTranscriptPreview(event.text);
            break;
          case 'transcript_final':
            setTranscriptPreview(event.text);
            break;
          case 'error':
            setRuntimeState('error');
            setRuntimeError(event.message);
            break;
          default:
            break;
        }
      });

      await adapter.connect({
        bootstrap: bootstrapResult.data,
        stream,
      });
      await adapter.startListening();
    } catch (error) {
      await cleanup();

      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone access was denied.'
          : error instanceof Error
            ? error.message
            : 'Voice runtime could not connect.';

      setRuntimeState('error');
      setRuntimeError(message);
    }
  }

  async function disconnect(): Promise<void> {
    await cleanup();
    setRuntimeState('disconnected');
    setTranscriptPreview(null);
  }

  useEffect(() => {
    return () => {
      void cleanup();
    };
  }, []);

  const connected =
    runtimeState === 'connected'
    || runtimeState === 'listening'
    || runtimeState === 'speaking';

  return (
    <SurfaceCard className="p-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill>Realtime shell</LabelPill>
              <StatusPill status={mapRuntimeTone(runtimeState)} label={mapRuntimeLabel(runtimeState)} />
            </div>
            <h3 className="text-[1.2rem] font-semibold tracking-[-0.02em] text-white">
              Live voice connection
            </h3>
            <p className="max-w-3xl text-sm leading-7 text-white/64">
              This connects the browser microphone and realtime provider session only. Guided questions,
              transcripts, and assessment writes are still intentionally out of scope here.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {connected || runtimeState === 'connecting' || runtimeState === 'requesting_microphone' ? (
              <button
                className="sonartra-button sonartra-button-secondary"
                onClick={() => void disconnect()}
                type="button"
              >
                Disconnect voice session
              </button>
            ) : (
              <button
                className="sonartra-button sonartra-button-primary"
                onClick={() => void connect()}
                type="button"
              >
                Start voice session
              </button>
            )}
            <ButtonLink href="/app/assessments" variant="secondary">
              Back to assessments
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MetaItem label="Runtime state" value={mapRuntimeLabel(runtimeState)} />
          <MetaItem label="Assessment key" value={assessmentKey} />
          <MetaItem
            label="Transcript preview"
            value={transcriptPreview ? 'Receiving in memory' : 'Not available yet'}
          />
        </div>

        {runtimeError ? (
          <div className="rounded-[1rem] border border-[rgba(255,126,126,0.18)] bg-[rgba(84,19,19,0.32)] px-4 py-3 text-sm leading-7 text-[rgba(255,214,214,0.88)]">
            {runtimeError}
          </div>
        ) : null}

        {transcriptPreview ? (
          <div className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
              Live transcript preview
            </p>
            <p className="mt-2 text-sm leading-7 text-white/80">{transcriptPreview}</p>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
