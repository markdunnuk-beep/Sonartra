import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SignalChaptersRow,
} from '@/lib/types/single-domain-language';

export type SingleDomainLanguageBundle = {
  DOMAIN_FRAMING: readonly DomainFramingRow[];
  HERO_PAIRS: readonly HeroPairsRow[];
  SIGNAL_CHAPTERS: readonly SignalChaptersRow[];
  BALANCING_SECTIONS: readonly BalancingSectionsRow[];
  PAIR_SUMMARIES: readonly PairSummariesRow[];
  APPLICATION_STATEMENTS: readonly ApplicationStatementsRow[];
};
