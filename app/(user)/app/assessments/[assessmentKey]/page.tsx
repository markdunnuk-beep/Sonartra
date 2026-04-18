import { redirect } from 'next/navigation';

import { getDbPool } from '@/lib/server/db';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import { getRequestUserId } from '@/lib/server/request-user';

const STARTING_MINIMUM_VISIBLE_MS = 800;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type AssessmentEntryPageProps = {
  params: Promise<{
    assessmentKey: string;
  }>;
};

export default async function AssessmentEntryPage({
  params,
}: AssessmentEntryPageProps) {
  const startedAt = Date.now();
  const { assessmentKey } = await params;
  const userId = await getRequestUserId();
  const service = createAssessmentRunnerService({
    db: getDbPool(),
  });
  const resolution = await service.resolveAssessmentEntry({
    userId,
    assessmentKey,
  });

  if (resolution.kind === 'runner') {
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = Math.max(0, STARTING_MINIMUM_VISIBLE_MS - elapsedMs);

    if (remainingMs > 0) {
      await wait(remainingMs);
    }
  }

  redirect(resolution.href);
}
