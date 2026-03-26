import { buildRuntimeExecutionIndexes } from '@/lib/engine/runtime-indexes';
import type {
  RuntimeAssessmentDefinition,
  RuntimeExecutionModel,
  RuntimeOption,
  RuntimeQuestion,
  RuntimeSignal,
} from '@/lib/engine/types';

export type RuntimeExecutionModelValidationCode =
  | 'duplicate_domain_id'
  | 'duplicate_domain_key'
  | 'duplicate_signal_id'
  | 'duplicate_signal_key'
  | 'duplicate_question_id'
  | 'duplicate_question_key'
  | 'duplicate_option_id'
  | 'duplicate_option_key'
  | 'missing_question_domain'
  | 'missing_signal_domain'
  | 'missing_option_question'
  | 'inconsistent_option_question'
  | 'missing_weight_signal'
  | 'orphan_domain'
  | 'orphan_question'
  | 'orphan_option'
  | 'orphan_signal';

export class RuntimeExecutionModelValidationError extends Error {
  readonly code: RuntimeExecutionModelValidationCode;

  constructor(code: RuntimeExecutionModelValidationCode, message: string) {
    super(message);
    this.name = 'RuntimeExecutionModelValidationError';
    this.code = code;
  }
}

function assertUniqueIdsAndKeys<
  TEntity extends {
    id: string;
    key: string;
  },
>(
  entityName: 'domain' | 'signal' | 'question' | 'option',
  items: readonly TEntity[],
): void {
  const ids = new Set<string>();
  const keys = new Set<string>();

  for (const item of items) {
    if (ids.has(item.id)) {
      throw new RuntimeExecutionModelValidationError(
        `duplicate_${entityName}_id`,
        `Duplicate ${entityName} id detected: ${item.id}`,
      );
    }

    if (keys.has(item.key)) {
      throw new RuntimeExecutionModelValidationError(
        `duplicate_${entityName}_key`,
        `Duplicate ${entityName} key detected: ${item.key}`,
      );
    }

    ids.add(item.id);
    keys.add(item.key);
  }
}

function validateSignalRelationships(
  signals: readonly RuntimeSignal[],
  domainIds: ReadonlySet<string>,
  referencedSignalIds: ReadonlySet<string>,
): void {
  for (const signal of signals) {
    if (!domainIds.has(signal.domainId)) {
      throw new RuntimeExecutionModelValidationError(
        'missing_signal_domain',
        `Signal ${signal.id} references missing domain ${signal.domainId}`,
      );
    }

    if (!referencedSignalIds.has(signal.id)) {
      throw new RuntimeExecutionModelValidationError(
        'orphan_signal',
        `Signal ${signal.id} is not referenced by any option signal weight`,
      );
    }
  }
}

function validateQuestionRelationships(
  questions: readonly RuntimeQuestion[],
  domainIds: ReadonlySet<string>,
): void {
  for (const question of questions) {
    if (!domainIds.has(question.domainId)) {
      throw new RuntimeExecutionModelValidationError(
        'missing_question_domain',
        `Question ${question.id} references missing domain ${question.domainId}`,
      );
    }

    if (question.options.length === 0) {
      throw new RuntimeExecutionModelValidationError(
        'orphan_question',
        `Question ${question.id} has no options`,
      );
    }
  }
}

function validateOptionRelationships(
  questions: readonly RuntimeQuestion[],
  questionIds: ReadonlySet<string>,
  signalIds: ReadonlySet<string>,
): ReadonlySet<string> {
  const referencedSignalIds = new Set<string>();
  const seenOptionIds = new Set<string>();

  for (const question of questions) {
    for (const option of question.options) {
      if (seenOptionIds.has(option.id)) {
        continue;
      }

      seenOptionIds.add(option.id);

      if (!questionIds.has(option.questionId)) {
        throw new RuntimeExecutionModelValidationError(
          'missing_option_question',
          `Option ${option.id} references missing question ${option.questionId}`,
        );
      }

      if (option.questionId !== question.id) {
        throw new RuntimeExecutionModelValidationError(
          'inconsistent_option_question',
          `Option ${option.id} is attached to question ${question.id} but references ${option.questionId}`,
        );
      }

      if (option.signalWeights.length === 0) {
        throw new RuntimeExecutionModelValidationError(
          'orphan_option',
          `Option ${option.id} has no signal weights`,
        );
      }

      for (const weight of option.signalWeights) {
        if (!signalIds.has(weight.signalId)) {
          throw new RuntimeExecutionModelValidationError(
            'missing_weight_signal',
            `Option ${option.id} references missing signal ${weight.signalId}`,
          );
        }

        referencedSignalIds.add(weight.signalId);
      }
    }
  }

  return referencedSignalIds;
}

function validateDomainsHaveRelationships(
  definition: RuntimeAssessmentDefinition,
  referencedDomainIds: ReadonlySet<string>,
): void {
  for (const domain of definition.domains) {
    if (!referencedDomainIds.has(domain.id)) {
      throw new RuntimeExecutionModelValidationError(
        'orphan_domain',
        `Domain ${domain.id} is not referenced by any question or signal`,
      );
    }
  }
}

function validateDefinition(definition: RuntimeAssessmentDefinition): void {
  assertUniqueIdsAndKeys('domain', definition.domains);
  assertUniqueIdsAndKeys('signal', definition.signals);
  assertUniqueIdsAndKeys('question', definition.questions);

  const allOptions = definition.questions.flatMap((question) => question.options);
  assertUniqueIdsAndKeys('option', allOptions);

  const domainIds = new Set(definition.domains.map((domain) => domain.id));
  const signalIds = new Set(definition.signals.map((signal) => signal.id));
  const questionIds = new Set(definition.questions.map((question) => question.id));

  validateQuestionRelationships(definition.questions, domainIds);

  const referencedSignalIds = validateOptionRelationships(definition.questions, questionIds, signalIds);
  validateSignalRelationships(definition.signals, domainIds, referencedSignalIds);

  const referencedDomainIds = new Set<string>();
  for (const question of definition.questions) {
    referencedDomainIds.add(question.domainId);
  }

  for (const signal of definition.signals) {
    referencedDomainIds.add(signal.domainId);
  }

  validateDomainsHaveRelationships(definition, referencedDomainIds);
}

export function loadRuntimeExecutionModel(
  definition: RuntimeAssessmentDefinition,
): RuntimeExecutionModel {
  validateDefinition(definition);

  const { indexes, domains, signals, questions, options } = buildRuntimeExecutionIndexes(definition);

  return Object.freeze({
    definition,
    indexes,
    domains,
    signals,
    questions,
    options,
  });
}
