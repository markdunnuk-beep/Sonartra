import test from 'node:test';
import assert from 'node:assert/strict';

import { loadWplp80Seeds } from '@/db/seed/wplp80';
import { createAssessmentDefinitionRepository } from '@/lib/engine/repository';
import type {
  AssessmentRow,
  AssessmentVersionRow,
  DomainRow,
  OptionRow,
  OptionSignalWeightRow,
  Queryable,
  QuestionRow,
  SignalRow,
} from '@/lib/engine/repository-sql';
import { isCanonicalResultPayload } from '@/lib/engine/result-contract';
import { createAssessmentAttemptLifecycleService } from '@/lib/server/assessment-attempt-lifecycle';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';
import { createAssessmentRunnerService } from '@/lib/server/assessment-runner-service';
import {
  buildAssessmentWorkspaceViewModel,
  buildDashboardViewModel,
} from '@/lib/server/dashboard-workspace-view-model';
import { createResultReadModelService } from '@/lib/server/result-read-model';

type AttemptState = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  assessmentVersionId: string;
  lifecycleStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SCORED' | 'RESULT_READY' | 'FAILED';
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

type ResponseState = {
  responseId: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
  respondedAt: string;
  updatedAt: string;
};

type ResultState = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentVersionId: string;
  pipelineStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  readinessStatus: 'PROCESSING' | 'READY' | 'FAILED';
  canonicalResultPayload: unknown;
  failureReason: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PublishedRuntimeHarness = {
  db: Queryable;
  assessment: AssessmentRow;
  publishedVersion: AssessmentVersionRow;
  draftVersion: AssessmentVersionRow;
  questions: QuestionRow[];
  attempts: AttemptState[];
  responses: ResponseState[];
  results: ResultState[];
  mutateDefinitionWeights(): void;
};

function createClock() {
  let tick = 0;

  return {
    next() {
      tick += 1;
      return `2026-01-01T00:${String(Math.floor(tick / 60)).padStart(2, '0')}:${String(tick % 60).padStart(2, '0')}.000Z`;
    },
  };
}

function toAttemptSummaryRow(attempt: AttemptState) {
  return {
    attempt_id: attempt.attemptId,
    user_id: attempt.userId,
    assessment_id: attempt.assessmentId,
    assessment_version_id: attempt.assessmentVersionId,
    lifecycle_status: attempt.lifecycleStatus,
    started_at: attempt.startedAt,
    submitted_at: attempt.submittedAt,
    completed_at: attempt.completedAt,
    last_activity_at: attempt.lastActivityAt,
    created_at: attempt.createdAt,
    updated_at: attempt.updatedAt,
  };
}

function toRunnerAttemptRow(
  attempt: AttemptState,
  assessment: AssessmentRow,
  version: AssessmentVersionRow,
) {
  return {
    ...toAttemptSummaryRow(attempt),
    assessment_key: assessment.assessment_key,
    assessment_title: assessment.title,
    assessment_description: assessment.description,
    version_tag: version.version,
  };
}

function toResultSummaryRow(result: ResultState) {
  return {
    result_id: result.resultId,
    attempt_id: result.attemptId,
    pipeline_status: result.pipelineStatus,
    readiness_status: result.readinessStatus,
    generated_at: result.generatedAt,
    failure_reason: result.failureReason,
    has_canonical_result_payload: result.canonicalResultPayload !== null,
    created_at: result.createdAt,
    updated_at: result.updatedAt,
  };
}

function createPublishedRuntimeHarness(): PublishedRuntimeHarness {
  const seeds = loadWplp80Seeds();
  const baseTimestamp = '2026-01-01T00:00:00.000Z';
  const assessmentId = 'assessment-wplp80';
  const publishedVersionId = 'version-wplp80-published';
  const draftVersionId = 'version-wplp80-draft';
  const clock = createClock();

  const assessment: AssessmentRow = {
    id: assessmentId,
    assessment_key: seeds.assessment.key,
    title: seeds.assessment.title,
    description: seeds.assessment.description,
    created_at: baseTimestamp,
    updated_at: baseTimestamp,
  };

  const publishedVersion: AssessmentVersionRow = {
    id: publishedVersionId,
    assessment_id: assessmentId,
    version: seeds.assessment.version,
    lifecycle_status: 'PUBLISHED',
    published_at: baseTimestamp,
    created_at: baseTimestamp,
    updated_at: baseTimestamp,
  };

  const draftVersion: AssessmentVersionRow = {
    id: draftVersionId,
    assessment_id: assessmentId,
    version: '1.0.1-draft',
    lifecycle_status: 'DRAFT',
    published_at: null,
    created_at: baseTimestamp,
    updated_at: baseTimestamp,
  };

  const domains: DomainRow[] = seeds.domains.map((domain) => ({
    id: `domain-${domain.key}`,
    assessment_version_id: publishedVersionId,
    domain_key: domain.key,
    label: domain.title,
    description: domain.description ?? null,
    domain_type: domain.source === 'question_section' ? 'QUESTION_SECTION' : 'SIGNAL_GROUP',
    order_index: domain.order,
    created_at: baseTimestamp,
    updated_at: baseTimestamp,
  }));
  const domainIdByKey = new Map(domains.map((domain) => [domain.domain_key, domain.id]));

  const signals: SignalRow[] = seeds.signals.map((signal) => ({
    id: `signal-${signal.key}`,
    assessment_version_id: publishedVersionId,
    domain_id: domainIdByKey.get(signal.domainKey) ?? '',
    signal_key: signal.key,
    label: signal.title,
    description: signal.description ?? null,
    order_index: signal.order,
    is_overlay: signal.key.startsWith('decision_') || signal.key.startsWith('role_'),
    created_at: baseTimestamp,
    updated_at: baseTimestamp,
  }));
  const signalIdByKey = new Map(signals.map((signal) => [signal.signal_key, signal.id]));

  const questions: QuestionRow[] = seeds.questions.map((question) => ({
    id: `question-${question.key}`,
    assessment_version_id: publishedVersionId,
    domain_id: domainIdByKey.get(question.domainKey) ?? '',
    question_key: question.key,
    prompt: question.text,
    order_index: question.order,
    created_at: baseTimestamp,
    updated_at: baseTimestamp,
  }));
  const questionIdByKey = new Map(questions.map((question) => [question.question_key, question.id]));

  const options: OptionRow[] = seeds.options.map((option) => ({
    id: `option-${option.key}`,
    assessment_version_id: publishedVersionId,
    question_id: questionIdByKey.get(option.questionKey) ?? '',
    option_key: option.key,
    option_label: option.label,
    option_text: option.text,
    order_index: option.order,
    created_at: baseTimestamp,
    updated_at: baseTimestamp,
  }));
  const optionIdByKey = new Map(options.map((option) => [option.option_key, option.id]));

  const optionSignalWeights: OptionSignalWeightRow[] = seeds.optionSignalWeights.map((weight, index) => ({
    id: `weight-${String(index + 1).padStart(4, '0')}`,
    option_id: optionIdByKey.get(weight.optionKey) ?? '',
    signal_id: signalIdByKey.get(weight.signalKey) ?? '',
    weight: weight.weight,
    source_weight_key: weight.sourceWeightKey,
    created_at: baseTimestamp,
    updated_at: baseTimestamp,
  }));

  const questionsByVersionId = new Map<string, QuestionRow[]>([
    [publishedVersionId, questions],
    [
      draftVersionId,
      [{
        id: 'question-draft-only',
        assessment_version_id: draftVersionId,
        domain_id: domains[0]!.id,
        question_key: 'draft_q01',
        prompt: 'Draft-only question',
        order_index: 1,
        created_at: baseTimestamp,
        updated_at: baseTimestamp,
      }],
    ],
  ]);

  const optionsByQuestionId = new Map<string, OptionRow[]>();
  for (const option of options) {
    const list = optionsByQuestionId.get(option.question_id) ?? [];
    list.push(option);
    optionsByQuestionId.set(option.question_id, list);
  }
  for (const list of optionsByQuestionId.values()) {
    list.sort((left, right) => left.order_index - right.order_index || left.id.localeCompare(right.id));
  }

  const attempts: AttemptState[] = [];
  const responses: ResponseState[] = [];
  const results: ResultState[] = [];
  let attemptSequence = 0;
  let responseSequence = 0;
  let resultSequence = 0;

  const db: Queryable = {
    async query<T>(text: string, params?: unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql.includes('FROM assessments WHERE assessment_key = $1')) {
        const assessmentKey = params?.[0] as string;
        return { rows: (assessment.assessment_key === assessmentKey ? [assessment] : []) as T[] };
      }

      if (sql.includes('FROM assessment_versions WHERE assessment_id = $1 AND lifecycle_status = \'PUBLISHED\'')) {
        const assessmentLookupId = params?.[0] as string;
        return { rows: (assessmentLookupId === assessment.id ? [publishedVersion] : []) as T[] };
      }

      if (sql.includes('FROM assessment_versions WHERE id = $1')) {
        const versionId = params?.[0] as string;
        const version = [publishedVersion, draftVersion].find((entry) => entry.id === versionId);
        return { rows: (version ? [version] : []) as T[] };
      }

      if (sql.includes('FROM assessment_versions av INNER JOIN assessments a ON a.id = av.assessment_id WHERE a.assessment_key = $1 AND av.version = $2')) {
        const [assessmentKey, versionTag] = params as [string, string];
        const version =
          assessment.assessment_key === assessmentKey
            ? [publishedVersion, draftVersion].find((entry) => entry.version === versionTag) ?? null
            : null;
        return { rows: (version ? [version] : []) as T[] };
      }

      if (sql.includes('SELECT row_to_json(a.*) AS a, row_to_json(av.*) AS v FROM assessment_versions av INNER JOIN assessments a ON a.id = av.assessment_id WHERE av.id = $1')) {
        const versionId = params?.[0] as string;
        const version = [publishedVersion, draftVersion].find((entry) => entry.id === versionId);
        return { rows: (version ? [{ a: assessment, v: version }] : []) as T[] };
      }

      if (sql.includes('FROM domains WHERE assessment_version_id = $1 ORDER BY order_index ASC, id ASC')) {
        const versionId = params?.[0] as string;
        return { rows: [...(versionId === publishedVersionId ? domains : [])] as T[] };
      }

      if (sql.includes('FROM signals WHERE assessment_version_id = $1 ORDER BY order_index ASC, id ASC')) {
        const versionId = params?.[0] as string;
        return { rows: [...(versionId === publishedVersionId ? signals : [])] as T[] };
      }

      if (sql.includes('FROM questions WHERE assessment_version_id = $1 ORDER BY order_index ASC, id ASC')) {
        const versionId = params?.[0] as string;
        return { rows: [...(questionsByVersionId.get(versionId) ?? [])] as T[] };
      }

      if (sql.includes('FROM options o INNER JOIN questions q ON q.id = o.question_id WHERE q.assessment_version_id = $1 ORDER BY q.order_index ASC, o.order_index ASC, o.id ASC')) {
        const versionId = params?.[0] as string;
        if (versionId !== publishedVersionId) {
          return { rows: [] as T[] };
        }

        const questionOrder = new Map(questions.map((question) => [question.id, question.order_index]));
        return {
          rows: options
            .filter((option) => questionOrder.has(option.question_id))
            .sort((left, right) => {
              return (
                (questionOrder.get(left.question_id) ?? 0) - (questionOrder.get(right.question_id) ?? 0) ||
                left.order_index - right.order_index ||
                left.id.localeCompare(right.id)
              );
            }) as T[],
        };
      }

      if (sql.includes('FROM option_signal_weights osw INNER JOIN options o ON o.id = osw.option_id INNER JOIN questions q ON q.id = o.question_id WHERE q.assessment_version_id = $1 ORDER BY osw.id ASC')) {
        const versionId = params?.[0] as string;
        if (versionId !== publishedVersionId) {
          return { rows: [] as T[] };
        }

        const questionIds = new Set((questionsByVersionId.get(versionId) ?? []).map((question) => question.id));
        const optionIds = new Set(options.filter((option) => questionIds.has(option.question_id)).map((option) => option.id));
        return {
          rows: optionSignalWeights
            .filter((weight) => optionIds.has(weight.option_id))
            .sort((left, right) => left.id.localeCompare(right.id)) as T[],
        };
      }

      if (sql.includes('FROM assessments a INNER JOIN assessment_versions av ON av.assessment_id = a.id WHERE a.assessment_key = $1 AND av.lifecycle_status = \'PUBLISHED\'')) {
        const assessmentKey = params?.[0] as string;
        if (assessment.assessment_key !== assessmentKey) {
          return { rows: [] as T[] };
        }

        return {
          rows: ([{
            assessment_id: assessment.id,
            assessment_key: assessment.assessment_key,
            assessment_version_id: publishedVersion.id,
            version_tag: publishedVersion.version,
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('FROM attempts WHERE user_id = $1 AND assessment_id = $2 AND lifecycle_status = \'IN_PROGRESS\'')) {
        const [userId, assessmentLookupId] = params as [string, string];
        const attempt = attempts
          .filter((entry) => entry.userId === userId && entry.assessmentId === assessmentLookupId && entry.lifecycleStatus === 'IN_PROGRESS')
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.attemptId.localeCompare(left.attemptId))[0];
        return { rows: (attempt ? [toAttemptSummaryRow(attempt)] : []) as T[] };
      }

      if (sql.includes('FROM attempts WHERE user_id = $1 AND assessment_id = $2 ORDER BY created_at DESC, id DESC')) {
        const [userId, assessmentLookupId] = params as [string, string];
        const attempt = attempts
          .filter((entry) => entry.userId === userId && entry.assessmentId === assessmentLookupId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.attemptId.localeCompare(left.attemptId))[0];
        return { rows: (attempt ? [toAttemptSummaryRow(attempt)] : []) as T[] };
      }

      if (sql.includes('SELECT COUNT(DISTINCT question_id) AS answered_questions FROM responses WHERE attempt_id = $1')) {
        const attemptId = params?.[0] as string;
        return {
          rows: ([{
            answered_questions: new Set(
              responses.filter((response) => response.attemptId === attemptId).map((response) => response.questionId),
            ).size,
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('SELECT id AS result_id, attempt_id, pipeline_status, readiness_status, generated_at, failure_reason, canonical_result_payload IS NOT NULL AS has_canonical_result_payload, created_at, updated_at FROM results WHERE attempt_id = $1 ORDER BY created_at DESC, id DESC')) {
        const attemptId = params?.[0] as string;
        const result = results
          .filter((entry) => entry.attemptId === attemptId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.resultId.localeCompare(left.resultId))[0];
        return { rows: (result ? [toResultSummaryRow(result)] : []) as T[] };
      }

      if (sql.includes('SELECT COUNT(*) AS total_questions FROM questions WHERE assessment_version_id = $1')) {
        const versionId = params?.[0] as string;
        return {
          rows: ([{ total_questions: (questionsByVersionId.get(versionId) ?? []).length }] as unknown[]) as T[],
        };
      }

      if (sql.includes('INSERT INTO attempts ( user_id, assessment_id, assessment_version_id, lifecycle_status ) VALUES ($1, $2, $3, \'IN_PROGRESS\')')) {
        const [userId, assessmentLookupId, versionId] = params as [string, string, string];
        attemptSequence += 1;
        const timestamp = clock.next();
        const attempt: AttemptState = {
          attemptId: `attempt-${attemptSequence}`,
          userId,
          assessmentId: assessmentLookupId,
          assessmentVersionId: versionId,
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: timestamp,
          submittedAt: null,
          completedAt: null,
          lastActivityAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        attempts.push(attempt);
        return { rows: ([toAttemptSummaryRow(attempt)] as unknown[]) as T[] };
      }

      if (sql.includes('FROM attempts t INNER JOIN assessments a ON a.id = t.assessment_id INNER JOIN assessment_versions av ON av.id = t.assessment_version_id WHERE t.id = $1')) {
        const attemptId = params?.[0] as string;
        const attempt = attempts.find((entry) => entry.attemptId === attemptId);
        return {
          rows: (attempt
            ? [toRunnerAttemptRow(attempt, assessment, attempt.assessmentVersionId === publishedVersionId ? publishedVersion : draftVersion)]
            : []) as T[],
        };
      }

      if (sql.includes('SELECT id AS result_id, readiness_status, canonical_result_payload IS NOT NULL AS has_canonical_result_payload, failure_reason FROM results WHERE attempt_id = $1 ORDER BY created_at DESC, id DESC')) {
        const attemptId = params?.[0] as string;
        const result = results
          .filter((entry) => entry.attemptId === attemptId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.resultId.localeCompare(left.resultId))[0];
        return {
          rows: (result
            ? [{
                result_id: result.resultId,
                readiness_status: result.readinessStatus,
                has_canonical_result_payload: result.canonicalResultPayload !== null,
                failure_reason: result.failureReason,
              }]
            : []) as T[],
        };
      }

      if (sql.includes('FROM questions q INNER JOIN domains d ON d.id = q.domain_id INNER JOIN options o ON o.question_id = q.id WHERE q.assessment_version_id = $1 ORDER BY q.order_index ASC, q.id ASC, o.order_index ASC, o.id ASC')) {
        const versionId = params?.[0] as string;
        const rows = (questionsByVersionId.get(versionId) ?? []).flatMap((question) => {
          const domain = domains.find((entry) => entry.id === question.domain_id)!;
          return (optionsByQuestionId.get(question.id) ?? []).map((option) => ({
            question_id: question.id,
            question_key: question.question_key,
            prompt: question.prompt,
            question_order_index: question.order_index,
            domain_title: domain.label,
            option_id: option.id,
            option_key: option.option_key,
            option_label: option.option_label,
            option_text: option.option_text,
            option_order_index: option.order_index,
          }));
        });
        return { rows: rows as T[] };
      }

      if (sql.includes('SELECT question_id, selected_option_id FROM responses WHERE attempt_id = $1')) {
        const attemptId = params?.[0] as string;
        return {
          rows: responses
            .filter((response) => response.attemptId === attemptId)
            .map((response) => ({
              question_id: response.questionId,
              selected_option_id: response.selectedOptionId,
            })) as T[],
        };
      }

      if (sql.includes('SELECT COALESCE(r.answered_questions, 0) AS answered_questions, q.total_questions FROM ( SELECT COUNT(*) AS total_questions FROM questions WHERE assessment_version_id = $2 ) q CROSS JOIN LATERAL ( SELECT COUNT(*) AS answered_questions FROM responses WHERE attempt_id = $1 ) r')) {
        const [attemptId, versionId] = params as [string, string];
        return {
          rows: ([{
            answered_questions: responses.filter((response) => response.attemptId === attemptId).length,
            total_questions: (questionsByVersionId.get(versionId) ?? []).length,
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('SELECT 1 AS valid_row FROM attempts t INNER JOIN questions q ON q.assessment_version_id = t.assessment_version_id INNER JOIN options o ON o.question_id = q.id WHERE t.id = $1 AND q.id = $2 AND o.id = $3')) {
        const [attemptId, questionId, optionId] = params as [string, string, string];
        const attempt = attempts.find((entry) => entry.attemptId === attemptId);
        const valid =
          attempt?.assessmentVersionId === publishedVersionId &&
          (questionsByVersionId.get(publishedVersionId) ?? []).some((question) => question.id === questionId) &&
          (optionsByQuestionId.get(questionId) ?? []).some((option) => option.id === optionId);
        return { rows: (valid ? ([{ valid_row: 1 }] as unknown[]) : []) as T[] };
      }

      if (sql.includes('INSERT INTO responses ( attempt_id, question_id, selected_option_id, responded_at ) VALUES ($1, $2, $3, NOW()) ON CONFLICT (attempt_id, question_id) DO UPDATE')) {
        const [attemptId, questionId, selectedOptionId] = params as [string, string, string];
        const now = clock.next();
        const existing = responses.find((response) => response.attemptId === attemptId && response.questionId === questionId);
        if (existing) {
          existing.selectedOptionId = selectedOptionId;
          existing.respondedAt = now;
          existing.updatedAt = now;
        } else {
          responseSequence += 1;
          responses.push({
            responseId: `response-${responseSequence}`,
            attemptId,
            questionId,
            selectedOptionId,
            respondedAt: now,
            updatedAt: now,
          });
        }
        return { rows: [] as T[] };
      }

      if (sql.includes('UPDATE attempts SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1')) {
        const attemptId = params?.[0] as string;
        const attempt = attempts.find((entry) => entry.attemptId === attemptId);
        if (attempt) {
          const now = clock.next();
          attempt.lastActivityAt = now;
          attempt.updatedAt = now;
        }
        return { rows: [] as T[] };
      }

      if (sql.includes('SELECT DISTINCT ON (r.question_id) r.id AS response_id')) {
        const attemptId = params?.[0] as string;
        const collapsed = new Map<string, ResponseState>();
        const ordered = responses
          .filter((response) => response.attemptId === attemptId)
          .sort((left, right) => {
            if (left.questionId !== right.questionId) {
              return left.questionId.localeCompare(right.questionId);
            }
            if (left.updatedAt !== right.updatedAt) {
              return right.updatedAt.localeCompare(left.updatedAt);
            }
            return right.responseId.localeCompare(left.responseId);
          });
        for (const response of ordered) {
          if (!collapsed.has(response.questionId)) {
            collapsed.set(response.questionId, response);
          }
        }
        return {
          rows: [...collapsed.values()].map((response) => ({
            response_id: response.responseId,
            attempt_id: response.attemptId,
            question_id: response.questionId,
            selected_option_id: response.selectedOptionId,
            responded_at: response.respondedAt,
            updated_at: response.updatedAt,
          })) as T[],
        };
      }

      if (sql.includes('UPDATE attempts SET lifecycle_status = \'SUBMITTED\'')) {
        const attemptId = params?.[0] as string;
        const attempt = attempts.find((entry) => entry.attemptId === attemptId);
        if (attempt) {
          const now = clock.next();
          attempt.lifecycleStatus = 'SUBMITTED';
          attempt.submittedAt ??= now;
          attempt.completedAt ??= now;
          attempt.lastActivityAt = now;
          attempt.updatedAt = now;
        }
        return { rows: [] as T[] };
      }

      if (sql.includes('UPDATE attempts SET lifecycle_status = \'RESULT_READY\'')) {
        const attemptId = params?.[0] as string;
        const attempt = attempts.find((entry) => entry.attemptId === attemptId);
        if (attempt) {
          const now = clock.next();
          attempt.lifecycleStatus = 'RESULT_READY';
          attempt.completedAt ??= now;
          attempt.lastActivityAt = now;
          attempt.updatedAt = now;
        }
        return { rows: [] as T[] };
      }

      if (sql.includes('UPDATE attempts SET lifecycle_status = \'FAILED\'')) {
        const attemptId = params?.[0] as string;
        const attempt = attempts.find((entry) => entry.attemptId === attemptId);
        if (attempt) {
          const now = clock.next();
          attempt.lifecycleStatus = 'FAILED';
          attempt.completedAt ??= now;
          attempt.lastActivityAt = now;
          attempt.updatedAt = now;
        }
        return { rows: [] as T[] };
      }

      if (sql.includes('VALUES ($1, $2, $3, \'RUNNING\', \'PROCESSING\', NULL, NULL) ON CONFLICT (attempt_id) DO UPDATE')) {
        const [attemptId, assessmentLookupId, versionId] = params as [string, string, string];
        const now = clock.next();
        let result = results.find((entry) => entry.attemptId === attemptId);
        if (!result) {
          resultSequence += 1;
          result = {
            resultId: `result-${resultSequence}`,
            attemptId,
            assessmentId: assessmentLookupId,
            assessmentVersionId: versionId,
            pipelineStatus: 'RUNNING',
            readinessStatus: 'PROCESSING',
            canonicalResultPayload: null,
            failureReason: null,
            generatedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          results.push(result);
        } else {
          result.pipelineStatus = 'RUNNING';
          result.readinessStatus = 'PROCESSING';
          result.canonicalResultPayload = null;
          result.failureReason = null;
          result.updatedAt = now;
        }
        return { rows: ([{ result_id: result.resultId }] as unknown[]) as T[] };
      }

      if (sql.includes('VALUES ($1, $2, $3, \'COMPLETED\', \'READY\', $4::jsonb, NULL, NOW()) ON CONFLICT (attempt_id) DO UPDATE')) {
        const [attemptId, assessmentLookupId, versionId, payloadString] = params as [string, string, string, string];
        const now = clock.next();
        const payload = JSON.parse(payloadString);
        let result = results.find((entry) => entry.attemptId === attemptId);
        if (!result) {
          resultSequence += 1;
          result = {
            resultId: `result-${resultSequence}`,
            attemptId,
            assessmentId: assessmentLookupId,
            assessmentVersionId: versionId,
            pipelineStatus: 'COMPLETED',
            readinessStatus: 'READY',
            canonicalResultPayload: payload,
            failureReason: null,
            generatedAt: now,
            createdAt: now,
            updatedAt: now,
          };
          results.push(result);
        } else {
          result.pipelineStatus = 'COMPLETED';
          result.readinessStatus = 'READY';
          result.canonicalResultPayload = payload;
          result.failureReason = null;
          result.generatedAt = now;
          result.updatedAt = now;
        }
        return { rows: ([{ result_id: result.resultId }] as unknown[]) as T[] };
      }

      if (sql.includes('VALUES ($1, $2, $3, \'FAILED\', \'FAILED\', NULL, $4, NULL) ON CONFLICT (attempt_id) DO UPDATE')) {
        const [attemptId, assessmentLookupId, versionId, failureReason] = params as [string, string, string, string];
        const now = clock.next();
        let result = results.find((entry) => entry.attemptId === attemptId);
        if (!result) {
          resultSequence += 1;
          result = {
            resultId: `result-${resultSequence}`,
            attemptId,
            assessmentId: assessmentLookupId,
            assessmentVersionId: versionId,
            pipelineStatus: 'FAILED',
            readinessStatus: 'FAILED',
            canonicalResultPayload: null,
            failureReason,
            generatedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          results.push(result);
        } else {
          result.pipelineStatus = 'FAILED';
          result.readinessStatus = 'FAILED';
          result.canonicalResultPayload = null;
          result.failureReason = failureReason;
          result.generatedAt = null;
          result.updatedAt = now;
        }
        return { rows: ([{ result_id: result.resultId }] as unknown[]) as T[] };
      }

      if (sql.includes('FROM results WHERE attempt_id = $1 ORDER BY created_at DESC, id DESC')) {
        const attemptId = params?.[0] as string;
        const result = results
          .filter((entry) => entry.attemptId === attemptId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.resultId.localeCompare(left.resultId))[0];
        return {
          rows: (result
            ? [{
                result_id: result.resultId,
                attempt_id: result.attemptId,
                pipeline_status: result.pipelineStatus,
                readiness_status: result.readinessStatus,
                generated_at: result.generatedAt,
                failure_reason: result.failureReason,
                has_canonical_result_payload: result.canonicalResultPayload !== null,
                canonical_result_payload: result.canonicalResultPayload,
                created_at: result.createdAt,
                updated_at: result.updatedAt,
              }]
            : []) as T[],
        };
      }

      if (sql.includes('FROM assessments a INNER JOIN assessment_versions av ON av.assessment_id = a.id LEFT JOIN questions q ON q.assessment_version_id = av.id WHERE av.lifecycle_status = \'PUBLISHED\'')) {
        return {
          rows: ([{
            assessment_id: assessment.id,
            assessment_key: assessment.assessment_key,
            assessment_title: assessment.title,
            assessment_description: assessment.description,
            assessment_version_id: publishedVersion.id,
            version_tag: publishedVersion.version,
            published_at: publishedVersion.published_at,
            question_count: String(questions.length),
          }] as unknown[]) as T[],
        };
      }

      if (sql.includes('FROM results r INNER JOIN attempts t ON t.id = r.attempt_id INNER JOIN assessments a ON a.id = r.assessment_id INNER JOIN assessment_versions av ON av.id = r.assessment_version_id WHERE t.user_id = $1 AND r.readiness_status = \'READY\' AND r.canonical_result_payload IS NOT NULL ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')) {
        const userId = params?.[0] as string;
        const rows = results
          .filter((result) => {
            const attempt = attempts.find((entry) => entry.attemptId === result.attemptId);
            return attempt?.userId === userId && result.readinessStatus === 'READY' && result.canonicalResultPayload !== null;
          })
          .sort((left, right) => {
            const leftSort = left.generatedAt ?? left.createdAt;
            const rightSort = right.generatedAt ?? right.createdAt;
            return rightSort.localeCompare(leftSort) || right.resultId.localeCompare(left.resultId);
          })
          .map((result) => ({
            result_id: result.resultId,
            attempt_id: result.attemptId,
            assessment_id: result.assessmentId,
            assessment_key: assessment.assessment_key,
            assessment_title: assessment.title,
            version_tag: result.assessmentVersionId === publishedVersion.id ? publishedVersion.version : draftVersion.version,
            readiness_status: 'READY' as const,
            generated_at: result.generatedAt,
            created_at: result.createdAt,
            canonical_result_payload: result.canonicalResultPayload,
          }));
        return { rows: rows as T[] };
      }

      if (sql.includes('FROM results r INNER JOIN attempts t ON t.id = r.attempt_id INNER JOIN assessments a ON a.id = r.assessment_id INNER JOIN assessment_versions av ON av.id = r.assessment_version_id WHERE r.id = $1 AND t.user_id = $2 AND r.readiness_status = \'READY\' AND r.canonical_result_payload IS NOT NULL')) {
        const [resultId, userId] = params as [string, string];
        const result = results.find((entry) => entry.resultId === resultId);
        const attempt = result ? attempts.find((entry) => entry.attemptId === result.attemptId) : null;
        if (!result || !attempt || attempt.userId !== userId || result.readinessStatus !== 'READY' || result.canonicalResultPayload === null) {
          return { rows: [] as T[] };
        }
        return {
          rows: ([{
            result_id: result.resultId,
            attempt_id: result.attemptId,
            assessment_id: result.assessmentId,
            assessment_key: assessment.assessment_key,
            assessment_title: assessment.title,
            version_tag: result.assessmentVersionId === publishedVersion.id ? publishedVersion.version : draftVersion.version,
            readiness_status: 'READY',
            generated_at: result.generatedAt,
            created_at: result.createdAt,
            canonical_result_payload: result.canonicalResultPayload,
          }] as unknown[]) as T[],
        };
      }

      throw new Error(`Unhandled SQL in published runtime regression harness: ${sql}`);
    },
  };

  return {
    db,
    assessment,
    publishedVersion,
    draftVersion,
    questions,
    attempts,
    responses,
    results,
    mutateDefinitionWeights() {
      const fallbackSignalId = signals.find((signal) => !signal.is_overlay)?.id ?? signals[0]!.id;
      for (const weight of optionSignalWeights) {
        weight.signal_id = fallbackSignalId;
        weight.weight = 99;
      }
    },
  };
}

test('published runtime regression proves publish to ready persisted retrieval flow for WPLP-80', async () => {
  const harness = createPublishedRuntimeHarness();
  const repository = createAssessmentDefinitionRepository({ db: harness.db });
  const lifecycleService = createAssessmentAttemptLifecycleService({ db: harness.db });
  const completionService = createAssessmentCompletionService({ db: harness.db, repository });
  const runnerService = createAssessmentRunnerService({
    db: harness.db,
    lifecycleService,
    completionService,
  });
  const resultReadModel = createResultReadModelService({ db: harness.db });
  const userId = 'user-regression';

  const started = await lifecycleService.startAssessmentAttempt({
    userId,
    assessmentKey: 'wplp80',
  });

  assert.equal(started.status, 'in_progress');
  assert.ok(started.attemptId);
  assert.equal(started.assessmentVersionId, harness.publishedVersion.id);
  assert.notEqual(started.assessmentVersionId, harness.draftVersion.id);
  assert.equal(started.versionTag, harness.publishedVersion.version);
  assert.equal(started.totalQuestions, harness.questions.length);
  assert.equal(started.totalQuestions, 80);

  const runner = await runnerService.getAssessmentRunnerViewModel({
    userId,
    assessmentKey: 'wplp80',
    attemptId: started.attemptId!,
  });

  assert.equal(runner.status, 'in_progress');
  assert.equal(runner.assessmentVersionId, harness.publishedVersion.id);
  assert.equal(runner.questions.length, harness.questions.length);
  assert.equal(runner.questions[0]?.questionKey, 'wplp80_q01');
  assert.equal(runner.questions[runner.questions.length - 1]?.questionKey, 'wplp80_q80');
  assert.deepEqual(
    runner.questions.slice(0, 5).map((question) => question.orderIndex),
    [1, 2, 3, 4, 5],
  );
  for (const question of runner.questions) {
    assert.ok(question.options.length > 0);
  }

  const firstQuestion = runner.questions[0]!;
  const overwriteOption = firstQuestion.options[1] ?? firstQuestion.options[0]!;

  await runnerService.saveAssessmentResponse({
    userId,
    assessmentKey: 'wplp80',
    attemptId: started.attemptId!,
    questionId: firstQuestion.questionId,
    selectedOptionId: firstQuestion.options[0]!.optionId,
  });
  const overwritten = await runnerService.saveAssessmentResponse({
    userId,
    assessmentKey: 'wplp80',
    attemptId: started.attemptId!,
    questionId: firstQuestion.questionId,
    selectedOptionId: overwriteOption.optionId,
  });

  assert.equal(overwritten.selectedOptionId, overwriteOption.optionId);
  assert.equal(overwritten.answeredQuestions, 1);

  for (const question of runner.questions.slice(1)) {
    await runnerService.saveAssessmentResponse({
      userId,
      assessmentKey: 'wplp80',
      attemptId: started.attemptId!,
      questionId: question.questionId,
      selectedOptionId: question.options[0]!.optionId,
    });
  }

  assert.equal(harness.responses.length, runner.questions.length);
  assert.ok(harness.responses.every((response) => response.attemptId === started.attemptId));
  assert.equal(
    harness.responses.filter((response) => response.questionId === firstQuestion.questionId).length,
    1,
  );
  assert.equal(
    harness.responses.find((response) => response.questionId === firstQuestion.questionId)?.selectedOptionId,
    overwriteOption.optionId,
  );

  const submit = await runnerService.completeAssessmentAttempt({
    userId,
    assessmentKey: 'wplp80',
    attemptId: started.attemptId!,
  });

  assert.equal(submit.kind, 'ready');
  assert.equal(submit.completion.success, true);
  assert.equal(submit.completion.resultStatus, 'ready');
  assert.equal(submit.completion.payloadReady, true);
  assert.equal(submit.completion.alreadyCompleted, false);
  assert.ok(submit.completion.resultId);

  const persistedResult = harness.results.find((result) => result.resultId === submit.completion.resultId);
  assert.ok(persistedResult);
  assert.equal(persistedResult?.attemptId, started.attemptId);
  assert.equal(persistedResult?.assessmentVersionId, harness.publishedVersion.id);
  assert.equal(persistedResult?.pipelineStatus, 'COMPLETED');
  assert.equal(persistedResult?.readinessStatus, 'READY');
  assert.ok(isCanonicalResultPayload(persistedResult?.canonicalResultPayload));

  const payload = persistedResult!.canonicalResultPayload;
  assert.equal(payload.metadata.assessmentKey, 'wplp80');
  assert.equal(payload.metadata.version, harness.publishedVersion.version);
  assert.equal(payload.metadata.attemptId, started.attemptId);
  assert.ok(payload.topSignal);
  assert.ok(payload.rankedSignals.length > 0);
  assert.ok(payload.normalizedScores.length > 0);
  assert.ok(payload.domainSummaries.length > 0);
  assert.ok(typeof payload.overviewSummary.headline === 'string' && payload.overviewSummary.headline.length > 0);
  assert.ok(Array.isArray(payload.strengths));
  assert.ok(Array.isArray(payload.watchouts));
  assert.ok(Array.isArray(payload.developmentFocus));
  assert.ok(payload.diagnostics);

  const latestLifecycle = await lifecycleService.getAssessmentAttemptLifecycle({
    userId,
    assessmentKey: 'wplp80',
  });
  assert.equal(latestLifecycle.status, 'ready');
  assert.equal(latestLifecycle.latestResultId, persistedResult?.resultId ?? null);
  assert.equal(latestLifecycle.latestResultReady, true);

  const workspace = await buildAssessmentWorkspaceViewModel({
    db: harness.db,
    userId,
  });
  const dashboard = await buildDashboardViewModel({
    db: harness.db,
    userId,
  });
  const resultList = await resultReadModel.listAssessmentResults({ userId });
  const resultDetail = await resultReadModel.getAssessmentResultDetail({
    userId,
    resultId: persistedResult!.resultId,
  });

  assert.equal(workspace.assessments.length, 1);
  assert.equal(workspace.assessments[0]?.status, 'ready');
  assert.equal(workspace.assessments[0]?.latestReadyResultId, persistedResult?.resultId);
  assert.equal(workspace.assessments[0]?.latestTopSignalTitle, payload.topSignal?.title ?? null);

  assert.equal(dashboard.readyResultCount, 1);
  assert.equal(dashboard.processingCount, 0);
  assert.equal(dashboard.latestReadyResult?.resultId, persistedResult?.resultId);
  assert.equal(dashboard.latestReadyResult?.topSignalTitle, payload.topSignal?.title ?? null);

  assert.equal(resultList.length, 1);
  assert.equal(resultList[0]?.resultId, persistedResult?.resultId);
  assert.equal(resultList[0]?.attemptId, started.attemptId);
  assert.equal(resultList[0]?.topSignal?.title, payload.topSignal?.title ?? null);

  assert.equal(resultDetail.resultId, persistedResult!.resultId);
  assert.equal(resultDetail.attemptId, started.attemptId);
  assert.equal(resultDetail.metadata.assessmentKey, 'wplp80');
  assert.equal(resultDetail.metadata.version, harness.publishedVersion.version);
  assert.equal(resultDetail.metadata.attemptId, started.attemptId);
  assert.equal(resultDetail.topSignal?.signalId, payload.topSignal?.signalId ?? null);

  harness.mutateDefinitionWeights();

  const resultListAfterDefinitionMutation = await resultReadModel.listAssessmentResults({ userId });
  const resultDetailAfterDefinitionMutation = await resultReadModel.getAssessmentResultDetail({
    userId,
    resultId: persistedResult!.resultId,
  });
  const workspaceAfterDefinitionMutation = await buildAssessmentWorkspaceViewModel({
    db: harness.db,
    userId,
  });
  const dashboardAfterDefinitionMutation = await buildDashboardViewModel({
    db: harness.db,
    userId,
  });

  assert.equal(JSON.stringify(resultListAfterDefinitionMutation), JSON.stringify(resultList));
  assert.equal(JSON.stringify(resultDetailAfterDefinitionMutation), JSON.stringify(resultDetail));
  assert.equal(
    workspaceAfterDefinitionMutation.assessments[0]?.latestTopSignalTitle,
    workspace.assessments[0]?.latestTopSignalTitle,
  );
  assert.equal(
    dashboardAfterDefinitionMutation.latestReadyResult?.topSignalTitle,
    dashboard.latestReadyResult?.topSignalTitle,
  );
});
