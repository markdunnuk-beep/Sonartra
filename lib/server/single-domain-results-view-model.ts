import {
  buildSingleDomainResultComposerInput,
  composeSingleDomainReport,
  type ComposedNarrativeSection,
  type ComposedSingleDomainReport,
} from '@/lib/assessment-language/single-domain-composer';
import { createSingleDomainResultReadingSections } from '@/lib/results/single-domain-reading-sections';
import type { ResultReadingSectionsConfig } from '@/lib/results/result-reading-sections';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

export type SingleDomainResultsMetadataItem = {
  label: string;
  value: string;
};

export type SingleDomainResultsViewModel = {
  assessmentTitle: string;
  version: string;
  pairLabel: string;
  metadataItems: readonly SingleDomainResultsMetadataItem[];
  readingSections: ResultReadingSectionsConfig;
  report: ComposedSingleDomainReport;
};

const COPY_REPLACEMENTS: ReadonlyArray<readonly [pattern: RegExp, replacement: string]> = Object.freeze([
  [/\bpersisted\b/gi, ''],
  [/\brecomputing in the ui\b/gi, 'working it out again here'],
  [/\brecomputing\b/gi, 'working it out again'],
  [/\bintegrated meaning\b/gi, 'combined meaning'],
  [/\bbalancing diagnosis\b/gi, 'range limitation'],
  [/\bruntime definition\b/gi, 'current picture'],
  [/\bcanonical\b/gi, ''],
  [/\branked signals\b/gi, 'leading tendencies'],
  [/\bnormalized signal weight\b/gi, 'overall emphasis'],
  [/\bnormalized\b/gi, 'overall'],
  [/\bsystem risk\b/gi, 'watchout'],
  [/\bblueprint context\b/gi, 'focus'],
]);

const SINGLE_DOMAIN_SIGNAL_DISPLAY_LABELS = new Map<string, string>([
  ['results', 'Delivery'],
  ['result', 'Delivery'],
  ['report', 'Delivery'],
  ['delivery', 'Delivery'],
  ['vision', 'Vision'],
  ['people', 'People'],
  ['process', 'Process'],
  ['rigor', 'Rigor'],
  ['clarity', 'Clarity'],
]);

const APPROVED_SINGLE_DOMAIN_SIGNAL_TOKENS = Array.from(SINGLE_DOMAIN_SIGNAL_DISPLAY_LABELS.keys())
  .sort((left, right) => right.length - left.length)
  .join('|');

function cleanWhitespace(value: string): string {
  return value.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
}

function normalizeDisplayLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function resolveApprovedSignalDisplayLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return SINGLE_DOMAIN_SIGNAL_DISPLAY_LABELS.get(normalizeDisplayLookupKey(value)) ?? null;
}

function resolveApprovedPairDisplayLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parts = value
    .split(/[_-]+/)
    .map((part) => resolveApprovedSignalDisplayLabel(part))
    .filter((part): part is string => Boolean(part));

  if (parts.length >= 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return null;
}

function formatRawKeyLabel(value: string): string {
  return cleanWhitespace(
    value
      .split(/[_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' '),
  );
}

function replaceApprovedPairDisplayLabels(value: string): string {
  return value.replace(
    new RegExp(
      `\\b(${APPROVED_SINGLE_DOMAIN_SIGNAL_TOKENS})\\b\\s*(?:Ã—|x|and)\\s*\\b(${APPROVED_SINGLE_DOMAIN_SIGNAL_TOKENS})\\b`,
      'gi',
    ),
    (match, left, right) => {
      const leftLabel = resolveApprovedSignalDisplayLabel(left);
      const rightLabel = resolveApprovedSignalDisplayLabel(right);

      if (!leftLabel || !rightLabel) {
        return match;
      }

      return `${leftLabel} and ${rightLabel}`;
    },
  );
}

function replaceLeadingSignalKeyLabel(value: string): string {
  return value.replace(/^([a-z][a-z_-]*):/i, (match, key) => {
    const label = resolveApprovedSignalDisplayLabel(key);
    return label ? `${label}:` : match;
  });
}

function cleanResultCopy(value: string): string {
  let cleaned = value;

  for (const [pattern, replacement] of COPY_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = replaceApprovedPairDisplayLabels(cleaned);
  cleaned = replaceLeadingSignalKeyLabel(cleaned);

  cleaned = cleaned.replace(/\b[a-z]+(?:[_-][a-z]+)+\b/gi, (match) => (
    resolveApprovedPairDisplayLabel(match) ?? formatRawKeyLabel(match)
  ));

  return cleanWhitespace(cleaned);
}

function formatResultTimestamp(value: string | null): {
  date: string;
  time: string | null;
} {
  if (!value) {
    return {
      date: 'No completion date',
      time: null,
    };
  }

  const timestamp = new Date(value);

  return {
    date: timestamp.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: timestamp.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

function cleanComposedSection(section: ComposedNarrativeSection): ComposedNarrativeSection {
  return {
    ...section,
    paragraphs: section.paragraphs.map((paragraph) => cleanResultCopy(paragraph)),
    focusItems: section.focusItems.map((item) => ({
      label: cleanResultCopy(item.label),
      content: item.content.map((entry) => cleanResultCopy(entry)),
    })),
  };
}

function cleanComposedReport(report: ComposedSingleDomainReport): ComposedSingleDomainReport {
  return {
    ...report,
    domainTitle: cleanResultCopy(report.domainTitle),
    pairKey: cleanResultCopy(report.pairKey),
    sections: report.sections.map((section) => cleanComposedSection(section)),
  };
}

export function createSingleDomainResultsViewModel(
  payload: SingleDomainResultPayload,
): SingleDomainResultsViewModel {
  const completionTimestamp = formatResultTimestamp(payload.metadata.completedAt ?? payload.metadata.generatedAt);
  const pairLabel =
    resolveApprovedPairDisplayLabel(payload.hero.pair_key)
    ?? cleanResultCopy(payload.hero.pair_key);
  const report = cleanComposedReport(
    composeSingleDomainReport(buildSingleDomainResultComposerInput(payload)),
  );

  return {
    assessmentTitle: payload.metadata.assessmentTitle,
    version: payload.metadata.version,
    pairLabel,
    metadataItems: [
      { label: 'Completed', value: completionTimestamp.date },
      ...(completionTimestamp.time ? [{ label: 'Time', value: completionTimestamp.time }] : []),
      { label: 'Assessment', value: payload.metadata.assessmentTitle },
      { label: 'Version', value: payload.metadata.version },
    ],
    readingSections: createSingleDomainResultReadingSections(),
    report,
  };
}
