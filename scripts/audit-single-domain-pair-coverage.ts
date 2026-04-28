import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CANONICAL_PAIR_KEYS = [
  'results_process',
  'results_vision',
  'results_people',
  'process_vision',
  'process_people',
  'vision_people',
] as const;

const DRIVER_ROLES = [
  'primary_driver',
  'secondary_driver',
  'supporting_context',
  'range_limitation',
] as const;

type Row = Record<string, string>;

function parseDelimited(filePath: string): Row[] {
  const raw = readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const firstLine = raw.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = firstLine.includes('|') ? '|' : ',';
  const lines = raw.split(/\r?\n/);
  const headers = splitLine(lines[0]!, delimiter);

  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = splitLine(line, delimiter);
    const row: Row = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? '').trim();
    });
    return row;
  });
}

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function byPair(rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  rows.forEach((row) => {
    const key = row.pair_key;
    if (!key) return;
    map.set(key, [...(map.get(key) ?? []), row]);
  });
  return map;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function run() {
  const base = resolve(process.cwd(), 'docs/results/gold-standard-language/authoring-csv');
  const heroRows = parseDelimited(resolve(base, 'single_domain_hero_pairs.csv'));
  const driverRows = parseDelimited(resolve(base, 'single_domain_drivers.csv'));
  const pairRows = parseDelimited(resolve(base, 'single_domain_pair_summaries.csv'));
  const limitationRows = parseDelimited(resolve(base, 'single_domain_limitations.csv'));
  const applicationRows = parseDelimited(resolve(base, 'single_domain_application.csv'));

  const report = {
    canonical_pair_keys: CANONICAL_PAIR_KEYS,
    dataset_sources: {
      HERO_PAIRS: 'single_domain_hero_pairs.csv',
      DRIVER_CLAIMS: 'single_domain_drivers.csv',
      PAIR_SUMMARIES: 'single_domain_pair_summaries.csv',
      BALANCING_SECTIONS: 'single_domain_limitations.csv',
      APPLICATION: 'single_domain_application.csv',
    },
    present_pair_keys: {
      HERO_PAIRS: sortedUnique(heroRows.map((row) => row.pair_key).filter(Boolean)),
      DRIVER_CLAIMS: sortedUnique(driverRows.map((row) => row.pair_key).filter(Boolean)),
      PAIR_SUMMARIES: sortedUnique(pairRows.map((row) => row.pair_key).filter(Boolean)),
      BALANCING_SECTIONS: sortedUnique(limitationRows.map((row) => row.pair_key).filter(Boolean)),
      APPLICATION: sortedUnique(applicationRows.map((row) => row.pair_key).filter(Boolean)),
    },
    missing: [] as Row[],
    readiness_by_pair: {} as Record<string, {hero:boolean;drivers:boolean;pair:boolean;balancing:boolean;application:boolean;ready:boolean}> ,
  };

  const heroByPair = byPair(heroRows);
  const driversByPair = byPair(driverRows);
  const pairByPair = byPair(pairRows);
  const limitationByPair = byPair(limitationRows);
  const appByPair = byPair(applicationRows);

  const requiredHeroFields = ['hero_statement', 'hero_expansion', 'hero_strength'];
  const requiredPairFields = ['interaction_claim', 'synergy_claim', 'tension_claim', 'pair_outcome'];
  const requiredLimitationFields = ['pattern_cost', 'range_narrowing', 'weaker_signal_key', 'weaker_signal_link'];

  for (const pairKey of CANONICAL_PAIR_KEYS) {
    const hero = heroByPair.get(pairKey) ?? [];
    const drivers = driversByPair.get(pairKey) ?? [];
    const pairSummary = pairByPair.get(pairKey) ?? [];
    const limitation = limitationByPair.get(pairKey) ?? [];
    const app = appByPair.get(pairKey) ?? [];

    let heroOk = hero.length > 0;
    let driversOk = true;
    let pairOk = pairSummary.length > 0;
    let limitationOk = limitation.length > 0;
    const appOk = app.length > 0;

    if (!heroOk) {
      report.missing.push({ dataset: 'HERO_PAIRS', pair_key: pairKey, missing_field: 'row' });
    }
    hero.forEach((row) => {
      requiredHeroFields.forEach((field) => {
        if (!hasText(row[field])) {
          heroOk = false;
          report.missing.push({ dataset: 'HERO_PAIRS', pair_key: pairKey, missing_field: field });
        }
      });
    });

    if (!pairOk) {
      report.missing.push({ dataset: 'PAIR_SUMMARIES', pair_key: pairKey, missing_field: 'row' });
    }
    pairSummary.forEach((row) => {
      requiredPairFields.forEach((field) => {
        if (!hasText(row[field])) {
          pairOk = false;
          report.missing.push({ dataset: 'PAIR_SUMMARIES', pair_key: pairKey, missing_field: field });
        }
      });
    });

    if (!limitationOk) {
      report.missing.push({ dataset: 'BALANCING_SECTIONS', pair_key: pairKey, missing_field: 'row' });
    }
    limitation.forEach((row) => {
      requiredLimitationFields.forEach((field) => {
        if (!hasText(row[field])) {
          limitationOk = false;
          report.missing.push({ dataset: 'BALANCING_SECTIONS', pair_key: pairKey, missing_field: field });
        }
      });
    });

    for (const role of DRIVER_ROLES) {
      const match = drivers.filter((row) => row.driver_role === role);
      if (match.length === 0) {
        driversOk = false;
        report.missing.push({ dataset: 'DRIVER_CLAIMS', pair_key: pairKey, driver_role: role, missing_field: 'row' });
      }
      match.forEach((row) => {
        if (!hasText(row.claim_text)) {
          driversOk = false;
          report.missing.push({ dataset: 'DRIVER_CLAIMS', pair_key: pairKey, signal_key: row.signal_key, driver_role: role, missing_field: 'claim_text' });
        }
      });
    }

    if (!appOk) {
      report.missing.push({ dataset: 'APPLICATION', pair_key: pairKey, missing_field: 'row' });
    }

    report.readiness_by_pair[pairKey] = {
      hero: heroOk,
      drivers: driversOk,
      pair: pairOk,
      balancing: limitationOk,
      application: appOk,
      ready: heroOk && driversOk && pairOk && limitationOk && appOk,
    };
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

run();
