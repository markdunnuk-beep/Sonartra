import type {
  RealtimeVoiceAdapter,
  RealtimeVoiceAdapterConnectParams,
  RealtimeVoiceAdapterEvent,
  RealtimeVoiceAdapterListener,
  RealtimeVoiceClientEvent,
  RealtimeVoiceRuntimeErrorCode,
  RealtimeVoiceResponseRequest,
  RealtimeVoiceSessionConfig,
} from '@/lib/voice/realtime/realtime-voice.types';

type RealtimeServerEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: { message?: string };
  message?: string;
  response?: {
    status?: string;
    status_details?: {
      error?: {
        message?: string;
      };
    };
  };
};

type PendingClientEvent = {
  event: RealtimeVoiceClientEvent;
  resolve?: () => void;
  reject?: (error: Error) => void;
  traceLabel?: string;
};

function isVoiceDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VOICE_DEBUG === 'true';
}

function getEventMessage(event: unknown): string {
  if (!event || typeof event !== 'object') {
    return 'Voice runtime error.';
  }

  const maybeError = event as {
    error?: { message?: string };
    message?: string;
    type?: string;
    response?: {
      status?: string;
      status_details?: {
        error?: {
          message?: string;
        };
      };
    };
  };

  return (
    maybeError.error?.message
    ?? maybeError.response?.status_details?.error?.message
    ?? maybeError.message
    ?? (maybeError.type ? `Voice runtime error: ${maybeError.type}` : 'Voice runtime error.')
  );
}

export class OpenAIRealtimeAdapter implements RealtimeVoiceAdapter {
  private listeners = new Set<RealtimeVoiceAdapterListener>();
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private remoteStream: MediaStream | null = null;
  private stream: MediaStream | null = null;
  private listening = false;
  private pendingClientEvents: PendingClientEvent[] = [];
  private dataChannelOpen = false;
  private sessionCreated = false;
  private sessionCreatedPromise: Promise<void> | null = null;
  private resolveSessionCreated: (() => void) | null = null;
  private rejectSessionCreated: ((error: Error) => void) | null = null;
  private firstQuestionPending = false;
  private firstResponseStarted = false;
  private pendingFirstResponseError: { code: RealtimeVoiceRuntimeErrorCode; message: string } | null = null;
  private pendingFirstResponseErrorTimeoutId: number | null = null;

  subscribe(listener: RealtimeVoiceAdapterListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async connect(params: RealtimeVoiceAdapterConnectParams): Promise<void> {
    await this.disconnect();

    this.emit({ type: 'connecting' });

    this.stream = params.stream;
    this.audioElement = new Audio();
    this.audioElement.autoplay = true;
    this.audioElement.muted = false;
    this.audioElement.volume = 1;
    this.audioElement.setAttribute('playsinline', 'true');
    this.audioElement.addEventListener('play', this.handleAudioPlay);
    this.audioElement.addEventListener('pause', this.handleAudioPause);
    this.audioElement.addEventListener('ended', this.handleAudioPause);

    this.resetSessionReadyState();

    try {
      this.peerConnection = new RTCPeerConnection();
      this.traceStage('peer_connection_created');

      this.peerConnection.ontrack = (event) => {
        this.handleRemoteTrack(event);
      };

      this.peerConnection.onconnectionstatechange = () => {
        if (!this.peerConnection) {
          return;
        }

        if (this.peerConnection.connectionState === 'connected') {
          this.emit({ type: 'connected' });
        }

        if (
          this.peerConnection.connectionState === 'failed'
          || this.peerConnection.connectionState === 'closed'
          || this.peerConnection.connectionState === 'disconnected'
        ) {
          this.emit({ type: 'disconnected' });
        }
      };

      const dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.dataChannel = dataChannel;
      dataChannel.addEventListener('open', this.handleDataChannelOpen);
      dataChannel.addEventListener('message', this.handleDataChannelMessage);
      dataChannel.addEventListener('error', this.handleDataChannelError);
      dataChannel.addEventListener('close', this.handleDataChannelClose);

      for (const track of params.stream.getTracks()) {
        this.peerConnection.addTrack(track, params.stream);
        this.traceStage('local_track_attached', {
          kind: track.kind,
        });
      }

      this.emit({ type: 'negotiating' });

      let offer: RTCSessionDescriptionInit;
      try {
        offer = await this.peerConnection.createOffer();
        this.traceStage('offer_created');
      } catch (error) {
        throw new RealtimeAdapterError(
          'offer_creation_failed',
          error instanceof Error ? error.message : 'Realtime offer creation failed.',
        );
      }

      try {
        await this.peerConnection.setLocalDescription(offer);
        this.traceStage('local_description_set');
      } catch (error) {
        throw new RealtimeAdapterError(
          'local_description_failed',
          error instanceof Error ? error.message : 'Realtime local description failed.',
        );
      }

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.bootstrap.session.clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp ?? '',
        signal: AbortSignal.timeout(15000),
      });

      if (!sdpResponse.ok) {
        throw new RealtimeAdapterError(
          'negotiation_failed',
          `Realtime negotiation failed (${sdpResponse.status}).`,
        );
      }

      const answerSdp = await sdpResponse.text();
      this.traceStage('remote_answer_received');

      try {
        await this.peerConnection.setRemoteDescription({
          type: 'answer',
          sdp: answerSdp,
        });
        this.traceStage('remote_description_set');
      } catch (error) {
        throw new RealtimeAdapterError(
          'remote_description_failed',
          error instanceof Error ? error.message : 'Realtime remote description failed.',
        );
      }

      this.emit({ type: 'session_initializing' });
      await this.waitForDataChannelOpen(dataChannel);
      await this.waitForSessionCreated();
    } catch (error) {
      this.rejectPendingClientEvents(
        error instanceof Error ? error : new Error('Realtime session initialisation failed.'),
      );
      await this.disconnect();

      if (error instanceof RealtimeAdapterError) {
        throw error;
      }

      throw new RealtimeAdapterError(
        'peer_connection_failed',
        error instanceof Error ? error.message : 'Peer connection setup failed.',
      );
    }
  }

  async disconnect(): Promise<void> {
    this.listening = false;
    this.firstQuestionPending = false;
    this.firstResponseStarted = false;
    this.pendingFirstResponseError = null;
    if (this.pendingFirstResponseErrorTimeoutId !== null) {
      window.clearTimeout(this.pendingFirstResponseErrorTimeoutId);
      this.pendingFirstResponseErrorTimeoutId = null;
    }
    this.rejectPendingClientEvents(new Error('Realtime session disconnected.'));
    this.resetSessionReadyState();

    if (this.dataChannel) {
      this.dataChannel.removeEventListener('open', this.handleDataChannelOpen);
      this.dataChannel.removeEventListener('message', this.handleDataChannelMessage);
      this.dataChannel.removeEventListener('error', this.handleDataChannelError);
      this.dataChannel.removeEventListener('close', this.handleDataChannelClose);
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement.removeEventListener('play', this.handleAudioPlay);
      this.audioElement.removeEventListener('pause', this.handleAudioPause);
      this.audioElement.removeEventListener('ended', this.handleAudioPause);
      this.audioElement = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    this.emit({ type: 'disconnected' });
  }

  async startListening(): Promise<void> {
    if (!this.stream) {
      return;
    }

    this.listening = true;
    for (const track of this.stream.getAudioTracks()) {
      track.enabled = true;
    }

    this.emit({ type: 'listening' });
  }

  async stopListening(): Promise<void> {
    if (!this.stream) {
      return;
    }

    this.listening = false;
    for (const track of this.stream.getAudioTracks()) {
      track.enabled = false;
    }

    this.emit({ type: 'connected' });
  }

  async updateSession(config: RealtimeVoiceSessionConfig): Promise<void> {
    await this.enqueueClientEvent({
      event: {
        type: 'session.update',
        session: {
          instructions: config.instructions,
          output_modalities: config.outputModalities,
        },
      },
      traceLabel: 'session_update_sent',
    });
  }

  async createResponse(request: RealtimeVoiceResponseRequest): Promise<void> {
    if (request.metadata?.topic === 'sonartra_question_delivery') {
      this.firstQuestionPending = true;
      this.firstResponseStarted = false;
      this.pendingFirstResponseError = null;
      if (this.pendingFirstResponseErrorTimeoutId !== null) {
        window.clearTimeout(this.pendingFirstResponseErrorTimeoutId);
        this.pendingFirstResponseErrorTimeoutId = null;
      }
    }

    await this.enqueueClientEvent({
      event: {
        type: 'response.create',
        response: {
          conversation: request.conversation === 'none' ? 'none' : undefined,
          instructions: request.instructions,
          output_modalities: request.outputModalities,
          metadata: request.metadata,
        },
      },
      traceLabel:
        request.metadata?.topic === 'sonartra_question_delivery'
          ? 'first_response_create_sent'
          : undefined,
    });
  }

  sendClientEvent(event: RealtimeVoiceClientEvent): void {
    void this.enqueueClientEvent({ event });
  }

  private emit(event: RealtimeVoiceAdapterEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private async enqueueClientEvent(pendingEvent: PendingClientEvent): Promise<void> {
    if (this.isSessionReady()) {
      this.sendPendingClientEvent(pendingEvent);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.pendingClientEvents.push({
        ...pendingEvent,
        resolve,
        reject,
      });
    });
  }

  private sendPendingClientEvent(pendingEvent: PendingClientEvent): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new RealtimeAdapterError(
        'data_channel_failed',
        'Realtime control channel is not open.',
      );
    }

    this.dataChannel.send(JSON.stringify(pendingEvent.event));
    if (pendingEvent.traceLabel) {
      this.traceStage(pendingEvent.traceLabel);
    }
    pendingEvent.resolve?.();
  }

  private flushPendingClientEvents(): void {
    if (!this.isSessionReady()) {
      return;
    }

    while (this.pendingClientEvents.length > 0) {
      const pendingEvent = this.pendingClientEvents.shift();
      if (!pendingEvent) {
        continue;
      }

      try {
        this.sendPendingClientEvent(pendingEvent);
      } catch (error) {
        pendingEvent.reject?.(
          error instanceof Error ? error : new Error('Realtime control message failed.'),
        );
      }
    }
  }

  private rejectPendingClientEvents(error: Error): void {
    while (this.pendingClientEvents.length > 0) {
      const pendingEvent = this.pendingClientEvents.shift();
      pendingEvent?.reject?.(error);
    }
  }

  private isSessionReady(): boolean {
    return this.dataChannelOpen && this.sessionCreated;
  }

  private resetSessionReadyState(): void {
    this.dataChannelOpen = false;
    this.sessionCreated = false;
    this.sessionCreatedPromise = new Promise<void>((resolve, reject) => {
      this.resolveSessionCreated = resolve;
      this.rejectSessionCreated = reject;
    });
  }

  private async waitForDataChannelOpen(dataChannel: RTCDataChannel): Promise<void> {
    if (dataChannel.readyState === 'open') {
      this.dataChannelOpen = true;
      this.traceStage('data_channel_open');
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new RealtimeAdapterError('data_channel_failed', 'Realtime session data channel did not open.'));
      }, 10000);

      const handleOpen = () => {
        cleanup();
        this.dataChannelOpen = true;
        this.traceStage('data_channel_open');
        resolve();
      };

      const handleFailure = () => {
        cleanup();
        reject(new RealtimeAdapterError('data_channel_failed', 'Realtime session data channel failed.'));
      };

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        dataChannel.removeEventListener('open', handleOpen);
        dataChannel.removeEventListener('error', handleFailure);
        dataChannel.removeEventListener('close', handleFailure);
      };

      dataChannel.addEventListener('open', handleOpen, { once: true });
      dataChannel.addEventListener('error', handleFailure, { once: true });
      dataChannel.addEventListener('close', handleFailure, { once: true });
    });
  }

  private async waitForSessionCreated(): Promise<void> {
    if (this.sessionCreated) {
      return;
    }

    const promise = this.sessionCreatedPromise;
    if (!promise) {
      throw new RealtimeAdapterError(
        'session_init_failed',
        'Realtime session initialisation was not available.',
      );
    }

    await Promise.race([
      promise,
      new Promise<void>((_, reject) => {
        window.setTimeout(() => {
          reject(
            new RealtimeAdapterError(
              'session_init_failed',
              'Realtime session did not announce readiness.',
            ),
          );
        }, 10000);
      }),
    ]);
  }

  private handleRemoteTrack(event: RTCTrackEvent): void {
    if (!this.audioElement) {
      return;
    }

    this.traceStage('remote_audio_track_received', {
      trackCount: event.streams.length,
    });

    const [stream] = event.streams;
    this.remoteStream = stream ?? this.remoteStream ?? new MediaStream();
    if (!stream && event.track) {
      this.remoteStream.addTrack(event.track);
    }

    this.audioElement.srcObject = this.remoteStream;
    void this.audioElement.play().catch((error) => {
      this.emit({
        type: 'error',
        code: 'remote_audio_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Audio playback could not be started.',
      });
    });
  }

  private handleDataChannelOpen = () => {
    this.dataChannelOpen = true;
    this.traceStage('data_channel_open');
    this.flushPendingClientEvents();
  };

  private handleDataChannelMessage = (messageEvent: MessageEvent<string>) => {
    try {
      const event = JSON.parse(messageEvent.data) as RealtimeServerEvent;
      this.traceStage('realtime_server_event', {
        type: event.type ?? 'unknown',
        message:
          event.type === 'error' || event.response?.status === 'failed'
            ? getEventMessage(event)
            : undefined,
      });

      switch (event.type) {
        case 'session.created':
          this.sessionCreated = true;
          this.traceStage('session_created_received');
          this.resolveSessionCreated?.();
          this.flushPendingClientEvents();
          break;
        case 'response.created':
          this.markFirstResponseStarted();
          break;
        case 'response.done':
          if (event.response?.status && event.response.status !== 'completed') {
            this.emit({
              type: 'error',
              code: 'first_response_failed',
              message: getEventMessage(event),
            });
          } else {
            this.clearFirstResponseTracking();
          }
          break;
        case 'response.audio_transcript.delta':
        case 'response.output_audio_transcript.delta':
          if (event.delta) {
            this.markFirstResponseStarted();
            this.emit({ type: 'transcript_partial', text: event.delta });
          }
          break;
        case 'response.audio_transcript.done':
        case 'response.output_audio_transcript.done':
          if (event.transcript) {
            this.markFirstResponseStarted();
            this.emit({ type: 'transcript_final', text: event.transcript });
          }
          break;
        case 'input_audio_buffer.speech_started':
          this.emit({ type: 'listening' });
          break;
        case 'input_audio_buffer.speech_stopped':
          this.emit({ type: this.listening ? 'listening' : 'connected' });
          break;
        case 'error':
          this.handleServerError(getEventMessage(event));
          break;
        default:
          break;
      }
    } catch {
      this.emit({
        type: 'error',
        code: 'session_init_failed',
        message: 'Voice runtime emitted an unreadable event payload.',
      });
    }
  };

  private handleDataChannelError = () => {
    this.emit({
      type: 'error',
      code: 'data_channel_failed',
      message: 'Voice runtime data channel failed.',
    });
  };

  private handleDataChannelClose = () => {
    this.emit({ type: 'disconnected' });
  };

  private handleAudioPlay = () => {
    if (this.firstQuestionPending) {
      this.traceStage('first_question_playback_started');
      this.markFirstResponseStarted();
      this.firstQuestionPending = false;
    }
    this.emit({ type: 'speaking' });
  };

  private handleAudioPause = () => {
    this.emit({ type: this.listening ? 'listening' : 'connected' });
  };

  private traceStage(stage: string, details?: Record<string, unknown>): void {
    if (!isVoiceDebugEnabled()) {
      return;
    }

    console.debug('[voice-runtime-adapter]', stage, details ?? {});
  }

  private handleServerError(message: string): void {
    if (this.firstQuestionPending && !this.firstResponseStarted) {
      this.pendingFirstResponseError = {
        code: 'first_response_failed',
        message,
      };
      if (this.pendingFirstResponseErrorTimeoutId !== null) {
        window.clearTimeout(this.pendingFirstResponseErrorTimeoutId);
      }
      this.pendingFirstResponseErrorTimeoutId = window.setTimeout(() => {
        if (!this.pendingFirstResponseError) {
          return;
        }

        this.emit({
          type: 'error',
          code: this.pendingFirstResponseError.code,
          message: this.pendingFirstResponseError.message,
        });
        this.pendingFirstResponseError = null;
        this.pendingFirstResponseErrorTimeoutId = null;
      }, 1500);
      return;
    }

    this.emit({
      type: 'error',
      code: this.firstQuestionPending ? 'first_response_failed' : 'session_init_failed',
      message,
    });
  }

  private markFirstResponseStarted(): void {
    if (!this.firstQuestionPending) {
      return;
    }

    this.firstResponseStarted = true;
    if (this.pendingFirstResponseErrorTimeoutId !== null) {
      window.clearTimeout(this.pendingFirstResponseErrorTimeoutId);
      this.pendingFirstResponseErrorTimeoutId = null;
    }
    this.pendingFirstResponseError = null;
  }

  private clearFirstResponseTracking(): void {
    this.firstQuestionPending = false;
    this.firstResponseStarted = false;
    if (this.pendingFirstResponseErrorTimeoutId !== null) {
      window.clearTimeout(this.pendingFirstResponseErrorTimeoutId);
      this.pendingFirstResponseErrorTimeoutId = null;
    }
    this.pendingFirstResponseError = null;
  }
}

class RealtimeAdapterError extends Error {
  constructor(
    public readonly code: RealtimeVoiceRuntimeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RealtimeAdapterError';
  }
}
