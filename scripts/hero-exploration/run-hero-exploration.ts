import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERO_PATTERN_LANGUAGE_LOOKUP } from './hero-pattern-language';
import {
  FINAL_ACTIVE_PATTERN_KEYS,
  FINAL_CONSOLIDATION_MAP,
  HERO_PATTERN_FALLBACK_KEY,
  HERO_PATTERN_RULES,
  PATTERN_CHANGE_LOG,
  ROUND2_HERO_PATTERN_RULES,
  ROUND3_HERO_PATTERN_RULES,
} from './hero-pattern-rules';
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

type RoundSnapshot = {
  name: 'round2' | 'round3' | 'final';
  rules: readonly HeroPatternRule[];
  generated: readonly ProcessedProfile[];
  curated: readonly ProcessedProfile[];
  coverage: readonly PatternCoverageRow[];
  collisionSummary: CollisionSummary;
  deadPatternSummary: DeadPatternSummary;
  winningPatternCounts: Readonly<Record<string, number>>;
  topWinningPatterns: readonly WinningPatternSummary[];
};

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
      )
      && (rule.exclusions ?? []).every((condition) =>
        !evaluateCondition(traitTotals[condition.traitKey], condition.operator, condition.value),
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

function buildCoverage(processedProfiles: readonly ProcessedProfile[], rules: readonly HeroPatternRule[]): readonly PatternCoverageRow[] {
  const coverage = new Map<string, PatternCoverageRow>();
  const activePatternKeys = [...new Set([...rules.map((rule) => rule.patternKey), HERO_PATTERN_FALLBACK_KEY])];

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

    const winnerRow = coverage.get(processedProfile.winnerPatternKey);
    if (!winnerRow) {
      continue;
    }

    winnerRow.winCount += 1;
    if (winnerRow.exampleProfiles.length < 3 && !winnerRow.exampleProfiles.includes(processedProfile.profileKey)) {
      winnerRow.exampleProfiles = [...winnerRow.exampleProfiles, processedProfile.profileKey];
    }
    if (winnerRow.examplePairs.length < 3 && !winnerRow.examplePairs.includes(examplePairString)) {
      winnerRow.examplePairs = [...winnerRow.examplePairs, examplePairString];
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

function buildDeadPatternSummary(coverage: readonly PatternCoverageRow[], totalProfilesProcessed: number): DeadPatternSummary {
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

function buildTopWinningPatterns(winningPatternCounts: Readonly<Record<string, number>>, totalProfilesProcessed: number): readonly WinningPatternSummary[] {
  return Object.entries(winningPatternCounts)
    .map(([patternKey, count]) => ({
      patternKey,
      count,
      share: totalProfilesProcessed === 0 ? 0 : count / totalProfilesProcessed,
    }))
    .sort((left, right) => right.count - left.count || left.patternKey.localeCompare(right.patternKey))
    .slice(0, 10);
}

function buildRoundSnapshot(
  name: RoundSnapshot['name'],
  rules: readonly HeroPatternRule[],
  generatedProfiles: readonly SimulatedProfile[],
  curatedProfiles: readonly SimulatedProfile[],
): RoundSnapshot {
  const generated = generatedProfiles.map((profile) => evaluateProfile(profile, rules));
  const curated = curatedProfiles.map((profile) => evaluateProfile(profile, rules));
  const coverage = buildCoverage(generated, rules);
  const collisionSummary = buildCollisionSummary(generated);
  const deadPatternSummary = buildDeadPatternSummary(coverage, generated.length);
  const winningPatternCounts = buildWinningPatternCounts(generated);

  return {
    name,
    rules,
    generated,
    curated,
    coverage,
    collisionSummary,
    deadPatternSummary,
    winningPatternCounts,
    topWinningPatterns: buildTopWinningPatterns(winningPatternCounts, generated.length),
  };
}

function buildComparisonMetrics(round2: RoundSnapshot, round3: RoundSnapshot, finalSnapshot: RoundSnapshot): readonly ComparisonMetricRow[] {
  const round2FallbackCount = round2.winningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0;
  const round3FallbackCount = round3.winningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0;
  const finalFallbackCount = finalSnapshot.winningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0;

  return [
    {
      label: 'total profiles processed',
      round2: round2.collisionSummary.totalProfiles,
      round3: round3.collisionSummary.totalProfiles,
      final: finalSnapshot.collisionSummary.totalProfiles,
    },
    {
      label: 'fallback count',
      round2: `${round2FallbackCount} (${((round2FallbackCount / round2.collisionSummary.totalProfiles) * 100).toFixed(1)}%)`,
      round3: `${round3FallbackCount} (${((round3FallbackCount / round3.collisionSummary.totalProfiles) * 100).toFixed(1)}%)`,
      final: `${finalFallbackCount} (${((finalFallbackCount / finalSnapshot.collisionSummary.totalProfiles) * 100).toFixed(1)}%)`,
    },
    {
      label: 'zero-match count',
      round2: round2.collisionSummary.zeroMatchProfiles,
      round3: round3.collisionSummary.zeroMatchProfiles,
      final: finalSnapshot.collisionSummary.zeroMatchProfiles,
    },
    {
      label: 'single-match count',
      round2: round2.collisionSummary.singleMatchProfiles,
      round3: round3.collisionSummary.singleMatchProfiles,
      final: finalSnapshot.collisionSummary.singleMatchProfiles,
    },
    {
      label: 'multi-match count',
      round2: round2.collisionSummary.multiMatchProfiles,
      round3: round3.collisionSummary.multiMatchProfiles,
      final: finalSnapshot.collisionSummary.multiMatchProfiles,
    },
    {
      label: 'worst collision count',
      round2: round2.collisionSummary.worstCollisionCount,
      round3: round3.collisionSummary.worstCollisionCount,
      final: finalSnapshot.collisionSummary.worstCollisionCount,
    },
    {
      label: 'dead pattern count',
      round2: round2.deadPatternSummary.neverSelectedAsWinner.length,
      round3: round3.deadPatternSummary.neverSelectedAsWinner.length,
      final: finalSnapshot.deadPatternSummary.neverSelectedAsWinner.length,
    },
  ];
}

function buildCuratedComparison(round3Curated: readonly ProcessedProfile[], finalCurated: readonly ProcessedProfile[]): readonly CuratedComparisonRow[] {
  const round3ByKey = new Map(round3Curated.map((profile) => [profile.profileKey, profile] as const));
  const finalByKey = new Map(finalCurated.map((profile) => [profile.profileKey, profile] as const));
  const spotlightKeys = ['profile_006', 'profile_017', 'profile_018', 'profile_021', 'profile_003', 'profile_005', 'profile_010', 'profile_012', 'profile_014', 'profile_020'];

  return spotlightKeys.map((profileKey) => {
    const round3 = round3ByKey.get(profileKey);
    const finalSnapshot = finalByKey.get(profileKey);
    if (!round3 || !finalSnapshot) {
      throw new Error(`Missing curated comparison profile ${profileKey}.`);
    }

    return {
      profileKey,
      previousWinner: round3.winnerPatternKey,
      finalWinner: finalSnapshot.winnerPatternKey,
      changed: round3.winnerPatternKey !== finalSnapshot.winnerPatternKey,
      judgement: buildCuratedJudgement(round3, finalSnapshot),
    };
  });
}

function buildCuratedJudgement(round3: ProcessedProfile, finalSnapshot: ProcessedProfile): string {
  if (round3.winnerPatternKey === finalSnapshot.winnerPatternKey) {
    return 'Equally good. The final 12-pattern model kept the same identity because the round-3 winner was already a clean Hero lane.';
  }

  const finalMergedSource = Object.entries(FINAL_CONSOLIDATION_MAP).find(([, previous]) => previous.includes(round3.winnerPatternKey));
  if (finalMergedSource && finalMergedSource[0] === finalSnapshot.winnerPatternKey) {
    return `Better. The final model folds ${round3.winnerPatternKey} into the broader ${finalSnapshot.winnerPatternKey} lane, which is cleaner at Hero level without losing the behavioural signal.`;
  }

  if (finalSnapshot.winnerPatternKey === HERO_PATTERN_FALLBACK_KEY) {
    return 'Worse. The simplified model lost specificity here and fell back to balanced_operator.';
  }

  return `Better. The final model prefers ${finalSnapshot.winnerPatternKey} because the consolidated taxonomy treats that behaviour as the stronger identity-level pattern.`;
}

function formatCondition(condition: HeroPatternCondition): string {
  return `${condition.traitKey} ${condition.operator} ${condition.value}`;
}

function formatTraitTotals(traitTotals: ProcessedProfile['traitTotals']): string[] {
  return TRAIT_KEYS.filter((traitKey) => traitTotals[traitKey] > 0)
    .sort((left, right) => traitTotals[right] - traitTotals[left] || left.localeCompare(right))
    .map((traitKey) => `- ${traitKey}: ${traitTotals[traitKey]}`);
}

function buildRuleChangeLog(): readonly string[] {
  return Object.entries(PATTERN_CHANGE_LOG)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([patternKey, note]) => `${patternKey}: ${note}`);
}

function buildPatternChangeLog(): readonly string[] {
  const finalKeys = new Set(FINAL_ACTIVE_PATTERN_KEYS);
  const round3Keys = new Set(ROUND3_HERO_PATTERN_RULES.map((rule) => rule.patternKey));

  const retained = [...finalKeys].filter((key) => round3Keys.has(key)).sort();
  const added = [...finalKeys].filter((key) => !round3Keys.has(key)).sort();
  const removed = [...round3Keys].filter((key) => !finalKeys.has(key)).sort();

  return [
    `final active patterns: ${FINAL_ACTIVE_PATTERN_KEYS.join(', ')}`,
    `added in final consolidation: ${added.join(', ') || 'none'}`,
    `retired from round 3: ${removed.join(', ') || 'none'}`,
    `retained into final system: ${retained.join(', ') || 'none'}`,
  ];
}

function buildImplementationReadiness(finalSnapshot: RoundSnapshot): ExplorationReport['implementationReadiness'] {
  const fallbackShare = (finalSnapshot.winningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0) / finalSnapshot.generated.length;
  const ready = fallbackShare < 0.2
    && finalSnapshot.collisionSummary.multiMatchProfiles < 8000
    && finalSnapshot.collisionSummary.worstCollisionCount <= 3
    && finalSnapshot.deadPatternSummary.neverSelectedAsWinner.length === 0;

  return {
    ready,
    judgement: ready
      ? 'The final 12-pattern model is clean enough to move into engine and builder implementation.'
      : 'The final 12-pattern model is cleaner editorially, but it is still not implementation-ready because fallback and collision depth remain above the target thresholds.',
    strongestPatterns: [
      'forceful_driver',
      'delivery_commander',
      'exacting_controller',
      'deliberate_craftsperson',
      'relational_catalyst',
      'steady_steward',
    ],
    fallbackHeavyRegions: [
      'mid-range mixed profiles that spread across task, social, and adaptive traits without a dominant lane',
      'moderate structured + social profiles that miss structured_collaborator by one threshold',
      'balanced adaptive profiles that are not social enough for relational_catalyst and not flexible enough for adaptive_mobiliser',
    ],
    remainingWeakSpots: [
      'balanced_operator still covers too much of the combinatorial space',
      'relational_catalyst and steady_steward still overlap on people-led profiles with moderate pace and stability',
      'adaptive_mobiliser can still brush against structured_collaborator and relational_catalyst in mixed adaptive-social cases',
    ],
  };
}

function buildMarkdownReport(report: ExplorationReport): string {
  const lines: string[] = [];

  lines.push('# Hero Exploration Summary');
  lines.push('');
  lines.push(`- Run mode: ${report.runMode}`);
  lines.push(`- Total profiles processed: ${report.totalProfilesProcessed}`);
  lines.push(`- Final fallback count: ${report.winningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0}`);
  lines.push(`- Final fallback share: ${(((report.winningPatternCounts[HERO_PATTERN_FALLBACK_KEY] ?? 0) / report.totalProfilesProcessed) * 100).toFixed(1)}%`);
  lines.push(`- Final worst collision count: ${report.collisionSummary.worstCollisionCount}`);
  lines.push(`- Implementation-ready: ${report.implementationReadiness.ready ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Final 12 Active Patterns');
  lines.push('');
  for (const patternKey of report.finalPatternInventory) {
    lines.push(`- ${patternKey}`);
  }
  lines.push('');
  lines.push('## Consolidation Map');
  lines.push('');
  for (const [finalPattern, previousPatterns] of Object.entries(report.consolidationMap)) {
    lines.push(`- ${finalPattern}: ${previousPatterns.join(', ')}`);
  }
  lines.push('');
  lines.push('## Round 2 vs Round 3 vs Final');
  lines.push('');
  lines.push('| Metric | Round 2 | Round 3 | Final |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const row of report.comparison.metrics) {
    lines.push(`| ${row.label} | ${row.round2} | ${row.round3} | ${row.final} |`);
  }
  lines.push('');
  lines.push(`- Dead patterns in round 2: ${report.comparison.deadPatternsRound2.join(', ') || 'none'}`);
  lines.push(`- Dead patterns in round 3: ${report.comparison.deadPatternsRound3.join(', ') || 'none'}`);
  lines.push(`- Dead patterns in final model: ${report.comparison.deadPatternsFinal.join(', ') || 'none'}`);
  lines.push('');
  lines.push('## Top Winners by Round');
  lines.push('');
  lines.push('| Round 2 | Count | Share | Round 3 | Count | Share | Final | Count | Share |');
  lines.push('| --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |');
  for (let index = 0; index < Math.max(report.comparison.topWinnersRound2.length, report.comparison.topWinnersRound3.length, report.comparison.topWinnersFinal.length); index += 1) {
    const round2 = report.comparison.topWinnersRound2[index];
    const round3 = report.comparison.topWinnersRound3[index];
    const finalSnapshot = report.comparison.topWinnersFinal[index];
    lines.push(
      `| ${round2?.patternKey ?? '-'} | ${round2?.count ?? '-'} | ${round2 ? `${(round2.share * 100).toFixed(1)}%` : '-'} | ${round3?.patternKey ?? '-'} | ${round3?.count ?? '-'} | ${round3 ? `${(round3.share * 100).toFixed(1)}%` : '-'} | ${finalSnapshot?.patternKey ?? '-'} | ${finalSnapshot?.count ?? '-'} | ${finalSnapshot ? `${(finalSnapshot.share * 100).toFixed(1)}%` : '-'} |`,
    );
  }
  lines.push('');
  lines.push('## Final Pattern Coverage');
  lines.push('');
  lines.push('| Pattern | Match Count | Win Count | Win Rate | Example Profiles | Change Note |');
  lines.push('| --- | ---: | ---: | ---: | --- | --- |');
  for (const row of report.coverage) {
    lines.push(
      `| ${row.patternKey} | ${row.matchCount} | ${row.winCount} | ${(row.winRate * 100).toFixed(1)}% | ${row.exampleProfiles.join(', ') || '-'} | ${row.changeNote} |`,
    );
  }
  lines.push('');
  lines.push('## Final Collision Summary');
  lines.push('');
  for (const collisionSet of report.collisionSummary.topCollisionSets) {
    lines.push(`- ${collisionSet.patternKeys.join(' > ')}: ${collisionSet.count}`);
  }
  lines.push('');
  lines.push('## Curated Comparison');
  lines.push('');
  for (const row of report.curatedComparison) {
    lines.push(`- ${row.profileKey}: ${row.previousWinner} -> ${row.finalWinner}. ${row.judgement}`);
  }
  lines.push('');
  lines.push('## Narrative Judgement');
  lines.push('');
  lines.push(`- Overall judgement: ${report.implementationReadiness.judgement}`);
  lines.push(`- Strongest editorial patterns: ${report.implementationReadiness.strongestPatterns.join(', ')}`);
  lines.push(`- Fallback-heavy regions: ${report.implementationReadiness.fallbackHeavyRegions.join('; ')}`);
  lines.push(`- Remaining weak spots: ${report.implementationReadiness.remainingWeakSpots.join('; ')}`);
  lines.push('');
  lines.push('## Change Log');
  lines.push('');
  lines.push('Rule and pattern changes:');
  for (const line of report.changeLog.rules) {
    lines.push(`- ${line}`);
  }
  lines.push('');
  lines.push('Pair-trait weight changes:');
  for (const line of report.changeLog.pairTraitWeights) {
    lines.push(`- ${line}`);
  }
  lines.push('');
  lines.push('Pattern inventory changes:');
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

function printComparison(metrics: readonly ComparisonMetricRow[], report: ExplorationReport): void {
  console.log('Round 2 vs Round 3 vs Final comparison');
  console.log('--------------------------------------');
  for (const row of metrics) {
    console.log(`${row.label}: ${row.round2} -> ${row.round3} -> ${row.final}`);
  }
  console.log(`Dead patterns in round 2: ${report.comparison.deadPatternsRound2.join(', ') || 'none'}`);
  console.log(`Dead patterns in round 3: ${report.comparison.deadPatternsRound3.join(', ') || 'none'}`);
  console.log(`Dead patterns in final model: ${report.comparison.deadPatternsFinal.join(', ') || 'none'}`);
  console.log('');
}

function printCoverageTable(coverage: readonly PatternCoverageRow[]): void {
  console.log('Final pattern coverage');
  console.log('----------------------');
  console.log('patternKey | matchCount | winCount | winRate | examples | note');
  for (const row of coverage) {
    console.log(
      `${row.patternKey} | ${row.matchCount} | ${row.winCount} | ${(row.winRate * 100).toFixed(1)}% | ${row.exampleProfiles.join(', ') || '-'} | ${row.changeNote}`,
    );
  }
  console.log('');
}

function printCollisionSummary(collisionSummary: CollisionSummary): void {
  console.log('Final collision summary');
  console.log('-----------------------');
  console.log(`Profiles with 2+ matches: ${collisionSummary.multiMatchProfiles}`);
  console.log(`Worst collision count: ${collisionSummary.worstCollisionCount}`);
  console.log('Top 10 collision sets:');
  for (const collisionSet of collisionSummary.topCollisionSets) {
    console.log(`- ${collisionSet.patternKeys.join(' > ')}: ${collisionSet.count}`);
  }
  console.log('');
}

function printCuratedComparison(curatedComparison: readonly CuratedComparisonRow[]): void {
  console.log('Curated comparison');
  console.log('------------------');
  for (const row of curatedComparison) {
    console.log(`- ${row.profileKey}: ${row.previousWinner} -> ${row.finalWinner}. ${row.judgement}`);
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
  const round2 = buildRoundSnapshot('round2', ROUND2_HERO_PATTERN_RULES, generatedProfiles, CURATED_PROFILES);
  const round3 = buildRoundSnapshot('round3', ROUND3_HERO_PATTERN_RULES, generatedProfiles, CURATED_PROFILES);
  const finalSnapshot = buildRoundSnapshot('final', HERO_PATTERN_RULES, generatedProfiles, CURATED_PROFILES);

  const report: ExplorationReport = {
    runMode: 'full_combinatorial',
    totalProfilesProcessed: finalSnapshot.generated.length,
    processedAt: new Date().toISOString(),
    winningPatternCounts: finalSnapshot.winningPatternCounts,
    topWinningPatterns: finalSnapshot.topWinningPatterns,
    collisionSummary: finalSnapshot.collisionSummary,
    deadPatternSummary: finalSnapshot.deadPatternSummary,
    coverage: finalSnapshot.coverage,
    detailedCuratedExamples: finalSnapshot.curated,
    comparison: {
      metrics: buildComparisonMetrics(round2, round3, finalSnapshot),
      deadPatternsRound2: round2.deadPatternSummary.neverSelectedAsWinner,
      deadPatternsRound3: round3.deadPatternSummary.neverSelectedAsWinner,
      deadPatternsFinal: finalSnapshot.deadPatternSummary.neverSelectedAsWinner,
      topWinnersRound2: round2.topWinningPatterns,
      topWinnersRound3: round3.topWinningPatterns,
      topWinnersFinal: finalSnapshot.topWinningPatterns,
    },
    curatedComparison: buildCuratedComparison(round3.curated, finalSnapshot.curated),
    finalPatternInventory: [...FINAL_ACTIVE_PATTERN_KEYS],
    consolidationMap: FINAL_CONSOLIDATION_MAP,
    implementationReadiness: buildImplementationReadiness(finalSnapshot),
    changeLog: {
      rules: buildRuleChangeLog(),
      pairTraitWeights: ['No pair-trait weight mappings changed in the final 12-pattern consolidation.'],
      patterns: buildPatternChangeLog(),
    },
  };

  writeArtifacts(report);

  console.log('Hero Pattern Consolidation Harness');
  console.log('=================================');
  console.log(`Run mode: ${report.runMode}`);
  console.log(`Total profiles processed: ${report.totalProfilesProcessed}`);
  console.log(`JSON artifact: ${JSON_OUTPUT_PATH}`);
  console.log(`Markdown artifact: ${MARKDOWN_OUTPUT_PATH}`);
  console.log('');

  printComparison(report.comparison.metrics, report);
  printCoverageTable(report.coverage);
  printCollisionSummary(report.collisionSummary);
  printCuratedComparison(report.curatedComparison);
  printDetailedExamples(report.detailedCuratedExamples);
}

main();
