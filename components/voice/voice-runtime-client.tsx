'use client';

import { useEffect, useRef, useState } from 'react';

import {
  resolveVoiceAnswerAction,
  settleResolvedVoiceAnswerAction,
  startVoiceSessionAction,
  type VoiceAnswerResolutionActionPayload,
  type VoiceAnswerSettlementActionPayload,
} from '@/app/(user)/app/voice-assessments/actions';
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
import type {
  VoiceConfirmationState,
  VoiceResolutionSettlementIntent,
} from '@/lib/voice/resolution/voice-resolution.types';
import { createVoiceTurnManager } from '@/lib/voice/runtime/voice-turn-manager';
import type {
  VoiceTurnManager,
  VoiceTurnManagerQuestionRequest,
  VoiceTurnManagerSnapshot,
} from '@/lib/voice/runtime/voice-turn-manager.types';
import { createRealtimeVoiceAdapter } from '@/lib/voice/realtime/realtime-voice-adapter';
import type {
  RealtimeVoiceAdapter,
  RealtimeVoiceBootstrapError,
  RealtimeVoiceBootstrapPayload,
  RealtimeVoiceConnectionState,
  RealtimeVoiceRuntimeErrorCode,
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
      data: null;
      error: RealtimeVoiceBootstrapError;
    };

type RuntimeDiagnostic = {
  stage:
    | 'idle'
    | 'microphone'
    | 'bootstrap'
    | 'negotiation'
    | 'session_initialization'
    | 'connected'
    | 'disconnected'
    | 'error';
  code: RealtimeVoiceRuntimeErrorCode | null;
};

const VOICE_DEBUG_ENABLED = process.env.NEXT_PUBLIC_VOICE_DEBUG === 'true';

function getRuntimeStageLabel(stage: RuntimeDiagnostic['stage']): string {
  switch (stage) {
    case 'microphone':
      return 'Microphone';
    case 'bootstrap':
      return 'Bootstrap';
    case 'negotiation':
      return 'Negotiation';
    case 'session_initialization':
      return 'Session initialisation';
    case 'connected':
      return 'Connected';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Error';
    case 'idle':
    default:
      return 'Idle';
  }
}

function mapBootstrapErrorToMessage(error: RealtimeVoiceBootstrapError): string {
  switch (error.code) {
    case 'missing_server_api_key':
      return 'Voice runtime is not configured on the server.';
    case 'provider_bootstrap_failed':
      return 'Voice session could not be initialised by the realtime provider.';
    case 'malformed_provider_response':
      return 'Server bootstrap did not return a valid client session.';
    case 'unauthorized':
      return 'Sign in is required before a voice session can start.';
    case 'forbidden':
      return 'Voice session access is not available for this account.';
    case 'unsupported_runtime_configuration':
      return 'Voice runtime is configured with an unsupported setup.';
    case 'internal_error':
    default:
      return error.message || 'Voice session bootstrap failed before the realtime connection started.';
  }
}

function mapRuntimeErrorCodeToMessage(code: RealtimeVoiceRuntimeErrorCode, fallback: string): string {
  switch (code) {
    case 'microphone_denied':
      return 'Microphone access was denied.';
    case 'browser_unsupported':
      return 'This browser does not support the required voice runtime APIs.';
    case 'provider_bootstrap_failed':
    case 'missing_server_api_key':
    case 'malformed_provider_response':
    case 'unauthorized':
    case 'forbidden':
    case 'unsupported_runtime_configuration':
      return fallback;
    case 'peer_connection_failed':
      return 'Voice session could not start a peer connection.';
    case 'offer_creation_failed':
      return 'Realtime negotiation could not create an offer.';
    case 'local_description_failed':
      return 'Realtime negotiation could not prepare the local session description.';
    case 'negotiation_failed':
      return 'Realtime negotiation failed after microphone access.';
    case 'remote_description_failed':
      return 'Realtime negotiation returned an invalid remote session description.';
    case 'session_init_failed':
      return 'Voice session connected, but realtime session initialisation did not complete.';
    case 'data_channel_failed':
      return 'Voice session connected, but the realtime control channel failed.';
    case 'first_response_failed':
      return 'The first question could not be delivered.';
    case 'remote_audio_failed':
      return 'Audio playback could not be started.';
    case 'disconnected':
      return 'Voice session disconnected before it was ready.';
    case 'internal_error':
    case 'unknown':
    default:
      return fallback;
  }
}

function mapRuntimeLabel(state: RealtimeVoiceConnectionState): string {
  switch (state) {
    case 'requesting_microphone':
      return 'Requesting microphone';
    case 'bootstrapping':
      return 'Bootstrapping session';
    case 'connecting':
      return 'Connecting';
    case 'negotiating':
      return 'Negotiating realtime session';
    case 'session_initializing':
      return 'Initialising session';
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
    case 'bootstrapping':
    case 'connecting':
    case 'negotiating':
    case 'session_initializing':
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

function mapAnswerGateLabel(state: VoiceConfirmationState): string {
  switch (state) {
    case 'auto_accept':
      return 'Auto-accepting candidate';
    case 'require_confirmation':
      return 'Awaiting confirmation';
    case 'require_retry':
      return 'Needs retry or correction';
    case 'confirmed':
      return 'Confirmed';
    case 'corrected':
      return 'Corrected';
    case 'rejected':
      return 'Rejected';
    case 'runtime_error':
      return 'Resolution error';
    case 'pending':
    default:
      return 'Pending answer';
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
  const [runtimeDiagnostic, setRuntimeDiagnostic] = useState<RuntimeDiagnostic>({
    stage: 'idle',
    code: null,
  });
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [answerExcerpt, setAnswerExcerpt] = useState('');
  const [resolutionOutcome, setResolutionOutcome] = useState<VoiceAnswerResolutionActionPayload | null>(null);
  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [settlementOutcome, setSettlementOutcome] = useState<VoiceAnswerSettlementActionPayload | null>(null);
  const [settlementMessage, setSettlementMessage] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  function debugLog(label: string, details?: Record<string, unknown>): void {
    if (!VOICE_DEBUG_ENABLED) {
      return;
    }

    console.debug('[voice-runtime]', label, details ?? {});
  }

  questionRequestHandlerRef.current = (request: VoiceTurnManagerQuestionRequest): void => {
    const adapter = adapterRef.current;
    const manager = turnManagerRef.current;
    if (!adapter) {
      setRuntimeError('Voice runtime is not connected to deliver the current canonical question.');
      setRuntimeDiagnostic({
        stage: 'error',
        code: 'session_init_failed',
      });
      return;
    }

    void adapter
      .createResponse({
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
      })
      .then(() => {
        manager?.markCurrentQuestionSpoken();
        debugLog('question_dispatch_acknowledged', {
          questionId: request.question.questionId,
          questionNumber: request.question.questionNumber,
        });
      })
      .catch((error) => {
        const code: RealtimeVoiceRuntimeErrorCode = 'first_response_failed';
        setRuntimeState('error');
        setRuntimeDiagnostic({
          stage: 'error',
          code,
        });
        setRuntimeError(
          error instanceof Error
            ? mapRuntimeErrorCodeToMessage(code, error.message)
            : mapRuntimeErrorCodeToMessage(code, 'The first question could not be delivered.'),
        );
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

  useEffect(() => {
    setAnswerExcerpt('');
    setResolutionOutcome(null);
    setResolutionMessage(null);
    setSettlementOutcome(null);
    setSettlementMessage(null);
    turnManagerRef.current?.setAnswerConfirmationState('pending');
  }, [turnSnapshot?.activeQuestion?.questionId]);

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
    setResolutionMessage(null);
    setResolutionOutcome(null);
    setSettlementMessage(null);
    setSettlementOutcome(null);
    setVoiceSessionId(null);
    manager.setAnswerConfirmationState('pending');
    manager.resetCurrentQuestionDelivery();
    setRuntimeState('requesting_microphone');
    setRuntimeDiagnostic({
      stage: 'microphone',
      code: null,
    });
    debugLog('requesting_microphone');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setRuntimeState('bootstrapping');
      setRuntimeDiagnostic({
        stage: 'bootstrap',
        code: null,
      });
      debugLog('microphone_granted');

      const bootstrapResponse = await fetch('/api/voice/realtime-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assessmentKey }),
      });

      const bootstrapResult = (await bootstrapResponse.json()) as BootstrapResponse;
      if (!bootstrapResult.ok || !bootstrapResult.data) {
        debugLog('bootstrap_failed', {
          status: bootstrapResponse.status,
          code: bootstrapResult.error.code,
        });
        throw new RuntimeClientError(
          bootstrapResult.error.code,
          mapBootstrapErrorToMessage(bootstrapResult.error),
        );
      }

      const adapter = createRealtimeVoiceAdapter(bootstrapResult.data.provider);
      adapterRef.current = adapter;
      adapter.subscribe((event) => {
        switch (event.type) {
          case 'connecting':
            setRuntimeState('connecting');
            setRuntimeDiagnostic({
              stage: 'negotiation',
              code: null,
            });
            debugLog('adapter_connecting');
            break;
          case 'negotiating':
            setRuntimeState('negotiating');
            setRuntimeDiagnostic({
              stage: 'negotiation',
              code: null,
            });
            debugLog('adapter_negotiating');
            break;
          case 'session_initializing':
            setRuntimeState('session_initializing');
            setRuntimeDiagnostic({
              stage: 'session_initialization',
              code: null,
            });
            debugLog('adapter_session_initializing');
            break;
          case 'connected':
            setRuntimeState('connected');
            setRuntimeDiagnostic({
              stage: 'connected',
              code: null,
            });
            debugLog('adapter_connected');
            break;
          case 'listening':
            setRuntimeState('listening');
            setRuntimeDiagnostic({
              stage: 'connected',
              code: null,
            });
            break;
          case 'speaking':
            setRuntimeState('speaking');
            setRuntimeDiagnostic({
              stage: 'connected',
              code: null,
            });
            break;
          case 'disconnected':
            setRuntimeState('disconnected');
            setRuntimeDiagnostic({
              stage: 'disconnected',
              code: 'disconnected',
            });
            debugLog('adapter_disconnected');
            break;
          case 'transcript_partial':
            setTranscriptPreview(event.text);
            break;
          case 'transcript_final':
            setTranscriptPreview(event.text);
            break;
          case 'error':
            setRuntimeState('error');
            setRuntimeDiagnostic({
              stage: 'error',
              code: event.code,
            });
            setRuntimeError(mapRuntimeErrorCodeToMessage(event.code, event.message));
            debugLog('adapter_error', {
              code: event.code,
            });
            break;
          default:
            break;
        }
      });

      await adapter.connect({
        bootstrap: bootstrapResult.data,
        stream,
      });
      debugLog('adapter_connect_resolved');

      await adapter.updateSession({
        instructions: buildVoiceRuntimeSessionInstructions({
          assessment: snapshot.assessment,
          totalQuestionCount: snapshot.totalQuestionCount,
        }),
        outputModalities: ['audio'],
      });
      await adapter.startListening();
      debugLog('session_ready_for_question_delivery');

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

      const runtimeErrorCode =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'microphone_denied'
          : error instanceof RuntimeClientError
            ? error.code
            : 'unknown';
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone access was denied.'
          : error instanceof RuntimeClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Voice runtime could not connect.';

      setRuntimeState('error');
      setRuntimeError(message);
      setRuntimeDiagnostic({
        stage: 'error',
        code: runtimeErrorCode,
      });
      debugLog('connect_failed', {
        code: runtimeErrorCode,
      });
    }
  }

  async function disconnect(): Promise<void> {
    await cleanup();
    setRuntimeState('disconnected');
    setTranscriptPreview(null);
    setRuntimeDiagnostic({
      stage: 'disconnected',
      code: null,
    });
  }

  async function ensureVoiceSession(): Promise<string> {
    if (voiceSessionId) {
      return voiceSessionId;
    }

    const sessionResult = await startVoiceSessionAction({
      attemptId: preparedData.attempt.attemptId,
      assessmentId: preparedData.assessment.assessmentId,
      assessmentVersionId: preparedData.assessment.assessmentVersionId,
      provider: 'openai',
      model: 'gpt-realtime-mini',
      locale: null,
    });

    if (!sessionResult.ok || !sessionResult.data) {
      throw new Error(sessionResult.error ?? 'Voice session audit could not be started.');
    }

    setVoiceSessionId(sessionResult.data.id);
    return sessionResult.data.id;
  }

  async function settleCurrentAnswer(
    intent: VoiceResolutionSettlementIntent,
    correctedOptionId?: string | null,
  ): Promise<void> {
    const activeQuestion = turnSnapshot?.activeQuestion;
    const manager = turnManagerRef.current;

    if (!activeQuestion || !manager) {
      setSettlementMessage('No active question is available for confirmation.');
      return;
    }

    setIsSettling(true);
    setSettlementMessage(null);

    try {
      const activeVoiceSessionId = await ensureVoiceSession();
      const result = await settleResolvedVoiceAnswerAction({
        voiceSessionId: activeVoiceSessionId,
        questionId: activeQuestion.questionId,
        intent,
        correctedOptionId: correctedOptionId ?? null,
      });

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? 'Voice answer confirmation failed.');
      }

      setSettlementOutcome(result.data);
      if (result.data.status === 'confirmed') {
        manager.setAnswerConfirmationState('confirmed');
      } else if (result.data.status === 'corrected') {
        manager.setAnswerConfirmationState('corrected');
      } else {
        manager.setAnswerConfirmationState('rejected');
      }
    } catch (error) {
      manager.setAnswerConfirmationState('runtime_error');
      setSettlementOutcome(null);
      setSettlementMessage(
        error instanceof Error ? error.message : 'Voice answer confirmation failed.',
      );
    } finally {
      setIsSettling(false);
    }
  }

  function repeatQuestion(): void {
    const manager = turnManagerRef.current;
    if (!manager) {
      setRuntimeError('Voice question delivery is unavailable.');
      setRuntimeDiagnostic({
        stage: 'error',
        code: 'session_init_failed',
      });
      return;
    }

    const snapshot = manager.getSnapshot();
    if (snapshot.status === 'completed') {
      setRuntimeError('All canonical questions have already been delivered.');
      setRuntimeDiagnostic({
        stage: 'error',
        code: 'session_init_failed',
      });
      return;
    }

    manager.repeatCurrentQuestion();
  }

  function nextQuestion(): void {
    const manager = turnManagerRef.current;
    if (!manager) {
      setRuntimeError('Voice question delivery is unavailable.');
      setRuntimeDiagnostic({
        stage: 'error',
        code: 'session_init_failed',
      });
      return;
    }

    const snapshot = manager.getSnapshot();
    if (snapshot.status === 'completed') {
      setRuntimeError('All canonical questions have already been delivered.');
      setRuntimeDiagnostic({
        stage: 'error',
        code: 'session_init_failed',
      });
      return;
    }

    if (!snapshot.canAdvance) {
      setRuntimeError('Confirm or correct the current answer before advancing to the next question.');
      setRuntimeDiagnostic({
        stage: 'error',
        code: 'session_init_failed',
      });
      return;
    }

    manager.advanceToNextQuestion();
  }

  async function resolveCurrentAnswer(): Promise<void> {
    const activeQuestion = turnSnapshot?.activeQuestion;
    if (!activeQuestion) {
      setResolutionMessage('No active question is available for resolution.');
      setResolutionOutcome(null);
      return;
    }

    setIsResolving(true);
    setResolutionMessage(null);
    setSettlementMessage(null);
    setSettlementOutcome(null);

    try {
      const activeVoiceSessionId = await ensureVoiceSession();
      const result = await resolveVoiceAnswerAction({
        voiceSessionId: activeVoiceSessionId,
        questionId: activeQuestion.questionId,
        sourceExcerpt: answerExcerpt,
      });

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? 'Voice answer resolution failed.');
      }

      setResolutionOutcome(result.data);
      turnManagerRef.current?.setAnswerConfirmationState(result.data.confirmationMode);

      if (result.data.confirmationMode === 'auto_accept' && result.data.inferredOptionId) {
        await settleCurrentAnswer('confirm');
      }
    } catch (error) {
      turnManagerRef.current?.setAnswerConfirmationState('runtime_error');
      setResolutionOutcome(null);
      setResolutionMessage(
        error instanceof Error ? error.message : 'Voice answer resolution failed.',
      );
    } finally {
      setIsResolving(false);
    }
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
  const canRepeatQuestions = connected && turnSnapshot?.status === 'ready';
  const canAdvanceQuestions = canRepeatQuestions && Boolean(turnSnapshot?.canAdvance);
  const canResolveAnswer =
    connected
    && turnSnapshot?.status === 'ready'
    && turnSnapshot.activeQuestion !== null
    && !isResolving
    && !isSettling;

  function renderResolutionOutcome() {
    if (resolutionMessage || settlementMessage) {
      return (
        <div className="rounded-[1rem] border border-[rgba(255,126,126,0.18)] bg-[rgba(84,19,19,0.32)] px-4 py-3 text-sm leading-7 text-[rgba(255,214,214,0.88)]">
          {settlementMessage ?? resolutionMessage}
        </div>
      );
    }

    if (settlementOutcome?.status === 'confirmed') {
      return (
        <div className="rounded-[1rem] border border-[rgba(111,214,163,0.18)] bg-[rgba(18,71,54,0.28)] px-4 py-3 text-sm leading-7 text-[rgba(219,255,239,0.9)]">
          Captured answer:
          {' '}
          {settlementOutcome.finalSelectedOptionLabel ?? 'Option'}
          {' '}
          {settlementOutcome.finalSelectedOptionText ?? ''}
          . This answer is confirmed locally and can advance when you are ready.
        </div>
      );
    }

    if (settlementOutcome?.status === 'corrected') {
      return (
        <div className="rounded-[1rem] border border-[rgba(111,214,163,0.18)] bg-[rgba(18,71,54,0.28)] px-4 py-3 text-sm leading-7 text-[rgba(219,255,239,0.9)]">
          Corrected answer:
          {' '}
          {settlementOutcome.finalSelectedOptionLabel ?? 'Option'}
          {' '}
          {settlementOutcome.finalSelectedOptionText ?? ''}
          . This corrected option is now the intended local answer for this question.
        </div>
      );
    }

    if (settlementOutcome?.status === 'rejected') {
      return (
        <div className="rounded-[1rem] border border-[rgba(255,196,97,0.2)] bg-[rgba(77,53,13,0.28)] px-4 py-3 text-sm leading-7 text-[rgba(255,233,191,0.88)]">
          The inferred candidate was rejected. Ask the user to answer again or choose the intended authored option below.
        </div>
      );
    }

    if (!resolutionOutcome) {
      return null;
    }

    if (resolutionOutcome.confirmationMode === 'auto_accept') {
      return (
        <div className="rounded-[1rem] border border-[rgba(111,214,163,0.18)] bg-[rgba(18,71,54,0.28)] px-4 py-3 text-sm leading-7 text-[rgba(219,255,239,0.9)]">
          High-confidence candidate captured:
          {' '}
          {resolutionOutcome.inferredOptionLabel ?? 'Option'}
          {' '}
          {resolutionOutcome.inferredOptionText ?? ''}
          {resolutionOutcome.confidence !== null
            ? ` (${Math.round(resolutionOutcome.confidence * 100)}% confidence)`
            : ''}
          . Final local confirmation is being recorded.
        </div>
      );
    }

    if (resolutionOutcome.confirmationMode === 'require_confirmation') {
      return (
        <div className="space-y-3 rounded-[1rem] border border-[rgba(255,196,97,0.2)] bg-[rgba(77,53,13,0.28)] px-4 py-3 text-sm leading-7 text-[rgba(255,233,191,0.88)]">
          <p>
            I heard this as:
            {' '}
            {resolutionOutcome.inferredOptionLabel ?? 'Option'}
            {' '}
            {resolutionOutcome.inferredOptionText ?? ''}
            {resolutionOutcome.confidence !== null
              ? ` (${Math.round(resolutionOutcome.confidence * 100)}% confidence)`
              : ''}
            . Confirm before the runtime advances.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className="sonartra-button sonartra-button-primary"
              disabled={isSettling}
              onClick={() => void settleCurrentAnswer('confirm')}
              type="button"
            >
              {isSettling ? 'Saving confirmation' : 'Confirm answer'}
            </button>
            <button
              className="sonartra-button sonartra-button-secondary"
              disabled={isSettling}
              onClick={() => void settleCurrentAnswer('reject')}
              type="button"
            >
              Ask again
            </button>
          </div>
        </div>
      );
    }

    if (resolutionOutcome.status === 'invalid_input') {
      return (
        <div className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3 text-sm leading-7 text-white/72">
          A current answer excerpt is required before the voice runtime can attempt resolution.
        </div>
      );
    }

    if (resolutionOutcome.status === 'runtime_error') {
      return (
        <div className="rounded-[1rem] border border-[rgba(255,126,126,0.18)] bg-[rgba(84,19,19,0.32)] px-4 py-3 text-sm leading-7 text-[rgba(255,214,214,0.88)]">
          Voice answer resolution could not complete for this question.
        </div>
      );
    }

    return (
      <div className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3 text-sm leading-7 text-white/72">
        No single authored option can be accepted yet. Ask the user to answer again or choose the intended authored option explicitly.
      </div>
    );
  }

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
            {connected
              || runtimeState === 'requesting_microphone'
              || runtimeState === 'bootstrapping'
              || runtimeState === 'connecting'
              || runtimeState === 'negotiating'
              || runtimeState === 'session_initializing' ? (
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
          <MetaItem label="Connection stage" value={getRuntimeStageLabel(runtimeDiagnostic.stage)} />
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
          <MetaItem
            label="Answer gate"
            value={mapAnswerGateLabel(turnSnapshot?.answerConfirmationState ?? 'pending')}
          />
        </div>

        {runtimeError ? (
          <div className="rounded-[1rem] border border-[rgba(255,126,126,0.18)] bg-[rgba(84,19,19,0.32)] px-4 py-3 text-sm leading-7 text-[rgba(255,214,214,0.88)]">
            <p>{runtimeError}</p>
            {runtimeState === 'error' ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  className="sonartra-button sonartra-button-secondary"
                  onClick={() => void connect()}
                  type="button"
                >
                  Retry voice session
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {turnSnapshot?.status === 'error' ? (
          <div className="rounded-[1rem] border border-[rgba(255,196,97,0.2)] bg-[rgba(77,53,13,0.28)] px-4 py-3 text-sm leading-7 text-[rgba(255,233,191,0.88)]">
            {turnSnapshot.error ?? 'Canonical question delivery is unavailable for this session.'}
          </div>
        ) : null}

        {turnSnapshot?.status === 'ready' && turnSnapshot.activeQuestion ? (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
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
                    Repeat the current authored prompt. The next question only unlocks after the current answer is confirmed or corrected.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className="sonartra-button sonartra-button-secondary"
                    disabled={!canRepeatQuestions}
                    onClick={repeatQuestion}
                    type="button"
                  >
                    Repeat question
                  </button>
                  <button
                    className="sonartra-button sonartra-button-primary"
                    disabled={!canAdvanceQuestions}
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

        {turnSnapshot?.status === 'ready' && turnSnapshot.activeQuestion ? (
          <div className="rounded-[1.2rem] border border-white/8 bg-black/10 p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                  Answer resolution
                </p>
                <p className="max-w-3xl text-sm leading-7 text-white/64">
                  Submit the current answer excerpt for bounded resolution against this question&apos;s authored option set.
                </p>
              </div>

              <textarea
                className="min-h-[7rem] w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-white/18"
                onChange={(event) => setAnswerExcerpt(event.target.value)}
                placeholder="Enter the user's current answer excerpt"
                value={answerExcerpt}
              />

              <div className="flex flex-wrap gap-3">
                <button
                  className="sonartra-button sonartra-button-primary"
                  disabled={!canResolveAnswer}
                  onClick={() => void resolveCurrentAnswer()}
                  type="button"
                >
                  {isResolving ? 'Resolving answer' : 'Resolve current answer'}
                </button>
                <LabelPill className="bg-white/[0.04] text-white/74">
                  {voiceSessionId ? 'Audit session active' : 'Audit session starts on first resolution'}
                </LabelPill>
              </div>

              {renderResolutionOutcome()}

              {turnSnapshot.activeQuestion.options.length > 0
              && resolutionOutcome?.canCorrect
              && settlementOutcome?.status !== 'confirmed'
              && settlementOutcome?.status !== 'corrected' ? (
                <div className="space-y-3">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                    Correction options
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {turnSnapshot.activeQuestion.options.map((option) => (
                      <button
                        key={option.optionId}
                        className="sonartra-button sonartra-button-secondary"
                        disabled={isSettling}
                        onClick={() => void settleCurrentAnswer('correct', option.optionId)}
                        type="button"
                      >
                        {option.label ? `${option.label} - ${option.text}` : option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
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

        {VOICE_DEBUG_ENABLED ? (
          <div className="rounded-[1rem] border border-white/8 bg-black/10 px-4 py-3">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
              Voice debug
            </p>
            <p className="mt-2 text-sm leading-7 text-white/74">
              Stage: {getRuntimeStageLabel(runtimeDiagnostic.stage)}
              {runtimeDiagnostic.code ? ` - Code: ${runtimeDiagnostic.code}` : ''}
            </p>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

class RuntimeClientError extends Error {
  constructor(
    public readonly code: RealtimeVoiceRuntimeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RuntimeClientError';
  }
}
