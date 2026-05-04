import type { Metadata } from 'next';

import { DraftRankedResultPreview } from '@/components/draft/draft-ranked-result-preview';

export const metadata: Metadata = {
  title: 'Draft Ranked Pattern Result | Sonartra',
  description:
    'Static schema-faithful ranked pattern report prototype for Sonartra draft result validation.',
};

export default function DraftResultPage() {
  return <DraftRankedResultPreview />;
}
