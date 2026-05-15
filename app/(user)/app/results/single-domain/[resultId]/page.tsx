import { notFound } from 'next/navigation';

import { RankedPatternResultReport } from '@/components/results/ranked-pattern-result-report';
import { ReportFirstResultReport } from '@/components/results/report-first-result-report';
import { SingleDomainResultReport } from '@/components/results/single-domain-result-report';
import { isRankedPatternRenderablePayload } from '@/lib/results/ranked-pattern-renderable';
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

  if (detail.mode !== 'single_domain') {
    notFound();
  }

  if (detail.resultKind === 'report_first' && detail.reportFirstResult) {
    return <ReportFirstResultReport payload={detail.reportFirstResult} />;
  }

  if (!detail.singleDomainResult) {
    notFound();
  }

  if (isRankedPatternRenderablePayload(detail.singleDomainResult)) {
    return <RankedPatternResultReport payload={detail.singleDomainResult} />;
  }

  return (
    <SingleDomainResultReport
      result={createSingleDomainResultsViewModel(detail.singleDomainResult)}
    />
  );
}
