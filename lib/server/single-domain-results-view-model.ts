import {
  buildSingleDomainResultComposerInput,
  composeSingleDomainReport,
  type ComposedNarrativeSection,
  type ComposedSingleDomainReport,
} from '@/lib/assessment-language/single-domain-composer';
import { createSingleDomainResultReadingSections } from '@/lib/results/single-domain-reading-sections';
import type { ResultReadingSectionsConfig } from '@/lib/results/result-reading-sections';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';
import {
  preserveAuthoredText,
  toSentenceCaseSafe,
  toTitleCaseForLabel,
} from '@/lib/utils/text-formatting';

export type SingleDomainResultsMetadataItem = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export type SingleDomainResultsViewModel = {
  assessmentTitle: string;
  version: string;
  pairLabel: string;
  metadataItems: readonly SingleDomainResultsMetadataItem[];
  readingSections: ResultReadingSectionsConfig;
  report: ComposedSingleDomainReport;
};

const SINGLE_DOMAIN_SIGNAL_DISPLAY_LABELS = new Map<string, string>([
  ['results', 'Results'],
  ['result', 'Result'],
  ['delivery', 'Delivery'],
  ['vision', 'Vision'],
  ['people', 'People'],
  ['process', 'Process'],
  ['rigor', 'Rigor'],
  ['clarity', 'Clarity'],
]);

function normalizeDisplayLookupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
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
  return toTitleCaseForLabel(value);
}

function formatDisplayLabel(value: string): string {
  return resolveApprovedPairDisplayLabel(value)
    ?? resolveApprovedSignalDisplayLabel(value)
    ?? toSentenceCaseSafe(value);
}

function formatNarrativeText(value: string): string {
  return preserveAuthoredText(value).replace(/^([a-z][a-z_-]*):\s/i, (match, key) => {
    const label = resolveApprovedSignalDisplayLabel(key);

    return label ? `${label}: ` : match;
  });
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
    title: formatDisplayLabel(section.title),
    paragraphs: section.paragraphs.map((paragraph) => formatNarrativeText(paragraph)),
    focusItems: section.focusItems.map((item) => ({
      label: formatDisplayLabel(item.label),
      content: item.content.map((entry) => formatNarrativeText(entry)),
    })),
  };
}

function cleanComposedReport(report: ComposedSingleDomainReport): ComposedSingleDomainReport {
  return {
    ...report,
    domainTitle: preserveAuthoredText(report.domainTitle),
    pairKey: report.pairKey,
    sections: report.sections.map((section) => cleanComposedSection(section)),
  };
}

export function createSingleDomainResultsViewModel(
  payload: SingleDomainResultPayload,
): SingleDomainResultsViewModel {
  const completionTimestamp = formatResultTimestamp(
    payload.metadata.completedAt ?? payload.metadata.generatedAt,
  );
  const pairLabel =
    resolveApprovedPairDisplayLabel(payload.hero.pair_key) ??
    formatRawKeyLabel(payload.hero.pair_key);
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
