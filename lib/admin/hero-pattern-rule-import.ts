import type { HeroRuleOperator, HeroTraitKey } from '@/lib/engine/types';
import type { AssessmentVersionHeroPatternRuleInput } from '@/lib/server/assessment-version-hero';

const VALID_RULE_TYPES = new Set(['condition', 'exclusion'] as const);
const VALID_OPERATORS = new Set<HeroRuleOperator>(['>=', '<=', '>', '<', '===']);
const VALID_TRAITS = new Set<HeroTraitKey>([
  'paced',
  'deliberate',
  'people_led',
  'task_led',
  'structured',
  'flexible',
  'assertive',
  'receptive',
  'stable',
  'adaptive',
  'exacting',
  'tolerant',
]);

export type ParsedHeroPatternRuleRow = {
  lineNumber: number;
  rawLine: string;
  patternKey: string;
  priority: string;
  ruleType: string;
  traitKey: string;
  operator: string;
  thresholdValue: string;
};

export type ValidatedHeroPatternRuleRow = {
  lineNumber: number;
  rawLine: string;
  patternKey: string;
  priority: number;
  ruleType: 'condition' | 'exclusion';
  traitKey: HeroTraitKey;
  operator: HeroRuleOperator;
  thresholdValue: number;
};

export function parseHeroPatternRuleRows(input: string): {
  rows: readonly ParsedHeroPatternRuleRow[];
  errors: readonly { message: string }[];
} {
  const rows: ParsedHeroPatternRuleRow[] = [];
  const errors: { message: string }[] = [];

  input.split(/\r?\n/).forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) {
      return;
    }

    const parts = rawLine.split('|').map((part) => part.trim());
    if (parts.length !== 6) {
      errors.push({
        message: `Line ${index + 1}: expected 6 columns (pattern | priority | rule-type | trait | operator | threshold).`,
      });
      return;
    }

    const [patternKey = '', priority = '', ruleType = '', traitKey = '', operator = '', thresholdValue = ''] = parts;
    if (!patternKey || !priority || !ruleType || !traitKey || !operator || !thresholdValue) {
      errors.push({ message: `Line ${index + 1}: each column must be present.` });
      return;
    }

    rows.push({
      lineNumber: index + 1,
      rawLine,
      patternKey,
      priority,
      ruleType,
      traitKey,
      operator,
      thresholdValue,
    });
  });

  return { rows, errors };
}

export function validateHeroPatternRuleRows(params: {
  rows: readonly ParsedHeroPatternRuleRow[];
}): {
  validRows: readonly ValidatedHeroPatternRuleRow[];
  errors: readonly { message: string }[];
} {
  const validRows: ValidatedHeroPatternRuleRow[] = [];
  const errors: { message: string }[] = [];
  const seen = new Set<string>();

  for (const row of params.rows) {
    const priority = Number(row.priority);
    const thresholdValue = Number(row.thresholdValue);

    if (!Number.isInteger(priority)) {
      errors.push({ message: `Line ${row.lineNumber}: priority must be an integer.` });
      continue;
    }

    if (!VALID_RULE_TYPES.has(row.ruleType as 'condition' | 'exclusion')) {
      errors.push({ message: `Line ${row.lineNumber}: rule type must be condition or exclusion.` });
      continue;
    }

    if (!VALID_TRAITS.has(row.traitKey as HeroTraitKey)) {
      errors.push({ message: `Line ${row.lineNumber}: unknown Hero trait "${row.traitKey}".` });
      continue;
    }

    if (!VALID_OPERATORS.has(row.operator as HeroRuleOperator)) {
      errors.push({ message: `Line ${row.lineNumber}: operator must be one of >=, <=, >, <, ===.` });
      continue;
    }

    if (!Number.isInteger(thresholdValue)) {
      errors.push({ message: `Line ${row.lineNumber}: threshold must be an integer.` });
      continue;
    }

    const duplicateKey = `${row.patternKey}:${row.ruleType}:${row.traitKey}:${row.operator}:${thresholdValue}`;
    if (seen.has(duplicateKey)) {
      errors.push({ message: `Line ${row.lineNumber}: duplicate Hero rule "${duplicateKey}".` });
      continue;
    }
    seen.add(duplicateKey);

    validRows.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      patternKey: row.patternKey,
      priority,
      ruleType: row.ruleType as 'condition' | 'exclusion',
      traitKey: row.traitKey as HeroTraitKey,
      operator: row.operator as HeroRuleOperator,
      thresholdValue,
    });
  }

  return { validRows, errors };
}

export function buildHeroPatternRuleStoragePlan(
  rows: readonly ValidatedHeroPatternRuleRow[],
): readonly AssessmentVersionHeroPatternRuleInput[] {
  const orderCounters = new Map<string, number>();

  return rows.map((row) => {
    const key = `${row.patternKey}:${row.ruleType}`;
    const nextOrderIndex = orderCounters.get(key) ?? 0;
    orderCounters.set(key, nextOrderIndex + 1);

    return {
      patternKey: row.patternKey,
      priority: row.priority,
      ruleType: row.ruleType,
      traitKey: row.traitKey,
      operator: row.operator,
      thresholdValue: row.thresholdValue,
      orderIndex: nextOrderIndex,
    };
  });
}
