import type {
  DomainId,
  DomainKey,
  OptionId,
  QuestionId,
  QuestionKey,
  RuntimeAssessmentDefinition,
  RuntimeDomain,
  RuntimeExecutionIndexes,
  RuntimeOption,
  RuntimeQuestion,
  RuntimeSignal,
  SignalId,
  SignalKey,
} from '@/lib/engine/types';

type KeyedEntity<TId extends string, TKey extends string> = {
  id: TId;
  key: TKey;
};

type LookupRecord<TKey extends string, TValue> = Record<TKey, TValue>;

function freezeLookup<TKey extends string, TValue>(lookup: LookupRecord<TKey, TValue>): Readonly<LookupRecord<TKey, TValue>> {
  return Object.freeze(lookup);
}

function sortByOrderIndex<T extends { orderIndex: number; id: string; key: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex;
    }

    if (left.key !== right.key) {
      return left.key.localeCompare(right.key);
    }

    return left.id.localeCompare(right.id);
  });
}

function buildLookupById<TId extends string, TKey extends string, TValue extends KeyedEntity<TId, TKey>>(
  items: readonly TValue[],
): Readonly<LookupRecord<TId, TValue>> {
  const lookup = {} as LookupRecord<TId, TValue>;

  for (const item of items) {
    lookup[item.id] = item;
  }

  return freezeLookup(lookup);
}

function buildLookupByKey<TId extends string, TKey extends string, TValue extends KeyedEntity<TId, TKey>>(
  items: readonly TValue[],
): Readonly<LookupRecord<TKey, TValue>> {
  const lookup = {} as LookupRecord<TKey, TValue>;

  for (const item of items) {
    lookup[item.key] = item;
  }

  return freezeLookup(lookup);
}

export function getOrderedDomains(definition: RuntimeAssessmentDefinition): readonly RuntimeDomain[] {
  return Object.freeze(sortByOrderIndex(definition.domains));
}

export function getOrderedSignals(definition: RuntimeAssessmentDefinition): readonly RuntimeSignal[] {
  return Object.freeze(sortByOrderIndex(definition.signals));
}

export function getOrderedQuestions(definition: RuntimeAssessmentDefinition): readonly RuntimeQuestion[] {
  return Object.freeze(sortByOrderIndex(definition.questions));
}

export function getOrderedOptions(definition: RuntimeAssessmentDefinition): readonly RuntimeOption[] {
  const orderedQuestions = getOrderedQuestions(definition);
  const orderedOptions = orderedQuestions.flatMap((question) => sortByOrderIndex(question.options));

  return Object.freeze(orderedOptions);
}

export function buildDomainIndexes(domains: readonly RuntimeDomain[]): {
  domainById: Readonly<Record<DomainId, RuntimeDomain>>;
  domainByKey: Readonly<Record<DomainKey, RuntimeDomain>>;
} {
  return {
    domainById: buildLookupById(domains),
    domainByKey: buildLookupByKey(domains),
  };
}

export function buildSignalIndexes(signals: readonly RuntimeSignal[]): {
  signalById: Readonly<Record<SignalId, RuntimeSignal>>;
  signalByKey: Readonly<Record<SignalKey, RuntimeSignal>>;
} {
  return {
    signalById: buildLookupById(signals),
    signalByKey: buildLookupByKey(signals),
  };
}

export function buildQuestionIndexes(questions: readonly RuntimeQuestion[]): {
  questionById: Readonly<Record<QuestionId, RuntimeQuestion>>;
  questionByKey: Readonly<Record<QuestionKey, RuntimeQuestion>>;
} {
  return {
    questionById: buildLookupById(questions),
    questionByKey: buildLookupByKey(questions),
  };
}

export function buildOptionIndexes(
  questions: readonly RuntimeQuestion[],
  options: readonly RuntimeOption[],
): {
  optionById: Readonly<Record<OptionId, RuntimeOption>>;
  optionsByQuestionId: Readonly<Record<QuestionId, readonly RuntimeOption[]>>;
} {
  const optionsByQuestionId = {} as Record<QuestionId, readonly RuntimeOption[]>;

  for (const question of questions) {
    optionsByQuestionId[question.id] = Object.freeze(sortByOrderIndex(question.options));
  }

  return {
    optionById: buildLookupById(options),
    optionsByQuestionId: freezeLookup(optionsByQuestionId),
  };
}

export function buildRuntimeExecutionIndexes(
  definition: RuntimeAssessmentDefinition,
): {
  indexes: RuntimeExecutionIndexes;
  domains: readonly RuntimeDomain[];
  signals: readonly RuntimeSignal[];
  questions: readonly RuntimeQuestion[];
  options: readonly RuntimeOption[];
} {
  const domains = getOrderedDomains(definition);
  const signals = getOrderedSignals(definition);
  const questions = getOrderedQuestions(definition);
  const options = getOrderedOptions(definition);

  const domainIndexes = buildDomainIndexes(domains);
  const signalIndexes = buildSignalIndexes(signals);
  const questionIndexes = buildQuestionIndexes(questions);
  const optionIndexes = buildOptionIndexes(questions, options);

  return {
    indexes: Object.freeze({
      ...domainIndexes,
      ...signalIndexes,
      ...questionIndexes,
      ...optionIndexes,
    }),
    domains,
    signals,
    questions,
    options,
  };
}
