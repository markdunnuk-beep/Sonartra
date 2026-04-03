import { isCanonicalResultPayload } from '@/lib/engine/result-contract';
import type {
  CanonicalResultPayload,
  EngineLanguageBundle,
  NormalizedSignalScore,
  RuntimeExecutionModel,
} from '@/lib/engine/types';

export type EngineDiagnosticSeverity = 'error' | 'warning';

export type EngineDiagnosticScope =
  | 'assessment_structure'
  | 'weights'
  | 'language'
  | 'normalization'
  | 'result_payload';

export type EngineDiagnosticIssue = {
  code: string;
  message: string;
  severity: EngineDiagnosticSeverity;
  scope: EngineDiagnosticScope;
};

function createIssue(
  scope: EngineDiagnosticScope,
  severity: EngineDiagnosticSeverity,
  code: string,
  message: string,
): EngineDiagnosticIssue {
  return { code, message, severity, scope };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateAssessmentStructure(runtimeModel: RuntimeExecutionModel): readonly EngineDiagnosticIssue[] {
  const issues: EngineDiagnosticIssue[] = [];
  const domainIds = new Set(runtimeModel.domains.map((domain) => domain.id));
  const signalIds = new Set(runtimeModel.signals.map((signal) => signal.id));
  const questionIds = new Set(runtimeModel.questions.map((question) => question.id));
  const optionIds = new Set<string>();

  if (runtimeModel.questions.length === 0) {
    issues.push(
      createIssue(
        'assessment_structure',
        'error',
        'missing_questions',
        'The runtime model has no questions, so the assessment cannot run.',
      ),
    );
  }

  if (runtimeModel.signals.length === 0) {
    issues.push(
      createIssue(
        'assessment_structure',
        'error',
        'missing_signals',
        'The runtime model has no signals, so deterministic scoring cannot run.',
      ),
    );
  }

  for (const signal of runtimeModel.signals) {
    if (!domainIds.has(signal.domainId)) {
      issues.push(
        createIssue(
          'assessment_structure',
          'error',
          'signal_missing_domain',
          `Signal ${signal.key} references missing domain ${signal.domainId}.`,
        ),
      );
    }
  }

  for (const question of runtimeModel.questions) {
    if (!domainIds.has(question.domainId)) {
      issues.push(
        createIssue(
          'assessment_structure',
          'error',
          'question_missing_domain',
          `Question ${question.key} references missing domain ${question.domainId}.`,
        ),
      );
    }

    if (question.options.length === 0) {
      issues.push(
        createIssue(
          'assessment_structure',
          'error',
          'question_missing_options',
          `Question ${question.key} has no options.`,
        ),
      );
    }

    for (const option of question.options) {
      if (optionIds.has(option.id)) {
        issues.push(
          createIssue(
            'assessment_structure',
            'error',
            'duplicate_option_id',
            `Option ${option.id} appears more than once in the runtime model.`,
          ),
        );
      } else {
        optionIds.add(option.id);
      }

      if (!questionIds.has(option.questionId)) {
        issues.push(
          createIssue(
            'assessment_structure',
            'error',
            'option_missing_question',
            `Option ${option.key} references missing question ${option.questionId}.`,
          ),
        );
      }

      if (option.questionId !== question.id) {
        issues.push(
          createIssue(
            'assessment_structure',
            'error',
            'option_question_mismatch',
            `Option ${option.key} is attached to ${question.key} but references ${option.questionId}.`,
          ),
        );
      }

      for (const weight of option.signalWeights) {
        if (!signalIds.has(weight.signalId)) {
          issues.push(
            createIssue(
              'assessment_structure',
              'error',
              'weight_missing_signal',
              `Option ${option.key} references missing signal ${weight.signalId}.`,
            ),
          );
        }
      }
    }
  }

  return Object.freeze(issues);
}

export function validateWeights(runtimeModel: RuntimeExecutionModel): readonly EngineDiagnosticIssue[] {
  const issues: EngineDiagnosticIssue[] = [];
  const signalIds = new Set(runtimeModel.signals.map((signal) => signal.id));

  for (const option of runtimeModel.options) {
    if (option.signalWeights.length === 0) {
      issues.push(
        createIssue(
          'weights',
          'error',
          'option_missing_weights',
          `Option ${option.key} has no option_signal_weights mappings.`,
        ),
      );
      continue;
    }

    for (const weight of option.signalWeights) {
      if (!signalIds.has(weight.signalId)) {
        issues.push(
          createIssue(
            'weights',
            'error',
            'weight_signal_missing',
            `Option ${option.key} maps to unknown signal ${weight.signalId}.`,
          ),
        );
      }

      if (!isFiniteNumber(weight.weight)) {
        issues.push(
          createIssue(
            'weights',
            'error',
            'weight_not_numeric',
            `Option ${option.key} has a non-numeric weight for signal ${weight.signalId}.`,
          ),
        );
      }
    }
  }

  return Object.freeze(issues);
}

export function validateLanguageCoverage(languageConfig: EngineLanguageBundle): readonly EngineDiagnosticIssue[] {
  const issues: EngineDiagnosticIssue[] = [];

  if (Object.keys(languageConfig.signals).length === 0) {
    issues.push(
      createIssue(
        'language',
        'warning',
        'missing_signal_language',
        'No signal language rows are available. Engine output will fall back to generic signal text.',
      ),
    );
  }

  if (Object.keys(languageConfig.domains).length === 0) {
    issues.push(
      createIssue(
        'language',
        'warning',
        'missing_domain_language',
        'No domain language rows are available. Domain summaries will rely on fallback interpretation only.',
      ),
    );
  }

  if (Object.keys(languageConfig.overview).length === 0) {
    issues.push(
      createIssue(
        'language',
        'warning',
        'missing_overview_language',
        'No overview language rows are available. Overview copy will rely on fallback interpretation only.',
      ),
    );
  }

  return Object.freeze(issues);
}

export function validateNormalization(
  scores: readonly NormalizedSignalScore[],
): readonly EngineDiagnosticIssue[] {
  const issues: EngineDiagnosticIssue[] = [];

  if (scores.length === 0) {
    issues.push(
      createIssue(
        'normalization',
        'error',
        'missing_normalized_scores',
        'No normalized scores were produced.',
      ),
    );
    return Object.freeze(issues);
  }

  const rankSet = new Set<number>();
  const domainTotals = new Map<string, { percentage: number; hasPositiveMass: boolean }>();
  let totalPercentage = 0;
  let hasPositiveMass = false;

  for (const score of scores) {
    if (!isFiniteNumber(score.normalizedValue) || !isFiniteNumber(score.percentage) || !isFiniteNumber(score.domainPercentage)) {
      issues.push(
        createIssue(
          'normalization',
          'error',
          'normalization_not_numeric',
          `Signal ${score.signalKey} has a non-numeric normalized value or percentage.`,
        ),
      );
    }

    if (score.percentage < 0 || score.percentage > 100 || score.domainPercentage < 0 || score.domainPercentage > 100) {
      issues.push(
        createIssue(
          'normalization',
          'error',
          'normalization_out_of_range',
          `Signal ${score.signalKey} has a normalized percentage outside the 0-100 range.`,
        ),
      );
    }

    if (!Number.isInteger(score.rank) || score.rank < 1) {
      issues.push(
        createIssue(
          'normalization',
          'error',
          'invalid_rank',
          `Signal ${score.signalKey} has an invalid rank value.`,
        ),
      );
    } else if (rankSet.has(score.rank)) {
      issues.push(
        createIssue(
          'normalization',
          'error',
          'duplicate_rank',
          `Multiple signals share rank ${score.rank}.`,
        ),
      );
    } else {
      rankSet.add(score.rank);
    }

    totalPercentage += score.percentage;
    hasPositiveMass ||= score.rawTotal > 0;

    const current = domainTotals.get(score.domainId) ?? { percentage: 0, hasPositiveMass: false };
    current.percentage += score.domainPercentage;
    current.hasPositiveMass ||= score.rawTotal > 0;
    domainTotals.set(score.domainId, current);
  }

  if (hasPositiveMass && totalPercentage !== 100) {
    issues.push(
      createIssue(
        'normalization',
        'error',
        'global_percentage_sum_invalid',
        `Normalized signal percentages sum to ${totalPercentage}, but must sum to 100 when score mass exists.`,
      ),
    );
  }

  for (const [domainId, domainTotal] of domainTotals) {
    if (domainTotal.hasPositiveMass && domainTotal.percentage !== 100) {
      issues.push(
        createIssue(
          'normalization',
          'error',
          'domain_percentage_sum_invalid',
          `Domain ${domainId} percentages sum to ${domainTotal.percentage}, but must sum to 100 when that domain has score mass.`,
        ),
      );
    }
  }

  const sortedScores = [...scores].sort((left, right) => left.rank - right.rank);
  const topScore = sortedScores[0];
  const secondScore = sortedScores[1] ?? null;
  if (
    topScore &&
    secondScore &&
    topScore.percentage >= 70 &&
    topScore.percentage - secondScore.percentage >= 40
  ) {
    issues.push(
      createIssue(
        'normalization',
        'warning',
        'uneven_distribution',
        `Signal distribution is heavily concentrated in ${topScore.signalKey}. Review whether the weighting spread is intentional.`,
      ),
    );
  }

  return Object.freeze(issues);
}

export function validateResultPayload(result: unknown): readonly EngineDiagnosticIssue[] {
  const issues: EngineDiagnosticIssue[] = [];

  if (!isCanonicalResultPayload(result)) {
    issues.push(
      createIssue(
        'result_payload',
        'error',
        'result_payload_incomplete',
        'The engine output is missing required canonical result payload fields.',
      ),
    );
    return Object.freeze(issues);
  }

  const payload = result as CanonicalResultPayload;

  if (!payload.metadata.assessmentKey || !payload.metadata.version || !payload.metadata.attemptId) {
    issues.push(
      createIssue(
        'result_payload',
        'error',
        'result_metadata_incomplete',
        'Result metadata must include assessmentKey, version, and attemptId.',
      ),
    );
  }

  if (!payload.intro || typeof payload.intro !== 'object') {
    issues.push(
      createIssue(
        'result_payload',
        'error',
        'result_intro_missing',
        'Result payload must include an intro section.',
      ),
    );
  }

  if (!payload.hero || typeof payload.hero !== 'object') {
    issues.push(
      createIssue(
        'result_payload',
        'error',
        'result_hero_missing',
        'Result payload must include a hero section.',
      ),
    );
  }

  if (!Array.isArray(payload.domains) || payload.domains.length === 0) {
    issues.push(
      createIssue(
        'result_payload',
        'error',
        'result_domains_missing',
        'Result payload must include at least one domain chapter.',
      ),
    );
  }

  if (
    !payload.actions ||
    typeof payload.actions !== 'object' ||
    !Array.isArray(payload.actions.strengths) ||
    !Array.isArray(payload.actions.watchouts) ||
    !Array.isArray(payload.actions.developmentFocus)
  ) {
    issues.push(
      createIssue(
        'result_payload',
        'error',
        'result_sections_invalid',
        'Result payload must include actions.strengths, actions.watchouts, and actions.developmentFocus arrays.',
      ),
    );
  }

  return Object.freeze(issues);
}
