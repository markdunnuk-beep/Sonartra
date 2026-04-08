import type { Queryable } from '@/lib/engine/repository-sql';
import type { AssessmentVersionId } from '@/lib/engine/types';
import type {
  AssessmentVersionApplicationActionPromptsRow,
  AssessmentVersionApplicationContributionRow,
  AssessmentVersionApplicationDevelopmentRow,
  AssessmentVersionApplicationLanguageBundle,
  AssessmentVersionApplicationRiskRow,
  AssessmentVersionApplicationThesisRow,
} from '@/lib/server/assessment-version-application-language-types';

function emptyApplicationLanguageBundle(): AssessmentVersionApplicationLanguageBundle {
  return Object.freeze({
    thesis: Object.freeze([]),
    contribution: Object.freeze([]),
    risk: Object.freeze([]),
    development: Object.freeze([]),
    prompts: Object.freeze([]),
  });
}

function isMissingRelationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('does not exist');
}

type ApplicationThesisDbRow = {
  id: string;
  assessment_version_id: string;
  hero_pattern_key: string;
  headline: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

type ApplicationContributionDbRow = {
  id: string;
  assessment_version_id: string;
  source_type: 'pair' | 'signal';
  source_key: string;
  label: string;
  narrative: string;
  best_when: string;
  watch_for: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationRiskDbRow = {
  id: string;
  assessment_version_id: string;
  source_type: 'pair' | 'signal';
  source_key: string;
  label: string;
  narrative: string;
  impact: string;
  early_warning: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationDevelopmentDbRow = {
  id: string;
  assessment_version_id: string;
  source_type: 'pair' | 'signal';
  source_key: string;
  label: string;
  narrative: string;
  practice: string;
  success_marker: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationActionPromptsDbRow = {
  id: string;
  assessment_version_id: string;
  source_type: 'hero_pattern';
  source_key: string;
  keep_doing: string;
  watch_for: string;
  practice_next: string;
  ask_others: string;
  created_at: string;
  updated_at: string;
};

function mapThesisRow(row: ApplicationThesisDbRow): AssessmentVersionApplicationThesisRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    heroPatternKey: row.hero_pattern_key,
    headline: row.headline,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContributionRow(row: ApplicationContributionDbRow): AssessmentVersionApplicationContributionRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    label: row.label,
    narrative: row.narrative,
    bestWhen: row.best_when,
    watchFor: row.watch_for,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRiskRow(row: ApplicationRiskDbRow): AssessmentVersionApplicationRiskRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    label: row.label,
    narrative: row.narrative,
    impact: row.impact,
    earlyWarning: row.early_warning,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDevelopmentRow(row: ApplicationDevelopmentDbRow): AssessmentVersionApplicationDevelopmentRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    label: row.label,
    narrative: row.narrative,
    practice: row.practice,
    successMarker: row.success_marker,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActionPromptsRow(row: ApplicationActionPromptsDbRow): AssessmentVersionApplicationActionPromptsRow {
  return {
    id: row.id,
    assessmentVersionId: row.assessment_version_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    keepDoing: row.keep_doing,
    watchFor: row.watch_for,
    practiceNext: row.practice_next,
    askOthers: row.ask_others,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAssessmentVersionApplicationLanguage(
  db: Queryable,
  assessmentVersionId: AssessmentVersionId,
): Promise<AssessmentVersionApplicationLanguageBundle> {
  try {
    const [thesis, contribution, risk, development, prompts] = await Promise.all([
      db.query<ApplicationThesisDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          hero_pattern_key,
          headline,
          summary,
          created_at,
          updated_at
        FROM assessment_version_application_thesis
        WHERE assessment_version_id = $1
        ORDER BY hero_pattern_key ASC, id ASC
        `,
        [assessmentVersionId],
      ),
      db.query<ApplicationContributionDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          source_type,
          source_key,
          label,
          narrative,
          best_when,
          watch_for,
          created_at,
          updated_at
        FROM assessment_version_application_contribution
        WHERE assessment_version_id = $1
        ORDER BY source_type ASC, source_key ASC, id ASC
        `,
        [assessmentVersionId],
      ),
      db.query<ApplicationRiskDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          source_type,
          source_key,
          label,
          narrative,
          impact,
          early_warning,
          created_at,
          updated_at
        FROM assessment_version_application_risk
        WHERE assessment_version_id = $1
        ORDER BY source_type ASC, source_key ASC, id ASC
        `,
        [assessmentVersionId],
      ),
      db.query<ApplicationDevelopmentDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          source_type,
          source_key,
          label,
          narrative,
          practice,
          success_marker,
          created_at,
          updated_at
        FROM assessment_version_application_development
        WHERE assessment_version_id = $1
        ORDER BY source_type ASC, source_key ASC, id ASC
        `,
        [assessmentVersionId],
      ),
      db.query<ApplicationActionPromptsDbRow>(
        `
        SELECT
          id,
          assessment_version_id,
          source_type,
          source_key,
          keep_doing,
          watch_for,
          practice_next,
          ask_others,
          created_at,
          updated_at
        FROM assessment_version_application_action_prompts
        WHERE assessment_version_id = $1
        ORDER BY source_type ASC, source_key ASC, id ASC
        `,
        [assessmentVersionId],
      ),
    ]);

    return Object.freeze({
      thesis: Object.freeze(thesis.rows.map(mapThesisRow)),
      contribution: Object.freeze(contribution.rows.map(mapContributionRow)),
      risk: Object.freeze(risk.rows.map(mapRiskRow)),
      development: Object.freeze(development.rows.map(mapDevelopmentRow)),
      prompts: Object.freeze(prompts.rows.map(mapActionPromptsRow)),
    });
  } catch (error) {
    if (isMissingRelationError(error)) {
      return emptyApplicationLanguageBundle();
    }

    throw error;
  }
}
