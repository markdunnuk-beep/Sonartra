export type RealtimeVoiceConnectionState =
  | 'idle'
  | 'requesting_microphone'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'disconnected'
  | 'error';

export type RealtimeVoiceProvider = 'openai';

export type RealtimeVoiceBootstrapPayload = {
  provider: RealtimeVoiceProvider;
  session: {
    model: string;
    voice: string | null;
    expiresAt: number;
    clientSecret: string;
  };
};

export type RealtimeVoiceClientEvent = {
  type: string;
  [key: string]: unknown;
};

export type RealtimeVoiceAdapterEvent =
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'error'; message: string }
  | { type: 'speaking' }
  | { type: 'listening' }
  | { type: 'transcript_partial'; text: string }
  | { type: 'transcript_final'; text: string };

export type RealtimeVoiceAdapterListener = (
  event: RealtimeVoiceAdapterEvent,
) => void;

export type RealtimeVoiceAdapterConnectParams = {
  bootstrap: RealtimeVoiceBootstrapPayload;
  stream: MediaStream;
};

export interface RealtimeVoiceAdapter {
  connect(params: RealtimeVoiceAdapterConnectParams): Promise<void>;
  disconnect(): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  sendClientEvent(event: RealtimeVoiceClientEvent): void;
  subscribe(listener: RealtimeVoiceAdapterListener): () => void;
}
