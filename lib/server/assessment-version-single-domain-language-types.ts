import type {
  ApplicationStatementsRow,
  BalancingSectionsRow,
  DriverClaimsRow,
  DomainFramingRow,
  HeroPairsRow,
  PairSummariesRow,
  SignalChaptersRow,
} from '@/lib/types/single-domain-language';

export type SingleDomainLanguageBundle = {
  DOMAIN_FRAMING: readonly DomainFramingRow[];
  HERO_PAIRS: readonly HeroPairsRow[];
  DRIVER_CLAIMS?: readonly DriverClaimsRow[];
  SIGNAL_CHAPTERS: readonly SignalChaptersRow[];
  BALANCING_SECTIONS: readonly BalancingSectionsRow[];
  PAIR_SUMMARIES: readonly PairSummariesRow[];
  APPLICATION_STATEMENTS: readonly ApplicationStatementsRow[];
};
