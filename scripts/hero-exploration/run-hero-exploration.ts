import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERO_PATTERN_LANGUAGE_LOOKUP } from './hero-pattern-language';
import { HERO_PATTERN_FALLBACK_KEY, HERO_PATTERN_RULES } from './hero-pattern-rules';
import { CURATED_PROFILES, generateAllProfiles } from './profile-fixtures';
import { PAIR_TRAIT_WEIGHT_LOOKUP } from './pair-trait-weights';
import type {
  CollisionSummary,
  DeadPatternSummary,
  ExplorationReport,
  HeroPatternCondition,
  PatternCoverageRow,
  ProcessedProfile,
  RuleOperator,
  SimulatedProfile,
  TraitKey,
} from './hero-exploration-types';
import { TRAIT_KEYS } from './hero-exploration-types';

const OUTPUT_DIRECTORY = join(process.cwd(), 'scripts', 'hero-exploration', 'output');
const JSON_OUTPUT_PATH = join(OUTPUT_DIRECTORY, 'hero-exploration-report.json');
const MARKDOWN_OUTPUT_PATH = join(OUTPUT_DIRECTORY, 'hero-exploration-summary.md');

function createEmptyTraitTotals(): Record<TraitKey, number> {
  return Object.fromEntries(TRAIT_KEYS.map((traitKey) => [traitKey, 0])) as Record<TraitKey, number>;
}

function aggregateTraits(profile: SimulatedProfile): Record<TraitKey, number> {
  const totals = createEmptyTraitTotals();

  for (const pairKey of Object.values(profile.domainPairs)) {
    const weights = PAIR_TRAIT_WEIGHT_LOOKUP.get(pairKey);
    if (!weights) {
      throw new Error(`Missing pair trait weights for ${pairKey}.`);
    }

    for (const weight of weights) {
      totals[weight.traitKey] += weight.weight;
    }
  }

  return totals;
}

function evaluateCondition(
  traitTotal: number,
  operator: RuleOperator,
  value: number,
): boolean {
  switch (operator) {
    case '>=':
      return traitTotal >= value;
    case '<=':
      return traitTotal <= value;
    case '>':
      return traitTotal > value;
    case '<':
      return traitTotal < value;
    case '===':
      return traitTotal === value;
    default:
      return false;
  }
}

function evaluateProfile(profile: SimulatedProfile): ProcessedProfile {
  const traitTotals = aggregateTraits(profile);
  const matchedPatterns = HERO_PATTERN_RULES.filter((rule) =>
    rule.conditions.every((condition) =>
      evaluateCondition(traitTotals[condition.traitKey], condition.operator, condition.value),
    ),
  )
    .sort((left, right) => left.priority - right.priority)
    .map((rule) => ({
      patternKey: rule.patternKey,
      priority: rule.priority,
      matchedConditions: rule.conditions,
    }));

  const winner = matchedPatterns[0] ?? null;
  const winnerPatternKey = winner?.patternKey ?? HERO_PATTERN_FALLBACK_KEY;
  const heroCopy = HERO_PATTERN_LANGUAGE_LOOKUP.get(winnerPatternKey);

  if (!heroCopy) {
    throw new Error(`Missing Hero pattern language for ${winnerPatternKey}.`);
  }

  return {
    profileKey: profile.profileKey,
    domainPairs: profile.domainPairs,
    traitTotals,
    matchedPatterns,
    winnerPatternKey,
    winnerPriority: winner?.priority ?? null,
    winnerConditions: winner?.matchedConditions ?? [],
    heroCopy,
  };
}

function buildCoverage(processedProfiles: readonly ProcessedProfile[]): readonly PatternCoverageRow[] {
  const coverage = new Map<string, PatternCoverageRow>();

  for (const patternKey of HERO_PATTERN_LANGUAGE_LOOKUP.keys()) {
    coverage.set(patternKey, {
      patternKey,
      matchCount: 0,
      winCount: 0,
      winRate: 0,
      exampleProfiles: [],
      examplePairs: [],
    });
  }

  for (const processedProfile of processedProfiles) {
    const examplePairString = Object.values(processedProfile.domainPairs).join(' | ');

    for (const matchedPattern of processedProfile.matchedPatterns) {
      const row = coverage.get(matchedPattern.patternKey);
      if (!row) {
        continue;
      }

      row.matchCount += 1;
      if (row.exampleProfiles.length < 3 && !row.exampleProfiles.includes(processedProfile.profileKey)) {
        row.exampleProfiles = [...row.exampleProfiles, processedProfile.profileKey];
      }
      if (row.examplePairs.length < 3 && !row.examplePairs.includes(examplePairString)) {
        row.examplePairs = [...row.examplePairs, examplePairString];
      }
    }

    const winningRow = coverage.get(processedProfile.winnerPatternKey);
    if (!winningRow) {
      continue;
    }

    winningRow.winCount += 1;
    if (winningRow.exampleProfiles.length < 3 && !winningRow.exampleProfiles.includes(processedProfile.profileKey)) {
      winningRow.exampleProfiles = [...winningRow.exampleProfiles, processedProfile.profileKey];
    }
    if (winningRow.examplePairs.length < 3 && !winningRow.examplePairs.includes(examplePairString)) {
      winningRow.examplePairs = [...winningRow.examplePairs, examplePairString];
    }
  }

  return [...coverage.values()]
    .map((row) => ({
      ...row,
      winRate: row.matchCount === 0 ? 0 : row.winCount / row.matchCount,
    }))
    .sort((left, right) => right.winCount - left.winCount || left.patternKey.localeCompare(right.patternKey));
}

function buildCollisionSummary(processedProfiles: readonly ProcessedProfile[]): CollisionSummary {
  const collisionCounts = new Map<string, number>();
  const beatenByHigherPriority = new Map<string, number>();
  let singleMatchProfiles = 0;
  let multiMatchProfiles = 0;
  let zeroMatchProfiles = 0;
  let worstCollisionCount = 0;

  for (const processedProfile of processedProfiles) {
    const matchCount = processedProfile.matchedPatterns.length;
    worstCollisionCount = Math.max(worstCollisionCount, matchCount);

    if (matchCount === 0) {
      zeroMatchProfiles += 1;
      continue;
    }

    if (matchCount === 1) {
      singleMatchProfiles += 1;
      continue;
    }

    multiMatchProfiles += 1;
    const collisionKey = processedProfile.matchedPatterns.map((pattern) => pattern.patternKey).join(' > ');
    collisionCounts.set(collisionKey, (collisionCounts.get(collisionKey) ?? 0) + 1);

    for (const pattern of processedProfile.matchedPatterns.slice(1)) {
      beatenByHigherPriority.set(pattern.patternKey, (beatenByHigherPriority.get(pattern.patternKey) ?? 0) + 1);
    }
  }

  return {
    totalProfiles: processedProfiles.length,
    singleMatchProfiles,
    multiMatchProfiles,
    zeroMatchProfiles,
    worstCollisionCount,
    topCollisionSets: [...collisionCounts.entries()]
      .map(([patternKeyList, count]) => ({ patternKeys: patternKeyList.split(' > '), count }))
      .sort((left, right) => right.count - left.count || left.patternKeys.join('_').localeCompare(right.patternKeys.join('_')))
      .slice(0, 10),
    beatenByHigherPriority: Object.fromEntries(
      [...beatenByHigherPriority.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
    ),
  };
}

function buildDeadPatternSummary(
  coverage: readonly PatternCoverageRow[],
  totalProfilesProcessed: number,
): DeadPatternSummary {
  const averageWinShare = 1 / coverage.length;

  return {
    neverSelectedAsWinner: coverage.filter((row) => row.winCount === 0).map((row) => row.patternKey),
    neverMatched: coverage.filter((row) => row.matchCount === 0).map((row) => row.patternKey),
    matchedButNeverWin: coverage.filter((row) => row.matchCount > 0 && row.winCount === 0).map((row) => row.patternKey),
    overDominantPatterns: coverage
      .map((row) => ({
        patternKey: row.patternKey,
        winCount: row.winCount,
        winShare: totalProfilesProcessed === 0 ? 0 : row.winCount / totalProfilesProcessed,
      }))
      .filter((row) => row.winShare >= averageWinShare * 1.75)
      .sort((left, right) => right.winShare - left.winShare || left.patternKey.localeCompare(right.patternKey)),
  };
}

function formatCondition(condition: HeroPatternCondition): string {
  return `${condition.traitKey} ${condition.operator} ${condition.value}`;
}

function formatTraitTotals(traitTotals: ProcessedProfile['traitTotals']): string[] {
  return TRAIT_KEYS.filter((traitKey) => traitTotals[traitKey] > 0)
    .sort((left, right) => traitTotals[right] - traitTotals[left] || left.localeCompare(right))
    .map((traitKey) => `- ${traitKey}: ${traitTotals[traitKey]}`);
}

function buildMarkdownReport(report: ExplorationReport): string {
  const lines: string[] = [];

  lines.push('# Hero Exploration Summary');
  lines.push('');
  lines.push(`- Run mode: ${report.runMode}`);
  lines.push(`- Total profiles processed: ${report.totalProfilesProcessed}`);
  lines.push(`- Profiles with 1 match: ${report.collisionSummary.singleMatchProfiles}`);
  lines.push(`- Profiles with 2+ matches: ${report.collisionSummary.multiMatchProfiles}`);
  lines.push(`- Profiles with 0 matches: ${report.collisionSummary.zeroMatchProfiles}`);
  lines.push(`- Worst collision count: ${report.collisionSummary.worstCollisionCount}`);
  lines.push('');
  lines.push('## Coverage');
  lines.push('');
  lines.push('| Pattern | Match Count | Win Count | Win Rate | Example Profiles |');
  lines.push('| --- | ---: | ---: | ---: | --- |');
  for (const row of report.coverage) {
    lines.push(
      `| ${row.patternKey} | ${row.matchCount} | ${row.winCount} | ${(row.winRate * 100).toFixed(1)}% | ${row.exampleProfiles.join(', ') || '-'} |`,
    );
  }
  lines.push('');
  lines.push('## Collision Sets');
  lines.push('');
  for (const collisionSet of report.collisionSummary.topCollisionSets) {
    lines.push(`- ${collisionSet.patternKeys.join(' > ')}: ${collisionSet.count}`);
  }
  lines.push('');
  lines.push('## Dead Patterns');
  lines.push('');
  lines.push(`- Never selected as winner: ${report.deadPatternSummary.neverSelectedAsWinner.join(', ') || 'none'}`);
  lines.push(`- Never matched: ${report.deadPatternSummary.neverMatched.join(', ') || 'none'}`);
  lines.push(`- Matched but never win: ${report.deadPatternSummary.matchedButNeverWin.join(', ') || 'none'}`);
  lines.push('');
  lines.push('## Curated Worked Examples');
  lines.push('');
  for (const processedProfile of report.detailedCuratedExamples) {
    lines.push(`### ${processedProfile.profileKey}`);
    lines.push('');
    lines.push('Domain pairs:');
    for (const [domainKey, pairKey] of Object.entries(processedProfile.domainPairs)) {
      lines.push(`- ${domainKey}: ${pairKey}`);
    }
    lines.push('');
    lines.push('Trait totals:');
    lines.push(...formatTraitTotals(processedProfile.traitTotals));
    lines.push('');
    lines.push(`Winner: ${processedProfile.winnerPatternKey}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function writeArtifacts(report: ExplorationReport): void {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  writeFileSync(JSON_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(MARKDOWN_OUTPUT_PATH, buildMarkdownReport(report), 'utf8');
}

function printGlobalSummary(report: ExplorationReport): void {
  console.log('Hero Pattern Exploration Harness');
  console.log('================================');
  console.log(`Run mode: ${report.runMode}`);
  console.log(`Total profiles processed: ${report.totalProfilesProcessed}`);
  console.log(`Profiles with 1 match: ${report.collisionSummary.singleMatchProfiles}`);
  console.log(`Profiles with 2+ matches: ${report.collisionSummary.multiMatchProfiles}`);
  console.log(`Profiles with 0 matches: ${report.collisionSummary.zeroMatchProfiles}`);
  console.log(`Worst collision count: ${report.collisionSummary.worstCollisionCount}`);
  console.log(`JSON artifact: ${JSON_OUTPUT_PATH}`);
  console.log(`Markdown artifact: ${MARKDOWN_OUTPUT_PATH}`);
  console.log('');
}

function printCoverageTable(coverage: readonly PatternCoverageRow[]): void {
  console.log('Per-pattern coverage');
  console.log('--------------------');
  console.log('patternKey | matchCount | winCount | winRate | examples');
  for (const row of coverage) {
    console.log(
      `${row.patternKey} | ${row.matchCount} | ${row.winCount} | ${(row.winRate * 100).toFixed(1)}% | ${row.exampleProfiles.join(', ') || '-'}`,
    );
  }
  console.log('');
}

function printCollisionSummary(collisionSummary: CollisionSummary): void {
  console.log('Collision summary');
  console.log('-----------------');
  console.log(`Profiles with 2+ matches: ${collisionSummary.multiMatchProfiles}`);
  console.log(`Worst collision count: ${collisionSummary.worstCollisionCount}`);
  console.log('Top 10 collision sets:');
  for (const collisionSet of collisionSummary.topCollisionSets) {
    console.log(`- ${collisionSet.patternKeys.join(' > ')}: ${collisionSet.count}`);
  }
  console.log('Patterns beaten by higher-priority matches most often:');
  for (const [patternKey, count] of Object.entries(collisionSummary.beatenByHigherPriority).slice(0, 10)) {
    console.log(`- ${patternKey}: ${count}`);
  }
  console.log('');
}

function printDeadPatternSummary(deadPatternSummary: DeadPatternSummary): void {
  console.log('Dead-pattern summary');
  console.log('--------------------');
  console.log(`Never selected as winner: ${deadPatternSummary.neverSelectedAsWinner.join(', ') || 'none'}`);
  console.log(`Never matched: ${deadPatternSummary.neverMatched.join(', ') || 'none'}`);
  console.log(`Matched often but never win: ${deadPatternSummary.matchedButNeverWin.join(', ') || 'none'}`);
  console.log('Over-dominant patterns:');
  if (deadPatternSummary.overDominantPatterns.length === 0) {
    console.log('- none');
  } else {
    for (const pattern of deadPatternSummary.overDominantPatterns) {
      console.log(`- ${pattern.patternKey}: ${pattern.winCount} wins (${(pattern.winShare * 100).toFixed(1)}%)`);
    }
  }
  console.log('');
}

function printDetailedExamples(examples: readonly ProcessedProfile[]): void {
  console.log('Detailed worked examples');
  console.log('------------------------');
  for (const example of examples.slice(0, 10)) {
    console.log(`Profile: ${example.profileKey}`);
    console.log('');
    console.log('Domain pairs:');
    for (const [domainKey, pairKey] of Object.entries(example.domainPairs)) {
      console.log(`- ${domainKey}: ${pairKey}`);
    }
    console.log('');
    console.log('Trait totals:');
    for (const line of formatTraitTotals(example.traitTotals)) {
      console.log(line);
    }
    console.log('');
    console.log('Matched patterns:');
    if (example.matchedPatterns.length === 0) {
      console.log('- none');
    } else {
      for (const matchedPattern of example.matchedPatterns) {
        console.log(`- ${matchedPattern.patternKey} (priority ${matchedPattern.priority})`);
      }
    }
    console.log('');
    console.log('Winner:');
    console.log(`- ${example.winnerPatternKey}`);
    console.log('');
    console.log('Why it won:');
    if (example.winnerConditions.length === 0) {
      console.log(`- No rule matched; used fallback ${HERO_PATTERN_FALLBACK_KEY}`);
    } else {
      for (const condition of example.winnerConditions) {
        console.log(`- ${formatCondition(condition)}`);
      }
      console.log('- lowest priority among matched patterns');
    }
    console.log('');
    console.log('Returned Hero copy:');
    console.log(`headline: ${example.heroCopy.headline}`);
    console.log(`subheadline: ${example.heroCopy.subheadline}`);
    console.log(`summary: ${example.heroCopy.summary}`);
    console.log(`narrative: ${example.heroCopy.narrative}`);
    console.log(`pressureOverlay: ${example.heroCopy.pressureOverlay}`);
    console.log(`environmentOverlay: ${example.heroCopy.environmentOverlay}`);
    console.log('');
  }
}

function buildWinningPatternCounts(processedProfiles: readonly ProcessedProfile[]): Record<string, number> {
  const counts = new Map<string, number>();

  for (const processedProfile of processedProfiles) {
    counts.set(processedProfile.winnerPatternKey, (counts.get(processedProfile.winnerPatternKey) ?? 0) + 1);
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
  );
}

function main(): void {
  const generatedProfiles = generateAllProfiles();
  const processedGeneratedProfiles = generatedProfiles.map(evaluateProfile);
  const processedCuratedProfiles = CURATED_PROFILES.map(evaluateProfile);
  const coverage = buildCoverage(processedGeneratedProfiles);
  const collisionSummary = buildCollisionSummary(processedGeneratedProfiles);
  const deadPatternSummary = buildDeadPatternSummary(coverage, processedGeneratedProfiles.length);
  const report: ExplorationReport = {
    runMode: 'full_combinatorial',
    totalProfilesProcessed: processedGeneratedProfiles.length,
    processedAt: new Date().toISOString(),
    winningPatternCounts: buildWinningPatternCounts(processedGeneratedProfiles),
    collisionSummary,
    deadPatternSummary,
    coverage,
    detailedCuratedExamples: processedCuratedProfiles,
  };

  writeArtifacts(report);
  printGlobalSummary(report);
  printCoverageTable(coverage);
  printCollisionSummary(collisionSummary);
  printDeadPatternSummary(deadPatternSummary);
  printDetailedExamples(processedCuratedProfiles);
}

main();
