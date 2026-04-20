'use client';

import { useEffect, useState, startTransition } from 'react';

import { prepareVoiceAssessmentAction } from '@/app/(user)/app/voice-assessments/actions';
import { VoiceAssessmentShell } from '@/components/voice/voice-assessment-shell';
import { VoiceRuntimeClient } from '@/components/voice/voice-runtime-client';
import type { VoiceAssessmentPreparationResult } from '@/lib/server/voice/voice-attempt-orchestrator';

type VoiceAssessmentClientProps = {
  assessmentKey: string;
};

type VoiceAssessmentClientState =
  | {
      requestState: 'loading';
      preparation: null;
      requestError: null;
    }
  | {
      requestState: 'prepared';
      preparation: VoiceAssessmentPreparationResult;
      requestError: null;
    }
  | {
      requestState: 'request_error';
      preparation: null;
      requestError: string;
    };

export function VoiceAssessmentClient({
  assessmentKey,
}: Readonly<VoiceAssessmentClientProps>) {
  const [state, setState] = useState<VoiceAssessmentClientState>({
    requestState: 'loading',
    preparation: null,
    requestError: null,
  });

  useEffect(() => {
    let cancelled = false;

    startTransition(() => {
      void prepareVoiceAssessmentAction(assessmentKey)
        .then((result) => {
          if (cancelled) {
            return;
          }

          if (!result.ok || !result.data) {
            setState({
              requestState: 'request_error',
              preparation: null,
              requestError: result.error ?? 'Voice preparation failed.',
            });
            return;
          }

          setState({
            requestState: 'prepared',
            preparation: result.data,
            requestError: null,
          });
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setState({
            requestState: 'request_error',
            preparation: null,
            requestError: 'Voice preparation failed.',
          });
        });
    });

    return () => {
      cancelled = true;
    };
  }, [assessmentKey]);

  return (
    <VoiceAssessmentShell
      assessmentKey={assessmentKey}
      requestState={state.requestState}
      preparation={state.preparation}
      requestError={state.requestError}
      runtimePanel={
        state.requestState === 'prepared'
        && (state.preparation.state === 'ready_to_start'
          || state.preparation.state === 'resumed_in_progress')
          ? <VoiceRuntimeClient assessmentKey={assessmentKey} />
          : null
      }
    />
  );
}
