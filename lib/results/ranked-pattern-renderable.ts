import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

type RecordValue = Record<string, unknown>;

type PayloadSection = {
  lookupKey?: string;
  fieldValues: RecordValue;
};

type RankedSignalDisplay = {
  signalKey: string;
  signalLabel: string;
  rank: number;
  rawScore: number;
  normalizedPercentage: number;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPayloadSection(value: unknown): value is PayloadSection {
  return isRecord(value) && isRecord(value.fieldValues);
}

function isPayloadList(value: unknown): value is PayloadSection[] {
  return Array.isArray(value) && value.length > 0 && value.every(isPayloadSection);
}

function isRankedSignal(value: unknown): value is RankedSignalDisplay {
  return isRecord(value)
    && typeof value.signalKey === 'string'
    && typeof value.signalLabel === 'string'
    && typeof value.rank === 'number'
    && typeof value.rawScore === 'number'
    && typeof value.normalizedPercentage === 'number';
}

export function isRankedPatternRenderablePayload(
  payload: SingleDomainResultPayload,
): boolean {
  const metadata = payload.metadata as unknown;
  return isRecord(metadata)
    && metadata.resultModelKey === 'ranked_pattern'
    && isPayloadSection(payload.context)
    && isPayloadSection(payload.orientation)
    && isPayloadSection(payload.recognition)
    && isPayloadList(payload.signalRoles)
    && isPayloadSection(payload.patternMechanics)
    && isPayloadSection(payload.patternSynthesis)
    && isPayloadList(payload.strengths)
    && isPayloadList(payload.narrowing)
    && isPayloadList(payload.application)
    && isPayloadSection(payload.closingIntegration)
    && Array.isArray(payload.rankedSignals)
    && payload.rankedSignals.length === 4
    && payload.rankedSignals.every(isRankedSignal)
    && isRecord(payload.scoreShape)
    && typeof payload.scoreShape.value === 'string'
    && typeof payload.patternKey === 'string';
}
