const DEFAULT_SUPPORTED_ASSESSMENT_KEYS = ['wplp80'] as const;

export type VoiceAssessmentSupportState =
  | 'feature_disabled'
  | 'unsupported_assessment'
  | 'supported';

function parseSupportedAssessmentKeys(value: string | undefined): readonly string[] {
  if (!value) {
    return DEFAULT_SUPPORTED_ASSESSMENT_KEYS;
  }

  const parsed = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  return parsed.length > 0 ? Object.freeze(parsed) : DEFAULT_SUPPORTED_ASSESSMENT_KEYS;
}

export function isVoiceAssessmentFeatureEnabled(): boolean {
  return process.env.SONARTRA_ENABLE_VOICE_ASSESSMENTS !== 'false';
}

export function getVoiceAssessmentSupportedKeys(): readonly string[] {
  return parseSupportedAssessmentKeys(process.env.SONARTRA_VOICE_ASSESSMENT_KEYS);
}

export function isVoiceAssessmentSupportedForKey(assessmentKey: string): boolean {
  if (!isVoiceAssessmentFeatureEnabled()) {
    return false;
  }

  return getVoiceAssessmentSupportedKeys().includes(assessmentKey.toLowerCase());
}

export function getVoiceAssessmentSupportState(
  assessmentKey: string,
): VoiceAssessmentSupportState {
  if (!isVoiceAssessmentFeatureEnabled()) {
    return 'feature_disabled';
  }

  return isVoiceAssessmentSupportedForKey(assessmentKey)
    ? 'supported'
    : 'unsupported_assessment';
}
