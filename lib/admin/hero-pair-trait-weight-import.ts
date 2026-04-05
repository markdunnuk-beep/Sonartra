import { canonicalizeSignalPairKey } from '@/lib/admin/pair-language-import';
import type {
  AssessmentVersionPairTraitWeightInput,
} from '@/lib/server/assessment-version-hero';
import type { HeroProfileDomainKey, HeroTraitKey } from '@/lib/engine/types';

const VALID_DOMAINS = new Set<HeroProfileDomainKey>([
  'operatingStyle',
  'coreDrivers',
  'leadershipApproach',
  'tensionResponse',
  'environmentFit',
  'pressureResponse',
]);

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

export type ParsedHeroPairTraitWeightRow = {
  lineNumber: number;
  rawLine: string;
  profileDomainKey: string;
  pairKey: string;
  traitKey: string;
  weight: string;
};

export type HeroPairTraitWeightValidationRow = {
  lineNumber: number;
  rawLine: string;
  profileDomainKey: HeroProfileDomainKey;
  canonicalPairKey: string;
  traitKey: HeroTraitKey;
  weight: number;
};

export function parseHeroPairTraitWeightRows(input: string): {
  rows: readonly ParsedHeroPairTraitWeightRow[];
  errors: readonly { message: string }[];
} {
  const rows: ParsedHeroPairTraitWeightRow[] = [];
  const errors: { message: string }[] = [];

  input.split(/\r?\n/).forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) {
      return;
    }

    const parts = rawLine.split('|').map((part) => part.trim());
    if (parts.length !== 4) {
      errors.push({ message: `Line ${index + 1}: expected 4 columns (domain | pair | trait | weight).` });
      return;
    }

    const [profileDomainKey = '', pairKey = '', traitKey = '', weight = ''] = parts;
    if (!profileDomainKey || !pairKey || !traitKey || !weight) {
      errors.push({ message: `Line ${index + 1}: each column must be present.` });
      return;
    }

    rows.push({
      lineNumber: index + 1,
      rawLine,
      profileDomainKey,
      pairKey,
      traitKey,
      weight,
    });
  });

  return { rows, errors };
}

export function validateHeroPairTraitWeightRows(params: {
  rows: readonly ParsedHeroPairTraitWeightRow[];
}): {
  validRows: readonly HeroPairTraitWeightValidationRow[];
  errors: readonly { message: string }[];
} {
  const validRows: HeroPairTraitWeightValidationRow[] = [];
  const errors: { message: string }[] = [];
  const seen = new Set<string>();

  for (const row of params.rows) {
    if (!VALID_DOMAINS.has(row.profileDomainKey as HeroProfileDomainKey)) {
      errors.push({ message: `Line ${row.lineNumber}: unknown Hero profile domain "${row.profileDomainKey}".` });
      continue;
    }

    const canonicalPair = canonicalizeSignalPairKey(row.pairKey);
    if (!canonicalPair.success) {
      errors.push({ message: `Line ${row.lineNumber}: pair key "${row.pairKey}" must contain exactly two tokens.` });
      continue;
    }

    if (!VALID_TRAITS.has(row.traitKey as HeroTraitKey)) {
      errors.push({ message: `Line ${row.lineNumber}: unknown Hero trait "${row.traitKey}".` });
      continue;
    }

    const weight = Number(row.weight);
    if (!Number.isInteger(weight)) {
      errors.push({ message: `Line ${row.lineNumber}: weight must be an integer.` });
      continue;
    }

    const duplicateKey = `${row.profileDomainKey}:${canonicalPair.canonicalSignalPair}:${row.traitKey}`;
    if (seen.has(duplicateKey)) {
      errors.push({ message: `Line ${row.lineNumber}: duplicate pair-trait weight for ${duplicateKey}.` });
      continue;
    }
    seen.add(duplicateKey);

    validRows.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      profileDomainKey: row.profileDomainKey as HeroProfileDomainKey,
      canonicalPairKey: canonicalPair.canonicalSignalPair,
      traitKey: row.traitKey as HeroTraitKey,
      weight,
    });
  }

  return { validRows, errors };
}

export function buildHeroPairTraitWeightStoragePlan(
  rows: readonly HeroPairTraitWeightValidationRow[],
): readonly AssessmentVersionPairTraitWeightInput[] {
  const orderCounters = new Map<string, number>();

  return rows.map((row) => {
    const key = `${row.profileDomainKey}:${row.canonicalPairKey}`;
    const nextOrderIndex = orderCounters.get(key) ?? 0;
    orderCounters.set(key, nextOrderIndex + 1);

    return {
      profileDomainKey: row.profileDomainKey,
      pairKey: row.canonicalPairKey,
      traitKey: row.traitKey,
      weight: row.weight,
      orderIndex: nextOrderIndex,
    };
  });
}
