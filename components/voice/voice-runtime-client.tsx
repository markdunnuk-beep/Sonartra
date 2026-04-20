'use client';

import { useEffect, useRef, useState } from 'react';

import {
  ButtonLink,
  LabelPill,
  MetaItem,
  StatusPill,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import type { VoicePreparedAssessmentData } from '@/lib/server/voice/voice-attempt-orchestrator';
import {
  buildVoiceQuestionDeliveryInstructions,
  buildVoiceRuntimeSessionInstructions,
} from '@/lib/voice/runtime/voice-runtime-prompt';
import { createVoiceTurnManager } from '@/lib/voice/runtime/voice-turn-manager';
import type {
  VoiceTurnManager,
  VoiceTurnManagerQuestionRequest,
  VoiceTurnManagerSnapshot,
} from '@/lib/voice/runtime/voice-turn-manager.types';
import { createRealtimeVoiceAdapter } from '@/lib/voice/realtime/realtime-voice-adapter';
import type {
  RealtimeVoiceAdapter,
  RealtimeVoiceBootstrapPayload,
  RealtimeVoiceConnectionState,
} from '@/lib/voice/realtime/realtime-voice.types';

type VoiceRuntimeClientProps = {
  assessmentKey: string;
  preparedData: VoicePreparedAssessmentData;
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

function mapTurnStatusLabel(snapshot: VoiceTurnManagerSnapshot | null): string {
  if (!snapshot) {
    return 'Preparing canonical question flow';
  }

  switch (snapshot.status) {
    case 'completed':
      return 'All canonical questions delivered';
    case 'error':
      return 'Question delivery unavailable';
    case 'ready':
      return snapshot.questionHasBeenSpoken
        ? 'Current question delivered'
        : 'Current question ready';
    case 'idle':
    default:
      return 'Question flow idle';
  }
}

export function VoiceRuntimeClient({
  assessmentKey,
  preparedData,
}: Readonly<VoiceRuntimeClientProps>) {
  const adapterRef = useRef<RealtimeVoiceAdapter | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const turnManagerRef = useRef<VoiceTurnManager | null>(null);
  const questionRequestHandlerRef = useRef<(request: VoiceTurnManagerQuestionRequest) => void>(
    () => undefined,
  );
  const [runtimeState, setRuntimeState] = useState<RealtimeVoiceConnectionState>('idle');
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState<string | null>(null);
  const [turnSnapshot, setTurnSnapshot] = useState<VoiceTurnManagerSnapshot | null>(null);

  questionRequestHandlerRef.current = (request: VoiceTurnManagerQuestionRequest): void => {
    const adapter = adapterRef.current;
    if (!adapter) {
      setRuntimeError('Voice runtime is not connected to deliver the current canonical question.');
      return;
    }

    adapter.createResponse({
      conversation: 'none',
      outputModalities: ['audio'],
      metadata: {
        topic: 'sonartra_question_delivery',
        questionId: request.question.questionId,
        questionNumber: String(request.question.questionNumber),
        reason: request.reason,
      },
      instructions: buildVoiceQuestionDeliveryInstructions({
        assessment: request.assessment,
        question: request.question,
        totalQuestionCount: request.totalQuestionCount,
        reason: request.reason,
      }),
    });
  };

  useEffect(() => {
    const manager = createVoiceTurnManager({
      assessment: {
        assessmentKey: preparedData.assessment.assessmentKey,
        title: preparedData.assessment.title,
        versionTag: preparedData.assessment.versionTag,
      },
      questions: preparedData.delivery.questions,
      currentQuestionIndex: preparedData.delivery.currentQuestionIndex,
      callbacks: {
        onQuestionRequested: (request) => {
          questionRequestHandlerRef.current(request);
        },
      },
    });

    turnManagerRef.current = manager;
    setTurnSnapshot(manager.getSnapshot());

    const unsubscribe = manager.subscribe((snapshot) => {
      setTurnSnapshot(snapshot);
    });

    return () => {
      unsubscribe();
      turnManagerRef.current = null;
    };
  }, [
    preparedData.assessment.assessmentKey,
    preparedData.assessment.title,
    preparedData.assessment.versionTag,
    preparedData.delivery.currentQuestionIndex,
    preparedData.delivery.questions,
  ]);

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
    const manager = turnManagerRef.current;
    const snapshot = manager?.getSnapshot() ?? null;

    if (!manager || !snapshot) {
      setRuntimeState('error');
      setRuntimeError('Voice runtime could not load the canonical question flow.');
      return;
    }

    if (snapshot.status === 'error') {
      setRuntimeState('error');
      setRuntimeError(snapshot.error ?? 'Voice question delivery is unavailable.');
      return;
    }

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

      adapter.updateSession({
        instructions: buildVoiceRuntimeSessionInstructions({
          assessment: snapshot.assessment,
          totalQuestionCount: snapshot.totalQuestionCount,
        }),
        outputModalities: ['audio'],
      });
      await adapter.startListening();

      const latestSnapshot = manager.getSnapshot();
      if (latestSnapshot.status === 'completed') {
        return;
      }

      if (latestSnapshot.questionHasBeenSpoken) {
        manager.repeatCurrentQuestion();
      } else {
        manager.requestInitialQuestion();
      }
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

  function repeatQuestion(): void {
    const manager = turnManagerRef.current;
    if (!manager) {
      setRuntimeError('Voice question delivery is unavailable.');
      return;
    }

    const snapshot = manager.getSnapshot();
    if (snapshot.status === 'completed') {
      setRuntimeError('All canonical questions have already been delivered.');
      return;
    }

    manager.repeatCurrentQuestion();
  }

  function nextQuestion(): void {
    const manager = turnManagerRef.current;
    if (!manager) {
      setRuntimeError('Voice question delivery is unavailable.');
      return;
    }

    const snapshot = manager.getSnapshot();
    if (snapshot.status === 'completed') {
      setRuntimeError('All canonical questions have already been delivered.');
      return;
    }

    manager.advanceToNextQuestion();
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
  const canControlQuestions = connected && turnSnapshot?.status === 'ready';

  return (
    <SurfaceCard className="p-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill>Guided runtime</LabelPill>
              <StatusPill status={mapRuntimeTone(runtimeState)} label={mapRuntimeLabel(runtimeState)} />
              <LabelPill className="bg-white/[0.04] text-white/74">
                {mapTurnStatusLabel(turnSnapshot)}
              </LabelPill>
            </div>
            <h3 className="text-[1.2rem] font-semibold tracking-[-0.02em] text-white">
              Canonical question delivery
            </h3>
            <p className="max-w-3xl text-sm leading-7 text-white/64">
              The live session now asks authored Sonartra questions one at a time in canonical order.
              Answer resolution, transcript persistence, and assessment completion remain outside this layer.
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

        <div className="grid gap-3 md:grid-cols-4">
          <MetaItem label="Runtime state" value={mapRuntimeLabel(runtimeState)} />
          <MetaItem label="Assessment key" value={assessmentKey} />
          <MetaItem
            label="Current question"
            value={
              turnSnapshot?.activeQuestionNumber
                ? `${turnSnapshot.activeQuestionNumber} / ${turnSnapshot.totalQuestionCount}`
                : 'Completed'
            }
          />
          <MetaItem
            label="Question spoken"
            value={turnSnapshot?.questionHasBeenSpoken ? 'Yes' : 'No'}
          />
        </div>

        {runtimeError ? (
          <div className="rounded-[1rem] border border-[rgba(255,126,126,0.18)] bg-[rgba(84,19,19,0.32)] px-4 py-3 text-sm leading-7 text-[rgba(255,214,214,0.88)]">
            {runtimeError}
          </div>
        ) : null}

        {turnSnapshot?.status === 'error' ? (
          <div className="rounded-[1rem] border border-[rgba(255,196,97,0.2)] bg-[rgba(77,53,13,0.28)] px-4 py-3 text-sm leading-7 text-[rgba(255,233,191,0.88)]">
            {turnSnapshot.error ?? 'Canonical question delivery is unavailable for this session.'}
          </div>
        ) : null}

        {turnSnapshot?.status === 'ready' && turnSnapshot.activeQuestion ? (
          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
            <div className="rounded-[1.2rem] border border-white/8 bg-black/10 p-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <LabelPill>
                    Question {turnSnapshot.activeQuestion.questionNumber} of {turnSnapshot.totalQuestionCount}
                  </LabelPill>
                  <LabelPill className="bg-white/[0.04] text-white/74">
                    {turnSnapshot.questionHasBeenSpoken ? 'Spoken' : 'Ready to speak'}
                  </LabelPill>
                </div>
                <h4 className="text-[1.2rem] font-semibold tracking-[-0.02em] text-white">
                  {turnSnapshot.activeQuestion.prompt}
                </h4>
                <p className="text-sm leading-7 text-white/62">
                  The host will ask this authored question exactly as written. Progression remains client-driven in
                  this stage.
                </p>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-white/8 bg-black/10 p-5">
              <div className="space-y-4">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                    Runtime controls
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/64">
                    Repeat the current authored prompt or advance manually to the next canonical question.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className="sonartra-button sonartra-button-secondary"
                    disabled={!canControlQuestions}
                    onClick={repeatQuestion}
                    type="button"
                  >
                    Repeat question
                  </button>
                  <button
                    className="sonartra-button sonartra-button-primary"
                    disabled={!canControlQuestions}
                    onClick={nextQuestion}
                    type="button"
                  >
                    Next question
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {turnSnapshot?.status === 'completed' ? (
          <div className="rounded-[1.2rem] border border-white/8 bg-black/10 p-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <LabelPill>Question delivery complete</LabelPill>
                <StatusPill status="ready" label="Awaiting later answer handling" />
              </div>
              <h4 className="text-[1.2rem] font-semibold tracking-[-0.02em] text-white">
                Every canonical question has been delivered in order.
              </h4>
              <p className="max-w-3xl text-sm leading-7 text-white/64">
                This runtime stops after authored question delivery. Answer interpretation, persistence, and completion
                handoff are introduced in later tasks.
              </p>
            </div>
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
