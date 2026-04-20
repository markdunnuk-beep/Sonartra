import type {
  VoiceResolutionAttemptPayload,
  VoiceResolutionOption,
  VoiceResolutionQuestion,
  VoiceResolutionResult,
} from '@/lib/voice/resolution/voice-resolution.types';
import { getVoiceConfirmationMode } from '@/lib/voice/resolution/voice-confirmation-policy';

const LOW_CONFIDENCE_THRESHOLD = 0.78;
const RESOLVED_THRESHOLD = 0.88;
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'be',
  'but',
  'by',
  'do',
  'for',
  'from',
  'go',
  'i',
  'im',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'like',
  'me',
  'more',
  'my',
  'of',
  'on',
  'one',
  'or',
  'so',
  'that',
  'the',
  'them',
  'then',
  'this',
  'to',
  'up',
  'usually',
  'very',
  'with',
  'would',
]);

const HEDGING_PATTERN =
  /\b(probably|maybe|perhaps|i think|i guess|more like|leaning|sort of|kind of|not sure)\b/i;
const AMBIGUOUS_PATTERN =
  /\b(between|either|both|not sure|unsure|depends|hard to say|a and c|a or c|b and d|b or d)\b/i;
const OFF_TOPIC_PATTERN =
  /\b(dont know|don't know|skip|pass|whatever|anything is fine|anything works|none of them|nothing in particular)\b/i;

type CandidateMatch = {
  option: VoiceResolutionOption;
  confidence: number;
  reason: string;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemToken(token: string): string {
  if (token.endsWith('ing') && token.length > 5) {
    return token.slice(0, -3);
  }

  if (token.endsWith('ed') && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith('es') && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .map(stemToken)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function countOrderedTokenMatches(
  transcriptTokens: readonly string[],
  optionTokens: readonly string[],
): number {
  let transcriptIndex = 0;
  let matches = 0;

  for (const optionToken of optionTokens) {
    while (transcriptIndex < transcriptTokens.length) {
      if (transcriptTokens[transcriptIndex] === optionToken) {
        matches += 1;
        transcriptIndex += 1;
        break;
      }

      transcriptIndex += 1;
    }
  }

  return matches;
}

function parseExplicitReferences(
  transcript: string,
  options: readonly VoiceResolutionOption[],
): CandidateMatch | null {
  const normalized = normalizeText(transcript);
  const ordinalMap = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
  const referencedIndexes = new Set<number>();

  options.forEach((option, index) => {
    const label = option.label?.trim().toLowerCase() ?? '';
    if (label && new RegExp(`\\b${label}\\b`, 'i').test(normalized)) {
      referencedIndexes.add(index);
    }

    const ordinal = ordinalMap[index];
    if (
      ordinal
      && new RegExp(
        `\\b(?:the|option|answer|one|choice|pick|choose|selected|select|going with|go with|more like)\\s+${ordinal}\\b`,
        'i',
      ).test(normalized)
    ) {
      referencedIndexes.add(index);
    }

    const numeric = String(index + 1);
    if (
      new RegExp(`\\b(?:option|answer|number|choice)\\s+${numeric}\\b`, 'i').test(normalized)
      || new RegExp(`\\bnumber ${numeric}\\b`, 'i').test(normalized)
    ) {
      referencedIndexes.add(index);
    }
  });

  if (referencedIndexes.size !== 1) {
    return null;
  }

  const [matchedIndex] = [...referencedIndexes];
  const option = options[matchedIndex];
  const hedged = HEDGING_PATTERN.test(transcript);
  const confidence = hedged ? 0.72 : 0.97;

  return {
    option,
    confidence,
    reason: hedged ? 'explicit_reference_hedged' : 'explicit_reference',
  };
}

function scoreOptionTextMatch(
  transcript: string,
  option: VoiceResolutionOption,
): CandidateMatch | null {
  const normalizedTranscript = normalizeText(transcript);
  const transcriptTokens = tokenize(transcript);
  if (transcriptTokens.length === 0) {
    return null;
  }

  const optionTokens = tokenize(option.text);
  if (optionTokens.length === 0) {
    return null;
  }

  const transcriptSet = new Set(transcriptTokens);
  const optionSet = new Set(optionTokens);
  let overlap = 0;
  for (const token of optionSet) {
    if (transcriptSet.has(token)) {
      overlap += 1;
    }
  }

  if (overlap === 0) {
    return null;
  }

  const coverage = overlap / optionSet.size;
  const precision = overlap / transcriptSet.size;
  const orderedMatchRatio =
    countOrderedTokenMatches(transcriptTokens, optionTokens) / optionTokens.length;
  const phraseBoost =
    normalizedTranscript.includes(
      normalizeText(option.text).slice(0, Math.max(8, option.text.length - 6)),
    )
      ? 0.08
      : 0;
  const completeCoverageBoost =
    coverage === 1 && orderedMatchRatio >= 0.8
      ? 0.12
      : 0;
  const hedgedPenalty = HEDGING_PATTERN.test(transcript) ? 0.12 : 0;
  const confidence = Math.max(
    0,
    Math.min(
      0.98,
      (coverage * 0.52)
        + (precision * 0.18)
        + (orderedMatchRatio * 0.16)
        + phraseBoost
        + completeCoverageBoost
        - hedgedPenalty,
    ),
  );

  return {
    option,
    confidence,
    reason: 'lexical_option_match',
  };
}

function buildResult(params: {
  questionId: string;
  sourceExcerpt: string;
  status: VoiceResolutionResult['status'];
  inferredOptionId?: string | null;
  confidence?: number | null;
  candidateOptionLabel?: string | null;
  candidateOptionText?: string | null;
  internalReason?: string | null;
}): VoiceResolutionResult {
  const confirmationMode = getVoiceConfirmationMode({
    status: params.status,
    confidence: params.confidence ?? null,
    inferredOptionId: params.inferredOptionId ?? null,
  });

  return {
    status: params.status,
    questionId: params.questionId,
    inferredOptionId: params.inferredOptionId ?? null,
    confidence: params.confidence ?? null,
    sourceExcerpt: params.sourceExcerpt,
    confirmationMode,
    candidateOptionLabel: params.candidateOptionLabel ?? null,
    candidateOptionText: params.candidateOptionText ?? null,
    canRetry: true,
    canCorrect: params.status !== 'runtime_error',
    internalReason: params.internalReason ?? null,
  };
}

export function resolveVoiceOption(params: {
  question: VoiceResolutionQuestion;
  transcript: string;
}): VoiceResolutionAttemptPayload {
  const sourceExcerpt = params.transcript.trim();
  const { question } = params;

  if (!sourceExcerpt) {
    return {
      result: buildResult({
        questionId: question.questionId,
        sourceExcerpt,
        status: 'invalid_input',
        internalReason: 'empty_transcript',
      }),
      matchedOption: null,
    };
  }

  if (OFF_TOPIC_PATTERN.test(sourceExcerpt)) {
    return {
      result: buildResult({
        questionId: question.questionId,
        sourceExcerpt,
        status: 'unresolved',
        internalReason: 'off_topic_or_non_answer',
      }),
      matchedOption: null,
    };
  }

  if (AMBIGUOUS_PATTERN.test(sourceExcerpt)) {
    return {
      result: buildResult({
        questionId: question.questionId,
        sourceExcerpt,
        status: 'unresolved',
        internalReason: 'ambiguous_multi_option_answer',
      }),
      matchedOption: null,
    };
  }

  const explicitMatch = parseExplicitReferences(sourceExcerpt, question.options);
  if (explicitMatch) {
    const status =
      explicitMatch.confidence >= RESOLVED_THRESHOLD ? 'resolved' : 'low_confidence';

    return {
      result: buildResult({
        questionId: question.questionId,
        sourceExcerpt,
        status,
        inferredOptionId: explicitMatch.option.optionId,
        confidence: explicitMatch.confidence,
        candidateOptionLabel: explicitMatch.option.label,
        candidateOptionText: explicitMatch.option.text,
        internalReason: explicitMatch.reason,
      }),
      matchedOption: explicitMatch.option,
    };
  }

  const rankedMatches = question.options
    .map((option) => scoreOptionTextMatch(sourceExcerpt, option))
    .filter((match): match is CandidateMatch => match !== null)
    .sort((left, right) => right.confidence - left.confidence);

  const bestMatch = rankedMatches[0] ?? null;
  const secondMatch = rankedMatches[1] ?? null;

  if (!bestMatch || bestMatch.confidence < LOW_CONFIDENCE_THRESHOLD - 0.18) {
    return {
      result: buildResult({
        questionId: question.questionId,
        sourceExcerpt,
        status: 'unresolved',
        internalReason: 'no_single_option_candidate',
      }),
      matchedOption: null,
    };
  }

  if (secondMatch && Math.abs(bestMatch.confidence - secondMatch.confidence) < 0.08) {
    return {
      result: buildResult({
        questionId: question.questionId,
        sourceExcerpt,
        status: 'unresolved',
        internalReason: 'multiple_option_candidates',
      }),
      matchedOption: null,
    };
  }

  const status =
    bestMatch.confidence >= RESOLVED_THRESHOLD ? 'resolved' : 'low_confidence';

  return {
    result: buildResult({
      questionId: question.questionId,
      sourceExcerpt,
      status,
      inferredOptionId: bestMatch.option.optionId,
      confidence: Number(bestMatch.confidence.toFixed(2)),
      candidateOptionLabel: bestMatch.option.label,
      candidateOptionText: bestMatch.option.text,
      internalReason: bestMatch.reason,
    }),
    matchedOption: bestMatch.option,
  };
}
