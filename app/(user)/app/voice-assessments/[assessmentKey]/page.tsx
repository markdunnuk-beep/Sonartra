import { VoiceAssessmentShell } from '@/components/voice/voice-assessment-shell';
import { getDbPool } from '@/lib/server/db';
import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import { listPublishedAssessmentInventory } from '@/lib/server/published-assessment-inventory';
import { getRequestUserId } from '@/lib/server/request-user';
import {
  isVoiceAssessmentFeatureEnabled,
  isVoiceAssessmentSupportedForKey,
} from '@/lib/server/voice/voice-feature';

type VoiceAssessmentPageProps = {
  params: Promise<{
    assessmentKey: string;
  }>;
};

export default async function VoiceAssessmentPage({
  params,
}: VoiceAssessmentPageProps) {
  const { assessmentKey } = await params;

  if (!isVoiceAssessmentFeatureEnabled()) {
    return <VoiceAssessmentShell state="feature_unavailable" assessmentKey={assessmentKey} />;
  }

  const db = getDbPool();
  const inventory = await listPublishedAssessmentInventory(db);
  const assessment = inventory.find((item) => item.assessmentKey === assessmentKey) ?? null;

  if (!assessment) {
    return <VoiceAssessmentShell state="assessment_not_found" assessmentKey={assessmentKey} />;
  }

  if (!isVoiceAssessmentSupportedForKey(assessment.assessmentKey)) {
    return (
      <VoiceAssessmentShell
        state="unsupported_assessment"
        assessmentTitle={assessment.title}
        assessmentDescription={assessment.description}
        assessmentKey={assessment.assessmentKey}
        versionTag={assessment.versionTag}
        questionCount={assessment.questionCount}
      />
    );
  }

  const userId = await getRequestUserId();
  const lifecycle = await createAssessmentAttemptLifecycleService({
    db,
  }).getAssessmentAttemptLifecycle({
    userId,
    assessmentKey: assessment.assessmentKey,
  });

  return (
    <VoiceAssessmentShell
      state="coming_soon"
      assessmentTitle={assessment.title}
      assessmentDescription={assessment.description}
      assessmentKey={assessment.assessmentKey}
      lifecycleStatus={lifecycle.status}
      versionTag={assessment.versionTag}
      questionCount={assessment.questionCount}
    />
  );
}
