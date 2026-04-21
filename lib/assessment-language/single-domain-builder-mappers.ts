import {
  SINGLE_DOMAIN_ALLOWED_CLAIMS_BY_SECTION,
  SINGLE_DOMAIN_NARRATIVE_DATASET_COLUMNS,
  SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS,
} from '@/lib/assessment-language/single-domain-narrative-schema';
import type {
  SingleDomainNarrativeDatasetKey,
  SingleDomainNarrativeSectionKey,
} from '@/lib/assessment-language/single-domain-narrative-types';
import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';

export type SingleDomainNarrativeSectionStatus = 'complete' | 'incomplete' | 'waiting';

export type SingleDomainNarrativeSectionValidationState = 'ready' | 'warning';

export type SingleDomainNarrativeBuilderSection = {
  key: SingleDomainNarrativeSectionKey;
  title: string;
  question: string;
  purpose: string;
  status: SingleDomainNarrativeSectionStatus;
  completionLabel: string;
  validationState: SingleDomainNarrativeSectionValidationState;
  validationMessages: readonly string[];
  allowedClaimOwnership: readonly string[];
  datasetKey: SingleDomainNarrativeDatasetKey;
  importHeader: string;
  currentRowCount: number;
  expectedRowCount: number;
};

export type SingleDomainNarrativeReadinessSummary = {
  completeCount: number;
  incompleteCount: number;
  waitingCount: number;
  validationWarningCount: number;
};

export type SingleDomainNarrativeBuilderModel = {
  sections: readonly SingleDomainNarrativeBuilderSection[];
  readiness: SingleDomainNarrativeReadinessSummary;
  adapterNote: string;
};

const SECTION_TITLES: Record<SingleDomainNarrativeSectionKey, string> = {
  intro: 'Intro',
  hero: 'Hero',
  drivers: 'Drivers',
  pair: 'Pair',
  limitation: 'Limitation',
  application: 'Application',
};

const SECTION_PURPOSES: Record<SingleDomainNarrativeSectionKey, string> = {
  intro: 'What this domain measures and how to read it',
  hero: 'The defining pattern in this domain',
  drivers: 'What is creating that pattern',
  pair: 'How the top two tendencies combine',
  limitation: 'Where the pattern becomes costly or narrow',
  application: 'What to rely on, notice, and develop',
};

const SECTION_DATASET_KEYS: Record<SingleDomainNarrativeSectionKey, SingleDomainNarrativeDatasetKey> = {
  intro: 'SINGLE_DOMAIN_INTRO',
  hero: 'SINGLE_DOMAIN_HERO',
  drivers: 'SINGLE_DOMAIN_DRIVERS',
  pair: 'SINGLE_DOMAIN_PAIR',
  limitation: 'SINGLE_DOMAIN_LIMITATION',
  application: 'SINGLE_DOMAIN_APPLICATION',
};

const LEGACY_VALIDATION_DATASET_KEYS = {
  intro: 'DOMAIN_FRAMING',
  hero: 'HERO_PAIRS',
  drivers: 'SIGNAL_CHAPTERS',
  pair: 'PAIR_SUMMARIES',
  limitation: 'BALANCING_SECTIONS',
  application: 'APPLICATION_STATEMENTS',
} as const;

function formatCompletionLabel(status: SingleDomainNarrativeSectionStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'incomplete':
      return 'Incomplete';
    case 'waiting':
      return 'Waiting';
  }
}

function toSectionStatus(
  status: 'ready' | 'attention' | 'waiting' | 'not_started',
): SingleDomainNarrativeSectionStatus {
  switch (status) {
    case 'ready':
      return 'complete';
    case 'attention':
    case 'not_started':
      return 'incomplete';
    case 'waiting':
      return 'waiting';
  }
}

function getSectionRowCounts(
  assessment: AdminAssessmentDetailViewModel,
  section: SingleDomainNarrativeSectionKey,
): {
  currentRowCount: number;
  expectedRowCount: number;
  detail: string;
  status: SingleDomainNarrativeSectionStatus;
} {
  const legacyKey = LEGACY_VALIDATION_DATASET_KEYS[section];
  const dataset = assessment.singleDomainLanguageValidation.datasets.find(
    (entry) => entry.datasetKey === legacyKey,
  );
  const status = toSectionStatus(dataset?.status ?? 'not_started');

  let detail = 'No section state is available yet.';
  if (dataset) {
    if (status === 'complete') {
      detail = `${SECTION_TITLES[section]} coverage matches the current single-domain narrative contract.`;
    } else if (status === 'waiting') {
      detail = `${SECTION_TITLES[section]} is waiting on earlier authored structure before readiness can be checked.`;
    } else if (dataset.countRule === 'exact') {
      detail = `${SECTION_TITLES[section]} currently has ${dataset.actualRowCount} of ${dataset.expectedRowCount} required adapted rows.`;
    } else {
      detail = `${SECTION_TITLES[section]} needs at least ${dataset.expectedRowCount} adapted row${dataset.expectedRowCount === 1 ? '' : 's'} before it can be treated as complete.`;
    }
  }

  return {
    currentRowCount: dataset?.actualRowCount ?? 0,
    expectedRowCount: dataset?.expectedRowCount ?? 0,
    detail,
    status,
  };
}

function buildValidationMessages(
  section: SingleDomainNarrativeSectionKey,
  assessment: AdminAssessmentDetailViewModel,
  detail: string,
): readonly string[] {
  const messages = [detail];

  if (section === 'hero' || section === 'pair') {
    messages.push(
      'Hero and pair duplication checks will bind to section-native preview input in a later task.',
    );
  }

  if (section === 'drivers') {
    messages.push(
      'Driver-role validation will enforce primary, secondary, supporting context, and range limitation ownership once section-native imports are wired.',
    );
  }

  if (section === 'limitation') {
    messages.push(
      'Weaker-signal linkage will block publish once limitation records are connected to range-limitation rows.',
    );
  }

  if (section === 'application') {
    messages.push(
      'Application guidance will block publish when materially underplayed signals lack a watchout or development action.',
    );
  }

  if (!assessment.latestDraftVersion) {
    messages.push('Draft-only authoring is unavailable until a draft version exists.');
  }

  return messages;
}

export function buildSingleDomainNarrativeBuilderModel(
  assessment: AdminAssessmentDetailViewModel,
): SingleDomainNarrativeBuilderModel {
  const sections = SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS.map((contract) => {
    const counts = getSectionRowCounts(assessment, contract.section);

    return {
      key: contract.section,
      title: SECTION_TITLES[contract.section],
      question: contract.question,
      purpose: SECTION_PURPOSES[contract.section],
      status: counts.status,
      completionLabel: formatCompletionLabel(counts.status),
      validationState: counts.status === 'complete' ? 'ready' : 'warning',
      validationMessages: buildValidationMessages(contract.section, assessment, counts.detail),
      allowedClaimOwnership: SINGLE_DOMAIN_ALLOWED_CLAIMS_BY_SECTION[contract.section],
      datasetKey: SECTION_DATASET_KEYS[contract.section],
      importHeader: SINGLE_DOMAIN_NARRATIVE_DATASET_COLUMNS[SECTION_DATASET_KEYS[contract.section]].join('|'),
      currentRowCount: counts.currentRowCount,
      expectedRowCount: counts.expectedRowCount,
    } satisfies SingleDomainNarrativeBuilderSection;
  });

  return {
    sections,
    readiness: {
      completeCount: sections.filter((section) => section.status === 'complete').length,
      incompleteCount: sections.filter((section) => section.status === 'incomplete').length,
      waitingCount: sections.filter((section) => section.status === 'waiting').length,
      validationWarningCount: sections.reduce(
        (sum, section) => sum + (section.validationState === 'warning' ? 1 : 0),
        0,
      ),
    },
    adapterNote:
      'The builder now renders the locked six-section narrative contract. Existing stored single-domain language rows are adapted internally until section-native imports and composer preview land.',
  };
}
