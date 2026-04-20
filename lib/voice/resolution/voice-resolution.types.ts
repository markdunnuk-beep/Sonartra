export type VoiceResolutionStatus =
  | 'resolved'
  | 'low_confidence'
  | 'unresolved'
  | 'invalid_input'
  | 'runtime_error';

export type VoiceConfirmationMode =
  | 'auto_accept'
  | 'require_confirmation'
  | 'require_retry';

export type VoiceConfirmationState =
  | 'pending'
  | VoiceConfirmationMode
  | 'confirmed'
  | 'corrected'
  | 'rejected'
  | 'ready_to_commit'
  | 'committed'
  | 'commit_failed'
  | 'invalid_resolution_state'
  | 'runtime_error';

export type VoiceResolutionOption = {
  optionId: string;
  label: string | null;
  text: string;
};

export type VoiceResolutionQuestion = {
  questionId: string;
  prompt: string;
  options: readonly VoiceResolutionOption[];
};

export type VoiceResolutionResult = {
  status: VoiceResolutionStatus;
  questionId: string;
  inferredOptionId: string | null;
  confidence: number | null;
  sourceExcerpt: string;
  confirmationMode: VoiceConfirmationMode;
  candidateOptionLabel: string | null;
  candidateOptionText: string | null;
  canRetry: boolean;
  canCorrect: boolean;
  internalReason: string | null;
};

export type VoiceResolutionAttemptPayload = {
  result: VoiceResolutionResult;
  matchedOption: VoiceResolutionOption | null;
};

export type VoiceResolutionSettlementIntent = 'confirm' | 'reject' | 'correct';

export type VoiceResolutionSettlementStatus = 'confirmed' | 'corrected' | 'rejected';
