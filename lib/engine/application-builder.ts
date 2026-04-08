import type {
  ApplicationSection,
  NormalizedSignalScore,
  ResultDomainChapter,
  ResultHeroSummary,
} from '@/lib/engine/types';
import type { AssessmentVersionApplicationLanguageBundle } from '@/lib/server/assessment-version-application-language-types';

type ApplicationPairSource = {
  key: string;
};

function emptyApplicationLanguage(): AssessmentVersionApplicationLanguageBundle {
  return {
    thesis: Object.freeze([]),
    contribution: Object.freeze([]),
    risk: Object.freeze([]),
    development: Object.freeze([]),
    prompts: Object.freeze([]),
  };
}

function getRankedSignals(signals: readonly NormalizedSignalScore[]): readonly NormalizedSignalScore[] {
  return [...signals].sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    if (right.percentage !== left.percentage) {
      return right.percentage - left.percentage;
    }

    if (right.rawTotal !== left.rawTotal) {
      return right.rawTotal - left.rawTotal;
    }

    return left.signalKey.localeCompare(right.signalKey);
  });
}

function getTopPairs(domains: readonly ResultDomainChapter[], hero: ResultHeroSummary): readonly ApplicationPairSource[] {
  const orderedKeys = new Set<string>();
  const orderedPairs: ApplicationPairSource[] = [];

  for (const winner of hero.domainPairWinners) {
    if (!orderedKeys.has(winner.pairKey)) {
      orderedKeys.add(winner.pairKey);
      orderedPairs.push({ key: winner.pairKey });
    }
  }

  for (const domain of domains) {
    const pairKey = domain.signalPair?.pairKey;
    if (pairKey && !orderedKeys.has(pairKey)) {
      orderedKeys.add(pairKey);
      orderedPairs.push({ key: pairKey });
    }
  }

  return Object.freeze(orderedPairs.slice(0, 3));
}

export function buildApplicationSection(params: {
  hero: ResultHeroSummary;
  domains: readonly ResultDomainChapter[];
  signals: readonly NormalizedSignalScore[];
  language?: AssessmentVersionApplicationLanguageBundle;
}): ApplicationSection {
  const language = params.language ?? emptyApplicationLanguage();
  const heroPatternKey = params.hero.heroPattern?.patternKey ?? '';
  const thesisRow = language.thesis.find((row) => row.heroPatternKey === heroPatternKey);
  const topPairs = getTopPairs(params.domains, params.hero);
  const weakestSignals = getRankedSignals(params.signals).slice(-3);
  const promptRow = language.prompts.find(
    (row) => row.sourceType === 'hero_pattern' && row.sourceKey === heroPatternKey,
  );

  return {
    thesis: {
      headline: thesisRow?.headline ?? '',
      summary: thesisRow?.summary ?? '',
      sourceKeys: {
        heroPatternKey,
      },
    },
    signatureContribution: {
      title: 'Where you create the most value',
      summary: '',
      items: topPairs.flatMap((pair) => {
        const row = language.contribution.find(
          (entry) => entry.sourceType === 'pair' && entry.sourceKey === pair.key,
        );

        if (!row) {
          return [];
        }

        return [{
          label: row.label,
          narrative: row.narrative,
          bestWhen: row.bestWhen,
          watchFor: row.watchFor ?? undefined,
          sourceKey: pair.key,
          sourceType: 'pair' as const,
        }];
      }),
    },
    patternRisks: {
      title: 'Where this pattern can work against you',
      summary: '',
      items: topPairs.flatMap((pair) => {
        const row = language.risk.find(
          (entry) => entry.sourceType === 'pair' && entry.sourceKey === pair.key,
        );

        if (!row) {
          return [];
        }

        return [{
          label: row.label,
          narrative: row.narrative,
          impact: row.impact,
          earlyWarning: row.earlyWarning ?? undefined,
          sourceKey: pair.key,
          sourceType: 'pair' as const,
        }];
      }),
    },
    rangeBuilder: {
      title: 'Where to build more range',
      summary: '',
      items: weakestSignals.flatMap((signal) => {
        const row = language.development.find(
          (entry) => entry.sourceType === 'signal' && entry.sourceKey === signal.signalKey,
        );

        if (!row) {
          return [];
        }

        return [{
          label: row.label,
          narrative: row.narrative,
          practice: row.practice,
          successMarker: row.successMarker ?? undefined,
          sourceKey: signal.signalKey,
          sourceType: 'signal' as const,
        }];
      }),
    },
    actionPlan30: {
      keepDoing: promptRow?.keepDoing ?? '',
      watchFor: promptRow?.watchFor ?? '',
      practiceNext: promptRow?.practiceNext ?? '',
      askOthers: promptRow?.askOthers ?? '',
    },
  };
}
