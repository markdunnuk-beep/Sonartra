export type VoiceResolutionStatus =
  | 'resolved'
  | 'low_confidence'
  | 'unresolved'
  | 'invalid_input'
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
  internalReason: string | null;
};

export type VoiceResolutionAttemptPayload = {
  result: VoiceResolutionResult;
  matchedOption: VoiceResolutionOption | null;
};
