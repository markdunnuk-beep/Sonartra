import { redirect } from 'next/navigation';

import { AssessmentUnavailablePage } from '@/components/assessment/assessment-unavailable-page';
import { getDbPool } from '@/lib/server/db';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import { getRequestUserId } from '@/lib/server/request-user';

const STARTING_MINIMUM_VISIBLE_MS = 800;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type AssessmentStartPageProps = {
  params: Promise<{
    assessmentKey: string;
  }>;
};

export default async function AssessmentStartPage({
  params,
}: AssessmentStartPageProps) {
  const { assessmentKey } = await params;
  const userId = await getRequestUserId();
  const service = createAssessmentRunnerService({
    db: getDbPool(),
  });
  const resolution = await service.resolveAssessmentEntry({
    userId,
    assessmentKey,
  });

  if (resolution.kind === 'unavailable') {
    return <AssessmentUnavailablePage assessmentKey={resolution.assessmentKey} />;
  }

  if (resolution.kind === 'runner') {
    await wait(STARTING_MINIMUM_VISIBLE_MS);
  }

  redirect(resolution.href);
}
