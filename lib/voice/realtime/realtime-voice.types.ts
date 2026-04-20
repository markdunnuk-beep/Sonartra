export type RealtimeVoiceConnectionState =
  | 'idle'
  | 'requesting_microphone'
  | 'bootstrapping'
  | 'connecting'
  | 'negotiating'
  | 'session_initializing'
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

export type RealtimeVoiceBootstrapErrorCode =
  | 'missing_server_api_key'
  | 'provider_bootstrap_failed'
  | 'malformed_provider_response'
  | 'unauthorized'
  | 'forbidden'
  | 'unsupported_runtime_configuration'
  | 'internal_error';

export type RealtimeVoiceBootstrapError = {
  code: RealtimeVoiceBootstrapErrorCode;
  message: string;
};

export type RealtimeVoiceClientEvent = {
  type: string;
  [key: string]: unknown;
};

export type RealtimeVoiceSessionConfig = {
  instructions?: string;
  outputModalities?: Array<'audio' | 'text'>;
};

export type RealtimeVoiceResponseRequest = {
  instructions?: string;
  outputModalities?: Array<'audio' | 'text'>;
  conversation?: 'default' | 'none';
  metadata?: Record<string, string>;
};

export type RealtimeVoiceRuntimeErrorCode =
  | RealtimeVoiceBootstrapErrorCode
  | 'browser_unsupported'
  | 'microphone_denied'
  | 'peer_connection_failed'
  | 'negotiation_failed'
  | 'session_init_failed'
  | 'data_channel_failed'
  | 'disconnected'
  | 'unknown';

export type RealtimeVoiceAdapterEvent =
  | { type: 'connecting' }
  | { type: 'negotiating' }
  | { type: 'session_initializing' }
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'error'; code: RealtimeVoiceRuntimeErrorCode; message: string }
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
  updateSession(config: RealtimeVoiceSessionConfig): void;
  createResponse(request: RealtimeVoiceResponseRequest): void;
  sendClientEvent(event: RealtimeVoiceClientEvent): void;
  subscribe(listener: RealtimeVoiceAdapterListener): () => void;
}
