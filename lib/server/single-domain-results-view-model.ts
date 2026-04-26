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

export type SingleDomainResultsEvidenceItem = {
  label: string;
  value: string;
  detail?: string;
};

export type SingleDomainResultsOpeningSummary = {
  eyebrow: string;
  title: string;
  diagnosis: string;
  implication: string;
  evidenceItems: readonly SingleDomainResultsEvidenceItem[];
};

export type SingleDomainResultsViewModel = {
  assessmentTitle: string;
  version: string;
  pairLabel: string;
  openingSummary: SingleDomainResultsOpeningSummary;
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

function createOpeningSummary(
  payload: SingleDomainResultPayload,
  pairLabel: string,
): SingleDomainResultsOpeningSummary {
  const rankedSignals = [...payload.signals].sort((left, right) => left.rank - right.rank);
  const primary = rankedSignals[0];
  const secondary = rankedSignals[1];
  const underplayed = rankedSignals.find((signal) => signal.position === 'underplayed')
    ?? rankedSignals[rankedSignals.length - 1];

  const primaryLabel = primary?.signal_label ?? 'Primary signal';
  const secondaryLabel = secondary?.signal_label ?? 'secondary signal';
  const underplayedLabel = underplayed?.signal_label ?? 'least available range';

  const signalPattern = secondary
    ? `${primaryLabel} appears strongest, ${secondaryLabel} reinforces it, and ${underplayedLabel} is the least available range.`
    : `${primaryLabel} appears as the strongest signal in this result.`;

  return {
    eyebrow: 'Your leadership pattern',
    title: secondary
      ? `${primaryLabel}-led pattern, reinforced by ${secondaryLabel}`
      : `${primaryLabel}-led pattern`,
    diagnosis: formatNarrativeText(payload.pairSummary.pair_opening_paragraph),
    implication: formatNarrativeText(payload.balancing.current_pattern_paragraph),
    evidenceItems: [
      {
        label: 'Leading pair',
        value: pairLabel,
        detail: payload.hero.hero_opening,
      },
      {
        label: 'Signal pattern',
        value: signalPattern,
        detail: `Ranked from ${payload.diagnostics.answeredQuestionCount} completed responses.`,
      },
      {
        label: 'Missing range',
        value: `${underplayedLabel}: ${payload.balancing.balancing_section_title}`,
        detail: 'The least available range named by this result.',
      },
    ],
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
  const openingSummary = createOpeningSummary(payload, pairLabel);

  return {
    assessmentTitle: payload.metadata.assessmentTitle,
    version: payload.metadata.version,
    pairLabel,
    openingSummary,
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
