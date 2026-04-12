export const singleDomainBuilderSteps = [
  { key: 'overview', slug: 'overview', label: 'Overview', validationKey: 'overview' },
  { key: 'domain', slug: 'domain', label: 'Domain', validationKey: 'domain' },
  { key: 'signals', slug: 'signals', label: 'Signals', validationKey: 'signals' },
  { key: 'questions', slug: 'questions', label: 'Questions', validationKey: 'questions' },
  { key: 'responses', slug: 'responses', label: 'Responses', validationKey: 'responses' },
  { key: 'weightings', slug: 'weightings', label: 'Weightings', validationKey: 'weightings' },
  { key: 'language', slug: 'language', label: 'Language', validationKey: 'language' },
  { key: 'review', slug: 'review', label: 'Review', validationKey: 'review' },
] as const;

export type SingleDomainBuilderStepKey = (typeof singleDomainBuilderSteps)[number]['key'];
export type SingleDomainBuilderStep = (typeof singleDomainBuilderSteps)[number];

export function getSingleDomainBuilderStep(
  key: SingleDomainBuilderStepKey,
): SingleDomainBuilderStep {
  return singleDomainBuilderSteps.find((step) => step.key === key) ?? singleDomainBuilderSteps[0];
}

export function getSingleDomainBuilderActiveStep(
  pathname: string,
  assessmentKey: string,
): SingleDomainBuilderStepKey {
  const basePath = `/admin/assessments/single-domain/${assessmentKey}/`;
  const slug = pathname.startsWith(basePath) ? pathname.slice(basePath.length).split('/')[0] : '';
  const step = singleDomainBuilderSteps.find((candidate) => candidate.slug === slug);

  return step?.key ?? 'overview';
}

export function getSingleDomainBuilderStepIndex(
  key: SingleDomainBuilderStepKey,
): number {
  return Math.max(
    0,
    singleDomainBuilderSteps.findIndex((step) => step.key === key),
  );
}

export function getPreviousSingleDomainBuilderStep(
  key: SingleDomainBuilderStepKey,
): SingleDomainBuilderStep | null {
  const index = getSingleDomainBuilderStepIndex(key);
  return index > 0 ? singleDomainBuilderSteps[index - 1] : null;
}

export function getNextSingleDomainBuilderStep(
  key: SingleDomainBuilderStepKey,
): SingleDomainBuilderStep | null {
  const index = getSingleDomainBuilderStepIndex(key);
  return index < singleDomainBuilderSteps.length - 1 ? singleDomainBuilderSteps[index + 1] : null;
}
