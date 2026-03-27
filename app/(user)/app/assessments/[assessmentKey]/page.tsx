import { redirect } from 'next/navigation';

import { getDbPool } from '@/lib/server/db';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import { getRequestUserId } from '@/lib/server/request-user';

type AssessmentEntryPageProps = {
  params: Promise<{
    assessmentKey: string;
  }>;
};

export default async function AssessmentEntryPage({
  params,
}: AssessmentEntryPageProps) {
  const { assessmentKey } = await params;
  const userId = await getRequestUserId();
  const service = createAssessmentRunnerService({
    db: getDbPool(),
  });
  const resolution = await service.resolveAssessmentEntry({
    userId,
    assessmentKey,
  });

  redirect(resolution.href);
}
