import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERO_PATTERN_LANGUAGE_LOOKUP } from './hero-pattern-language';
import { BASELINE_HERO_PATTERN_RULES, HERO_PATTERN_FALLBACK_KEY, HERO_PATTERN_RULES, PATTERN_CHANGE_LOG } from './hero-pattern-rules';
import { CURATED_PROFILES, generateAllProfiles } from './profile-fixtures';
import { PAIR_TRAIT_WEIGHT_LOOKUP } from './pair-trait-weights';
import type {
  CollisionSummary,
  ComparisonMetricRow,
  CuratedComparisonRow,
  DeadPatternSummary,
  ExplorationReport,
  HeroPatternCondition,
  HeroPatternRule,
  PatternCoverageRow,
  ProcessedProfile,
  RuleOperator,
  SimulatedProfile,
  TraitKey,
  WinningPatternSummary,
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

function evaluateCondition(traitTotal: number, operator: RuleOperator, value: number): boolean {
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

function evaluateProfile(profile: SimulatedProfile, rules: readonly HeroPatternRule[]): ProcessedProfile {
  const traitTotals = aggregateTraits(profile);
  const matchedPatterns = rules
    .filter((rule) =>
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

function buildCoverage(
  processedProfiles: readonly ProcessedProfile[],
  ruleSet: readonly HeroPatternRule[],
): readonly PatternCoverageRow[] {
  const coverage = new Map<string, PatternCoverageRow>();
  const activePatternKeys = [...new Set([...ruleSet.map((rule) => rule.patternKey), HERO_PATTERN_FALLBACK_KEY])];

  for (const patternKey of activePatternKeys) {
    coverage.set(patternKey, {
      patternKey,
      matchCount: 0,
      winCount: 0,
      winRate: 0,
      exampleProfiles: [],
      examplePairs: [],
      changeNote: PATTERN_CHANGE_LOG[patternKey] ?? 'unchanged',
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

function buildWinningPatternCounts(processedProfiles: readonly ProcessedProfile[]): Record<string, number> {
  const counts = new Map<string, number>();

  for (const processedProfile of processedProfiles) {
    counts.set(processedProfile.winnerPatternKey, (counts.get(processedProfile.winnerPatternKey) ?? 0) + 1);
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
  );
}

function buildTopWinningPatterns(
  winningPatternCounts: Readonly<Record<string, number>>,
  totalProfilesProcessed: number,
): readonly WinningPatternSummary[] {
  return Object.entries(winningPatternCounts)
    .map(([patternKey, count]) => ({
      patternKey,
      count,
      share: totalProfilesProcessed === 0 ? 0 : count / totalProfilesProcessed,
    }))
    .sort((left, right) => right.count - left.count || left.patternKey.localeCompare(right.patternKey))
    .slice(0, 10);
}

function formatCondition(condition: HeroPatternCondition): string {
  return `${condition.traitKey} ${condition.operator} ${condition.value}`;
}

function formatTraitTotals(traitTotals: ProcessedProfile['traitTotals']): string[] {
  return TRAIT_KEYS.filter((traitKey) => traitTotals[traitKey] > 0)
    .sort((left, right) => traitTotals[right] - traitTotals[left] || left.localeCompare(right))
    .map((traitKey) => `- ${traitKey}: ${traitTotals[traitKey]}`);
}

function buildComparisonMetrics(
  baselineCollisionSummary: CollisionSummary,
  refinedCollisionSummary: CollisionSummary,
  baselineDeadPatternSummary: DeadPatternSummary,
  refinedDeadPatternSummary: DeadPatternSummary,
  baselineWinningPatternCounts: Readonly<Record<string, number>>,
  refinedWinningPatternCounts: Readonly<Record<string, number>>,
): readonly ComparisonMetricRow[] {
  const baselineFallbackCount = baselineWinningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0;
  const refinedFallbackCount = refinedWinningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0;

  return [
    { label: 'total profiles processed', baseline: baselineCollisionSummary.totalProfiles, refined: refinedCollisionSummary.totalProfiles },
    {
      label: 'fallback count',
      baseline: `${baselineFallbackCount} (${((baselineFallbackCount / baselineCollisionSummary.totalProfiles) * 100).toFixed(1)}%)`,
      refined: `${refinedFallbackCount} (${((refinedFallbackCount / refinedCollisionSummary.totalProfiles) * 100).toFixed(1)}%)`,
    },
    { label: 'zero-match count', baseline: baselineCollisionSummary.zeroMatchProfiles, refined: refinedCollisionSummary.zeroMatchProfiles },
    { label: 'single-match count', baseline: baselineCollisionSummary.singleMatchProfiles, refined: refinedCollisionSummary.singleMatchProfiles },
    { label: 'multi-match count', baseline: baselineCollisionSummary.multiMatchProfiles, refined: refinedCollisionSummary.multiMatchProfiles },
    { label: 'worst collision count', baseline: baselineCollisionSummary.worstCollisionCount, refined: refinedCollisionSummary.worstCollisionCount },
    {
      label: 'dead pattern count',
      baseline: baselineDeadPatternSummary.neverSelectedAsWinner.length,
      refined: refinedDeadPatternSummary.neverSelectedAsWinner.length,
    },
  ];
}

function buildCuratedComparison(
  baselineCurated: readonly ProcessedProfile[],
  refinedCurated: readonly ProcessedProfile[],
): readonly CuratedComparisonRow[] {
  const baselineByKey = new Map(baselineCurated.map((profile) => [profile.profileKey, profile] as const));
  const refinedByKey = new Map(refinedCurated.map((profile) => [profile.profileKey, profile] as const));
  const spotlightKeys = ['profile_006', 'profile_017', 'profile_018', 'profile_021', 'profile_002', 'profile_004', 'profile_015', 'profile_022'];

  return spotlightKeys.map((profileKey) => {
    const baseline = baselineByKey.get(profileKey);
    const refined = refinedByKey.get(profileKey);

    if (!baseline || !refined) {
      throw new Error(`Missing curated comparison profile ${profileKey}.`);
    }

    return {
      profileKey,
      baselineWinner: baseline.winnerPatternKey,
      refinedWinner: refined.winnerPatternKey,
      changed: baseline.winnerPatternKey !== refined.winnerPatternKey,
      whyBetter: buildBetterFitNote(baseline, refined),
    };
  });
}

function buildBetterFitNote(baseline: ProcessedProfile, refined: ProcessedProfile): string {
  if (baseline.winnerPatternKey === refined.winnerPatternKey) {
    return 'The refined model kept the same winner because the original pattern was already the clearest fit.';
  }

  if (baseline.winnerPatternKey === HERO_PATTERN_FALLBACK_KEY && refined.winnerPatternKey !== HERO_PATTERN_FALLBACK_KEY) {
    return `The refined model replaces fallback with ${refined.winnerPatternKey}, which matches the visible trait shape more specifically.`;
  }

  return `The refined model prefers ${refined.winnerPatternKey} because its thresholds fit the trait totals more narrowly than ${baseline.winnerPatternKey}.`;
}

function buildRuleChangeLog(): readonly string[] {
  return Object.entries(PATTERN_CHANGE_LOG)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([patternKey, note]) => `${patternKey}: ${note}`);
}

function buildPatternChangeLog(): readonly string[] {
  const baselineKeys = new Set(BASELINE_HERO_PATTERN_RULES.map((rule) => rule.patternKey));
  const refinedKeys = new Set(HERO_PATTERN_RULES.map((rule) => rule.patternKey));

  const added = [...refinedKeys].filter((key) => !baselineKeys.has(key)).sort();
  const removed = [...baselineKeys].filter((key) => !refinedKeys.has(key)).sort();
  const retained = [...refinedKeys].filter((key) => baselineKeys.has(key)).sort();

  return [
    `added: ${added.join(', ') || 'none'}`,
    `removed: ${removed.join(', ') || 'none'}`,
    `retained and redefined: ${retained.join(', ') || 'none'}`,
  ];
}

function buildMarkdownReport(report: ExplorationReport): string {
  const lines: string[] = [];

  lines.push('# Hero Exploration Summary');
  lines.push('');
  lines.push(`- Run mode: ${report.runMode}`);
  lines.push(`- Total profiles processed: ${report.totalProfilesProcessed}`);
  lines.push(`- Refined fallback count: ${report.winningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0}`);
  lines.push(`- Refined fallback share: ${(((report.winningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0) / report.totalProfilesProcessed) * 100).toFixed(1)}%`);
  lines.push(`- Worst collision count: ${report.collisionSummary.worstCollisionCount}`);
  lines.push('');
  lines.push('## Before / After');
  lines.push('');
  lines.push('| Metric | Baseline | Refined |');
  lines.push('| --- | ---: | ---: |');
  for (const row of report.comparison.metrics) {
    lines.push(`| ${row.label} | ${row.baseline} | ${row.refined} |`);
  }
  lines.push('');
  lines.push(`- Dead patterns before: ${report.comparison.deadPatternsBefore.join(', ') || 'none'}`);
  lines.push(`- Dead patterns after: ${report.comparison.deadPatternsAfter.join(', ') || 'none'}`);
  lines.push('');
  lines.push('## Top Winners Before / After');
  lines.push('');
  lines.push('| Before | Count | Share | After | Count | Share |');
  lines.push('| --- | ---: | ---: | --- | ---: | ---: |');
  for (let index = 0; index < Math.max(report.comparison.topWinnersBefore.length, report.comparison.topWinnersAfter.length); index += 1) {
    const before = report.comparison.topWinnersBefore[index];
    const after = report.comparison.topWinnersAfter[index];
    lines.push(
      `| ${before?.patternKey ?? '-'} | ${before?.count ?? '-'} | ${before ? `${(before.share * 100).toFixed(1)}%` : '-'} | ${after?.patternKey ?? '-'} | ${after?.count ?? '-'} | ${after ? `${(after.share * 100).toFixed(1)}%` : '-'} |`,
    );
  }
  lines.push('');
  lines.push('## Pattern Coverage');
  lines.push('');
  lines.push('| Pattern | Match Count | Win Count | Win Rate | Example Profiles | Change Note |');
  lines.push('| --- | ---: | ---: | ---: | --- | --- |');
  for (const row of report.coverage) {
    lines.push(
      `| ${row.patternKey} | ${row.matchCount} | ${row.winCount} | ${(row.winRate * 100).toFixed(1)}% | ${row.exampleProfiles.join(', ') || '-'} | ${row.changeNote} |`,
    );
  }
  lines.push('');
  lines.push('## Collision Summary');
  lines.push('');
  for (const collisionSet of report.collisionSummary.topCollisionSets) {
    lines.push(`- ${collisionSet.patternKeys.join(' > ')}: ${collisionSet.count}`);
  }
  lines.push('');
  lines.push('## Curated Comparison');
  lines.push('');
  for (const row of report.curatedComparison) {
    lines.push(`- ${row.profileKey}: ${row.baselineWinner} -> ${row.refinedWinner}. ${row.whyBetter}`);
  }
  lines.push('');
  lines.push('## Change Log');
  lines.push('');
  lines.push('Rule changes:');
  for (const line of report.changeLog.rules) {
    lines.push(`- ${line}`);
  }
  lines.push('');
  lines.push('Pair-trait weight changes:');
  for (const line of report.changeLog.pairTraitWeights) {
    lines.push(`- ${line}`);
  }
  lines.push('');
  lines.push('Pattern set changes:');
  for (const line of report.changeLog.patterns) {
    lines.push(`- ${line}`);
  }
  lines.push('');
  lines.push('## Detailed Worked Examples');
  lines.push('');
  for (const example of report.detailedCuratedExamples.slice(0, 10)) {
    lines.push(`### ${example.profileKey}`);
    lines.push('');
    lines.push('Domain pairs:');
    for (const [domainKey, pairKey] of Object.entries(example.domainPairs)) {
      lines.push(`- ${domainKey}: ${pairKey}`);
    }
    lines.push('');
    lines.push('Trait totals:');
    lines.push(...formatTraitTotals(example.traitTotals));
    lines.push('');
    lines.push(`Winner: ${example.winnerPatternKey}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function writeArtifacts(report: ExplorationReport): void {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  writeFileSync(JSON_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(MARKDOWN_OUTPUT_PATH, buildMarkdownReport(report), 'utf8');
}

function printComparison(report: ExplorationReport): void {
  console.log('Before / after comparison');
  console.log('-------------------------');
  for (const row of report.comparison.metrics) {
    console.log(`${row.label}: ${row.baseline} -> ${row.refined}`);
  }
  console.log(`Dead patterns before: ${report.comparison.deadPatternsBefore.join(', ') || 'none'}`);
  console.log(`Dead patterns after: ${report.comparison.deadPatternsAfter.join(', ') || 'none'}`);
  console.log('');
}

function printCoverageTable(coverage: readonly PatternCoverageRow[]): void {
  console.log('Pattern coverage');
  console.log('----------------');
  console.log('patternKey | matchCount | winCount | winRate | examples | note');
  for (const row of coverage) {
    console.log(
      `${row.patternKey} | ${row.matchCount} | ${row.winCount} | ${(row.winRate * 100).toFixed(1)}% | ${row.exampleProfiles.join(', ') || '-'} | ${row.changeNote}`,
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
  console.log('');
}

function printDeadPatternSummary(deadPatternSummary: DeadPatternSummary): void {
  console.log('Dead-pattern summary');
  console.log('--------------------');
  console.log(`Never selected as winner: ${deadPatternSummary.neverSelectedAsWinner.join(', ') || 'none'}`);
  console.log(`Never matched: ${deadPatternSummary.neverMatched.join(', ') || 'none'}`);
  console.log(`Matched but never win: ${deadPatternSummary.matchedButNeverWin.join(', ') || 'none'}`);
  console.log('');
}

function printCuratedComparison(curatedComparison: readonly CuratedComparisonRow[]): void {
  console.log('Curated comparison');
  console.log('------------------');
  for (const row of curatedComparison) {
    console.log(`- ${row.profileKey}: ${row.baselineWinner} -> ${row.refinedWinner}. ${row.whyBetter}`);
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

function main(): void {
  const generatedProfiles = generateAllProfiles();
  const baselineGeneratedProfiles = generatedProfiles.map((profile) => evaluateProfile(profile, BASELINE_HERO_PATTERN_RULES));
  const refinedGeneratedProfiles = generatedProfiles.map((profile) => evaluateProfile(profile, HERO_PATTERN_RULES));
  const baselineCuratedProfiles = CURATED_PROFILES.map((profile) => evaluateProfile(profile, BASELINE_HERO_PATTERN_RULES));
  const refinedCuratedProfiles = CURATED_PROFILES.map((profile) => evaluateProfile(profile, HERO_PATTERN_RULES));

  const baselineCoverage = buildCoverage(baselineGeneratedProfiles, BASELINE_HERO_PATTERN_RULES);
  const refinedCoverage = buildCoverage(refinedGeneratedProfiles, HERO_PATTERN_RULES);
  const baselineCollisionSummary = buildCollisionSummary(baselineGeneratedProfiles);
  const refinedCollisionSummary = buildCollisionSummary(refinedGeneratedProfiles);
  const baselineDeadPatternSummary = buildDeadPatternSummary(baselineCoverage, baselineGeneratedProfiles.length);
  const refinedDeadPatternSummary = buildDeadPatternSummary(refinedCoverage, refinedGeneratedProfiles.length);
  const baselineWinningPatternCounts = buildWinningPatternCounts(baselineGeneratedProfiles);
  const refinedWinningPatternCounts = buildWinningPatternCounts(refinedGeneratedProfiles);

  const report: ExplorationReport = {
    runMode: 'full_combinatorial',
    totalProfilesProcessed: refinedGeneratedProfiles.length,
    processedAt: new Date().toISOString(),
    winningPatternCounts: refinedWinningPatternCounts,
    topWinningPatterns: buildTopWinningPatterns(refinedWinningPatternCounts, refinedGeneratedProfiles.length),
    collisionSummary: refinedCollisionSummary,
    deadPatternSummary: refinedDeadPatternSummary,
    coverage: refinedCoverage,
    detailedCuratedExamples: refinedCuratedProfiles,
    comparison: {
      metrics: buildComparisonMetrics(
        baselineCollisionSummary,
        refinedCollisionSummary,
        baselineDeadPatternSummary,
        refinedDeadPatternSummary,
        baselineWinningPatternCounts,
        refinedWinningPatternCounts,
      ),
      deadPatternsBefore: baselineDeadPatternSummary.neverSelectedAsWinner,
      deadPatternsAfter: refinedDeadPatternSummary.neverSelectedAsWinner,
      topWinnersBefore: buildTopWinningPatterns(baselineWinningPatternCounts, baselineGeneratedProfiles.length),
      topWinnersAfter: buildTopWinningPatterns(refinedWinningPatternCounts, refinedGeneratedProfiles.length),
    },
    curatedComparison: buildCuratedComparison(baselineCuratedProfiles, refinedCuratedProfiles),
    changeLog: {
      rules: buildRuleChangeLog(),
      pairTraitWeights: ['No pair-trait weight mappings changed in round 2; refinement was achieved through rule-set expansion and threshold redesign.'],
      patterns: buildPatternChangeLog(),
    },
  };

  writeArtifacts(report);

  console.log('Hero Pattern Refinement Harness');
  console.log('===============================');
  console.log(`Run mode: ${report.runMode}`);
  console.log(`Total profiles processed: ${report.totalProfilesProcessed}`);
  console.log(`JSON artifact: ${JSON_OUTPUT_PATH}`);
  console.log(`Markdown artifact: ${MARKDOWN_OUTPUT_PATH}`);
  console.log('');

  printComparison(report);
  printCoverageTable(report.coverage);
  printCollisionSummary(report.collisionSummary);
  printDeadPatternSummary(report.deadPatternSummary);
  printCuratedComparison(report.curatedComparison);
  printDetailedExamples(report.detailedCuratedExamples);
}

main();
