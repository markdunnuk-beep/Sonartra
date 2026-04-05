import type {
  AssessmentRecord,
  AssessmentVersionRecord,
  RuntimeAssessmentDefinition,
  RuntimeAssessmentIntro,
  RuntimeDomain,
  RuntimeHeroDefinition,
  RuntimeHeroPatternLanguage,
  RuntimeHeroPatternRule,
  RuntimeHeroRuleCondition,
  RuntimeOption,
  RuntimeOptionSignalWeight,
  RuntimePairTraitWeight,
  RuntimeQuestion,
  RuntimeSignal,
  SignalOverlayType,
} from '@/lib/engine/types';
import type {
  AssessmentRow,
  AssessmentVersionRow,
  AssessmentIntroRow,
  DefinitionGraphRows,
  DomainRow,
  HeroPatternLanguageRow,
  HeroPatternRuleRow,
  OptionRow,
  OptionSignalWeightRow,
  PairTraitWeightRow,
  QuestionRow,
  SignalRow,
} from '@/lib/engine/repository-sql';

export class DefinitionGraphIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DefinitionGraphIntegrityError';
  }
}

function mapOverlayType(signal: SignalRow): SignalOverlayType {
  if (!signal.is_overlay) {
    return 'none';
  }

  if (signal.signal_key.startsWith('decision_')) {
    return 'decision';
  }

  if (signal.signal_key.startsWith('role_')) {
    return 'role';
  }

  return 'decision';
}

export function mapAssessmentRecord(row: AssessmentRow): AssessmentRecord {
  return {
    id: row.id,
    key: row.assessment_key,
    title: row.title,
    description: row.description,
    estimatedTimeMinutes: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAssessmentVersionRecord(row: AssessmentVersionRow): AssessmentVersionRecord {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    versionTag: row.version,
    status: row.lifecycle_status.toLowerCase() as AssessmentVersionRecord['status'],
    isPublished: row.lifecycle_status === 'PUBLISHED',
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRuntimeAssessmentIntro(row: AssessmentIntroRow): RuntimeAssessmentIntro {
  return {
    introTitle: row.intro_title,
    introSummary: row.intro_summary,
    introHowItWorks: row.intro_how_it_works,
    estimatedTimeOverride: row.estimated_time_override,
    instructions: row.instructions,
    confidentialityNote: row.confidentiality_note,
  };
}

export function mapRuntimeDomain(row: DomainRow): RuntimeDomain {
  return {
    id: row.id,
    key: row.domain_key,
    title: row.label,
    description: row.description,
    source: row.domain_type === 'QUESTION_SECTION' ? 'question_section' : 'signal_group',
    orderIndex: row.order_index,
  };
}

export function mapRuntimeSignal(row: SignalRow): RuntimeSignal {
  return {
    id: row.id,
    key: row.signal_key,
    title: row.label,
    description: row.description,
    domainId: row.domain_id,
    orderIndex: row.order_index,
    isOverlay: row.is_overlay,
    overlayType: mapOverlayType(row),
  };
}

export function mapRuntimeQuestion(row: QuestionRow): RuntimeQuestion {
  return {
    id: row.id,
    key: row.question_key,
    prompt: row.prompt,
    description: null,
    domainId: row.domain_id,
    orderIndex: row.order_index,
    options: [],
  };
}

export function mapRuntimeOption(row: OptionRow): RuntimeOption {
  return {
    id: row.id,
    key: row.option_key,
    label: row.option_text,
    description: row.option_label,
    questionId: row.question_id,
    orderIndex: row.order_index,
    signalWeights: [],
  };
}

export function mapRuntimeOptionSignalWeight(row: OptionSignalWeightRow): RuntimeOptionSignalWeight {
  return {
    signalId: row.signal_id,
    weight: Number(row.weight),
    reverseFlag: false,
    sourceWeightKey: row.source_weight_key,
  };
}

function mapRuntimePairTraitWeight(row: PairTraitWeightRow): RuntimePairTraitWeight {
  return {
    profileDomainKey: row.profile_domain_key as RuntimePairTraitWeight['profileDomainKey'],
    pairKey: row.pair_key,
    traitKey: row.trait_key as RuntimePairTraitWeight['traitKey'],
    weight: Number(row.weight),
    orderIndex: row.order_index,
  };
}

function mapRuntimeHeroRuleCondition(row: HeroPatternRuleRow): RuntimeHeroRuleCondition {
  return {
    traitKey: row.trait_key as RuntimeHeroRuleCondition['traitKey'],
    operator: row.operator as RuntimeHeroRuleCondition['operator'],
    value: Number(row.threshold_value),
  };
}

function mapRuntimeHeroPatternRules(rows: readonly HeroPatternRuleRow[]): readonly RuntimeHeroPatternRule[] {
  const grouped = new Map<string, { priority: number; conditions: RuntimeHeroRuleCondition[]; exclusions: RuntimeHeroRuleCondition[] }>();

  for (const row of rows) {
    const existing = grouped.get(row.pattern_key) ?? {
      priority: Number(row.priority),
      conditions: [],
      exclusions: [],
    };

    if (existing.priority !== Number(row.priority)) {
      throw new DefinitionGraphIntegrityError(`Hero pattern ${row.pattern_key} has inconsistent priorities.`);
    }

    const target = row.rule_type === 'exclusion' ? existing.exclusions : existing.conditions;
    target.push(mapRuntimeHeroRuleCondition(row));
    grouped.set(row.pattern_key, existing);
  }

  return Object.freeze(
    [...grouped.entries()]
      .map(([patternKey, value]) => ({
        patternKey,
        priority: value.priority,
        conditions: Object.freeze(value.conditions),
        exclusions: Object.freeze(value.exclusions),
      }))
      .sort((left, right) => left.priority - right.priority || left.patternKey.localeCompare(right.patternKey)),
  );
}

function mapRuntimeHeroPatternLanguage(row: HeroPatternLanguageRow): RuntimeHeroPatternLanguage {
  return {
    patternKey: row.pattern_key,
    headline: row.headline,
    subheadline: row.subheadline,
    summary: row.summary,
    narrative: row.narrative,
    pressureOverlay: row.pressure_overlay,
    environmentOverlay: row.environment_overlay,
  };
}

function mapRuntimeHeroDefinition(rows: Pick<DefinitionGraphRows, 'pairTraitWeights' | 'heroPatternRules' | 'heroPatternLanguage'>): RuntimeHeroDefinition | null {
  if (
    rows.pairTraitWeights.length === 0 &&
    rows.heroPatternRules.length === 0 &&
    rows.heroPatternLanguage.length === 0
  ) {
    return null;
  }

  if (
    rows.pairTraitWeights.length === 0 ||
    rows.heroPatternRules.length === 0 ||
    rows.heroPatternLanguage.length === 0
  ) {
    throw new DefinitionGraphIntegrityError('Hero engine data is incomplete for this assessment version.');
  }

  return {
    fallbackPatternKey: 'balanced_operator',
    pairTraitWeights: Object.freeze(rows.pairTraitWeights.map(mapRuntimePairTraitWeight)),
    patternRules: mapRuntimeHeroPatternRules(rows.heroPatternRules),
    patternLanguage: Object.freeze(rows.heroPatternLanguage.map(mapRuntimeHeroPatternLanguage)),
  };
}

export function assembleRuntimeAssessmentDefinition(rows: DefinitionGraphRows): RuntimeAssessmentDefinition {
  const assessment = mapAssessmentRecord(rows.assessment);
  const version = mapAssessmentVersionRecord(rows.version);

  const domains = rows.domains.map(mapRuntimeDomain).sort((a, b) => a.orderIndex - b.orderIndex);
  const signals = rows.signals.map(mapRuntimeSignal).sort((a, b) => a.orderIndex - b.orderIndex);
  const questions = rows.questions.map(mapRuntimeQuestion).sort((a, b) => a.orderIndex - b.orderIndex);

  const domainIds = new Set(domains.map((domain) => domain.id));
  for (const signal of signals) {
    if (!domainIds.has(signal.domainId)) {
      throw new DefinitionGraphIntegrityError(`Signal ${signal.id} references missing domain ${signal.domainId}`);
    }
  }

  for (const question of questions) {
    if (!domainIds.has(question.domainId)) {
      throw new DefinitionGraphIntegrityError(`Question ${question.id} references missing domain ${question.domainId}`);
    }
  }

  const questionById = new Map<string, RuntimeQuestion>(questions.map((question) => [question.id, question]));
  const signalIds = new Set(signals.map((signal) => signal.id));

  const options = rows.options.map(mapRuntimeOption).sort((a, b) => a.orderIndex - b.orderIndex);
  for (const option of options) {
    const question = questionById.get(option.questionId);
    if (!question) {
      throw new DefinitionGraphIntegrityError(
        `Option ${option.id} references missing question ${option.questionId}`,
      );
    }

    question.options.push(option);
  }

  const optionById = new Map<string, RuntimeOption>(options.map((option) => [option.id, option]));

  for (const row of rows.optionSignalWeights) {
    const option = optionById.get(row.option_id);
    if (!option) {
      throw new DefinitionGraphIntegrityError(`Weight ${row.id} references missing option ${row.option_id}`);
    }

    if (!signalIds.has(row.signal_id)) {
      throw new DefinitionGraphIntegrityError(`Weight ${row.id} references missing signal ${row.signal_id}`);
    }

    option.signalWeights.push(mapRuntimeOptionSignalWeight(row));
  }

  for (const question of questions) {
    if (question.options.length === 0) {
      throw new DefinitionGraphIntegrityError(`Question ${question.id} has no options`);
    }

    question.options.sort((a, b) => a.orderIndex - b.orderIndex);

    for (const option of question.options) {
      if (option.signalWeights.length === 0) {
        throw new DefinitionGraphIntegrityError(`Option ${option.id} has no signal weights`);
      }
    }
  }

  return {
    assessment,
    version,
    assessmentIntro: rows.assessmentIntro ? mapRuntimeAssessmentIntro(rows.assessmentIntro) : null,
    heroDefinition: mapRuntimeHeroDefinition(rows),
    domains,
    signals,
    questions,
  };
}
