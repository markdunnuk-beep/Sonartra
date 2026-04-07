import type { AssessmentResultDetailViewModel } from '@/lib/server/result-read-model-types';

export const DEFAULT_SONARTRA_SHARE_LINK = 'https://www.sonartra.com/signals';

const LINKEDIN_INTRO =
  'I’ve just completed the Sonartra Signals assessment — do you agree with how my behavioural patterns show up?';
const LINKEDIN_CTA =
  'If you’re curious about your own patterns and want a free Sonartra Signals assessment, take a look here:';

export type LinkedInShareFormatInput = Pick<
  AssessmentResultDetailViewModel,
  'hero' | 'rankedSignals'
> & {
  firstName?: string | null;
  shareLink?: string | null;
};

export type LinkedInShareFormatResult = {
  postBody: string;
  canShare: boolean;
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeComparisonText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function ensureSentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function dedupeOrderedParagraphs(values: readonly string[]): readonly string[] {
  const accepted: string[] = [];

  for (const value of values) {
    const candidate = normalizeText(value);
    if (!candidate) {
      continue;
    }

    const candidateComparable = normalizeComparisonText(candidate);
    if (!candidateComparable) {
      continue;
    }

    const isDuplicate = accepted.some((acceptedValue) => {
      const acceptedComparable = normalizeComparisonText(acceptedValue);
      return (
        acceptedComparable === candidateComparable
        || acceptedComparable.includes(candidateComparable)
        || candidateComparable.includes(acceptedComparable)
      );
    });

    if (!isDuplicate) {
      accepted.push(candidate);
    }
  }

  return accepted;
}

function buildHeadlineLine(params: {
  firstName?: string | null;
  headline: string;
}): string {
  const headline = normalizeText(params.headline);
  if (!headline) {
    return '';
  }

  const safeHeadline = ensureSentence(headline);
  const safeFirstName = normalizeText(params.firstName);

  return safeFirstName ? `${safeFirstName} ${safeHeadline}` : safeHeadline;
}

export function formatLinkedInSharePost(
  input: LinkedInShareFormatInput,
): LinkedInShareFormatResult {
  const headline = normalizeText(input.hero.headline);
  const summary = normalizeText(input.hero.summary);
  const narrative = normalizeText(input.hero.narrative);
  const shareLink = normalizeText(input.shareLink) || DEFAULT_SONARTRA_SHARE_LINK;

  const headlineLine = buildHeadlineLine({
    firstName: input.firstName,
    headline,
  });

  const bodyParagraphs = dedupeOrderedParagraphs([
    narrative,
    summary,
  ]).filter((paragraph) => {
    const comparableParagraph = normalizeComparisonText(paragraph);
    const comparableHeadline = normalizeComparisonText(headlineLine || headline);

    return comparableHeadline ? comparableParagraph !== comparableHeadline : true;
  });

  const hasHeroContent = Boolean(headlineLine || bodyParagraphs.length > 0);
  if (!hasHeroContent) {
    return {
      postBody: '',
      canShare: false,
    };
  }

  const lines = [
    LINKEDIN_INTRO,
    headlineLine,
    bodyParagraphs.join('\n\n'),
    LINKEDIN_CTA,
    shareLink,
  ].filter((line) => line.length > 0);

  return {
    postBody: lines.join('\n\n'),
    canShare: true,
  };
}
