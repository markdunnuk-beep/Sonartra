import { OpenAIRealtimeAdapter } from '@/lib/voice/realtime/openai-realtime-adapter';
import type {
  RealtimeVoiceAdapter,
  RealtimeVoiceProvider,
} from '@/lib/voice/realtime/realtime-voice.types';

export function createRealtimeVoiceAdapter(
  provider: RealtimeVoiceProvider,
): RealtimeVoiceAdapter {
  switch (provider) {
    case 'openai':
    default:
      return new OpenAIRealtimeAdapter();
  }
}
