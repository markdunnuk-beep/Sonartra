import type { VoiceConfirmationState } from '@/lib/voice/resolution/voice-resolution.types';

export type VoiceRuntimeAssessmentContext = {
  assessmentKey: string;
  title: string;
  versionTag: string;
};

export type VoiceRuntimeQuestionOption = {
  optionId: string;
  label: string | null;
  text: string;
};

export type VoiceRuntimeQuestion = {
  questionId: string;
  questionNumber: number;
  prompt: string;
  options: readonly VoiceRuntimeQuestionOption[];
  selectedOptionId?: string | null;
};

export type VoiceTurnRequestReason = 'initial' | 'repeat' | 'advance';

export type VoiceTurnManagerStatus = 'idle' | 'ready' | 'completed' | 'error';

export type VoiceTurnManagerSnapshot = {
  assessment: VoiceRuntimeAssessmentContext;
  totalQuestionCount: number;
  status: VoiceTurnManagerStatus;
  activeQuestionIndex: number | null;
  activeQuestionNumber: number | null;
  activeQuestion: VoiceRuntimeQuestion | null;
  questionHasBeenSpoken: boolean;
  answerConfirmationState: VoiceConfirmationState;
  canAdvance: boolean;
  lastRequestReason: VoiceTurnRequestReason | null;
  error: string | null;
};

export type VoiceTurnManagerQuestionRequest = {
  assessment: VoiceRuntimeAssessmentContext;
  question: VoiceRuntimeQuestion;
  questionIndex: number;
  totalQuestionCount: number;
  reason: VoiceTurnRequestReason;
};

export type VoiceTurnManagerCallbacks = {
  onStateChange?: (snapshot: VoiceTurnManagerSnapshot) => void;
  onQuestionRequested?: (request: VoiceTurnManagerQuestionRequest) => void;
  onCompleted?: (snapshot: VoiceTurnManagerSnapshot) => void;
};

export interface VoiceTurnManager {
  getSnapshot(): VoiceTurnManagerSnapshot;
  subscribe(listener: (snapshot: VoiceTurnManagerSnapshot) => void): () => void;
  requestInitialQuestion(): VoiceTurnManagerSnapshot;
  resetCurrentQuestionDelivery(): VoiceTurnManagerSnapshot;
  markCurrentQuestionSpoken(): VoiceTurnManagerSnapshot;
  setAnswerConfirmationState(state: VoiceConfirmationState): VoiceTurnManagerSnapshot;
  repeatCurrentQuestion(): VoiceTurnManagerSnapshot;
  advanceToNextQuestion(): VoiceTurnManagerSnapshot;
}
