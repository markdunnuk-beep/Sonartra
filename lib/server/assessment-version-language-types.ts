import type { AssessmentVersionId } from '@/lib/engine/types';

export type AssessmentVersionLanguageSignalSection =
  | 'chapterSummary'
  | 'strength'
  | 'watchout'
  | 'development';

export type AssessmentVersionLanguageLegacySignalSection = 'summary';

export type AssessmentVersionLanguageStoredSignalSection =
  | AssessmentVersionLanguageSignalSection
  | AssessmentVersionLanguageLegacySignalSection;

export type AssessmentVersionLanguagePairSection =
  | 'chapterSummary'
  | 'pressureFocus'
  | 'environmentFocus';

export type AssessmentVersionLanguageLegacyPairSection =
  | 'summary'
  | 'strength'
  | 'watchout';

export type AssessmentVersionLanguageStoredPairSection =
  | AssessmentVersionLanguagePairSection
  | AssessmentVersionLanguageLegacyPairSection;

export type AssessmentVersionLanguageDomainSection = 'chapterOpening';

export type AssessmentVersionLanguageLegacyDomainSection =
  | 'summary'
  | 'focus'
  | 'pressure'
  | 'environment';

export type AssessmentVersionLanguageStoredDomainSection =
  | AssessmentVersionLanguageDomainSection
  | AssessmentVersionLanguageLegacyDomainSection;

export type AssessmentVersionLanguageOverviewSection =
  | 'summary'
  | 'strengths'
  | 'watchouts'
  | 'development'
  | 'headline';

export type AssessmentVersionLanguageHeroHeaderRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  pairKey: string;
  headline: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionLanguageSignalRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  signalKey: string;
  section: AssessmentVersionLanguageStoredSignalSection;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionLanguagePairRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  signalPair: string;
  section: AssessmentVersionLanguageStoredPairSection;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionLanguageDomainRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  domainKey: string;
  section: AssessmentVersionLanguageStoredDomainSection;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionLanguageOverviewRow = {
  id: string;
  assessmentVersionId: AssessmentVersionId;
  patternKey: string;
  section: AssessmentVersionLanguageOverviewSection;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentVersionLanguageSignalInput = {
  signalKey: string;
  section: AssessmentVersionLanguageSignalSection;
  content: string;
};

export type AssessmentVersionLanguagePairInput = {
  signalPair: string;
  section: AssessmentVersionLanguagePairSection;
  content: string;
};

export type AssessmentVersionLanguageDomainInput = {
  domainKey: string;
  section: AssessmentVersionLanguageDomainSection;
  content: string;
};

export type AssessmentVersionLanguageOverviewInput = {
  patternKey: string;
  section: AssessmentVersionLanguageOverviewSection;
  content: string;
};

export type AssessmentVersionLanguageHeroHeaderInput = {
  pairKey: string;
  headline: string;
};

export type AssessmentVersionLanguageSectionMap<TSection extends string> =
  Readonly<Partial<Record<TSection, string>>>;

export type AssessmentVersionLanguageSignalsByKey =
  Readonly<Record<string, AssessmentVersionLanguageSectionMap<AssessmentVersionLanguageSignalSection>>>;

export type AssessmentVersionLanguagePairsByKey =
  Readonly<Record<string, AssessmentVersionLanguageSectionMap<AssessmentVersionLanguagePairSection>>>;

export type AssessmentVersionLanguageDomainsByKey =
  Readonly<Record<string, AssessmentVersionLanguageSectionMap<AssessmentVersionLanguageStoredDomainSection>>>;

export type AssessmentVersionLanguageOverviewByKey =
  Readonly<Record<string, AssessmentVersionLanguageSectionMap<AssessmentVersionLanguageOverviewSection>>>;

export type AssessmentVersionLanguageHeroHeadersByKey =
  Readonly<Record<string, Readonly<{ headline: string }>>>;

export type AssessmentVersionLanguageBundle = {
  signals: AssessmentVersionLanguageSignalsByKey;
  pairs: AssessmentVersionLanguagePairsByKey;
  domains: AssessmentVersionLanguageDomainsByKey;
  overview: AssessmentVersionLanguageOverviewByKey;
  heroHeaders?: AssessmentVersionLanguageHeroHeadersByKey;
};
