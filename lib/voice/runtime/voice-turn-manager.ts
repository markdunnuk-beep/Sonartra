import type {
  VoiceRuntimeAssessmentContext,
  VoiceRuntimeQuestion,
  VoiceTurnManager,
  VoiceTurnManagerCallbacks,
  VoiceTurnManagerQuestionRequest,
  VoiceTurnManagerSnapshot,
  VoiceTurnRequestReason,
} from '@/lib/voice/runtime/voice-turn-manager.types';

function buildSnapshot(params: {
  assessment: VoiceRuntimeAssessmentContext;
  questions: readonly VoiceRuntimeQuestion[];
  activeQuestionIndex: number | null;
  questionHasBeenSpoken: boolean;
  status: VoiceTurnManagerSnapshot['status'];
  lastRequestReason: VoiceTurnManagerSnapshot['lastRequestReason'];
  error: string | null;
}): VoiceTurnManagerSnapshot {
  const activeQuestion =
    params.activeQuestionIndex === null
      ? null
      : params.questions[params.activeQuestionIndex] ?? null;

  return {
    assessment: params.assessment,
    totalQuestionCount: params.questions.length,
    status: params.status,
    activeQuestionIndex: params.activeQuestionIndex,
    activeQuestionNumber: activeQuestion?.questionNumber ?? null,
    activeQuestion,
    questionHasBeenSpoken: activeQuestion ? params.questionHasBeenSpoken : false,
    lastRequestReason: params.lastRequestReason,
    error: params.error,
  };
}

function getInitialSnapshot(params: {
  assessment: VoiceRuntimeAssessmentContext;
  questions: readonly VoiceRuntimeQuestion[];
  currentQuestionIndex: number | null;
}): VoiceTurnManagerSnapshot {
  if (params.questions.length === 0) {
    return buildSnapshot({
      assessment: params.assessment,
      questions: params.questions,
      activeQuestionIndex: null,
      questionHasBeenSpoken: false,
      status: 'error',
      lastRequestReason: null,
      error: 'No canonical questions are available for this voice session.',
    });
  }

  if (params.currentQuestionIndex === null) {
    return buildSnapshot({
      assessment: params.assessment,
      questions: params.questions,
      activeQuestionIndex: null,
      questionHasBeenSpoken: false,
      status: 'completed',
      lastRequestReason: null,
      error: null,
    });
  }

  if (
    params.currentQuestionIndex < 0
    || params.currentQuestionIndex >= params.questions.length
  ) {
    return buildSnapshot({
      assessment: params.assessment,
      questions: params.questions,
      activeQuestionIndex: null,
      questionHasBeenSpoken: false,
      status: 'error',
      lastRequestReason: null,
      error: 'The prepared voice question index is invalid for this assessment.',
    });
  }

  return buildSnapshot({
    assessment: params.assessment,
    questions: params.questions,
    activeQuestionIndex: params.currentQuestionIndex,
    questionHasBeenSpoken: false,
    status: 'ready',
    lastRequestReason: null,
    error: null,
  });
}

export function createVoiceTurnManager(params: {
  assessment: VoiceRuntimeAssessmentContext;
  questions: readonly VoiceRuntimeQuestion[];
  currentQuestionIndex: number | null;
  callbacks?: VoiceTurnManagerCallbacks;
}): VoiceTurnManager {
  const listeners = new Set<(snapshot: VoiceTurnManagerSnapshot) => void>();
  const callbacks = params.callbacks ?? {};
  let snapshot = getInitialSnapshot({
    assessment: params.assessment,
    questions: params.questions,
    currentQuestionIndex: params.currentQuestionIndex,
  });

  function emit(): void {
    callbacks.onStateChange?.(snapshot);

    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function setSnapshot(nextSnapshot: VoiceTurnManagerSnapshot): VoiceTurnManagerSnapshot {
    snapshot = nextSnapshot;
    emit();

    if (snapshot.status === 'completed') {
      callbacks.onCompleted?.(snapshot);
    }

    return snapshot;
  }

  function requestActiveQuestion(reason: VoiceTurnRequestReason): VoiceTurnManagerSnapshot {
    if (snapshot.status !== 'ready' || snapshot.activeQuestionIndex === null || !snapshot.activeQuestion) {
      return setSnapshot(
        buildSnapshot({
          assessment: params.assessment,
          questions: params.questions,
          activeQuestionIndex: snapshot.activeQuestionIndex,
          questionHasBeenSpoken: snapshot.questionHasBeenSpoken,
          status: 'error',
          lastRequestReason: snapshot.lastRequestReason,
          error: 'There is no active canonical question available to deliver.',
        }),
      );
    }

    const nextSnapshot = buildSnapshot({
      assessment: params.assessment,
      questions: params.questions,
      activeQuestionIndex: snapshot.activeQuestionIndex,
      questionHasBeenSpoken: snapshot.questionHasBeenSpoken,
      status: 'ready',
      lastRequestReason: reason,
      error: null,
    });

    setSnapshot(nextSnapshot);

    const request: VoiceTurnManagerQuestionRequest = {
      assessment: params.assessment,
      question: nextSnapshot.activeQuestion!,
      questionIndex: nextSnapshot.activeQuestionIndex!,
      totalQuestionCount: nextSnapshot.totalQuestionCount,
      reason,
    };
    callbacks.onQuestionRequested?.(request);

    return nextSnapshot;
  }

  return {
    getSnapshot() {
      return snapshot;
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    requestInitialQuestion() {
      if (snapshot.questionHasBeenSpoken) {
        return snapshot;
      }

      return requestActiveQuestion('initial');
    },

    resetCurrentQuestionDelivery() {
      if (snapshot.status !== 'ready' || snapshot.activeQuestionIndex === null || !snapshot.activeQuestion) {
        return snapshot;
      }

      return setSnapshot(
        buildSnapshot({
          assessment: params.assessment,
          questions: params.questions,
          activeQuestionIndex: snapshot.activeQuestionIndex,
          questionHasBeenSpoken: false,
          status: 'ready',
          lastRequestReason: null,
          error: null,
        }),
      );
    },

    markCurrentQuestionSpoken() {
      if (snapshot.status !== 'ready' || snapshot.activeQuestionIndex === null || !snapshot.activeQuestion) {
        return snapshot;
      }

      if (snapshot.questionHasBeenSpoken) {
        return snapshot;
      }

      return setSnapshot(
        buildSnapshot({
          assessment: params.assessment,
          questions: params.questions,
          activeQuestionIndex: snapshot.activeQuestionIndex,
          questionHasBeenSpoken: true,
          status: 'ready',
          lastRequestReason: snapshot.lastRequestReason,
          error: null,
        }),
      );
    },

    repeatCurrentQuestion() {
      if (snapshot.status !== 'ready' || snapshot.activeQuestionIndex === null) {
        return setSnapshot(
          buildSnapshot({
            assessment: params.assessment,
            questions: params.questions,
            activeQuestionIndex: snapshot.activeQuestionIndex,
            questionHasBeenSpoken: snapshot.questionHasBeenSpoken,
            status: 'error',
            lastRequestReason: snapshot.lastRequestReason,
            error: 'The current question cannot be repeated because no active question is available.',
          }),
        );
      }

      return requestActiveQuestion('repeat');
    },

    advanceToNextQuestion() {
      if (snapshot.status === 'completed') {
        return snapshot;
      }

      if (snapshot.status !== 'ready' || snapshot.activeQuestionIndex === null) {
        return setSnapshot(
          buildSnapshot({
            assessment: params.assessment,
            questions: params.questions,
            activeQuestionIndex: snapshot.activeQuestionIndex,
            questionHasBeenSpoken: snapshot.questionHasBeenSpoken,
            status: 'error',
            lastRequestReason: snapshot.lastRequestReason,
            error: 'The next question cannot be delivered because no active question is available.',
          }),
        );
      }

      const nextIndex = snapshot.activeQuestionIndex + 1;
      if (nextIndex >= params.questions.length) {
        return setSnapshot(
          buildSnapshot({
            assessment: params.assessment,
            questions: params.questions,
            activeQuestionIndex: null,
            questionHasBeenSpoken: false,
            status: 'completed',
            lastRequestReason: 'advance',
            error: null,
          }),
        );
      }

      snapshot = buildSnapshot({
        assessment: params.assessment,
        questions: params.questions,
        activeQuestionIndex: nextIndex,
        questionHasBeenSpoken: false,
        status: 'ready',
        lastRequestReason: 'advance',
        error: null,
      });
      emit();

      return requestActiveQuestion('advance');
    },
  };
}
