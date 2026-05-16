import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  compileReportFirstTemplateFromMarkdown,
  type CompiledReportFirstTemplate,
  type ReportFirstTemplateJson,
} from '@/scripts/authoring/compile-report-first-template';
import generatedLeadershipReportFirstImportArtifact from '@/content/assessment-packages/leadership-approach/generated/report-first-template-import-rows.json';

export const leadershipReportFirstManifestPath = join(
  /* turbopackIgnore: true */ process.cwd(),
  'content',
  'assessment-packages',
  'leadership-approach',
  'report-first-template-manifest.json',
);

export const leadershipReportFirstSignals = ['results', 'process', 'vision', 'people'] as const;
export const leadershipReportFirstDomainKey = 'leadership_approach' as const;

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

export const leadershipReportFirstImportArtifactPath = join(
  /* turbopackIgnore: true */ process.cwd(),
  'content',
  'assessment-packages',
  'leadership-approach',
  'generated',
  'report-first-template-import-rows.json',
);

export const leadershipReportFirstImportArtifactRelativePath =
  'content/assessment-packages/leadership-approach/generated/report-first-template-import-rows.json';

export const leadershipReportFirstScoreShapePolicy =
  'pattern_level_score_shape_neutral' as const;

export type LeadershipReportFirstImportRow = {
  readonly assessment_key: string;
  readonly assessment_version: string;
  readonly package_key: string;
  readonly package_version: string;
  readonly domain_key: string;
  readonly pattern_key: string;
  readonly report_key: string;
  readonly report_contract: string;
  readonly score_shape_policy: typeof leadershipReportFirstScoreShapePolicy;
  readonly score_shape: null;
  readonly supported_score_shapes: readonly string[];
  readonly source_markdown_path: string;
  readonly source_content_hash: string;
  readonly content_hash: string;
  readonly report_template_json: ReportFirstTemplateJson;
  readonly status: 'active';
  readonly manifest_status: 'ready_for_import';
  readonly publishable: true;
  readonly ready_for_import: true;
  readonly generation_metadata: {
    readonly generated_from: 'leadership_report_first_manifest';
    readonly deterministic: true;
    readonly source_of_truth: string;
  };
};

export type LeadershipReportFirstMissingImportTemplate = {
  readonly assessment_key: string;
  readonly package_key: string;
  readonly package_version: string;
  readonly domain_key: string;
  readonly pattern_key: string;
  readonly status: ManifestTemplateStatus;
  readonly ready_for_import: false;
  readonly publishable: false;
};

export type LeadershipReportFirstImportArtifact = {
  readonly artifact_contract: 'leadership_report_first_template_import_rows_v1';
  readonly assessment_key: string;
  readonly package_key: string;
  readonly package_version: string;
  readonly domain_key: string;
  readonly report_contract: string;
  readonly source_of_truth: string;
  readonly score_shape_policy: typeof leadershipReportFirstScoreShapePolicy;
  readonly supported_score_shapes: readonly string[];
  readonly coverage: {
    readonly expected_template_count: number;
    readonly generated_import_ready_count: number;
    readonly missing_template_count: number;
    readonly publishable_full_coverage: boolean;
  };
  readonly expected_pattern_keys: readonly string[];
  readonly missing_templates: readonly LeadershipReportFirstMissingImportTemplate[];
  readonly import_rows: readonly LeadershipReportFirstImportRow[];
};

function isGeneratedImportArtifact(value: unknown): value is LeadershipReportFirstImportArtifact {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const coverage = record.coverage as Record<string, unknown> | undefined;

  return record.artifact_contract === 'leadership_report_first_template_import_rows_v1'
    && record.assessment_key === 'leadership-approach'
    && record.report_contract === 'report_first_canonical_payload_v1'
    && record.score_shape_policy === leadershipReportFirstScoreShapePolicy
    && Array.isArray(record.import_rows)
    && Array.isArray(record.expected_pattern_keys)
    && typeof coverage === 'object'
    && coverage !== null
    && typeof coverage.expected_template_count === 'number'
    && typeof coverage.generated_import_ready_count === 'number'
    && typeof coverage.missing_template_count === 'number';
}

export function getGeneratedLeadershipReportFirstImportArtifact(): LeadershipReportFirstImportArtifact {
  if (!isGeneratedImportArtifact(generatedLeadershipReportFirstImportArtifact)) {
    throw new Error('Generated Leadership report-first import artifact is unavailable or malformed.');
  }

  return generatedLeadershipReportFirstImportArtifact;
}

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
    && record.domain_key === leadershipReportFirstDomainKey
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
    domainKey: leadershipReportFirstDomainKey,
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

export async function buildLeadershipReportFirstImportArtifact(): Promise<LeadershipReportFirstImportArtifact> {
  const coverage = await getLeadershipReportFirstPackageCoverage();
  const availableTemplates = [...coverage.availableTemplates].sort((left, right) =>
    left.compiled.pattern_key.localeCompare(right.compiled.pattern_key),
  );
  const entriesByPattern = new Map(coverage.manifest.templates.map((entry) => [entry.pattern_key, entry]));

  const importRows = availableTemplates.map((entry): LeadershipReportFirstImportRow => {
    const sourceMarkdownPath = entry.manifestEntry.source_markdown_path;
    if (!sourceMarkdownPath) {
      throw new Error(`Ready report-first template ${entry.compiled.pattern_key} is missing source_markdown_path.`);
    }

    return {
      assessment_key: coverage.manifest.assessment_key,
      assessment_version: coverage.manifest.package_version,
      package_key: coverage.manifest.package_key,
      package_version: coverage.manifest.package_version,
      domain_key: entry.compiled.domain_key,
      pattern_key: entry.compiled.pattern_key,
      report_key: entry.compiled.report_key,
      report_contract: entry.compiled.report_contract,
      score_shape_policy: leadershipReportFirstScoreShapePolicy,
      score_shape: null,
      supported_score_shapes: coverage.manifest.score_shapes,
      source_markdown_path: sourceMarkdownPath,
      source_content_hash: entry.compiled.content_hash,
      content_hash: entry.compiled.content_hash,
      report_template_json: entry.compiled.report_template_json,
      status: 'active',
      manifest_status: 'ready_for_import',
      publishable: true,
      ready_for_import: true,
      generation_metadata: {
        generated_from: 'leadership_report_first_manifest',
        deterministic: true,
        source_of_truth: coverage.manifest.source_of_truth,
      },
    };
  });

  const missingTemplates = coverage.missingPatternKeys.map((patternKey): LeadershipReportFirstMissingImportTemplate => {
    const entry = entriesByPattern.get(patternKey);
    return {
      assessment_key: coverage.manifest.assessment_key,
      package_key: coverage.manifest.package_key,
      package_version: coverage.manifest.package_version,
      domain_key: coverage.manifest.domain_key,
      pattern_key: patternKey,
      status: entry?.status ?? 'missing',
      ready_for_import: false,
      publishable: false,
    };
  });

  return {
    artifact_contract: 'leadership_report_first_template_import_rows_v1',
    assessment_key: coverage.manifest.assessment_key,
    package_key: coverage.manifest.package_key,
    package_version: coverage.manifest.package_version,
    domain_key: coverage.manifest.domain_key,
    report_contract: coverage.manifest.report_contract,
    source_of_truth: coverage.manifest.source_of_truth,
    score_shape_policy: leadershipReportFirstScoreShapePolicy,
    supported_score_shapes: coverage.manifest.score_shapes,
    coverage: {
      expected_template_count: coverage.expectedCount,
      generated_import_ready_count: importRows.length,
      missing_template_count: coverage.missingCount,
      publishable_full_coverage: coverage.publishable,
    },
    expected_pattern_keys: coverage.expectedPatternKeys,
    missing_templates: missingTemplates,
    import_rows: importRows,
  };
}
