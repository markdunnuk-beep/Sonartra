export type LibraryCategoryKey =
  | 'assessment-guides'
  | 'behavioural-assessments'
  | 'conflict-style'
  | 'flow-state'
  | 'leadership-style'
  | 'team-dynamics'
  | 'work-style';

export type LibraryCategory = {
  key: LibraryCategoryKey;
  label: string;
  description: string;
  intro: string;
  assessmentKey: string | null;
  order: number;
};

export type LibraryArticleSection = {
  id: string;
  title: string;
  eyebrow?: string;
  summary?: string;
  body: string;
};

export type LibraryArticleCta = {
  label: string;
  href: string;
  assessmentKey?: string;
  supportingText?: string;
};

export type LibraryArticle = {
  slug: string;
  category: LibraryCategoryKey;
  title: string;
  description: string;
  heroSummary: string;
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  assessmentKey: string | null;
  signalKeys?: readonly string[];
  sections: readonly LibraryArticleSection[];
  relatedArticleSlugs: readonly string[];
  cta: LibraryArticleCta;
  featured?: boolean;
  featuredOrder?: number;
};

export type LibraryArticleStaticParam = {
  category: LibraryCategoryKey;
  slug: string;
};

export type LibraryCategoryStaticParam = {
  category: LibraryCategoryKey;
};
