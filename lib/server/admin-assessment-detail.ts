import { compareAssessmentVersionTagsDesc } from '@/lib/admin/admin-assessment-versioning';
import type { Queryable } from '@/lib/engine/repository-sql';
import { queryWithAssessmentModeFallback } from '@/lib/server/assessment-mode-db';
import type { AssessmentMode } from '@/lib/types/assessment';
import { getAssessmentModeLabel, isSingleDomain, resolveAssessmentMode } from '@/lib/utils/assessment-mode';
import {
  validateLatestDraftAssessmentVersion,
  type AdminAssessmentValidationResult,
} from '@/lib/server/admin-assessment-validation';
import {
  buildSingleDomainLanguageValidation,
  type SingleDomainLanguageValidation,
} from '@/lib/admin/single-domain-structural-validation';
import {
  isMissingAssessmentVersionIntroSchemaError,
} from '@/lib/server/assessment-version-intro-repository';
import { getAssessmentVersionLanguageBundle } from '@/lib/server/assessment-version-language';
import {
  getSingleDomainLanguageBundle,
} from '@/lib/server/assessment-version-single-domain-language';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';
import { getSingleDomainDraftReadiness } from '@/lib/server/single-domain-draft-readiness';
import type { SingleDomainDraftReadiness } from '@/lib/types/single-domain-runtime';

import type { AdminAssessmentVersionStatus } from '@/lib/server/admin-assessment-dashboard';

export type AdminAssessmentDetailSignal = {
  signalId: string;
  signalKey: string;
  label: string;
  description: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAssessmentDetailDomain = {
  domainId: string;
  domainKey: string;
  label: string;
  description: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  signals: readonly AdminAssessmentDetailSignal[];
};

export type AdminAssessmentDetailQuestionDomain = {
  domainId: string;
  domainKey: string;
  label: string;
  domainType: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  orderIndex: number;
};

export type AdminAssessmentDetailOption = {
  optionId: string;
  optionKey: string;
  optionLabel: string | null;
  optionText: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  weightingStatus: 'weighted' | 'unmapped';
  signalWeights: readonly AdminAssessmentDetailSignalWeight[];
};

export type AdminAssessmentDetailQuestion = {
  questionId: string;
  questionKey: string;
  prompt: string;
  orderIndex: number;
  domainId: string;
  domainKey: string;
  domainLabel: string;
  domainType: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  createdAt: string;
  updatedAt: string;
  options: readonly AdminAssessmentDetailOption[];
};

export type AdminAssessmentDetailSignalWeight = {
  optionSignalWeightId: string;
  signalId: string;
  signalKey: string;
  signalLabel: string;
  signalDomainId: string;
  signalDomainKey: string;
  signalDomainLabel: string;
  weight: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminAssessmentDetailAvailableSignal = {
  signalId: string;
  signalKey: string;
  signalLabel: string;
  signalDescription: string | null;
  signalOrderIndex: number;
  domainId: string;
  domainKey: string;
  domainLabel: string;
  domainOrderIndex: number;
};

export type AdminAssessmentDetailWeightingSummary = {
  totalOptions: number;
  weightedOptions: number;
  unmappedOptions: number;
  totalMappings: number;
};

export type AdminAssessmentDetailVersion = {
  assessmentVersionId: string;
  versionTag: string;
  status: AdminAssessmentVersionStatus;
  publishedAt: string | null;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAssessmentDetailStepCompletionStatus = 'complete' | 'incomplete' | 'neutral';

export type AdminAssessmentDetailStepCompletion = {
  assessmentIntro: AdminAssessmentDetailStepCompletionStatus;
  language: AdminAssessmentDetailStepCompletionStatus;
};

export type AdminAssessmentBuilderMode = 'draft' | 'published_no_draft' | 'setup';

export type AdminAssessmentDetailViewModel = {
  assessmentId: string;
  assessmentKey: string;
  mode: AssessmentMode;
  modeLabel: 'Multi-Domain' | 'Single-Domain';
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  versions: readonly AdminAssessmentDetailVersion[];
  publishedVersion: AdminAssessmentDetailVersion | null;
  latestDraftVersion: AdminAssessmentDetailVersion | null;
  builderMode: AdminAssessmentBuilderMode;
  authoredDomains: readonly AdminAssessmentDetailDomain[];
  questionDomains: readonly AdminAssessmentDetailQuestionDomain[];
  authoredQuestions: readonly AdminAssessmentDetailQuestion[];
  availableSignals: readonly AdminAssessmentDetailAvailableSignal[];
  weightingSummary: AdminAssessmentDetailWeightingSummary;
  draftValidation: AdminAssessmentValidationResult;
  singleDomainDraftReadiness: SingleDomainDraftReadiness | null;
  stepCompletion: AdminAssessmentDetailStepCompletion;
  singleDomainLanguageBundle: SingleDomainLanguageBundle;
  singleDomainLanguageValidation: SingleDomainLanguageValidation;
};

type AdminAssessmentDetailRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_mode: string | null;
  assessment_title: string;
  assessment_description: string | null;
  assessment_is_active: boolean;
  assessment_created_at: string;
  assessment_updated_at: string;
  assessment_version_id: string | null;
  version_tag: string | null;
  version_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | null;
  published_at: string | null;
  version_created_at: string | null;
  version_updated_at: string | null;
  question_count: string;
};

type AdminAssessmentAuthoringDomainRow = {
  domain_id: string;
  domain_key: string;
  domain_label: string;
  domain_description: string | null;
  domain_order_index: number;
  domain_created_at: string;
  domain_updated_at: string;
};

type AdminAssessmentQuestionDomainRow = {
  domain_id: string;
  domain_key: string;
  domain_label: string;
  domain_type: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  domain_order_index: number;
};

type AdminAssessmentAuthoringSignalRow = {
  signal_id: string;
  domain_id: string;
  signal_key: string;
  signal_label: string;
  signal_description: string | null;
  signal_order_index: number;
  signal_created_at: string;
  signal_updated_at: string;
};

type AdminAssessmentQuestionRow = {
  question_id: string;
  question_key: string;
  prompt: string;
  question_order_index: number;
  question_created_at: string;
  question_updated_at: string;
  domain_id: string;
  domain_key: string;
  domain_label: string;
  domain_type: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  option_id: string | null;
  option_key: string | null;
  option_label: string | null;
  option_text: string | null;
  option_order_index: number | null;
  option_created_at: string | null;
  option_updated_at: string | null;
};

type AdminAssessmentAvailableSignalRow = {
  signal_id: string;
  signal_key: string;
  signal_label: string;
  signal_description: string | null;
  signal_order_index: number;
  domain_id: string;
  domain_key: string;
  domain_label: string;
  domain_order_index: number;
};

type AdminAssessmentSignalWeightRow = {
  option_id: string;
  option_signal_weight_id: string;
  signal_id: string;
  signal_key: string;
  signal_label: string;
  signal_domain_id: string;
  signal_domain_key: string;
  signal_domain_label: string;
  weight: string;
  weight_created_at: string;
  weight_updated_at: string;
};

function normalizeVersionStatus(
  status: AdminAssessmentDetailRow['version_status'],
): AdminAssessmentVersionStatus | null {
  if (!status) {
    return null;
  }

  switch (status) {
    case 'DRAFT':
      return 'draft';
    case 'PUBLISHED':
      return 'published';
    case 'ARCHIVED':
      return 'archived';
  }
}

function toComparableString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toTimestamp(value: unknown): number {
  if (typeof value !== 'string') {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function compareStringsDesc(left: unknown, right: unknown): number {
  return toComparableString(right).localeCompare(toComparableString(left));
}

function compareTimestampsDesc(left: unknown, right: unknown): number {
  return toTimestamp(right) - toTimestamp(left);
}

function hasMeaningfulText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isMissingLanguageSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return code === '42P01' && typeof message === 'string' && message.includes('assessment_version_language_');
}

async function loadAssessmentIntroStepCompletion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<AdminAssessmentDetailStepCompletionStatus> {
  try {
    const result = await db.query<{
      intro_title: string;
      intro_summary: string;
      intro_how_it_works: string;
    }>(
      `
      SELECT
        intro_title,
        intro_summary,
        intro_how_it_works
      FROM assessment_version_intro
      WHERE assessment_version_id = $1
      `,
      [assessmentVersionId],
    );
    const intro = result.rows[0];

    return intro &&
      (hasMeaningfulText(intro.intro_title) ||
        hasMeaningfulText(intro.intro_summary) ||
        hasMeaningfulText(intro.intro_how_it_works))
      ? 'complete'
      : 'incomplete';
  } catch (error) {
    if (isMissingAssessmentVersionIntroSchemaError(error)) {
      return 'neutral';
    }

    throw error;
  }
}

async function loadLanguageStepCompletion(
  db: Queryable,
  assessmentVersionId: string,
  mode: AssessmentMode,
  authoredDomains: readonly AdminAssessmentDetailDomain[],
): Promise<AdminAssessmentDetailStepCompletionStatus> {
  if (isSingleDomain(mode)) {
    const bundle = await getSingleDomainLanguageBundle(db, assessmentVersionId);
    const validation = buildSingleDomainLanguageValidation({
      authoredDomains,
      languageBundle: bundle,
    });

    return validation.overallReady ? 'complete' : 'incomplete';
  }

  try {
    const bundle = await getAssessmentVersionLanguageBundle(db, assessmentVersionId);

    return Object.keys(bundle.heroHeaders ?? {}).length > 0 ||
      Object.keys(bundle.domains).length > 0 ||
      Object.keys(bundle.signals).length > 0 ||
      Object.keys(bundle.pairs).length > 0
      ? 'complete'
      : 'incomplete';
  } catch (error) {
    if (isMissingLanguageSchemaError(error)) {
      return 'neutral';
    }

    throw error;
  }
}

async function loadAuthoringDomainsForVersion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly AdminAssessmentDetailDomain[]> {
  const [domainsResult, signalsResult] = await Promise.all([
    db.query<AdminAssessmentAuthoringDomainRow>(
      `
      SELECT
        id AS domain_id,
        domain_key,
        label AS domain_label,
        description AS domain_description,
        order_index AS domain_order_index,
        created_at AS domain_created_at,
        updated_at AS domain_updated_at
      FROM domains
      WHERE assessment_version_id = $1
        AND domain_type = 'SIGNAL_GROUP'
      ORDER BY order_index ASC, id ASC
      `,
      [assessmentVersionId],
    ),
    db.query<AdminAssessmentAuthoringSignalRow>(
      `
      SELECT
        id AS signal_id,
        domain_id,
        signal_key,
        label AS signal_label,
        description AS signal_description,
        order_index AS signal_order_index,
        created_at AS signal_created_at,
        updated_at AS signal_updated_at
      FROM signals
      WHERE assessment_version_id = $1
      ORDER BY domain_id ASC, order_index ASC, id ASC
      `,
      [assessmentVersionId],
    ),
  ]);

  const signalsByDomainId = new Map<string, AdminAssessmentDetailSignal[]>();

  for (const row of signalsResult.rows) {
    const mappedSignal: AdminAssessmentDetailSignal = {
      signalId: row.signal_id,
      signalKey: row.signal_key,
      label: row.signal_label,
      description: row.signal_description,
      orderIndex: row.signal_order_index,
      createdAt: row.signal_created_at,
      updatedAt: row.signal_updated_at,
    };
    const existing = signalsByDomainId.get(row.domain_id);

    if (existing) {
      existing.push(mappedSignal);
      continue;
    }

    signalsByDomainId.set(row.domain_id, [mappedSignal]);
  }

  return Object.freeze(
    domainsResult.rows.map((row) => ({
      domainId: row.domain_id,
      domainKey: row.domain_key,
      label: row.domain_label,
      description: row.domain_description,
      orderIndex: row.domain_order_index,
      createdAt: row.domain_created_at,
      updatedAt: row.domain_updated_at,
      signals: Object.freeze(
        (signalsByDomainId.get(row.domain_id) ?? []).sort(
          (left, right) =>
            left.orderIndex - right.orderIndex || left.signalId.localeCompare(right.signalId),
        ),
      ),
    })),
  );
}

async function loadQuestionDomainsForVersion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly AdminAssessmentDetailQuestionDomain[]> {
  const result = await db.query<AdminAssessmentQuestionDomainRow>(
    `
    SELECT
      id AS domain_id,
      domain_key,
      label AS domain_label,
      domain_type,
      order_index AS domain_order_index
    FROM domains
    WHERE assessment_version_id = $1
    ORDER BY
      CASE WHEN domain_type = 'QUESTION_SECTION' THEN 0 ELSE 1 END ASC,
      order_index ASC,
      id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(
    result.rows.map((row) => ({
      domainId: row.domain_id,
      domainKey: row.domain_key,
      label: row.domain_label,
      domainType: row.domain_type,
      orderIndex: row.domain_order_index,
    })),
  );
}

async function loadQuestionsForVersion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly AdminAssessmentDetailQuestion[]> {
  const [result, weightsResult] = await Promise.all([
    db.query<AdminAssessmentQuestionRow>(
      `
      SELECT
        q.id AS question_id,
        q.question_key,
        q.prompt,
        q.order_index AS question_order_index,
        q.created_at AS question_created_at,
        q.updated_at AS question_updated_at,
        d.id AS domain_id,
        d.domain_key,
        d.label AS domain_label,
        d.domain_type,
        o.id AS option_id,
        o.option_key,
        o.option_label,
        o.option_text,
        o.order_index AS option_order_index,
        o.created_at AS option_created_at,
        o.updated_at AS option_updated_at
      FROM questions q
      INNER JOIN domains d ON d.id = q.domain_id
      LEFT JOIN options o ON o.question_id = q.id
      WHERE q.assessment_version_id = $1
      ORDER BY q.order_index ASC, q.id ASC, o.order_index ASC NULLS LAST, o.id ASC NULLS LAST
      `,
      [assessmentVersionId],
    ),
    db.query<AdminAssessmentSignalWeightRow>(
      `
      SELECT
        osw.option_id,
        osw.id AS option_signal_weight_id,
        s.id AS signal_id,
        s.signal_key,
        s.label AS signal_label,
        d.id AS signal_domain_id,
        d.domain_key AS signal_domain_key,
        d.label AS signal_domain_label,
        osw.weight::text AS weight,
        osw.created_at AS weight_created_at,
        osw.updated_at AS weight_updated_at
      FROM option_signal_weights osw
      INNER JOIN options o ON o.id = osw.option_id
      INNER JOIN questions q ON q.id = o.question_id
      INNER JOIN signals s ON s.id = osw.signal_id
      INNER JOIN domains d ON d.id = s.domain_id
      WHERE q.assessment_version_id = $1
        AND s.assessment_version_id = $1
      ORDER BY osw.option_id ASC, d.order_index ASC, s.order_index ASC, s.id ASC
      `,
      [assessmentVersionId],
    ),
  ]);

  const weightsByOptionId = new Map<string, AdminAssessmentDetailSignalWeight[]>();

  for (const row of weightsResult.rows) {
    const weight: AdminAssessmentDetailSignalWeight = {
      optionSignalWeightId: row.option_signal_weight_id,
      signalId: row.signal_id,
      signalKey: row.signal_key,
      signalLabel: row.signal_label,
      signalDomainId: row.signal_domain_id,
      signalDomainKey: row.signal_domain_key,
      signalDomainLabel: row.signal_domain_label,
      weight: row.weight,
      createdAt: row.weight_created_at,
      updatedAt: row.weight_updated_at,
    };
    const existing = weightsByOptionId.get(row.option_id);

    if (existing) {
      existing.push(weight);
      continue;
    }

    weightsByOptionId.set(row.option_id, [weight]);
  }

  const questions = new Map<string, {
    question: Omit<AdminAssessmentDetailQuestion, 'options'>;
    options: AdminAssessmentDetailOption[];
  }>();

  for (const row of result.rows) {
    const existing = questions.get(row.question_id);
    const questionEntry = existing ?? {
      question: {
        questionId: row.question_id,
        questionKey: row.question_key,
        prompt: row.prompt,
        orderIndex: row.question_order_index,
        domainId: row.domain_id,
        domainKey: row.domain_key,
        domainLabel: row.domain_label,
        domainType: row.domain_type,
        createdAt: row.question_created_at,
        updatedAt: row.question_updated_at,
      },
      options: [],
    };

    if (row.option_id && row.option_key && row.option_text !== null && row.option_order_index !== null) {
      const signalWeights = Object.freeze(weightsByOptionId.get(row.option_id) ?? []);
      questionEntry.options.push({
        optionId: row.option_id,
        optionKey: row.option_key,
        optionLabel: row.option_label,
        optionText: row.option_text,
        orderIndex: row.option_order_index,
        createdAt: row.option_created_at ?? '',
        updatedAt: row.option_updated_at ?? '',
        weightingStatus: signalWeights.length > 0 ? 'weighted' : 'unmapped',
        signalWeights,
      });
    }

    questions.set(row.question_id, questionEntry);
  }

  return Object.freeze(
    [...questions.values()].map((entry) => ({
      ...entry.question,
      options: Object.freeze(
        entry.options.sort(
          (left, right) => left.orderIndex - right.orderIndex || left.optionId.localeCompare(right.optionId),
        ),
      ),
    })),
  );
}

async function loadAvailableSignalsForVersion(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly AdminAssessmentDetailAvailableSignal[]> {
  const result = await db.query<AdminAssessmentAvailableSignalRow>(
    `
    SELECT
      s.id AS signal_id,
      s.signal_key,
      s.label AS signal_label,
      s.description AS signal_description,
      s.order_index AS signal_order_index,
      d.id AS domain_id,
      d.domain_key,
      d.label AS domain_label,
      d.order_index AS domain_order_index
    FROM signals s
    INNER JOIN domains d
      ON d.id = s.domain_id
      AND d.assessment_version_id = s.assessment_version_id
    WHERE s.assessment_version_id = $1
    ORDER BY d.order_index ASC, s.order_index ASC, s.id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(
    result.rows.map((row) => ({
      signalId: row.signal_id,
      signalKey: row.signal_key,
      signalLabel: row.signal_label,
      signalDescription: row.signal_description,
      signalOrderIndex: row.signal_order_index,
      domainId: row.domain_id,
      domainKey: row.domain_key,
      domainLabel: row.domain_label,
      domainOrderIndex: row.domain_order_index,
    })),
  );
}

export async function getAdminAssessmentDetailByKey(
  db: Queryable,
  assessmentKey: string,
): Promise<AdminAssessmentDetailViewModel | null> {
  const result = await queryWithAssessmentModeFallback<AdminAssessmentDetailRow>({
    db,
    queryWithMode: `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM assessment_versions sdav
          LEFT JOIN assessment_version_single_domain_framing sdf
            ON sdf.assessment_version_id = sdav.id
          LEFT JOIN assessment_version_single_domain_hero_pairs sdh
            ON sdh.assessment_version_id = sdav.id
          LEFT JOIN assessment_version_single_domain_driver_claims sdd
            ON sdd.assessment_version_id = sdav.id
          WHERE sdav.assessment_id = a.id
            AND (
              sdf.id IS NOT NULL
              OR sdh.id IS NOT NULL
              OR sdd.id IS NOT NULL
            )
        ) THEN 'single_domain'
        ELSE COALESCE(av.mode, a.mode)
      END AS assessment_mode,
      a.title AS assessment_title,
      a.description AS assessment_description,
      a.is_active AS assessment_is_active,
      a.created_at AS assessment_created_at,
      a.updated_at AS assessment_updated_at,
      av.id AS assessment_version_id,
      av.version AS version_tag,
      av.lifecycle_status AS version_status,
      av.published_at,
      av.created_at AS version_created_at,
      av.updated_at AS version_updated_at,
      COUNT(q.id) AS question_count
    FROM assessments a
    LEFT JOIN assessment_versions av ON av.assessment_id = a.id
    LEFT JOIN questions q ON q.assessment_version_id = av.id
    WHERE a.assessment_key = $1
    GROUP BY
      a.id,
      a.assessment_key,
      a.mode,
      a.title,
      a.description,
      a.is_active,
      a.created_at,
      a.updated_at,
      av.id,
      av.mode,
      av.version,
      av.lifecycle_status,
      av.published_at,
      av.created_at,
      av.updated_at
    ORDER BY
      av.updated_at DESC NULLS LAST,
      av.created_at DESC NULLS LAST,
      av.version DESC NULLS LAST
    `,
    queryWithoutMode: `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      NULL AS assessment_mode,
      a.title AS assessment_title,
      a.description AS assessment_description,
      a.is_active AS assessment_is_active,
      a.created_at AS assessment_created_at,
      a.updated_at AS assessment_updated_at,
      av.id AS assessment_version_id,
      av.version AS version_tag,
      av.lifecycle_status AS version_status,
      av.published_at,
      av.created_at AS version_created_at,
      av.updated_at AS version_updated_at,
      COUNT(q.id) AS question_count
    FROM assessments a
    LEFT JOIN assessment_versions av ON av.assessment_id = a.id
    LEFT JOIN questions q ON q.assessment_version_id = av.id
    WHERE a.assessment_key = $1
    GROUP BY
      a.id,
      a.assessment_key,
      a.title,
      a.description,
      a.is_active,
      a.created_at,
      a.updated_at,
      av.id,
      av.version,
      av.lifecycle_status,
      av.published_at,
      av.created_at,
      av.updated_at
    ORDER BY
      av.updated_at DESC NULLS LAST,
      av.created_at DESC NULLS LAST,
      av.version DESC NULLS LAST
    `,
    values: [assessmentKey],
  });

  const firstRow = result.rows[0];
  if (!firstRow) {
    return null;
  }

  const versions = result.rows
    .flatMap((row) => {
      if (
        !row.assessment_version_id ||
        !row.version_tag ||
        !row.version_status ||
        !row.version_created_at ||
        !row.version_updated_at
      ) {
        return [];
      }

      const status = normalizeVersionStatus(row.version_status);
      if (!status) {
        return [];
      }

      return [
        {
          assessmentVersionId: row.assessment_version_id,
          versionTag: row.version_tag,
          status,
          publishedAt: row.published_at,
          questionCount: Number(row.question_count),
          createdAt: row.version_created_at,
          updatedAt: row.version_updated_at,
        } satisfies AdminAssessmentDetailVersion,
      ];
    })
    .sort((left, right) => {
      const updatedAtComparison = compareTimestampsDesc(left.updatedAt, right.updatedAt);
      if (updatedAtComparison !== 0) {
        return updatedAtComparison;
      }

      return compareAssessmentVersionTagsDesc(left.versionTag, right.versionTag);
    });
  const publishedVersion = versions.find((version) => version.status === 'published') ?? null;
  const latestDraftVersion = versions.find((version) => version.status === 'draft') ?? null;
  const assessmentMode = resolveAssessmentMode(firstRow.assessment_mode);
  const builderMode: AdminAssessmentBuilderMode = latestDraftVersion
    ? 'draft'
    : publishedVersion
      ? 'published_no_draft'
      : 'setup';
  const [
    authoredDomains,
    questionDomains,
    authoredQuestions,
    availableSignals,
    draftValidation,
    singleDomainLanguageBundle,
  ] =
    latestDraftVersion
      ? await Promise.all([
          loadAuthoringDomainsForVersion(db, latestDraftVersion.assessmentVersionId),
          loadQuestionDomainsForVersion(db, latestDraftVersion.assessmentVersionId),
          loadQuestionsForVersion(db, latestDraftVersion.assessmentVersionId),
          loadAvailableSignalsForVersion(db, latestDraftVersion.assessmentVersionId),
          validateLatestDraftAssessmentVersion(db, assessmentKey),
          isSingleDomain(assessmentMode)
            ? getSingleDomainLanguageBundle(db, latestDraftVersion.assessmentVersionId)
            : Promise.resolve({
                DOMAIN_FRAMING: Object.freeze([]),
                HERO_PAIRS: Object.freeze([]),
                SIGNAL_CHAPTERS: Object.freeze([]),
                BALANCING_SECTIONS: Object.freeze([]),
                PAIR_SUMMARIES: Object.freeze([]),
                APPLICATION_STATEMENTS: Object.freeze([]),
              } satisfies SingleDomainLanguageBundle),
        ])
      : await Promise.all([
          Promise.resolve(Object.freeze([]) as readonly AdminAssessmentDetailDomain[]),
          Promise.resolve(Object.freeze([]) as readonly AdminAssessmentDetailQuestionDomain[]),
          Promise.resolve(Object.freeze([]) as readonly AdminAssessmentDetailQuestion[]),
          Promise.resolve(Object.freeze([]) as readonly AdminAssessmentDetailAvailableSignal[]),
          validateLatestDraftAssessmentVersion(db, assessmentKey),
          Promise.resolve({
            DOMAIN_FRAMING: Object.freeze([]),
            HERO_PAIRS: Object.freeze([]),
            SIGNAL_CHAPTERS: Object.freeze([]),
            BALANCING_SECTIONS: Object.freeze([]),
            PAIR_SUMMARIES: Object.freeze([]),
            APPLICATION_STATEMENTS: Object.freeze([]),
          } satisfies SingleDomainLanguageBundle),
        ]);
  const singleDomainLanguageValidation = buildSingleDomainLanguageValidation({
    authoredDomains,
    languageBundle: singleDomainLanguageBundle,
  });
  const stepCompletion = latestDraftVersion
    ? await Promise.all([
        loadAssessmentIntroStepCompletion(db, latestDraftVersion.assessmentVersionId),
        loadLanguageStepCompletion(
          db,
          latestDraftVersion.assessmentVersionId,
          assessmentMode,
          authoredDomains,
        ),
      ]).then(([assessmentIntro, language]) => ({ assessmentIntro, language }))
    : {
        assessmentIntro: 'incomplete' as const,
        language: 'incomplete' as const,
      };
  const allOptions = authoredQuestions.flatMap((question) => question.options);
  const weightedOptions = allOptions.filter((option) => option.signalWeights.length > 0).length;
  const totalMappings = allOptions.reduce((sum, option) => sum + option.signalWeights.length, 0);

  return {
    assessmentId: firstRow.assessment_id,
    assessmentKey: firstRow.assessment_key,
    mode: assessmentMode,
    modeLabel: getAssessmentModeLabel(firstRow.assessment_mode),
    title: firstRow.assessment_title,
    description: firstRow.assessment_description,
    isActive: firstRow.assessment_is_active,
    createdAt: firstRow.assessment_created_at,
    updatedAt: firstRow.assessment_updated_at,
    versions: Object.freeze(versions),
    publishedVersion,
    latestDraftVersion,
    builderMode,
    authoredDomains,
    questionDomains,
    authoredQuestions,
    availableSignals,
    weightingSummary: {
      totalOptions: allOptions.length,
      weightedOptions,
      unmappedOptions: allOptions.length - weightedOptions,
      totalMappings,
    },
    draftValidation,
    singleDomainDraftReadiness: latestDraftVersion && isSingleDomain(assessmentMode)
      ? await getSingleDomainDraftReadiness(db, latestDraftVersion.assessmentVersionId)
      : null,
    stepCompletion,
    singleDomainLanguageBundle,
    singleDomainLanguageValidation,
  };
}



