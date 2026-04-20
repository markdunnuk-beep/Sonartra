import type {
  RealtimeVoiceAdapter,
  RealtimeVoiceAdapterConnectParams,
  RealtimeVoiceAdapterEvent,
  RealtimeVoiceAdapterListener,
  RealtimeVoiceClientEvent,
} from '@/lib/voice/realtime/realtime-voice.types';

function getEventMessage(event: unknown): string {
  if (!event || typeof event !== 'object') {
    return 'Voice runtime error.';
  }

  const maybeError = event as {
    error?: { message?: string };
    message?: string;
    type?: string;
  };

  return (
    maybeError.error?.message
    ?? maybeError.message
    ?? (maybeError.type ? `Voice runtime error: ${maybeError.type}` : 'Voice runtime error.')
  );
}

export class OpenAIRealtimeAdapter implements RealtimeVoiceAdapter {
  private listeners = new Set<RealtimeVoiceAdapterListener>();
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private stream: MediaStream | null = null;
  private listening = false;

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
    this.audioElement.setAttribute('playsinline', 'true');
    this.audioElement.addEventListener('play', this.handleAudioPlay);
    this.audioElement.addEventListener('pause', this.handleAudioPause);
    this.audioElement.addEventListener('ended', this.handleAudioPause);

    const peerConnection = new RTCPeerConnection();
    this.peerConnection = peerConnection;

    peerConnection.ontrack = (event) => {
      if (this.audioElement) {
        this.audioElement.srcObject = event.streams[0] ?? null;
      }
    };

    peerConnection.onconnectionstatechange = () => {
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

    const dataChannel = peerConnection.createDataChannel('oai-events');
    this.dataChannel = dataChannel;
    dataChannel.addEventListener('message', this.handleDataChannelMessage);
    dataChannel.addEventListener('error', this.handleDataChannelError);
    dataChannel.addEventListener('close', this.handleDataChannelClose);

    for (const track of params.stream.getTracks()) {
      peerConnection.addTrack(track, params.stream);
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.bootstrap.session.clientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp ?? '',
    });

    if (!sdpResponse.ok) {
      throw new Error(`Voice provider connection failed (${sdpResponse.status}).`);
    }

    const answerSdp = await sdpResponse.text();
    await peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp,
    });
  }

  async disconnect(): Promise<void> {
    this.listening = false;

    if (this.dataChannel) {
      this.dataChannel.removeEventListener('message', this.handleDataChannelMessage);
      this.dataChannel.removeEventListener('error', this.handleDataChannelError);
      this.dataChannel.removeEventListener('close', this.handleDataChannelClose);
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.getSenders().forEach((sender) => sender.track?.stop());
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

  sendClientEvent(event: RealtimeVoiceClientEvent): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    this.dataChannel.send(JSON.stringify(event));
  }

  private emit(event: RealtimeVoiceAdapterEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private handleDataChannelMessage = (messageEvent: MessageEvent<string>) => {
    try {
      const event = JSON.parse(messageEvent.data) as {
        type?: string;
        delta?: string;
        transcript?: string;
        error?: { message?: string };
        message?: string;
      };

      switch (event.type) {
        case 'response.audio_transcript.delta':
          if (event.delta) {
            this.emit({ type: 'transcript_partial', text: event.delta });
          }
          break;
        case 'response.audio_transcript.done':
          if (event.transcript) {
            this.emit({ type: 'transcript_final', text: event.transcript });
          }
          break;
        case 'input_audio_buffer.speech_started':
          this.emit({ type: 'listening' });
          break;
        case 'error':
          this.emit({ type: 'error', message: getEventMessage(event) });
          break;
        default:
          break;
      }
    } catch {
      this.emit({
        type: 'error',
        message: 'Voice runtime emitted an unreadable event payload.',
      });
    }
  };

  private handleDataChannelError = () => {
    this.emit({
      type: 'error',
      message: 'Voice runtime data channel failed.',
    });
  };

  private handleDataChannelClose = () => {
    this.emit({ type: 'disconnected' });
  };

  private handleAudioPlay = () => {
    this.emit({ type: 'speaking' });
  };

  private handleAudioPause = () => {
    this.emit({ type: this.listening ? 'listening' : 'connected' });
  };
}
