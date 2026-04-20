import { VoiceAssessmentClient } from '@/components/voice/voice-assessment-client';

type VoiceAssessmentPageProps = {
  params: Promise<{
    assessmentKey: string;
  }>;
};

export default async function VoiceAssessmentPage({
  params,
}: VoiceAssessmentPageProps) {
  const { assessmentKey } = await params;

  return <VoiceAssessmentClient assessmentKey={assessmentKey} />;
}
