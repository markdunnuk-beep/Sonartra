import { AssessmentLoader } from '@/components/assessment/assessment-loader';

export default function AssessmentStartLoading() {
  return (
    <AssessmentLoader
      title="Preparing your assessment"
      variant="initialising"
      progressMode="simulated"
    />
  );
}
