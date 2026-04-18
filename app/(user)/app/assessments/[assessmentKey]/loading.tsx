import { AssessmentLoader } from '@/components/assessment/assessment-loader';

export default function AssessmentEntryLoading() {
  return (
    <AssessmentLoader
      title="Preparing your assessment"
      variant="initialising"
      progressMode="simulated"
    />
  );
}
