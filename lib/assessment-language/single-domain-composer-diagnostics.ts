import {
  composeSingleDomainReport,
  getClaimOwnerSection,
  type ComposedSingleDomainReport,
  type ResultComposerPreviewInput,
} from '@/lib/assessment-language/single-domain-composer';
import type { SingleDomainNarrativeSectionKey } from '@/lib/assessment-language/single-domain-narrative-types';

export type ComposerDiagnosticSeverity = 'warning' | 'blocking';

export type ComposerDiagnosticCode =
  | 'hero_pair_overlap'
  | 'repeated_phrase_reuse'
  | 'weaker_signal_propagation_gap'
  | 'missing_section_content'
  | 'application_grounding_gap'
  | 'section_role_collision';

export type ComposerDiagnostic = {
  code: ComposerDiagnosticCode;
  severity: ComposerDiagnosticSeverity;
  message: string;
  sections: readonly SingleDomainNarrativeSectionKey[];
  phrase?: string;
};

export type ComposerDiagnostics = {
  hasBlockingIssues: boolean;
  issues: readonly ComposerDiagnostic[];
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): readonly string[] {
  return normalizeText(value).split(' ').filter(Boolean);
}

function buildSectionTextMap(report: ComposedSingleDomainReport): Record<SingleDomainNarrativeSectionKey, string> {
  return Object.fromEntries(
    report.sections.map((section) => [
      section.key,
      [
        ...section.paragraphs,
        ...section.focusItems.flatMap((item) => item.content),
      ].join(' '),
    ]),
  ) as Record<SingleDomainNarrativeSectionKey, string>;
}

function similarityScore(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

function collectRepeatedPhrases(report: ComposedSingleDomainReport): readonly ComposerDiagnostic[] {
  const sectionText = buildSectionTextMap(report);
  const trackedSections: readonly SingleDomainNarrativeSectionKey[] = [
    'hero',
    'drivers',
    'pair',
    'limitation',
  ];
  const phraseOwners = new Map<string, Set<SingleDomainNarrativeSectionKey>>();

  trackedSections.forEach((sectionKey) => {
    const tokens = tokenize(sectionText[sectionKey] ?? '');
    for (let index = 0; index <= tokens.length - 4; index += 1) {
      const phrase = tokens.slice(index, index + 4).join(' ');
      const owners = phraseOwners.get(phrase) ?? new Set<SingleDomainNarrativeSectionKey>();
      owners.add(sectionKey);
      phraseOwners.set(phrase, owners);
    }
  });

  return [...phraseOwners.entries()]
    .filter(([, owners]) => owners.size > 1)
    .slice(0, 6)
    .map(([phrase, owners]) => ({
      code: 'repeated_phrase_reuse',
      severity: 'warning',
      message: `Repeated phrase reused across sections: "${phrase}".`,
      sections: [...owners],
      phrase,
    }));
}

function collectMissingSectionContent(report: ComposedSingleDomainReport): readonly ComposerDiagnostic[] {
  return report.sections
    .filter((section) => {
      const contentCount =
        section.paragraphs.filter((paragraph) => paragraph.trim().length > 0).length
        + section.focusItems.reduce(
          (sum, item) => sum + item.content.filter((entry) => entry.trim().length > 0).length,
          0,
        );
      return contentCount === 0;
    })
    .map((section) => ({
      code: 'missing_section_content',
      severity: 'blocking',
      message: `${section.title} is empty in the composed preview.`,
      sections: [section.key],
    }));
}

function collectHeroPairOverlap(report: ComposedSingleDomainReport): readonly ComposerDiagnostic[] {
  const hero = report.sections.find((section) => section.key === 'hero');
  const pair = report.sections.find((section) => section.key === 'pair');
  if (!hero || !pair) {
    return [];
  }

  const heroText = [...hero.paragraphs, ...hero.focusItems.flatMap((item) => item.content)].join(' ');
  const pairText = [...pair.paragraphs, ...pair.focusItems.flatMap((item) => item.content)].join(' ');
  const score = similarityScore(heroText, pairText);

  if (score >= 0.72 || normalizeText(heroText) === normalizeText(pairText)) {
    return [{
      code: 'hero_pair_overlap',
      severity: 'warning',
      message: 'Hero and pair sections materially restate the same composed claim.',
      sections: ['hero', 'pair'],
    }];
  }

  return [];
}

function collectWeakerSignalPropagationGaps(
  input: ResultComposerPreviewInput,
): readonly ComposerDiagnostic[] {
  const weakerSignals = [
    ...new Set(
      input.sections.drivers
        .filter(
          (row) => row.driver_role === 'range_limitation' && row.materiality === 'material_underplay',
        )
        .map((row) => row.signal_key),
    ),
  ];

  return weakerSignals.flatMap((signalKey) => {
    const touchesLimitation =
      input.sections.limitation.weaker_signal_key === signalKey
      && input.sections.limitation.weaker_signal_link.trim().length > 0;
    const touchesApplication = input.sections.application.some(
      (row) =>
        row.signal_key === signalKey
        && (
          row.guidance_type === 'watchout'
          || row.guidance_type === 'development_focus'
          || row.guidance_type === 'range_recovery_action'
        ),
    );

    if (touchesLimitation && touchesApplication) {
      return [];
    }

    return [{
      code: 'weaker_signal_propagation_gap',
      severity: 'blocking',
      message:
        `Material range limitation "${signalKey}" does not clearly propagate through limitation and application.`,
      sections: ['drivers', 'limitation', 'application'],
    }];
  });
}

function collectApplicationGroundingIssues(
  input: ResultComposerPreviewInput,
): readonly ComposerDiagnostic[] {
  if (input.sections.application.length === 0) {
    return [{
      code: 'application_grounding_gap',
      severity: 'blocking',
      message: 'Application is missing entirely, so grounding cannot be checked.',
      sections: ['application'],
    }];
  }

  const groundedRows = input.sections.application.filter((row) => {
    const owner = getClaimOwnerSection(row.linked_claim_type);
    return owner !== null && owner !== 'application';
  });

  if (groundedRows.length > 0) {
    return [];
  }

  return [{
    code: 'application_grounding_gap',
    severity: 'warning',
    message: 'Application guidance is not linked back to earlier section claims.',
    sections: ['application'],
  }];
}

function collectSectionRoleCollisions(report: ComposedSingleDomainReport): readonly ComposerDiagnostic[] {
  const sectionText = buildSectionTextMap(report);
  const diagnostics: ComposerDiagnostic[] = [];

  const applicationText = normalizeText(sectionText.application ?? '');
  if (applicationText.includes('what this domain measures') || applicationText.includes('how the top two tendencies combine')) {
    diagnostics.push({
      code: 'section_role_collision',
      severity: 'warning',
      message: 'Application appears to re-author domain or pair framing instead of staying action-focused.',
      sections: ['application'],
    });
  }

  const introText = normalizeText(sectionText.intro ?? '');
  if (introText.includes('rely on') || introText.includes('what to rely on')) {
    diagnostics.push({
      code: 'section_role_collision',
      severity: 'warning',
      message: 'Intro text drifts into application guidance ownership.',
      sections: ['intro', 'application'],
    });
  }

  const driversText = normalizeText(sectionText.drivers ?? '');
  if (driversText.includes('how the top two tendencies combine')) {
    diagnostics.push({
      code: 'section_role_collision',
      severity: 'warning',
      message: 'Drivers text reads like pair synthesis rather than signal-level causation.',
      sections: ['drivers', 'pair'],
    });
  }

  return diagnostics;
}

export function buildSingleDomainComposerDiagnostics(
  inputOrReport: ResultComposerPreviewInput | ComposedSingleDomainReport,
): ComposerDiagnostics {
  const report = 'sections' in inputOrReport && 'previewValidation' in inputOrReport
    ? inputOrReport
    : composeSingleDomainReport(inputOrReport);
  const input = 'sections' in inputOrReport && 'previewValidation' in inputOrReport
    ? null
    : inputOrReport;

  const issues: ComposerDiagnostic[] = [
    ...collectMissingSectionContent(report),
    ...collectHeroPairOverlap(report),
    ...collectRepeatedPhrases(report),
    ...(input ? collectWeakerSignalPropagationGaps(input) : []),
    ...(input ? collectApplicationGroundingIssues(input) : []),
    ...collectSectionRoleCollisions(report),
  ];

  return {
    hasBlockingIssues: issues.some((issue) => issue.severity === 'blocking'),
    issues,
  };
}
