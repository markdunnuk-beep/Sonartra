import {
  isRankedPatternRenderablePayload,
  RankedPatternResultReport,
} from '@/components/results/ranked-pattern-result-report';
import { buildRankedPatternResultPayload } from '@/content/draft-result/ranked-pattern-canonical-payload';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

export default function DraftRankedPatternResultPage() {
  const payload = buildRankedPatternResultPayload() as SingleDomainResultPayload;

  if (!isRankedPatternRenderablePayload(payload)) {
    throw new Error('Draft ranked-pattern result fixture is not renderable.');
  }

  return <RankedPatternResultReport payload={payload} />;
}
