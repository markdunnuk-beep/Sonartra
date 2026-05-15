import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  compileReportFirstTemplateFromMarkdown,
  type CompiledReportFirstTemplate,
} from '@/scripts/authoring/compile-report-first-template';

export const leadershipReportFirstManifestPath = join(
  /* turbopackIgnore: true */ process.cwd(),
  'content',
  'assessment-packages',
  'leadership-approach',
  'report-first-template-manifest.json',
);

export const leadershipReportFirstSignals = ['results', 'process', 'vision', 'people'] as const;

export const leadershipReportFirstRequiredHeadings = [
  'Editorial introduction',
  'Pattern at a glance',
  'Evidence behind your result',
  'Key insight',
  'Chapter 1',
  'Chapter 2',
  'Chapter 3',
  'Chapter 4',
  'Chapter 5',
  'Chapter 6',
  'Chapter 7',
  'Chapter 8',
  'Chapter 9',
  'Chapter 10',
  'Closing synthesis',
  'Final line',
  'Save this report',
] as const;

export const leadershipReportFirstRepresentativeParagraphs = [
  'Others may experience your leadership as dependable, grounded, and useful.',
  'You are likely to make decisions by organising available information into a practical route.',
  'You tend to communicate through clarity, structure, and expectation.',
  'Under pressure, your leadership may tighten toward control, sequence, and delivery discipline.',
  'People expands this pattern by turning clarity into shared ownership.',
  'Vision expands this pattern by connecting reliable action to a larger direction.',
  'The development work is not to abandon structure or delivery.',
  'At your best, you give people more than a process to follow.',
] as const;

const forbiddenReaderLabels = [
  'persisted result payload',
  'template id',
  'content hash',
  'lookup key',
  'pattern_key',
  'draft-only',
  'undefined',
  'null',
  'raw JSON',
] as const;

type ManifestTemplateStatus = 'ready_for_import' | 'draft' | 'placeholder' | 'missing';

export type LeadershipReportFirstManifestTemplate = {
  readonly pattern_key: string;
  readonly source_markdown_path?: string;
  readonly status: ManifestTemplateStatus;
  readonly ready_for_import: boolean;
  readonly publishable: boolean;
};

type LeadershipReportFirstManifest = {
  readonly assessment_key: string;
  readonly package_key: string;
  readonly package_version: string;
  readonly domain_key: string;
  readonly source_of_truth: string;
  readonly generated_artifact_status: string;
  readonly report_contract: string;
  readonly scored_signals: readonly string[];
  readonly score_shapes: readonly string[];
  readonly coverage_policy: {
    readonly expected_template_count: number;
    readonly publishable_requires_all_expected_templates: boolean;
    readonly missing_templates_are_publish_blocking: boolean;
    readonly placeholder_templates_are_not_publishable: boolean;
    readonly score_shape_is_metadata_only_for_report_first_templates: boolean;
  };
  readonly templates: readonly LeadershipReportFirstManifestTemplate[];
};

export type LeadershipReportFirstCompiledTemplate = {
  readonly manifestEntry: LeadershipReportFirstManifestTemplate;
  readonly compiled: CompiledReportFirstTemplate;
  readonly missingHeadings: readonly string[];
  readonly missingRepresentativeParagraphs: readonly string[];
  readonly forbiddenLabels: readonly string[];
  readonly readyForImport: boolean;
};

export type LeadershipReportFirstCoverage = {
  readonly manifest: LeadershipReportFirstManifest;
  readonly expectedPatternKeys: readonly string[];
  readonly presentPatternKeys: readonly string[];
  readonly missingPatternKeys: readonly string[];
  readonly compiledTemplates: readonly LeadershipReportFirstCompiledTemplate[];
  readonly availableTemplates: readonly LeadershipReportFirstCompiledTemplate[];
  readonly expectedCount: number;
  readonly presentCount: number;
  readonly missingCount: number;
  readonly publishable: boolean;
};

function permutations(values: readonly string[]): readonly string[][] {
  if (values.length === 0) {
    return [[]];
  }

  return values.flatMap((value, index) => {
    const remaining = [...values.slice(0, index), ...values.slice(index + 1)];
    return permutations(remaining).map((permutation) => [value, ...permutation]);
  });
}

export function leadershipReportFirstExpectedPatternKeys(): readonly string[] {
  return permutations(leadershipReportFirstSignals).map((signals) => signals.join('_'));
}

function isManifest(value: unknown): value is LeadershipReportFirstManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.assessment_key === 'leadership-approach'
    && record.domain_key === 'leadership-approach'
    && record.report_contract === 'report_first_canonical_payload_v1'
    && Array.isArray(record.templates);
}

export async function readLeadershipReportFirstManifest(): Promise<LeadershipReportFirstManifest> {
  const raw = await readFile(leadershipReportFirstManifestPath, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (!isManifest(parsed)) {
    throw new Error('Leadership report-first manifest is malformed.');
  }

  return parsed;
}

function readReportText(compiled: CompiledReportFirstTemplate): string {
  return JSON.stringify({
    report: compiled.report_template_json.report,
    evidenceTemplate: compiled.report_template_json.evidenceTemplate,
  });
}

function missingHeadings(compiled: CompiledReportFirstTemplate): readonly string[] {
  const text = readReportText(compiled);
  return leadershipReportFirstRequiredHeadings.filter((heading) => {
    if (heading === 'Editorial introduction') {
      return compiled.report_template_json.report.opening.length === 0;
    }
    if (heading === 'Pattern at a glance') {
      return compiled.report_template_json.report.patternSummary.blocks.length === 0;
    }
    if (heading === 'Evidence behind your result') {
      return compiled.report_template_json.evidenceTemplate.blocks.length === 0;
    }
    if (heading === 'Key insight') {
      return !compiled.report_template_json.report.keyInsight;
    }
    if (/^Chapter \d+$/.test(heading)) {
      const chapterNumber = Number(heading.replace('Chapter ', ''));
      return !compiled.report_template_json.report.chapters.some(
        (chapter) => chapter.chapterNumber === chapterNumber,
      );
    }
    if (heading === 'Closing synthesis') {
      return compiled.report_template_json.report.closing.synthesis.length === 0;
    }
    if (heading === 'Final line') {
      return compiled.report_template_json.report.closing.finalLine.trim().length === 0;
    }
    if (heading === 'Save this report') {
      return compiled.report_template_json.report.pdf.title.trim().length === 0;
    }

    return !text.includes(heading);
  });
}

function missingRepresentativeParagraphs(compiled: CompiledReportFirstTemplate): readonly string[] {
  const text = readReportText(compiled);
  return leadershipReportFirstRepresentativeParagraphs.filter((paragraph) => !text.includes(paragraph));
}

function forbiddenLabels(compiled: CompiledReportFirstTemplate): readonly string[] {
  const text = readReportText(compiled).toLowerCase();
  return forbiddenReaderLabels.filter((label) => text.includes(label.toLowerCase()));
}

async function compileTemplate(
  entry: LeadershipReportFirstManifestTemplate,
): Promise<LeadershipReportFirstCompiledTemplate | null> {
  if (!entry.source_markdown_path) {
    return null;
  }

  const sourcePath = join(/* turbopackIgnore: true */ process.cwd(), entry.source_markdown_path);
  const source = await readFile(sourcePath, 'utf8');
  const compiled = compileReportFirstTemplateFromMarkdown(source, {
    inputPath: entry.source_markdown_path,
  });
  const headingGaps = missingHeadings(compiled);
  const paragraphGaps = missingRepresentativeParagraphs(compiled);
  const internalLabels = forbiddenLabels(compiled);

  return {
    manifestEntry: entry,
    compiled,
    missingHeadings: headingGaps,
    missingRepresentativeParagraphs: paragraphGaps,
    forbiddenLabels: internalLabels,
    readyForImport:
      entry.ready_for_import
      && entry.publishable
      && entry.status === 'ready_for_import'
      && compiled.pattern_key === entry.pattern_key
      && headingGaps.length === 0
      && internalLabels.length === 0,
  };
}

export async function getLeadershipReportFirstPackageCoverage(): Promise<LeadershipReportFirstCoverage> {
  const manifest = await readLeadershipReportFirstManifest();
  const expectedPatternKeys = leadershipReportFirstExpectedPatternKeys();
  const entriesByPattern = new Map(manifest.templates.map((entry) => [entry.pattern_key, entry]));
  const presentPatternKeys = manifest.templates
    .filter((entry) => Boolean(entry.source_markdown_path))
    .map((entry) => entry.pattern_key);
  const missingPatternKeys = expectedPatternKeys.filter((patternKey) => {
    const entry = entriesByPattern.get(patternKey);
    return !entry || !entry.source_markdown_path || !entry.ready_for_import || !entry.publishable;
  });
  const compiledTemplates = (
    await Promise.all(manifest.templates.map((entry) => compileTemplate(entry)))
  ).filter((entry): entry is LeadershipReportFirstCompiledTemplate => entry !== null);
  const availableTemplates = compiledTemplates.filter((entry) => entry.readyForImport);

  return {
    manifest,
    expectedPatternKeys,
    presentPatternKeys,
    missingPatternKeys,
    compiledTemplates,
    availableTemplates,
    expectedCount: expectedPatternKeys.length,
    presentCount: presentPatternKeys.length,
    missingCount: missingPatternKeys.length,
    publishable:
      manifest.coverage_policy.publishable_requires_all_expected_templates
      && missingPatternKeys.length === 0
      && availableTemplates.length === expectedPatternKeys.length,
  };
}
