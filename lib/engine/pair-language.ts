import type {
  AssessmentVersionLanguagePairSection,
} from '@/lib/server/assessment-version-language-types';
import type { EngineLanguageBundle } from '@/lib/engine/types';

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolvePairLanguageSection(params: {
  pairKey: string | null;
  section: AssessmentVersionLanguagePairSection;
  languageBundle: EngineLanguageBundle;
}): string | null {
  if (!params.pairKey) {
    return null;
  }

  const canonicalContent = trimToNull(params.languageBundle.pairs[params.pairKey]?.[params.section]);
  if (canonicalContent) {
    return canonicalContent;
  }

  const [leftToken, rightToken, ...extraTokens] = params.pairKey.split('_').filter((token) => token.length > 0);
  if (!leftToken || !rightToken || extraTokens.length > 0) {
    return null;
  }

  const reversedPairKey = `${rightToken}_${leftToken}`;
  return trimToNull(params.languageBundle.pairs[reversedPairKey]?.[params.section]);
}
