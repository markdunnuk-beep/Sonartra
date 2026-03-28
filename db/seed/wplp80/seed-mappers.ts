import type { DomainSeed } from '@/db/seed/wplp80/types';

export type DatabaseDomainType = 'QUESTION_SECTION' | 'SIGNAL_GROUP';

export function mapSeedDomainSourceToDatabaseType(source: DomainSeed['source']): DatabaseDomainType {
  return source === 'signal_group' ? 'SIGNAL_GROUP' : 'QUESTION_SECTION';
}
