import type { Queryable } from '@/lib/engine/repository-sql';
import {
  APPLICATION_PLAN_WARNING_THRESHOLD,
  summarizeApplicationPlanCoverage,
} from '@/lib/server/application-plan-governance';
import { getAssessmentVersionApplicationLanguage } from '@/lib/server/assessment-version-application-language';

export type AdminAssessmentValidationStatus = 'ready' | 'not_ready' | 'no_draft' | 'missing_assessment';
export type AdminAssessmentValidationSectionKey =
  | 'assessmentVersionContext'
  | 'domainsSignals'
  | 'questionsOptions'
  | 'weights'
  | 'applicationPlan'
  | 'overallSummary';
export type AdminAssessmentValidationSeverity = 'blocking' | 'warning';

export type AdminAssessmentValidationIssue = {
  code: string;
  message: string;
  severity: AdminAssessmentValidationSeverity;
};

export type AdminAssessmentValidationSection = {
  key: AdminAssessmentValidationSectionKey;
  label: string;
  status: 'pass' | 'fail';
  issues: readonly AdminAssessmentValidationIssue[];
};

export type AdminAssessmentValidationCounts = {
  domainCount: number;
  signalCount: number;
  questionCount: number;
  optionCount: number;
  weightedOptionCount: number;
  unmappedOptionCount: number;
  weightMappingCount: number;
  applicationThesisCount: number;
  applicationContributionCount: number;
  applicationRiskCount: number;
  applicationDevelopmentCount: number;
  applicationActionPromptsCount: number;
};

export type AdminAssessmentValidationResult = {
  status: AdminAssessmentValidationStatus;
  isPublishReady: boolean;
  assessmentId: string | null;
  assessmentKey: string;
  draftVersionId: string | null;
  draftVersionTag: string | null;
  sections: readonly AdminAssessmentValidationSection[];
  blockingErrors: readonly AdminAssessmentValidationIssue[];
  warnings: readonly AdminAssessmentValidationIssue[];
  counts: AdminAssessmentValidationCounts;
};

type ValidationContextRow = {
  assessment_id: string;
  assessment_key: string;
  draft_version_id: string | null;
  draft_version_tag: string | null;
};

type DomainsSignalsMetricsRow = {
  domain_count: string;
  signal_count: string;
  orphan_signal_count: string;
  cross_version_signal_count: string;
};

type QuestionsOptionsMetricsRow = {
  question_count: string;
  option_count: string;
  questions_without_options_count: string;
  orphan_question_count: string;
  cross_version_question_count: string;
  orphan_option_count: string;
  cross_version_option_count: string;
};

type WeightMetricsRow = {
  weighted_option_count: string;
  unmapped_option_count: string;
  weight_mapping_count: string;
  orphan_weight_option_count: string;
  orphan_weight_signal_count: string;
  cross_version_weight_option_count: string;
  cross_version_weight_signal_count: string;
};

function toCount(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createIssue(code: string, message: string, severity: AdminAssessmentValidationSeverity = 'blocking'): AdminAssessmentValidationIssue {
  return { code, message, severity };
}

function createSection(
  key: AdminAssessmentValidationSectionKey,
  label: string,
  issues: readonly AdminAssessmentValidationIssue[],
): AdminAssessmentValidationSection {
  return {
    key,
    label,
    status: issues.some((issue) => issue.severity === 'blocking') ? 'fail' : 'pass',
    issues: Object.freeze([...issues]),
  };
}

function emptyCounts(): AdminAssessmentValidationCounts {
  return {
    domainCount: 0,
    signalCount: 0,
    questionCount: 0,
    optionCount: 0,
    weightedOptionCount: 0,
    unmappedOptionCount: 0,
    weightMappingCount: 0,
    applicationThesisCount: 0,
    applicationContributionCount: 0,
    applicationRiskCount: 0,
    applicationDevelopmentCount: 0,
    applicationActionPromptsCount: 0,
  };
}

function buildValidationResult(params: {
  status: AdminAssessmentValidationStatus;
  assessmentKey: string;
  assessmentId: string | null;
  draftVersionId: string | null;
  draftVersionTag: string | null;
  sections: readonly AdminAssessmentValidationSection[];
  counts?: AdminAssessmentValidationCounts;
}): AdminAssessmentValidationResult {
  const blockingErrors = params.sections.flatMap((section) =>
    section.issues.filter((issue) => issue.severity === 'blocking'),
  );
  const warnings = params.sections.flatMap((section) =>
    section.issues.filter((issue) => issue.severity === 'warning'),
  );

  return {
    status: params.status,
    isPublishReady: params.status === 'ready' && blockingErrors.length === 0,
    assessmentId: params.assessmentId,
    assessmentKey: params.assessmentKey,
    draftVersionId: params.draftVersionId,
    draftVersionTag: params.draftVersionTag,
    sections: Object.freeze([...params.sections]),
    blockingErrors: Object.freeze(blockingErrors),
    warnings: Object.freeze(warnings),
    counts: params.counts ?? emptyCounts(),
  };
}

async function loadValidationContext(
  db: Queryable,
  assessmentKey: string,
): Promise<ValidationContextRow | null> {
  const result = await db.query<ValidationContextRow>(
    `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      dv.id AS draft_version_id,
      dv.version AS draft_version_tag
    FROM assessments a
    LEFT JOIN LATERAL (
      SELECT
        av.id,
        av.version
      FROM assessment_versions av
      WHERE av.assessment_id = a.id
        AND av.lifecycle_status = 'DRAFT'
      ORDER BY av.updated_at DESC, av.created_at DESC, av.version DESC
      LIMIT 1
    ) dv ON TRUE
    WHERE a.assessment_key = $1
    `,
    [assessmentKey],
  );

  return result.rows[0] ?? null;
}

async function loadDomainsSignalsMetrics(
  db: Queryable,
  draftVersionId: string,
): Promise<DomainsSignalsMetricsRow> {
  const result = await db.query<DomainsSignalsMetricsRow>(
    `
    SELECT
      (SELECT COUNT(*)::text FROM domains WHERE assessment_version_id = $1) AS domain_count,
      (SELECT COUNT(*)::text FROM signals WHERE assessment_version_id = $1) AS signal_count,
      (
        SELECT COUNT(*)::text
        FROM signals s
        LEFT JOIN domains d ON d.id = s.domain_id
        WHERE s.assessment_version_id = $1
          AND (d.id IS NULL OR d.assessment_version_id <> s.assessment_version_id)
      ) AS orphan_signal_count,
      (
        SELECT COUNT(*)::text
        FROM signals s
        INNER JOIN domains d ON d.id = s.domain_id
        WHERE s.assessment_version_id = $1
          AND d.assessment_version_id <> $1
      ) AS cross_version_signal_count
    `,
    [draftVersionId],
  );

  return result.rows[0] ?? {
    domain_count: '0',
    signal_count: '0',
    orphan_signal_count: '0',
    cross_version_signal_count: '0',
  };
}

async function loadQuestionsOptionsMetrics(
  db: Queryable,
  draftVersionId: string,
): Promise<QuestionsOptionsMetricsRow> {
  const result = await db.query<QuestionsOptionsMetricsRow>(
    `
    SELECT
      (SELECT COUNT(*)::text FROM questions WHERE assessment_version_id = $1) AS question_count,
      (
        SELECT COUNT(o.id)::text
        FROM options o
        INNER JOIN questions q ON q.id = o.question_id
        WHERE q.assessment_version_id = $1
      ) AS option_count,
      (
        SELECT COUNT(*)::text
        FROM (
          SELECT q.id
          FROM questions q
          LEFT JOIN options o ON o.question_id = q.id
          WHERE q.assessment_version_id = $1
          GROUP BY q.id
          HAVING COUNT(o.id) = 0
        ) question_gaps
      ) AS questions_without_options_count,
      (
        SELECT COUNT(*)::text
        FROM questions q
        LEFT JOIN domains d ON d.id = q.domain_id
        WHERE q.assessment_version_id = $1
          AND (d.id IS NULL OR d.assessment_version_id <> q.assessment_version_id)
      ) AS orphan_question_count,
      (
        SELECT COUNT(*)::text
        FROM questions q
        INNER JOIN domains d ON d.id = q.domain_id
        WHERE q.assessment_version_id = $1
          AND d.assessment_version_id <> $1
      ) AS cross_version_question_count,
      (
        SELECT COUNT(*)::text
        FROM options o
        LEFT JOIN questions q ON q.id = o.question_id
        WHERE q.id IS NULL
      ) AS orphan_option_count,
      (
        SELECT COUNT(*)::text
        FROM options o
        INNER JOIN questions q ON q.id = o.question_id
        WHERE q.assessment_version_id <> $1
          AND EXISTS (
            SELECT 1
            FROM option_signal_weights osw
            INNER JOIN signals s ON s.id = osw.signal_id
            WHERE osw.option_id = o.id
              AND s.assessment_version_id = $1
          )
      ) AS cross_version_option_count
    `,
    [draftVersionId],
  );

  return result.rows[0] ?? {
    question_count: '0',
    option_count: '0',
    questions_without_options_count: '0',
    orphan_question_count: '0',
    cross_version_question_count: '0',
    orphan_option_count: '0',
    cross_version_option_count: '0',
  };
}

async function loadWeightMetrics(
  db: Queryable,
  draftVersionId: string,
): Promise<WeightMetricsRow> {
  const result = await db.query<WeightMetricsRow>(
    `
    SELECT
      (
        SELECT COUNT(*)::text
        FROM (
          SELECT o.id
          FROM options o
          INNER JOIN questions q ON q.id = o.question_id
          INNER JOIN option_signal_weights osw ON osw.option_id = o.id
          WHERE q.assessment_version_id = $1
          GROUP BY o.id
        ) weighted_options
      ) AS weighted_option_count,
      (
        SELECT COUNT(*)::text
        FROM (
          SELECT o.id
          FROM options o
          INNER JOIN questions q ON q.id = o.question_id
          LEFT JOIN option_signal_weights osw ON osw.option_id = o.id
          WHERE q.assessment_version_id = $1
          GROUP BY o.id
          HAVING COUNT(osw.id) = 0
        ) unmapped_options
      ) AS unmapped_option_count,
      (
        SELECT COUNT(*)::text
        FROM option_signal_weights osw
        INNER JOIN options o ON o.id = osw.option_id
        INNER JOIN questions q ON q.id = o.question_id
        WHERE q.assessment_version_id = $1
      ) AS weight_mapping_count,
      (
        SELECT COUNT(*)::text
        FROM option_signal_weights osw
        LEFT JOIN options o ON o.id = osw.option_id
        WHERE o.id IS NULL
      ) AS orphan_weight_option_count,
      (
        SELECT COUNT(*)::text
        FROM option_signal_weights osw
        LEFT JOIN signals s ON s.id = osw.signal_id
        WHERE s.id IS NULL
      ) AS orphan_weight_signal_count,
      (
        SELECT COUNT(*)::text
        FROM option_signal_weights osw
        INNER JOIN options o ON o.id = osw.option_id
        INNER JOIN questions q ON q.id = o.question_id
        WHERE q.assessment_version_id <> $1
          AND EXISTS (
            SELECT 1
            FROM signals s
            WHERE s.id = osw.signal_id
              AND s.assessment_version_id = $1
          )
      ) AS cross_version_weight_option_count,
      (
        SELECT COUNT(*)::text
        FROM option_signal_weights osw
        INNER JOIN options o ON o.id = osw.option_id
        INNER JOIN questions q ON q.id = o.question_id
        INNER JOIN signals s ON s.id = osw.signal_id
        WHERE q.assessment_version_id = $1
          AND s.assessment_version_id <> $1
      ) AS cross_version_weight_signal_count
    `,
    [draftVersionId],
  );

  return result.rows[0] ?? {
    weighted_option_count: '0',
    unmapped_option_count: '0',
    weight_mapping_count: '0',
    orphan_weight_option_count: '0',
    orphan_weight_signal_count: '0',
    cross_version_weight_option_count: '0',
    cross_version_weight_signal_count: '0',
  };
}

export async function validateLatestDraftAssessmentVersion(
  db: Queryable,
  assessmentKey: string,
): Promise<AdminAssessmentValidationResult> {
  const context = await loadValidationContext(db, assessmentKey);

  if (!context) {
    return buildValidationResult({
      status: 'missing_assessment',
      assessmentKey,
      assessmentId: null,
      draftVersionId: null,
      draftVersionTag: null,
      sections: [
        createSection('assessmentVersionContext', 'Assessment / version context', [
          createIssue('assessment_not_found', 'Assessment does not exist, so draft readiness cannot be evaluated.'),
        ]),
        createSection('domainsSignals', 'Domains / signals', []),
        createSection('questionsOptions', 'Questions / options', []),
        createSection('weights', 'Weights', []),
        createSection('applicationPlan', 'Application Plan', []),
        createSection('overallSummary', 'Overall summary', [
          createIssue('validation_unavailable', 'No canonical assessment record is available for validation.'),
        ]),
      ],
    });
  }

  if (!context.draft_version_id || !context.draft_version_tag) {
    return buildValidationResult({
      status: 'no_draft',
      assessmentKey,
      assessmentId: context.assessment_id,
      draftVersionId: null,
      draftVersionTag: null,
      sections: [
        createSection('assessmentVersionContext', 'Assessment / version context', [
          createIssue('draft_version_missing', 'No editable draft version exists for this assessment.'),
        ]),
        createSection('domainsSignals', 'Domains / signals', []),
        createSection('questionsOptions', 'Questions / options', []),
        createSection('weights', 'Weights', []),
        createSection('applicationPlan', 'Application Plan', []),
        createSection('overallSummary', 'Overall summary', [
          createIssue('publish_readiness_unavailable', 'Publish readiness cannot be computed until an editable draft exists.'),
        ]),
      ],
    });
  }

  const [domainsSignals, questionsOptions, weights, applicationLanguage] = await Promise.all([
    loadDomainsSignalsMetrics(db, context.draft_version_id),
    loadQuestionsOptionsMetrics(db, context.draft_version_id),
    loadWeightMetrics(db, context.draft_version_id),
    getAssessmentVersionApplicationLanguage(db, context.draft_version_id),
  ]);
  const applicationCoverage = summarizeApplicationPlanCoverage(applicationLanguage);

  const counts: AdminAssessmentValidationCounts = {
    domainCount: toCount(domainsSignals.domain_count),
    signalCount: toCount(domainsSignals.signal_count),
    questionCount: toCount(questionsOptions.question_count),
    optionCount: toCount(questionsOptions.option_count),
    weightedOptionCount: toCount(weights.weighted_option_count),
    unmappedOptionCount: toCount(weights.unmapped_option_count),
    weightMappingCount: toCount(weights.weight_mapping_count),
    applicationThesisCount: applicationCoverage.thesisCount,
    applicationContributionCount: applicationCoverage.contributionCount,
    applicationRiskCount: applicationCoverage.riskCount,
    applicationDevelopmentCount: applicationCoverage.developmentCount,
    applicationActionPromptsCount: applicationCoverage.actionPromptsCount,
  };

  const domainsSignalsIssues: AdminAssessmentValidationIssue[] = [];
  const questionsOptionsIssues: AdminAssessmentValidationIssue[] = [];
  const weightIssues: AdminAssessmentValidationIssue[] = [];
  const applicationPlanIssues: AdminAssessmentValidationIssue[] = [];

  if (counts.domainCount === 0) {
    domainsSignalsIssues.push(createIssue('missing_domains', 'At least one domain must exist on the current draft version.'));
  }

  if (counts.signalCount === 0) {
    domainsSignalsIssues.push(createIssue('missing_signals', 'At least one signal must exist on the current draft version.'));
  }

  const orphanSignalCount = toCount(domainsSignals.orphan_signal_count);
  if (orphanSignalCount > 0) {
    domainsSignalsIssues.push(
      createIssue(
        'orphan_signals',
        `${orphanSignalCount} signal record${orphanSignalCount === 1 ? '' : 's'} do not resolve to a valid domain on the same draft version.`,
      ),
    );
  }

  const crossVersionSignalCount = toCount(domainsSignals.cross_version_signal_count);
  if (crossVersionSignalCount > 0) {
    domainsSignalsIssues.push(
      createIssue(
        'cross_version_signals',
        `${crossVersionSignalCount} signal record${crossVersionSignalCount === 1 ? '' : 's'} reference a domain outside the current draft version.`,
      ),
    );
  }

  if (counts.questionCount === 0) {
    questionsOptionsIssues.push(createIssue('missing_questions', 'At least one question must exist on the current draft version.'));
  }

  const questionsWithoutOptionsCount = toCount(questionsOptions.questions_without_options_count);
  if (questionsWithoutOptionsCount > 0) {
    questionsOptionsIssues.push(
      createIssue(
        'questions_without_options',
        `${questionsWithoutOptionsCount} question${questionsWithoutOptionsCount === 1 ? '' : 's'} have no authored options.`,
      ),
    );
  }

  const orphanQuestionCount = toCount(questionsOptions.orphan_question_count);
  if (orphanQuestionCount > 0) {
    questionsOptionsIssues.push(
      createIssue(
        'orphan_questions',
        `${orphanQuestionCount} question record${orphanQuestionCount === 1 ? '' : 's'} do not resolve to a valid domain on the same draft version.`,
      ),
    );
  }

  const crossVersionQuestionCount = toCount(questionsOptions.cross_version_question_count);
  if (crossVersionQuestionCount > 0) {
    questionsOptionsIssues.push(
      createIssue(
        'cross_version_questions',
        `${crossVersionQuestionCount} question record${crossVersionQuestionCount === 1 ? '' : 's'} reference a domain outside the current draft version.`,
      ),
    );
  }

  const orphanOptionCount = toCount(questionsOptions.orphan_option_count);
  if (orphanOptionCount > 0) {
    questionsOptionsIssues.push(
      createIssue(
        'orphan_options',
        `${orphanOptionCount} option record${orphanOptionCount === 1 ? '' : 's'} do not resolve to a valid parent question.`,
      ),
    );
  }

  const crossVersionOptionCount = toCount(questionsOptions.cross_version_option_count);
  if (crossVersionOptionCount > 0) {
    questionsOptionsIssues.push(
      createIssue(
        'cross_version_options',
        `${crossVersionOptionCount} option record${crossVersionOptionCount === 1 ? '' : 's'} are linked to weight mappings that target the current draft from another version.`,
      ),
    );
  }

  if (counts.optionCount === 0 && counts.questionCount > 0) {
    questionsOptionsIssues.push(createIssue('missing_options', 'Draft questions exist, but no options have been authored yet.'));
  }

  if (counts.unmappedOptionCount > 0) {
    weightIssues.push(
      createIssue(
        'options_without_weights',
        `${counts.unmappedOptionCount} option${counts.unmappedOptionCount === 1 ? '' : 's'} have no option to signal weight mappings.`,
      ),
    );
  }

  const orphanWeightOptionCount = toCount(weights.orphan_weight_option_count);
  if (orphanWeightOptionCount > 0) {
    weightIssues.push(
      createIssue(
        'orphan_weight_options',
        `${orphanWeightOptionCount} weight mapping${orphanWeightOptionCount === 1 ? '' : 's'} reference an option that no longer exists.`,
      ),
    );
  }

  const orphanWeightSignalCount = toCount(weights.orphan_weight_signal_count);
  if (orphanWeightSignalCount > 0) {
    weightIssues.push(
      createIssue(
        'orphan_weight_signals',
        `${orphanWeightSignalCount} weight mapping${orphanWeightSignalCount === 1 ? '' : 's'} reference a signal that no longer exists.`,
      ),
    );
  }

  const crossVersionWeightOptionCount = toCount(weights.cross_version_weight_option_count);
  if (crossVersionWeightOptionCount > 0) {
    weightIssues.push(
      createIssue(
        'cross_version_weight_options',
        `${crossVersionWeightOptionCount} weight mapping${crossVersionWeightOptionCount === 1 ? '' : 's'} join a signal in this draft to an option from another version.`,
      ),
    );
  }

  const crossVersionWeightSignalCount = toCount(weights.cross_version_weight_signal_count);
  if (crossVersionWeightSignalCount > 0) {
    weightIssues.push(
      createIssue(
        'cross_version_weight_signals',
        `${crossVersionWeightSignalCount} weight mapping${crossVersionWeightSignalCount === 1 ? '' : 's'} point to a signal outside the current draft version.`,
      ),
    );
  }

  if (counts.weightMappingCount === 0 && counts.optionCount > 0) {
    weightIssues.push(createIssue('missing_weight_mappings', 'Draft options exist, but no option to signal weight mappings have been authored yet.'));
  }

  if (applicationCoverage.missingThesisHeroPatterns.length > 0) {
    applicationPlanIssues.push(
      createIssue(
        'application_thesis_incomplete',
        `Application Thesis is incomplete. Missing hero pattern rows: ${applicationCoverage.missingThesisHeroPatterns.join(', ')}.`,
      ),
    );
  }

  if (applicationCoverage.missingActionPromptHeroPatterns.length > 0) {
    applicationPlanIssues.push(
      createIssue(
        'application_action_prompts_incomplete',
        `Application Action Prompts are incomplete. Missing hero pattern rows: ${applicationCoverage.missingActionPromptHeroPatterns.join(', ')}.`,
      ),
    );
  }

  if (applicationCoverage.contributionCount < APPLICATION_PLAN_WARNING_THRESHOLD) {
    applicationPlanIssues.push(
      createIssue(
        'application_contribution_low_coverage',
        `Application Contribution coverage is low (${applicationCoverage.contributionCount} rows).`,
        'warning',
      ),
    );
  }

  if (applicationCoverage.riskCount < APPLICATION_PLAN_WARNING_THRESHOLD) {
    applicationPlanIssues.push(
      createIssue(
        'application_risk_low_coverage',
        `Application Risk coverage is low (${applicationCoverage.riskCount} rows).`,
        'warning',
      ),
    );
  }

  if (applicationCoverage.developmentCount < APPLICATION_PLAN_WARNING_THRESHOLD) {
    applicationPlanIssues.push(
      createIssue(
        'application_development_low_coverage',
        `Application Development coverage is low (${applicationCoverage.developmentCount} rows).`,
        'warning',
      ),
    );
  }

  const blockingIssueCount =
    domainsSignalsIssues.length
    + questionsOptionsIssues.length
    + weightIssues.length
    + applicationPlanIssues.filter((issue) => issue.severity === 'blocking').length;
  const sections = [
    createSection('assessmentVersionContext', 'Assessment / version context', []),
    createSection('domainsSignals', 'Domains / signals', domainsSignalsIssues),
    createSection('questionsOptions', 'Questions / options', questionsOptionsIssues),
    createSection('weights', 'Weights', weightIssues),
    createSection('applicationPlan', 'Application Plan', applicationPlanIssues),
    createSection(
      'overallSummary',
      'Overall summary',
      blockingIssueCount === 0
        ? []
        : [createIssue('draft_not_publish_ready', 'The current draft is not publish-ready until all blocking structural issues are resolved.')],
    ),
  ];

  return buildValidationResult({
    status: blockingIssueCount === 0 ? 'ready' : 'not_ready',
    assessmentKey,
    assessmentId: context.assessment_id,
    draftVersionId: context.draft_version_id,
    draftVersionTag: context.draft_version_tag,
    sections,
    counts,
  });
}
