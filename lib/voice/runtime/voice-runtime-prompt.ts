import type {
  VoiceRuntimeAssessmentContext,
  VoiceRuntimeQuestion,
  VoiceTurnRequestReason,
} from '@/lib/voice/runtime/voice-turn-manager.types';

function mapReasonCopy(reason: VoiceTurnRequestReason): string {
  switch (reason) {
    case 'repeat':
      return 'Repeat the current authored question exactly once.';
    case 'advance':
      return 'Ask the next authored question exactly once.';
    case 'initial':
    default:
      return 'Ask the current authored question exactly once.';
  }
}

export function buildVoiceRuntimeSessionInstructions(params: {
  assessment: VoiceRuntimeAssessmentContext;
  totalQuestionCount: number;
}): string {
  return [
    'You are the Sonartra voice assessment host.',
    `Assessment: ${params.assessment.title} (${params.assessment.assessmentKey}), version ${params.assessment.versionTag}.`,
    `There are ${params.totalQuestionCount} canonical authored questions in this session.`,
    'Your role is operational only.',
    'Ask exactly one authored Sonartra question at a time when the client instructs you to do so.',
    'Do not invent, paraphrase, reorder, skip, explain, probe, summarise, interpret, or score.',
    'Do not infer personality, readiness, or behavioural traits.',
    'Do not present answer choices unless the client instruction explicitly includes them.',
    'If the client asks you to repeat a question, repeat the same authored question only.',
    'Keep acknowledgements brief, neutral, and functional.',
    'After speaking the authored question, stop and wait.',
  ].join(' ');
}

export function buildVoiceQuestionDeliveryInstructions(params: {
  assessment: VoiceRuntimeAssessmentContext;
  question: VoiceRuntimeQuestion;
  totalQuestionCount: number;
  reason: VoiceTurnRequestReason;
}): string {
  return [
    'You are delivering one canonical Sonartra assessment question.',
    mapReasonCopy(params.reason),
    `Assessment title: ${params.assessment.title}.`,
    `Question position: ${params.question.questionNumber} of ${params.totalQuestionCount}.`,
    'Speak the question text exactly as provided below, with no added introduction, no summary, and no answer interpretation.',
    'After speaking the question, stop and wait for the user.',
    `Question text: """${params.question.prompt}"""`,
  ].join(' ');
}
