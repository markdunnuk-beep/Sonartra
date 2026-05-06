import type { Metadata } from 'next';

import { DraftRunnerPrototype } from '@/components/draft/draft-runner-prototype';

export const metadata: Metadata = {
  title: 'Draft Assessment Runner | Sonartra',
  description: 'Static preview of the Sonartra assessment-taking experience.',
};

export default function DraftRunnerPage() {
  return <DraftRunnerPrototype />;
}
