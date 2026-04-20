export type VoiceSessionStatus = 'in_progress' | 'completed' | 'failed';

export type VoiceSessionSpeaker = 'user' | 'agent';

export type VoiceSessionEventPayload = Record<string, unknown>;

export type VoiceSession = {
  id: string;
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  status: VoiceSessionStatus;
  provider: string;
  model: string;
  locale: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VoiceSessionTurn = {
  id: string;
  voiceSessionId: string;
  turnIndex: number;
  speaker: VoiceSessionSpeaker;
  transcriptText: string;
  questionId: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
};

export type VoiceResponseResolution = {
  id: string;
  voiceSessionId: string;
  questionId: string;
  inferredOptionId: string | null;
  finalSelectedOptionId: string | null;
  confidence: number | null;
  wasConfirmed: boolean;
  sourceExcerpt: string;
  createdAt: string;
};

export type VoiceSessionEvent = {
  id: string;
  voiceSessionId: string;
  eventType: string;
  payloadJson: VoiceSessionEventPayload | null;
  createdAt: string;
};
