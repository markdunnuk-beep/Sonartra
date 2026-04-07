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

export type QaMiniAnswerPattern = 'all_a' | 'all_d' | 'style_a_mot_d';

export type QaMiniExpectedOutcome = {
  topSignalKey: string;
  rankedSignalKeys: readonly string[];
};

export type QaMiniFixture = {
  db: Queryable;
  assessment: AssessmentRow;
  publishedVersion: AssessmentVersionRow;
  questionCount: number;
  attempts: AttemptState[];
  responses: ResponseState[];
  results: ResultState[];
};

type QaMiniDefinition = {
  assessment: AssessmentRow;
  publishedVersion: AssessmentVersionRow;
  draftVersion: AssessmentVersionRow;
  domains: DomainRow[];
  signals: SignalRow[];
  questions: QuestionRow[];
  options: OptionRow[];
  optionSignalWeights: OptionSignalWeightRow[];
};

const BASE_TIMESTAMP = '2026-02-01T00:00:00.000Z';
const ASSESSMENT_ID = 'assessment-qa-mini';
const PUBLISHED_VERSION_ID = 'version-qa-mini-published';
const DRAFT_VERSION_ID = 'version-qa-mini-draft';

function createClock() {
  let tick = 0;

  return {
    next() {
      tick += 1;
      return `2026-02-01T00:${String(Math.floor(tick / 60)).padStart(2, '0')}:${String(tick % 60).padStart(2, '0')}.000Z`;
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

function createQaMiniDefinition(): QaMiniDefinition {
  const assessment: AssessmentRow = {
    id: ASSESSMENT_ID,
    assessment_key: 'qa-mini',
    title: 'QA Mini Assessment',
    description: 'Clean-room QA fixture for fast canonical runtime regression checks.',
    created_at: BASE_TIMESTAMP,
    updated_at: BASE_TIMESTAMP,
  };

  const publishedVersion: AssessmentVersionRow = {
    id: PUBLISHED_VERSION_ID,
    assessment_id: ASSESSMENT_ID,
    version: '1.0.0',
    lifecycle_status: 'PUBLISHED',
    published_at: BASE_TIMESTAMP,
    created_at: BASE_TIMESTAMP,
    updated_at: BASE_TIMESTAMP,
  };

  const draftVersion: AssessmentVersionRow = {
    id: DRAFT_VERSION_ID,
    assessment_id: ASSESSMENT_ID,
    version: '1.0.1-draft',
    lifecycle_status: 'DRAFT',
    published_at: null,
    created_at: BASE_TIMESTAMP,
    updated_at: BASE_TIMESTAMP,
  };

  const domains: DomainRow[] = [
    {
      id: 'domain-signal-style',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_key: 'signal_style',
      label: 'Behaviour',
      description: 'Behavioural response patterns',
      domain_type: 'SIGNAL_GROUP',
      order_index: 1,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
    {
      id: 'domain-signal-mot',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_key: 'signal_mot',
      label: 'Motivation',
      description: 'Motivational response patterns',
      domain_type: 'SIGNAL_GROUP',
      order_index: 2,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
  ];

  const signals: SignalRow[] = [
    {
      id: 'signal-style-driver',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_id: 'domain-signal-style',
      signal_key: 'style_driver',
      label: 'Driver',
      description: 'Moves first and sets pace',
      order_index: 1,
      is_overlay: false,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
    {
      id: 'signal-style-operator',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_id: 'domain-signal-style',
      signal_key: 'style_operator',
      label: 'Stabiliser',
      description: 'Prefers steadiness and consistency',
      order_index: 2,
      is_overlay: false,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
    {
      id: 'signal-mot-achievement',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_id: 'domain-signal-mot',
      signal_key: 'mot_achievement',
      label: 'Achievement',
      description: 'Energised by progress and stretch',
      order_index: 3,
      is_overlay: false,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
    {
      id: 'signal-mot-stability',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_id: 'domain-signal-mot',
      signal_key: 'mot_stability',
      label: 'Stability',
      description: 'Energised by consistency and predictability',
      order_index: 4,
      is_overlay: false,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
  ];

  const questions: QuestionRow[] = [
    {
      id: 'question-qa-mini-1',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_id: 'domain-signal-style',
      question_key: 'qa_mini_q01',
      prompt: 'When a new piece of work opens up, you usually:',
      order_index: 1,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
    {
      id: 'question-qa-mini-2',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_id: 'domain-signal-style',
      question_key: 'qa_mini_q02',
      prompt: 'In a changing situation, you tend to:',
      order_index: 2,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
    {
      id: 'question-qa-mini-3',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_id: 'domain-signal-mot',
      question_key: 'qa_mini_q03',
      prompt: 'The work environment that keeps you most engaged is:',
      order_index: 3,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
    {
      id: 'question-qa-mini-4',
      assessment_version_id: PUBLISHED_VERSION_ID,
      domain_id: 'domain-signal-mot',
      question_key: 'qa_mini_q04',
      prompt: 'The reward that keeps you moving is usually:',
      order_index: 4,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    },
  ];

  const optionSpecs = [
    {
      questionId: 'question-qa-mini-1',
      options: [
        ['A', 'Move immediately and shape the route in motion'],
        ['B', 'Start quickly but keep enough structure around it'],
        ['C', 'Slow down and keep the system steady first'],
        ['D', 'Protect continuity before changing direction'],
      ] as const,
    },
    {
      questionId: 'question-qa-mini-2',
      options: [
        ['A', 'Push for momentum and make the next move visible'],
        ['B', 'Advance, but with a practical checkpoint built in'],
        ['C', 'Hold the line and adapt in a measured way'],
        ['D', 'Keep the operating rhythm stable while things settle'],
      ] as const,
    },
    {
      questionId: 'question-qa-mini-3',
      options: [
        ['A', 'High stretch with visible progress markers'],
        ['B', 'Stretching work with some predictable footing'],
        ['C', 'Dependable work with some room to prove yourself'],
        ['D', 'Clear expectations and low-friction stability'],
      ] as const,
    },
    {
      questionId: 'question-qa-mini-4',
      options: [
        ['A', 'Winning, progress, and harder targets'],
        ['B', 'Progress with enough structure to sustain it'],
        ['C', 'Reliable delivery with some room to grow'],
        ['D', 'Consistency, certainty, and steady momentum'],
      ] as const,
    },
  ] as const;

  const options: OptionRow[] = optionSpecs.flatMap((questionSpec, questionIndex) =>
    questionSpec.options.map(([label, text], optionIndex) => ({
      id: `option-qa-mini-${questionIndex + 1}-${label.toLowerCase()}`,
      assessment_version_id: PUBLISHED_VERSION_ID,
      question_id: questionSpec.questionId,
      option_key: `qa_mini_q0${questionIndex + 1}_${label.toLowerCase()}`,
      option_label: label,
      option_text: text,
      order_index: optionIndex + 1,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    })),
  );

  const optionIdByKey = new Map(options.map((option) => [option.option_key, option.id]));
  const signalIdByKey = new Map(signals.map((signal) => [signal.signal_key, signal.id]));

  const weightSpecs: Array<{
    optionKey: string;
    weights: Array<[string, number]>;
  }> = [
    { optionKey: 'qa_mini_q01_a', weights: [['style_driver', 4], ['mot_achievement', 0.5]] },
    { optionKey: 'qa_mini_q01_b', weights: [['style_driver', 2], ['mot_achievement', 1], ['mot_stability', 1]] },
    { optionKey: 'qa_mini_q01_c', weights: [['style_operator', 2], ['mot_stability', 1], ['mot_achievement', 1]] },
    { optionKey: 'qa_mini_q01_d', weights: [['style_operator', 4], ['mot_stability', 0.5]] },
    { optionKey: 'qa_mini_q02_a', weights: [['style_driver', 4], ['mot_achievement', 0.5]] },
    { optionKey: 'qa_mini_q02_b', weights: [['style_driver', 2], ['mot_achievement', 1], ['mot_stability', 1]] },
    { optionKey: 'qa_mini_q02_c', weights: [['style_operator', 2], ['mot_stability', 1], ['mot_achievement', 1]] },
    { optionKey: 'qa_mini_q02_d', weights: [['style_operator', 4], ['mot_stability', 0.5]] },
    { optionKey: 'qa_mini_q03_a', weights: [['mot_achievement', 3], ['style_driver', 0.5]] },
    { optionKey: 'qa_mini_q03_b', weights: [['mot_achievement', 2], ['style_driver', 1], ['style_operator', 0.5]] },
    { optionKey: 'qa_mini_q03_c', weights: [['mot_stability', 2], ['style_operator', 1], ['style_driver', 0.5]] },
    { optionKey: 'qa_mini_q03_d', weights: [['mot_stability', 3], ['style_operator', 0.5]] },
    { optionKey: 'qa_mini_q04_a', weights: [['mot_achievement', 3], ['style_driver', 0.5]] },
    { optionKey: 'qa_mini_q04_b', weights: [['mot_achievement', 2], ['style_driver', 1], ['style_operator', 0.5]] },
    { optionKey: 'qa_mini_q04_c', weights: [['mot_stability', 2], ['style_operator', 1], ['style_driver', 0.5]] },
    { optionKey: 'qa_mini_q04_d', weights: [['mot_stability', 3], ['style_operator', 0.5]] },
  ];

  const optionSignalWeights: OptionSignalWeightRow[] = weightSpecs.flatMap((spec, specIndex) =>
    spec.weights.map(([signalKey, weight], weightIndex) => ({
      id: `weight-qa-mini-${specIndex + 1}-${weightIndex + 1}`,
      option_id: optionIdByKey.get(spec.optionKey) ?? '',
      signal_id: signalIdByKey.get(signalKey) ?? '',
      weight,
      source_weight_key: `${spec.optionKey}|${signalKey}`,
      created_at: BASE_TIMESTAMP,
      updated_at: BASE_TIMESTAMP,
    })),
  );

  return {
    assessment,
    publishedVersion,
    draftVersion,
    domains,
    signals,
    questions,
    options,
    optionSignalWeights,
  };
}

export function getQaMiniPatternLabels(pattern: QaMiniAnswerPattern): readonly ('A' | 'B' | 'C' | 'D')[] {
  switch (pattern) {
    case 'all_a':
      return ['A', 'A', 'A', 'A'];
    case 'all_d':
      return ['D', 'D', 'D', 'D'];
    case 'style_a_mot_d':
      return ['A', 'A', 'D', 'D'];
  }
}

export function getQaMiniExpectedOutcome(pattern: QaMiniAnswerPattern): QaMiniExpectedOutcome {
  switch (pattern) {
    case 'all_a':
      return {
        topSignalKey: 'style_driver',
        rankedSignalKeys: ['style_driver', 'mot_achievement', 'style_operator', 'mot_stability'],
      };
    case 'all_d':
      return {
        topSignalKey: 'style_operator',
        rankedSignalKeys: ['style_operator', 'mot_stability', 'style_driver', 'mot_achievement'],
      };
    case 'style_a_mot_d':
      return {
        topSignalKey: 'style_driver',
        rankedSignalKeys: ['style_driver', 'mot_stability', 'style_operator', 'mot_achievement'],
      };
  }
}

export function createQaMiniPublishedAssessmentFixture(): QaMiniFixture {
  const definition = createQaMiniDefinition();
  const { assessment, publishedVersion, draftVersion, domains, signals, questions, options, optionSignalWeights } =
    definition;
  const clock = createClock();

  const questionsByVersionId = new Map<string, QuestionRow[]>([
    [publishedVersion.id, questions],
    [
      draftVersion.id,
      [{
        id: 'question-qa-mini-draft',
        assessment_version_id: draftVersion.id,
        domain_id: domains[0]!.id,
        question_key: 'qa_mini_draft_q01',
        prompt: 'Draft-only QA mini question',
        order_index: 1,
        created_at: BASE_TIMESTAMP,
        updated_at: BASE_TIMESTAMP,
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
        return { rows: (params?.[0] === assessment.assessment_key ? [assessment] : []) as T[] };
      }

      if (sql.includes('FROM assessment_versions WHERE assessment_id = $1 AND lifecycle_status = \'PUBLISHED\'')) {
        return { rows: (params?.[0] === assessment.id ? [publishedVersion] : []) as T[] };
      }

      if (sql.includes('FROM assessment_versions WHERE id = $1')) {
        const version = [publishedVersion, draftVersion].find((entry) => entry.id === params?.[0]);
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
        const version = [publishedVersion, draftVersion].find((entry) => entry.id === params?.[0]);
        return { rows: (version ? [{ a: assessment, v: version }] : []) as T[] };
      }

      if (sql.includes('FROM domains WHERE assessment_version_id = $1 ORDER BY order_index ASC, id ASC')) {
        return { rows: [...(params?.[0] === publishedVersion.id ? domains : [])] as T[] };
      }

      if (sql.includes('FROM signals WHERE assessment_version_id = $1 ORDER BY order_index ASC, id ASC')) {
        return { rows: [...(params?.[0] === publishedVersion.id ? signals : [])] as T[] };
      }

      if (sql.includes('FROM questions WHERE assessment_version_id = $1 ORDER BY order_index ASC, id ASC')) {
        return { rows: [...(questionsByVersionId.get(params?.[0] as string) ?? [])] as T[] };
      }

      if (sql.includes('FROM options o INNER JOIN questions q ON q.id = o.question_id WHERE q.assessment_version_id = $1 ORDER BY q.order_index ASC, o.order_index ASC, o.id ASC')) {
        if (params?.[0] !== publishedVersion.id) {
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
        if (params?.[0] !== publishedVersion.id) {
          return { rows: [] as T[] };
        }

        const optionIds = new Set(options.map((option) => option.id));
        return {
          rows: optionSignalWeights.filter((weight) => optionIds.has(weight.option_id)) as T[],
        };
      }

      if (sql.includes('FROM assessments a INNER JOIN assessment_versions av ON av.assessment_id = a.id WHERE a.assessment_key = $1 AND av.lifecycle_status = \'PUBLISHED\'')) {
        if (params?.[0] !== assessment.assessment_key) {
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
        const [userId, assessmentId] = params as [string, string];
        const attempt = attempts
          .filter((entry) => entry.userId === userId && entry.assessmentId === assessmentId && entry.lifecycleStatus === 'IN_PROGRESS')
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.attemptId.localeCompare(left.attemptId))[0];
        return { rows: (attempt ? [toAttemptSummaryRow(attempt)] : []) as T[] };
      }

      if (sql.includes('FROM attempts WHERE user_id = $1 AND assessment_id = $2 ORDER BY created_at DESC, id DESC')) {
        const [userId, assessmentId] = params as [string, string];
        const attempt = attempts
          .filter((entry) => entry.userId === userId && entry.assessmentId === assessmentId)
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
        return {
          rows: ([{ total_questions: (questionsByVersionId.get(params?.[0] as string) ?? []).length }] as unknown[]) as T[],
        };
      }

      if (sql.includes('INSERT INTO attempts ( user_id, assessment_id, assessment_version_id, lifecycle_status ) VALUES ($1, $2, $3, \'IN_PROGRESS\')')) {
        const [userId, assessmentId, assessmentVersionId] = params as [string, string, string];
        attemptSequence += 1;
        const now = clock.next();
        const attempt: AttemptState = {
          attemptId: `attempt-qa-mini-${attemptSequence}`,
          userId,
          assessmentId,
          assessmentVersionId,
          lifecycleStatus: 'IN_PROGRESS',
          startedAt: now,
          submittedAt: null,
          completedAt: null,
          lastActivityAt: now,
          createdAt: now,
          updatedAt: now,
        };
        attempts.push(attempt);
        return { rows: ([toAttemptSummaryRow(attempt)] as unknown[]) as T[] };
      }

      if (sql.includes('FROM attempts t INNER JOIN assessments a ON a.id = t.assessment_id INNER JOIN assessment_versions av ON av.id = t.assessment_version_id WHERE t.id = $1')) {
        const attempt = attempts.find((entry) => entry.attemptId === params?.[0]);
        return {
          rows: (attempt
            ? [toRunnerAttemptRow(attempt, assessment, attempt.assessmentVersionId === publishedVersion.id ? publishedVersion : draftVersion)]
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
          attempt?.assessmentVersionId === publishedVersion.id &&
          questions.some((question) => question.id === questionId) &&
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
            responseId: `response-qa-mini-${responseSequence}`,
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
        const attempt = attempts.find((entry) => entry.attemptId === params?.[0]);
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
        const attempt = attempts.find((entry) => entry.attemptId === params?.[0]);
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
        const attempt = attempts.find((entry) => entry.attemptId === params?.[0]);
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
        const attempt = attempts.find((entry) => entry.attemptId === params?.[0]);
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
        const [attemptId, assessmentId, assessmentVersionId] = params as [string, string, string];
        const now = clock.next();
        let result = results.find((entry) => entry.attemptId === attemptId);
        if (!result) {
          resultSequence += 1;
          result = {
            resultId: `result-qa-mini-${resultSequence}`,
            attemptId,
            assessmentId,
            assessmentVersionId,
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
        const [attemptId, assessmentId, assessmentVersionId, payloadString] = params as [string, string, string, string];
        const now = clock.next();
        const payload = JSON.parse(payloadString);
        let result = results.find((entry) => entry.attemptId === attemptId);
        if (!result) {
          resultSequence += 1;
          result = {
            resultId: `result-qa-mini-${resultSequence}`,
            attemptId,
            assessmentId,
            assessmentVersionId,
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
        const [attemptId, assessmentId, assessmentVersionId, failureReason] = params as [string, string, string, string];
        const now = clock.next();
        let result = results.find((entry) => entry.attemptId === attemptId);
        if (!result) {
          resultSequence += 1;
          result = {
            resultId: `result-qa-mini-${resultSequence}`,
            attemptId,
            assessmentId,
            assessmentVersionId,
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

      if (sql.includes('FROM assessment_version_intro WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_pair_trait_weights WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_hero_pattern_rules WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_hero_pattern_language WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_language_signals WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_language_pairs WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_language_domains WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_language_overview WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_language_hero_headers WHERE assessment_version_id = $1')) {
        return { rows: [] as T[] };
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
            version_tag: publishedVersion.version,
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
            version_tag: publishedVersion.version,
            readiness_status: 'READY',
            generated_at: result.generatedAt,
            created_at: result.createdAt,
            canonical_result_payload: result.canonicalResultPayload,
          }] as unknown[]) as T[],
        };
      }

      throw new Error(`Unhandled SQL in qa-mini fixture: ${sql}`);
    },
  };

  return {
    db,
    assessment,
    publishedVersion,
    questionCount: questions.length,
    attempts,
    responses,
    results,
  };
}
