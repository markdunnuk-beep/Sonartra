import { notFound } from 'next/navigation';

import { SingleDomainResultsReport } from '@/components/results/single-domain-results-report';
import { getDbPool } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/request-user';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { AssessmentResultNotFoundError } from '@/lib/server/result-read-model-types';
import { createSingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';

type SingleDomainResultPageProps = {
  params: Promise<{
    resultId: string;
  }>;
};

export default async function SingleDomainResultPage(
  props: SingleDomainResultPageProps,
) {
  const { resultId } = await props.params;
  const service = createResultReadModelService({
    db: getDbPool(),
  });

  let detail;
  try {
    detail = await service.getAssessmentResultDetail({
      userId: await getRequestUserId(),
      resultId,
    });
  } catch (error) {
    if (error instanceof AssessmentResultNotFoundError) {
      notFound();
    }

    throw error;
  }

  if (detail.mode !== 'single_domain' || !detail.singleDomainResult) {
    notFound();
  }

  return (
    <SingleDomainResultsReport
      result={createSingleDomainResultsViewModel(detail.singleDomainResult)}
    />
  );
}
