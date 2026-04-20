import type {
  VoiceConfirmationMode,
  VoiceResolutionStatus,
} from '@/lib/voice/resolution/voice-resolution.types';

export const VOICE_AUTO_ACCEPT_CONFIDENCE_THRESHOLD = 0.9;
export const VOICE_CONFIRMATION_CONFIDENCE_THRESHOLD = 0.72;

export function getVoiceConfirmationMode(params: {
  status: VoiceResolutionStatus;
  confidence: number | null;
  inferredOptionId: string | null;
}): VoiceConfirmationMode {
  const { status, confidence, inferredOptionId } = params;

  if (!inferredOptionId) {
    return 'require_retry';
  }

  if (status === 'runtime_error' || status === 'invalid_input' || status === 'unresolved') {
    return 'require_retry';
  }

  if (confidence !== null && confidence >= VOICE_AUTO_ACCEPT_CONFIDENCE_THRESHOLD) {
    return 'auto_accept';
  }

  if (confidence !== null && confidence >= VOICE_CONFIRMATION_CONFIDENCE_THRESHOLD) {
    return 'require_confirmation';
  }

  return 'require_retry';
}
