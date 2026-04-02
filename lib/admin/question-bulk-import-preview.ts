export const MAX_BULK_QUESTION_PREVIEW_ROWS = 200;
export const QUESTION_PREVIEW_ACCEPTED_LIMIT = 10;

export type QuestionBulkPreviewDomain = {
  domainId: string;
  domainKey: string;
  label: string;
};

export type QuestionBulkPreviewAcceptedRow = {
  lineNumber: number;
  prompt: string;
  domainId: string;
  domainKey: string;
  domainLabel: string;
};

export type QuestionBulkPreviewRejectedRow = {
  lineNumber: number | null;
  message: string;
};

export type QuestionBulkPreviewResult = {
  rawInput: string;
  rowCount: number;
  acceptedCount: number;
  rejectedCount: number;
  canImport: boolean;
  accepted: readonly QuestionBulkPreviewAcceptedRow[];
  rejected: readonly QuestionBulkPreviewRejectedRow[];
};

export function buildBulkQuestionPreview(params: {
  rawInput: string;
  selectedDomainId: string;
  domains: readonly QuestionBulkPreviewDomain[];
}): QuestionBulkPreviewResult {
  const selectedDomain = params.domains.find((domain) => domain.domainId === params.selectedDomainId) ?? null;
  const rows = getNonEmptyLines(params.rawInput);

  if (!selectedDomain) {
    return {
      rawInput: params.rawInput,
      rowCount: rows.length,
      acceptedCount: 0,
      rejectedCount: 1,
      canImport: false,
      accepted: [],
      rejected: [{ lineNumber: null, message: 'Select a domain before previewing questions.' }],
    };
  }

  if (rows.length > MAX_BULK_QUESTION_PREVIEW_ROWS) {
    return {
      rawInput: params.rawInput,
      rowCount: rows.length,
      acceptedCount: 0,
      rejectedCount: 1,
      canImport: false,
      accepted: [],
      rejected: [
        {
          lineNumber: null,
          message: `Import at most ${MAX_BULK_QUESTION_PREVIEW_ROWS} questions at a time.`,
        },
      ],
    };
  }

  const accepted = rows.map((row) => ({
    lineNumber: row.lineNumber,
    prompt: row.value,
    domainId: selectedDomain.domainId,
    domainKey: selectedDomain.domainKey,
    domainLabel: selectedDomain.label,
  }));

  return {
    rawInput: params.rawInput,
    rowCount: rows.length,
    acceptedCount: accepted.length,
    rejectedCount: 0,
    canImport: accepted.length > 0,
    accepted,
    rejected: [],
  };
}

export function buildBulkQuestionByDomainPreview(params: {
  rawInput: string;
  domains: readonly QuestionBulkPreviewDomain[];
}): QuestionBulkPreviewResult {
  const rows = getNonEmptyLines(params.rawInput);
  const accepted: QuestionBulkPreviewAcceptedRow[] = [];
  const rejected: QuestionBulkPreviewRejectedRow[] = [];

  if (rows.length > MAX_BULK_QUESTION_PREVIEW_ROWS) {
    return {
      rawInput: params.rawInput,
      rowCount: rows.length,
      acceptedCount: 0,
      rejectedCount: 1,
      canImport: false,
      accepted: [],
      rejected: [
        {
          lineNumber: null,
          message: `Import at most ${MAX_BULK_QUESTION_PREVIEW_ROWS} questions at a time.`,
        },
      ],
    };
  }

  for (const row of rows) {
    const firstPipeIndex = row.raw.indexOf('|');
    const lastPipeIndex = row.raw.lastIndexOf('|');

    if (firstPipeIndex < 0 || firstPipeIndex !== lastPipeIndex) {
      rejected.push({
        lineNumber: row.lineNumber,
        message: 'must use exactly one | separator in the format domain|question text.',
      });
      continue;
    }

    const domainToken = row.raw.slice(0, firstPipeIndex).trim();
    const prompt = row.raw.slice(firstPipeIndex + 1).trim();

    if (!domainToken) {
      rejected.push({
        lineNumber: row.lineNumber,
        message: 'must include a domain token before the | separator.',
      });
      continue;
    }

    if (!prompt) {
      rejected.push({
        lineNumber: row.lineNumber,
        message: 'missing question text.',
      });
      continue;
    }

    const domain =
      params.domains.find((candidate) => candidate.domainKey === domainToken) ??
      params.domains.find((candidate) => candidate.label === domainToken) ??
      null;

    if (!domain) {
      rejected.push({
        lineNumber: row.lineNumber,
        message: 'domain not found.',
      });
      continue;
    }

    accepted.push({
      lineNumber: row.lineNumber,
      prompt,
      domainId: domain.domainId,
      domainKey: domain.domainKey,
      domainLabel: domain.label,
    });
  }

  return {
    rawInput: params.rawInput,
    rowCount: rows.length,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    canImport: accepted.length > 0,
    accepted,
    rejected,
  };
}

function getNonEmptyLines(rawInput: string): Array<{ lineNumber: number; raw: string; value: string }> {
  return rawInput
    .split(/\r?\n/)
    .map((line, index) => ({
      lineNumber: index + 1,
      raw: line,
      value: line.trim(),
    }))
    .filter((line) => line.value.length > 0);
}
